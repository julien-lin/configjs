import { resolve, join } from 'path'
import { platform, version } from 'process'
import type {
  ProjectContext,
  Framework,
  Bundler,
  PackageManager,
} from '../types/index.js'
import {
  readPackageJson,
  readTsConfig,
  checkPathExists,
} from '../utils/fs-helpers.js'
import { detectPackageManager } from '../utils/package-manager.js'
import { getModuleLogger } from '../utils/logger-provider.js'
import type { IFsAdapter } from './fs-adapter.js'
import { createDefaultFsAdapter } from './fs-adapter.js'

/**
 * Cache pour les résultats de détection
 */
const detectionCache = new Map<string, ProjectContext>()

/**
 * Erreur personnalisée pour les erreurs de détection
 */
export class DetectionError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DetectionError'
  }
}

/**
 * Détecte le framework utilisé dans le projet
 *
 * @param pkg - Objet package.json parsé
 * @returns Framework détecté avec sa version
 * @throws {DetectionError} Si aucun framework n'est détecté
 *
 * @internal
 */
function detectFramework(pkg: Record<string, unknown>): {
  framework: Framework
  version: string
} {
  const deps = {
    ...((pkg['dependencies'] as Record<string, string>) || {}),
    ...((pkg['devDependencies'] as Record<string, string>) || {}),
  }

  // Détection Next.js (en priorité car Next.js contient React)
  if (deps['next']) {
    return {
      framework: 'nextjs',
      version: deps['next'].replace(/[\^~]/, ''),
    }
  }

  // Détection React
  if (deps['react']) {
    return {
      framework: 'react',
      version: deps['react'].replace(/[\^~]/, ''),
    }
  }

  // Détection Vue (Vue 3 uniquement, Vue 2 non supporté par Vite)
  if (deps['vue']) {
    const version = deps['vue'].replace(/[\^~]/, '')
    const majorVersion = parseInt(version.split('.')[0] || '0', 10)

    // Vérifier que c'est Vue 3 (Vue 2 non supporté)
    if (majorVersion < 3) {
      throw new DetectionError(
        'Vue 2 is not supported. Please use Vue 3 (Vue 2 is not compatible with Vite).',
        { vueVersion: version }
      )
    }

    return {
      framework: 'vue',
      version,
    }
  }

  // Détection Svelte
  if (deps['svelte']) {
    return {
      framework: 'svelte',
      version: deps['svelte'].replace(/[\^~]/, ''),
    }
  }

  throw new DetectionError(
    'No supported framework detected. Supported frameworks: Next.js, React, Vue, Svelte',
    { dependencies: Object.keys(deps) }
  )
}

/**
 * Détecte le bundler utilisé dans le projet
 *
 * @param projectRoot - Chemin racine du projet
 * @param pkg - Objet package.json parsé
 * @returns Bundler détecté avec sa version, ou null
 *
 * @internal
 */
async function detectBundler(
  projectRoot: string,
  pkg: Record<string, unknown>,
  fsAdapter?: IFsAdapter
): Promise<{ bundler: Bundler; version: string | null }> {
  const deps = {
    ...((pkg['dependencies'] as Record<string, string>) || {}),
    ...((pkg['devDependencies'] as Record<string, string>) || {}),
  }

  // Détection Next.js (en priorité car Next.js a son propre bundler)
  if (deps['next']) {
    // Vérifier la présence de next.config.js ou next.config.ts
    const nextConfigExists =
      (await checkPathExists(join(projectRoot, 'next.config.js'), fsAdapter)) ||
      (await checkPathExists(join(projectRoot, 'next.config.ts'), fsAdapter)) ||
      (await checkPathExists(
        join(projectRoot, 'next.config.mjs'),
        fsAdapter
      )) ||
      (await checkPathExists(join(projectRoot, 'next.config.cjs'), fsAdapter))

    if (nextConfigExists) {
      return {
        bundler: 'nextjs',
        version: deps['next'].replace(/[\^~]/, ''),
      }
    }
  }

  // Détection Vite (prioritaire pour Vue.js)
  if (deps['vite']) {
    const viteConfigExists =
      (await checkPathExists(join(projectRoot, 'vite.config.js'), fsAdapter)) ||
      (await checkPathExists(join(projectRoot, 'vite.config.ts'), fsAdapter)) ||
      (await checkPathExists(
        join(projectRoot, 'vite.config.mjs'),
        fsAdapter
      )) ||
      (await checkPathExists(join(projectRoot, 'vite.config.cjs'), fsAdapter))

    if (viteConfigExists) {
      return {
        bundler: 'vite',
        version: deps['vite'].replace(/[\^~]/, ''),
      }
    }
  }

  // Détection Vue CLI (legacy, pour projets Vue existants)
  if (deps['vue'] && deps['@vue/cli-service']) {
    const vueConfigExists = await checkPathExists(
      join(projectRoot, 'vue.config.js'),
      fsAdapter
    )

    if (vueConfigExists) {
      return {
        bundler: 'webpack', // Vue CLI utilise Webpack
        version: deps['@vue/cli-service'].replace(/[\^~]/, ''),
      }
    }
  }

  // Détection CRA (Create React App)
  if (deps['react-scripts']) {
    return {
      bundler: 'cra',
      version: deps['react-scripts'].replace(/[\^~]/, ''),
    }
  }

  // Détection Webpack
  if (deps['webpack']) {
    const webpackConfigExists =
      (await checkPathExists(
        join(projectRoot, 'webpack.config.js'),
        fsAdapter
      )) ||
      (await checkPathExists(join(projectRoot, 'webpack.config.ts'), fsAdapter))

    if (webpackConfigExists) {
      return {
        bundler: 'webpack',
        version: deps['webpack'].replace(/[\^~]/, ''),
      }
    }
  }

  // Détection Rspack
  if (deps['@rspack/core']) {
    return {
      bundler: 'rspack',
      version: deps['@rspack/core'].replace(/[\^~]/, ''),
    }
  }

  // Aucun bundler détecté
  return {
    bundler: null,
    version: null,
  }
}

/**
 * Détecte si TypeScript est utilisé dans le projet
 *
 * @param projectRoot - Chemin racine du projet
 * @returns Informations TypeScript détectées
 *
 * @internal
 */
async function detectTypeScript(
  projectRoot: string,
  fsAdapter?: IFsAdapter
): Promise<{ typescript: boolean; tsconfigPath?: string }> {
  const tsConfig = await readTsConfig(projectRoot, fsAdapter)

  if (tsConfig) {
    // Chercher le chemin exact du tsconfig
    const possiblePaths = [
      join(projectRoot, 'tsconfig.json'),
      join(projectRoot, 'tsconfig.app.json'),
      join(projectRoot, 'tsconfig.node.json'),
    ]

    for (const path of possiblePaths) {
      if (await checkPathExists(path, fsAdapter)) {
        return {
          typescript: true,
          tsconfigPath: path,
        }
      }
    }

    return {
      typescript: true,
      tsconfigPath: join(projectRoot, 'tsconfig.json'),
    }
  }

  return {
    typescript: false,
  }
}

/**
 * Détecte le dossier source du projet
 *
 * @param projectRoot - Chemin racine du projet
 * @returns Chemin du dossier source détecté
 *
 * @internal
 */
async function detectSrcDir(
  projectRoot: string,
  fsAdapter?: IFsAdapter
): Promise<string> {
  const possibleDirs = ['src', 'app', 'source', 'lib']

  for (const dir of possibleDirs) {
    const dirPath = join(projectRoot, dir)
    if (await checkPathExists(dirPath, fsAdapter)) {
      return dir
    }
  }

  // Par défaut, utiliser 'src'
  return 'src'
}

/**
 * Détecte le dossier public du projet
 *
 * @param projectRoot - Chemin racine du projet
 * @returns Chemin du dossier public détecté
 *
 * @internal
 */
async function detectPublicDir(
  projectRoot: string,
  fsAdapter?: IFsAdapter
): Promise<string> {
  const possibleDirs = ['public', 'static', 'assets']

  for (const dir of possibleDirs) {
    const dirPath = join(projectRoot, dir)
    if (await checkPathExists(dirPath, fsAdapter)) {
      return dir
    }
  }

  // Par défaut, utiliser 'public'
  return 'public'
}

/**
 * Détecte le router Next.js (App Router vs Pages Router)
 *
 * @param projectRoot - Chemin racine du projet
 * @param srcDir - Dossier source du projet
 * @returns Router détecté ('app' ou 'pages'), ou undefined si non détectable
 *
 * @internal
 */
async function detectNextjsRouter(
  projectRoot: string,
  srcDir: string,
  fsAdapter?: IFsAdapter
): Promise<'app' | 'pages' | undefined> {
  // Vérifier dans srcDir d'abord, puis à la racine
  const appDirInSrc = join(projectRoot, srcDir, 'app')
  const pagesDirInSrc = join(projectRoot, srcDir, 'pages')
  const appDirAtRoot = join(projectRoot, 'app')
  const pagesDirAtRoot = join(projectRoot, 'pages')

  const appDirExists =
    (await checkPathExists(appDirInSrc, fsAdapter)) ||
    (await checkPathExists(appDirAtRoot, fsAdapter))
  const pagesDirExists =
    (await checkPathExists(pagesDirInSrc, fsAdapter)) ||
    (await checkPathExists(pagesDirAtRoot, fsAdapter))

  // Si les deux existent, prioriser App Router (nouveau système)
  if (appDirExists) {
    return 'app'
  }

  if (pagesDirExists) {
    return 'pages'
  }

  // Si aucun n'existe, retourner undefined
  return undefined
}

/**
 * Détecte le style d'API Vue.js (Composition API vs Options API)
 *
 * @param projectRoot - Chemin racine du projet
 * @param srcDir - Dossier source du projet
 * @returns Style d'API détecté ('composition' ou 'options'), ou undefined si non détectable
 *
 * @internal
 */
async function detectVueApi(
  projectRoot: string,
  srcDir: string,
  fsAdapter?: IFsAdapter
): Promise<'composition' | 'options' | undefined> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const srcPath = join(projectRoot, srcDir)

  // Vérifier si le dossier src existe
  if (!(await checkPathExists(srcPath, adapter))) {
    return undefined
  }

  try {
    // Chercher les fichiers .vue dans src et ses sous-dossiers
    const files: string[] = []
    async function findVueFiles(dir: string): Promise<void> {
      const entries = await adapter.readdir(dir)
      for (const entryName of entries) {
        const fullPath = join(dir, entryName)
        const stat = await adapter.stat(fullPath)
        if (stat.isDirectory()) {
          await findVueFiles(fullPath)
        } else if (entryName.endsWith('.vue')) {
          files.push(fullPath)
        }
      }
    }

    await findVueFiles(srcPath)

    // Analyser les fichiers .vue pour détecter le style d'API
    let hasCompositionApi = false
    let hasOptionsApi = false

    const scriptBlockRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi

    for (const file of files.slice(0, 10)) {
      // Limiter à 10 fichiers pour performance
      try {
        const content = await adapter.readFile(file, 'utf-8')
        let match: RegExpExecArray | null

        while ((match = scriptBlockRegex.exec(content)) !== null) {
          const attrs = match[1] || ''
          const scriptContent = match[2] || ''

          // Composition API : <script setup> ou usage explicite de setup()
          if (
            attrs.includes('setup') ||
            scriptContent.includes('setup(') ||
            scriptContent.includes('defineComponent(')
          ) {
            hasCompositionApi = true
          }

          // Options API : export default { ... }
          if (
            scriptContent.includes('export default {') ||
            scriptContent.includes('export default{')
          ) {
            hasOptionsApi = true
          }
        }
      } catch {
        // Ignorer les erreurs de lecture
      }
    }

    // Prioriser Composition API si les deux sont détectés
    if (hasCompositionApi) {
      return 'composition'
    }

    if (hasOptionsApi) {
      return 'options'
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Détecte si Git est utilisé dans le projet
 *
 * @param projectRoot - Chemin racine du projet
 * @returns Informations Git détectées
 *
 * @internal
 */
async function detectGit(
  projectRoot: string,
  fsAdapter?: IFsAdapter
): Promise<{ hasGit: boolean; gitHooksPath?: string }> {
  const gitDir = join(projectRoot, '.git')
  const hasGit = await checkPathExists(gitDir, fsAdapter)

  if (!hasGit) {
    return { hasGit: false }
  }

  // Chercher le dossier hooks
  const hooksPath = join(gitDir, 'hooks')
  const hasHooks = await checkPathExists(hooksPath, fsAdapter)

  return {
    hasGit: true,
    gitHooksPath: hasHooks ? hooksPath : undefined,
  }
}

/**
 * Détecte le lockfile utilisé dans le projet
 *
 * @param projectRoot - Chemin racine du projet
 * @param packageManager - Package manager détecté
 * @returns Nom du lockfile
 *
 * @internal
 */
async function detectLockfile(
  projectRoot: string,
  packageManager: PackageManager,
  fsAdapter?: IFsAdapter
): Promise<string> {
  const lockfiles: Record<PackageManager, string> = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
    bun: 'bun.lockb',
  }

  const lockfile = lockfiles[packageManager]
  const lockfilePath = join(projectRoot, lockfile)

  if (await checkPathExists(lockfilePath, fsAdapter)) {
    return lockfile
  }

  // Retourner le lockfile attendu même s'il n'existe pas encore
  return lockfile
}

/**
 * Détecte le contexte complet d'un projet frontend
 *
 * Cette fonction analyse un projet pour déterminer :
 * - Le framework utilisé (Next.js, React, Vue, Svelte)
 * - Le bundler (Next.js, Vite, Webpack, CRA, etc.)
 * - Si TypeScript est utilisé
 * - Le package manager (npm, yarn, pnpm, bun)
 * - La structure du projet (dossiers src, public)
 * - L'environnement (OS, Node version)
 * - Les dépendances existantes
 * - La présence de Git
 *
 * Les résultats sont mis en cache pour améliorer les performances.
 *
 * @param projectRoot - Chemin absolu vers la racine du projet
 * @returns Contexte détecté contenant toutes les informations du projet
 * @throws {DetectionError} Si le projet n'est pas valide ou si aucun framework n'est détecté
 *
 * @example
 * ```typescript
 * const ctx = await detectContext('/path/to/project')
 * console.log(ctx.framework) // 'react'
 * console.log(ctx.bundler) // 'vite'
 * console.log(ctx.typescript) // true
 * ```
 */
const logger = getModuleLogger()

export async function detectContext(
  projectRoot: string,
  fsAdapter?: IFsAdapter
): Promise<ProjectContext> {
  const fullPath = resolve(projectRoot)

  // Vérifier le cache
  if (detectionCache.has(fullPath)) {
    logger.debug(`Using cached context for ${fullPath}`)
    const cached = detectionCache.get(fullPath)
    if (cached) {
      return cached
    }
  }

  logger.debug(`Detecting context for project: ${fullPath}`)

  // Vérifier que package.json existe
  let pkg: Record<string, unknown>
  try {
    pkg = await readPackageJson(fullPath, fsAdapter)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new DetectionError(
      `Invalid project: package.json not found or invalid. ${errorMessage}`,
      { projectRoot: fullPath }
    )
  }

  // Détections parallèles pour optimiser les performances
  const [
    frameworkInfo,
    typescriptInfo,
    bundlerInfo,
    packageManager,
    srcDir,
    publicDir,
    gitInfo,
  ] = await Promise.all([
    Promise.resolve(detectFramework(pkg)),
    detectTypeScript(fullPath, fsAdapter),
    detectBundler(fullPath, pkg, fsAdapter),
    detectPackageManager(fullPath, fsAdapter),
    detectSrcDir(fullPath, fsAdapter),
    detectPublicDir(fullPath, fsAdapter),
    detectGit(fullPath, fsAdapter),
  ])

  // Détecter le lockfile
  const lockfile = await detectLockfile(fullPath, packageManager, fsAdapter)

  // Détecter le router Next.js si applicable
  const nextjsRouter =
    frameworkInfo.framework === 'nextjs'
      ? await detectNextjsRouter(fullPath, srcDir, fsAdapter)
      : undefined

  // Détecter Vue.js version et API style si applicable
  const vueVersion = frameworkInfo.framework === 'vue' ? '3' : undefined // Vue 3 uniquement
  const vueApi =
    frameworkInfo.framework === 'vue'
      ? await detectVueApi(fullPath, srcDir, fsAdapter)
      : undefined

  // Extraire les dépendances
  const dependencies = (pkg['dependencies'] as Record<string, string>) || {}
  const devDependencies =
    (pkg['devDependencies'] as Record<string, string>) || {}

  // Construire le contexte
  const context: ProjectContext = {
    // Framework
    framework: frameworkInfo.framework,
    frameworkVersion: frameworkInfo.version,

    // Bundler
    bundler: bundlerInfo.bundler,
    bundlerVersion: bundlerInfo.version,

    // Language
    typescript: typescriptInfo.typescript,
    tsconfigPath: typescriptInfo.tsconfigPath,

    // Package Manager
    packageManager,
    lockfile,

    // Structure
    projectRoot: fullPath,
    srcDir,
    publicDir,

    // Environment
    os: platform as 'darwin' | 'win32' | 'linux',
    nodeVersion: version,

    // Dependencies
    dependencies,
    devDependencies,

    // Git
    hasGit: gitInfo.hasGit,
    gitHooksPath: gitInfo.gitHooksPath,

    // Next.js specific
    nextjsRouter,

    // Vue.js specific
    vueVersion,
    vueApi,

    // Filesystem adapter (for testing with memfs)
    fsAdapter,
  }

  // Mettre en cache
  detectionCache.set(fullPath, context)

  logger.debug(`Context detected successfully for ${fullPath}`, {
    framework: context.framework,
    bundler: context.bundler,
    typescript: context.typescript,
  })

  return context
}

/**
 * Vide le cache de détection
 *
 * Utile pour les tests ou lors de modifications du projet
 *
 * @example
 * ```typescript
 * clearDetectionCache()
 * const ctx = await detectContext('/path/to/project')
 * ```
 */
export function clearDetectionCache(): void {
  detectionCache.clear()
  logger.debug('Detection cache cleared')
}
