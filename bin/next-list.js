#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, HELP, version } = require('../lib/args');
const { scan } = require('../lib/scan');
const { render } = require('../lib/render');
const { shouldColor } = require('../lib/colors');

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    process.stdout.write(`${HELP.trim()}\n`);
    return;
  }
  if (options.version) {
    process.stdout.write(`${version}\n`);
    return;
  }

  options.color = shouldColor(options.color);

  let data;
  try {
    data = scan(options);
  } catch (error) {
    if (error.code === 'NO_APP_DIR') {
      console.error(`next-list: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const output = render(data, options);

  if (options.out) {
    const outPath = path.resolve(options.dir, options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf8');
    if (process.stdout.isTTY) {
      console.error(`Wrote ${outPath}`);
    }
    return;
  }

  process.stdout.write(output);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { main };
