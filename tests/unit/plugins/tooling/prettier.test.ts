import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { prettierPlugin } from '../../../../src/plugins/tooling/prettier.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Prettier Plugin', () => {
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
      packages: ['prettier'],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('{}')
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Prettier if installed in dependencies', () => {
      mockContext.dependencies['prettier'] = '^3.7.4'
      expect(prettierPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Prettier if installed in devDependencies', () => {
      mockContext.devDependencies['prettier'] = '^3.7.4'
      expect(prettierPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Prettier if not installed', () => {
      expect(prettierPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Prettier', async () => {
      const result = await prettierPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.devDependencies).toContain('prettier')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['prettier'],
        expect.objectContaining({
          dev: true,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.devDependencies['prettier'] = '^3.7.4'

      const result = await prettierPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await prettierPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create Prettier config and ignore files', async () => {
      const result = await prettierPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(2)

      const prettierrcFile = result.files.find((f) =>
        f.path?.endsWith('.prettierrc.json')
      )
      expect(prettierrcFile).toBeDefined()
      expect(prettierrcFile?.type).toBe('create')
      if (prettierrcFile?.content) {
        const config = JSON.parse(prettierrcFile.content) as {
          singleQuote: boolean
          semi: boolean
        }
        expect(config.singleQuote).toBe(true)
        expect(config.semi).toBe(false)
      }

      const prettierignoreFile = result.files.find((f) =>
        f.path?.endsWith('.prettierignore')
      )
      expect(prettierignoreFile).toBeDefined()
      expect(prettierignoreFile?.type).toBe('create')
      expect(prettierignoreFile?.content).toContain('node_modules')
    })

    it('should skip config creation if files already exist', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

      const result = await prettierPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const prettierrcFile = result.files.find((f) =>
        f.path?.endsWith('.prettierrc.json')
      )
      expect(prettierrcFile).toBeUndefined()
    })

    it('should add format scripts to package.json', async () => {
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        JSON.stringify({ scripts: {} }, null, 2)
      )

      const result = await prettierPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const packageJsonFile = result.files.find((f) =>
        f.path?.endsWith('package.json')
      )
      if (packageJsonFile?.content) {
        const packageJson = JSON.parse(packageJsonFile.content) as {
          scripts?: Record<string, string>
        }
        expect(packageJson.scripts?.['format']).toBe('prettier --write .')
        expect(packageJson.scripts?.['format:check']).toBe('prettier --check .')
      }
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await prettierPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (prettierPlugin.rollback) {
        await prettierPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (prettierPlugin.rollback) {
        await expect(prettierPlugin.rollback(mockContext)).rejects.toThrow(
          'Restore failed'
        )
      }
    })
  })
})
