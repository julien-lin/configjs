import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { vueI18nPlugin } from '../../../../src/plugins/i18n/vue-i18n.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('Vue I18n Plugin', () => {
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
    it('should detect vue-i18n in dependencies', () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'vue-i18n': '^11.0.0' },
      }
      expect(vueI18nPlugin.detect?.(ctx)).toBe(true)
    })
  })

  describe('install', () => {
    it('should install vue-i18n', async () => {
      const result = await vueI18nPlugin.install(mockContext)
      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toContain('vue-i18n')
    })
  })

  describe('configure', () => {
    it('should create i18n files and update main.ts', async () => {
      const result = await vueI18nPlugin.configure(mockContext)
      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)
    })
  })

  describe('rollback', () => {
    it('should restore backups', async () => {
      await vueI18nPlugin.rollback?.(mockContext)
      expect(restoreSpy).toHaveBeenCalled()
    })
  })
})
