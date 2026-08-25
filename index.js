#!/usr/bin/env node
'use strict';

const { main } = require('./bin/next-list');

if (require.main === module) {
  main(process.argv.slice(2));
}
