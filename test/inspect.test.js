'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inspectPage, extractHttpMethods, extractExportedFunction } = require('../lib/inspect');

describe('inspectPage', () => {
  it('detects client, metadata and segment config', () => {
    const info = inspectPage(`
      'use client'
      export const metadata = { title: 'Hi' }
      export const dynamic = 'force-static'
      export const revalidate = 60
      export default function HomePage() {}
    `);
    assert.equal(info.client, true);
    assert.equal(info.metadata, 'metadata');
    assert.equal(info.dynamic, 'force-static');
    assert.equal(info.revalidate, '60');
    assert.equal(info.functionName, 'HomePage');
  });

  it('detects generateMetadata, use cache and use server', () => {
    const info = inspectPage(`
      'use cache'
      export async function generateMetadata() { return {} }
      async function save() { 'use server' }
      export default async function Page() {}
    `);
    assert.equal(info.useCache, true);
    assert.equal(info.serverAction, true);
    assert.equal(info.metadata, 'generateMetadata');
  });
});

describe('extractHttpMethods', () => {
  it('finds named function exports', () => {
    assert.deepEqual(
      extractHttpMethods('export async function GET() {}\nexport async function POST() {}'),
      ['GET', 'POST'],
    );
  });

  it('finds const handlers', () => {
    assert.deepEqual(
      extractHttpMethods('export const GET = () => {}\nexport const DELETE = () => {}'),
      ['GET', 'DELETE'],
    );
  });

  it('finds NextAuth-style destructuring', () => {
    assert.deepEqual(
      extractHttpMethods('export const { GET, POST } = handlers'),
      ['GET', 'POST'],
    );
  });
});

describe('extractExportedFunction', () => {
  it('reads default async function names', () => {
    assert.equal(extractExportedFunction('export default async function BlogPost() {}'), 'BlogPost');
    assert.equal(extractExportedFunction('export default HomePage;'), 'HomePage');
  });
});
