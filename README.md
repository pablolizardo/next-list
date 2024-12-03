# next-list for Next.js 🗺️

A command-line utility to explore and visualize all routes in your Next.js application, including both pages and API routes. This tool aims to simplify debugging when working in the Next.js app directory and to provide clear insights into which routes are being rendered, both for pages and API routes. Inspired by the `php artisan route:list` command.

## Features ✨

- 📋 Lists all page routes and API routes in your Next.js app
- 🎨 Color-coded HTTP methods for better visualization
- 📝 Shows the exported function names for each route
- 🔍 Supports dynamic routes (`[param]`) and optional segments (`(param)`)
- 📊 Beautiful CLI table output with full URLs

## Installation 📦

```bash
npm install next-list
```

## Usage 🚀

To use `next-list`, you can run the provided npm script from your project root:

```bash
npm run list
```

This command is configured in your `package.json` under the scripts section. Here's how you should set it up:

```json
"scripts": {
  "list": "next-list"
}
```

### Output Example 📄

The utility will generate two tables:

1. **Page Routes:**

```
| Method | Function Name | Route | Full URL |
|--------|--------------|-------|-----------|
| GET | HomePage | / | https://localhost:3000/ |
| GET | AboutPage | /about | https://localhost:3000/about |
| GET | UserProfile | /users/[id] | https://localhost:3000/users/[id] |
```

2. **API Routes:**

```
| Method | Function Name | Route | Full URL |
|--------|--------------|-------|-----------|
| GET | handler | /api/users/route | https://localhost:3000/api/users |
| POST | createUser | /api/users/route | https://localhost:3000/api/users |
| DELETE | deleteUser | /api/users/[id]/route | https://localhost:3000/api/users/[id] |
```

## Color Coding 🎨

- 🟢 GET - Green
- 🟡 POST - Yellow
- 🔴 DELETE - Red
- 🔵 PUT - Blue
- ⚪ HEAD - Gray
- Dynamic parameters `[param]` - Yellow
- Optional segments `(param)` - Blue

## Requirements 📋

- Node.js >= 14.x
- Next.js project using the App Router

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

MIT © Pablo Lizardo
https://www.pablolizardo.dev | https://www.casaa.com.ar

---

Made with ❤️ for the Next.js community
