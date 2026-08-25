'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { toUrl, parseSegment, classifyFile } = require('../lib/paths');

describe('parseSegment', () => {
  it('detects route groups', () => {
    assert.deepEqual(parseSegment('(marketing)'), { type: 'group', name: 'marketing' });
  });

  it('detects parallel slots', () => {
    assert.deepEqual(parseSegment('@modal'), { type: 'parallel', name: 'modal' });
  });

  it('detects intercepting prefixes before groups', () => {
    assert.deepEqual(parseSegment('(.)photo'), { type: 'intercept', intercept: '(.)', name: 'photo' });
    assert.deepEqual(parseSegment('(..)photo'), { type: 'intercept', intercept: '(..)', name: 'photo' });
    assert.deepEqual(parseSegment('(...)photo'), { type: 'intercept', intercept: '(...)', name: 'photo' });
    assert.deepEqual(parseSegment('(..)(..)photo'), { type: 'intercept', intercept: '(..)(..)', name: 'photo' });
  });

  it('detects dynamic segments', () => {
    assert.equal(parseSegment('[slug]').type, 'dynamic');
    assert.equal(parseSegment('[...slug]').type, 'catch-all');
    assert.equal(parseSegment('[[...slug]]').type, 'optional-catch-all');
  });
});

describe('toUrl', () => {
  it('strips route groups by default', () => {
    const result = toUrl('(pages)/championships/[legacyUrl]/(with-layout)/calendar');
    assert.equal(result.url, '/championships/[legacyUrl]/calendar');
    assert.deepEqual(result.groups, ['pages', 'with-layout']);
  });

  it('keeps groups when asked', () => {
    const result = toUrl('(marketing)/about', { includeGroups: true });
    assert.equal(result.url, '/(marketing)/about');
  });

  it('omits parallel slots from the URL', () => {
    const result = toUrl('photos/@modal/(.)photo/[id]');
    assert.equal(result.url, '/photos/photo/[id]');
    assert.equal(result.parallel, 'modal');
    assert.equal(result.intercept, '(.)');
  });

  it('maps the root page to /', () => {
    assert.equal(toUrl('').url, '/');
  });
});

describe('classifyFile', () => {
  it('accepts js ts tsx jsx mdx pages and ts js routes', () => {
    assert.equal(classifyFile('page.tsx'), 'page');
    assert.equal(classifyFile('page.mdx'), 'page');
    assert.equal(classifyFile('page.js'), 'page');
    assert.equal(classifyFile('route.ts'), 'route');
    assert.equal(classifyFile('loading.tsx'), 'loading');
    assert.equal(classifyFile('forbidden.ts'), 'forbidden');
    assert.equal(classifyFile('proxy.ts'), 'proxy');
    assert.equal(classifyFile('opengraph-image.tsx'), 'opengraph-image');
    assert.equal(classifyFile('Button.tsx'), null);
  });
});
