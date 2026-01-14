import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { vueTscPlugin } from '../../../../src/plugins/tooling/vue-tsc.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'

vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('vue-tsc Plugin', () => {
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

    vi.spyOn(ConfigWriter.prototype, 'modifyPackageJson').mockResolvedValue(
      undefined
    )
    restoreSpy = vi
      .spyOn(BackupManager.prototype, 'restoreAll')
      .mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect vue-tsc in devDependencies', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { 'vue-tsc': '^3.0.0' },
      }
      expect(vueTscPlugin.detect?.(ctx)).toBe(true)
    })
  })

  describe('install', () => {
    it('should install vue-tsc', async () => {
      const result = await vueTscPlugin.install(mockContext)
      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain('vue-tsc')
    })
  })

  describe('configure', () => {
    it('should add typecheck script', async () => {
      const result = await vueTscPlugin.configure(mockContext)
      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)
    })
  })

  describe('rollback', () => {
    it('should restore backups', async () => {
      await vueTscPlugin.rollback?.(mockContext)
      expect(restoreSpy).toHaveBeenCalled()
    })
  })
})
