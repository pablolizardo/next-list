'use strict';

const fs = require('fs');
const path = require('path');
const { inspectPage, inspectRoute } = require('./inspect');
const {
  classifyFile,
  toUrl,
  normalizeUrl,
  findAppDirectory,
  findRootFile,
  relativePosix,
  UI_FILES,
  META_FILES,
} = require('./paths');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build']);

function readCached(cache, filePath) {
  if (cache.has(filePath)) return cache.get(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  cache.set(filePath, source);
  return source;
}

function walk(dir, relDir, files) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Cannot read ${dir}: ${error.message}`);
  }

  for (const entry of entries) {
    if (entry.name.startsWith('_') || SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const nextRel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walk(fullPath, nextRel, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const kind = classifyFile(entry.name);
    if (!kind) continue;
    files.push({ kind, fullPath, relDir, filename: entry.name });
  }
}

function uiBucket() {
  return {
    layout: false,
    loading: false,
    error: false,
    notFound: false,
    forbidden: false,
    unauthorized: false,
    template: false,
    default: false,
  };
}

function attachUi(dirUi, kind) {
  const map = {
    layout: 'layout',
    loading: 'loading',
    error: 'error',
    'not-found': 'notFound',
    forbidden: 'forbidden',
    unauthorized: 'unauthorized',
    template: 'template',
    default: 'default',
    'global-error': 'error',
  };
  const key = map[kind];
  if (key) dirUi[key] = true;
}

function scan(options = {}) {
  const cwd = path.resolve(options.dir || process.cwd());
  const found = findAppDirectory(cwd);
  if (!found) {
    const error = new Error('No App Router directory found (looked for app/ and src/app/).');
    error.code = 'NO_APP_DIR';
    throw error;
  }

  const cache = new Map();
  const files = [];
  walk(found.appDir, '', files);

  const uiByDir = new Map();
  const pages = [];
  const api = [];
  const special = [];

  for (const file of files) {
    if (UI_FILES.has(file.kind)) {
      if (!uiByDir.has(file.relDir)) uiByDir.set(file.relDir, uiBucket());
      attachUi(uiByDir.get(file.relDir), file.kind);
    }
  }

  const pathOptions = {
    includeGroups: Boolean(options.groups),
    includeParallel: Boolean(options.fs),
    includeInterceptPrefix: Boolean(options.fs),
  };

  for (const file of files) {
    const mapped = toUrl(file.relDir, pathOptions);
    const url = normalizeUrl(options.fs ? `/${file.relDir}` : mapped.url);
    const relFile = relativePosix(cwd, file.fullPath);

    if (file.kind === 'page') {
      const source = readCached(cache, file.fullPath);
      const info = inspectPage(source);
      const ui = uiByDir.get(file.relDir) || uiBucket();
      pages.push({
        type: 'page',
        url,
        file: relFile,
        functionName: info.functionName,
        client: info.client,
        serverAction: info.serverAction,
        useCache: info.useCache,
        metadata: info.metadata,
        generateStaticParams: info.generateStaticParams,
        generateViewport: info.generateViewport,
        dynamic: info.dynamic,
        revalidate: info.revalidate,
        fetchCache: info.fetchCache,
        runtime: info.runtime,
        preferredRegion: info.preferredRegion,
        maxDuration: info.maxDuration,
        dynamicParams: info.dynamicParams,
        groups: mapped.groups,
        parallel: mapped.parallel,
        intercept: mapped.intercept,
        ...ui,
      });
    } else if (file.kind === 'route') {
      const source = readCached(cache, file.fullPath);
      const info = inspectRoute(source);
      api.push({
        type: 'api',
        url,
        file: relFile,
        methods: info.methods,
        functionName: info.functionName,
        runtime: info.runtime,
        maxDuration: info.maxDuration,
        dynamic: info.dynamic,
        groups: mapped.groups,
        parallel: mapped.parallel,
        intercept: mapped.intercept,
      });
    } else if (META_FILES.has(file.kind) || file.kind === 'layout' || file.kind === 'global-error') {
      if (file.kind === 'layout' && file.relDir !== '') continue;
      special.push({
        type: 'special',
        kind: file.kind,
        url: file.kind === 'layout' ? '/' : url,
        file: relFile,
      });
    }
  }

  const proxy = findRootFile(found.root, found.src, ['proxy']);
  const middleware = findRootFile(found.root, found.src, ['middleware']);
  const instrumentation = findRootFile(found.root, found.src, ['instrumentation']);

  if (proxy) {
    special.push({ type: 'special', kind: 'proxy', url: '*', file: relativePosix(cwd, proxy) });
  } else if (middleware) {
    special.push({ type: 'special', kind: 'middleware', url: '*', file: relativePosix(cwd, middleware) });
  }
  if (instrumentation) {
    special.push({
      type: 'special',
      kind: 'instrumentation',
      url: '*',
      file: relativePosix(cwd, instrumentation),
    });
  }

  pages.sort(byUrl);
  api.sort(byUrl);
  special.sort((a, b) => a.kind.localeCompare(b.kind) || a.url.localeCompare(b.url));

  const filter = (options.filter || '').trim().toLowerCase();
  const match = (item) => {
    if (!filter) return true;
    return [item.url, item.file, item.functionName, ...(item.methods || []), item.kind]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(filter));
  };

  const result = {
    root: cwd,
    appDir: relativePosix(cwd, found.appDir) || (found.src ? 'src/app' : 'app'),
    src: found.src,
    pages: pages.filter(match),
    api: api.filter(match),
    special: special.filter(match),
  };

  result.stats = {
    pages: result.pages.length,
    api: result.api.length,
    special: result.special.length,
    client: result.pages.filter((p) => p.client).length,
    server: result.pages.filter((p) => !p.client).length,
    parallel: result.pages.filter((p) => p.parallel).length,
    intercepting: result.pages.filter((p) => p.intercept).length,
    methods: result.api.reduce((sum, route) => sum + route.methods.length, 0),
  };

  return result;
}

function byUrl(a, b) {
  return a.url.localeCompare(b.url) || a.file.localeCompare(b.file);
}

module.exports = { scan };
