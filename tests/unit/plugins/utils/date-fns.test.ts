import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { dateFnsPlugin } from '../../../../src/plugins/utils/date-fns.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('date-fns Plugin', () => {
  let mockContext: ProjectContext

  beforeEach(() => {
    vi.clearAllMocks()

    mockContext = {
      framework: 'react',
      frameworkVersion: '18.2.0',
      bundler: 'vite',
      bundlerVersion: '5.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/project',
      srcDir: 'src',
      dependencies: {},
      devDependencies: {},
    } as unknown as ProjectContext

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['date-fns'],
    })

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect date-fns if installed', () => {
      mockContext.dependencies['date-fns'] = '^4.1.0'
      expect(dateFnsPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect date-fns if not installed', () => {
      expect(dateFnsPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install date-fns', async () => {
      const result = await dateFnsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('date-fns')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['date-fns'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['date-fns'] = '^4.1.0'

      const result = await dateFnsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })
  })

  describe('configure', () => {
    it('should create date utilities for TypeScript project', async () => {
      const result = await dateFnsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(1)

      const dateUtilsFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('lib/utils/date.ts')
      )
      expect(dateUtilsFile).toBeDefined()
      expect(dateUtilsFile?.content).toContain('date-fns')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (dateFnsPlugin.rollback) {
        await dateFnsPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})

