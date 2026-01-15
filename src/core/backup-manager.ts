import { resolve } from 'path'
import {
  readFileContent,
  writeFileContent,
  checkPathExists,
} from '../utils/fs-helpers.js'
import { getModuleLogger } from '../utils/logger-provider.js'
import type { IFsAdapter } from './fs-adapter.js'

/**
 * Gère les backups et restaurations de fichiers
 *
 * Cette classe permet de sauvegarder le contenu de fichiers avant modification
 * et de les restaurer en cas d'erreur ou sur demande.
 *
 * @example
 * ```typescript
 * const backupManager = new BackupManager()
 *
 * // Backup avant modification
 * const content = await readFileContent('/path/to/file.txt')
 * backupManager.backup('/path/to/file.txt', content)
 *
 * // Modification du fichier
 * await writeFileContent('/path/to/file.txt', newContent)
 *
 * // Restore si nécessaire
 * await backupManager.restore('/path/to/file.txt')
 * ```
 */
export class BackupManager {
  private logger = getModuleLogger()

  /**
   * Map des backups : filePath -> content
   */
  private readonly backups: Map<string, string> = new Map()

  /**
   * @param fsAdapter - Adaptateur de filesystem optionnel (pour tests avec memfs)
   */
  constructor(private readonly fsAdapter?: IFsAdapter) {}

  /**
   * Sauvegarde le contenu d'un fichier avant modification
   *
   * @param filePath - Chemin du fichier à sauvegarder
   * @param content - Contenu actuel du fichier
   * @throws {Error} Si le backup échoue
   *
   * @example
   * ```typescript
   * backupManager.backup('/path/to/file.txt', 'original content')
   * ```
   */
  backup(filePath: string, content: string): void {
    const fullPath = resolve(filePath)

    if (this.backups.has(fullPath)) {
      this.logger.debug(`Backup already exists for ${fullPath}, overwriting`)
    }

    this.backups.set(fullPath, content)
    this.logger.debug(`Backed up file: ${fullPath}`)
  }

  /**
   * Sauvegarde le contenu d'un fichier en le lisant depuis le disque
   *
   * @param filePath - Chemin du fichier à sauvegarder
   * @returns Promise qui se résout quand le backup est terminé
   * @throws {Error} Si le fichier n'existe pas ou si la lecture échoue
   *
   * @example
   * ```typescript
   * await backupManager.backupFromDisk('/path/to/file.txt')
   * ```
   */
  async backupFromDisk(filePath: string): Promise<void> {
    const fullPath = resolve(filePath)

    if (!(await checkPathExists(fullPath, this.fsAdapter))) {
      throw new Error(`File not found for backup: ${fullPath}`)
    }

    const content = await readFileContent(fullPath, 'utf-8', this.fsAdapter)
    this.backup(fullPath, content)
  }

  /**
   * Restaure un fichier depuis son backup
   *
   * @param filePath - Chemin du fichier à restaurer
   * @returns Promise qui se résout quand la restauration est terminée
   * @throws {Error} Si aucun backup n'existe pour ce fichier
   *
   * @example
   * ```typescript
   * await backupManager.restore('/path/to/file.txt')
   * ```
   */
  async restore(filePath: string): Promise<void> {
    const fullPath = resolve(filePath)

    const backupContent = this.backups.get(fullPath)
    if (!backupContent) {
      throw new Error(
        `No backup found for file: ${fullPath}. Available backups: ${Array.from(
          this.backups.keys()
        ).join(', ')}`
      )
    }

    try {
      await writeFileContent(fullPath, backupContent, 'utf-8', this.fsAdapter)
      this.logger.debug(`Restored file from backup: ${fullPath}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to restore file ${fullPath}: ${errorMessage}`)
    }
  }

  /**
   * Restaure tous les fichiers sauvegardés
   *
   * @returns Promise qui se résout quand toutes les restaurations sont terminées
   * @throws {Error} Si une restauration échoue (mais continue avec les autres)
   *
   * @example
   * ```typescript
   * await backupManager.restoreAll()
   * ```
   */
  async restoreAll(): Promise<void> {
    const filePaths = Array.from(this.backups.keys())

    if (filePaths.length === 0) {
      this.logger.debug('No backups to restore')
      return
    }

    this.logger.debug(`Restoring ${filePaths.length} file(s) from backup`)

    const errors: Array<{ filePath: string; error: Error }> = []

    for (const filePath of filePaths) {
      try {
        await this.restore(filePath)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push({
          filePath,
          error: new Error(errorMessage),
        })
        this.logger.error(`Failed to restore ${filePath}: ${errorMessage}`)
      }
    }

    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `${e.filePath}: ${e.error.message}`)
        .join('; ')
      throw new Error(
        `Failed to restore ${errors.length} file(s): ${errorMessages}`
      )
    }

    this.logger.debug(`Successfully restored ${filePaths.length} file(s)`)
  }

  /**
   * Vérifie si un backup existe pour un fichier
   *
   * @param filePath - Chemin du fichier à vérifier
   * @returns true si un backup existe, false sinon
   *
   * @example
   * ```typescript
   * if (backupManager.hasBackup('/path/to/file.txt')) {
   *   await backupManager.restore('/path/to/file.txt')
   * }
   * ```
   */
  hasBackup(filePath: string): boolean {
    const fullPath = resolve(filePath)
    return this.backups.has(fullPath)
  }

  /**
   * Récupère le contenu du backup d'un fichier sans le restaurer
   *
   * @param filePath - Chemin du fichier
   * @returns Contenu du backup ou undefined si aucun backup n'existe
   *
   * @example
   * ```typescript
   * const backupContent = backupManager.getBackup('/path/to/file.txt')
   * if (backupContent) {
   *   console.log('Backup content:', backupContent)
   * }
   * ```
   */
  getBackup(filePath: string): string | undefined {
    const fullPath = resolve(filePath)
    return this.backups.get(fullPath)
  }

  /**
   * Supprime le backup d'un fichier spécifique
   *
   * @param filePath - Chemin du fichier
   * @returns true si le backup a été supprimé, false s'il n'existait pas
   *
   * @example
   * ```typescript
   * backupManager.removeBackup('/path/to/file.txt')
   * ```
   */
  removeBackup(filePath: string): boolean {
    const fullPath = resolve(filePath)
    const removed = this.backups.delete(fullPath)
    if (removed) {
      this.logger.debug(`Removed backup for: ${fullPath}`)
    }
    return removed
  }

  /**
   * Vide tous les backups
   *
   * Utile après une opération réussie pour libérer la mémoire
   *
   * @example
   * ```typescript
   * backupManager.clear()
   * ```
   */
  clear(): void {
    const count = this.backups.size
    this.backups.clear()
    this.logger.debug(`Cleared ${count} backup(s)`)
  }

  /**
   * Retourne le nombre de backups actuellement stockés
   *
   * @returns Nombre de backups
   *
   * @example
   * ```typescript
   * const count = backupManager.size()
   * console.log(`${count} file(s) backed up`)
   * ```
   */
  size(): number {
    return this.backups.size
  }

  /**
   * Retourne la liste des fichiers sauvegardés
   *
   * @returns Tableau des chemins de fichiers sauvegardés
   *
   * @example
   * ```typescript
   * const files = backupManager.listBackups()
   * console.log('Backed up files:', files)
   * ```
   */
  listBackups(): string[] {
    return Array.from(this.backups.keys())
  }
}
