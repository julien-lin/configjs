import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { piniaPlugin } from '../../../../src/plugins/state/pinia.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('Pinia Plugin', () => {
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
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('plugin metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(piniaPlugin.name).toBe('pinia')
      expect(piniaPlugin.displayName).toBe('Pinia')
      expect(piniaPlugin.category).toBe('state')
      expect(piniaPlugin.frameworks).toEqual(['vue'])
    })

    it('should be compatible only with Vue', () => {
      expect(piniaPlugin.frameworks).toEqual(['vue'])
    })
  })

  describe('detect', () => {
    it('should detect when pinia is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { pinia: '^2.0.0' },
      }

      const result = piniaPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false when pinia is not installed', () => {
      const result = piniaPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should install pinia package for Vue 3', async () => {
      const result = await piniaPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toContain('pinia')
    })

    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { pinia: '^2.0.0' },
      }

      const result = await piniaPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.message).toContain('already installed')
    })

    it('should fail if not Vue 3', async () => {
      const ctx = {
        ...mockContext,
        vueVersion: '2' as any,
      }

      const result = await piniaPlugin.install(ctx)

      expect(result.success).toBe(false)
      expect(result.message).toContain('requires Vue 3')
    })
  })

  describe('configure', () => {
    it('should create store configuration for TypeScript project', async () => {
      const result = await piniaPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      const storeFile = result.files.find((f) =>
        f.path?.includes('stores/counter.ts')
      )
      expect(storeFile).toBeDefined()
      expect(storeFile?.type).toBe('create')
    })

    it('should create store configuration for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await piniaPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const storeFile = result.files.find((f) =>
        f.path?.includes('stores/counter.js')
      )
      expect(storeFile).toBeDefined()
    })

    it('should create composition API stores', async () => {
      const result = await piniaPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const storeFile = result.files.find((f) =>
        f.path?.includes('stores/counter')
      )
      expect(storeFile?.content).toContain('defineStore')
    })

    it('should update main file with pinia import', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        "import { createApp } from 'vue'\nimport App from './App.vue'\n\nconst app = createApp(App)\napp.mount('#app')"
      )

      const result = await piniaPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const modifyOperation = result.files.find(
        (f) => f.type === 'modify' && f.path?.includes('main.ts')
      )
      expect(modifyOperation).toBeDefined()
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await piniaPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
