import type { Plugin, ProjectContext, Framework } from '../types/index.js'
import { Category } from '../types/index.js'
import { getModuleLogger } from '../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Registry centralisé de tous les plugins disponibles (44+ plugins)
 *
 * Ce registry contient tous les plugins organisés par catégorie.
 * Les plugins utilisent le pattern builder pour la consistance.
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

// ============================================
// AUTO-GENERATED IMPORTS FROM BUILDER FILES
// ============================================

import { framerMotionPlugin } from './animation/framer-motion-builder.js'
import { emotionPlugin } from './css/emotion-builder.js'
import { reactBootstrapPlugin } from './css/react-bootstrap-builder.js'
import { styledComponentsPlugin } from './css/styled-components-builder.js'
import { tailwindcssPlugin } from './css/tailwindcss-builder.js'
import { tailwindcssNextjsPlugin } from './css/tailwindcss-nextjs-builder.js'
import { reactHookFormPlugin } from './forms/react-hook-form-builder.js'
import { zodPlugin } from './forms/zod-builder.js'
import { svelteFormsPlugin } from './forms/svelte-superforms-builder.js'
import { axiosPlugin } from './http/axios-builder.js'
import { tanstackQueryPlugin } from './http/tanstack-query-builder.js'
import { tanstackVueQueryPlugin } from './http/tanstack-query-vue-builder.js'
import { vueI18nPlugin } from './i18n/vue-i18n-builder.js'
import { nextjsApiRoutesPlugin } from './nextjs/api-routes-builder.js'
import { nextjsFontOptimizationPlugin } from './nextjs/font-optimization-builder.js'
import { nextjsImageOptimizationPlugin } from './nextjs/image-optimization-builder.js'
import { nextjsMiddlewarePlugin } from './nextjs/middleware-builder.js'
import { reactRouterPlugin } from './routing/react-router-builder.js'
import { tanstackRouterPlugin } from './routing/tanstack-router-builder.js'
import { vueRouterPlugin } from './routing/vue-router-builder.js'
import { svelteKitPlugin } from './routing/sveltekit-builder.js'
import { jotaiPlugin } from './state/jotai-builder.js'
import { piniaPlugin } from './state/pinia-builder.js'
import { reduxToolkitPlugin } from './state/redux-toolkit-builder.js'
import { zustandPlugin } from './state/zustand-builder.js'
import { reactTestingLibraryPlugin } from './testing/react-testing-library-builder.js'
import { vueTestingLibraryPlugin } from './testing/vue-testing-library-builder.js'
import { vueTestUtilsPlugin } from './testing/vue-test-utils-builder.js'
import { svelteTestingLibraryPlugin } from './testing/svelte-testing-library-builder.js'
import { eslintPlugin } from './tooling/eslint-builder.js'
import { eslintVuePlugin } from './tooling/eslint-vue-builder.js'
import { huskyPlugin } from './tooling/husky-builder.js'
import { commitlintPlugin } from './tooling/commitlint-builder.js'
import { lintStagedPlugin } from './tooling/lint-staged-builder.js'
import { prettierPlugin } from './tooling/prettier-builder.js'
import { unpluginAutoImportPlugin } from './tooling/unplugin-auto-import-builder.js'
import { unpluginVueComponentsPlugin } from './tooling/unplugin-vue-components-builder.js'
import { vueTscPlugin } from './tooling/vue-tsc-builder.js'
import { radixUiPlugin } from './ui/radix-ui-builder.js'
import { reactHotToastPlugin } from './ui/react-hot-toast-builder.js'
import { reactHotToastNextjsPlugin } from './ui/react-hot-toast-nextjs-builder.js'
import { reactIconsPlugin } from './ui/react-icons-builder.js'
import { shadcnUiPlugin } from './ui/shadcn-ui-builder.js'
import { shadcnUiNextjsPlugin } from './ui/shadcn-ui-nextjs-builder.js'
import { vuetifyPlugin } from './ui/vuetify-builder.js'
import { skeletonUiPlugin } from './ui/skeleton-ui-builder.js'
import { dateFnsPlugin } from './utils/date-fns-builder.js'
import { vueusePlugin } from './utils/vueuse-builder.js'

// Angular plugins
import { angularRouterPlugin } from './routing/angular-router.js'
import { ngrxPlugin } from './state/ngrx.js'
import { ngrxSignalsPlugin } from './state/ngrx-signals.js'
import { angularMaterialPlugin } from './ui/angular-material.js'
import { angularAriaPlugin } from './ui/angular-aria.js'
import { angularCdkPlugin } from './ui/angular-cdk.js'
import { lucideAngularPlugin } from './ui/lucide-angular.js'
import { jasmineKarmaPlugin } from './testing/jasmine-karma.js'
import { vitestAngularPlugin } from './testing/vitest-angular.js'
import { rxjsPlugin } from './utils/rxjs.js'
import { zodAngularPlugin } from './forms/zod-angular.js'

/**
 * Registry de tous les plugins disponibles
 */
export const pluginRegistry: Plugin[] = [
  // ANIMATION
  framerMotionPlugin,

  // CSS
  emotionPlugin,
  reactBootstrapPlugin,
  styledComponentsPlugin,
  tailwindcssPlugin,
  tailwindcssNextjsPlugin,

  // FORMS
  reactHookFormPlugin,
  zodPlugin,
  zodAngularPlugin,
  svelteFormsPlugin,

  // HTTP
  axiosPlugin,
  tanstackQueryPlugin,
  tanstackVueQueryPlugin,

  // I18N
  vueI18nPlugin,

  // NEXTJS
  nextjsApiRoutesPlugin,
  nextjsFontOptimizationPlugin,
  nextjsImageOptimizationPlugin,
  nextjsMiddlewarePlugin,

  // ROUTING
  reactRouterPlugin,
  tanstackRouterPlugin,
  vueRouterPlugin,
  svelteKitPlugin,
  angularRouterPlugin,

  // STATE
  jotaiPlugin,
  piniaPlugin,
  reduxToolkitPlugin,
  zustandPlugin,
  ngrxPlugin,
  ngrxSignalsPlugin,

  // TESTING
  reactTestingLibraryPlugin,
  vueTestingLibraryPlugin,
  vueTestUtilsPlugin,
  svelteTestingLibraryPlugin,
  jasmineKarmaPlugin,
  vitestAngularPlugin,

  // TOOLING
  eslintPlugin,
  eslintVuePlugin,
  huskyPlugin,
  commitlintPlugin,
  lintStagedPlugin,
  prettierPlugin,
  unpluginAutoImportPlugin,
  unpluginVueComponentsPlugin,
  vueTscPlugin,

  // UI
  radixUiPlugin,
  reactHotToastPlugin,
  reactHotToastNextjsPlugin,
  reactIconsPlugin,
  shadcnUiPlugin,
  shadcnUiNextjsPlugin,
  vuetifyPlugin,
  skeletonUiPlugin,
  angularMaterialPlugin,
  angularAriaPlugin,
  angularCdkPlugin,
  lucideAngularPlugin,

  // UTILS
  dateFnsPlugin,
  vueusePlugin,
  rxjsPlugin,
]

// Reste du code du registry (validate, getPluginById, etc.)
// ... (copié du fichier original)

/**
 * Valide qu'un plugin respecte l'interface Plugin
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

  if (!Object.values(Category).includes(plugin.category)) {
    logger.error(
      `Plugin validation failed: invalid category '${plugin.category}'`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  if (!Array.isArray(plugin.frameworks) || plugin.frameworks.length === 0) {
    logger.error(
      `Plugin validation failed: 'frameworks' must be a non-empty array`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  if (typeof plugin.install !== 'function') {
    logger.error(`Plugin validation failed: 'install' must be a function`, {
      plugin: plugin.name,
    })
    return false
  }

  if (typeof plugin.configure !== 'function') {
    logger.error(`Plugin validation failed: 'configure' must be a function`, {
      plugin: plugin.name,
    })
    return false
  }

  return true
}

/**
 * Valide tous les plugins du registry au chargement
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

// Valider le registry au chargement
// NOTE: Les tests vont modifier pluginRegistry, donc validatedRegistry doit être dynamique
function getValidatedRegistry(): Plugin[] {
  return validateRegistry(pluginRegistry)
}

/**
 * Obtient un plugin par son ID (nom du package)
 */
export function getPluginById(id: string): Plugin | undefined {
  return getValidatedRegistry().find((p) => p.name === id)
}

/**
 * Obtient les plugins par catégorie
 */
export function getPluginsByCategory(category: Category): Plugin[] {
  return getValidatedRegistry().filter((p) => p.category === category)
}

/**
 * Obtient les plugins compatibles avec un contexte de projet donné
 */
export function getCompatiblePlugins(ctx: ProjectContext): Plugin[] {
  return getValidatedRegistry().filter((plugin) => {
    if (!plugin.frameworks.includes(ctx.framework)) {
      return false
    }

    if (plugin.requiresTypeScript === true && !ctx.typescript) {
      return false
    }

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
 */
export function getCompatiblePluginsForPlugin(
  plugin: Plugin,
  ctx: ProjectContext
): Plugin[] {
  const compatible = getCompatiblePlugins(ctx)

  if (plugin.incompatibleWith) {
    return compatible.filter((p) => !plugin.incompatibleWith?.includes(p.name))
  }

  return compatible
}

/**
 * Recherche des plugins par nom, description ou catégorie
 */
export function searchPlugins(query: string): Plugin[] {
  const lowerQuery = query.toLowerCase()

  return getValidatedRegistry().filter((plugin) => {
    if (plugin.name.toLowerCase().includes(lowerQuery)) {
      return true
    }

    if (plugin.displayName.toLowerCase().includes(lowerQuery)) {
      return true
    }

    if (plugin.description.toLowerCase().includes(lowerQuery)) {
      return true
    }

    if (plugin.category.toLowerCase().includes(lowerQuery)) {
      return true
    }

    return false
  })
}

/**
 * Obtient tous les plugins disponibles pour un framework spécifique
 */
export function getPluginsByFramework(framework: Framework): Plugin[] {
  return getValidatedRegistry().filter((p) => p.frameworks.includes(framework))
}

/**
 * Obtient les plugins déjà installés dans le projet
 */
export async function getInstalledPlugins(
  ctx: ProjectContext
): Promise<Plugin[]> {
  const plugins = getValidatedRegistry()
  const result: Plugin[] = []

  for (const p of plugins) {
    if (!p.detect) continue
    try {
      const isDetected = await p.detect(ctx)
      if (isDetected) {
        result.push(p)
      }
    } catch (error) {
      // Gère gracieusement les erreurs de détection
      // Log l'erreur pour débogage
      logger.warn(
        `Detection failed for plugin ${p.name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return result
}

/**
 * Obtient les plugins recommandés (un par catégorie) compatibles avec le contexte
 */
export function getRecommendedPlugins(ctx: ProjectContext): Plugin[] {
  const compatible = getCompatiblePlugins(ctx)
  const categoryMap = new Map<string, Plugin>()

  for (const plugin of compatible) {
    const category = plugin.category
    if (!categoryMap.has(category)) {
      categoryMap.set(category, plugin)
    }
  }

  return Array.from(categoryMap.values())
}
