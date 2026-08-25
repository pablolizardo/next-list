'use strict';

const { paint } = require('./colors');
const { parseSegment } = require('./paths');

function baseUrl() {
  return process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';
}

function prefixUrl(url, full) {
  if (!full) return url;
  if (url === '*') return `${baseUrl()}/*`;
  return `${baseUrl().replace(/\/$/, '')}${url}`;
}

function colorRoute(url, c) {
  const [pathname, ...rest] = String(url).split(/(?=\?)/);
  const prefixMatch = pathname.match(/^(https?:\/\/[^/]+)?(.*)$/);
  const origin = prefixMatch[1] || '';
  const pathPart = prefixMatch[2] || pathname;
  const colored = pathPart
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      const parsed = parseSegment(segment);
      if (parsed.type === 'optional-catch-all') return c.magenta(segment);
      if (parsed.type === 'catch-all') return c.magenta(segment);
      if (parsed.type === 'dynamic') return c.yellow(segment);
      if (parsed.type === 'group') return c.blue(segment);
      if (parsed.type === 'parallel') return c.orange(segment);
      if (parsed.type === 'intercept') {
        return `${c.pink(parsed.intercept)}${parsed.name}`;
      }
      return segment;
    })
    .join('/');
  return `${origin}${colored}${rest.join('')}`;
}

function formatMethod(method, c) {
  switch (method) {
    case 'GET':
      return c.green(method);
    case 'POST':
      return c.blue(method);
    case 'DELETE':
      return c.red(method);
    case 'PUT':
      return c.magenta(method);
    case 'PATCH':
      return c.yellow(method);
    case 'HEAD':
      return c.gray(method);
    case 'OPTIONS':
      return c.cyan(method);
    default:
      return method;
  }
}

function pageRows(pages, options, c) {
  return pages.map((page) => {
    const route = colorRoute(prefixUrl(page.url, options.full), c);
    const type = page.client ? c.red('client') : c.dim('server');
    const meta = page.metadata
      ? (page.metadata === 'generateMetadata' ? c.cyan('generateMetadata') : c.green('metadata'))
      : c.dim('·');
    const flags = [
      page.loading ? c.cyan('loading') : null,
      page.error ? c.red('error') : null,
      page.notFound ? c.yellow('not-found') : null,
      page.forbidden ? c.red('forbidden') : null,
      page.unauthorized ? c.red('unauthorized') : null,
      page.parallel ? c.orange(`@${page.parallel}`) : null,
      page.intercept ? c.pink(page.intercept) : null,
      page.serverAction ? c.blue('action') : null,
      page.useCache ? c.lime('cache') : null,
    ].filter(Boolean).join(' ') || c.dim('·');

    const row = [
      page.functionName || c.dim('—'),
      route,
      type,
      meta,
      flags,
    ];

    if (options.verbose) {
      row.push(
        page.dynamic ? c.yellow(page.dynamic) : c.dim('·'),
        page.revalidate ? c.cyan(`${page.revalidate}s`) : c.dim('·'),
        page.fetchCache ? c.magenta(page.fetchCache) : c.dim('·'),
        page.runtime || c.dim('·'),
        page.file,
      );
    }
    return row;
  });
}

function apiRows(routes, options, c) {
  return routes.map((route) => {
    const methods = route.methods.map((method) => formatMethod(method, c)).join(c.dim(' · '));
    const row = [
      methods,
      colorRoute(prefixUrl(route.url, options.full), c),
      route.runtime ? c.yellow(route.runtime) : c.dim('nodejs'),
    ];
    if (options.verbose) {
      row.push(route.maxDuration ? `${route.maxDuration}s` : c.dim('·'), route.file);
    }
    return row;
  });
}

function specialRows(items, options, c) {
  return items.map((item) => [
    c.lime(item.kind),
    colorRoute(prefixUrl(item.url, options.full), c),
    item.file,
  ]);
}

function renderTable(data, options = {}) {
  const Table = require('cli-table3');
  const c = paint(options.color);
  const chunks = [];
  const includePages = options.command === 'all' || options.command === 'pages';
  const includeApi = options.command === 'all' || options.command === 'api';
  const includeSpecial = options.command === 'all' || options.command === 'special';

  if (includePages) {
    const head = ['Function', 'Route', 'Type', 'Metadata', 'Flags'];
    if (options.verbose) head.push('Dynamic', 'Revalidate', 'FetchCache', 'Runtime', 'File');
    const table = new Table({ head, style: { head: [], border: [], compact: true } });
    const rows = pageRows(data.pages, options, c);
    if (rows.length) rows.forEach((row) => table.push(row));
    else table.push([{ colSpan: head.length, content: c.dim('No page routes found') }]);
    chunks.push(`${c.bold('Pages')}  ${c.dim(`${data.pages.length}`)}\n${table.toString()}`);
  }

  if (includeApi) {
    const head = ['Methods', 'Route', 'Runtime'];
    if (options.verbose) head.push('MaxDuration', 'File');
    const table = new Table({ head, style: { head: [], border: [], compact: true } });
    const rows = apiRows(data.api, options, c);
    if (rows.length) rows.forEach((row) => table.push(row));
    else table.push([{ colSpan: head.length, content: c.dim('No route handlers found') }]);
    chunks.push(`${c.bold('Route handlers')}  ${c.dim(`${data.api.length}`)}\n${table.toString()}`);
  }

  if (includeSpecial) {
    const head = ['Kind', 'Route', 'File'];
    const table = new Table({ head, style: { head: [], border: [], compact: true } });
    const rows = specialRows(data.special, options, c);
    if (rows.length) rows.forEach((row) => table.push(row));
    else table.push([{ colSpan: head.length, content: c.dim('No special files found') }]);
    chunks.push(`${c.bold('Special files')}  ${c.dim(`${data.special.length}`)}\n${table.toString()}`);
  }

  return chunks.join('\n\n');
}

function mdCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|') || '·';
}

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}`;
}

function renderMarkdown(data, options = {}) {
  const parts = [];
  const includePages = options.command === 'all' || options.command === 'pages';
  const includeApi = options.command === 'all' || options.command === 'api';
  const includeSpecial = options.command === 'all' || options.command === 'special';

  if (includePages) {
    const headers = ['Function', 'Route', 'Type', 'Metadata', 'Flags'];
    if (options.verbose) headers.push('Dynamic', 'Revalidate', 'Runtime', 'File');
    const rows = data.pages.map((page) => {
      const flags = [
        page.loading && 'loading',
        page.error && 'error',
        page.notFound && 'not-found',
        page.parallel && `@${page.parallel}`,
        page.intercept,
        page.serverAction && 'action',
        page.useCache && 'cache',
      ].filter(Boolean).join(' ') || '·';
      const row = [
        page.functionName || '—',
        prefixUrl(page.url, options.full),
        page.client ? 'client' : 'server',
        page.metadata || '·',
        flags,
      ];
      if (options.verbose) row.push(page.dynamic || '·', page.revalidate || '·', page.runtime || '·', page.file);
      return row;
    });
    parts.push(`### Pages (${data.pages.length})\n\n${mdTable(headers, rows.length ? rows : [['—', 'No page routes', '—', '—', '—']])}`);
  }

  if (includeApi) {
    const rows = data.api.map((route) => [
      route.methods.join(' '),
      prefixUrl(route.url, options.full),
      route.runtime || 'nodejs',
      options.verbose ? route.file : undefined,
    ].filter((cell) => cell !== undefined));
    const headers = options.verbose ? ['Methods', 'Route', 'Runtime', 'File'] : ['Methods', 'Route', 'Runtime'];
    parts.push(`### Route handlers (${data.api.length})\n\n${mdTable(headers, rows.length ? rows : [['—', 'No route handlers', '—']])}`);
  }

  if (includeSpecial) {
    const rows = data.special.map((item) => [item.kind, prefixUrl(item.url, options.full), item.file]);
    parts.push(`### Special files (${data.special.length})\n\n${mdTable(['Kind', 'Route', 'File'], rows.length ? rows : [['—', 'None', '—']])}`);
  }

  return parts.join('\n\n');
}

function renderTree(data, options = {}) {
  const c = paint(options.color);
  const lines = [c.bold(data.appDir)];
  const items = [
    ...(options.command === 'api' ? [] : data.pages),
    ...(options.command === 'pages' ? [] : data.api),
  ];
  const files = [...new Set(items.map((item) => item.file))].sort();
  files.forEach((file, index) => {
    const last = index === files.length - 1;
    const item = items.find((entry) => entry.file === file);
    const label = item && item.methods
      ? `${file}  ${c.dim(item.methods.join(' '))}  ${colorRoute(item.url, c)}`
      : `${file}  ${colorRoute(item ? item.url : '', c)}`;
    lines.push(`${last ? '└──' : '├──'} ${label}`);
  });
  return lines.join('\n');
}

function renderStats(data, c) {
  const bits = [
    `${data.stats.pages} pages`,
    `${data.stats.api} handlers`,
    `${data.stats.methods} methods`,
    `${data.stats.client} client`,
    `${data.stats.server} server`,
  ];
  if (data.stats.parallel) bits.push(`${data.stats.parallel} parallel`);
  if (data.stats.intercepting) bits.push(`${data.stats.intercepting} intercepting`);
  return c.dim(bits.join('  ·  '));
}

function renderHeader(data, options, c) {
  const { version } = require('../package.json');
  return `${c.lime('next-list')} ${c.dim(version)}  ${c.dim('·')}  ${c.white(data.appDir)}  ${c.dim('·')}  ${renderStats(data, c)}`;
}

function render(data, options = {}) {
  const c = paint(options.color);
  if (options.json) {
    return `${JSON.stringify(data, null, 2)}\n`;
  }

  let body;
  if (options.tree) body = renderTree(data, options);
  else if (options.markdown) body = renderMarkdown(data, options);
  else body = renderTable(data, options);

  const header = options.markdown || options.json ? '' : `${renderHeader(data, options, c)}\n\n`;
  const stats = options.stats && !options.json ? `\n\n${renderStats(data, c)}` : '';
  return `${header}${body}${stats}\n`;
}

module.exports = {
  render,
  renderTable,
  renderMarkdown,
  renderTree,
  renderStats,
  colorRoute,
  formatMethod,
  prefixUrl,
};
