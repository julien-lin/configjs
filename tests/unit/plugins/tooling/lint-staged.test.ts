import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { lintStagedPlugin } from '../../../../src/plugins/tooling/lint-staged.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('lint-staged Plugin', () => {
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

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'modifyPackageJson').mockResolvedValue(
      undefined
    )
    restoreSpy = vi
      .spyOn(BackupManager.prototype, 'restoreAll')
      .mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect lint-staged in devDependencies', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { 'lint-staged': '^16.0.0' },
      }
      expect(lintStagedPlugin.detect?.(ctx)).toBe(true)
    })
  })

  describe('install', () => {
    it('should install lint-staged', async () => {
      const result = await lintStagedPlugin.install(mockContext)
      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain('lint-staged')
    })
  })

  describe('configure', () => {
    it('should create config and update package.json', async () => {
      const result = await lintStagedPlugin.configure(mockContext)
      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)
    })
  })

  describe('rollback', () => {
    it('should restore backups', async () => {
      await lintStagedPlugin.rollback?.(mockContext)
      expect(restoreSpy).toHaveBeenCalled()
    })
  })
})
