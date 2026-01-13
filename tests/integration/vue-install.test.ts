/**
 * Integration Tests: Vue.js Installation Flow
 * Teste les workflows réels d'installation de plugins Vue.js avec memfs
 *
 * @group integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import {
  createTestProject,
  cleanupTestProject,
  readPackageJson,
  fileExists,
  getFsAdapter,
} from './memfs-test-utils.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../src/core/validator.js'
import { detectContext } from '../../src/core/detector.js'
import { pluginRegistry } from '../../src/plugins/registry.js'

describe('Integration: Vue.js Installation Flow (memfs)', () => {
  let projectPath: string

  beforeEach(() => {
    projectPath = createTestProject('vue-install-test', 'vue', {
      typescript: true,
      packageManager: 'npm',
    })
  })

  afterEach(() => {
    cleanupTestProject(projectPath)
  })

  // ===== Vue.js Project Setup =====

  it('should initialize a minimal Vue.js project structure', async () => {
    const fsAdapter = getFsAdapter()

    const hasPackageJson = fileExists(join(projectPath, 'package.json'))
    expect(hasPackageJson).toBe(true)

    const pkg = readPackageJson(projectPath)
    expect(pkg['dependencies']).toHaveProperty('vue')

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('vue')
    expect(context.vueVersion).toBe('3')
  })

  it('should detect Vue.js project correctly', async () => {
    const fsAdapter = getFsAdapter()

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('vue')
    expect(context.vueVersion).toBe('3')
    // Note: vueApi détection dépend du contenu des fichiers .vue créés
  })

  // ===== Single Vue.js Plugin Installation =====

  it('should get compatible Vue.js plugins', async () => {
    const fsAdapter = getFsAdapter()
    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('vue')

    const compatiblePlugins = pluginRegistry.filter((plugin) =>
      plugin.frameworks.includes('vue')
    )

    expect(compatiblePlugins.length).toBeGreaterThan(0)
    expect(compatiblePlugins.some((p) => p.name === 'vue-router')).toBe(true)
    expect(compatiblePlugins.some((p) => p.name === 'pinia')).toBe(true)
  })

  // ===== Compatibility Validation =====

  it('should validate Vue.js plugin compatibility', async () => {
    const fsAdapter = getFsAdapter()
    const context = await detectContext(projectPath, fsAdapter!)
    const vueRouterPlugin = pluginRegistry.find((p) => p.name === 'vue-router')
    const piniaPlugin = pluginRegistry.find((p) => p.name === 'pinia')

    expect(vueRouterPlugin).toBeDefined()
    expect(piniaPlugin).toBeDefined()

    if (vueRouterPlugin && piniaPlugin) {
      const validator = new CompatibilityValidator(compatibilityRules)
      const result = validator.validate([vueRouterPlugin, piniaPlugin], context)

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    }
  })

  it('should reject incompatible plugins with Vue.js', async () => {
    const fsAdapter = getFsAdapter()
    const context = await detectContext(projectPath, fsAdapter!)
    const reactRouterPlugin = pluginRegistry.find(
      (p) => p.name === 'react-router-dom'
    )
    const vueRouterPlugin = pluginRegistry.find((p) => p.name === 'vue-router')

    expect(reactRouterPlugin).toBeDefined()
    expect(vueRouterPlugin).toBeDefined()

    if (reactRouterPlugin && vueRouterPlugin) {
      const validator = new CompatibilityValidator(compatibilityRules)
      const result = validator.validate(
        [reactRouterPlugin, vueRouterPlugin],
        context
      )

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(
        result.errors.some((e) => e.plugins?.includes('react-router-dom'))
      ).toBe(true)
    }
  })

  // ===== Multiple Plugins Installation =====

  it('should handle multiple Vue.js plugins installation', async () => {
    const fsAdapter = getFsAdapter()
    const context = await detectContext(projectPath, fsAdapter!)
    const vuePlugins = pluginRegistry.filter((plugin) =>
      plugin.frameworks.includes('vue')
    )

    const validator = new CompatibilityValidator(compatibilityRules)
    const vueRouterPlugin = vuePlugins.find((p) => p.name === 'vue-router')
    const piniaPlugin = vuePlugins.find((p) => p.name === 'pinia')
    const vueusePlugin = vuePlugins.find((p) => p.name === '@vueuse/core')

    if (vueRouterPlugin && piniaPlugin && vueusePlugin) {
      const result = validator.validate(
        [vueRouterPlugin, piniaPlugin, vueusePlugin],
        context
      )

      // Vérifier que le contexte est bien utilisé
      expect(context.framework).toBe('vue')

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    }
  })
})
