import type {
  Plugin,
  ProjectContext,
  InstallResult,
  ConfigResult,
  InstallationReport,
  FileOperation,
} from '../types/index.js'
import type { IFs } from 'memfs'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CompatibilityValidator } from './validator.js'
import type { BackupManager } from './backup-manager.js'
import { PluginTracker } from './plugin-tracker.js'
import { SnapshotManager } from './snapshot-manager.js'
import { TransactionLog, TransactionActionType } from './transaction-log.js'
import { getModuleLogger } from '../utils/logger-provider.js'

/**
 * Résultat de la résolution des dépendances
 */
interface ResolvedPlugins {
  plugins: Plugin[]
  autoInstalled: string[]
}

/**
 * Orchestrateur d'installation de plugins
 *
 * Cette classe coordonne l'installation complète de plugins :
 * 1. Validation de compatibilité
 * 2. Résolution des dépendances
 * 3. Installation des packages
 * 4. Configuration des plugins
 * 5. Rollback en cas d'erreur
 *
 * @example
 * ```typescript
 * const installer = new Installer(
 *   context,
 *   validator,
 *   configWriter,
 *   backupManager
 * )
 *
 * const report = await installer.install([reactRouterPlugin, zustandPlugin])
 * if (report.success) {
 *   console.log('Installation successful!')
 * }
 * ```
 */
export class Installer {
  private tracker: PluginTracker
  private snapshotManager: SnapshotManager
  private transactionLog: TransactionLog
  private logger = getModuleLogger()

  /**
   * @param ctx - Contexte du projet détecté
   * @param validator - Validateur de compatibilité
   * @param backupManager - Gestionnaire de backups
   * @param fs - Système de fichiers optionnel (par défaut: filesystem réel via memfs.useAsNodeFs)
   */
  constructor(
    private readonly ctx: ProjectContext,
    private readonly validator: CompatibilityValidator,
    private readonly backupManager: BackupManager,
    // fs parameter reserved for future memfs integration in Phase 3 Week 7
    _fs?: IFs
  ) {
    this.tracker = new PluginTracker(ctx.projectRoot, ctx.fsAdapter)
    this.snapshotManager = new SnapshotManager(ctx.projectRoot, ctx.fsAdapter)
    this.transactionLog = new TransactionLog(ctx.projectRoot)
    // Note: fsAdapter est déjà passé à ConfigWriter et BackupManager lors de leur création
    // dans base-framework-command.ts. Ici, on garde fs pour référence future si nécessaire.
  }

  /**
   * Installe un ensemble de plugins
   *
   * @param plugins - Liste des plugins à installer
   * @param options - Options d'installation (skipPackageInstall pour --no-install)
   * @returns Rapport d'installation avec détails
   * @throws {Error} Si l'installation échoue (après rollback)
   *
   * @example
   * ```typescript
   * const report = await installer.install([plugin1, plugin2])
   * console.log(`Installed ${report.installed.length} plugin(s)`)
   * ```
   */
  async install(
    plugins: Plugin[],
    options?: { skipPackageInstall?: boolean }
  ): Promise<InstallationReport> {
    const startTime = Date.now()
    this.logger.info(`Starting installation of ${plugins.length} plugin(s)`)

    // PHASE 0: Initialize atomic transaction
    const txId = this.transactionLog.startTransaction(
      plugins.map((p) => p.name)
    )
    let snapshotId: string | undefined

    try {
      // PHASE 1: VALIDATION (NO MODIFICATIONS)
      this.logger.debug('PHASE 1: Validation (no modifications)')
      this.transactionLog.log(
        TransactionActionType.VALIDATION_START,
        'Starting validation phase'
      )

      // 0. Charger le tracker
      await this.tracker.load()

      // Filtrer les plugins déjà installés
      // Vérifier à la fois dans le tracker ET via la méthode detect() du plugin
      const notInstalledPromises = plugins.map(async (p) => {
        const isTracked = this.tracker.isInstalled(p.name)
        const isDetected = p.detect ? await p.detect(this.ctx) : false
        const isInstalled = isTracked || isDetected

        if (isInstalled) {
          this.logger.info(`${p.displayName} is already installed, skipping...`)
          // Si détecté mais pas tracké, l'ajouter au tracker
          if (isDetected && !isTracked) {
            this.logger.debug(
              `${p.displayName} detected but not tracked, adding to tracker...`
            )
            try {
              await this.tracker.addPlugin({
                name: p.name,
                displayName: p.displayName,
                category: p.category,
                version: p.version,
                packages: {
                  dependencies: [],
                  devDependencies: [],
                },
              })
            } catch (error) {
              this.logger.warn(
                `Failed to add ${p.displayName} to tracker: ${error instanceof Error ? error.message : String(error)}`
              )
            }
          }
          return null
        }
        return p
      })

      const notInstalledResults = await Promise.all(notInstalledPromises)
      const notInstalled = notInstalledResults.filter(
        (p): p is Plugin => p !== null
      )

      if (notInstalled.length === 0) {
        this.logger.info('All plugins are already installed')
        this.transactionLog.endTransaction(true)
        return {
          success: true,
          duration: Date.now() - startTime,
          installed: [],
          warnings: [],
          filesCreated: [],
        }
      }

      // Vérifier les conflits avec les plugins déjà installés
      for (const plugin of notInstalled) {
        const conflicts = this.tracker.checkCategoryConflicts(plugin.category)
        if (conflicts.length > 0) {
          const conflictNames = conflicts.map((c) => c.displayName).join(', ')
          throw new Error(
            `Cannot install ${plugin.displayName}: conflicts with already installed plugin(s) in category ${plugin.category}: ${conflictNames}. Please remove conflicting plugins first.`
          )
        }
      }

      // 1. Validation de compatibilité
      this.logger.debug('Validating plugins compatibility...')
      const validationResult = this.validator.validate(notInstalled, this.ctx)

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors
          .map((e) => e.message)
          .join('; ')
        throw new Error(
          `Validation failed: ${errorMessages}. Please fix compatibility issues before installing.`
        )
      }

      if (validationResult.warnings.length > 0) {
        this.logger.warn(
          `Found ${validationResult.warnings.length} warning(s):`,
          validationResult.warnings.map((w) => w.message)
        )
        for (const warning of validationResult.warnings) {
          this.transactionLog.logWarning(warning.message)
        }
      }

      this.transactionLog.log(
        TransactionActionType.VALIDATION_COMPLETE,
        `Validation passed for ${notInstalled.length} plugin(s)`
      )

      // 2. Résolution des dépendances
      this.logger.debug('Resolving dependencies...')
      this.transactionLog.log(
        TransactionActionType.DEPENDENCY_RESOLUTION,
        'Resolving plugin dependencies'
      )
      const resolved = this.resolveDependencies(notInstalled)
      const allPlugins = resolved.plugins

      if (resolved.autoInstalled.length > 0) {
        this.logger.info(
          `Auto-installing ${resolved.autoInstalled.length} required dependency(ies): ${resolved.autoInstalled.join(', ')}`
        )
      }

      // PHASE 2: BACKUP & SNAPSHOT (before any modifications)
      this.logger.debug('PHASE 2: Creating backup and snapshot')
      snapshotId = await this.snapshotManager.createSnapshot(
        `Before installing ${allPlugins.map((p) => p.displayName).join(', ')}`
      )
      this.transactionLog.log(
        TransactionActionType.SNAPSHOT_CREATED,
        `Snapshot created for rollback protection`,
        { snapshotId }
      )

      // 3. Pre-install hooks
      this.logger.debug('Running pre-install hooks...')
      this.transactionLog.log(
        TransactionActionType.PRE_INSTALL_HOOK,
        'Running pre-install hooks'
      )
      await this.runPreInstallHooks(allPlugins)

      // PHASE 3: INSTALLATION (with per-plugin rollback capability)
      this.logger.debug('PHASE 3: Installation')

      // 4. Installation des packages (sauf si skipPackageInstall)
      let installResults: InstallResult[] = []
      if (options?.skipPackageInstall) {
        this.logger.info('Skipping package installation (--no-install mode)')
      } else {
        this.logger.debug('Installing packages...')
        this.transactionLog.log(
          TransactionActionType.PACKAGE_INSTALL_START,
          'Starting package installation'
        )
        installResults = await this.installPackages(allPlugins)

        // Vérifier les échecs d'installation
        const failedInstalls = installResults.filter((r) => !r.success)
        if (failedInstalls.length > 0) {
          throw new Error(
            `Failed to install packages for ${failedInstalls.length} plugin(s)`
          )
        }

        this.transactionLog.log(
          TransactionActionType.PACKAGE_INSTALL_COMPLETE,
          `Successfully installed packages for ${allPlugins.length} plugin(s)`
        )
      }

      // 5. Configuration (séquentielle pour respecter l'ordre)
      this.logger.debug('Configuring plugins...')
      const configResults: ConfigResult[] = []
      const filesCreated: FileOperation[] = []

      for (const plugin of allPlugins) {
        try {
          this.logger.debug(`Configuring ${plugin.displayName}...`)
          this.transactionLog.log(
            TransactionActionType.PLUGIN_CONFIGURE_START,
            `Starting configuration for ${plugin.displayName}`,
            { plugin: plugin.name }
          )

          const configResult = await plugin.configure(this.ctx)
          configResults.push(configResult)
          filesCreated.push(...(configResult.files || []))

          if (!configResult.success) {
            throw new Error(
              `Configuration failed for ${plugin.displayName}: ${configResult.message || 'Unknown error'}`
            )
          }

          this.transactionLog.log(
            TransactionActionType.PLUGIN_CONFIGURE_COMPLETE,
            `Configuration complete for ${plugin.displayName}`,
            {
              plugin: plugin.name,
              filesCreated: configResult.files?.length ?? 0,
            }
          )
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          this.logger.error(
            `Configuration failed for ${plugin.displayName}: ${errorMessage}`
          )
          this.transactionLog.logError(
            `Configuration failed for ${plugin.displayName}`,
            error instanceof Error ? error : new Error(errorMessage),
            { plugin: plugin.name }
          )
          throw error
        }
      }

      // 6. Post-install hooks
      this.logger.debug('Running post-install hooks...')
      this.transactionLog.log(
        TransactionActionType.POST_INSTALL_HOOK,
        'Running post-install hooks'
      )
      await this.runPostInstallHooks(allPlugins)

      // PHASE 4: CLEANUP (on success)
      this.logger.debug('PHASE 4: Cleanup on success')
      this.transactionLog.log(
        TransactionActionType.CLEANUP_START,
        'Starting cleanup'
      )

      // 7. Marquer les plugins comme installés
      this.logger.debug('Tracking installed plugins...')
      const installResultsByName = new Map<string, InstallResult>()
      for (let i = 0; i < allPlugins.length; i++) {
        const plugin = allPlugins[i]
        const result = installResults[i]
        if (plugin && result) {
          installResultsByName.set(plugin.name, result)
        }
      }

      for (const plugin of allPlugins) {
        const installResult = installResultsByName.get(plugin.name)
        await this.tracker.addPlugin({
          name: plugin.name,
          displayName: plugin.displayName,
          category: plugin.category,
          version: plugin.version,
          packages: {
            dependencies: installResult?.packages.dependencies ?? [],
            devDependencies: installResult?.packages.devDependencies ?? [],
          },
        })
      }

      // Release snapshot on success (no longer needed for rollback)
      if (snapshotId) {
        this.snapshotManager.releaseSnapshot(snapshotId)
      }

      this.transactionLog.log(
        TransactionActionType.CLEANUP_COMPLETE,
        'Cleanup complete'
      )

      // 8. Rapport final
      const duration = Date.now() - startTime
      const installed = allPlugins.map((p) => p.name)

      this.logger.info(
        `Successfully installed ${installed.length} plugin(s) in ${duration}ms`
      )

      this.transactionLog.endTransaction(true, snapshotId)

      return {
        success: true,
        duration,
        installed,
        warnings: validationResult.warnings,
        filesCreated,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Installation failed: ${errorMessage}`)
      this.transactionLog.logError(
        'Installation failed',
        error instanceof Error ? error : new Error(errorMessage)
      )

      // ROLLBACK PHASE
      this.logger.debug('ROLLBACK: Starting rollback procedure')
      this.transactionLog.log(
        TransactionActionType.ROLLBACK_START,
        'Starting rollback'
      )

      try {
        // 1. Restore snapshot first (most important)
        if (snapshotId && this.snapshotManager.hasSnapshot(snapshotId)) {
          this.logger.debug(
            `Restoring snapshot ${snapshotId} to previous state`
          )
          await this.snapshotManager.restoreSnapshot(snapshotId)
          this.logger.info('Snapshot restored successfully')
        }

        // 2. Call plugin-specific rollback hooks
        await this.rollback(plugins)

        // 3. Keep snapshot available for debugging (don't release)
        this.transactionLog.log(
          TransactionActionType.ROLLBACK_COMPLETE,
          'Rollback complete - snapshot retained for debugging'
        )
      } catch (rollbackError) {
        const rollbackMessage =
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)
        this.logger.error(`Rollback failed: ${rollbackMessage}`)
        this.transactionLog.logError(
          'Rollback procedure failed',
          rollbackError instanceof Error
            ? rollbackError
            : new Error(rollbackMessage)
        )
      }

      const duration = Date.now() - startTime

      this.transactionLog.endTransaction(false, snapshotId)

      // Log transaction report for debugging
      const txReport = this.transactionLog.formatReport(txId)
      this.logger.debug(`Transaction report:\n${txReport}`)

      return {
        success: false,
        duration,
        installed: [],
        warnings: [],
        filesCreated: [],
      }
    } finally {
      // Cleanup resources
      this.snapshotManager.destroy()
    }
  }

  /**
   * Résout les dépendances requises et recommandées
   *
   * @param plugins - Liste des plugins initiaux
   * @returns Plugins avec dépendances résolues
   *
   * @internal
   */
  private resolveDependencies(plugins: Plugin[]): ResolvedPlugins {
    const pluginMap = new Map<string, Plugin>()
    const autoInstalled: string[] = []

    // Ajouter les plugins initiaux
    for (const plugin of plugins) {
      pluginMap.set(plugin.name, plugin)
    }

    // Résoudre les dépendances requises
    let changed = true
    while (changed) {
      changed = false

      for (const plugin of Array.from(pluginMap.values())) {
        if (!plugin.requires) {
          continue
        }

        for (const required of plugin.requires) {
          if (!pluginMap.has(required)) {
            // TODO: Charger le plugin depuis le registry
            // For now, just log a warning
            this.logger.warn(
              `Plugin ${plugin.name} requires ${required}, but it's not available in the registry`
            )
            // Future enhancement (Phase 3 Week 8): Auto-load missing dependencies from registry
            // This would require integration with the central plugin registry service.
            // Tracked in GitHub Issues: https://github.com/issue/auto-plugin-loading
            // const requiredPlugin = getPluginById(required)
            // if (requiredPlugin) {
            //   pluginMap.set(required, requiredPlugin)
            //   autoInstalled.push(required)
            //   changed = true
            // }
          }
        }
      }
    }

    return {
      plugins: Array.from(pluginMap.values()),
      autoInstalled,
    }
  }

  /**
   * Installe les packages pour tous les plugins
   *
   * @param plugins - Liste des plugins
   * @returns Résultats d'installation pour chaque plugin
   *
   * @internal
   */
  private async installPackages(plugins: Plugin[]): Promise<InstallResult[]> {
    const results: InstallResult[] = []

    // Installer SÉQUENTIELLEMENT pour éviter la corruption du package.json
    // Chaque plugin appelle npm install, donc on doit les faire un par un
    for (const plugin of plugins) {
      try {
        // Vérifier si déjà installé
        if (plugin.detect && (await plugin.detect(this.ctx))) {
          this.logger.debug(`${plugin.displayName} is already installed`)
          results.push({
            packages: {},
            success: true,
            message: 'Already installed',
          })
          continue
        }

        // Installation
        const result = await plugin.install(this.ctx)

        results.push(result)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        this.logger.error(
          `Failed to install ${plugin.displayName}: ${errorMessage}`
        )
        results.push({
          packages: {},
          success: false,
          message: errorMessage,
        })
      }
    }

    return results
  }

  /**
   * Exécute les hooks pre-install de tous les plugins
   *
   * @param plugins - Liste des plugins
   *
   * @internal
   */
  private async runPreInstallHooks(plugins: Plugin[]): Promise<void> {
    for (const plugin of plugins) {
      if (plugin.preInstall) {
        try {
          await plugin.preInstall(this.ctx)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          this.logger.warn(
            `Pre-install hook failed for ${plugin.displayName}: ${errorMessage}`
          )
        }
      }
    }
  }

  /**
   * Exécute les hooks post-install de tous les plugins
   *
   * @param plugins - Liste des plugins
   *
   * @internal
   */
  private async runPostInstallHooks(plugins: Plugin[]): Promise<void> {
    for (const plugin of plugins) {
      if (plugin.postInstall) {
        try {
          await plugin.postInstall(this.ctx)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          this.logger.warn(
            `Post-install hook failed for ${plugin.displayName}: ${errorMessage}`
          )
        }
      }
    }
  }

  /**
   * Effectue un rollback complet en cas d'erreur
   *
   * @param plugins - Liste des plugins installés
   *
   * @internal
   */
  private async rollback(plugins: Plugin[]): Promise<void> {
    this.logger.debug('Starting rollback...')

    // Rollback des plugins (dans l'ordre inverse)
    for (const plugin of plugins.reverse()) {
      if (plugin.rollback) {
        try {
          await plugin.rollback(this.ctx)
          this.logger.debug(`Rolled back ${plugin.displayName}`)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          this.logger.error(
            `Rollback failed for ${plugin.displayName}: ${errorMessage}`
          )
        }
      }
    }

    // Restaurer tous les backups
    try {
      await this.backupManager.restoreAll()
      this.logger.debug('Restored all file backups')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to restore backups: ${errorMessage}`)
    }
  }
}
