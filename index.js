#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const Table = require('cli-table3');

const appDirectory = fs.existsSync(path.join(process.cwd(), 'app'))
    ? path.join(process.cwd(), 'app')
    : fs.existsSync(path.join(process.cwd(), 'src/app'))
        ? path.join(process.cwd(), 'src/app')
        : null;

if (!appDirectory) {
    console.error('🚫 This tool only works with projects using an "app" directory.'.yellow);
    process.exit(1);
}

function hasMetadata(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const metadataPatterns = [
        'export const metadata',
        'export async function generateMetadata',
        'export function generateMetadata',
        'export const generateMetadata',
        'export let metadata',
        'export var metadata',
        'export const metadata:',
        'export const generateMetadata:',
    ];

    return metadataPatterns.some(pattern => fileContent.includes(pattern));
}

function hasServerAction(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent.includes('use server');
}

function extractDynamicValue(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const match = fileContent.match(/export (?:const|let|var) dynamic\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '';
}

function extractRevalidateValue(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const match = fileContent.match(/export (?:const|let|var) revalidate\s*=\s*(\d+)/);
    return match ? match[1] : '';
}

function extractFetchCacheValue(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const match = fileContent.match(/export (?:const|let|var) fetchCache\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '';
}

function listRoutes(dir, baseRoute = '') {
    let table = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
            table = table.concat(listRoutes(fullPath, `${baseRoute}/${dirent.name}`));
        } else if (dirent.isFile() && dirent.name.endsWith('page.tsx')) {
            const route = `${baseRoute}/${dirent.name.replace(/page\.tsx$/, '')}`;
            const functionName = extractExportedFunction(fullPath);
            const componentType = isClientComponent(fullPath) ? 'use client' : '';
            const hasMetadataExport = hasMetadata(fullPath);
            const hasServerActionDirective = hasServerAction(fullPath);
            const dynamicValue = extractDynamicValue(fullPath);
            const revalidateValue = extractRevalidateValue(fullPath);
            const fetchCacheValue = extractFetchCacheValue(fullPath);
            table.push([functionName, route, componentType, hasMetadataExport, hasServerActionDirective, dynamicValue, revalidateValue, fetchCacheValue]);
        }
    });
    return table;
}

function listApiRoutes(dir, baseRoute = '') {
    let table = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
            table = table.concat(listApiRoutes(fullPath, `${baseRoute}/${dirent.name}`));
        } else if (dirent.isFile() && dirent.name === 'route.ts') {
            const route = `${baseRoute}/route`;
            const methods = extractHttpMethods(fullPath);
            const functionName = extractExportedFunction(fullPath);
            methods.forEach(method => {
                table.push([method, functionName, route]);
            });
        }
    });
    return table;
}

function extractHttpMethods(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const methods = [];
    const methodPatterns = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    methodPatterns.forEach(method => {
        if (fileContent.includes(`export async function ${method}`) || fileContent.includes(`export const { ${method} } = handlers`)) {
            methods.push(method);
        }
    });
    return methods.length > 0 ? methods : ['GET'];
}

function extractExportedFunction(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const match = fileContent.match(/export default (async function )?(\w+)/) || fileContent.match(/export default (\w+)/);
    return match ? match[2] || match[1] : '';
}

function formatMethod(method) {
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
        default:
            return method;
    }
}

function renderTable(tableData, type = 'pages') {
    const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'https://localhost:3000';
    const showFullPath = process.argv.includes('--full') || process.argv.includes('-f');

    const table = new Table({
        head: type === 'pages'
            ? ['Function Name', 'Route', 'Type', 'Metadata', 'Server Action', 'Dynamic', 'Revalidate', 'FetchCache']
            : ['Method', 'Route'],
        colWidths: type === 'pages'
            ? [22, 62, 14, 14, 14, 14, 14, 14]
            : [12, 96],
        style: {
            head: [],
            border: [],
            compact: true
        }
    });

    tableData.forEach(row => {
        if (type === 'pages') {
            const route = row[1].replace(/\[(\w+)\]/g, '[$1]'.yellow)
                .replace(/\((\w+)\)/g, '($1)'.blue);
            const routeColored = showFullPath ? `${baseUrl.dim}${route}` : route;
            const typeColored = row[2] === 'use client' ? '⇢ use client'.red : '⇠ server'.dim;
            const metadataColored = row[3] ? '✓ metadata'.green : '×'.dim;
            const serverActionColored = row[4] ? '✓ use server'.blue : '×'.dim;
            const dynamicColored = row[5] ? row[5].yellow : '-'.dim;
            const revalidateColored = row[6] ? `${row[6]}s`.cyan : '-'.dim;
            const fetchCacheColored = row[7] ? row[7].magenta : '-'.dim;
            table.push([row[0], routeColored, typeColored, metadataColored, serverActionColored, dynamicColored, revalidateColored, fetchCacheColored]);
        } else {
            const methodColored = formatMethod(row[0]);
            const route = row[2].replace(/\[(\w+)\]/g, '[$1]'.yellow)
                .replace(/\((\w+)\)/g, '($1)'.blue);
            const routeColored = showFullPath ? `${baseUrl.dim}${route}` : route;
            table.push([methodColored, routeColored]);
        }
    });

    console.log(table.toString());
}

function isClientComponent(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent.includes('use client');
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