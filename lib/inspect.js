'use strict';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function includesDirective(source, name) {
  const re = new RegExp(`['"]use ${name}['"]`);
  return re.test(source);
}

function firstMatch(source, patterns) {
  for (const { re, value } of patterns) {
    if (re.test(source)) return value;
  }
  return null;
}

function capture(source, re) {
  const match = source.match(re);
  return match ? match[1] : '';
}

function inspectPage(source) {
  const metadata = firstMatch(source, [
    { re: /export\s+async\s+function\s+generateMetadata\b/, value: 'generateMetadata' },
    { re: /export\s+function\s+generateMetadata\b/, value: 'generateMetadata' },
    { re: /export\s+const\s+generateMetadata\b/, value: 'generateMetadata' },
    { re: /export\s+(const|let|var)\s+metadata\b/, value: 'metadata' },
  ]);

  return {
    client: includesDirective(source, 'client'),
    serverAction: includesDirective(source, 'server'),
    useCache: includesDirective(source, 'cache'),
    metadata,
    generateStaticParams: /export\s+(async\s+)?function\s+generateStaticParams\b/.test(source),
    generateViewport: /export\s+(async\s+)?function\s+generateViewport\b/.test(source)
      || /export\s+const\s+viewport\b/.test(source),
    dynamic: capture(source, /export\s+(?:const|let|var)\s+dynamic\s*=\s*['"]([^'"]+)['"]/),
    revalidate: capture(source, /export\s+(?:const|let|var)\s+revalidate\s*=\s*(\d+|false)/),
    fetchCache: capture(source, /export\s+(?:const|let|var)\s+fetchCache\s*=\s*['"]([^'"]+)['"]/),
    runtime: capture(source, /export\s+(?:const|let|var)\s+runtime\s*=\s*['"]([^'"]+)['"]/),
    preferredRegion: capture(source, /export\s+(?:const|let|var)\s+preferredRegion\s*=\s*['"]([^'"]+)['"]/),
    maxDuration: capture(source, /export\s+(?:const|let|var)\s+maxDuration\s*=\s*(\d+)/),
    dynamicParams: capture(source, /export\s+(?:const|let|var)\s+dynamicParams\s*=\s*(true|false)/),
    functionName: extractExportedFunction(source),
  };
}

function extractExportedFunction(source) {
  const named = source.match(/export\s+default\s+(?:async\s+)?function\s+(\w+)/);
  if (named) return named[1];
  const identifier = source.match(/export\s+default\s+(\w+)\s*;?/);
  if (identifier && !['async', 'function'].includes(identifier[1])) return identifier[1];
  return '';
}

function extractHttpMethods(source) {
  const handlers = source.match(/export\s+const\s*\{([^}]+)\}\s*=\s*handlers/);
  if (handlers) {
    return handlers[1]
      .split(',')
      .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
      .filter((name) => HTTP_METHODS.includes(name));
  }

  const reexport = source.match(/export\s*\{([^}]+)\}/);
  if (reexport && /from\s+['"]/.test(source)) {
    const names = reexport[1]
      .split(',')
      .map((part) => part.trim().split(/\s+as\s+/).pop().trim())
      .filter((name) => HTTP_METHODS.includes(name));
    if (names.length) return names;
  }

  const methods = HTTP_METHODS.filter((method) => {
    const fn = new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`);
    const assign = new RegExp(`export\\s+const\\s+${method}\\s*=`);
    return fn.test(source) || assign.test(source);
  });

  return methods.length ? methods : ['GET'];
}

function inspectRoute(source) {
  return {
    methods: extractHttpMethods(source),
    runtime: capture(source, /export\s+(?:const|let|var)\s+runtime\s*=\s*['"]([^'"]+)['"]/),
    maxDuration: capture(source, /export\s+(?:const|let|var)\s+maxDuration\s*=\s*(\d+)/),
    dynamic: capture(source, /export\s+(?:const|let|var)\s+dynamic\s*=\s*['"]([^'"]+)['"]/),
    functionName: extractExportedFunction(source),
  };
}

module.exports = {
  HTTP_METHODS,
  inspectPage,
  inspectRoute,
  extractHttpMethods,
  extractExportedFunction,
};
