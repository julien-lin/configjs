/**
 * Integration Tests: Vue.js Installation Flow
 * Teste les workflows réels d'installation de plugins Vue.js
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
} from './test-utils.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../src/core/validator.js'
import { detectContext } from '../../src/core/detector.js'
import { pluginRegistry } from '../../src/plugins/registry.js'

describe('Integration: Vue.js Installation Flow', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await createTestProject('vue-install-test')
  })

  afterEach(async () => {
    await cleanupTestProject(projectPath)
  })

  // ===== Vue.js Project Setup =====

  it('should initialize a minimal Vue.js project structure', async () => {
    // Créer package.json Vue.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      vue: '^3.4.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    // Créer structure Vue.js
    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'src'), { recursive: true })
    )

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'src', 'main.ts'),
        "import { createApp } from 'vue'\nconst app = createApp({})\napp.mount('#app')"
      )
    )

    const hasPackageJson = await fileExists(join(projectPath, 'package.json'))
    expect(hasPackageJson).toBe(true)

    const updatedPkg = await readPackageJson(projectPath)
    expect(updatedPkg['dependencies']).toHaveProperty('vue')

    const context = await detectContext(projectPath)
    expect(context.framework).toBe('vue')
    expect(context.vueVersion).toBe('3')
  })

  it('should detect Vue.js project correctly', async () => {
    // Créer projet Vue.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      vue: '^3.4.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    // Créer fichier Vue avec Composition API
    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'src'), { recursive: true })
    )

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'src', 'App.vue'),
        '<template><div>App</div></template>\n<script setup>\n// Composition API\n</script>'
      )
    )

    const context = await detectContext(projectPath)
    expect(context.framework).toBe('vue')
    expect(context.vueVersion).toBe('3')
    expect(context.vueApi).toBe('composition')
    expect(context.projectRoot).toBeDefined()
    expect(context.packageManager).toBeDefined()
  })

  it('should detect Options API correctly', async () => {
    // Créer projet Vue.js avec Options API
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      vue: '^3.4.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    // Créer fichier Vue avec Options API
    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'src'), { recursive: true })
    )

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'src', 'App.vue'),
        '<template><div>App</div></template>\n<script>\nexport default {\n  name: "App"\n}\n</script>'
      )
    )

    const context = await detectContext(projectPath)
    expect(context.framework).toBe('vue')
    expect(context.vueVersion).toBe('3')
    expect(context.vueApi).toBe('options')
  })

  // ===== Single Vue.js Plugin Installation =====

  it('should get compatible Vue.js plugins', async () => {
    // Créer projet Vue.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      vue: '^3.4.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    const context = await detectContext(projectPath)
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
    // Créer projet Vue.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      vue: '^3.4.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    const context = await detectContext(projectPath)
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
    // Créer projet Vue.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      vue: '^3.4.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    const context = await detectContext(projectPath)
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
    // Créer projet Vue.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      vue: '^3.4.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    const context = await detectContext(projectPath)
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
