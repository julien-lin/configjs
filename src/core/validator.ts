import type {
  Plugin,
  CompatibilityRule,
  ValidationError,
  ValidationWarning,
  ValidationResult,
} from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * Valide la compatibilité entre plugins selon des règles définies
 *
 * Cette classe vérifie :
 * - Les exclusivités (erreur si plusieurs plugins exclusifs sont sélectionnés)
 * - Les conflits (avertissement si des plugins peuvent entrer en conflit)
 * - Les dépendances requises (erreur si une dépendance manque)
 * - Les recommandations (suggestions pour améliorer la configuration)
 *
 * @example
 * ```typescript
 * const validator = new CompatibilityValidator(compatibilityRules)
 * const result = validator.validate([reactRouterPlugin, zustandPlugin])
 *
 * if (!result.valid) {
 *   console.error('Errors:', result.errors)
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Warnings:', result.warnings)
 * }
 * ```
 */
export class CompatibilityValidator {
  /**
   * @param rules - Règles de compatibilité à appliquer
   */
  constructor(private readonly rules: CompatibilityRule[]) {}

  /**
   * Valide la compatibilité d'un ensemble de plugins
   *
   * @param plugins - Liste des plugins à valider
   * @returns Résultat de la validation avec erreurs, warnings et suggestions
   *
   * @example
   * ```typescript
   * const result = validator.validate([plugin1, plugin2, plugin3])
   * if (!result.valid) {
   *   // Gérer les erreurs
   * }
   * ```
   */
  validate(plugins: Plugin[]): ValidationResult {
    logger.debug(`Validating ${plugins.length} plugin(s)`)

    const pluginNames = new Set(plugins.map((p) => p.name))

    // Vérifications en parallèle
    const allConflicts = this.checkConflicts(plugins, pluginNames)
    const conflictErrors: ValidationError[] = []
    const conflictWarnings: ValidationWarning[] = []

    for (const conflict of allConflicts) {
      const rule = this.rules.find(
        (r) =>
          r.type === 'CONFLICT' &&
          r.plugins?.every((p) => conflict.plugins?.includes(p))
      )
      if (rule?.severity === 'error') {
        conflictErrors.push(conflict)
      } else {
        conflictWarnings.push(conflict)
      }
    }

    const errors = [
      ...this.checkExclusivity(plugins, pluginNames),
      ...conflictErrors,
      ...this.checkDependencies(plugins, pluginNames),
    ]

    const warnings = conflictWarnings
    const suggestions = this.checkRecommendations(plugins, pluginNames)

    const valid = errors.length === 0

    logger.debug(`Validation result: ${valid ? 'valid' : 'invalid'}`, {
      errors: errors.length,
      warnings: warnings.length,
      suggestions: suggestions.length,
    })

    return {
      valid,
      errors,
      warnings,
      suggestions,
    }
  }

  /**
   * Vérifie les règles d'exclusivité (EXCLUSIVE)
   *
   * @param _plugins - Liste des plugins (non utilisée, conservée pour cohérence)
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @returns Liste des erreurs d'exclusivité
   *
   * @internal
   */
  private checkExclusivity(
    _plugins: Plugin[],
    pluginNames: Set<string>
  ): ValidationError[] {
    const errors: ValidationError[] = []

    for (const rule of this.rules) {
      if (rule.type !== 'EXCLUSIVE' || !rule.plugins) {
        continue
      }

      // Vérifier si plusieurs plugins exclusifs sont présents
      const selectedExclusivePlugins = rule.plugins.filter((pluginName) =>
        pluginNames.has(pluginName)
      )

      if (selectedExclusivePlugins.length > 1) {
        errors.push({
          type: 'EXCLUSIVE',
          plugins: selectedExclusivePlugins,
          message: rule.reason,
          canOverride: rule.allowOverride ?? false,
        })
      }
    }

    return errors
  }

  /**
   * Vérifie les conflits entre plugins (CONFLICT)
   *
   * @param _plugins - Liste des plugins (non utilisée, conservée pour cohérence)
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @returns Liste des warnings/erreurs de conflit
   *
   * @internal
   */
  private checkConflicts(
    _plugins: Plugin[],
    pluginNames: Set<string>
  ): ValidationWarning[] {
    const conflicts: ValidationWarning[] = []

    for (const rule of this.rules) {
      if (rule.type !== 'CONFLICT' || !rule.plugins) {
        continue
      }

      // Vérifier si plusieurs plugins en conflit sont présents
      const conflictingPlugins = rule.plugins.filter((pluginName) =>
        pluginNames.has(pluginName)
      )

      if (conflictingPlugins.length > 1) {
        conflicts.push({
          type: 'CONFLICT',
          plugins: conflictingPlugins,
          message: rule.reason,
          canOverride: rule.allowOverride ?? true,
        })
      }
    }

    return conflicts
  }

  /**
   * Vérifie les dépendances requises (REQUIRES)
   *
   * @param _plugins - Liste des plugins (non utilisée, conservée pour cohérence)
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @returns Liste des erreurs de dépendances manquantes
   *
   * @internal
   */
  private checkDependencies(
    _plugins: Plugin[],
    pluginNames: Set<string>
  ): ValidationError[] {
    const errors: ValidationError[] = []

    for (const rule of this.rules) {
      if (rule.type !== 'REQUIRES' || !rule.plugin || !rule.requires) {
        continue
      }

      // Vérifier si le plugin est présent
      if (!pluginNames.has(rule.plugin)) {
        continue
      }

      // Vérifier si toutes les dépendances sont présentes
      const missingDependencies = rule.requires.filter(
        (dep) => !pluginNames.has(dep)
      )

      if (missingDependencies.length > 0) {
        errors.push({
          type: 'REQUIRES',
          plugin: rule.plugin,
          required: missingDependencies.join(', '),
          message: `${rule.plugin} requires: ${missingDependencies.join(', ')}. ${rule.reason}`,
          canOverride: rule.allowOverride ?? false,
        })
      }
    }

    return errors
  }

  /**
   * Vérifie les recommandations (RECOMMENDS)
   *
   * @param _plugins - Liste des plugins (non utilisée, conservée pour cohérence)
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @returns Liste des suggestions de plugins recommandés
   *
   * @internal
   */
  private checkRecommendations(
    _plugins: Plugin[],
    pluginNames: Set<string>
  ): string[] {
    const suggestions: string[] = []

    for (const rule of this.rules) {
      if (rule.type !== 'RECOMMENDS' || !rule.plugin || !rule.recommends) {
        continue
      }

      // Vérifier si le plugin est présent
      if (!pluginNames.has(rule.plugin)) {
        continue
      }

      // Vérifier les plugins recommandés manquants
      const missingRecommendations = rule.recommends.filter(
        (rec) => !pluginNames.has(rec)
      )

      if (missingRecommendations.length > 0) {
        suggestions.push(
          `${rule.plugin} recommends: ${missingRecommendations.join(', ')}. ${rule.reason}`
        )
      }
    }

    return suggestions
  }
}

/**
 * Règles de compatibilité par défaut
 *
 * Ces règles définissent les incompatibilités, dépendances et recommandations
 * entre les différents plugins supportés par confjs.
 */
export const compatibilityRules: CompatibilityRule[] = [
  // Exclusivités - State Management
  {
    type: 'EXCLUSIVE',
    plugins: ['@reduxjs/toolkit', 'zustand', 'jotai'],
    reason: 'Une seule solution de state management est recommandée',
    severity: 'error',
    allowOverride: false,
  },

  // Conflits - CSS Frameworks
  {
    type: 'CONFLICT',
    plugins: ['tailwindcss', 'bootstrap'],
    reason: 'Approches CSS potentiellement conflictuelles',
    severity: 'warning',
    allowOverride: true,
  },

  // Dépendances - TailwindCSS
  {
    type: 'REQUIRES',
    plugin: 'tailwindcss',
    requires: ['postcss', 'autoprefixer'],
    reason: 'PostCSS et Autoprefixer sont nécessaires pour TailwindCSS',
    severity: 'error',
    autoInstall: true,
    allowOverride: false,
  },

  // Recommandations - React Router
  {
    type: 'RECOMMENDS',
    plugin: 'react-router-dom',
    recommends: ['@types/react-router-dom'],
    reason:
      'Types TypeScript recommandés pour une meilleure expérience de développement',
    severity: 'info',
  },
]
