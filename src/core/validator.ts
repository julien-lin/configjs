import type {
  Plugin,
  CompatibilityRule,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  ProjectContext,
} from '../types/index.js'
import { getModuleLogger } from '../utils/logger-provider.js'
import { generateCompatibilityRules } from './compatibility-generator.js'
import { pluginRegistry } from '../plugins/registry.js'
import { ValidationIndex } from './indexing.js'

/**
 * Valide la compatibilité entre plugins selon des règles définies
 *
 * Cette classe vérifie :
 * - Les exclusivités (erreur si plusieurs plugins exclusifs sont sélectionnés)
 * - Les conflits (avertissement si des plugins peuvent entrer en conflit)
 * - Les dépendances requises (erreur si une dépendance manque)
 * - Les recommandations (suggestions pour améliorer la configuration)
 *
 * Optimisé pour O(n) complexity avec indexes Map-based au lieu de nested loops O(n²)
 *
 * @example
 * ```typescript
 * const validator = new CompatibilityValidator(allCompatibilityRules)
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
  private logger = getModuleLogger()
  private validationIndex: ValidationIndex

  /**
   * @param rules - Règles de compatibilité à appliquer
   */
  constructor(private readonly rules: CompatibilityRule[]) {
    // Build indexes once on construction for O(1) lookups during validation
    this.validationIndex = ValidationIndex.build(rules)
  }

  /**
   * Valide la compatibilité d'un ensemble de plugins
   *
   * Time complexity: O(n) where n = number of plugins (previously O(n²))
   * Space complexity: O(n) for index structures
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
    this.logger.debug(`Validating ${plugins.length} plugin(s)`)

    const pluginNames = new Set(plugins.map((p) => p.name))

    // Filtrer les règles selon le framework si contexte fourni
    const applicableRules = ctx
      ? this.rules.filter(
          (rule) => !rule.framework || rule.framework === ctx.framework
        )
      : this.rules.filter((rule) => !rule.framework)

    // Vérifications utilisant indexes O(1) au lieu de nested loops O(n²)
    const exclusivityViolations = this.checkExclusivity(
      pluginNames,
      applicableRules
    )

    // Séparer les violations d'exclusivité par sévérité selon les règles
    const exclusivityErrors: ValidationError[] = []
    const exclusivityWarnings: ValidationWarning[] = []

    for (const violation of exclusivityViolations) {
      if (!violation.plugins) continue
      const rule = applicableRules.find(
        (r) =>
          r.type === 'EXCLUSIVE' &&
          violation.plugins.every((p) => r.plugins?.includes(p))
      )
      if (rule?.severity === 'warning') {
        exclusivityWarnings.push(violation)
      } else {
        exclusivityErrors.push(violation)
      }
    }

    const conflictResults = this.checkConflicts(pluginNames, applicableRules)
    const conflictErrors: ValidationError[] = []
    const conflictWarnings: ValidationWarning[] = []

    for (const conflict of conflictResults) {
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
      ? this.checkFrameworkConflicts(pluginNames, ctx, applicableRules)
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

    const dependencyErrors = this.checkDependencies(
      pluginNames,
      applicableRules,
      ctx
    )
    const suggestionsList = this.checkRecommendations(
      pluginNames,
      applicableRules
    )

    const errors = [
      ...exclusivityErrors,
      ...conflictErrors,
      ...dependencyErrors,
      ...frameworkErrors,
    ]

    const warnings = [
      ...exclusivityWarnings,
      ...conflictWarnings,
      ...frameworkWarnings,
    ]

    const valid = errors.length === 0

    this.logger.debug(`Validation result: ${valid ? 'valid' : 'invalid'}`, {
      errors: errors.length,
      warnings: warnings.length,
      suggestions: suggestionsList.length,
    })

    return {
      valid,
      errors,
      warnings,
      suggestions: suggestionsList,
    }
  }

  /**
   * Vérifie les conflits avec le framework (optimized with indexing)
   * Time complexity: O(selectedPlugins) instead of O(rules × plugins)
   *
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @param ctx - Contexte du projet
   * @param rules - Règles applicables
   * @returns Liste des erreurs/warnings de conflit framework
   *
   * @internal
   */
  private checkFrameworkConflicts(
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

        // Pour les règles framework-spécifiques :
        // - Si rule.plugins a 1 élément : le plugin est incompatible avec le framework
        // - Si rule.plugins a 2+ éléments : les plugins sont incompatibles entre eux (dans ce framework)
        const isFrameworkIncompatible = rule.plugins.length === 1
        const shouldReportConflict = isFrameworkIncompatible
          ? conflictingPlugins.length > 0
          : conflictingPlugins.length > 1

        if (shouldReportConflict) {
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
   * Vérifie les règles d'exclusivité (EXCLUSIVE) - Optimized with indexing
   * Time complexity: O(selectedPlugins) instead of O(rules × plugins)
   *
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @param rules - Règles applicables
   * @returns Liste des erreurs d'exclusivité
   *
   * @internal
   */
  private checkExclusivity(
    pluginNames: Set<string>,
    _rules: CompatibilityRule[] = this.rules
  ): ValidationError[] {
    // Use index for O(1) lookups instead of O(n²)
    // Returns already-formatted errors with canOverride
    return this.validationIndex.exclusivity.getViolations(
      pluginNames
    ) as ValidationError[]
  }

  /**
   * Vérifie les conflits entre plugins (CONFLICT) - Optimized with indexing
   * Time complexity: O(selectedPlugins) instead of O(rules × plugins)
   *
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @param rules - Règles applicables
   * @returns Liste des warnings/erreurs de conflit
   *
   * @internal
   */
  private checkConflicts(
    pluginNames: Set<string>,
    _rules: CompatibilityRule[] = this.rules
  ): CompatibilityRule[] {
    // Use index for O(1) lookups instead of O(n²)
    return this.validationIndex.conflicts.getConflicts(pluginNames, _rules)
  }

  /**
   * Vérifie les dépendances requises (REQUIRES) - Optimized with indexing
   * Time complexity: O(selectedPlugins) instead of O(rules × plugins)
   *
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @param rules - Règles applicables
   * @param ctx - Contexte du projet (optionnel)
   * @returns Liste des erreurs de dépendances manquantes
   *
   * @internal
   */
  private checkDependencies(
    pluginNames: Set<string>,
    _rules: CompatibilityRule[] = this.rules,
    ctx?: ProjectContext
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Use index for O(1) lookups instead of O(n²)
    const dependencyRules =
      this.validationIndex.dependencies.getAllDependencies(pluginNames)

    for (const rule of dependencyRules) {
      if (rule.type !== 'REQUIRES' || !rule.plugin || !rule.requires) {
        continue
      }

      // Vérifier si toutes les dépendances sont présentes
      const missingDependencies: string[] = []

      for (const dep of rule.requires) {
        // Vérifier d'abord dans les plugins sélectionnés
        const pluginName = dep.split('@')[0] // Extraire le nom sans la version

        if (!pluginName) {
          continue
        }

        // Si c'est une dépendance de package (contient @version), vérifier dans les dependencies du projet
        if (dep.includes('@') && ctx) {
          const allDeps = { ...ctx.dependencies, ...ctx.devDependencies }

          // Vérifier si la dépendance existe dans le projet
          if (!allDeps[pluginName]) {
            missingDependencies.push(dep)
          }
        } else {
          // Sinon, vérifier dans les plugins sélectionnés
          if (!pluginNames.has(pluginName)) {
            missingDependencies.push(dep)
          }
        }
      }

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
   * Vérifie les recommandations (RECOMMENDS) - Optimized with indexing
   * Time complexity: O(selectedPlugins) instead of O(rules × plugins)
   *
   * @param pluginNames - Set des noms de plugins pour lookup rapide
   * @param rules - Règles applicables
   * @returns Liste des suggestions de plugins recommandés
   *
   * @internal
   */
  private checkRecommendations(
    pluginNames: Set<string>,
    _rules: CompatibilityRule[] = this.rules
  ): string[] {
    const suggestions: string[] = []

    // Use index for O(1) lookups instead of O(n²)
    const recommendationRules =
      this.validationIndex.recommendations.getAllRecommendations(pluginNames)

    for (const rule of recommendationRules) {
      if (rule.type !== 'RECOMMENDS' || !rule.plugin || !rule.recommends) {
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
 * Règles de compatibilité générées automatiquement
 *
 * Ces règles sont générées automatiquement à partir des métadonnées des plugins
 * (incompatibleWith, requires, recommends) et des catégories.
 *
 * Les règles sont générées au démarrage pour garantir qu'elles sont toujours à jour.
 */
export const compatibilityRules: CompatibilityRule[] =
  generateCompatibilityRules(pluginRegistry)

/**
 * Règles de compatibilité supplémentaires (hardcodées)
 *
 * Ces règles ne peuvent pas être générées automatiquement car elles nécessitent
 * une logique métier spécifique (incompatibilités framework-spécifiques, etc.)
 *
 * Note: Les règles EXCLUSIVE, CONFLICT entre plugins, REQUIRES et RECOMMENDS
 * sont maintenant générées automatiquement depuis les métadonnées des plugins.
 *
 * Ces règles couvrent UNIQUEMENT:
 * - Les conflits avec un framework spécifique (ex: React Router incompatible avec Next.js)
 * - Les recommandations spécifiques au framework (ex: shadcn-ui-nextjs pour Next.js)
 */
const additionalCompatibilityRules: CompatibilityRule[] = [
  // ====================================================================
  // Règles spécifiques Next.js
  // ====================================================================

  // React Router incompatible avec Next.js (routing intégré)
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

  // ====================================================================
  // Règles spécifiques Vue.js
  // ====================================================================

  // React Router incompatible avec Vue.js (utiliser Vue Router)
  {
    type: 'CONFLICT',
    plugins: ['react-router-dom'],
    framework: 'vue',
    reason:
      'React Router est incompatible avec Vue.js. Utilisez Vue Router (vue-router) pour Vue.js.',
    severity: 'error',
    allowOverride: false,
  },

  // State management React incompatible avec Vue.js
  {
    type: 'CONFLICT',
    plugins: ['zustand', '@reduxjs/toolkit', 'jotai'],
    framework: 'vue',
    reason:
      'Zustand, Redux Toolkit et Jotai sont spécifiques à React. Pour Vue.js, utilisez Pinia (state management officiel).',
    severity: 'error',
    allowOverride: false,
  },

  // Shadcn/ui incompatible avec Vue.js (spécifique React)
  {
    type: 'CONFLICT',
    plugins: ['shadcn-ui'],
    framework: 'vue',
    reason:
      'Shadcn/ui est spécifique à React. Pour Vue.js, utilisez Vuetify ou Quasar (frameworks UI Vue.js).',
    severity: 'error',
    allowOverride: false,
  },

  // Pinia nécessite Vue 3
  {
    type: 'REQUIRES',
    plugin: 'pinia',
    requires: ['vue@^3.0.0'],
    framework: 'vue',
    reason: "Pinia nécessite Vue 3. Vue 2 n'est plus supporté.",
    severity: 'error',
    allowOverride: false,
  },

  // Vue Router version doit correspondre à Vue version
  {
    type: 'CONFLICT',
    plugins: ['vue-router'],
    framework: 'vue',
    reason:
      'Assurez-vous que la version de Vue Router correspond à la version de Vue.js (Vue Router 4 pour Vue 3).',
    severity: 'warning',
    allowOverride: true,
  },
]

function normalizeArray(values?: string[]): string[] {
  if (!values || values.length === 0) {
    return []
  }
  return [...values].sort()
}

function buildRuleKey(rule: CompatibilityRule): string {
  const plugins = normalizeArray(rule.plugins).join('|')
  const requires = normalizeArray(rule.requires).join('|')
  const recommends = normalizeArray(rule.recommends).join('|')

  return [
    rule.type,
    rule.framework ?? '*',
    rule.plugin ?? '',
    plugins,
    requires,
    recommends,
    rule.severity,
    String(rule.allowOverride ?? false),
    String(rule.autoInstall ?? false),
    String(rule.prompt ?? false),
  ].join('::')
}

function deduplicateCompatibilityRules(
  rules: CompatibilityRule[]
): CompatibilityRule[] {
  const seen = new Set<string>()
  const deduplicated: CompatibilityRule[] = []

  for (const rule of rules) {
    const key = buildRuleKey(rule)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduplicated.push(rule)
  }

  return deduplicated
}

// Fusionner les règles générées avec les règles supplémentaires
// NOTE: On déduplique les règles déjà générées pour éviter les doublons
export const allCompatibilityRules: CompatibilityRule[] =
  deduplicateCompatibilityRules([
    ...compatibilityRules,
    ...additionalCompatibilityRules,
  ])
