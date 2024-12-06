#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Table = require('cli-table3');
console.clear()

const FILE_PATTERNS = {
    PAGE: 'page.tsx',
    ROUTE: 'route.ts',
    LOADING: 'loading.tsx',
    ERROR: 'error.tsx'
};

const colorCodes = {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    violet: '\x1b[35m',
    yellow: '\x1b[33m',
    bgYellow: '\x1b[43m',
    purple: '\x1b[35m',
    orange: '\x1b[38;5;208m',
    magenta: '\x1b[35m',
    pink: '\x1b[35m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

Object.entries(colorCodes).forEach(([color, code]) => {
    Object.defineProperty(String.prototype, color, {
        get() {
            return `${code}${this}\x1b[0m`;
        }
    });
});

Object.fromEntries(
    Object.entries(colorCodes).map(([color, code]) => [
        color,
        (text) => `${code}${text}\x1b[0m`
    ])
);

const appDirectory = fs.existsSync(path.join(process.cwd(), 'app'))
    ? path.join(process.cwd(), 'app')
    : fs.existsSync(path.join(process.cwd(), 'src/app'))
        ? path.join(process.cwd(), 'src/app')
        : null;

if (!appDirectory) {
    console.error('🚫 This tool only works with projects using an "app" directory.'.yellow);
    process.exit(1);
}

const fileContentsCache = new Map();

let currentFilePath = null;
let currentFileContent = null;

function setCurrentFile(filePath) {
    currentFilePath = filePath;
    currentFileContent = fileContentsCache.has(filePath)
        ? fileContentsCache.get(filePath)
        : fs.readFileSync(filePath, 'utf8');
    fileContentsCache.set(filePath, currentFileContent);
}

function cleanup() {
    fileContentsCache.clear();
}

// Add process event handlers
process.on('exit', cleanup);
process.on('SIGINT', () => {
    cleanup();
    process.exit();
});

function hasMetadata() {
    const metadataPatterns = [
        { pattern: 'export const metadata', returnVal: '✓ metadata'.green },
        { pattern: 'export async function generateMetadata', returnVal: '○ generateMetadata'.blue },
        { pattern: 'export function generateMetadata', returnVal: '○ generateMetadata'.blue },
        { pattern: 'export const generateMetadata', returnVal: '○ generateMetadata'.blue },
        { pattern: 'export let metadata', returnVal: '✓ metadata'.green },
        { pattern: 'export var metadata', returnVal: '✓ metadata'.green },
        { pattern: 'export const metadata:', returnVal: '✓ metadata'.green },
        { pattern: 'export const generateMetadata:', returnVal: '○ generateMetadata'.blue },
    ];

    const found = metadataPatterns.find(({ pattern }) => currentFileContent.includes(pattern));
    return found ? found.returnVal : null;
}

function hasServerAction() {
    return currentFileContent.includes('use server');
}

function extractDynamicValue() {
    const match = currentFileContent.match(/export (?:const|let|var) dynamic\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '';
}

function extractRevalidateValue() {
    const match = currentFileContent.match(/export (?:const|let|var) revalidate\s*=\s*(\d+)/);
    return match ? match[1] : '';
}

function extractFetchCacheValue() {
    const match = currentFileContent.match(/export (?:const|let|var) fetchCache\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '';
}

function hasParallelRoute() {
    return currentFilePath.includes('@');
}

function hasInterceptingRoute() {
    return currentFilePath.includes('(.)') || currentFilePath.includes('(..)') || currentFilePath.includes('(...)');
}

function hasLoadingFile() {
    const directory = path.dirname(currentFilePath);
    return fs.existsSync(path.join(directory, FILE_PATTERNS.LOADING));
}

function hasErrorFile() {
    const directory = path.dirname(currentFilePath);
    return fs.existsSync(path.join(directory, FILE_PATTERNS.ERROR));
}

function listRoutes(dir, baseRoute = '') {
    let table = [];
    try {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
            const fullPath = path.join(dir, dirent.name);
            if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
                table = table.concat(listRoutes(fullPath, `${baseRoute}/${dirent.name}`));
            } else if (dirent.isFile() && dirent.name === FILE_PATTERNS.PAGE) {
                setCurrentFile(fullPath);

                const route = `${baseRoute}/${dirent.name.replace(/page\.tsx$/, '')}`;
                const functionName = extractExportedFunction();
                const componentType = isClientComponent() ? 'use client' : '';
                const hasMetadataExport = hasMetadata();
                const hasServerActionDirective = hasServerAction();
                const dynamicValue = extractDynamicValue();
                const revalidateValue = extractRevalidateValue();
                const fetchCacheValue = extractFetchCacheValue();
                const isParallel = hasParallelRoute();
                const isIntercepting = hasInterceptingRoute();
                const _hasLoadingFile = hasLoadingFile();
                const _hasErrorFile = hasErrorFile();
                table.push([functionName, route, componentType, hasMetadataExport, hasServerActionDirective, dynamicValue, revalidateValue, fetchCacheValue, isParallel, isIntercepting, _hasLoadingFile, _hasErrorFile]);
            }
        });
    } catch (error) {
        console.error(`Error reading directory ${dir}:`.red, error.message);
    }
    return table;
}

function listApiRoutes(dir, baseRoute = '') {
    let table = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
            table = table.concat(listApiRoutes(fullPath, `${baseRoute}/${dirent.name}`));
        } else if (dirent.isFile() && dirent.name === FILE_PATTERNS.ROUTE) {
            setCurrentFile(fullPath);

            const route = `${baseRoute}/route`;
            const methods = extractHttpMethods();
            const functionName = extractExportedFunction();
            methods.forEach(method => {
                table.push([method, functionName, route]);
            });
        }
    });
    return table;
}

function extractHttpMethods() {
    const methods = [];
    const methodPatterns = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    // Check for destructured handlers pattern
    const handlersMatch = currentFileContent.match(/export const \{([^}]+)\}\s*=\s*handlers/);
    if (handlersMatch) {
        const destructuredMethods = handlersMatch[1].split(',').map(m => m.trim());
        return [destructuredMethods.join(' | ')];
    }

    // Check for individual async function exports
    methodPatterns.forEach(method => {
        if (currentFileContent.includes(`export async function ${method}`)) {
            methods.push(method);
        }
    });

    return methods.length > 0 ? methods : ['GET'];
}

function extractExportedFunction() {
    const match = currentFileContent.match(/export default (async function )?(\w+)/) || currentFileContent.match(/export default (\w+)/);
    return match ? match[2] || match[1] : '';
}

function formatMethod(method) {
    if (method.includes('|')) {
        return method.split('|')
            .map(m => formatMethod(m.trim())) // Recursively format each method
            .join(' | '.dim); // Add dimmed separator
    }

    switch (method) {
        case 'GET':
            return method.green;
        case 'POST':
            return method.blue;
        case 'DELETE':
            return method.red;
        case 'HEAD':
            return method.gray;
        case 'PUT':
            return method.violet;
        case 'PATCH':
            return method.yellow;
        case 'OPTIONS':
            return method.cyan;
        default:
            return method;
    }
}

function renderTable(tableData, type = 'pages') {
    const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'https://localhost:3000';
    const showFullPath = process.argv.includes('--full') || process.argv.includes('-f');

    const table = new Table({
        head: type === 'pages'
            ? ['Function', 'Route', 'Type', 'Metadata', 'Server Action', 'Dynamic', 'Revalidate', 'FetchCache', 'Parallel', 'Intercepting', 'Loading', 'Error']
            : ['Method', 'Route'],

        style: {
            head: [],
            border: [],
            compact: true
        }
    });

    tableData.forEach(row => {
        if (type === 'pages') {
            const route = row[1]
                .replace(/\[\.\.\.(\w+)\]/g, '[...$1]'.magenta)
                .replace(/\[(\w+)\]/g, '[$1]'.yellow)
                .replace(/\((\w+)\)/g, '($1)'.blue)
                .replace(/\(\.\)/g, '(.)'.green)
                .replace(/\(\.\.\)/g, '(..)'.green)
                .replace(/@(\w+)/g, '@$1'.orange);
            const routeColored = showFullPath ? `${baseUrl.dim}${route}` : route;
            const typeColored = row[2] === 'use client' ? '⇢ use client'.red : '⇠ server'.dim;
            const metadataColored = row[3] ? row[3] : '×'.dim;
            const serverActionColored = row[4] ? '✓ use server'.blue : '×'.dim;
            const dynamicColored = row[5] ? row[5].yellow : '×'.dim;
            const revalidateColored = row[6] ? `${row[6]}s`.cyan : '×'.dim;
            const fetchCacheColored = row[7] ? row[7].magenta : '×'.dim;
            const parallelColored = row[8] ? `= parallel`.orange : '×'.dim;
            const interceptingColored = row[9] ? `⇥ intercepting`.green : '×'.dim;
            const loadingColored = row[10] ? `○ loading`.cyan : '×'.dim;
            const errorColored = row[11] ? `⌀ error`.red : '×'.dim;
            table.push([row[0], routeColored, typeColored, metadataColored, serverActionColored, dynamicColored, revalidateColored, fetchCacheColored, parallelColored, interceptingColored, loadingColored, errorColored]);
        } else {
            const methodColored = formatMethod(row[0]);
            const route = row[2].replace(/\[\.\.\.(\w+)\]/g, '[...$1]'.magenta)
                .replace(/\[(\w+)\]/g, '[$1]'.yellow)
                .replace(/\((\w+)\)/g, '($1)'.blue);
            const routeColored = showFullPath ? `${baseUrl.dim}${route}` : route;
            table.push([methodColored, routeColored]);
        }
    });
    console.log(table.toString());
}

function isClientComponent() {
    return currentFileContent.includes('use client');
}

console.log('Listing routes in src/app:');
const arg = process.argv[2];

if (!arg || arg === 'pages') {
    const routesTable = listRoutes(appDirectory);
    renderTable(routesTable, 'pages');
}

if (!arg || arg === 'api') {
    const apiRoutesTable = listApiRoutes(appDirectory);
    renderTable(apiRoutesTable, 'api');
}

