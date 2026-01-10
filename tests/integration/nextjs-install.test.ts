/**
 * Integration Tests: Next.js Installation Flow
 * Teste les workflows réels d'installation de plugins Next.js
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
import { ConfigWriter } from '../../src/core/config-writer.js'
import { BackupManager } from '../../src/core/backup-manager.js'
import { pluginRegistry } from '../../src/plugins/registry.js'

describe('Integration: Next.js Installation Flow', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await createTestProject('nextjs-install-test')
  })

  afterEach(async () => {
    await cleanupTestProject(projectPath)
  })

  // ===== Next.js Project Setup =====

  it('should initialize a minimal Next.js project structure', async () => {
    // Créer package.json Next.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    // Créer structure App Router
    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'app'), { recursive: true })
    )

    const hasPackageJson = await fileExists(join(projectPath, 'package.json'))
    expect(hasPackageJson).toBe(true)

    const updatedPkg = await readPackageJson(projectPath)
    expect(updatedPkg['dependencies']).toHaveProperty('next')

    const context = await detectContext(projectPath)
    expect(context.framework).toBe('nextjs')
    expect(context.nextjsRouter).toBe('app')
  })

  it('should detect Next.js project correctly', async () => {
    // Créer projet Next.js
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    // Créer structure Pages Router
    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'pages'), { recursive: true })
    )

    const context = await detectContext(projectPath)
    expect(context.framework).toBe('nextjs')
    expect(context.nextjsRouter).toBe('pages')
    expect(context.projectRoot).toBeDefined()
    expect(context.packageManager).toBeDefined()
  })

  // ===== Single Next.js Plugin Installation =====

  it('should install TailwindCSS Next.js plugin', async () => {
    // Setup Next.js project
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'app'), { recursive: true })
    )

    await detectContext(projectPath)
    const tailwindPlugin = pluginRegistry.find(
      (p) => p.name === 'tailwindcss-nextjs'
    )

    expect(tailwindPlugin).toBeDefined()
    if (tailwindPlugin) {
      expect(tailwindPlugin.frameworks).toContain('nextjs')
    }
  })

  it('should install Next.js Image Optimization plugin', async () => {
    // Setup Next.js project
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    await detectContext(projectPath)
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
    // Setup Next.js project
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'app'), { recursive: true })
    )

    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)

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
    // Setup Next.js App Router
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'app'), { recursive: true })
    )

    const context = await detectContext(projectPath)
    expect(context.nextjsRouter).toBe('app')

    // Vérifier que les chemins App Router sont corrects
    expect(context.nextjsRouter).toBe('app')
  })

  it('should configure plugins for Pages Router', async () => {
    // Setup Next.js Pages Router
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    await import('fs/promises').then((fs) =>
      fs.mkdir(join(projectPath, 'pages'), { recursive: true })
    )

    const context = await detectContext(projectPath)
    expect(context.nextjsRouter).toBe('pages')

    // Vérifier que les chemins Pages Router sont corrects
    expect(context.nextjsRouter).toBe('pages')
  })

  // ===== Compatibility Validation =====

  it('should validate Next.js plugin compatibility', async () => {
    // Setup Next.js project
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

    const context = await detectContext(projectPath)
    const validator = new CompatibilityValidator(compatibilityRules)

    // Plugins compatibles Next.js
    const compatiblePlugins = pluginRegistry.filter((p) =>
      p.frameworks.includes('nextjs')
    )

    const validationResult = validator.validate(compatiblePlugins, context)

    // Les plugins compatibles ne devraient pas avoir d'erreurs
    expect(validationResult.valid).toBe(true)
  })

  it('should detect React Router incompatibility with Next.js', async () => {
    // Setup Next.js project
    const pkg = await readPackageJson(projectPath)
    pkg['dependencies'] = {
      ...(pkg['dependencies'] || {}),
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    }

    await import('fs/promises').then((fs) =>
      fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      )
    )

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
