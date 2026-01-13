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
import type { ConfigWriter } from './config-writer.js'
import type { BackupManager } from './backup-manager.js'
import { PluginTracker } from './plugin-tracker.js'
import { installPackages } from '../utils/package-manager.js'
import { logger } from '../utils/logger.js'

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

  /**
   * @param ctx - Contexte du projet détecté
   * @param validator - Validateur de compatibilité
   * @param writer - Writer de configuration
   * @param backupManager - Gestionnaire de backups
   * @param fs - Système de fichiers optionnel (par défaut: filesystem réel via memfs.useAsNodeFs)
   */
  constructor(
    private readonly ctx: ProjectContext,
    private readonly validator: CompatibilityValidator,
    // @ts-expect-error - writer will be used in future versions for plugin configuration
    private readonly writer: ConfigWriter,
    private readonly backupManager: BackupManager,
    // fs parameter reserved for future memfs integration in Phase 3 Week 7
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _fs?: IFs
  ) {
    this.tracker = new PluginTracker(ctx.projectRoot, ctx.fsAdapter)
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
    logger.info(`Starting installation of ${plugins.length} plugin(s)`)

    try {
      // 0. Charger le tracker
      await this.tracker.load()

      // Filtrer les plugins déjà installés
      // Vérifier à la fois dans le tracker ET via la méthode detect() du plugin
      const notInstalledPromises = plugins.map(async (p) => {
        const isTracked = this.tracker.isInstalled(p.name)
        const isDetected = p.detect ? await p.detect(this.ctx) : false
        const isInstalled = isTracked || isDetected

        if (isInstalled) {
          logger.info(`${p.displayName} is already installed, skipping...`)
          // Si détecté mais pas tracké, l'ajouter au tracker
          if (isDetected && !isTracked) {
            logger.debug(
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
              logger.warn(
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
        logger.info('All plugins are already installed')
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

      // 1. Validation
      logger.debug('Validating plugins compatibility...')
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
        logger.warn(
          `Found ${validationResult.warnings.length} warning(s):`,
          validationResult.warnings.map((w) => w.message)
        )
      }

      // 2. Résolution des dépendances
      logger.debug('Resolving dependencies...')
      const resolved = this.resolveDependencies(notInstalled)
      const allPlugins = resolved.plugins

      if (resolved.autoInstalled.length > 0) {
        logger.info(
          `Auto-installing ${resolved.autoInstalled.length} required dependency(ies): ${resolved.autoInstalled.join(', ')}`
        )
      }

      // 3. Pre-install hooks
      logger.debug('Running pre-install hooks...')
      await this.runPreInstallHooks(allPlugins)

      // 4. Installation des packages (sauf si skipPackageInstall)
      if (options?.skipPackageInstall) {
        logger.info('Skipping package installation (--no-install mode)')
      } else {
        logger.debug('Installing packages...')
        const installResults = await this.installPackages(allPlugins)

        // Vérifier les échecs d'installation
        const failedInstalls = installResults.filter((r) => !r.success)
        if (failedInstalls.length > 0) {
          throw new Error(
            `Failed to install packages for ${failedInstalls.length} plugin(s)`
          )
        }
      }

      // 5. Configuration (séquentielle pour respecter l'ordre)
      logger.debug('Configuring plugins...')
      const configResults: ConfigResult[] = []
      const filesCreated: FileOperation[] = []

      for (const plugin of allPlugins) {
        try {
          logger.debug(`Configuring ${plugin.displayName}...`)
          const configResult = await plugin.configure(this.ctx)
          configResults.push(configResult)
          filesCreated.push(...(configResult.files || []))

          if (!configResult.success) {
            throw new Error(
              `Configuration failed for ${plugin.displayName}: ${configResult.message || 'Unknown error'}`
            )
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          logger.error(
            `Configuration failed for ${plugin.displayName}: ${errorMessage}`
          )
          throw error
        }
      }

      // 6. Post-install hooks
      logger.debug('Running post-install hooks...')
      await this.runPostInstallHooks(allPlugins)

      // 7. Marquer les plugins comme installés
      logger.debug('Tracking installed plugins...')
      for (const plugin of allPlugins) {
        await this.tracker.addPlugin({
          name: plugin.name,
          displayName: plugin.displayName,
          category: plugin.category,
          version: plugin.version,
          packages: {
            dependencies: [],
            devDependencies: [],
          },
        })
      }

      // 8. Rapport final
      const duration = Date.now() - startTime
      const installed = allPlugins.map((p) => p.name)

      logger.info(
        `Successfully installed ${installed.length} plugin(s) in ${duration}ms`
      )

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
      logger.error(`Installation failed: ${errorMessage}`)

      // Rollback
      logger.debug('Rolling back changes...')
      try {
        await this.rollback(plugins)
      } catch (rollbackError) {
        const rollbackMessage =
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)
        logger.error(`Rollback failed: ${rollbackMessage}`)
      }

      const duration = Date.now() - startTime

      return {
        success: false,
        duration,
        installed: [],
        warnings: [],
        filesCreated: [],
      }
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
            // Pour l'instant, on log juste un warning
            logger.warn(
              `Plugin ${plugin.name} requires ${required}, but it's not available in the registry`
            )
            // En production, on chargerait le plugin depuis le registry
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
          logger.debug(`${plugin.displayName} is already installed`)
          results.push({
            packages: {},
            success: true,
            message: 'Already installed',
          })
          continue
        }

        // Pre-install hook
        if (plugin.preInstall) {
          await plugin.preInstall(this.ctx)
        }

        // Installation
        const result = await plugin.install(this.ctx)

        // Post-install hook
        if (plugin.postInstall) {
          await plugin.postInstall(this.ctx)
        }

        results.push(result)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        logger.error(`Failed to install ${plugin.displayName}: ${errorMessage}`)
        results.push({
          packages: {},
          success: false,
          message: errorMessage,
        })
      }
    }

    // Installer les packages via package manager
    const allDependencies: string[] = []
    const allDevDependencies: string[] = []

    for (const result of results) {
      if (result.success && result.packages) {
        if (result.packages.dependencies) {
          allDependencies.push(...result.packages.dependencies)
        }
        if (result.packages.devDependencies) {
          allDevDependencies.push(...result.packages.devDependencies)
        }
      }
    }

    // Installer les dépendances et dev-dépendances en un seul appel
    // pour éviter les conflits d'écriture du package.json
    const allPackagesToInstall = [...allDependencies, ...allDevDependencies]

    if (allPackagesToInstall.length > 0) {
      // Séparer les installations dev et non-dev
      const depsToInstall = allDependencies
      const devDepsToInstall = allDevDependencies

      // Installer d'abord les dépendances (non-dev)
      if (depsToInstall.length > 0) {
        await installPackages(depsToInstall, {
          packageManager: this.ctx.packageManager,
          projectRoot: this.ctx.projectRoot,
          dev: false,
          silent: false,
        })
      }

      // Puis les dev-dépendances
      if (devDepsToInstall.length > 0) {
        await installPackages(devDepsToInstall, {
          packageManager: this.ctx.packageManager,
          projectRoot: this.ctx.projectRoot,
          dev: true,
          silent: false,
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
          logger.warn(
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
          logger.warn(
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
    logger.debug('Starting rollback...')

    // Rollback des plugins (dans l'ordre inverse)
    for (const plugin of plugins.reverse()) {
      if (plugin.rollback) {
        try {
          await plugin.rollback(this.ctx)
          logger.debug(`Rolled back ${plugin.displayName}`)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          logger.error(
            `Rollback failed for ${plugin.displayName}: ${errorMessage}`
          )
        }
      }
    }

    // Restaurer tous les backups
    try {
      await this.backupManager.restoreAll()
      logger.debug('Restored all file backups')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(`Failed to restore backups: ${errorMessage}`)
    }
  }
}
