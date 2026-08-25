'use strict';

const fs = require('fs');
const path = require('path');
const { scan } = require('./lib/scan');
const { render } = require('./lib/render');

const MARKER = '<!-- next-list -->';

function readEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return {};
  return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
}

function repoFromEnv() {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  return { owner, repo };
}

async function github(pathname, init = {}) {
  const token = process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: token ? `Bearer ${token}` : '',
      'User-Agent': 'next-list-action',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function input(name, fallback = '') {
  const key = `INPUT_${name.replace(/[\s-]/g, '_').toUpperCase()}`;
  return process.env[key] ?? fallback;
}

async function upsertComment(number, body) {
  const { owner, repo } = repoFromEnv();
  const comments = await github(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`);
  const existing = comments.find((comment) => comment.body && comment.body.includes(MARKER));
  if (existing) {
    await github(`/repos/${owner}/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
    return;
  }
  await github(`/repos/${owner}/${repo}/issues/${number}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

async function main() {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const projectPath = path.resolve(workspace, input('project-path', '.'));
  const data = scan({
    dir: projectPath,
    filter: input('filter'),
    groups: input('groups') === 'true',
  });
  const markdown = render(data, { markdown: true, command: 'all', stats: true, color: false });
  const body = `${MARKER}\n## next-list\n\n${data.stats.pages} pages · ${data.stats.api} handlers · ${data.stats.methods} methods\n\n${markdown}`;

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) fs.appendFileSync(summary, `${body}\n`);

  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    fs.appendFileSync(outputPath, `pages=${data.stats.pages}\n`);
    fs.appendFileSync(outputPath, `api=${data.stats.api}\n`);
  }

  const event = readEvent();
  const number = event.pull_request?.number || event.issue?.number;
  if (input('comment', 'false') === 'true' && number) {
    await upsertComment(number, body);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { main };
