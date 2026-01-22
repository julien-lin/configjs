/**
 * Integration Tests: Svelte Installation Flow
 * Teste les workflows réels d'installation de plugins Svelte avec memfs
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
  writeFile,
  getFsAdapter,
} from './memfs-test-utils.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../src/core/validator.js'
import { detectContext } from '../../src/core/detector.js'
import { pluginRegistry } from '../../src/plugins/registry.js'

describe('Integration: Svelte Installation Flow (memfs)', () => {
  let projectPath: string

  beforeEach(() => {
    projectPath = createTestProject('svelte-install-test', 'svelte', {
      typescript: true,
      packageManager: 'npm',
    })
  })

  afterEach(() => {
    cleanupTestProject(projectPath)
  })

  // ===== Svelte Project Setup =====

  it('should initialize a minimal Svelte project structure', async () => {
    const fsAdapter = getFsAdapter()

    const hasPackageJson = fileExists(join(projectPath, 'package.json'))
    expect(hasPackageJson).toBe(true)

    const pkg = readPackageJson(projectPath)
    expect(pkg['dependencies']).toHaveProperty('svelte')

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('svelte')
  })

  it('should detect Svelte project correctly', async () => {
    const fsAdapter = getFsAdapter()

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('svelte')
    expect(context.projectRoot).toBeDefined()
    expect(context.packageManager).toBeDefined()
  })

  // ===== Svelte Plugin Installation =====

  it('should get compatible Svelte plugins', async () => {
    const fsAdapter = getFsAdapter()
    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('svelte')

    const compatiblePlugins = pluginRegistry.filter((plugin) =>
      plugin.frameworks.includes('svelte')
    )

    expect(compatiblePlugins.length).toBeGreaterThan(0)
    expect(compatiblePlugins.some((p) => p.name === '@sveltejs/kit')).toBe(true)
    expect(
      compatiblePlugins.some((p) => p.name === 'sveltekit-superforms')
    ).toBe(true)
  })

  it('should validate Svelte plugin compatibility', async () => {
    const fsAdapter = getFsAdapter()
    const context = await detectContext(projectPath, fsAdapter!)
    const svelteKitPlugin = pluginRegistry.find(
      (p) => p.name === '@sveltejs/kit'
    )
    const superformsPlugin = pluginRegistry.find(
      (p) => p.name === 'sveltekit-superforms'
    )

    expect(svelteKitPlugin).toBeDefined()
    expect(superformsPlugin).toBeDefined()

    if (svelteKitPlugin && superformsPlugin) {
      const validator = new CompatibilityValidator(compatibilityRules)
      const result = validator.validate(
        [svelteKitPlugin, superformsPlugin],
        context
      )

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    }
  })

  // ===== File Structure Verification =====

  it('should create correct Svelte project structure', async () => {
    writeFile(
      join(projectPath, 'src', 'App.svelte'),
      '<script></script>\n\n<div>Hello Svelte</div>'
    )

    const appExists = fileExists(join(projectPath, 'src', 'App.svelte'))
    const mainExists = fileExists(join(projectPath, 'src', 'main.ts'))

    expect(appExists).toBe(true)
    expect(mainExists).toBe(true)
  })

  it('should not expose React-only plugins for Svelte projects', () => {
    const reactRouterPlugin = pluginRegistry.find(
      (p) => p.name === 'react-router-dom'
    )

    if (reactRouterPlugin) {
      expect(reactRouterPlugin.frameworks).not.toContain('svelte')
    }
  })
})
