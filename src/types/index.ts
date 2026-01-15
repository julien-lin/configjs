/**
 * Types principaux pour confjs
 */

import type { IFsAdapter } from '../core/fs-adapter.js'
import type { BackupManager } from '../core/backup-manager.js'
import type { ConfigWriter } from '../core/config-writer.js'

export type Framework = 'react' | 'vue' | 'svelte' | 'nextjs'
export type Bundler = 'vite' | 'webpack' | 'cra' | 'rspack' | 'nextjs' | null
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export enum Category {
  ROUTING = 'routing',
  STATE = 'state',
  HTTP = 'http',
  CSS = 'css',
  UI = 'ui',
  FORMS = 'forms',
  TOOLING = 'tooling',
  TESTING = 'testing',
  I18N = 'i18n',
  ANIMATION = 'animation',
  UTILS = 'utils',
}

export interface ProjectContext {
  // Framework
  framework: Framework
  frameworkVersion: string

  // Bundler
  bundler: Bundler
  bundlerVersion: string | null

  // Language
  typescript: boolean
  tsconfigPath?: string

  // Package Manager
  packageManager: PackageManager
  lockfile: string

  // Structure
  projectRoot: string
  srcDir: string
  publicDir: string

  // Environment
  os: 'darwin' | 'win32' | 'linux'
  nodeVersion: string

  // Existing deps
  dependencies: Record<string, string>
  devDependencies: Record<string, string>

  // Git
  hasGit: boolean
  gitHooksPath?: string

  // Next.js specific
  nextjsRouter?: 'app' | 'pages' // App Router ou Pages Router

  // Vue.js specific
  vueVersion?: '3' // Version Vue (3 uniquement, Vue 2 non supporté par Vite)
  vueApi?: 'composition' | 'options' // Composition API ou Options API

  // Filesystem adapter (for testing with memfs)
  fsAdapter?: IFsAdapter

  // Shared services (optional, provided by installer)
  backupManager?: BackupManager
  configWriter?: ConfigWriter
}

export interface Plugin {
  // Métadonnées
  name: string
  displayName: string
  description: string
  category: Category
  version?: string

  // Compatibilité
  frameworks: Framework[]
  bundlers?: Bundler[]
  requiresTypeScript?: boolean

  // Relations
  compatibleWith?: string[]
  incompatibleWith?: string[]
  requires?: string[]
  recommends?: string[]

  // Détection
  detect?: (ctx: ProjectContext) => boolean | Promise<boolean>

  // Lifecycle
  preInstall?: (ctx: ProjectContext) => Promise<void>
  install: (ctx: ProjectContext) => Promise<InstallResult>
  postInstall?: (ctx: ProjectContext) => Promise<void>

  // Configuration
  configure: (ctx: ProjectContext) => Promise<ConfigResult>

  // Rollback
  rollback?: (ctx: ProjectContext) => Promise<void>
}

export interface InstallResult {
  packages: {
    dependencies?: string[]
    devDependencies?: string[]
  }
  success: boolean
  message?: string
}

export interface ConfigResult {
  files: FileOperation[]
  success: boolean
  message?: string
}

export interface FileOperation {
  type: 'create' | 'modify' | 'delete'
  path: string
  content?: string
  backup?: boolean
}

export type CompatibilityRuleType =
  | 'EXCLUSIVE'
  | 'CONFLICT'
  | 'REQUIRES'
  | 'RECOMMENDS'

export type Severity = 'error' | 'warning' | 'info'

export interface CompatibilityRule {
  type: CompatibilityRuleType
  plugin?: string
  plugins?: string[]
  requires?: string[]
  recommends?: string[]
  framework?: Framework // Framework spécifique pour cette règle
  reason: string
  severity: Severity
  allowOverride?: boolean
  autoInstall?: boolean
  prompt?: boolean
}

export interface ValidationError {
  type: string
  plugins?: string[]
  plugin?: string
  required?: string
  message: string
  canOverride?: boolean
}

export type ValidationWarning = ValidationError

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: string[]
}

export interface InstallationReport {
  success: boolean
  duration: number
  installed: string[]
  warnings: ValidationWarning[]
  filesCreated: FileOperation[]
}

export interface CLIOptions {
  yes?: boolean
  dryRun?: boolean
  silent?: boolean
  debug?: boolean
  config?: string
  force?: boolean
  install?: boolean // --no-install flag
}
