'use strict';

const path = require('path');
const fs = require('fs');

const PAGE_EXTS = ['.tsx', '.jsx', '.ts', '.js', '.mdx'];
const ROUTE_EXTS = ['.ts', '.js'];
const META_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.xml', '.txt', '.ico', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'];

const PAGE_FILES = new Set(['page']);
const ROUTE_FILES = new Set(['route']);
const UI_FILES = new Set([
  'layout',
  'loading',
  'error',
  'global-error',
  'not-found',
  'forbidden',
  'unauthorized',
  'template',
  'default',
]);
const META_FILES = new Set([
  'sitemap',
  'robots',
  'opengraph-image',
  'twitter-image',
  'icon',
  'apple-icon',
  'favicon',
  'manifest',
]);
const ROOT_FILES = new Set(['proxy', 'middleware', 'instrumentation']);

function parseFileName(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const numbered = base.match(/^(opengraph-image|twitter-image|icon|apple-icon)(\.\d+)?$/);
  const kind = numbered ? numbered[1] : base;
  return { base, ext, kind };
}

function classifyFile(filename) {
  const { ext, kind } = parseFileName(filename);
  if (PAGE_FILES.has(kind) && PAGE_EXTS.includes(ext)) return 'page';
  if (ROUTE_FILES.has(kind) && ROUTE_EXTS.includes(ext)) return 'route';
  if (UI_FILES.has(kind) && PAGE_EXTS.includes(ext)) return kind;
  if (META_FILES.has(kind) && META_EXTS.includes(ext)) return kind;
  if (ROOT_FILES.has(kind) && ROUTE_EXTS.includes(ext)) return kind;
  return null;
}

function parseSegment(segment) {
  if (!segment) return { type: 'empty', name: '' };

  let match = segment.match(/^\(\.\.\.\)(.+)$/);
  if (match) return { type: 'intercept', intercept: '(...)', name: match[1] };

  match = segment.match(/^\(\.\.\)\(\.\.\)(.+)$/);
  if (match) return { type: 'intercept', intercept: '(..)(..)', name: match[1] };

  match = segment.match(/^\(\.\.\)(.+)$/);
  if (match) return { type: 'intercept', intercept: '(..)', name: match[1] };

  match = segment.match(/^\(\.\)(.+)$/);
  if (match) return { type: 'intercept', intercept: '(.)', name: match[1] };

  match = segment.match(/^\((.+)\)$/);
  if (match) return { type: 'group', name: match[1] };

  match = segment.match(/^@(.+)$/);
  if (match) return { type: 'parallel', name: match[1] };

  match = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (match) return { type: 'optional-catch-all', name: match[1], raw: segment };

  match = segment.match(/^\[\.\.\.(.+)\]$/);
  if (match) return { type: 'catch-all', name: match[1], raw: segment };

  match = segment.match(/^\[(.+)\]$/);
  if (match) return { type: 'dynamic', name: match[1], raw: segment };

  return { type: 'static', name: segment, raw: segment };
}

function toUrl(relDir, options = {}) {
  const { includeGroups = false, includeParallel = false, includeInterceptPrefix = false } = options;
  const parts = relDir.split(/[/\\]/).filter(Boolean);
  const groups = [];
  let parallel = null;
  let intercept = null;
  const urlParts = [];

  for (const part of parts) {
    const parsed = parseSegment(part);
    if (parsed.type === 'group') {
      groups.push(parsed.name);
      if (includeGroups) urlParts.push(`(${parsed.name})`);
      continue;
    }
    if (parsed.type === 'parallel') {
      parallel = parsed.name;
      if (includeParallel) urlParts.push(`@${parsed.name}`);
      continue;
    }
    if (parsed.type === 'intercept') {
      intercept = parsed.intercept;
      urlParts.push(includeInterceptPrefix ? `${parsed.intercept}${parsed.name}` : parsed.name);
      continue;
    }
    urlParts.push(parsed.raw || parsed.name);
  }

  const url = `/${urlParts.join('/')}`.replace(/\/+/g, '/') || '/';
  return {
    url: url === '' ? '/' : url,
    groups,
    parallel,
    intercept,
  };
}

function normalizeUrl(url) {
  if (!url || url === '/') return '/';
  return url.replace(/\/+$/, '') || '/';
}

function findAppDirectory(cwd) {
  const candidates = [
    { appDir: path.join(cwd, 'app'), src: false },
    { appDir: path.join(cwd, 'src', 'app'), src: true },
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate.appDir) && fs.statSync(candidate.appDir).isDirectory()) {
      return { ...candidate, root: cwd };
    }
  }
  return null;
}

function findRootFile(projectRoot, src, names) {
  const dirs = src
    ? [path.join(projectRoot, 'src'), projectRoot]
    : [projectRoot];
  for (const dir of dirs) {
    for (const name of names) {
      for (const ext of ROUTE_EXTS) {
        const filePath = path.join(dir, `${name}${ext}`);
        if (fs.existsSync(filePath)) return filePath;
      }
    }
  }
  return null;
}

function relativePosix(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}

module.exports = {
  PAGE_EXTS,
  ROUTE_EXTS,
  PAGE_FILES,
  ROUTE_FILES,
  UI_FILES,
  META_FILES,
  ROOT_FILES,
  classifyFile,
  parseSegment,
  parseFileName,
  toUrl,
  normalizeUrl,
  findAppDirectory,
  findRootFile,
  relativePosix,
};
