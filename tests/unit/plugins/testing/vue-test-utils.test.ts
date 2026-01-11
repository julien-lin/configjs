import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { vueTestUtilsPlugin } from '../../../../src/plugins/testing/vue-test-utils.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('Vue Test Utils Plugin', () => {
  let mockContext: ProjectContext

  beforeEach(() => {
    vi.clearAllMocks()

    mockContext = {
      framework: 'vue',
      frameworkVersion: '3.4.0',
      bundler: 'vite',
      bundlerVersion: '5.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/project',
      srcDir: 'src',
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: '20.0.0',
      hasGit: false,
      vueVersion: '3',
      vueApi: 'composition',
      dependencies: {},
      devDependencies: {},
    } as ProjectContext

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'modifyPackageJson').mockResolvedValue(
      undefined
    )
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('plugin metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(vueTestUtilsPlugin.name).toBe('@vue/test-utils')
      expect(vueTestUtilsPlugin.displayName).toBe('Vue Test Utils')
      expect(vueTestUtilsPlugin.category).toBe('testing')
      expect(vueTestUtilsPlugin.frameworks).toEqual(['vue'])
    })

    it('should be compatible only with Vue', () => {
      expect(vueTestUtilsPlugin.frameworks).toEqual(['vue'])
    })
  })

  describe('detect', () => {
    it('should detect when @vue/test-utils is in dependencies', () => {
      const ctx = {
        ...mockContext,
        dependencies: { '@vue/test-utils': '^2.0.0' },
      }

      const result = vueTestUtilsPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should detect when @vue/test-utils is in devDependencies', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { '@vue/test-utils': '^2.0.0' },
      }

      const result = vueTestUtilsPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false when @vue/test-utils is not installed', () => {
      const result = vueTestUtilsPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should install @vue/test-utils with Vitest', async () => {
      const result = await vueTestUtilsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain('@vue/test-utils')
      expect(result.packages.devDependencies).toContain('vitest')
      expect(result.packages.devDependencies).toContain('@vitest/ui')
    })

    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        devDependencies: { '@vue/test-utils': '^2.0.0' },
      }

      const result = await vueTestUtilsPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.message).toContain('already installed')
    })

    it('should install jsdom for DOM testing', async () => {
      const result = await vueTestUtilsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain('jsdom')
    })
  })

  describe('configure', () => {
    it('should create Vitest config for TypeScript project', async () => {
      const result = await vueTestUtilsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      const configFile = result.files.find((f) =>
        f.path?.includes('vitest.config.ts')
      )
      expect(configFile).toBeDefined()
      expect(configFile?.type).toBe('create')
    })

    it('should create Vitest config for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await vueTestUtilsPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.includes('vitest.config.js')
      )
      expect(configFile).toBeDefined()
    })

    it('should create example test file', async () => {
      const result = await vueTestUtilsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const testFile = result.files.find((f) =>
        f.path?.includes('Example.spec.ts')
      )
      expect(testFile).toBeDefined()
      expect(testFile?.content).toContain('@vue/test-utils')
    })

    it('should create composition API test for composition API projects', async () => {
      const result = await vueTestUtilsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const testFile = result.files.find((f) =>
        f.path?.includes('Example.spec.')
      )
      expect(testFile?.content).toContain('setup()')
    })

    it('should create options API test for options API projects', async () => {
      const ctx = {
        ...mockContext,
        vueApi: 'options' as const,
      }

      const result = await vueTestUtilsPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const testFile = result.files.find((f) =>
        f.path?.includes('Example.spec.')
      )
      expect(testFile?.content).toContain('data()')
    })

    it('should add test scripts to package.json', async () => {
      const result = await vueTestUtilsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const packageJsonFile = result.files.find(
        (f) => f.type === 'modify' && f.path?.includes('package.json')
      )
      expect(packageJsonFile).toBeDefined()
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await vueTestUtilsPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
