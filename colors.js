const colorCodes = {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    violet: '\x1b[35m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

Object.entries(colorCodes).forEach(([color, code]) => {
    Object.defineProperty(String.prototype, color, {
        get() {
            return `${code}${this}\x1b[0m`;
        }
    });
});

const colors = Object.fromEntries(
    Object.entries(colorCodes).map(([color, code]) => [
        color,
        (text) => `${code}${text}\x1b[0m`
    ])
);

module.exports = colors; 