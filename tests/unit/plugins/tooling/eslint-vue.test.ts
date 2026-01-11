import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { eslintVuePlugin } from '../../../../src/plugins/tooling/eslint-vue.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('ESLint Vue Plugin', () => {
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

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('plugin metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(eslintVuePlugin.name).toBe('eslint-plugin-vue')
      expect(eslintVuePlugin.displayName).toBe('ESLint Vue')
      expect(eslintVuePlugin.category).toBe('tooling')
      expect(eslintVuePlugin.frameworks).toEqual(['vue'])
    })

    it('should be compatible only with Vue', () => {
      expect(eslintVuePlugin.frameworks).toEqual(['vue'])
    })
  })

  describe('detect', () => {
    it('should detect when eslint-plugin-vue is in dependencies', () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'eslint-plugin-vue': '^9.0.0' },
      }

      const result = eslintVuePlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should detect when eslint-plugin-vue is in devDependencies', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { 'eslint-plugin-vue': '^9.0.0' },
      }

      const result = eslintVuePlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false when eslint-plugin-vue is not installed', () => {
      const result = eslintVuePlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should install eslint-plugin-vue and related packages', async () => {
      const result = await eslintVuePlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain('eslint-plugin-vue')
      expect(result.packages.devDependencies).toContain('eslint')
    })

    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        devDependencies: { 'eslint-plugin-vue': '^9.0.0' },
      }

      const result = await eslintVuePlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.message).toContain('already installed')
    })

    it('should install TypeScript ESLint packages for TypeScript projects', async () => {
      const result = await eslintVuePlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain('typescript-eslint')
    })

    it('should not install TypeScript ESLint packages for JavaScript projects', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await eslintVuePlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).not.toContain('typescript-eslint')
    })
  })

  describe('configure', () => {
    it('should create ESLint config for Vue 3 TypeScript project', async () => {
      const result = await eslintVuePlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      const configFile = result.files.find((f) =>
        f.path?.includes('eslint.config.')
      )
      expect(configFile).toBeDefined()
      expect(configFile?.type).toBe('create')
    })

    it('should create ESLint config for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await eslintVuePlugin.configure(ctx)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.includes('eslint.config.')
      )
      expect(configFile).toBeDefined()
    })

    it('should include Vue 3 specific ESLint rules', async () => {
      const result = await eslintVuePlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.includes('eslint.config.')
      )
      expect(configFile?.content).toContain('eslint-plugin-vue')
      expect(configFile?.content).toContain('flat/recommended')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await eslintVuePlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
