import { resolve, dirname, extname } from 'path'
import type { PackageJson } from 'type-fest'
import { getModuleLogger } from './logger-provider.js'
import type { IFsAdapter } from '../core/fs-adapter.js'
import { createDefaultFsAdapter } from '../core/fs-adapter.js'
import {
  validatePathInProject,
  getPathValidationErrorMessage,
} from '../core/path-validator.js'

const logger = getModuleLogger()

/**
 * Normalise un chemin pour utiliser des slashes POSIX (/)
 * Nécessaire pour la compatibilité Windows/Unix dans les tests
 *
 * @param path - Chemin à normaliser
 * @returns Chemin avec des slashes POSIX
 *
 * @example
 * ```typescript
 * normalizePath('C:\\Users\\file.txt') // 'C:/Users/file.txt'
 * normalizePath('src\\components\\App.tsx') // 'src/components/App.tsx'
 * ```
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

/**
 * Type pour tsconfig.json
 */
export interface TsConfig {
  compilerOptions?: {
    target?: string
    module?: string
    lib?: string[]
    outDir?: string
    rootDir?: string
    strict?: boolean
    esModuleInterop?: boolean
    skipLibCheck?: boolean
    forceConsistentCasingInFileNames?: boolean
    moduleResolution?: string
    resolveJsonModule?: boolean
    isolatedModules?: boolean
    noEmit?: boolean
    jsx?: string
    [key: string]: unknown
  }
  include?: string[]
  exclude?: string[]
  extends?: string
  [key: string]: unknown
}

/**
 * Lit le package.json d'un projet
 *
 * @param root - Chemin racine du projet
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns Le contenu du package.json parsé
 * @throws {Error} Si le fichier n'existe pas ou est invalide
 *
 * @example
 * ```typescript
 * const pkg = await readPackageJson('/path/to/project')
 * console.log(pkg.name) // 'my-project'
 * ```
 */
export async function readPackageJson(
  root: string,
  fsAdapter?: IFsAdapter
): Promise<PackageJson> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const packageJsonPath = resolve(root, 'package.json')

  if (!(await adapter.pathExists(packageJsonPath))) {
    throw new Error(`package.json not found at ${packageJsonPath}`)
  }

  try {
    const pkg = await adapter.readJson<PackageJson>(packageJsonPath)
    logger.debug(`Read package.json from ${packageJsonPath}`)
    return pkg
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to read package.json: ${errorMessage}. File may be invalid JSON.`
    )
  }
}

/**
 * Écrit un package.json dans un projet
 *
 * @param root - Chemin racine du projet
 * @param pkg - Objet package.json à écrire
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns Promise qui se résout quand l'écriture est terminée
 * @throws {Error} Si l'écriture échoue
 *
 * @example
 * ```typescript
 * await writePackageJson('/path/to/project', {
 *   name: 'my-project',
 *   version: '1.0.0',
 * })
 * ```
 */
export async function writePackageJson(
  root: string,
  pkg: PackageJson,
  fsAdapter?: IFsAdapter
): Promise<void> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const packageJsonPath = resolve(root, 'package.json')

  try {
    // Utiliser writeJson avec formatting pour préserver la structure
    await adapter.writeJson(packageJsonPath, pkg, {
      spaces: 2,
      EOL: '\n',
    })
    logger.debug(`Wrote package.json to ${packageJsonPath}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to write package.json: ${errorMessage}`)
  }
}

/**
 * Lit le tsconfig.json d'un projet
 *
 * @param root - Chemin racine du projet
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns Le contenu du tsconfig.json parsé, ou null si non trouvé
 *
 * @example
 * ```typescript
 * const tsconfig = await readTsConfig('/path/to/project')
 * if (tsconfig) {
 *   console.log(tsconfig.compilerOptions?.strict) // true
 * }
 * ```
 */
export async function readTsConfig(
  root: string,
  fsAdapter?: IFsAdapter
): Promise<TsConfig | null> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  // Chercher tsconfig.json dans l'ordre de priorité
  const possiblePaths = [
    resolve(root, 'tsconfig.json'),
    resolve(root, 'tsconfig.app.json'),
    resolve(root, 'tsconfig.node.json'),
  ]

  for (const tsconfigPath of possiblePaths) {
    if (await adapter.pathExists(tsconfigPath)) {
      try {
        const config = await adapter.readJson<TsConfig>(tsconfigPath)
        logger.debug(`Read tsconfig.json from ${tsconfigPath}`)
        return config
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        logger.warn(
          `Failed to parse tsconfig.json at ${tsconfigPath}: ${errorMessage}`
        )
        return null
      }
    }
  }

  logger.debug('No tsconfig.json found')
  return null
}

/**
 * Vérifie si un chemin existe
 *
 * @param path - Chemin à vérifier (relatif ou absolu)
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns true si le chemin existe, false sinon
 *
 * @example
 * ```typescript
 * const exists = await checkPathExists('/path/to/file')
 * if (exists) {
 *   // Fichier existe
 * }
 * ```
 */
export async function checkPathExists(
  path: string,
  fsAdapter?: IFsAdapter
): Promise<boolean> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const fullPath = resolve(path)
  return adapter.pathExists(fullPath)
}

/**
 * Crée un dossier et tous ses parents si nécessaire
 *
 * @param path - Chemin du dossier à créer
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns Promise qui se résout quand le dossier est créé
 * @throws {Error} Si la création échoue
 *
 * @example
 * ```typescript
 * await ensureDirectory('/path/to/new/directory')
 * ```
 */
export async function ensureDirectory(
  path: string,
  fsAdapter?: IFsAdapter
): Promise<void> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const fullPath = resolve(path)

  try {
    await adapter.mkdir(fullPath, { recursive: true })
    logger.debug(`Ensured directory exists: ${fullPath}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create directory ${fullPath}: ${errorMessage}`)
  }
}

/**
 * Copie un fichier vers une destination
 *
 * @param src - Chemin source (relatif ou absolu)
 * @param dest - Chemin destination (relatif ou absolu)
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @param projectRoot - Chemin racine du projet pour validation (sécurité contre path traversal)
 * @returns Promise qui se résout quand la copie est terminée
 * @throws {Error} Si la copie échoue ou si les chemins tentent une traversal
 *
 * @example
 * ```typescript
 * await copyFile(
 *   'src/template.json',
 *   'src/config.json',
 *   undefined,
 *   '/home/user/my-project'
 * )
 * ```
 */
export async function copyFile(
  src: string,
  dest: string,
  fsAdapter?: IFsAdapter,
  projectRoot?: string
): Promise<void> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  let srcPath = resolve(src)
  let destPath = resolve(dest)

  // SECURITY: Validate paths stay within projectRoot if provided
  if (projectRoot) {
    try {
      srcPath = validatePathInProject(projectRoot, src)
      destPath = validatePathInProject(projectRoot, dest)
    } catch (error) {
      const errorMsg = getPathValidationErrorMessage(error)
      logger.error(`Path traversal attempt blocked: ${errorMsg}`)
      throw new Error(`Invalid path: ${errorMsg}`)
    }
  }

  // Vérifier que le fichier source existe
  if (!(await adapter.pathExists(srcPath))) {
    throw new Error(`Source file not found: ${srcPath}`)
  }

  // Créer le dossier parent de la destination si nécessaire
  const destDir = dirname(destPath)
  await ensureDirectory(destDir, adapter)

  try {
    await adapter.copyFile(srcPath, destPath)
    logger.debug(`Copied file from ${srcPath} to ${destPath}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to copy file from ${srcPath} to ${destPath}: ${errorMessage}`
    )
  }
}

/**
 * Crée un backup d'un fichier
 *
 * @param filePath - Chemin du fichier à sauvegarder
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns Chemin du fichier de backup créé
 * @throws {Error} Si le backup échoue
 *
 * @example
 * ```typescript
 * const backupPath = await backupFile('/path/to/file.txt')
 * // backupPath = '/path/to/file.txt.backup'
 * ```
 */
export async function backupFile(
  filePath: string,
  fsAdapter?: IFsAdapter
): Promise<string> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const fullPath = resolve(filePath)

  if (!(await adapter.pathExists(fullPath))) {
    throw new Error(`File not found for backup: ${fullPath}`)
  }

  const ext = extname(fullPath)
  const baseName = fullPath.slice(0, -ext.length)
  const timestamp = Date.now()
  const timestampedBackup = `${baseName}.${timestamp}${ext}.backup`

  try {
    // Utiliser un nom avec timestamp pour éviter les conflits
    await copyFile(fullPath, timestampedBackup, adapter)
    logger.debug(`Created backup: ${timestampedBackup}`)
    return timestampedBackup
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create backup: ${errorMessage}`)
  }
}

/**
 * Restaure un fichier depuis un backup
 *
 * @param backupPath - Chemin du fichier de backup
 * @param originalPath - Chemin du fichier original à restaurer
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns Promise qui se résout quand la restauration est terminée
 * @throws {Error} Si la restauration échoue
 *
 * @example
 * ```typescript
 * await restoreBackup('/path/to/file.txt.backup', '/path/to/file.txt')
 * ```
 */
export async function restoreBackup(
  backupPath: string,
  originalPath: string,
  fsAdapter?: IFsAdapter
): Promise<void> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const backupFullPath = resolve(backupPath)
  const originalFullPath = resolve(originalPath)

  if (!(await adapter.pathExists(backupFullPath))) {
    throw new Error(`Backup file not found: ${backupFullPath}`)
  }

  try {
    await copyFile(backupFullPath, originalFullPath, adapter)
    logger.debug(
      `Restored backup from ${backupFullPath} to ${originalFullPath}`
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to restore backup: ${errorMessage}`)
  }
}

/**
 * Lit le contenu d'un fichier texte
 *
 * @param filePath - Chemin du fichier (relatif à CWD ou absolu)
 * @param encoding - Encodage (défaut: 'utf-8')
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @param projectRoot - Chemin racine du projet pour validation (sécurité contre path traversal)
 * @returns Contenu du fichier
 * @throws {Error} Si la lecture échoue ou si le chemin tente une traversal
 *
 * @example
 * ```typescript
 * const content = await readFileContent(
 *   'src/config.json',
 *   'utf-8',
 *   undefined,
 *   '/home/user/my-project'
 * )
 * ```
 */
export async function readFileContent(
  filePath: string,
  encoding: BufferEncoding = 'utf-8',
  fsAdapter?: IFsAdapter,
  projectRoot?: string
): Promise<string> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  let fullPath = resolve(filePath)

  // SECURITY: Validate path stays within projectRoot if provided
  if (projectRoot) {
    try {
      fullPath = validatePathInProject(projectRoot, filePath)
    } catch (error) {
      const errorMsg = getPathValidationErrorMessage(error)
      logger.error(`Path traversal attempt blocked: ${errorMsg}`)
      throw new Error(`Invalid path: ${errorMsg}`)
    }
  }

  if (!(await adapter.pathExists(fullPath))) {
    throw new Error(`File not found: ${fullPath}`)
  }

  try {
    const content = await adapter.readFile(fullPath, encoding || 'utf-8')
    logger.debug(`Read file: ${fullPath}`)
    return content
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read file ${fullPath}: ${errorMessage}`)
  }
}

/**
 * Écrit du contenu dans un fichier texte
 *
 * @param filePath - Chemin du fichier (relatif à CWD ou absolu)
 * @param content - Contenu à écrire
 * @param encoding - Encodage (défaut: 'utf-8')
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @param projectRoot - Chemin racine du projet pour validation (sécurité contre path traversal)
 * @returns Promise qui se résout quand l'écriture est terminée
 * @throws {Error} Si l'écriture échoue ou si le chemin tente une traversal
 *
 * @example
 * ```typescript
 * await writeFileContent(
 *   'src/config.json',
 *   '{"name": "app"}',
 *   'utf-8',
 *   undefined,
 *   '/home/user/my-project'
 * )
 * ```
 */
export async function writeFileContent(
  filePath: string,
  content: string,
  encoding: string = 'utf-8',
  fsAdapter?: IFsAdapter,
  projectRoot?: string
): Promise<void> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  let fullPath = resolve(filePath)

  // SECURITY: Validate path stays within projectRoot if provided
  if (projectRoot) {
    try {
      fullPath = validatePathInProject(projectRoot, filePath)
    } catch (error) {
      const errorMsg = getPathValidationErrorMessage(error)
      logger.error(`Path traversal attempt blocked: ${errorMsg}`)
      throw new Error(`Invalid path: ${errorMsg}`)
    }
  }

  // Créer le dossier parent si nécessaire
  const parentDir = dirname(fullPath)
  await ensureDirectory(parentDir, adapter)

  try {
    await adapter.writeFile(fullPath, content, encoding as BufferEncoding)
    logger.debug(`Wrote file: ${fullPath}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to write file ${fullPath}: ${errorMessage}`)
  }
}

/**
 * Ajoute du contenu à la fin d'un fichier
 *
 * @param filePath - Chemin du fichier
 * @param content - Contenu à ajouter
 * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
 * @returns Promise qui se résout quand l'ajout est terminé
 * @throws {Error} Si l'ajout échoue
 *
 * @example
 * ```typescript
 * await appendToFile('/path/to/file.txt', '\nNew line')
 * ```
 */
export async function appendToFile(
  filePath: string,
  content: string,
  fsAdapter?: IFsAdapter
): Promise<void> {
  const adapter = fsAdapter || createDefaultFsAdapter()
  const fullPath = resolve(filePath)

  // Lire le contenu existant
  let existingContent = ''
  if (await adapter.pathExists(fullPath)) {
    existingContent = await adapter.readFile(fullPath, 'utf-8')
  }

  // Ajouter le nouveau contenu
  const newContent = existingContent + content

  // Écrire le fichier
  await adapter.writeFile(fullPath, newContent, 'utf-8')
}
