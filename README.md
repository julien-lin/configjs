# ConfigJS

**The intelligent CLI that configures your entire frontend stack in under 2 minutes**

[![npm version](https://img.shields.io/npm/v/@configjs/cli?style=flat-square&color=blue)](https://www.npmjs.com/package/@configjs/cli)
[![npm downloads](https://img.shields.io/npm/dm/@configjs/cli?style=flat-square&color=brightgreen)](https://www.npmjs.com/package/@configjs/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node version](https://img.shields.io/node/v/@configjs/cli?style=flat-square)](https://nodejs.org)
[![Bundle size](https://img.shields.io/bundlephobia/min/@configjs/cli?style=flat-square)](https://bundlephobia.com/package/@configjs/cli)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤-red?style=for-the-badge&logo=github)](https://github.com/sponsors/julien-lin)

**[Quick Start](#-quick-start) • [Features](#-key-features) • [Documentation](#-documentation) • [Plugins](#-supported-libraries) • [Contribute](#-contributing)**

> **[🇫🇷 Version française](./README.fr.md)**

---

## 💡 Why ConfigJS?

Setting up a modern React project typically takes **2-4 hours**:
- Installing libraries one by one
- Reading documentation for each tool
- Writing boilerplate configuration
- Resolving version conflicts
- Creating initial code structure

**ConfigJS reduces this to less than 2 minutes** with zero effort.

### The Problem
```bash
npm install react-router-dom axios zustand tailwindcss ...
# Then spend hours configuring each library manually
# Fight with TypeScript errors
# Debug version conflicts
# Write repetitive boilerplate
```

### The ConfigJS Solution
```bash
npx @configjs/cli react
# Interactive wizard guides you
# Everything installed AND configured
# Zero conflicts guaranteed
# Production-ready code generated
```

## 🚀 Quick Start

**No installation required!** Use directly with `npx`:

### For React Projects
```bash
cd your-react-project
npx @configjs/cli react
```

### For Next.js Projects
```bash
cd your-nextjs-project
npx @configjs/cli nextjs
```

### For Vue.js Projects
```bash
cd your-vue-project
npx @configjs/cli vue
```

### For Svelte Projects
```bash
cd your-svelte-project
npx @configjs/cli svelte
```

That's it! ConfigJS will:
1. 🔍 **Detect** your environment (React/Next.js version, TypeScript, bundler)
2. 🎯 **Guide** you through library selection by category
3. 📦 **Install** all packages sequentially (no conflicts)
4. ⚙️ **Configure** everything with working code
5. ✅ **Validate** compatibility and dependencies
6. 🎉 **Done!** Your project is production-ready

### Example Session

```bash
$ npx @configjs/cli react

✔ Choose your language › English

🔍 Detecting context...
   ✓ Framework: React 19.2.0
   ✓ TypeScript: Yes
   ✓ Bundler: Vite 7.2.4
   ✓ Package manager: npm

✔ CSS / Styling › TailwindCSS
✔ Routing › React Router
✔ State Management › Zustand
✔ HTTP Client › Axios
✔ UI Components › Shadcn/ui
✔ Forms › React Hook Form + Zod
✔ Tooling › ESLint, Prettier, Husky

✓ 7 libraries selected

✨ Installation completed in 1.8s

📦 Installed packages:
   ✓ TailwindCSS (^4.1.18)
   ✓ React Router (^7.11.0)
   ✓ Zustand (^5.0.9)
   ✓ Axios (^1.13.2)
   ...

📝 Created files:
   • src/router.tsx
   • src/store/index.ts
   • src/lib/api.ts
   • components.json
   ...

🚀 Next steps:
   1. npm run dev
   2. Visit http://localhost:5173
```

---

## ✨ Key Features

### 🎯 Smart Detection

ConfigJS automatically detects your project setup:
- ✅ **Framework & Version** (React 18/19, Next.js 13/14)
- ✅ **Router Type** (App Router vs Pages Router for Next.js)
- ✅ **Language** (JavaScript/TypeScript)
- ✅ **Bundler** (Vite, Webpack, Create React App, Next.js)
- ✅ **Package Manager** (npm, yarn, pnpm, bun)
- ✅ **Already Installed Libraries** (skips duplicates)
- ✅ **Project Structure** (adapts configuration)

### ⚙️ Complete Configuration (Not Just Installation!)

Unlike simple installers, ConfigJS **actually configures** your libraries with working code:

**React Router Example:**
```typescript
✓ Installed react-router-dom
✓ Created src/router.tsx with routes
✓ Created src/routes/Home.tsx
✓ Created src/routes/About.tsx
✓ Integrated RouterProvider in App.tsx
✓ TypeScript types configured
→ Ready to use immediately!
```

**TailwindCSS Example:**
```typescript
✓ Installed tailwindcss + @tailwindcss/vite
✓ Updated vite.config.ts with plugin
✓ Injected directives in src/index.css
✓ JIT mode enabled
→ Start using Tailwind classes now!
```

**Redux Toolkit Example:**
```typescript
✓ Installed @reduxjs/toolkit + react-redux
✓ Created src/store/index.ts with configureStore
✓ Created src/store/slices/counterSlice.ts
✓ Created src/store/hooks.ts (typed hooks)
✓ Wrapped App in <Provider>
→ Full Redux setup in seconds!
```

### 🛡️ Smart Compatibility Validation

ConfigJS prevents conflicts before they happen:

- ❌ **Exclusive Conflicts**: Can't install Redux + Zustand (only one state manager)
- ❌ **Exclusive Routing**: React Router OR TanStack Router (not both)
- ⚠️ **Warnings**: TailwindCSS + Bootstrap (different philosophies)
- ✅ **Auto-Dependencies**: TailwindCSS requires PostCSS → installed automatically
- ✅ **Plugin Tracking**: Remembers installed plugins (`.configjsrc`)

### 📦 Supported Libraries (48+ Plugins)

#### 🎨 CSS / Styling
- TailwindCSS v4 (with @tailwindcss/vite)
- TailwindCSS Next.js
- Styled Components
- React Bootstrap
- Emotion
- CSS Modules

#### 🧭 Routing
- React Router v7
- TanStack Router
- Vue Router (Vue.js)
- SvelteKit (Svelte)

#### 🗂️ State Management
- Redux Toolkit
- Zustand
- Jotai
- Pinia (Vue.js)

#### 🌐 HTTP Client
- Axios
- TanStack Query (React Query)
- TanStack Query Vue
- Fetch Wrapper

#### 📝 Forms
- React Hook Form
- Zod (validation)
- Yup (validation)
- SvelteKit Superforms (Svelte)

#### 🎨 UI Components
- Shadcn/ui
- Shadcn/ui Next.js
- Radix UI
- React Icons
- Lucide Icons
- React Hot Toast
- React Hot Toast Next.js
- Vuetify (Vue.js)
- Skeleton UI (Svelte)

#### 🧪 Testing
- React Testing Library
- Vue Test Utils
- Vue Testing Library
- Svelte Testing Library
- Vitest
- Jest

#### 🛠️ Tooling
- ESLint
- ESLint Vue
- Prettier
- Husky (Git hooks)
- commitlint
- lint-staged
- date-fns
- Vue TSC

#### ✨ Animation
- Framer Motion
- React Spring

#### 🔧 Utils
- VueUse (Vue.js)
- unplugin-auto-import (Vue.js)
- unplugin-vue-components (Vue.js)

#### 🌍 Internationalization
- Vue i18n (Vue.js)

#### 📸 Next.js Specific
- Image Optimization
- Font Optimization
- API Routes
- Middleware

### 🔄 Automatic Rollback

If something goes wrong, ConfigJS automatically restores everything:

```bash
❌ Error detected during configuration
↺ Rolling back...
   ✓ Restored package.json
   ✓ Restored all modified files
   ✓ Removed created files
✅ Project restored to previous state
```

### 🎯 Plugin Tracking System

Never reinstall the same library twice:

```bash
# First run
$ npx @configjs/cli react
✔ TailwindCSS › Selected

# Second run (same project)
$ npx @configjs/cli react
ℹ TailwindCSS is already installed, skipping...

# Check installed plugins
$ npx @configjs/cli installed
📦 Installed plugins:
   ✓ TailwindCSS (^4.1.18) - installed 2 hours ago
   ✓ React Router (^7.11.0) - installed 2 hours ago
```

ConfigJS creates a `.configjsrc` file to track installations and prevent conflicts.

---

## 📖 Documentation

### Commands

```bash
# Interactive installation for React
npx @configjs/cli react

# Interactive installation for Next.js
npx @configjs/cli nextjs

# List available plugins
npx @configjs/cli list
npx @configjs/cli list --category routing

# Check installed plugins
npx @configjs/cli installed

# Remove plugin from tracking
npx @configjs/cli remove <plugin-name>

# Validate project compatibility
npx @configjs/cli check
```

### Next.js Support

ConfigJS fully supports Next.js projects with automatic detection of:
- **App Router** vs **Pages Router**
- Next.js-specific plugins (Image Optimization, Font Optimization, Middleware, API Routes)
- Compatible libraries adapted for Next.js (TailwindCSS, Shadcn/ui, React Hot Toast)

### Vue.js Support

ConfigJS fully supports Vue.js 3 projects with automatic detection of:
- **Composition API** vs **Options API**
- Vue.js-specific plugins (Vue Router, Pinia, VueUse, Vuetify)
- Compatible libraries adapted for Vue.js (TailwindCSS, Axios, ESLint Vue)
- Automatic project creation with Vite

See [Next.js Documentation](./DOCUMENTATION/NEXTJS.md) and [Vue.js Documentation](./DOCUMENTATION/VUE.md) for complete guides.

### CLI Options

```bash
npx @configjs/cli react [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y` | Skip prompts, use defaults |
| `--dry-run`, `-d` | Simulate without writing files |
| `--silent`, `-s` | No output (CI/CD mode) |
| `--no-install` | Generate configs only, skip npm install |
| `--debug` | Verbose logging |

### Usage Examples

**Quick setup with defaults:**
```bash
npx @configjs/cli react --yes
```

**CI/CD mode:**
```bash
npx @configjs/cli react --silent --yes
```

**Preview changes only:**
```bash
npx @configjs/cli react --dry-run
```

**Generate configs without installing packages:**
```bash
npx @configjs/cli react --no-install
```

---

## 🏗️ Architecture

ConfigJS uses a modular plugin architecture where each library is an autonomous plugin:

```typescript
interface Plugin {
  name: string
  category: Category
  frameworks: Framework[]
  
  // Compatibility
  compatibleWith?: string[]
  incompatibleWith?: string[]
  requires?: string[]
  
  // Lifecycle
  detect?: (ctx: ProjectContext) => boolean | Promise<boolean>
  install: (ctx: ProjectContext) => Promise<void>
  configure: (ctx: ProjectContext) => Promise<void>
  rollback?: (ctx: ProjectContext) => Promise<void>
}
```

### Extensibility

Create your own plugins:

```bash
npm install @configjs/plugin-react-query
```

ConfigJS will automatically detect and load plugins prefixed with `@configjs/plugin-*`.

---

## 🤝 Contributing

Contributions are welcome! Check out [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

### Develop a Plugin

See [PLUGIN_DEVELOPMENT.md](./docs/PLUGIN_DEVELOPMENT.md) to create your own plugins (development documentation).

### Development Setup

```bash
# Clone
git clone https://github.com/julien-lin/orchestrateur-framework.git
cd orchestrateur-framework

# Install dependencies
npm install

# Run tests
npm run test
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

---

## 📋 Requirements

- **Node.js** ≥ 20.0.0
- **npm** / **yarn** / **pnpm** / **bun**
- An existing React project (Vite, CRA, or custom setup)

---

## 🗺️ Roadmap

### v1.1 ✅ (Current)
- [x] Plugin tracking system (.configjsrc)
- [x] Plugin detection (package.json + tracker)
- [x] Enhanced console UX with colors
- [x] Sequential installation (prevents corruption)
- [x] Full React support (React 18/19)
- [x] 48+ plugins across 10 categories
- [x] Full Next.js support (13/14/15)
- [x] Full Vue.js 3 support
- [x] Full Svelte support with 4 specialized plugins
- [x] Logging centralization (IoC Architecture, full decoupling)

### v1.2 (Q2 2025)
- [ ] Configuration presets (starter templates)
- [ ] Plugin marketplace
- [ ] Interactive upgrade command
- [ ] Conflict resolution wizard

### v2.0 (Q3 2025)
- [ ] Support Remix
- [ ] Support Astro
- [ ] Web UI for configuration

### v2.x (Future)
- [ ] React Native support
- [ ] Custom plugin templates
- [ ] Mobile support (React Native, Flutter)

---

## 💖 Support This Project

If ConfigJS saves you time and makes your life easier, consider sponsoring the project:

**[❤️ Sponsor on GitHub](https://github.com/sponsors/julien-lin)**

Your support helps maintain and improve ConfigJS for the entire community!

---

## 📄 License

[MIT](./LICENSE) © [Julien Lin](https://github.com/julien-lin)

---

## 🙏 Acknowledgments

Inspired by the best practices from:
- [Vite](https://vitejs.dev) - Lightning-fast build tool
- [Create T3 App](https://create.t3.gg) - Type-safe full-stack toolkit
- [Projen](https://projen.io) - Project configuration as code

---

**Made with ❤️ for the frontend community**

[Changelog](./CHANGELOG.md) • [Issues](https://github.com/julien-lin/orchestrateur-framework/issues) • [Contributing](./docs/CONTRIBUTING.md)

