import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
  Framework,
  Bundler,
} from '../../types/index.js'
import type { Category } from '../../types/index.js'

/**
 * Plugin Builder - API fluide pour créer des plugins
 *
 * Offre une API type-safe et chainée pour construire les plugins
 * avec support complet de TypeScript.
 *
 * @example
 * ```typescript
 * import { PluginBuilder } from './plugins/builder/plugin-builder'
 *
 * const myPlugin = new PluginBuilder()
 *   .named('my-plugin', 'My Plugin')
 *   .forFrameworks(['react', 'vue'])
 *   .inCategory(Category.STATE)
 *   .withVersion('^1.0.0')
 *   .incompatibleWith(['other-plugin'])
 *   .requires(['peer-dep'])
 *   .recommends(['@types/peer-dep'])
 *   .withInstallHandler(async (ctx) => ({
 *     packages: ['my-plugin'],
 *     devPackages: [],
 *   }))
 *   .withConfigHandler(async (ctx) => ({
 *     success: true,
 *     changes: [],
 *   }))
 *   .build()
 * ```
 */
export class PluginBuilder {
  private _plugin: Partial<Plugin> = {}

  /**
   * Défini le nom et le nom d'affichage du plugin
   */
  named(name: string, displayName: string, description?: string): this {
    this._plugin.name = name
    this._plugin.displayName = displayName
    if (description) {
      this._plugin.description = description
    }
    return this
  }

  /**
   * Défini la description du plugin
   */
  withDescription(description: string): this {
    this._plugin.description = description
    return this
  }

  /**
   * Défini les frameworks supportés
   */
  forFrameworks(frameworks: Framework[]): this {
    if (frameworks.length === 0) {
      throw new Error('At least one framework must be specified')
    }
    this._plugin.frameworks = frameworks
    return this
  }

  /**
   * Alias pour `forFrameworks`
   */
  forFramework(framework: Framework): this {
    return this.forFrameworks([framework])
  }

  /**
   * Défini la catégorie du plugin
   */
  inCategory(category: Category): this {
    this._plugin.category = category
    return this
  }

  /**
   * Alias pour `inCategory`
   */
  category(category: Category): this {
    return this.inCategory(category)
  }

  /**
   * Défini la version du plugin
   */
  withVersion(version: string): this {
    this._plugin.version = version
    return this
  }

  /**
   * Défini les bundlers supportés
   */
  withBundlers(bundlers: Bundler[]): this {
    this._plugin.bundlers = bundlers
    return this
  }

  /**
   * Spécifie que TypeScript est requis
   */
  requiresTypeScript(required: boolean = true): this {
    this._plugin.requiresTypeScript = required
    return this
  }

  /**
   * Défini les plugins incompatibles
   */
  incompatibleWith(plugins: string[]): this {
    this._plugin.incompatibleWith = plugins
    return this
  }

  /**
   * Ajoute un plugin incompatible
   */
  addIncompatibleWith(plugin: string): this {
    if (!this._plugin.incompatibleWith) {
      this._plugin.incompatibleWith = []
    }
    this._plugin.incompatibleWith.push(plugin)
    return this
  }

  /**
   * Défini les dépendances requises
   */
  requires(plugins: string[]): this {
    this._plugin.requires = plugins
    return this
  }

  /**
   * Ajoute une dépendance requise
   */
  addRequires(plugin: string): this {
    if (!this._plugin.requires) {
      this._plugin.requires = []
    }
    this._plugin.requires.push(plugin)
    return this
  }

  /**
   * Défini les dépendances recommandées
   */
  recommends(plugins: string[]): this {
    this._plugin.recommends = plugins
    return this
  }

  /**
   * Ajoute une dépendance recommandée
   */
  addRecommends(plugin: string): this {
    if (!this._plugin.recommends) {
      this._plugin.recommends = []
    }
    this._plugin.recommends.push(plugin)
    return this
  }

  /**
   * Défini la fonction de détection
   */
  withDetect(
    detect: (ctx: ProjectContext) => boolean | Promise<boolean>
  ): this {
    this._plugin.detect = detect
    return this
  }

  /**
   * Défini la fonction d'installation
   */
  withInstall(install: (ctx: ProjectContext) => Promise<InstallResult>): this {
    this._plugin.install = install
    return this
  }

  /**
   * Alias pour `withInstall`
   */
  withInstallHandler(
    install: (ctx: ProjectContext) => Promise<InstallResult>
  ): this {
    return this.withInstall(install)
  }

  /**
   * Défini la fonction de configuration
   */
  withConfigure(
    configure: (ctx: ProjectContext) => Promise<ConfigResult>
  ): this {
    this._plugin.configure = configure
    return this
  }

  /**
   * Alias pour `withConfigure`
   */
  withConfigHandler(
    configure: (ctx: ProjectContext) => Promise<ConfigResult>
  ): this {
    return this.withConfigure(configure)
  }

  /**
   * Défini la fonction pré-installation
   */
  withPreInstall(preInstall: (ctx: ProjectContext) => Promise<void>): this {
    this._plugin.preInstall = preInstall
    return this
  }

  /**
   * Défini la fonction post-installation
   */
  withPostInstall(postInstall: (ctx: ProjectContext) => Promise<void>): this {
    this._plugin.postInstall = postInstall
    return this
  }

  /**
   * Défini la fonction de rollback
   */
  withRollback(rollback: (ctx: ProjectContext) => Promise<void>): this {
    this._plugin.rollback = rollback
    return this
  }

  /**
   * Construit et retourne le plugin
   */
  build(): Plugin {
    const required: (keyof Plugin)[] = [
      'name',
      'displayName',
      'category',
      'frameworks',
      'install',
      'configure',
    ]

    for (const key of required) {
      if (!(key in this._plugin) || !this._plugin[key]) {
        throw new Error(
          `Missing required property: ${key}. Use .${key}() or equivalent method.`
        )
      }
    }

    const category = this._plugin.category
    const install = this._plugin.install
    const configure = this._plugin.configure

    if (!category || !install || !configure) {
      throw new Error(
        'Missing required plugin definition. Ensure category, install, and configure are set.'
      )
    }

    return {
      name: this._plugin.name ?? '',
      displayName: this._plugin.displayName ?? '',
      description: this._plugin.description || 'No description',
      category,
      frameworks: this._plugin.frameworks ?? [],
      version: this._plugin.version,
      bundlers: this._plugin.bundlers,
      requiresTypeScript: this._plugin.requiresTypeScript,
      compatibleWith: this._plugin.compatibleWith,
      incompatibleWith: this._plugin.incompatibleWith,
      requires: this._plugin.requires,
      recommends: this._plugin.recommends,
      detect: this._plugin.detect,
      install,
      configure,
      preInstall: this._plugin.preInstall,
      postInstall: this._plugin.postInstall,
      rollback: this._plugin.rollback,
    }
  }
}

/**
 * Crée un nouveau PluginBuilder
 *
 * @example
 * ```typescript
 * import { createPlugin } from './plugins/builder/plugin-builder'
 *
 * const plugin = createPlugin()
 *   .named('my-plugin', 'My Plugin')
 *   .forFramework('react')
 *   .inCategory(Category.STATE)
 *   // ... configuration
 *   .build()
 * ```
 */
export function createPlugin(): PluginBuilder {
  return new PluginBuilder()
}
