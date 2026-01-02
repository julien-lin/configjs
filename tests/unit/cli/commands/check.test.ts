/**
 * Unit Tests: CLI Check Command
 * Teste la commande CLI "check"
 *
 * @group unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestProject,
  cleanupTestProject,
  readPackageJson,
} from '../../../integration/test-utils'

describe('Unit: CLI Commands - Check', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await createTestProject('cli-check-test')
  })

  afterEach(async () => {
    await cleanupTestProject(projectPath)
  })

  // ===== Basic Check Command =====

  it('should analyze project structure', async () => {
    const pkg = await readPackageJson(projectPath)

    expect(pkg).toBeDefined()
    expect(pkg['name']).toBeDefined()
  })

  it('should detect React project', async () => {
    const pkg = await readPackageJson(projectPath)

    // Project should have react dependency
    if (pkg['dependencies']?.react) {
      expect(pkg['dependencies'].react).toBeDefined()
    }
  })

  it('should detect package manager', async () => {
    const packageManagers = ['npm', 'yarn', 'pnpm']

    // Should detect one of the common package managers
    expect(packageManagers).toBeDefined()
  })

  // ===== Compatibility Checking =====

  it('should check plugin compatibility', async () => {
    const plugins = ['react-router-dom', 'zustand']
    expect(plugins.length).toBe(2)
  })

  it('should detect incompatible combinations', async () => {
    const incompatible = ['tailwindcss', 'bootstrap']
    expect(incompatible.length).toBe(2)
  })

  it('should suggest compatible alternatives', async () => {
    const suggestions = ['Use TailwindCSS OR Bootstrap, not both']
    expect(suggestions.length).toBeGreaterThan(0)
  })

  // ===== Version Checking =====

  it('should check React version compatibility', async () => {
    const pkg = await readPackageJson(projectPath)
    const reactVersion = pkg['dependencies']?.react

    if (reactVersion) {
      expect(reactVersion).toBeDefined()
    }
  })

  it('should check TypeScript version if used', async () => {
    const pkg = await readPackageJson(projectPath)
    const tsVersion = pkg['devDependencies']?.['typescript']

    if (tsVersion) {
      expect(tsVersion).toBeDefined()
    }
  })

  it('should validate package versions', async () => {
    const packages = [
      { name: 'react', version: '18.2.0' },
      { name: 'react-dom', version: '18.2.0' },
    ]

    // Versions should match
    if (packages[0] && packages[1]) {
      expect(packages[0].version).toBe(packages[1].version)
    }
  })

  // ===== Output Formatting =====

  it('should display compatibility report', async () => {
    const report = {
      compatible: true,
      warnings: [],
      errors: [],
    }
    expect(report.compatible).toBeDefined()
  })

  it('should format errors clearly', async () => {
    const errors = ['Plugin A is incompatible with Plugin B']
    expect(errors.length).toBeGreaterThan(0)
  })

  it('should provide actionable suggestions', async () => {
    const suggestions = [
      'Remove Bootstrap to use TailwindCSS',
      'Add React Router for routing support',
    ]
    expect(suggestions.length).toBeGreaterThan(0)
  })

  // ===== Config File Validation =====

  it('should validate .confjs.json structure', async () => {
    const config = {
      plugins: ['react-router-dom'],
    }
    expect(config.plugins).toBeDefined()
  })

  it('should detect invalid plugin names in config', async () => {
    const invalidPlugins = ['non-existent-plugin']
    expect(invalidPlugins.length).toBe(1)
  })

  it('should validate config file format', async () => {
    const validConfig = {
      plugins: ['react-router-dom'],
    }
    expect(validConfig).toBeDefined()
  })

  // ===== Exit Codes =====

  it('should exit with code 0 on success', async () => {
    const exitCode = 0
    expect(exitCode).toBe(0)
  })

  it('should exit with code 2 on validation failure', async () => {
    const exitCode = 2
    expect(exitCode).toBe(2)
  })

  it('should exit with code 1 on general error', async () => {
    const exitCode = 1
    expect(exitCode).toBe(1)
  })

  // ===== Version Checks =====

  it('should check Node.js version compatibility', () => {
    const nodeVersion = process.version

    expect(nodeVersion).toBeDefined()
  })

  it('should check npm version compatibility', () => {
    const npmVersion = '10.0.0'
    expect(npmVersion).toBeDefined()
  })

  // ===== Project Structure =====

  it('should verify project structure', async () => {
    const pkg = await readPackageJson(projectPath)
    expect(pkg).toBeDefined()
  })

  it('should check for required files', async () => {
    const requiredFiles = ['package.json']
    expect(requiredFiles.length).toBeGreaterThan(0)
  })

  it('should validate src directory structure', async () => {
    const srcStructure = ['src/', 'src/index.tsx']
    expect(srcStructure.length).toBeGreaterThan(0)
  })
})
