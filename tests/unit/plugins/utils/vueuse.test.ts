import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { vueusePlugin } from '../../../../src/plugins/utils/vueuse.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('VueUse Plugin', () => {
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
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('plugin metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(vueusePlugin.name).toBe('@vueuse/core')
      expect(vueusePlugin.displayName).toBe('VueUse')
      expect(vueusePlugin.category).toBe('tooling')
      expect(vueusePlugin.frameworks).toEqual(['vue'])
    })

    it('should be compatible only with Vue', () => {
      expect(vueusePlugin.frameworks).toEqual(['vue'])
    })
  })

  describe('detect', () => {
    it('should detect when @vueuse/core is in dependencies', () => {
      const ctx = {
        ...mockContext,
        dependencies: { '@vueuse/core': '^11.0.0' },
      }

      const result = vueusePlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should detect when @vueuse/core is in devDependencies', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { '@vueuse/core': '^11.0.0' },
      }

      const result = vueusePlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false when @vueuse/core is not installed', () => {
      const result = vueusePlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should install @vueuse/core package', async () => {
      const result = await vueusePlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toContain('@vueuse/core')
    })

    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { '@vueuse/core': '^11.0.0' },
      }

      const result = await vueusePlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.message).toContain('already installed')
    })
  })

  describe('configure', () => {
    it('should create example composable for TypeScript project', async () => {
      const result = await vueusePlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      const composableFile = result.files.find((f) =>
        f.path?.includes('composables/useExample.ts')
      )
      expect(composableFile).toBeDefined()
      expect(composableFile?.type).toBe('create')
    })

    it('should create example composable for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await vueusePlugin.configure(ctx)

      expect(result.success).toBe(true)
      const composableFile = result.files.find((f) =>
        f.path?.includes('composables/useExample.js')
      )
      expect(composableFile).toBeDefined()
    })

    it('should include VueUse imports in example', async () => {
      const result = await vueusePlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const composableFile = result.files.find((f) =>
        f.path?.includes('composables/useExample')
      )
      expect(composableFile?.content).toContain('@vueuse/core')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await vueusePlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
