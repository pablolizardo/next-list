#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');

const appDirectory = fs.existsSync(path.join(process.cwd(), 'app'))
    ? path.join(process.cwd(), 'app')
    : path.join(process.cwd(), 'src/app');

function listRoutes(dir, baseRoute = '') {
    let table = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
            table = table.concat(listRoutes(fullPath, `${baseRoute}/${dirent.name}`));
        } else if (dirent.isFile() && dirent.name.endsWith('page.tsx')) {
            const route = `${baseRoute}/${dirent.name.replace(/page\.tsx$/, '')}`;
            const functionName = extractExportedFunction(fullPath);
            table.push([chalk.green('GET'), functionName, route]);
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
            return chalk.green(method);
        case 'POST':
            return chalk.yellow(method);
        case 'DELETE':
            return chalk.red(method);
        case 'HEAD':
            return chalk.gray(method);
        case 'PUT':
            return chalk.blue(method);
        default:
            return method;
    }
}

function renderTable(tableData) {
    const table = new Table({
        head: ['Method', 'Function Name', 'Route', 'Full URL'],
        colWidths: [12, 28, 48, 60],
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        style: {
            head: [],
            border: []
        }
    });

    tableData.forEach(row => {
        const methodColored = formatMethod(row[0]);
        const routeColored = row[2]
            .replace(/\[(\w+)\]/g, chalk.yellow('[$1]'))
            .replace(/\((\w+)\)/g, chalk.blue('($1)'));
        const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'https://localhost:3000';
        const fullUrl = `${baseUrl}${row[2]}`;
        table.push([methodColored, row[1], routeColored, fullUrl]);
    });

    console.log(table.toString());
}

console.log('Listing routes in src/app:');
const arg = process.argv[2];

if (!arg || arg === 'pages') {
    const routesTable = listRoutes(appDirectory);
    renderTable(routesTable);
}

if (!arg || arg === 'api') {
    const apiRoutesTable = listApiRoutes(appDirectory);
    renderTable(apiRoutesTable);
}