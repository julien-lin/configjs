import {
  readFile,
  writeFile,
  pathExists,
  ensureDir,
  copyFile as fsCopyFile,
  readJson,
  writeJson,
} from 'fs-extra'
import { resolve, dirname, extname } from 'path'
import type { PackageJson } from 'type-fest'
import { logger } from './logger.js'

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
 * @returns Le contenu du package.json parsé
 * @throws {Error} Si le fichier n'existe pas ou est invalide
 *
 * @example
 * ```typescript
 * const pkg = await readPackageJson('/path/to/project')
 * console.log(pkg.name) // 'my-project'
 * ```
 */
export async function readPackageJson(root: string): Promise<PackageJson> {
  const packageJsonPath = resolve(root, 'package.json')

  if (!(await pathExists(packageJsonPath))) {
    throw new Error(`package.json not found at ${packageJsonPath}`)
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pkg = await readJson(packageJsonPath)
    logger.debug(`Read package.json from ${packageJsonPath}`)
    return pkg as PackageJson
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
  pkg: PackageJson
): Promise<void> {
  const packageJsonPath = resolve(root, 'package.json')

  try {
    // Utiliser writeJson avec formatting pour préserver la structure
    await writeJson(packageJsonPath, pkg, {
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
export async function readTsConfig(root: string): Promise<TsConfig | null> {
  // Chercher tsconfig.json dans l'ordre de priorité
  const possiblePaths = [
    resolve(root, 'tsconfig.json'),
    resolve(root, 'tsconfig.app.json'),
    resolve(root, 'tsconfig.node.json'),
  ]

  for (const tsconfigPath of possiblePaths) {
    if (await pathExists(tsconfigPath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const config = await readJson(tsconfigPath)
        logger.debug(`Read tsconfig.json from ${tsconfigPath}`)
        return config as TsConfig
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
 * @returns true si le chemin existe, false sinon
 *
 * @example
 * ```typescript
 * const exists = await pathExists('/path/to/file')
 * if (exists) {
 *   // Fichier existe
 * }
 * ```
 */
export async function checkPathExists(path: string): Promise<boolean> {
  const fullPath = resolve(path)
  return pathExists(fullPath)
}

/**
 * Crée un dossier et tous ses parents si nécessaire
 *
 * @param path - Chemin du dossier à créer
 * @returns Promise qui se résout quand le dossier est créé
 * @throws {Error} Si la création échoue
 *
 * @example
 * ```typescript
 * await ensureDirectory('/path/to/new/directory')
 * ```
 */
export async function ensureDirectory(path: string): Promise<void> {
  const fullPath = resolve(path)

  try {
    await ensureDir(fullPath)
    logger.debug(`Ensured directory exists: ${fullPath}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create directory ${fullPath}: ${errorMessage}`)
  }
}

/**
 * Copie un fichier vers une destination
 *
 * @param src - Chemin source
 * @param dest - Chemin destination
 * @returns Promise qui se résout quand la copie est terminée
 * @throws {Error} Si la copie échoue
 *
 * @example
 * ```typescript
 * await copyFile('/path/to/source.txt', '/path/to/dest.txt')
 * ```
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  const srcPath = resolve(src)
  const destPath = resolve(dest)

  // Vérifier que le fichier source existe
  if (!(await pathExists(srcPath))) {
    throw new Error(`Source file not found: ${srcPath}`)
  }

  // Créer le dossier parent de la destination si nécessaire
  const destDir = dirname(destPath)
  await ensureDirectory(destDir)

  try {
    await fsCopyFile(srcPath, destPath)
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
 * @returns Chemin du fichier de backup créé
 * @throws {Error} Si le backup échoue
 *
 * @example
 * ```typescript
 * const backupPath = await backupFile('/path/to/file.txt')
 * // backupPath = '/path/to/file.txt.backup'
 * ```
 */
export async function backupFile(filePath: string): Promise<string> {
  const fullPath = resolve(filePath)

  if (!(await pathExists(fullPath))) {
    throw new Error(`File not found for backup: ${fullPath}`)
  }

  const ext = extname(fullPath)
  const baseName = fullPath.slice(0, -ext.length)
  const timestamp = Date.now()
  const timestampedBackup = `${baseName}.${timestamp}${ext}.backup`

  try {
    // Utiliser un nom avec timestamp pour éviter les conflits
    await copyFile(fullPath, timestampedBackup)
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
  originalPath: string
): Promise<void> {
  const backupFullPath = resolve(backupPath)
  const originalFullPath = resolve(originalPath)

  if (!(await pathExists(backupFullPath))) {
    throw new Error(`Backup file not found: ${backupFullPath}`)
  }

  try {
    await copyFile(backupFullPath, originalFullPath)
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
 * @param filePath - Chemin du fichier
 * @param encoding - Encodage (défaut: 'utf-8')
 * @returns Contenu du fichier
 * @throws {Error} Si la lecture échoue
 *
 * @example
 * ```typescript
 * const content = await readFileContent('/path/to/file.txt')
 * ```
 */
export async function readFileContent(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  const fullPath = resolve(filePath)

  if (!(await pathExists(fullPath))) {
    throw new Error(`File not found: ${fullPath}`)
  }

  try {
    const content = await readFile(fullPath, encoding)
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
 * @param filePath - Chemin du fichier
 * @param content - Contenu à écrire
 * @param encoding - Encodage (défaut: 'utf-8')
 * @returns Promise qui se résout quand l'écriture est terminée
 * @throws {Error} Si l'écriture échoue
 *
 * @example
 * ```typescript
 * await writeFileContent('/path/to/file.txt', 'Hello World')
 * ```
 */
export async function writeFileContent(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  const fullPath = resolve(filePath)

  // Créer le dossier parent si nécessaire
  const parentDir = dirname(fullPath)
  await ensureDirectory(parentDir)

  try {
    await writeFile(fullPath, content, encoding)
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
  content: string
): Promise<void> {
  const fullPath = resolve(filePath)

  // Lire le contenu existant
  let existingContent = ''
  if (await pathExists(fullPath)) {
    existingContent = await readFileContent(fullPath)
  }

  // Ajouter le nouveau contenu
  const newContent = existingContent + content

  // Écrire le fichier
  await writeFileContent(fullPath, newContent)
}
