import type { Plugin, ProjectContext, Framework } from '../types/index.js'
import { Category } from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * Registry centralisé de tous les plugins disponibles
 *
 * Ce registry contient tous les plugins organisés par catégorie.
 * Les plugins sont chargés dynamiquement et validés au chargement.
 *
 * @example
 * ```typescript
 * import { pluginRegistry, getPluginsByCategory } from './plugins/registry'
 *
 * // Obtenir tous les plugins de routing
 * const routingPlugins = getPluginsByCategory(Category.ROUTING)
 *
 * // Rechercher un plugin
 * const router = getPluginById('react-router-dom')
 * ```
 */

// Import des plugins (seront ajoutés progressivement)
import { reactRouterPlugin } from './routing/react-router.js'
import { zustandPlugin } from './state/zustand.js'
import { reduxToolkitPlugin } from './state/redux-toolkit.js'
import { axiosPlugin } from './http/axios.js'
import { tailwindcssPlugin } from './css/tailwindcss.js'
// ... autres imports

/**
 * Registry de tous les plugins disponibles
 *
 * Les plugins sont organisés par catégorie :
 * - ROUTING : React Router, TanStack Router, etc.
 * - STATE : Zustand, Redux Toolkit, Jotai, etc.
 * - HTTP : Axios, etc.
 * - CSS : TailwindCSS, Bootstrap, etc.
 * - TOOLING : ESLint, Prettier, Husky, etc.
 */
export const pluginRegistry: Plugin[] = [
  // Routing
  reactRouterPlugin,
  // State
  zustandPlugin,
  reduxToolkitPlugin,
  // HTTP
  axiosPlugin,
  // CSS
  tailwindcssPlugin,
  // etc.
]

/**
 * Valide qu'un plugin respecte l'interface Plugin
 *
 * @param plugin - Plugin à valider
 * @returns true si le plugin est valide, false sinon
 */
function validatePlugin(plugin: Plugin): boolean {
  const requiredFields: (keyof Plugin)[] = [
    'name',
    'displayName',
    'description',
    'category',
    'install',
    'configure',
  ]

  for (const field of requiredFields) {
    if (!(field in plugin) || plugin[field] === undefined) {
      logger.error(`Plugin validation failed: missing field '${field}'`, {
        plugin: plugin.name,
      })
      return false
    }
  }

  // Vérifier que category est valide
  if (!Object.values(Category).includes(plugin.category)) {
    logger.error(
      `Plugin validation failed: invalid category '${plugin.category}'`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  // Vérifier que frameworks est un tableau non vide
  if (!Array.isArray(plugin.frameworks) || plugin.frameworks.length === 0) {
    logger.error(
      `Plugin validation failed: frameworks must be a non-empty array`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  return true
}

/**
 * Valide tous les plugins du registry au chargement
 *
 * @param plugins - Liste des plugins à valider
 * @returns Liste des plugins valides
 */
function validateRegistry(plugins: Plugin[]): Plugin[] {
  const validPlugins: Plugin[] = []
  const invalidPlugins: string[] = []

  for (const plugin of plugins) {
    if (validatePlugin(plugin)) {
      validPlugins.push(plugin)
    } else {
      invalidPlugins.push(plugin.name)
    }
  }

  if (invalidPlugins.length > 0) {
    logger.warn(`Some plugins failed validation and were excluded:`, {
      invalidPlugins,
      total: plugins.length,
      valid: validPlugins.length,
    })
  }

  return validPlugins
}

/**
 * Obtient tous les plugins d'une catégorie spécifique
 *
 * @param category - Catégorie des plugins à récupérer
 * @returns Liste des plugins de la catégorie
 *
 * @example
 * ```typescript
 * const routingPlugins = getPluginsByCategory(Category.ROUTING)
 * // Retourne : [reactRouterPlugin, tanstackRouterPlugin]
 * ```
 */
export function getPluginsByCategory(category: Category): Plugin[] {
  return pluginRegistry.filter((plugin) => plugin.category === category)
}

/**
 * Obtient un plugin par son identifiant (name)
 *
 * @param id - Identifiant du plugin (name)
 * @returns Plugin trouvé ou undefined
 *
 * @example
 * ```typescript
 * const router = getPluginById('react-router-dom')
 * if (router) {
 *   // Utiliser le plugin
 * }
 * ```
 */
export function getPluginById(id: string): Plugin | undefined {
  return pluginRegistry.find((plugin) => plugin.name === id)
}

/**
 * Obtient les plugins compatibles avec un contexte de projet donné
 *
 * @param ctx - Contexte du projet
 * @returns Liste des plugins compatibles avec le contexte
 *
 * @example
 * ```typescript
 * const ctx = await detectContext(projectRoot)
 * const compatiblePlugins = getCompatiblePlugins(ctx)
 * // Retourne uniquement les plugins compatibles avec React + TypeScript + Vite
 * ```
 */
export function getCompatiblePlugins(ctx: ProjectContext): Plugin[] {
  return pluginRegistry.filter((plugin) => {
    // Vérifier le framework
    if (!plugin.frameworks.includes(ctx.framework)) {
      return false
    }

    // Vérifier TypeScript si requis
    if (plugin.requiresTypeScript === true && !ctx.typescript) {
      return false
    }

    // Vérifier le bundler si spécifié
    if (plugin.bundlers && plugin.bundlers.length > 0) {
      if (ctx.bundler === null || !plugin.bundlers.includes(ctx.bundler)) {
        return false
      }
    }

    return true
  })
}

/**
 * Obtient les plugins compatibles avec un plugin donné et un contexte
 *
 * @param plugin - Plugin de référence
 * @param ctx - Contexte du projet
 * @returns Liste des plugins compatibles
 *
 * @example
 * ```typescript
 * const compatible = getCompatiblePluginsForPlugin(reactRouterPlugin, ctx)
 * // Retourne les plugins qui ne sont pas dans incompatibleWith
 * ```
 */
export function getCompatiblePluginsForPlugin(
  plugin: Plugin,
  ctx: ProjectContext
): Plugin[] {
  const allCompatible = getCompatiblePlugins(ctx)

  // Filtrer les plugins incompatibles
  if (plugin.incompatibleWith && plugin.incompatibleWith.length > 0) {
    const incompatible = plugin.incompatibleWith
    return allCompatible.filter((p) => !incompatible.includes(p.name))
  }

  return allCompatible
}

/**
 * Recherche des plugins par nom, description ou catégorie
 *
 * @param query - Terme de recherche
 * @returns Liste des plugins correspondant à la recherche
 *
 * @example
 * ```typescript
 * const results = searchPlugins('router')
 * // Retourne : [reactRouterPlugin, tanstackRouterPlugin]
 * ```
 */
export function searchPlugins(query: string): Plugin[] {
  const lowerQuery = query.toLowerCase()

  return pluginRegistry.filter((plugin) => {
    // Recherche dans le nom
    if (plugin.name.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Recherche dans le displayName
    if (plugin.displayName.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Recherche dans la description
    if (plugin.description.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Recherche dans la catégorie
    if (plugin.category.toLowerCase().includes(lowerQuery)) {
      return true
    }

    return false
  })
}

/**
 * Obtient tous les plugins disponibles pour un framework spécifique
 *
 * @param framework - Framework cible
 * @returns Liste des plugins compatibles avec le framework
 *
 * @example
 * ```typescript
 * const reactPlugins = getPluginsByFramework('react')
 * ```
 */
export function getPluginsByFramework(framework: Framework): Plugin[] {
  return pluginRegistry.filter((plugin) =>
    plugin.frameworks.includes(framework)
  )
}

/**
 * Obtient les plugins déjà installés dans le projet
 *
 * @param ctx - Contexte du projet
 * @returns Liste des plugins détectés comme installés
 *
 * @example
 * ```typescript
 * const installed = getInstalledPlugins(ctx)
 * // Retourne les plugins dont detect() retourne true
 * ```
 */
export async function getInstalledPlugins(
  ctx: ProjectContext
): Promise<Plugin[]> {
  const installed: Plugin[] = []

  for (const plugin of pluginRegistry) {
    if (plugin.detect) {
      try {
        const isInstalled = await Promise.resolve(plugin.detect(ctx))
        if (isInstalled) {
          installed.push(plugin)
        }
      } catch (error) {
        logger.warn(`Error detecting plugin ${plugin.name}:`, error)
      }
    }
  }

  return installed
}

/**
 * Obtient les plugins recommandés pour un contexte donné
 *
 * @param ctx - Contexte du projet
 * @returns Liste des plugins recommandés (par catégorie)
 *
 * @example
 * ```typescript
 * const recommended = getRecommendedPlugins(ctx)
 * // Retourne un plugin recommandé par catégorie
 * ```
 */
export function getRecommendedPlugins(ctx: ProjectContext): Plugin[] {
  const compatible = getCompatiblePlugins(ctx)
  const recommended: Plugin[] = []
  const categoriesSeen = new Set<Category>()

  // Pour chaque catégorie, prendre le premier plugin compatible
  for (const plugin of compatible) {
    if (!categoriesSeen.has(plugin.category)) {
      recommended.push(plugin)
      categoriesSeen.add(plugin.category)
    }
  }

  return recommended
}

// Validation du registry au chargement
const validatedRegistry = validateRegistry(pluginRegistry)

if (validatedRegistry.length !== pluginRegistry.length) {
  logger.warn(
    `Registry validation: ${pluginRegistry.length - validatedRegistry.length} plugins were excluded`
  )
}
