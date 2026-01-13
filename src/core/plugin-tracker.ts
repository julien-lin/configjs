import { join } from 'path'
import {
  writeFileContent,
  readFileContent,
  checkPathExists,
} from '../utils/fs-helpers.js'
import { logger } from '../utils/logger.js'
import type { IFsAdapter } from './fs-adapter.js'

/**
 * Configuration persistante des plugins installés
 */
export interface PluginConfig {
  version: string
  installedPlugins: InstalledPlugin[]
  lastUpdated: string
}

/**
 * Information d'un plugin installé
 */
export interface InstalledPlugin {
  name: string
  displayName: string
  category: string
  version?: string
  installedAt: string
  packages: {
    dependencies?: string[]
    devDependencies?: string[]
  }
}

/**
 * Nom du fichier de configuration
 */
const CONFIG_FILE_NAME = '.configjsrc'

/**
 * Version actuelle du format de configuration
 */
const CONFIG_VERSION = '1.0.0'

/**
 * Gestionnaire de tracking des plugins installés
 *
 * Permet de :
 * - Suivre les plugins installés
 * - Éviter les réinstallations
 * - Détecter les conflits
 * - Gérer l'historique des installations
 */
export class PluginTracker {
  private configPath: string
  private config: PluginConfig | null = null
  private readonly fsAdapter?: IFsAdapter

  constructor(projectRoot: string, fsAdapter?: IFsAdapter) {
    this.configPath = join(projectRoot, CONFIG_FILE_NAME)
    this.fsAdapter = fsAdapter
  }

  /**
   * Charge la configuration depuis le fichier
   */
  async load(): Promise<void> {
    try {
      const exists = await checkPathExists(this.configPath, this.fsAdapter)

      if (!exists) {
        // Initialiser une nouvelle configuration
        this.config = {
          version: CONFIG_VERSION,
          installedPlugins: [],
          lastUpdated: new Date().toISOString(),
        }
        return
      }

      const content = await readFileContent(this.configPath, 'utf-8', this.fsAdapter)
      this.config = JSON.parse(content) as PluginConfig

      // Vérifier la version du format
      if (!this.config.version) {
        logger.warn('Old config format detected, migrating...')
        this.config.version = CONFIG_VERSION
        await this.save()
      }
    } catch (error) {
      logger.error('Failed to load plugin configuration', error)
      // En cas d'erreur, initialiser une nouvelle config
      this.config = {
        version: CONFIG_VERSION,
        installedPlugins: [],
        lastUpdated: new Date().toISOString(),
      }
    }
  }

  /**
   * Sauvegarde la configuration dans le fichier
   */
  async save(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }

    this.config.lastUpdated = new Date().toISOString()

    try {
      const content = JSON.stringify(this.config, null, 2)
      await writeFileContent(this.configPath, content, 'utf-8', this.fsAdapter)
    } catch (error) {
      logger.error('Failed to save plugin configuration', error)
      throw error
    }
  }

  /**
   * Vérifie si un plugin est déjà installé
   */
  isInstalled(pluginName: string): boolean {
    if (!this.config) {
      return false
    }

    return this.config.installedPlugins.some((p) => p.name === pluginName)
  }

  /**
   * Récupère les informations d'un plugin installé
   */
  getPlugin(pluginName: string): InstalledPlugin | undefined {
    if (!this.config) {
      return undefined
    }

    return this.config.installedPlugins.find((p) => p.name === pluginName)
  }

  /**
   * Récupère tous les plugins installés
   */
  getInstalledPlugins(): InstalledPlugin[] {
    return this.config?.installedPlugins || []
  }

  /**
   * Récupère tous les plugins installés d'une catégorie donnée
   */
  getPluginsByCategory(category: string): InstalledPlugin[] {
    if (!this.config) {
      return []
    }

    return this.config.installedPlugins.filter((p) => p.category === category)
  }

  /**
   * Ajoute un plugin à la liste des installés
   */
  async addPlugin(plugin: Omit<InstalledPlugin, 'installedAt'>): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }

    // Vérifier si déjà installé
    if (this.isInstalled(plugin.name)) {
      logger.warn(`Plugin ${plugin.name} is already marked as installed`)
      return
    }

    const installedPlugin: InstalledPlugin = {
      ...plugin,
      installedAt: new Date().toISOString(),
    }

    this.config.installedPlugins.push(installedPlugin)
    await this.save()

    logger.debug(`Marked plugin ${plugin.name} as installed`)
  }

  /**
   * Supprime un plugin de la liste des installés
   */
  async removePlugin(pluginName: string): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }

    const index = this.config.installedPlugins.findIndex(
      (p) => p.name === pluginName
    )

    if (index === -1) {
      logger.warn(`Plugin ${pluginName} not found in installed plugins`)
      return
    }

    this.config.installedPlugins.splice(index, 1)
    await this.save()

    logger.debug(`Removed plugin ${pluginName} from installed plugins`)
  }

  /**
   * Met à jour les informations d'un plugin installé
   */
  async updatePlugin(
    pluginName: string,
    updates: Partial<Omit<InstalledPlugin, 'name' | 'installedAt'>>
  ): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }

    const plugin = this.config.installedPlugins.find(
      (p) => p.name === pluginName
    )

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`)
    }

    Object.assign(plugin, updates)
    await this.save()

    logger.debug(`Updated plugin ${pluginName}`)
  }

  /**
   * Efface toute la configuration
   */
  async reset(): Promise<void> {
    this.config = {
      version: CONFIG_VERSION,
      installedPlugins: [],
      lastUpdated: new Date().toISOString(),
    }
    await this.save()

    logger.info('Reset plugin configuration')
  }

  /**
   * Vérifie les conflits potentiels avec un nouveau plugin
   *
   * @param category - Catégorie du plugin à installer
   * @param exclusiveCategories - Catégories qui ne peuvent avoir qu'un seul plugin
   * @returns Liste des plugins en conflit
   */
  checkCategoryConflicts(
    category: string,
    exclusiveCategories: string[] = ['routing', 'state']
  ): InstalledPlugin[] {
    if (!exclusiveCategories.includes(category)) {
      return []
    }

    return this.getPluginsByCategory(category)
  }

  /**
   * Exporte la configuration pour affichage ou debug
   */
  export(): PluginConfig | null {
    return this.config
  }
}
