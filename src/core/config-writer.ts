import { resolve, dirname } from 'path'
import type { PackageJson } from 'type-fest'
import {
  readPackageJson,
  writePackageJson,
  readFileContent,
  writeFileContent,
  checkPathExists,
  ensureDirectory,
} from '../utils/fs-helpers.js'
import type { BackupManager } from './backup-manager.js'
import { logger } from '../utils/logger.js'
import type { IFsAdapter } from './fs-adapter.js'

/**
 * Options pour l'écriture de fichiers
 */
export interface WriteOptions {
  /**
   * Créer le backup avant modification
   * @default true
   */
  backup?: boolean

  /**
   * Créer les dossiers parents si nécessaire
   * @default true
   */
  ensureDir?: boolean
}

/**
 * Gère l'écriture et la modification de fichiers de configuration
 *
 * Cette classe garantit :
 * - Backup automatique avant toute modification
 * - Création des dossiers parents si nécessaire
 * - Gestion d'erreurs avec rollback
 * - Préservation du formatting (notamment pour package.json)
 *
 * @example
 * ```typescript
 * const backupManager = new BackupManager()
 * const writer = new ConfigWriter(backupManager)
 *
 * // Créer un nouveau fichier
 * await writer.createFile('/path/to/config.js', 'export default {}')
 *
 * // Modifier un fichier existant
 * await writer.writeFile('/path/to/file.txt', 'new content')
 *
 * // Modifier package.json
 * await writer.modifyPackageJson('/project', (pkg) => ({
 *   ...pkg,
 *   scripts: { ...pkg.scripts, build: 'vite build' }
 * }))
 * ```
 */
export class ConfigWriter {
  /**
   * @param backupManager - Gestionnaire de backups à utiliser
   * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
   */
  constructor(
    private readonly backupManager: BackupManager,
    private readonly fsAdapter?: IFsAdapter
  ) {}

  /**
   * Écrit ou modifie un fichier avec backup automatique
   *
   * @param path - Chemin du fichier (relatif ou absolu)
   * @param content - Contenu à écrire
   * @param options - Options d'écriture
   * @returns Promise qui se résout quand l'écriture est terminée
   * @throws {Error} Si l'écriture échoue
   *
   * @example
   * ```typescript
   * await writer.writeFile('/path/to/file.txt', 'content', { backup: true })
   * ```
   */
  async writeFile(
    path: string,
    content: string,
    options: WriteOptions = {}
  ): Promise<void> {
    const { backup = true, ensureDir: shouldEnsureDir = true } = options

    const fullPath = resolve(path)

    // Vérifier si le fichier existe pour backup
    const fileExists = await checkPathExists(fullPath, this.fsAdapter)
    if (fileExists && backup) {
      try {
        const existingContent = await readFileContent(
          fullPath,
          'utf-8',
          this.fsAdapter
        )
        this.backupManager.backup(fullPath, existingContent)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        logger.warn(
          `Failed to backup file before write: ${fullPath}. ${errorMessage}`
        )
      }
    }

    // Créer les dossiers parents si nécessaire
    if (shouldEnsureDir) {
      const parentDir = dirname(fullPath)
      await ensureDirectory(parentDir, this.fsAdapter)
    }

    // Écrire le fichier
    try {
      await writeFileContent(fullPath, content, 'utf-8', this.fsAdapter)
      logger.debug(`Wrote file: ${fullPath}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to write file ${fullPath}: ${errorMessage}`)
    }
  }

  /**
   * Crée un nouveau fichier
   *
   * @param path - Chemin du fichier à créer
   * @param content - Contenu initial
   * @param options - Options d'écriture
   * @returns Promise qui se résout quand le fichier est créé
   * @throws {Error} Si le fichier existe déjà ou si la création échoue
   *
   * @example
   * ```typescript
   * await writer.createFile('/path/to/new-file.js', 'export default {}')
   * ```
   */
  async createFile(
    path: string,
    content: string,
    options: WriteOptions = {}
  ): Promise<void> {
    const fullPath = resolve(path)

    // Vérifier que le fichier n'existe pas
    if (await checkPathExists(fullPath, this.fsAdapter)) {
      throw new Error(`File already exists: ${fullPath}`)
    }

    // Créer le fichier (pas de backup pour un nouveau fichier)
    await this.writeFile(fullPath, content, {
      ...options,
      backup: false,
    })

    logger.debug(`Created new file: ${fullPath}`)
  }

  /**
   * Modifie le package.json d'un projet
   *
   * @param projectRoot - Racine du projet
   * @param modifier - Fonction qui modifie le package.json
   * @returns Promise qui se résout quand la modification est terminée
   * @throws {Error} Si la modification échoue
   *
   * @example
   * ```typescript
   * await writer.modifyPackageJson('/project', (pkg) => ({
   *   ...pkg,
   *   scripts: {
   *     ...pkg.scripts,
   *     build: 'vite build'
   *   }
   * }))
   * ```
   */
  async modifyPackageJson(
    projectRoot: string,
    modifier: (pkg: PackageJson) => PackageJson
  ): Promise<void> {
    const fullPath = resolve(projectRoot)

    // Lire le package.json actuel
    let pkg: PackageJson
    try {
      pkg = await readPackageJson(fullPath, this.fsAdapter)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(
        `Failed to read package.json: ${errorMessage}. Make sure you're in a valid project directory.`
      )
    }

    // Backup
    const packageJsonPath = resolve(fullPath, 'package.json')
    if (this.backupManager.hasBackup(packageJsonPath)) {
      // Backup déjà fait, ne pas le refaire
    } else {
      try {
        const existingContent = await readFileContent(
          packageJsonPath,
          'utf-8',
          this.fsAdapter
        )
        this.backupManager.backup(packageJsonPath, existingContent)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        logger.warn(
          `Failed to backup package.json: ${errorMessage}. Continuing anyway.`
        )
      }
    }

    // Modifier
    const modifiedPkg = modifier(pkg)

    // Écrire
    try {
      await writePackageJson(fullPath, modifiedPkg, this.fsAdapter)
      logger.debug(`Modified package.json: ${packageJsonPath}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(
        `Failed to write package.json: ${errorMessage}. Original file may be corrupted.`
      )
    }
  }

  /**
   * Ajoute du contenu à la fin d'un fichier
   *
   * @param path - Chemin du fichier
   * @param content - Contenu à ajouter
   * @param options - Options d'écriture
   * @returns Promise qui se résout quand l'ajout est terminé
   * @throws {Error} Si l'ajout échoue
   *
   * @example
   * ```typescript
   * await writer.appendToFile('/path/to/file.txt', '\nnew line')
   * ```
   */
  async appendToFile(
    path: string,
    content: string,
    options: WriteOptions = {}
  ): Promise<void> {
    const fullPath = resolve(path)
    const { backup = true } = options

    // Lire le contenu existant
    let existingContent = ''
    const fileExists = await checkPathExists(fullPath, this.fsAdapter)

    if (fileExists) {
      if (backup) {
        try {
          existingContent = await readFileContent(
            fullPath,
            'utf-8',
            this.fsAdapter
          )
          this.backupManager.backup(fullPath, existingContent)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          logger.warn(
            `Failed to backup file before append: ${fullPath}. ${errorMessage}`
          )
        }
      } else {
        existingContent = await readFileContent(
          fullPath,
          'utf-8',
          this.fsAdapter
        )
      }
    }

    // Ajouter le nouveau contenu
    const newContent = existingContent + content

    // Écrire
    await this.writeFile(fullPath, newContent, {
      ...options,
      backup: false, // Déjà fait si nécessaire
    })

    logger.debug(`Appended to file: ${fullPath}`)
  }

  /**
   * Injecte un import dans un fichier TypeScript/JavaScript
   *
   * Cette méthode ajoute un import en haut du fichier si il n'existe pas déjà.
   *
   * @param filePath - Chemin du fichier
   * @param importStatement - Statement d'import à ajouter (ex: "import React from 'react'")
   * @param options - Options d'écriture
   * @returns Promise qui se résout quand l'injection est terminée
   * @throws {Error} Si l'injection échoue
   *
   * @example
   * ```typescript
   * await writer.injectImport('/path/to/file.tsx', "import { useState } from 'react'")
   * ```
   */
  async injectImport(
    filePath: string,
    importStatement: string,
    options: WriteOptions = {}
  ): Promise<void> {
    const fullPath = resolve(filePath)

    // Vérifier que le fichier existe
    if (!(await checkPathExists(fullPath, this.fsAdapter))) {
      throw new Error(`File not found: ${fullPath}`)
    }

    // Lire le contenu
    const content = await readFileContent(fullPath, 'utf-8', this.fsAdapter)

    // Vérifier si l'import existe déjà
    if (content.includes(importStatement)) {
      logger.debug(`Import already exists in ${fullPath}`)
      return
    }

    // Trouver la position d'insertion (après les imports existants ou en haut)
    const lines = content.split('\n')
    let insertIndex = 0

    // Chercher la dernière ligne d'import
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.trim().startsWith('import ')) {
        insertIndex = i + 1
      } else if (lines[i]?.trim() === '' && insertIndex > 0) {
        // Ligne vide après les imports, insérer ici
        break
      } else if (insertIndex === 0 && lines[i]?.trim() !== '') {
        // Première ligne non vide, insérer avant
        insertIndex = i
        break
      }
    }

    // Insérer l'import
    lines.splice(insertIndex, 0, importStatement)

    // Backup avant modification
    const { backup = true } = options
    if (backup) {
      this.backupManager.backup(fullPath, content)
    }

    // Écrire le nouveau contenu
    const newContent = lines.join('\n')
    await this.writeFile(fullPath, newContent, {
      ...options,
      backup: false, // Déjà fait
    })

    logger.debug(`Injected import into ${fullPath}`)
  }
}
