'use strict';

const CODES = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  orange: '\x1b[38;5;208m',
  pink: '\x1b[38;5;213m',
  lime: '\x1b[38;5;154m',
  white: '\x1b[37m',
};

function shouldColor(force) {
  if (force === false) return false;
  if (force === true) return true;
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0') return true;
  return Boolean(process.stdout && process.stdout.isTTY);
}

function paint(enabled) {
  const wrap = (code) => (text) => {
    if (!enabled || text == null || text === '') return String(text ?? '');
    return `${code}${text}${CODES.reset}`;
  };

  return {
    enabled,
    dim: wrap(CODES.dim),
    bold: wrap(CODES.bold),
    green: wrap(CODES.green),
    blue: wrap(CODES.blue),
    red: wrap(CODES.red),
    gray: wrap(CODES.gray),
    yellow: wrap(CODES.yellow),
    magenta: wrap(CODES.magenta),
    cyan: wrap(CODES.cyan),
    orange: wrap(CODES.orange),
    pink: wrap(CODES.pink),
    lime: wrap(CODES.lime),
    white: wrap(CODES.white),
  };
}

function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*m/g, '');
}

module.exports = { shouldColor, paint, stripAnsi, CODES };
