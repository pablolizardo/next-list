# Changelog

## 2.0.0 — 2026-08-25

A full rewrite aimed at Next.js 15/16 App Router apps.

### Added
- JSON, markdown, tree and stats output
- `--out` / `-o` to write a file without ANSI color codes
- `--filter`, `--dir`, `--verbose`, `--groups`, `--fs`
- GitHub Action that writes a job summary and can sticky-comment PRs
- Programmatic API via `require('next-list')`
- Detection for `proxy.ts`, `instrumentation.ts`, `sitemap`, `robots`, OG images, `forbidden`, `unauthorized`, `'use cache'`
- Support for `.js`, `.jsx`, `.ts`, `.tsx` and `.mdx` pages
- Tests against a fixture App Router project

### Changed
- Route groups `(folder)` are omitted from URLs by default (use `--groups` to keep them)
- Parallel `@slots` and intercept prefixes are metadata, not URL segments
- API routes no longer append `/route`
- Colors are disabled when piping or when `NO_COLOR` is set
- License is MIT (was listed as ISC in package.json)

### Fixed
- Exporting with `npx next-list > routes.md` no longer dumps escape codes (#1)
- Soft-bracket route groups no longer leak into the displayed path (#2)
