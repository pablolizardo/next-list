# next-list for Next.js 🗺️

![npm](https://img.shields.io/npm/v/next-list)
![License](https://img.shields.io/npm/l/next-list)

A command-line utility to explore and visualize all routes in your Next.js application, including both pages and API routes. This tool aims to simplify debugging when working in the Next.js app directory and to provide clear insights into which routes are being rendered, both for pages and API routes. Inspired by the `php artisan route:list` command.

## Screenshots 📸

![next-list CLI output](https://i.postimg.cc/Yq2YtVgQ/Screenshot-2024-12-04-at-3-12-27-PM.png)

## Features ✨

- 📋 Lists all page routes and API routes in your Next.js app
- 🎨 Color-coded route segments:
  - 🟡 Dynamic segments `[param]` in yellow
  - 🔵 Optional segments `(param)` in blue
  - 🟣 Catch-all segments `[...param]` in magenta
  - 🟠 Parallel routes `@folder` in orange
  - 💗 Intercepting routes `(.)` and `(..)` in pink
- 📝 Shows the exported function names for each route
- 🔍 Supports dynamic routes (`[param]`) and optional segments (`(param)`)
- 📊 Beautiful CLI table output with full URLs
- 🔄 Detects and displays metadata exports, returning either `"metadata"` or `"generateMetadata"`
- ⚡ Identifies client/server components
- 🔒 Shows server actions usage
- ⏱️ Displays revalidation settings
- 💾 Shows fetch cache configurations
- 🔄 Dynamic route configurations
- 🚦 Color-coded HTTP methods in API routes
- ⚡ Performance optimizations with file content caching
- 📂 Support for loading.tsx and error.tsx detection
- 🔄 Improved API route method detection (including destructured handlers)

## Installation & Usage 📦

### Option 1: ✨ Run directly with npx (no installation required)

```bash
npx next-list [pages|api]
```

### Option 2: Global installation

```bash
npm install -g next-list
next-list [pages|api]
```

### Option 3: Local installation

```bash
npm install next-list
npm run list [pages|api]
```

Options:

- `pages`: List only page routes
- `api`: List only API routes
- `--full` or `-f`: Show full URLs including base URL

## Output Example 📄

1. **Page Routes Table:**

```
| Function Name | Route                    | Type      | Metadata | Server Action | Dynamic | Revalidate | FetchCache | Loading | Error |
|---------------|--------------------------|-----------|----------|---------------|---------|------------|------------|---------|-------|
| HomePage      | /                        | ⇢ client  | ✓        | ×             | -       | 30s        | force-cache| ○       | ⌀     |
| AboutPage     | /about                   | ⇠ server  | ✓        | ✓             | auto    | -          | -          | ○       | ×     |
| UserProfile   | /users/[id]              | ⇢ client  | ✓        | ×             | -       | -          | -          | ×       | ⌀     |
| Settings      | /@modal/settings         | ⇠ server  | ×        | ✓             | -       | -          | -          | ○       | ×     |
| EditPhoto     | /photos/(.)edit          | ⇢ client  | ×        | ✓             | -       | -          | -          | ×       | ×     |
```

2. **API Routes Table:**

```
| Method            | Route                         |
|-------------------|-------------------------------|
| GET | POST        | /api/users                    |
| DELETE           | /api/users/[id]               |
| GET | PUT | PATCH | /api/items                    |
```

## Performance Improvements 🚀

- File content caching to reduce disk I/O operations
- Optimized route parsing with improved regex patterns
- Memory cleanup on process exit
- Efficient handling of destructured API route methods

## Contributing 🤝

Contributions are welcome! If you have suggestions or improvements, please fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License 📄

MIT © Pablo Lizardo
https://www.pablolizardo.dev | https://www.casaa.com.ar

---

Made with ❤️ for the Next.js community
