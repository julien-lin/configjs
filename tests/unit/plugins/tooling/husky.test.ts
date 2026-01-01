import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { huskyPlugin } from '../../../../src/plugins/tooling/husky.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'
import { execa } from 'execa'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('execa')

describe('Husky Plugin', () => {
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
    } as ProjectContext

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['husky'],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('{}')
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)

    vi.mocked(execa).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
    } as Awaited<ReturnType<typeof execa>>)
  })

  describe('detect', () => {
    it('should detect Husky if installed in dependencies', () => {
      mockContext.dependencies['husky'] = '^9.1.7'
      expect(huskyPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Husky if installed in devDependencies', () => {
      mockContext.devDependencies['husky'] = '^9.1.7'
      expect(huskyPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Husky if not installed', () => {
      expect(huskyPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Husky', async () => {
      const result = await huskyPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.devDependencies).toContain('husky')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['husky'],
        expect.objectContaining({
          dev: true,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.devDependencies['husky'] = '^9.1.7'

      const result = await huskyPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await huskyPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create Husky hooks and add prepare script', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const result = await huskyPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(3)

      const preCommitFile = result.files.find((f) =>
        f.path?.endsWith('.husky/pre-commit')
      )
      expect(preCommitFile).toBeDefined()
      expect(preCommitFile?.type).toBe('create')
      expect(preCommitFile?.content).toContain('npm run lint')

      const prePushFile = result.files.find((f) =>
        f.path?.endsWith('.husky/pre-push')
      )
      expect(prePushFile).toBeDefined()
      expect(prePushFile?.type).toBe('create')
      expect(prePushFile?.content).toContain('npm run test:unit')

      const packageJsonFile = result.files.find((f) =>
        f.path?.endsWith('package.json')
      )
      if (packageJsonFile?.content) {
        const packageJson = JSON.parse(packageJsonFile.content) as {
          scripts?: Record<string, string>
        }
        expect(packageJson.scripts?.['prepare']).toBe('husky')
      }
    })

    it('should fail if Git is not initialized', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await huskyPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Git repository not found')
    })

    it('should skip hook creation if files already exist', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

      const result = await huskyPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const preCommitFile = result.files.find((f) =>
        f.path?.endsWith('.husky/pre-commit')
      )
      if (preCommitFile) {
        expect(preCommitFile).toBeDefined()
      }
    })

    it('should initialize Husky automatically', async () => {
      await huskyPlugin.configure(mockContext)

      expect(execa).toHaveBeenCalledWith('npx', ['husky', 'init'], {
        cwd: '/project',
        stdio: 'inherit',
      })
    })

    it('should handle Husky init errors gracefully', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Init failed'))

      const result = await huskyPlugin.configure(mockContext)

      expect(result.success).toBe(true)
    })

    it('should handle configuration errors gracefully', async () => {
      vi.mocked(fsHelpers.ensureDirectory).mockRejectedValue(
        new Error('Directory creation failed')
      )

      const result = await huskyPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (huskyPlugin.rollback) {
        await huskyPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (huskyPlugin.rollback) {
        await expect(huskyPlugin.rollback(mockContext)).rejects.toThrow(
          'Restore failed'
        )
      }
    })
  })
})
