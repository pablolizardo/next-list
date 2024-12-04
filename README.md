# next-list for Next.js 🗺️

![npm](https://img.shields.io/npm/v/next-list)
![License](https://img.shields.io/npm/l/next-list)

A command-line utility to explore and visualize all routes in your Next.js application, including both pages and API routes. This tool aims to simplify debugging when working in the Next.js app directory and to provide clear insights into which routes are being rendered, both for pages and API routes. Inspired by the `php artisan route:list` command.

## Features ✨

- 📋 Lists all page routes and API routes in your Next.js app
- 🎨 Color-coded HTTP methods for better visualization
- 📝 Shows the exported function names for each route
- 🔍 Supports dynamic routes (`[param]`) and optional segments (`(param)`)
- 📊 Beautiful CLI table output with full URLs
- 🔄 Detects and displays metadata exports
- ⚡ Identifies client/server components
- 🔒 Shows server actions usage
- ⏱️ Displays revalidation settings
- 💾 Shows fetch cache configurations
- 🔄 Dynamic route configurations

## Screenshots 📸

![next-list CLI output](https://i.postimg.cc/pX7bq9yF/Screenshot-2024-12-04-at-1-27-32-AM.png)

## Installation & Usage 📦

### Option 1: Run directly with npx (no installation required)

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
| Function Name | Route | Type | Metadata | Server Action | Dynamic | Revalidate | FetchCache |
|--------------|-------|------|----------|---------------|---------|------------|------------|
| HomePage     | /     | ⇢ client | ✓ | × | - | 30s | force-cache |
| AboutPage    | /about| ⇠ server | ✓ | ✓ | auto | - | - |
```

2. **API Routes Table:**

```
| Method | Route |
|--------|-------|
| GET    | /api/users |
| POST   | /api/users |
| DELETE | /api/users/[id] |
```

## Contributing 🤝

Contributions are welcome! If you have suggestions or improvements, please fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License 📄

MIT © Pablo Lizardo
https://www.pablolizardo.dev | https://www.casaa.com.ar

---

Made with ❤️ for the Next.js community
