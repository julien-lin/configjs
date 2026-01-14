/**
 * Compatibility Rules Generator
 *
 * Génère automatiquement les règles de compatibilité à partir des métadonnées des plugins.
 * Cela permet de maintenir les règles à jour sans duplication de code.
 *
 * @example
 * ```typescript
 * import { pluginRegistry } from '../plugins/registry.js'
 * import { generateCompatibilityRules } from './compatibility-generator.js'
 *
 * const rules = generateCompatibilityRules(pluginRegistry)
 * const validator = new CompatibilityValidator(rules)
 * ```
 */

import type { Plugin, CompatibilityRule } from '../types/index.js'
import { Category } from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * Génère automatiquement les règles de compatibilité à partir des plugins
 *
 * @param plugins - Liste de tous les plugins disponibles
 * @returns Liste des règles de compatibilité générées
 *
 * @example
 * ```typescript
 * const rules = generateCompatibilityRules(pluginRegistry)
 * ```
 */
export function generateCompatibilityRules(
  plugins: Plugin[]
): CompatibilityRule[] {
  logger.debug(
    `Generating compatibility rules from ${plugins.length} plugin(s)`
  )

  const rules: CompatibilityRule[] = []

  // 1. Générer les règles EXCLUSIVE par catégorie
  rules.push(...generateExclusiveRules(plugins))

  // 2. Générer les règles CONFLICT depuis plugin.incompatibleWith
  rules.push(...generateConflictRules(plugins))

  // 3. Générer les règles REQUIRES depuis plugin.requires
  rules.push(...generateRequiresRules(plugins))

  // 4. Générer les règles RECOMMENDS depuis plugin.recommends
  rules.push(...generateRecommendsRules(plugins))

  logger.debug(`Generated ${rules.length} compatibility rule(s)`)
  return rules
}

/**
 * Génère les règles EXCLUSIVE par catégorie
 *
 * Les plugins de la même catégorie sont mutuellement exclusifs
 * (ex: un seul state management, un seul routing, etc.)
 *
 * @param plugins - Liste des plugins
 * @returns Règles EXCLUSIVE générées
 *
 * @internal
 */
function generateExclusiveRules(plugins: Plugin[]): CompatibilityRule[] {
  const rules: CompatibilityRule[] = []

  // Grouper les plugins par catégorie
  const pluginsByCategory = new Map<Category, Plugin[]>()

  for (const plugin of plugins) {
    const category = plugin.category
    if (!pluginsByCategory.has(category)) {
      pluginsByCategory.set(category, [])
    }
    const arr = pluginsByCategory.get(category)
    if (arr) {
      arr.push(plugin)
    }
  }

  // Générer une règle EXCLUSIVE pour chaque catégorie avec plusieurs plugins
  for (const [category, categoryPlugins] of pluginsByCategory.entries()) {
    // Seulement pour les catégories qui ont plusieurs plugins
    if (categoryPlugins.length < 2) {
      continue
    }

    // Catégories qui doivent être exclusives
    const exclusiveCategories = [
      Category.STATE, // Un seul state management
      Category.ROUTING, // Un seul routing
      Category.CSS, // Un seul framework CSS (peut être flexible selon le cas)
    ]

    if (!exclusiveCategories.includes(category)) {
      continue
    }

    const pluginNames = categoryPlugins.map((p) => p.name)

    // Pour CSS, on génère des règles plus flexibles (warning au lieu d'error)
    const severity = category === Category.CSS ? 'warning' : 'error'
    const allowOverride = category === Category.CSS

    rules.push({
      type: 'EXCLUSIVE',
      plugins: pluginNames,
      reason: getExclusiveReason(category),
      severity,
      allowOverride,
    })
  }

  return rules
}

/**
 * Retourne le message de raison pour une règle EXCLUSIVE selon la catégorie
 *
 * @param category - Catégorie du plugin
 * @returns Message de raison
 *
 * @internal
 */
function getExclusiveReason(category: Category): string {
  switch (category) {
    case Category.STATE:
      return 'Une seule solution de state management est recommandée'
    case Category.ROUTING:
      return 'Un seul système de routing est recommandé'
    case Category.CSS:
      return 'Approches CSS potentiellement conflictuelles'
    default:
      return 'Ces plugins sont mutuellement exclusifs'
  }
}

/**
 * Génère les règles CONFLICT depuis plugin.incompatibleWith
 *
 * @param plugins - Liste des plugins
 * @returns Règles CONFLICT générées
 *
 * @internal
 */
function generateConflictRules(plugins: Plugin[]): CompatibilityRule[] {
  const rules: CompatibilityRule[] = []

  for (const plugin of plugins) {
    if (!plugin.incompatibleWith || plugin.incompatibleWith.length === 0) {
      continue
    }

    // Pour chaque plugin incompatible, créer une règle CONFLICT
    for (const incompatiblePluginName of plugin.incompatibleWith) {
      // Vérifier que le plugin incompatible existe dans le registry
      const incompatiblePlugin = plugins.find(
        (p) => p.name === incompatiblePluginName
      )

      if (!incompatiblePlugin) {
        logger.warn(
          `Plugin ${plugin.name} declares incompatibleWith ${incompatiblePluginName}, but plugin not found in registry`
        )
        continue
      }

      // Générer une règle CONFLICT pour chaque combinaison de frameworks
      const commonFrameworks = plugin.frameworks.filter((f) =>
        incompatiblePlugin.frameworks.includes(f)
      )

      // Déterminer la sévérité selon les catégories
      // Les conflits CSS sont des warnings (approches différentes mais pas forcément incompatibles)
      const isCssConflict =
        plugin.category === Category.CSS &&
        incompatiblePlugin.category === Category.CSS
      const severity = isCssConflict ? 'warning' : 'error'
      const allowOverride = isCssConflict

      if (commonFrameworks.length === 0) {
        // Pas de framework commun = conflit global
        rules.push({
          type: 'CONFLICT',
          plugins: [plugin.name, incompatiblePluginName],
          reason: `${plugin.displayName} est incompatible avec ${incompatiblePlugin.displayName}`,
          severity,
          allowOverride,
        })
      } else {
        // Conflit spécifique par framework
        for (const framework of commonFrameworks) {
          rules.push({
            type: 'CONFLICT',
            plugins: [plugin.name, incompatiblePluginName],
            framework,
            reason: `${plugin.displayName} est incompatible avec ${incompatiblePlugin.displayName} pour ${framework}`,
            severity,
            allowOverride,
          })
        }
      }
    }
  }

  return rules
}

/**
 * Génère les règles REQUIRES depuis plugin.requires
 *
 * @param plugins - Liste des plugins
 * @returns Règles REQUIRES générées
 *
 * @internal
 */
function generateRequiresRules(plugins: Plugin[]): CompatibilityRule[] {
  const rules: CompatibilityRule[] = []

  for (const plugin of plugins) {
    if (!plugin.requires || plugin.requires.length === 0) {
      continue
    }

    // Générer une règle REQUIRES pour chaque framework supporté
    for (const framework of plugin.frameworks) {
      rules.push({
        type: 'REQUIRES',
        plugin: plugin.name,
        requires: plugin.requires,
        framework,
        reason: `${plugin.displayName} nécessite les dépendances suivantes: ${plugin.requires.join(', ')}`,
        severity: 'error',
        allowOverride: false,
      })
    }
  }

  return rules
}

/**
 * Génère les règles RECOMMENDS depuis plugin.recommends
 *
 * @param plugins - Liste des plugins
 * @returns Règles RECOMMENDS générées
 *
 * @internal
 */
function generateRecommendsRules(plugins: Plugin[]): CompatibilityRule[] {
  const rules: CompatibilityRule[] = []

  for (const plugin of plugins) {
    if (!plugin.recommends || plugin.recommends.length === 0) {
      continue
    }

    // Générer une règle RECOMMENDS pour chaque framework supporté
    for (const framework of plugin.frameworks) {
      rules.push({
        type: 'RECOMMENDS',
        plugin: plugin.name,
        recommends: plugin.recommends,
        framework,
        reason: `${plugin.displayName} recommande d'installer: ${plugin.recommends.join(', ')}`,
        severity: 'info',
      })
    }
  }

  return rules
}
