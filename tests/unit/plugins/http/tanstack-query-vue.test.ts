import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { tanstackVueQueryPlugin } from '../../../../src/plugins/http/tanstack-query-vue.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('TanStack Vue Query Plugin', () => {
  let mockContext: ProjectContext
  let restoreSpy!: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockContext = {
      framework: 'vue',
      frameworkVersion: '3.5.0',
      bundler: 'vite',
      bundlerVersion: '7.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/project',
      srcDir: 'src',
      dependencies: {},
      devDependencies: {},
    } as ProjectContext

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
      "import { createApp } from 'vue'\nconst app = createApp(App)\napp.mount('#app')\n"
    )
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    restoreSpy = vi
      .spyOn(BackupManager.prototype, 'restoreAll')
      .mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect @tanstack/vue-query in dependencies', () => {
      const ctx = {
        ...mockContext,
        dependencies: { '@tanstack/vue-query': '^5.0.0' },
      }
      expect(tanstackVueQueryPlugin.detect?.(ctx)).toBe(true)
    })
  })

  describe('install', () => {
    it('should install @tanstack/vue-query', async () => {
      const result = await tanstackVueQueryPlugin.install(mockContext)
      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toContain('@tanstack/vue-query')
    })
  })

  describe('configure', () => {
    it('should create query client file and update main.ts', async () => {
      const result = await tanstackVueQueryPlugin.configure(mockContext)
      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)
    })
  })

  describe('rollback', () => {
    it('should restore backups', async () => {
      await tanstackVueQueryPlugin.rollback?.(mockContext)
      expect(restoreSpy).toHaveBeenCalled()
    })
  })
})
