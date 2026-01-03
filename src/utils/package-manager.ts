import { execa } from 'execa'
import fs from 'fs-extra'
import { resolve, join } from 'path'
import type { PackageManager } from '../types/index.js'
import { logger } from './logger.js'

/**
 * Options pour l'installation de packages
 */
export interface InstallOptions {
  /** Installer en tant que devDependencies */
  dev?: boolean
  /** Package manager à utiliser */
  packageManager: PackageManager
  /** Chemin racine du projet */
  projectRoot: string
  /** Version exacte (pas de ^ ou ~) */
  exact?: boolean
  /** Mode silencieux */
  silent?: boolean
}

/**
 * Résultat d'une installation
 */
export interface InstallResult {
  success: boolean
  packages: string[]
  error?: string
}

/**
 * Détecte le package manager utilisé dans un projet
 *
 * Vérifie la présence des lockfiles dans l'ordre :
 * 1. pnpm-lock.yaml (pnpm)
 * 2. yarn.lock (yarn)
 * 3. package-lock.json (npm)
 * 4. bun.lockb (bun)
 *
 * @param projectRoot - Chemin racine du projet
 * @returns Le package manager détecté, 'npm' par défaut
 *
 * @example
 * ```typescript
 * const pm = await detectPackageManager('/path/to/project')
 * console.log(pm) // 'pnpm' | 'yarn' | 'npm' | 'bun'
 * ```
 */
export async function detectPackageManager(
  projectRoot: string
): Promise<PackageManager> {
  const root = resolve(projectRoot)

  // Ordre de vérification des lockfiles
  const lockfiles: Array<{ file: string; manager: PackageManager }> = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'package-lock.json', manager: 'npm' },
    { file: 'bun.lockb', manager: 'bun' },
  ]

  for (const { file, manager } of lockfiles) {
    const lockfilePath = join(root, file)
    if (await fs.pathExists(lockfilePath)) {
      logger.debug(`Detected package manager: ${manager} (found ${file})`)
      return manager
    }
  }

  // Par défaut, utiliser npm
  logger.debug('No lockfile found, defaulting to npm')
  return 'npm'
}

/**
 * Installe des packages avec le package manager spécifié
 *
 * @param packages - Liste des packages à installer (ex: ['react', 'react-dom'])
 * @param options - Options d'installation
 * @returns Résultat de l'installation
 *
 * @throws {Error} Si l'installation échoue
 *
 * @example
 * ```typescript
 * await installPackages(['axios', 'zustand'], {
 *   dev: false,
 *   packageManager: 'pnpm',
 *   projectRoot: '/path/to/project',
 * })
 * ```
 */
export async function installPackages(
  packages: string[],
  options: InstallOptions
): Promise<InstallResult> {
  if (packages.length === 0) {
    logger.warn('No packages to install')
    return { success: true, packages: [] }
  }

  const {
    packageManager,
    projectRoot,
    dev = false,
    exact = false,
    silent = false,
  } = options

  logger.info(
    `Installing ${packages.length} package(s) with ${packageManager}...`
  )

  try {
    const command = getInstallCommand(packageManager, packages, { dev, exact })
    const cwd = resolve(projectRoot)

    logger.debug(`Executing: ${command.join(' ')} in ${cwd}`)

    const [cmd, ...args] = command
    if (!cmd) {
      throw new Error('Command is empty')
    }

    const result = await execa(cmd, args, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      env: {
        ...process.env,
        // Désactiver les prompts interactifs
        npm_config_yes: 'true',
        YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
      },
    })

    if (result.exitCode !== 0) {
      throw new Error(`Installation failed with exit code ${result.exitCode}`)
    }

    logger.success(`Successfully installed ${packages.length} package(s)`)
    return {
      success: true,
      packages,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to install packages: ${errorMessage}`)

    return {
      success: false,
      packages,
      error: errorMessage,
    }
  }
}

/**
 * Désinstalle des packages
 *
 * @param packages - Liste des packages à désinstaller
 * @param options - Options (packageManager, projectRoot)
 * @returns Résultat de la désinstallation
 *
 * @example
 * ```typescript
 * await uninstallPackages(['axios'], {
 *   packageManager: 'pnpm',
 *   projectRoot: '/path/to/project',
 * })
 * ```
 */
export async function uninstallPackages(
  packages: string[],
  options: Pick<InstallOptions, 'packageManager' | 'projectRoot'>
): Promise<InstallResult> {
  if (packages.length === 0) {
    logger.warn('No packages to uninstall')
    return { success: true, packages: [] }
  }

  const { packageManager, projectRoot } = options

  logger.info(
    `Uninstalling ${packages.length} package(s) with ${packageManager}...`
  )

  try {
    const command = getUninstallCommand(packageManager, packages)
    const cwd = resolve(projectRoot)

    logger.debug(`Executing: ${command.join(' ')} in ${cwd}`)

    const [cmd, ...args] = command
    if (!cmd) {
      throw new Error('Command is empty')
    }

    const result = await execa(cmd, args, {
      cwd,
      stdio: 'inherit',
    })

    if (result.exitCode !== 0) {
      throw new Error(`Uninstallation failed with exit code ${result.exitCode}`)
    }

    logger.success(`Successfully uninstalled ${packages.length} package(s)`)
    return {
      success: true,
      packages,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to uninstall packages: ${errorMessage}`)

    return {
      success: false,
      packages,
      error: errorMessage,
    }
  }
}

/**
 * Exécute un script npm/yarn/pnpm
 *
 * @param script - Nom du script (ex: 'build', 'test')
 * @param options - Options (packageManager, projectRoot)
 * @returns Résultat de l'exécution
 *
 * @example
 * ```typescript
 * await runScript('build', {
 *   packageManager: 'pnpm',
 *   projectRoot: '/path/to/project',
 * })
 * ```
 */
export async function runScript(
  script: string,
  options: Pick<InstallOptions, 'packageManager' | 'projectRoot'>
): Promise<{ success: boolean; error?: string }> {
  const { packageManager, projectRoot } = options

  logger.info(`Running script '${script}' with ${packageManager}...`)

  try {
    const command = getRunCommand(packageManager, script)
    const cwd = resolve(projectRoot)

    logger.debug(`Executing: ${command.join(' ')} in ${cwd}`)

    const [cmd, ...args] = command
    if (!cmd) {
      throw new Error('Command is empty')
    }

    const result = await execa(cmd, args, {
      cwd,
      stdio: 'inherit',
    })

    if (result.exitCode !== 0) {
      throw new Error(`Script failed with exit code ${result.exitCode}`)
    }

    logger.success(`Script '${script}' completed successfully`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to run script '${script}': ${errorMessage}`)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Génère la commande d'installation selon le package manager
 *
 * @internal
 */
function getInstallCommand(
  packageManager: PackageManager,
  packages: string[],
  options: { dev: boolean; exact: boolean }
): string[] {
  const { dev, exact } = options

  switch (packageManager) {
    case 'pnpm':
      return [
        'pnpm',
        'add',
        ...(dev ? ['-D'] : []),
        ...(exact ? ['--save-exact'] : []),
        ...packages,
      ]

    case 'yarn':
      return [
        'yarn',
        'add',
        ...(dev ? ['--dev'] : []),
        ...(exact ? ['--exact'] : []),
        ...packages,
      ]

    case 'bun':
      return ['bun', 'add', ...(dev ? ['--dev'] : []), ...packages]

    case 'npm':
    default:
      return [
        'npm',
        'install',
        ...(dev ? ['--save-dev'] : []),
        ...(exact ? ['--save-exact'] : []),
        ...packages,
      ]
  }
}

/**
 * Génère la commande de désinstallation selon le package manager
 *
 * @internal
 */
function getUninstallCommand(
  packageManager: PackageManager,
  packages: string[]
): string[] {
  switch (packageManager) {
    case 'pnpm':
      return ['pnpm', 'remove', ...packages]

    case 'yarn':
      return ['yarn', 'remove', ...packages]

    case 'bun':
      return ['bun', 'remove', ...packages]

    case 'npm':
    default:
      return ['npm', 'uninstall', ...packages]
  }
}

/**
 * Génère la commande d'exécution de script selon le package manager
 *
 * @internal
 */
function getRunCommand(
  packageManager: PackageManager,
  script: string
): string[] {
  switch (packageManager) {
    case 'pnpm':
      return ['pnpm', 'run', script]

    case 'yarn':
      return ['yarn', 'run', script]

    case 'bun':
      return ['bun', 'run', script]

    case 'npm':
    default:
      return ['npm', 'run', script]
  }
}
