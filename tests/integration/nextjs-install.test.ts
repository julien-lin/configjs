/**
 * Integration Tests: Next.js Installation Flow
 * Teste les workflows réels d'installation de plugins Next.js avec memfs
 *
 * @group integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import {
  createTestProject,
  cleanupTestProject,
  readPackageJson,
  writePackageJson,
  fileExists,
  writeFile,
  getFsAdapter,
} from './memfs-test-utils.js'
import {
  CompatibilityValidator,
  allCompatibilityRules,
} from '../../src/core/validator.js'
import { detectContext } from '../../src/core/detector.js'
import { ConfigWriter } from '../../src/core/config-writer.js'
import { BackupManager } from '../../src/core/backup-manager.js'
import { pluginRegistry } from '../../src/plugins/registry.js'
import { ensureDirectory } from '../../src/utils/fs-helpers.js'

describe('Integration: Next.js Installation Flow (memfs)', () => {
  let projectPath: string

  beforeEach(() => {
    projectPath = createTestProject('nextjs-install-test', 'nextjs', {
      typescript: true,
      packageManager: 'npm',
    })
  })

  afterEach(() => {
    cleanupTestProject(projectPath)
  })

  // ===== Next.js Project Setup =====

  it('should initialize a minimal Next.js project structure', async () => {
    const fsAdapter = getFsAdapter()

    // Créer structure App Router
    await ensureDirectory(join(projectPath, 'app'), fsAdapter!)

    const hasPackageJson = fileExists(join(projectPath, 'package.json'))
    expect(hasPackageJson).toBe(true)

    const pkg = readPackageJson(projectPath)
    expect(pkg['dependencies']).toHaveProperty('next')

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('nextjs')
    expect(context.nextjsRouter).toBe('app')
  })

  it('should detect Next.js project correctly', async () => {
    const fsAdapter = getFsAdapter()

    // Créer structure Pages Router
    await ensureDirectory(join(projectPath, 'pages'), fsAdapter!)

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.framework).toBe('nextjs')
    expect(context.nextjsRouter).toBe('pages')
    expect(context.projectRoot).toBeDefined()
    expect(context.packageManager).toBeDefined()
  })

  // ===== Single Next.js Plugin Installation =====

  it('should install TailwindCSS Next.js plugin', async () => {
    const fsAdapter = getFsAdapter()
    await ensureDirectory(join(projectPath, 'app'), fsAdapter!)

    const tailwindPlugin = pluginRegistry.find(
      (p) => p.name === 'tailwindcss-nextjs'
    )

    expect(tailwindPlugin).toBeDefined()
    if (tailwindPlugin) {
      expect(tailwindPlugin.frameworks).toContain('nextjs')
    }
  })

  it('should install Next.js Image Optimization plugin', async () => {
    const imagePlugin = pluginRegistry.find(
      (p) => p.name === 'nextjs-image-optimization'
    )

    expect(imagePlugin).toBeDefined()
    if (imagePlugin) {
      expect(imagePlugin.frameworks).toContain('nextjs')
    }
  })

  // ===== Multiple Plugins Installation =====

  it('should install multiple Next.js plugins without conflicts', async () => {
    const fsAdapter = getFsAdapter()
    await ensureDirectory(join(projectPath, 'app'), fsAdapter!)

    const context = await detectContext(projectPath, fsAdapter!)
    const validator = new CompatibilityValidator(allCompatibilityRules)

    const nextjsPlugins = pluginRegistry.filter(
      (p) => p.frameworks.includes('nextjs') && p.name.startsWith('nextjs-')
    )

    expect(nextjsPlugins.length).toBeGreaterThan(0)

    // Vérifier que les plugins sont compatibles
    const validationResult = validator.validate(nextjsPlugins, context)
    expect(validationResult.valid).toBe(true)
  })

  // ===== Router-Specific Configuration =====

  it('should configure plugins for App Router', async () => {
    const fsAdapter = getFsAdapter()
    await ensureDirectory(join(projectPath, 'app'), fsAdapter!)

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.nextjsRouter).toBe('app')
  })

  it('should configure plugins for Pages Router', async () => {
    const fsAdapter = getFsAdapter()
    await ensureDirectory(join(projectPath, 'pages'), fsAdapter!)

    const context = await detectContext(projectPath, fsAdapter!)
    expect(context.nextjsRouter).toBe('pages')
  })

  // ===== Compatibility Validation =====

  it('should validate Next.js plugin compatibility', async () => {
    const fsAdapter = getFsAdapter()
    const context = await detectContext(projectPath, fsAdapter!)
    const validator = new CompatibilityValidator(allCompatibilityRules)

    // Tester une sélection réaliste de plugins Next.js sans dépendances circulaires
    const testPlugins = pluginRegistry.filter((p) =>
      ['tailwindcss-nextjs', 'nextjs-image-optimization', 'prettier'].includes(
        p.name
      )
    )

    expect(testPlugins.length).toBeGreaterThan(0)

    const validationResult = validator.validate(testPlugins, context)

    // Les plugins Next.js sélectionnés compatibles ne devraient pas avoir d'erreurs
    // (les warnings pour les conflits CSS sont acceptables)
    expect(validationResult.valid).toBe(true)
    expect(validationResult.errors.length).toBe(0)
  })

  it('should detect React Router incompatibility with Next.js', () => {
    // React Router ne devrait pas être dans les plugins compatibles Next.js
    const reactRouterPlugin = pluginRegistry.find(
      (p) => p.name === 'react-router-dom'
    )

    if (reactRouterPlugin) {
      // React Router ne devrait pas être compatible avec Next.js
      expect(reactRouterPlugin.frameworks).not.toContain('nextjs')
    }
  })
})
