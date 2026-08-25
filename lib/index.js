'use strict';

const { scan } = require('./scan');
const { render } = require('./render');
const { parseArgs } = require('./args');
const { toUrl, parseSegment } = require('./paths');
const { inspectPage, inspectRoute } = require('./inspect');

function listRoutes(options = {}) {
  return scan(options);
}

module.exports = {
  scan,
  listRoutes,
  render,
  parseArgs,
  toUrl,
  parseSegment,
  inspectPage,
  inspectRoute,
};
