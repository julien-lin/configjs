import type {
  Plugin,
  CompatibilityRule,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  ProjectContext,
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
   * @param ctx - Contexte du projet (optionnel, pour règles spécifiques framework)
   * @returns Résultat de la validation avec erreurs, warnings et suggestions
   *
   * @example
   * ```typescript
   * const result = validator.validate([plugin1, plugin2, plugin3], ctx)
   * if (!result.valid) {
   *   // Gérer les erreurs
   * }
   * ```
   */
  validate(plugins: Plugin[], ctx?: ProjectContext): ValidationResult {
    logger.debug(`Validating ${plugins.length} plugin(s)`)

    const pluginNames = new Set(plugins.map((p) => p.name))

    // Filtrer les règles selon le framework si contexte fourni
    const applicableRules = ctx
      ? this.rules.filter(
          (rule) => !rule.framework || rule.framework === ctx.framework
        )
      : this.rules.filter((rule) => !rule.framework)

    // Vérifications en parallèle
    const allConflicts = this.checkConflicts(
      plugins,
      pluginNames,
      applicableRules
    )
    const conflictErrors: ValidationError[] = []
    const conflictWarnings: ValidationWarning[] = []

    for (const conflict of allConflicts) {
      const rule = applicableRules.find(
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

    // Vérifier les conflits framework
    const frameworkConflicts = ctx
      ? this.checkFrameworkConflicts(plugins, pluginNames, ctx, applicableRules)
      : []

    // Séparer les conflits framework par sévérité
    const frameworkErrors: ValidationError[] = []
    const frameworkWarnings: ValidationWarning[] = []

    for (const conflict of frameworkConflicts) {
      const rule = applicableRules.find(
        (r) =>
          r.type === 'CONFLICT' &&
          r.framework === ctx?.framework &&
          r.plugins?.some((p) => conflict.plugins?.includes(p))
      )
      if (rule?.severity === 'error') {
        frameworkErrors.push(conflict)
      } else {
        frameworkWarnings.push(conflict)
      }
    }

    const errors = [
      ...this.checkExclusivity(plugins, pluginNames, applicableRules),
      ...conflictErrors,
      ...this.checkDependencies(plugins, pluginNames, applicableRules),
      ...frameworkErrors,
    ]

    const warnings = [...conflictWarnings, ...frameworkWarnings]
    const suggestions = this.checkRecommendations(
      plugins,
      pluginNames,
      applicableRules
    )

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
   * Vérifie les conflits avec le framework
   *
   * @param _plugins - Liste des plugins (non utilisée, conservée pour cohérence)
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @param ctx - Contexte du projet
   * @param rules - Règles applicables
   * @returns Liste des erreurs/warnings de conflit framework
   *
   * @internal
   */
  private checkFrameworkConflicts(
    _plugins: Plugin[],
    pluginNames: Set<string>,
    ctx: ProjectContext,
    rules: CompatibilityRule[]
  ): ValidationWarning[] {
    const conflicts: ValidationWarning[] = []

    for (const rule of rules) {
      if (
        rule.type !== 'CONFLICT' ||
        !rule.framework ||
        rule.framework !== ctx.framework
      ) {
        continue
      }

      // Vérifier si le plugin en conflit avec le framework est présent
      if (rule.plugins && rule.plugins.length > 0) {
        const conflictingPlugins = rule.plugins.filter((pluginName) =>
          pluginNames.has(pluginName)
        )

        if (conflictingPlugins.length > 0) {
          conflicts.push({
            type: 'CONFLICT',
            plugins: conflictingPlugins,
            message: rule.reason,
            canOverride: rule.allowOverride ?? true,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Vérifie les règles d'exclusivité (EXCLUSIVE)
   *
   * @param _plugins - Liste des plugins (non utilisée, conservée pour cohérence)
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @param rules - Règles applicables
   * @returns Liste des erreurs d'exclusivité
   *
   * @internal
   */
  private checkExclusivity(
    _plugins: Plugin[],
    pluginNames: Set<string>,
    rules: CompatibilityRule[] = this.rules
  ): ValidationError[] {
    const errors: ValidationError[] = []

    for (const rule of rules) {
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
   * @param rules - Règles applicables
   * @returns Liste des warnings/erreurs de conflit
   *
   * @internal
   */
  private checkConflicts(
    _plugins: Plugin[],
    pluginNames: Set<string>,
    rules: CompatibilityRule[] = this.rules
  ): ValidationWarning[] {
    const conflicts: ValidationWarning[] = []

    for (const rule of rules) {
      // Ignorer les règles avec framework (gérées séparément)
      if (rule.framework) {
        continue
      }
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
   * @param rules - Règles applicables
   * @returns Liste des erreurs de dépendances manquantes
   *
   * @internal
   */
  private checkDependencies(
    _plugins: Plugin[],
    pluginNames: Set<string>,
    rules: CompatibilityRule[] = this.rules
  ): ValidationError[] {
    const errors: ValidationError[] = []

    for (const rule of rules) {
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
   * @param rules - Règles applicables
   * @returns Liste des suggestions de plugins recommandés
   *
   * @internal
   */
  private checkRecommendations(
    _plugins: Plugin[],
    pluginNames: Set<string>,
    rules: CompatibilityRule[] = this.rules
  ): string[] {
    const suggestions: string[] = []

    for (const rule of rules) {
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

  // Recommandations - React Router
  {
    type: 'RECOMMENDS',
    plugin: 'react-router-dom',
    recommends: ['@types/react-router-dom'],
    reason:
      'Types TypeScript recommandés pour une meilleure expérience de développement',
    severity: 'info',
  },

  // Règles spécifiques Next.js
  // React Router incompatible avec Next.js
  {
    type: 'CONFLICT',
    plugins: ['react-router-dom'],
    framework: 'nextjs',
    reason:
      'React Router est incompatible avec Next.js. Next.js a son propre système de routing intégré.',
    severity: 'error',
    allowOverride: false,
  },

  // Framer Motion peut causer des problèmes SSR avec Next.js
  {
    type: 'CONFLICT',
    plugins: ['framer-motion'],
    framework: 'nextjs',
    reason:
      'Framer Motion peut causer des problèmes avec le Server-Side Rendering (SSR) de Next.js. Utilisez des alternatives compatibles SSR ou configurez correctement le dynamic import.',
    severity: 'warning',
    allowOverride: true,
  },

  // Shadcn/ui nécessite une configuration spéciale pour Next.js
  {
    type: 'RECOMMENDS',
    plugin: 'shadcn-ui',
    recommends: ['shadcn-ui-nextjs'],
    framework: 'nextjs',
    reason:
      'Pour Next.js, utilisez la variante shadcn-ui-nextjs qui est optimisée pour React Server Components.',
    severity: 'info',
  },
]
