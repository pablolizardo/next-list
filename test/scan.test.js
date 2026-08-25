'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { scan } = require('../lib/scan');
const { parseArgs } = require('../lib/args');
const { render } = require('../lib/render');

const dir = path.join(__dirname, '../fixtures/demo-app');

describe('scan fixture app', () => {
  const data = scan({ dir });

  it('finds the app directory', () => {
    assert.equal(data.appDir, 'app');
  });

  it('strips route groups from the championships calendar URL', () => {
    const calendar = data.pages.find((page) => page.functionName === 'CalendarPage');
    assert.ok(calendar);
    assert.equal(calendar.url, '/championships/[legacyUrl]/calendar');
  });

  it('skips private folders', () => {
    assert.equal(data.pages.some((page) => page.file.includes('_components')), false);
  });

  it('records parallel and intercepting metadata without polluting the URL', () => {
    const modal = data.pages.find((page) => page.functionName === 'PhotoModal');
    assert.ok(modal);
    assert.equal(modal.url, '/photos/photo/[id]');
    assert.equal(modal.parallel, 'modal');
    assert.equal(modal.intercept, '(.)');
  });

  it('detects HTTP methods including destructured handlers', () => {
    const users = data.api.find((route) => route.url === '/api/users');
    const auth = data.api.find((route) => route.url === '/api/auth/[...nextauth]');
    const health = data.api.find((route) => route.url === '/api/health');
    assert.deepEqual(users.methods, ['GET', 'POST']);
    assert.deepEqual(auth.methods, ['GET', 'POST']);
    assert.equal(health.runtime, 'edge');
  });

  it('detects Next.js 16 proxy and metadata files', () => {
    const kinds = data.special.map((item) => item.kind);
    assert.ok(kinds.includes('proxy'));
    assert.ok(kinds.includes('instrumentation'));
    assert.ok(kinds.includes('sitemap'));
    assert.ok(kinds.includes('robots'));
    assert.ok(kinds.includes('opengraph-image'));
  });

  it('filters by substring', () => {
    const filtered = scan({ dir, filter: 'users' });
    assert.ok(filtered.api.every((route) => route.url.includes('users')));
    assert.equal(filtered.pages.length, 0);
  });

  it('keeps groups with --groups', () => {
    const grouped = scan({ dir, groups: true });
    const about = grouped.pages.find((page) => page.functionName === 'AboutPage');
    assert.equal(about.url, '/(marketing)/about');
  });
});

describe('render', () => {
  const data = scan({ dir });

  it('emits parseable JSON', () => {
    const json = JSON.parse(render(data, { json: true, command: 'all', color: false }));
    assert.ok(Array.isArray(json.pages));
    assert.ok(json.stats.pages > 0);
  });

  it('emits markdown without ANSI codes', () => {
    const md = render(data, { markdown: true, command: 'pages', color: false });
    assert.match(md, /\| Function \| Route \|/);
    assert.doesNotMatch(md, /\x1b\[/);
    assert.match(md, /\/championships\/\[legacyUrl\]\/calendar/);
  });

  it('colors optional catch-alls without eating ANSI codes', () => {
    const { colorRoute } = require('../lib/render');
    const { paint } = require('../lib/colors');
    const colored = colorRoute('/docs/[[...slug]]', paint(true));
    assert.match(colored, /\[\[\.\.\.slug\]\]/);
    assert.doesNotMatch(colored, /\[0m\]/);
  });
});

describe('parseArgs', () => {
  it('parses commands and flags', () => {
    const options = parseArgs(['api', '--json', '--filter', 'blog', '--dir', '/tmp']);
    assert.equal(options.command, 'api');
    assert.equal(options.json, true);
    assert.equal(options.filter, 'blog');
    assert.equal(options.dir, '/tmp');
  });

  it('implies markdown when writing to a file', () => {
    const options = parseArgs(['--out', 'routes.md']);
    assert.equal(options.markdown, true);
    assert.equal(options.color, false);
  });
});
