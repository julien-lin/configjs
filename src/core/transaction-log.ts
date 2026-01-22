import { getModuleLogger } from '../utils/logger-provider.js'

/**
 * Types d'actions possibles dans une transaction
 */
export enum TransactionActionType {
  VALIDATION_START = 'VALIDATION_START',
  VALIDATION_COMPLETE = 'VALIDATION_COMPLETE',
  DEPENDENCY_RESOLUTION = 'DEPENDENCY_RESOLUTION',
  SNAPSHOT_CREATED = 'SNAPSHOT_CREATED',
  PRE_INSTALL_HOOK = 'PRE_INSTALL_HOOK',
  PACKAGE_INSTALL_START = 'PACKAGE_INSTALL_START',
  PACKAGE_INSTALL_COMPLETE = 'PACKAGE_INSTALL_COMPLETE',
  PLUGIN_CONFIGURE_START = 'PLUGIN_CONFIGURE_START',
  PLUGIN_CONFIGURE_COMPLETE = 'PLUGIN_CONFIGURE_COMPLETE',
  POST_INSTALL_HOOK = 'POST_INSTALL_HOOK',
  CLEANUP_START = 'CLEANUP_START',
  CLEANUP_COMPLETE = 'CLEANUP_COMPLETE',
  ROLLBACK_START = 'ROLLBACK_START',
  ROLLBACK_COMPLETE = 'ROLLBACK_COMPLETE',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

/**
 * Entry dans le journal de transaction
 */
export interface TransactionLogEntry {
  id: string
  timestamp: number
  action: TransactionActionType
  message: string
  data?: Record<string, unknown>
  error?: {
    message: string
    stack?: string
    code?: string
  }
  duration?: number
}

/**
 * Métadonnées d'une transaction
 */
export interface TransactionMetadata {
  id: string
  startTime: number
  endTime?: number
  projectRoot: string
  plugins: string[]
  success?: boolean
  snapshotId?: string
}

/**
 * Journal des transactions pour ACID-like logging
 *
 * Fournit un log détaillé de chaque action pendant l'installation,
 * permettant le debugging, le replay, et la validation d'intégrité.
 *
 * Chaque entry contient:
 * - Timestamp précis (milliseconds)
 * - Type d'action (enum)
 * - Message descriptif
 * - Données optionnelles (plugins, packages, etc)
 * - Erreurs avec stack traces si applicable
 * - Durée de l'action
 *
 * @example
 * ```typescript
 * const txLog = new TransactionLog(projectRoot)
 *
 * const txId = txLog.startTransaction(['react', 'zustand'])
 *
 * txLog.log(TransactionActionType.VALIDATION_START, 'Starting validation')
 * // ... perform validation ...
 * txLog.log(TransactionActionType.VALIDATION_COMPLETE, 'Validation passed')
 *
 * txLog.endTransaction(txId, true)
 *
 * const report = txLog.getReport(txId)
 * console.log('Transaction took', report.duration, 'ms')
 * ```
 */
export class TransactionLog {
  private logger = getModuleLogger()

  /**
   * Map des transactions actives: txId -> metadata + entries
   */
  private readonly transactions: Map<
    string,
    {
      metadata: TransactionMetadata
      entries: TransactionLogEntry[]
    }
  > = new Map()

  /**
   * Transaction courante (pour logging convenience)
   */
  private currentTxId?: string

  /**
   * Counter pour IDs d'entries
   */
  private entryIdCounter: number = 0

  /**
   * @param projectRoot - Racine du projet
   */
  constructor(private readonly projectRoot: string) {}

  /**
   * Démarre une nouvelle transaction
   *
   * @param plugins - Noms des plugins à installer
   * @returns ID de la transaction
   *
   * @example
   * ```typescript
   * const txId = txLog.startTransaction(['react', 'redux'])
   * ```
   */
  startTransaction(plugins: string[]): string {
    const txId = this.generateTransactionId()
    const now = Date.now()

    const metadata: TransactionMetadata = {
      id: txId,
      startTime: now,
      projectRoot: this.projectRoot,
      plugins,
    }

    this.transactions.set(txId, {
      metadata,
      entries: [],
    })

    this.currentTxId = txId

    this.logger.debug(`Started transaction ${txId}`)

    return txId
  }

  /**
   * Enregistre une action dans la transaction courante
   *
   * @param action - Type d'action
   * @param message - Message descriptif
   * @param data - Données optionnelles
   * @throws {Error} Si aucune transaction active
   *
   * @example
   * ```typescript
   * txLog.log(
   *   TransactionActionType.PACKAGE_INSTALL_START,
   *   'Installing react',
   *   { package: 'react', version: '18.0.0' }
   * )
   * ```
   */
  log(
    action: TransactionActionType,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.currentTxId) {
      throw new Error('No active transaction')
    }

    const tx = this.transactions.get(this.currentTxId)
    if (!tx) {
      throw new Error(`Transaction ${this.currentTxId} not found`)
    }

    const entry: TransactionLogEntry = {
      id: this.generateEntryId(),
      timestamp: Date.now(),
      action,
      message,
      data,
    }

    tx.entries.push(entry)
  }

  /**
   * Enregistre une erreur dans la transaction courante
   *
   * @param message - Message d'erreur
   * @param error - L'erreur originale
   * @param data - Données optionnelles
   * @throws {Error} Si aucune transaction active
   *
   * @example
   * ```typescript
   * try {
   *   // ... perform action ...
   * } catch (error) {
   *   txLog.logError('Package install failed', error)
   * }
   * ```
   */
  logError(
    message: string,
    error: Error,
    data?: Record<string, unknown>
  ): void {
    if (!this.currentTxId) {
      throw new Error('No active transaction')
    }

    const tx = this.transactions.get(this.currentTxId)
    if (!tx) {
      throw new Error(`Transaction ${this.currentTxId} not found`)
    }

    const entry: TransactionLogEntry = {
      id: this.generateEntryId(),
      timestamp: Date.now(),
      action: TransactionActionType.ERROR,
      message,
      data,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as NodeJS.ErrnoException).code,
      },
    }

    tx.entries.push(entry)
  }

  /**
   * Enregistre un warning dans la transaction courante
   *
   * @param message - Message de warning
   * @param data - Données optionnelles
   * @throws {Error} Si aucune transaction active
   *
   * @example
   * ```typescript
   * txLog.logWarning('Plugin deprecation notice', {
   *   plugin: 'old-plugin',
   *   replacement: 'new-plugin'
   * })
   * ```
   */
  logWarning(message: string, data?: Record<string, unknown>): void {
    if (!this.currentTxId) {
      throw new Error('No active transaction')
    }

    const tx = this.transactions.get(this.currentTxId)
    if (!tx) {
      throw new Error(`Transaction ${this.currentTxId} not found`)
    }

    const entry: TransactionLogEntry = {
      id: this.generateEntryId(),
      timestamp: Date.now(),
      action: TransactionActionType.WARNING,
      message,
      data,
    }

    tx.entries.push(entry)
  }

  /**
   * Enregistre une action avec timing (pour debugging performance)
   *
   * Utile pour mesurer la durée d'opérations comme install, validate, config.
   *
   * @param action - Type d'action
   * @param message - Message descriptif
   * @param durationMs - Durée en millisecondes
   * @param data - Données optionnelles
   * @throws {Error} Si aucune transaction active
   *
   * @example
   * ```typescript
   * const start = Date.now()
   * // ... perform action ...
   * txLog.logTimed(
   *   TransactionActionType.PACKAGE_INSTALL_COMPLETE,
   *   'React installed',
   *   Date.now() - start,
   *   { packages: 1 }
   * )
   * ```
   */
  logTimed(
    action: TransactionActionType,
    message: string,
    durationMs: number,
    data?: Record<string, unknown>
  ): void {
    if (!this.currentTxId) {
      throw new Error('No active transaction')
    }

    const tx = this.transactions.get(this.currentTxId)
    if (!tx) {
      throw new Error(`Transaction ${this.currentTxId} not found`)
    }

    const entry: TransactionLogEntry = {
      id: this.generateEntryId(),
      timestamp: Date.now(),
      action,
      message,
      data,
      duration: durationMs,
    }

    tx.entries.push(entry)
  }

  /**
   * Termine la transaction courante
   *
   * @param success - Succès de la transaction
   * @param snapshotId - ID du snapshot associé (optionnel)
   * @throws {Error} Si aucune transaction active
   *
   * @example
   * ```typescript
   * txLog.endTransaction(true, snapshotId)
   * ```
   */
  endTransaction(success: boolean, snapshotId?: string): void {
    if (!this.currentTxId) {
      throw new Error('No active transaction')
    }

    const tx = this.transactions.get(this.currentTxId)
    if (!tx) {
      throw new Error(`Transaction ${this.currentTxId} not found`)
    }

    tx.metadata.endTime = Date.now()
    tx.metadata.success = success
    tx.metadata.snapshotId = snapshotId

    const duration = (tx.metadata.endTime - tx.metadata.startTime) / 1000
    this.logger.info(
      `Transaction ${this.currentTxId} ${success ? 'succeeded' : 'failed'} in ${duration.toFixed(2)}s`
    )

    this.currentTxId = undefined
  }

  /**
   * Récupère le rapport complet d'une transaction
   *
   * @param txId - ID de la transaction
   * @returns Rapport avec métadonnées et entries, ou undefined
   *
   * @example
   * ```typescript
   * const report = txLog.getReport(txId)
   * console.log(`Transaction took ${report?.duration}ms`)
   * console.log(`Total errors: ${report?.errorCount}`)
   * ```
   */
  getReport(txId: string):
    | {
        metadata: TransactionMetadata
        entries: TransactionLogEntry[]
        duration: number
        errorCount: number
        warningCount: number
      }
    | undefined {
    const tx = this.transactions.get(txId)
    if (!tx) {
      return undefined
    }

    const duration = (tx.metadata.endTime ?? Date.now()) - tx.metadata.startTime

    const errorCount = tx.entries.filter(
      (e) => e.action === TransactionActionType.ERROR
    ).length

    const warningCount = tx.entries.filter(
      (e) => e.action === TransactionActionType.WARNING
    ).length

    return {
      metadata: tx.metadata,
      entries: tx.entries,
      duration,
      errorCount,
      warningCount,
    }
  }

  /**
   * Récupère les entries d'une transaction
   *
   * @param txId - ID de la transaction
   * @returns Array d'entries, ou undefined si transaction pas trouvée
   *
   * @example
   * ```typescript
   * const entries = txLog.getEntries(txId)
   * entries?.forEach(e => console.log(`[${e.action}] ${e.message}`))
   * ```
   */
  getEntries(txId: string): TransactionLogEntry[] | undefined {
    const tx = this.transactions.get(txId)
    return tx?.entries
  }

  /**
   * Formate le rapport pour affichage/debugging
   *
   * @param txId - ID de la transaction
   * @returns String formaté du rapport
   *
   * @example
   * ```typescript
   * console.log(txLog.formatReport(txId))
   * ```
   */
  formatReport(txId: string): string {
    const report = this.getReport(txId)
    if (!report) {
      return `Transaction ${txId} not found`
    }

    const lines: string[] = []

    lines.push(`=== Transaction Report: ${txId} ===`)
    lines.push(`Status: ${report.metadata.success ? 'SUCCESS' : 'FAILED'}`)
    lines.push(`Duration: ${(report.duration / 1000).toFixed(2)}s`)
    lines.push(`Plugins: ${report.metadata.plugins.join(', ')}`)
    lines.push(`Errors: ${report.errorCount}, Warnings: ${report.warningCount}`)
    lines.push('')

    lines.push('Timeline:')
    for (const entry of report.entries) {
      const time = new Date(entry.timestamp).toLocaleTimeString()
      const duration = entry.duration ? ` (${entry.duration}ms)` : ''
      lines.push(`  [${time}] ${entry.action}${duration}: ${entry.message}`)

      if (entry.error) {
        lines.push(`    Error: ${entry.error.message}`)
        if (entry.error.code) {
          lines.push(`    Code: ${entry.error.code}`)
        }
      }

      if (entry.data) {
        lines.push(`    Data: ${JSON.stringify(entry.data)}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Supprime une transaction du log
   *
   * @param txId - ID de la transaction
   * @returns true si la transaction a été supprimée, false sinon
   *
   * @example
   * ```typescript
   * txLog.removeTransaction(txId)
   * ```
   */
  removeTransaction(txId: string): boolean {
    if (this.currentTxId === txId) {
      this.currentTxId = undefined
    }
    return this.transactions.delete(txId)
  }

  /**
   * Nettoie tous les logs des transactions
   *
   * @example
   * ```typescript
   * txLog.clear()
   * ```
   */
  clear(): void {
    this.transactions.clear()
    this.currentTxId = undefined
  }

  /**
   * Génère un ID unique pour transaction
   *
   * @internal
   */
  private generateTransactionId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 11)
    return `tx-${timestamp}-${random}`
  }

  /**
   * Génère un ID unique pour entry
   *
   * @internal
   */
  private generateEntryId(): string {
    return `entry-${++this.entryIdCounter}`
  }
}
