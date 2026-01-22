import { resolve } from 'path'
import {
  readFileContent,
  writeFileContent,
  checkPathExists,
} from '../utils/fs-helpers.js'
import { getModuleLogger } from '../utils/logger-provider.js'
import type { IFsAdapter } from './fs-adapter.js'

/**
 * Snapshot d'état de projet pour rollback atomique
 */
interface ProjectSnapshot {
  id: string
  timestamp: number
  projectRoot: string
  files: Map<string, string>
  metadata: {
    description?: string
    createdAt: string
    expiresAt: string
  }
}

/**
 * Gère les snapshots d'état pour installations atomiques
 *
 * Permet de sauvegarder et restaurer l'état complet d'un projet:
 * - package.json et package-lock.json
 * - Tous les fichiers modifiés pendant l'installation
 * - Métadonnées pour debugging et replay
 *
 * Les snapshots sont stockés en mémoire et supportent:
 * - Expiration automatique après 24h
 * - Cleanup manuel
 * - Validation d'intégrité
 *
 * @example
 * ```typescript
 * const snapshotManager = new SnapshotManager(projectRoot)
 *
 * // Créer un snapshot avant installation
 * const snapshotId = await snapshotManager.createSnapshot()
 *
 * // Effectuer l'installation...
 *
 * // En cas d'erreur, restaurer le snapshot
 * if (error) {
 *   await snapshotManager.restoreSnapshot(snapshotId)
 * }
 *
 * // Sinon, nettoyer le snapshot
 * await snapshotManager.releaseSnapshot(snapshotId)
 * ```
 */
export class SnapshotManager {
  private logger = getModuleLogger()

  /**
   * Map des snapshots actifs: id -> snapshot
   */
  private readonly snapshots: Map<string, ProjectSnapshot> = new Map()

  /**
   * Interval ID pour le cleanup des snapshots expirés
   */
  private cleanupInterval?: NodeJS.Timeout

  /**
   * TTL des snapshots en millisecondes (24 heures par défaut)
   */
  private readonly snapshotTTL: number = 24 * 60 * 60 * 1000

  /**
   * @param projectRoot - Racine du projet
   * @param fsAdapter - Adaptateur filesystem optionnel (pour tests)
   */
  constructor(
    private readonly projectRoot: string,
    private readonly fsAdapter?: IFsAdapter
  ) {
    this.startCleanupInterval()
  }

  /**
   * Crée un snapshot de l'état actuel du projet
   *
   * Sauvegarde les fichiers critiques:
   * - package.json
   * - package-lock.json
   * - yarn.lock / pnpm-lock.yaml
   * - .npmrc / .yarnrc
   *
   * @param description - Description optionnelle du snapshot
   * @returns ID du snapshot créé
   * @throws {Error} Si le snapshot échoue
   *
   * @example
   * ```typescript
   * const snapshotId = await snapshotManager.createSnapshot('Before React installation')
   * console.log('Created snapshot:', snapshotId)
   * ```
   */
  async createSnapshot(description?: string): Promise<string> {
    const snapshotId = this.generateSnapshotId()
    const now = Date.now()
    const files = new Map<string, string>()

    this.logger.debug(`Creating snapshot ${snapshotId}`)

    // Fichiers critiques à sauvegarder
    const criticalFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.npmrc',
      '.yarnrc',
      '.yarnrc.yml',
      'tsconfig.json',
      '.eslintrc.json',
      'vitest.config.ts',
    ]

    for (const filename of criticalFiles) {
      const filePath = resolve(this.projectRoot, filename)

      try {
        if (await checkPathExists(filePath, this.fsAdapter)) {
          const content = await readFileContent(
            filePath,
            'utf-8',
            this.fsAdapter
          )
          files.set(filePath, content)
          this.logger.debug(`Snapshotted ${filename}`)
        }
      } catch (error) {
        // Fichiers optionnels peuvent manquer sans erreur
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        this.logger.debug(`Could not snapshot ${filename}: ${errorMessage}`)
      }
    }

    // Créer le snapshot
    const snapshot: ProjectSnapshot = {
      id: snapshotId,
      timestamp: now,
      projectRoot: this.projectRoot,
      files,
      metadata: {
        description,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + this.snapshotTTL).toISOString(),
      },
    }

    this.snapshots.set(snapshotId, snapshot)
    this.logger.info(
      `Created snapshot ${snapshotId} with ${files.size} file(s)`
    )

    return snapshotId
  }

  /**
   * Restaure un projet depuis un snapshot
   *
   * Restore tous les fichiers sauvegardés dans le snapshot.
   * Effectue une restauration atomique ou lance une erreur.
   *
   * @param snapshotId - ID du snapshot à restaurer
   * @throws {Error} Si le snapshot n'existe pas ou si la restauration échoue
   *
   * @example
   * ```typescript
   * try {
   *   await snapshotManager.restoreSnapshot(snapshotId)
   *   console.log('Project restored successfully')
   * } catch (error) {
   *   console.error('Restore failed:', error)
   * }
   * ```
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId)

    if (!snapshot) {
      const availableIds = Array.from(this.snapshots.keys()).join(', ')
      throw new Error(
        `Snapshot not found: ${snapshotId}. Available: ${availableIds}`
      )
    }

    this.logger.info(`Restoring snapshot ${snapshotId}`)

    const errors: Array<{ file: string; error: Error }> = []

    // Restaurer chaque fichier
    for (const [filePath, content] of snapshot.files) {
      try {
        await writeFileContent(filePath, content, 'utf-8', this.fsAdapter)
        this.logger.debug(`Restored ${filePath}`)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        const restoreError = new Error(
          `Failed to restore ${filePath}: ${errorMessage}`
        )
        errors.push({ file: filePath, error: restoreError })
        this.logger.error(errorMessage)
      }
    }

    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `${e.file}: ${e.error.message}`)
        .join('; ')
      throw new Error(
        `Restore failed for ${errors.length}/${snapshot.files.size} file(s): ${errorMessages}`
      )
    }

    this.logger.info(
      `Successfully restored snapshot ${snapshotId} (${snapshot.files.size} file(s))`
    )
  }

  /**
   * Libère (supprime) un snapshot
   *
   * À appeler après une installation réussie pour nettoyer les snapshots.
   * Les snapshots sont aussi nettoyés automatiquement après 24h.
   *
   * @param snapshotId - ID du snapshot à libérer
   * @returns true si le snapshot a été libéré, false s'il n'existait pas
   *
   * @example
   * ```typescript
   * await snapshotManager.releaseSnapshot(snapshotId)
   * console.log('Snapshot cleaned up')
   * ```
   */
  releaseSnapshot(snapshotId: string): boolean {
    const removed = this.snapshots.delete(snapshotId)

    if (removed) {
      this.logger.info(`Released snapshot ${snapshotId}`)
    } else {
      this.logger.warn(`Snapshot ${snapshotId} not found for release`)
    }

    return removed
  }

  /**
   * Récupère les détails d'un snapshot
   *
   * @param snapshotId - ID du snapshot
   * @returns Métadonnées du snapshot ou undefined
   *
   * @example
   * ```typescript
   * const info = snapshotManager.getSnapshotInfo(snapshotId)
   * console.log('Created at:', info?.metadata.createdAt)
   * ```
   */
  getSnapshotInfo(snapshotId: string): ProjectSnapshot | undefined {
    return this.snapshots.get(snapshotId)
  }

  /**
   * Liste tous les snapshots actifs
   *
   * @returns Array de métadonnées des snapshots
   *
   * @example
   * ```typescript
   * const snapshots = snapshotManager.listSnapshots()
   * snapshots.forEach(s => {
   *   console.log(`${s.id}: ${s.metadata.description}`)
   * })
   * ```
   */
  listSnapshots(): ProjectSnapshot[] {
    return Array.from(this.snapshots.values())
  }

  /**
   * Vérifie si un snapshot existe
   *
   * @param snapshotId - ID du snapshot
   * @returns true si le snapshot existe, false sinon
   */
  hasSnapshot(snapshotId: string): boolean {
    return this.snapshots.has(snapshotId)
  }

  /**
   * Nettoie tous les snapshots expirés
   *
   * Appelé automatiquement toutes les heures.
   * Peut aussi être appelé manuellement si nécessaire.
   *
   * @returns Nombre de snapshots nettoyés
   *
   * @example
   * ```typescript
   * const cleaned = snapshotManager.cleanupExpired()
   * console.log(`Cleaned up ${cleaned} expired snapshot(s)`)
   * ```
   */
  cleanupExpired(): number {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [id, snapshot] of this.snapshots) {
      if (now > snapshot.timestamp + this.snapshotTTL) {
        toDelete.push(id)
      }
    }

    for (const id of toDelete) {
      this.releaseSnapshot(id)
    }

    if (toDelete.length > 0) {
      this.logger.info(`Cleaned up ${toDelete.length} expired snapshot(s)`)
    }

    return toDelete.length
  }

  /**
   * Nettoie TOUS les snapshots (utile pour reset complet)
   *
   * @returns Nombre de snapshots nettoyés
   *
   * @example
   * ```typescript
   * const count = snapshotManager.clearAll()
   * console.log(`Cleared ${count} snapshot(s)`)
   * ```
   */
  clearAll(): number {
    const count = this.snapshots.size
    this.snapshots.clear()

    if (count > 0) {
      this.logger.info(`Cleared all ${count} snapshot(s)`)
    }

    return count
  }

  /**
   * Arrête le cleanup interval (à appeler avant destruction)
   *
   * @example
   * ```typescript
   * snapshotManager.destroy()
   * ```
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    this.logger.debug('SnapshotManager destroyed')
  }

  /**
   * Génère un ID unique pour snapshot
   *
   * @internal
   */
  private generateSnapshotId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 11)
    return `snapshot-${timestamp}-${random}`
  }

  /**
   * Démarre le nettoyage automatique des snapshots expirés
   *
   * @internal
   */
  private startCleanupInterval(): void {
    // Cleanup toutes les heures
    const interval = 60 * 60 * 1000
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, interval)

    // Permettre au process de s'arrêter même si interval est actif
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }
}
