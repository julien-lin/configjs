import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { zodPlugin } from '../../../../src/plugins/forms/zod.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Zod Plugin', () => {
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
      packages: ['zod'],
    })

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) => p)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Zod if installed', () => {
      mockContext.dependencies['zod'] = '^3.24.1'
      expect(zodPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Zod if not installed', () => {
      expect(zodPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Zod', async () => {
      const result = await zodPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('zod')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['zod'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['zod'] = '^3.24.1'

      const result = await zodPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await zodPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create Zod schemas for TypeScript project', async () => {
      const result = await zodPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(2)

      const userSchemaFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('lib/schemas/user.ts')
      )
      expect(userSchemaFile).toBeDefined()
      expect(userSchemaFile?.content).toContain('z.object')
      expect(userSchemaFile?.content).toContain('userSchema')

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('lib/schemas/index.ts')
      )
      expect(indexFile).toBeDefined()
      expect(indexFile?.content).toContain('export')
    })

    it('should create Zod schemas for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await zodPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const userSchemaFile = result.files.find((f) =>
        f.path?.endsWith('lib/schemas/user.js')
      )
      expect(userSchemaFile).toBeDefined()

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('lib/schemas/index.js')
      )
      expect(indexFile).toBeDefined()
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await zodPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (zodPlugin.rollback) {
        await zodPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (zodPlugin.rollback) {
        await expect(zodPlugin.rollback(mockContext)).rejects.toThrow(
          'Restore failed'
        )
      }
    })
  })
})
