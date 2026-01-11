import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { vueRouterPlugin } from '../../../../src/plugins/routing/vue-router.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('Vue Router Plugin', () => {
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
      expect(vueRouterPlugin.name).toBe('vue-router')
      expect(vueRouterPlugin.displayName).toBe('Vue Router')
      expect(vueRouterPlugin.category).toBe('routing')
      expect(vueRouterPlugin.frameworks).toEqual(['vue'])
    })

    it('should be compatible only with Vue', () => {
      expect(vueRouterPlugin.frameworks).toEqual(['vue'])
    })
  })

  describe('detect', () => {
    it('should detect when vue-router is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'vue-router': '^4.0.0' },
      }

      const result = vueRouterPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false when vue-router is not installed', () => {
      const result = vueRouterPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should install vue-router package', async () => {
      const result = await vueRouterPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toContain('vue-router@4')
    })

    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'vue-router': '^4.0.0' },
      }

      const result = await vueRouterPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.message).toContain('already installed')
    })
  })

  describe('configure', () => {
    it('should create router configuration for TypeScript project', async () => {
      const result = await vueRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      const routerFile = result.files.find((f) =>
        f.path?.includes('router/index.ts')
      )
      expect(routerFile).toBeDefined()
      expect(routerFile?.type).toBe('create')
    })

    it('should create router configuration for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await vueRouterPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const routerFile = result.files.find((f) =>
        f.path?.includes('router/index.js')
      )
      expect(routerFile).toBeDefined()
    })

    it('should create example views', async () => {
      const result = await vueRouterPlugin.configure(mockContext)

      const homeView = result.files.find((f) =>
        f.path?.includes('views/HomeView.vue')
      )
      const aboutView = result.files.find((f) =>
        f.path?.includes('views/AboutView.vue')
      )

      expect(homeView).toBeDefined()
      expect(aboutView).toBeDefined()
    })

    it('should update main file with router import', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        "import { createApp } from 'vue'\nimport App from './App.vue'\n\nconst app = createApp(App)\napp.mount('#app')"
      )

      const result = await vueRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const modifyOperation = result.files.find(
        (f) => f.type === 'modify' && f.path?.includes('main.ts')
      )
      expect(modifyOperation).toBeDefined()
    })

    it('should handle composition API configuration', async () => {
      const result = await vueRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const routerFile = result.files.find((f) =>
        f.path?.includes('router/index')
      )
      expect(routerFile?.content).toContain('createRouter')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await vueRouterPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
