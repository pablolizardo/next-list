'use strict';

const { version } = require('../package.json');

const HELP = `
  next-list  ${version}
  List every App Router page, route handler and special file.

  Usage
    $ next-list [pages|api|special] [options]

  Commands
    pages              Page routes only
    api                Route handlers (route.ts) only
    special            proxy, sitemap, robots, metadata files

  Options
    -h, --help         Show this help
    -v, --version      Print version
    -f, --full         Prefix routes with BASE_URL / APP_URL
    -j, --json         JSON output (pipe-friendly)
    -m, --md           GitHub-flavored markdown table
        --markdown     Alias of --md
    -t, --tree         Filesystem tree with resolved URLs
        --stats        Print counts after the table
        --verbose      Extra columns (dynamic, cache, runtime, …)
        --compact      Fewer columns (default)
        --groups       Keep (route-groups) in the displayed path
        --fs           Show the filesystem path instead of the URL
        --filter <s>   Keep routes whose URL or file contains <s>
    -o, --out <file>   Write output to a file (markdown unless --json)
        --dir <path>   Project root (default: cwd)
        --no-color     Disable ANSI colors
        --color        Force colors even when piped

  Examples
    $ npx next-list
    $ npx next-list api --json
    $ npx next-list --md --out routes.md
    $ npx next-list --filter /blog --stats
`;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    command: 'all',
    help: false,
    version: false,
    full: false,
    json: false,
    markdown: false,
    tree: false,
    stats: false,
    verbose: false,
    groups: false,
    fs: false,
    filter: '',
    out: '',
    dir: process.cwd(),
    color: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '-v' || arg === '--version') options.version = true;
    else if (arg === '-f' || arg === '--full') options.full = true;
    else if (arg === '-j' || arg === '--json') options.json = true;
    else if (arg === '-m' || arg === '--md' || arg === '--markdown') options.markdown = true;
    else if (arg === '-t' || arg === '--tree') options.tree = true;
    else if (arg === '--stats') options.stats = true;
    else if (arg === '--verbose' || arg === '-V') options.verbose = true;
    else if (arg === '--compact') options.verbose = false;
    else if (arg === '--groups') options.groups = true;
    else if (arg === '--fs') options.fs = true;
    else if (arg === '--no-color') options.color = false;
    else if (arg === '--color') options.color = true;
    else if (arg === '--filter') {
      options.filter = next || '';
      i += 1;
    } else if (arg.startsWith('--filter=')) options.filter = arg.slice(9);
    else if (arg === '-o' || arg === '--out') {
      options.out = next || '';
      i += 1;
    } else if (arg.startsWith('--out=')) options.out = arg.slice(6);
    else if (arg === '--dir') {
      options.dir = next || options.dir;
      i += 1;
    } else if (arg.startsWith('--dir=')) options.dir = arg.slice(6);
    else if (!arg.startsWith('-') && ['pages', 'api', 'special', 'all'].includes(arg)) {
      options.command = arg;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}\n${HELP}`);
    }
  }

  if (options.out && !options.json && !options.tree) {
    options.markdown = true;
  }

  if (options.json || options.markdown || options.out) {
    if (options.color === undefined) options.color = false;
  }

  return options;
}

module.exports = { parseArgs, HELP, version };
