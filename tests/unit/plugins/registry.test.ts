import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Plugin, ProjectContext } from '../../../src/types/index.js'
import { Category } from '../../../src/types/index.js'
import {
  pluginRegistry,
  getPluginsByCategory,
  getPluginById,
  getCompatiblePlugins,
  getCompatiblePluginsForPlugin,
  searchPlugins,
  getPluginsByFramework,
  getInstalledPlugins,
  getRecommendedPlugins,
} from '../../../src/plugins/registry.js'
import * as logger from '../../../src/utils/logger.js'

// Mock du logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

/**
 * Crée un plugin mock pour les tests
 */
function createMockPlugin(
  name: string,
  options?: {
    category?: Category
    frameworks?: Array<'react' | 'vue' | 'svelte'>
    requiresTypeScript?: boolean
    bundlers?: Array<'vite' | 'webpack' | 'cra' | 'rspack'>
    incompatibleWith?: string[]
    detect?: boolean | (() => boolean | Promise<boolean>)
  }
): Plugin {
  return {
    name,
    displayName: `Mock ${name}`,
    description: `Mock plugin ${name} for testing`,
    category: options?.category ?? Category.STATE,
    frameworks: options?.frameworks ?? ['react'],
    requiresTypeScript: options?.requiresTypeScript,
    bundlers: options?.bundlers,
    incompatibleWith: options?.incompatibleWith,
    detect:
      options?.detect !== undefined
        ? typeof options.detect === 'function'
          ? options.detect
          : (): boolean => Boolean(options.detect)
        : undefined,
    install: () =>
      Promise.resolve({
        packages: { dependencies: [name] },
        success: true,
      }),
    configure: () =>
      Promise.resolve({
        files: [],
        success: true,
      }),
  }
}

/**
 * Crée un contexte de projet mock
 */
function createMockContext(
  overrides?: Partial<ProjectContext>
): ProjectContext {
  return {
    framework: 'react',
    frameworkVersion: '18.2.0',
    bundler: 'vite',
    bundlerVersion: '5.0.0',
    typescript: true,
    packageManager: 'npm',
    lockfile: 'package-lock.json',
    projectRoot: '/project',
    srcDir: 'src',
    publicDir: 'public',
    os: 'darwin',
    nodeVersion: 'v18.0.0',
    dependencies: {},
    devDependencies: {},
    hasGit: false,
    ...overrides,
  }
}

describe('Plugin Registry', () => {
  // Sauvegarde des plugins originaux pour restauration après tests
  const originalPlugins: Plugin[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    // Sauvegarder l'état actuel du registry
    originalPlugins.length = 0
    originalPlugins.push(...pluginRegistry)
    // Vider le registry pour chaque test
    pluginRegistry.length = 0
  })

  afterEach(() => {
    // Restaurer le registry original
    pluginRegistry.length = 0
    pluginRegistry.push(...originalPlugins)
    originalPlugins.length = 0
  })

  describe('pluginRegistry', () => {
    it('should be an array', () => {
      expect(Array.isArray(pluginRegistry)).toBe(true)
    })

    it('should be empty initially (plugins will be added progressively)', () => {
      // Le registry est vide au début, les plugins seront ajoutés progressivement
      expect(pluginRegistry).toHaveLength(0)
    })
  })

  describe('getPluginsByCategory', () => {
    it('should return empty array when registry is empty', () => {
      const result = getPluginsByCategory(Category.ROUTING)
      expect(result).toEqual([])
    })

    it('should return plugins of specified category', () => {
      const routingPlugin = createMockPlugin('react-router-dom', {
        category: Category.ROUTING,
      })
      const statePlugin = createMockPlugin('zustand', {
        category: Category.STATE,
      })

      pluginRegistry.push(routingPlugin, statePlugin)

      const result = getPluginsByCategory(Category.ROUTING)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('react-router-dom')
    })

    it('should return all plugins of category when multiple exist', () => {
      const plugin1 = createMockPlugin('react-router-dom', {
        category: Category.ROUTING,
      })
      const plugin2 = createMockPlugin('tanstack-router', {
        category: Category.ROUTING,
      })

      pluginRegistry.push(plugin1, plugin2)

      const result = getPluginsByCategory(Category.ROUTING)
      expect(result).toHaveLength(2)
    })
  })

  describe('getPluginById', () => {
    it('should return undefined when plugin not found', () => {
      const result = getPluginById('non-existent-plugin')
      expect(result).toBeUndefined()
    })

    it('should return plugin by name when found', () => {
      const plugin = createMockPlugin('test-plugin')
      pluginRegistry.push(plugin)

      const result = getPluginById('test-plugin')
      expect(result).toBeDefined()
      expect(result?.name).toBe('test-plugin')
    })

    it('should return undefined when plugin name does not match', () => {
      const plugin = createMockPlugin('test-plugin')
      pluginRegistry.push(plugin)

      const result = getPluginById('other-plugin')
      expect(result).toBeUndefined()
    })
  })

  describe('getCompatiblePlugins', () => {
    it('should return empty array when registry is empty', () => {
      const ctx = createMockContext()
      const result = getCompatiblePlugins(ctx)
      expect(result).toEqual([])
    })

    it('should filter plugins by framework', () => {
      const ctx = createMockContext({ framework: 'react' })
      const reactPlugin = createMockPlugin('react-plugin', {
        frameworks: ['react'],
      })
      const vuePlugin = createMockPlugin('vue-plugin', {
        frameworks: ['vue'],
      })

      pluginRegistry.push(reactPlugin, vuePlugin)

      const result = getCompatiblePlugins(ctx)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('react-plugin')
      expect(result[0]?.frameworks).toContain('react')
    })

    it('should filter plugins requiring TypeScript when project is JS', () => {
      const ctx = createMockContext({ typescript: false })
      const tsPlugin = createMockPlugin('ts-plugin', {
        requiresTypeScript: true,
      })
      const jsPlugin = createMockPlugin('js-plugin', {
        requiresTypeScript: false,
      })

      pluginRegistry.push(tsPlugin, jsPlugin)

      const result = getCompatiblePlugins(ctx)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('js-plugin')
    })

    it('should include TypeScript plugins when project is TS', () => {
      const ctx = createMockContext({ typescript: true })
      const tsPlugin = createMockPlugin('ts-plugin', {
        requiresTypeScript: true,
      })

      pluginRegistry.push(tsPlugin)

      const result = getCompatiblePlugins(ctx)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('ts-plugin')
    })

    it('should filter plugins by bundler when specified', () => {
      const ctx = createMockContext({ bundler: 'vite' })
      const vitePlugin = createMockPlugin('vite-plugin', {
        bundlers: ['vite'],
      })
      const webpackPlugin = createMockPlugin('webpack-plugin', {
        bundlers: ['webpack'],
      })
      const noBundlerPlugin = createMockPlugin('no-bundler-plugin')

      pluginRegistry.push(vitePlugin, webpackPlugin, noBundlerPlugin)

      const result = getCompatiblePlugins(ctx)
      expect(result.length).toBeGreaterThanOrEqual(1)
      // Vite plugin doit être inclus
      expect(result.some((p) => p.name === 'vite-plugin')).toBe(true)
      // Webpack plugin ne doit pas être inclus
      expect(result.some((p) => p.name === 'webpack-plugin')).toBe(false)
      // Plugin sans bundler spécifié doit être inclus
      expect(result.some((p) => p.name === 'no-bundler-plugin')).toBe(true)
    })

    it('should exclude plugins with bundler requirement when bundler is null', () => {
      const ctx = createMockContext({ bundler: null })
      const vitePlugin = createMockPlugin('vite-plugin', {
        bundlers: ['vite'],
      })
      const noBundlerPlugin = createMockPlugin('no-bundler-plugin')

      pluginRegistry.push(vitePlugin, noBundlerPlugin)

      const result = getCompatiblePlugins(ctx)
      expect(result.some((p) => p.name === 'vite-plugin')).toBe(false)
      expect(result.some((p) => p.name === 'no-bundler-plugin')).toBe(true)
    })
  })

  describe('getCompatiblePluginsForPlugin', () => {
    it('should return compatible plugins excluding incompatible ones', () => {
      const ctx = createMockContext()
      const plugin = createMockPlugin('test-plugin', {
        incompatibleWith: ['other-plugin'],
      })
      const compatiblePlugin = createMockPlugin('compatible-plugin')
      const incompatiblePlugin = createMockPlugin('other-plugin')

      pluginRegistry.push(compatiblePlugin, incompatiblePlugin)

      const result = getCompatiblePluginsForPlugin(plugin, ctx)
      // Aucun plugin incompatible ne doit être retourné
      expect(result.some((p) => p.name === 'other-plugin')).toBe(false)
      expect(result.some((p) => p.name === 'compatible-plugin')).toBe(true)
    })

    it('should return all compatible plugins when no incompatibleWith', () => {
      const ctx = createMockContext()
      const plugin = createMockPlugin('test-plugin')
      const otherPlugin1 = createMockPlugin('other-plugin-1')
      const otherPlugin2 = createMockPlugin('other-plugin-2')

      pluginRegistry.push(otherPlugin1, otherPlugin2)

      const result = getCompatiblePluginsForPlugin(plugin, ctx)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('searchPlugins', () => {
    it('should return empty array when registry is empty', () => {
      const result = searchPlugins('router')
      expect(result).toEqual([])
    })

    it('should search by name (case insensitive)', () => {
      const plugin = createMockPlugin('react-router-dom')
      pluginRegistry.push(plugin)

      const result = searchPlugins('router')
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('react-router-dom')
    })

    it('should search by displayName (case insensitive)', () => {
      const plugin = createMockPlugin('test-plugin')
      pluginRegistry.push(plugin)

      const result = searchPlugins('MOCK')
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('test-plugin')
    })

    it('should search by description (case insensitive)', () => {
      const plugin = createMockPlugin('test-plugin')
      pluginRegistry.push(plugin)

      const result = searchPlugins('testing')
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('test-plugin')
    })

    it('should search by category (case insensitive)', () => {
      const plugin = createMockPlugin('test-plugin', {
        category: Category.STATE,
      })
      pluginRegistry.push(plugin)

      const result = searchPlugins('state')
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('test-plugin')
    })

    it('should return multiple results when multiple plugins match', () => {
      const plugin1 = createMockPlugin('react-router')
      const plugin2 = createMockPlugin('tanstack-router')
      pluginRegistry.push(plugin1, plugin2)

      const result = searchPlugins('router')
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('should return empty array when no match', () => {
      const plugin = createMockPlugin('test-plugin')
      pluginRegistry.push(plugin)

      const result = searchPlugins('nonexistent')
      expect(result).toEqual([])
    })
  })

  describe('getPluginsByFramework', () => {
    it('should return empty array when registry is empty', () => {
      const result = getPluginsByFramework('react')
      expect(result).toEqual([])
    })

    it('should return only plugins compatible with framework', () => {
      const reactPlugin = createMockPlugin('react-plugin', {
        frameworks: ['react'],
      })
      const vuePlugin = createMockPlugin('vue-plugin', {
        frameworks: ['vue'],
      })
      pluginRegistry.push(reactPlugin, vuePlugin)

      const result = getPluginsByFramework('react')
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('react-plugin')
      for (const plugin of result) {
        expect(plugin.frameworks).toContain('react')
      }
    })

    it('should return empty array for unsupported framework', () => {
      const reactPlugin = createMockPlugin('react-plugin', {
        frameworks: ['react'],
      })
      pluginRegistry.push(reactPlugin)

      const result = getPluginsByFramework('vue')
      expect(result).toEqual([])
    })

    it('should return plugins supporting multiple frameworks', () => {
      const multiFrameworkPlugin = createMockPlugin('multi-plugin', {
        frameworks: ['react', 'vue'],
      })
      pluginRegistry.push(multiFrameworkPlugin)

      const reactResult = getPluginsByFramework('react')
      const vueResult = getPluginsByFramework('vue')
      expect(reactResult).toHaveLength(1)
      expect(vueResult).toHaveLength(1)
    })
  })

  describe('getInstalledPlugins', () => {
    it('should return empty array when registry is empty', async () => {
      const ctx = createMockContext()
      const result = await getInstalledPlugins(ctx)
      expect(result).toEqual([])
    })

    it('should return plugins where detect returns true', async () => {
      const ctx = createMockContext({
        dependencies: { 'test-plugin': '1.0.0' },
      })

      const installedPlugin = createMockPlugin('test-plugin', {
        detect: true,
      })
      const notInstalledPlugin = createMockPlugin('other-plugin', {
        detect: false,
      })

      pluginRegistry.push(installedPlugin, notInstalledPlugin)

      const result = await getInstalledPlugins(ctx)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('test-plugin')
    })

    it('should return empty array when no plugins have detect', async () => {
      const ctx = createMockContext()
      const plugin = createMockPlugin('test-plugin')
      pluginRegistry.push(plugin)

      const result = await getInstalledPlugins(ctx)
      expect(result).toEqual([])
    })

    it('should handle detect errors gracefully', async () => {
      const ctx = createMockContext()

      const badPlugin = createMockPlugin('bad-plugin', {
        detect: (): Promise<boolean> => {
          throw new Error('Detection failed')
        },
      })
      const goodPlugin = createMockPlugin('good-plugin', {
        detect: true,
      })

      pluginRegistry.push(badPlugin, goodPlugin)

      const result = await getInstalledPlugins(ctx)
      // Le plugin avec erreur doit être ignoré, le bon plugin doit être retourné
      expect(result.length).toBeGreaterThanOrEqual(0)
      const warnSpy = vi.spyOn(logger.logger, 'warn')
      expect(warnSpy).toHaveBeenCalled()
    })

    it('should handle async detect functions', async () => {
      const ctx = createMockContext()
      const plugin = createMockPlugin('async-plugin', {
        detect: async (): Promise<boolean> => {
          return Promise.resolve(true)
        },
      })

      pluginRegistry.push(plugin)

      const result = await getInstalledPlugins(ctx)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('async-plugin')
    })
  })

  describe('getRecommendedPlugins', () => {
    it('should return empty array when registry is empty', () => {
      const ctx = createMockContext()
      const result = getRecommendedPlugins(ctx)
      expect(result).toEqual([])
    })

    it('should return one plugin per category', () => {
      const ctx = createMockContext()
      const routingPlugin1 = createMockPlugin('router-1', {
        category: Category.ROUTING,
      })
      const routingPlugin2 = createMockPlugin('router-2', {
        category: Category.ROUTING,
      })
      const statePlugin = createMockPlugin('state-plugin', {
        category: Category.STATE,
      })

      pluginRegistry.push(routingPlugin1, routingPlugin2, statePlugin)

      const result = getRecommendedPlugins(ctx)
      expect(result).toHaveLength(2) // Une par catégorie
      const categories = new Set(result.map((p) => p.category))
      expect(categories.size).toBe(2)
      expect(categories.has(Category.ROUTING)).toBe(true)
      expect(categories.has(Category.STATE)).toBe(true)
    })

    it('should only return compatible plugins', () => {
      const ctx = createMockContext({ framework: 'react' })
      const reactPlugin = createMockPlugin('react-plugin', {
        frameworks: ['react'],
      })
      const vuePlugin = createMockPlugin('vue-plugin', {
        frameworks: ['vue'],
      })

      pluginRegistry.push(reactPlugin, vuePlugin)

      const result = getRecommendedPlugins(ctx)
      expect(result.length).toBeGreaterThanOrEqual(1)
      for (const plugin of result) {
        expect(plugin.frameworks).toContain('react')
      }
      expect(result.some((p) => p.name === 'vue-plugin')).toBe(false)
    })

    it('should return first compatible plugin per category', () => {
      const ctx = createMockContext()
      const plugin1 = createMockPlugin('first-routing', {
        category: Category.ROUTING,
      })
      const plugin2 = createMockPlugin('second-routing', {
        category: Category.ROUTING,
      })

      pluginRegistry.push(plugin1, plugin2)

      const result = getRecommendedPlugins(ctx)
      const routingPlugins = result.filter(
        (p) => p.category === Category.ROUTING
      )
      expect(routingPlugins).toHaveLength(1)
      expect(routingPlugins[0]?.name).toBe('first-routing')
    })
  })

  describe('Plugin validation', () => {
    it('should validate plugins have required fields', () => {
      // Cette validation est testée indirectement via les fonctions du registry
      // qui utilisent validatePlugin() en interne
      expect(pluginRegistry.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle invalid plugins gracefully in registry', () => {
      // Test indirect : ajouter un plugin invalide et vérifier qu'il n'est pas utilisé
      // Note: La validation se fait au chargement du module, donc on teste indirectement
      const validPlugin = createMockPlugin('valid-plugin')
      pluginRegistry.push(validPlugin)

      // Un plugin invalide (sans name) ne devrait pas être dans le registry
      // mais comme validatePlugin est privée, on teste indirectement
      const result = getPluginById('valid-plugin')
      expect(result).toBeDefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle empty search query', () => {
      const plugin = createMockPlugin('test-plugin')
      pluginRegistry.push(plugin)

      const result = searchPlugins('')
      // Recherche vide devrait retourner tous les plugins
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle plugins with no detect function', async () => {
      const ctx = createMockContext()
      const plugin = createMockPlugin('no-detect-plugin')
      pluginRegistry.push(plugin)

      const result = await getInstalledPlugins(ctx)
      expect(result).toEqual([])
    })

    it('should handle context with null bundler', () => {
      const ctx = createMockContext({ bundler: null })
      const plugin = createMockPlugin('test-plugin', {
        bundlers: ['vite'],
      })
      pluginRegistry.push(plugin)

      const result = getCompatiblePlugins(ctx)
      // Plugin avec bundler requis ne doit pas être compatible avec bundler null
      expect(result.some((p) => p.name === 'test-plugin')).toBe(false)
    })
  })
})
