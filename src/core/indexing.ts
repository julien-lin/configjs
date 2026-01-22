import type { CompatibilityRule } from '../types/index.js'

/**
 * Optimized indexing structures for O(1) plugin/rule lookups
 *
 * Replaces nested loop pattern (O(n²)) with Map-based indexing (O(n))
 * Used internally by CompatibilityValidator for fast compatibility checks
 *
 * @example
 * ```typescript
 * const index = ConflictIndex.build(rules)
 * const conflicts = index.getConflicts(['react-router-dom', 'zustand'])
 * // Returns all applicable conflict rules in O(n) time
 * ```
 */

/**
 * Conflict index: Maps plugin names to their conflict rules
 * Structure: Map<pluginName, CompatibilityRule[]>
 *
 * Example:
 * - 'react-router-dom' → [rule1, rule2, ...]
 * - 'zustand' → [rule1, ...]
 */
export class ConflictIndex {
  private readonly pluginToRules: Map<string, CompatibilityRule[]>
  // private readonly categoryIndex: Map<string, string[]> // Reserved for future use

  private constructor(
    pluginToRules: Map<string, CompatibilityRule[]>,
    _categoryIndex: Map<string, string[]>
  ) {
    this.pluginToRules = pluginToRules
    // this.categoryIndex = categoryIndex
  }

  /**
   * Build conflict index from rules
   * Time complexity: O(rules × plugins per rule)
   * Space complexity: O(rules × average plugins per rule)
   *
   * @param rules - All compatibility rules
   * @returns ConflictIndex instance
   */
  static build(rules: CompatibilityRule[]): ConflictIndex {
    const pluginToRules = new Map<string, CompatibilityRule[]>()
    const categoryIndex = new Map<string, string[]>()

    for (const rule of rules) {
      if (rule.type !== 'CONFLICT' || !rule.plugins) {
        continue
      }

      for (const pluginName of rule.plugins) {
        if (!pluginToRules.has(pluginName)) {
          pluginToRules.set(pluginName, [])
        }
        const rules = pluginToRules.get(pluginName)
        if (rules) {
          rules.push(rule)
        }
      }
    }

    return new ConflictIndex(pluginToRules, categoryIndex)
  }

  /**
   * Get all conflicts for a set of plugins
   * Time complexity: O(selectedPlugins) + O(rules found)
   *
   * @param pluginNames - Set of plugin names to check
   * @param rules - Rules array for fallback filtering
   * @returns Array of applicable conflict rules
   */
  getConflicts(
    pluginNames: Set<string>,
    rules: CompatibilityRule[]
  ): CompatibilityRule[] {
    const conflicts: CompatibilityRule[] = []
    const seen = new Set<CompatibilityRule>()

    // Fast path: lookup plugin rules in index
    for (const pluginName of pluginNames) {
      const rulesForPlugin = this.pluginToRules.get(pluginName)
      if (rulesForPlugin) {
        for (const rule of rulesForPlugin) {
          if (seen.has(rule)) {
            continue
          }
          seen.add(rule)

          // Check if at least 2 plugins from this rule are selected
          if (rule.plugins) {
            const selectedCount = rule.plugins.filter((p) =>
              pluginNames.has(p)
            ).length
            if (selectedCount > 1) {
              conflicts.push(rule)
            }
          }
        }
      }
    }

    // Fallback: check all rules for edge cases
    for (const rule of rules) {
      if (seen.has(rule) || rule.type !== 'CONFLICT' || !rule.plugins) {
        continue
      }

      const selectedCount = rule.plugins.filter((p) =>
        pluginNames.has(p)
      ).length
      if (selectedCount > 1) {
        conflicts.push(rule)
      }
    }

    return conflicts
  }
}

/**
 * Dependency index: Maps plugins to their required dependencies
 * Structure: Map<pluginName, CompatibilityRule>
 *
 * Example:
 * - 'react-router-dom' → [rule with requires=[...]]
 */
export class DependencyIndex {
  private readonly pluginToDeps: Map<string, CompatibilityRule>
  private readonly reverseDeps: Map<string, Set<string>> // dep → plugins that require it

  private constructor(
    pluginToDeps: Map<string, CompatibilityRule>,
    reverseDeps: Map<string, Set<string>>
  ) {
    this.pluginToDeps = pluginToDeps
    this.reverseDeps = reverseDeps
  }

  /**
   * Build dependency index from rules
   * Time complexity: O(rules × requires per rule)
   * Space complexity: O(rules + total dependencies)
   *
   * @param rules - All compatibility rules
   * @returns DependencyIndex instance
   */
  static build(rules: CompatibilityRule[]): DependencyIndex {
    const pluginToDeps = new Map<string, CompatibilityRule>()
    const reverseDeps = new Map<string, Set<string>>()

    for (const rule of rules) {
      if (rule.type !== 'REQUIRES' || !rule.plugin || !rule.requires) {
        continue
      }

      pluginToDeps.set(rule.plugin, rule)

      for (const dep of rule.requires) {
        const depName = dep.split('@')[0]
        if (!depName) continue

        if (!reverseDeps.has(depName)) {
          reverseDeps.set(depName, new Set())
        }
        const revDeps = reverseDeps.get(depName)
        if (revDeps) {
          revDeps.add(rule.plugin)
        }
      }
    }

    return new DependencyIndex(pluginToDeps, reverseDeps)
  }

  /**
   * Get dependencies for a plugin
   * Time complexity: O(1)
   *
   * @param pluginName - Plugin name
   * @returns CompatibilityRule or undefined
   */
  getDependencies(pluginName: string): CompatibilityRule | undefined {
    return this.pluginToDeps.get(pluginName)
  }

  /**
   * Get all dependencies for a set of plugins
   * Time complexity: O(selectedPlugins)
   *
   * @param pluginNames - Set of plugin names
   * @returns Array of REQUIRES rules for selected plugins
   */
  getAllDependencies(pluginNames: Set<string>): CompatibilityRule[] {
    const deps: CompatibilityRule[] = []

    for (const pluginName of pluginNames) {
      const rule = this.pluginToDeps.get(pluginName)
      if (rule) {
        deps.push(rule)
      }
    }

    return deps
  }

  /**
   * Get which plugins require a specific dependency
   * Time complexity: O(1)
   *
   * @param depName - Dependency name
   * @returns Set of plugin names that require this dependency
   */
  getPluginsRequiring(depName: string): Set<string> {
    return this.reverseDeps.get(depName) ?? new Set()
  }
}

/**
 * Recommendation index: Maps plugins to their recommended companions
 * Structure: Map<pluginName, CompatibilityRule>
 *
 * Example:
 * - 'react' → [rule with recommends=[...]]
 */
export class RecommendationIndex {
  private readonly pluginToRecs: Map<string, CompatibilityRule>

  private constructor(pluginToRecs: Map<string, CompatibilityRule>) {
    this.pluginToRecs = pluginToRecs
  }

  /**
   * Build recommendation index from rules
   * Time complexity: O(rules)
   * Space complexity: O(rules)
   *
   * @param rules - All compatibility rules
   * @returns RecommendationIndex instance
   */
  static build(rules: CompatibilityRule[]): RecommendationIndex {
    const pluginToRecs = new Map<string, CompatibilityRule>()

    for (const rule of rules) {
      if (rule.type !== 'RECOMMENDS' || !rule.plugin) {
        continue
      }

      pluginToRecs.set(rule.plugin, rule)
    }

    return new RecommendationIndex(pluginToRecs)
  }

  /**
   * Get recommendations for a plugin
   * Time complexity: O(1)
   *
   * @param pluginName - Plugin name
   * @returns CompatibilityRule or undefined
   */
  getRecommendations(pluginName: string): CompatibilityRule | undefined {
    return this.pluginToRecs.get(pluginName)
  }

  /**
   * Get all recommendations for a set of plugins
   * Time complexity: O(selectedPlugins)
   *
   * @param pluginNames - Set of plugin names
   * @returns Array of RECOMMENDS rules for selected plugins
   */
  getAllRecommendations(pluginNames: Set<string>): CompatibilityRule[] {
    const recs: CompatibilityRule[] = []

    for (const pluginName of pluginNames) {
      const rule = this.pluginToRecs.get(pluginName)
      if (rule) {
        recs.push(rule)
      }
    }

    return recs
  }
}

/**
 * Exclusivity index: Groups plugins into exclusive sets
 * Structure: Map<exclusivityGroupId, string[]>
 *
 * Example:
 * - 'state-management-group' → ['zustand', 'redux', 'jotai']
 */
export class ExclusivityIndex {
  // private readonly exclusivityGroups: Map<string, CompatibilityRule> // Reserved for future use
  private readonly pluginToRule: Map<string, CompatibilityRule>

  private constructor(
    _exclusivityGroups: Map<string, CompatibilityRule>,
    pluginToRule: Map<string, CompatibilityRule>
  ) {
    // this.exclusivityGroups = exclusivityGroups
    this.pluginToRule = pluginToRule
  }

  /**
   * Build exclusivity index from rules
   * Time complexity: O(rules × plugins per rule)
   * Space complexity: O(rules + total plugins in exclusive rules)
   *
   * @param rules - All compatibility rules
   * @returns ExclusivityIndex instance
   */
  static build(rules: CompatibilityRule[]): ExclusivityIndex {
    const exclusivityGroups = new Map<string, CompatibilityRule>()
    const pluginToRule = new Map<string, CompatibilityRule>()

    let groupId = 0
    for (const rule of rules) {
      if (rule.type !== 'EXCLUSIVE' || !rule.plugins) {
        continue
      }

      const key = `exclusive-group-${groupId++}`
      exclusivityGroups.set(key, rule)

      for (const pluginName of rule.plugins) {
        pluginToRule.set(pluginName, rule)
      }
    }

    return new ExclusivityIndex(exclusivityGroups, pluginToRule)
  }

  /**
   * Get exclusivity violations for a set of plugins
   * Time complexity: O(selectedPlugins)
   *
   * @param pluginNames - Set of plugin names to check
   * @returns Array of EXCLUSIVE violations with error properties
   */
  getViolations(pluginNames: Set<string>): Array<{
    type: 'EXCLUSIVE'
    plugins: string[]
    message: string
    canOverride: boolean
  }> {
    const violations: Array<{
      type: 'EXCLUSIVE'
      plugins: string[]
      message: string
      canOverride: boolean
    }> = []
    const seenRules = new Set<CompatibilityRule>()

    for (const pluginName of pluginNames) {
      const rule = this.pluginToRule.get(pluginName)
      if (rule && rule.plugins && !seenRules.has(rule)) {
        seenRules.add(rule)

        const selectedCount = rule.plugins.filter((p) =>
          pluginNames.has(p)
        ).length
        if (selectedCount > 1) {
          violations.push({
            type: 'EXCLUSIVE',
            plugins: rule.plugins.filter((p) => pluginNames.has(p)),
            message: rule.reason,
            canOverride: rule.allowOverride ?? false,
          })
        }
      }
    }

    return violations
  }
}

/**
 * Combined index for fast validation
 *
 * Aggregates all indexes for efficient compatibility validation
 * Reduces validation from O(n²) to O(n) time complexity
 *
 * @example
 * ```typescript
 * const index = ValidationIndex.build(rules)
 * // Now validation runs in O(n) instead of O(n²)
 * ```
 */
export class ValidationIndex {
  readonly conflicts: ConflictIndex
  readonly dependencies: DependencyIndex
  readonly recommendations: RecommendationIndex
  readonly exclusivity: ExclusivityIndex

  private constructor(
    conflicts: ConflictIndex,
    dependencies: DependencyIndex,
    recommendations: RecommendationIndex,
    exclusivity: ExclusivityIndex
  ) {
    this.conflicts = conflicts
    this.dependencies = dependencies
    this.recommendations = recommendations
    this.exclusivity = exclusivity
  }

  /**
   * Build complete validation index from rules
   * Time complexity: O(rules × average items per rule)
   * Space complexity: O(rules + total indexed items)
   *
   * @param rules - All compatibility rules
   * @returns ValidationIndex instance ready for validation
   */
  static build(rules: CompatibilityRule[]): ValidationIndex {
    return new ValidationIndex(
      ConflictIndex.build(rules),
      DependencyIndex.build(rules),
      RecommendationIndex.build(rules),
      ExclusivityIndex.build(rules)
    )
  }
}
