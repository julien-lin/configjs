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
- **Dependencies**: Replaced `picocolors@1.1.1` (abandoned 18+ months) with `chalk@5.6.2` (actively maintained)

### Security (Phase 1 - Critical)

Critical security hardening implemented with comprehensive input validation, argument sanitization, and credential protection:

#### SEC-001: NPM Argument Injection Prevention

- **Impact**: Critical (CVSS 9.0+)
- **Issue**: User-supplied npm arguments could be used to inject arbitrary flags
- **Fix**: Implemented whitelist-based argument validation (`SAFE_NPM_FLAGS`)
  - Only known-safe flags allowed: `--save`, `--save-dev`, `--prefer-offline`, `--legacy-peer-deps`, etc.
  - Blocks dangerous flags: `--registry`, `--script-shell`, custom executables
- **Attack Blocked**: `npm install --registry=[malicious-registry] lodash`
- **Reference**: OWASP A01:2021 (Broken Access Control), CWE-78
- **Tests**: 34/34 injection tests passing
- **Files**: `src/utils/package-manager.ts`

#### SEC-002: Environment Variable Leakage Prevention

- **Impact**: Critical (CVSS 9.0+)
- **Issue**: Process environment variables exposed to subprocess (could contain sensitive credentials)
- **Fix**: Implemented safe environment filtering (`createSafeEnvironment()`)
  - Whitelist-only approach: Only essential variables (PATH, HOME, NODE_ENV, LANG, SHELL, USER)
  - Filters out: All sensitive credential variables (tokens, keys, access credentials)
- **Attack Blocked**: Token leakage to malicious registry or subprocess hijacking
- **Reference**: OWASP A02:2021 (Cryptographic Failures), CWE-532
- **Tests**: 21/21 environment variable tests passing
- **Files**: `src/utils/package-manager.ts`, `src/utils/logger-provider.ts`

#### SEC-003: Sensitive Data in Logs (Automatic Redaction)

- **Impact**: High (CVSS 7.5)
- **Issue**: Credentials and tokens accidentally logged in error messages or debug output
- **Fix**: Implemented `ScrubbingLogger` with automatic pattern-based redaction
  - Detects 16+ sensitive data types: API keys, tokens, credentials, authentication tokens, private keys
  - All log messages automatically scrubbed before output (transparent to callers)
  - Defensive layer: Even accidental credential logging is redacted
- **Attack Blocked**: Credential leakage via logs, error messages, or debug output
- **Reference**: OWASP A02:2021 (Cryptographic Failures), CWE-532
- **Tests**: 45/45 log scrubbing tests passing
- **Files**: `src/utils/logger-provider.ts`, `src/utils/logger.ts`

#### SEC-004: Package Version Injection Prevention

- **Impact**: High (CVSS 8.0)
- **Issue**: Malicious version strings in package specifications (e.g., `pkg@--registry=evil`)
- **Fix**: Implemented strict version string validation using regex boundaries
  - Format: `@scope/package@version` with strict version pattern matching
  - Validates: Semantic versioning, ranges, prerelease tags
  - Rejects: Special characters, command injection attempts, encoding bypass
- **Attack Blocked**: Package version injection attempts (e.g., with `--registry` flags or command substitution)
- **Reference**: OWASP A01:2021 (Broken Access Control), CWE-78
- **Tests**: 34/34 package injection tests passing
- **Files**: `src/core/package-validator.ts`

#### SEC-005: Additional Arguments Validation (CLI & Plugin Layer)

- **Impact**: High (CVSS 7.5)
- **Issue**: External code (plugins, CLI) could pass unsafe arguments bypassing initial validation
- **Fix**: Implemented comprehensive argument validation layer
  - Must start with `--` (flag format)
  - Flag name must be in `SAFE_NPM_FLAGS` whitelist
  - Values validated for: shell metacharacters, path traversal (../, ..\), encoding bypass, non-ASCII
  - Control character check (0x00-0x1f) to prevent null byte & encoding attacks
- **Attack Blocked**: Shell injection via arguments, symlink escapes, encoding bypass
- **Reference**: OWASP A03:2021 (Injection), CWE-78
- **Tests**: 42/42 argument validation tests passing
- **Files**: `src/utils/package-manager.ts`

#### Additional Security Improvements

- **Path Traversal Prevention** (SEC-006): Boundary checking with `path.resolve()` + `path.normalize()`
  - Blocks: `../../../etc/passwd`, Windows paths (`..\..\..\windows`), symlink escapes
  - Tests: 30/30 path traversal tests passing
  - Files: `src/core/path-validator.ts`

- **Configuration Sanitization** (SEC-007): Dangerous pattern detection in config files
  - Blocks: `eval()`, `Function()`, template injection, prototype pollution
  - Formats: JSON, JavaScript, YAML, TOML with format-specific validation
  - Tests: 45/45 config injection tests passing
  - Files: `src/core/config-sanitizer.ts`

- **Input Validation** (SEC-005): Zod schema-based whitelist validation
  - Blocks: Shell injection, command injection, path traversal in user inputs
  - Patterns: Alphanumeric + safe punctuation only, 1-100 chars, no control chars
  - Tests: 34/34 shell injection tests passing
  - Files: `src/core/input-validator.ts`

### Security Testing

- ✅ Full security test suite: **185/185 PASS** (Phase 1)
  - Shell Injection Tests: 34/34 ✅
  - Path Traversal Tests: 30/30 ✅
  - Package Injection Tests: 34/34 ✅
  - Config Injection Tests: 45/45 ✅
  - Log Scrubbing Tests: 21/21 ✅
  - Argument Validation Tests: 42/42 ✅
  - Environment Variable Tests: 21/21 ✅

### Security Policy

- ✅ `SECURITY.md` published with responsible disclosure process
  - 90-day coordinated disclosure window
  - Critical vulnerabilities: <24h patch
  - High vulnerabilities: <7 days patch
  - Best practices for users
  - Previous issues documented (SEC-001 through SEC-005)

### Audit & Compliance

- ✅ `npm audit`: **0 vulnerabilities**
- ✅ All dependencies Node.js 20+ compatible
- ✅ All 1281 unit tests passing (including 185 security tests)
- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript strict mode: 0 errors
- ✅ OWASP Top 10 coverage: Input validation, injection prevention, cryptographic security
- ✅ CWE coverage: CWE-78 (Injection), CWE-22 (Path Traversal), CWE-532 (Log Exposure), etc.

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
