# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Additional framework support (Svelte, Preact, Solid)
- Plugin marketplace
- Interactive configuration wizard
- VS Code extension

## [1.3.1] - 2026-01-21

### Changed
- **Dependencies**: Updated all dependencies to latest compatible versions
  - `@types/node`: `25.0.3` → `25.0.9`
  - `zod`: `4.3.2` → `4.3.5` (note: Zod 5.x not yet in production)
  - `@vitest/coverage-v8`: `4.0.16` → `4.0.17`
  - `eslint-plugin-prettier`: `5.5.4` → `5.5.5`
  - `inquirer`: `13.1.0` → `13.2.1`
  - `memfs`: `4.51.1` → `4.56.4`
  - `ora`: `9.0.0` → `9.1.0`
  - `prettier`: `3.7.4` → `3.8.0`
  - `type-fest`: `5.3.1` → `5.4.1`
  - `typescript-eslint`: `8.51.0` → `8.53.1`
  - `vitest`: `4.0.16` → `4.0.17`
  - Plus 81 autres packages mises à jour

### Security
- ✅ `npm audit`: **0 vulnerabilities** (confirmed post-update)
- ✅ All dependencies verified for Node.js 20+ compatibility
- ✅ All 1281 unit tests passing (185 security tests included)
- ✅ Build validation successful (ESM 250ms + DTS 3238ms)

### Testing
- ✅ Full test suite: **1281/1281 PASS**
- ✅ Security tests: **185/185 PASS**
  - Shell injection tests: 34/34
  - Path traversal tests: 30/30
  - Package injection tests: 34/34
  - Config injection tests: 45/45
  - Package integrity tests: 42/42
- ✅ Linting: **0 errors, 0 warnings**
- ✅ Build: **SUCCESS** (ESM + DTS)

## [1.3.0] - 2026-01-02

### Added

#### Vue.js Support
- 🚀 Full Vue.js 3 support with `npx @configjs/cli vue` command
- 🔍 Automatic Vue.js project detection (Vue 3 only)
- 📦 Vue.js project creation wizard using Vite (TypeScript, Router, Pinia, Vitest, ESLint, Prettier)
- 🎯 Automatic Composition API vs Options API detection
- 🔌 Vue.js-specific plugins:
  - Vue Router (`vue-router`) - Official routing for Vue.js
  - Pinia (`pinia`) - Official state management for Vue 3
  - VueUse (`@vueuse/core`) - Collection of Vue Composition API utilities
  - Vuetify (`vuetify`) - Material Design component framework
  - Vue Test Utils (`vue-test-utils`) - Testing utilities for Vue.js
  - ESLint Vue (`eslint-vue`) - ESLint configuration for Vue.js
- ✅ Compatibility validation for Vue.js (blocks React Router, Zustand/Redux, Shadcn/ui)
- 📝 Complete Vue.js documentation (`DOCUMENTATION/VUE.md`)
- 🧪 E2E and integration tests for Vue.js workflows

#### Improvements
- Enhanced framework detection to support Vue.js
- API style detection (Composition API vs Options API)
- Framework-specific compatibility rules for Vue.js
- Plugin adaptation based on detected API style

## [1.2.0] - 2026-01-02

### Added

#### Next.js Support
- 🚀 Full Next.js support with `npx @configjs/cli nextjs` command
- 🔍 Automatic Next.js project detection
- 📦 Next.js project creation wizard (TypeScript, ESLint, TailwindCSS, App/Pages Router)
- 🎯 Automatic App Router vs Pages Router detection
- 🔌 Next.js-specific plugins:
  - Image Optimization (`nextjs-image-optimization`)
  - Font Optimization (`nextjs-font-optimization`)
  - Middleware (`nextjs-middleware`)
  - API Routes (`nextjs-api-routes`)
- 🎨 Next.js-adapted plugins:
  - TailwindCSS Next.js (`tailwindcss-nextjs`)
  - Shadcn/ui Next.js (`shadcn-ui-nextjs`)
  - React Hot Toast Next.js (`react-hot-toast-nextjs`)
- ✅ Compatibility validation for Next.js (blocks React Router, warns about Framer Motion)
- 📝 Complete Next.js documentation (`DOCUMENTATION/NEXTJS.md`)
- 🧪 E2E and integration tests for Next.js workflows

#### Improvements
- Enhanced framework detection to prioritize Next.js over React
- Router-specific configuration (App Router vs Pages Router)
- Framework-specific compatibility rules

## [1.0.0] - 2026-01-02

### 🎉 First Stable Release

This is the first stable release of confjs, ready for production use.

## [0.1.0] - 2026-01-02

### Added

#### Core Features
- 🚀 Interactive CLI for plugin installation (`confjs react`)
- 🔍 Automatic project detection (framework, package manager, TypeScript)
- ✅ Plugin compatibility validation system
- 💾 Automatic backup and rollback on installation failure
- 🌐 Multi-language support (French, English, Spanish)
- 📝 Comprehensive configuration file generation

#### Plugin Categories

**Routing** (2 plugins)
- React Router DOM (`react-router-dom`) - Complete setup with routes
- TanStack Router (`@tanstack/react-router`) - File-based routing

**State Management** (3 plugins)
- Zustand (`zustand`) - Lightweight state management
- Redux Toolkit (`@reduxjs/toolkit`) - Full Redux setup with slices
- Jotai (`jotai`) - Atomic state management

**HTTP/Data Fetching** (2 plugins)
- Axios (`axios`) - Configured HTTP client
- TanStack Query (`@tanstack/react-query`) - Data fetching and caching

**CSS/Styling** (4 plugins)
- TailwindCSS (`tailwindcss`) - Utility-first CSS
- Styled Components (`styled-components`) - CSS-in-JS
- Emotion (`@emotion/react`) - CSS-in-JS with performance
- React Bootstrap (`react-bootstrap`) - Bootstrap components

**Forms** (2 plugins)
- React Hook Form (`react-hook-form`) - Form validation
- Zod (`zod`) - Schema validation

**UI Components** (4 plugins)
- shadcn/ui (`shadcn-ui`) - Component library
- Radix UI (`@radix-ui/react`) - Unstyled components
- React Icons (`react-icons`) - Icon library
- React Hot Toast (`react-hot-toast`) - Toast notifications

**Animation** (1 plugin)
- Framer Motion (`framer-motion`) - Animation library

**Testing** (1 plugin)
- React Testing Library (`@testing-library/react`) - Testing utilities

**Tooling** (3 plugins)
- ESLint (`eslint`) - Code linting
- Prettier (`prettier`) - Code formatting
- Husky (`husky`) - Git hooks

**Utilities** (1 plugin)
- date-fns (`date-fns`) - Date utilities

#### CLI Commands
- `confjs react` - Install plugins for React projects
- `confjs react check` - Validate current setup
- `confjs react list` - List available plugins

#### CLI Features
- Interactive plugin selection with categories
- Language selection prompt
- Colored terminal output with spinners
- Detailed installation reports
- Error handling with user-friendly messages

#### Testing
- 586+ unit tests
- Integration tests for plugin combinations
- E2E CLI tests
- Test fixtures for different project types

#### Documentation
- Complete README with usage examples
- Plugin development guide (PLUGIN_DEVELOPMENT.md)
- Contribution guidelines (CONTRIBUTING.md)
- Comprehensive documentation in DOCUMENTATION/ folder

### Technical Details
- TypeScript strict mode enabled
- ESM module system
- Node.js >= 20.0.0 requirement
- Zero-config operation for standard React projects
- Package manager detection (npm, yarn, pnpm, bun)

### Developer Experience
- Hot reload in development mode
- Comprehensive type safety
- Modular plugin architecture
- Easy to extend with new plugins

