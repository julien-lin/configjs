import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { eslintPlugin } from '../../../../src/plugins/tooling/eslint.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('ESLint Plugin', () => {
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
      packages: ['eslint', '@eslint/js', 'eslint-plugin-react'],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('{}')
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) => p)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect ESLint if installed in dependencies', () => {
      mockContext.dependencies['eslint'] = '^9.39.2'
      expect(eslintPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect ESLint if installed in devDependencies', () => {
      mockContext.devDependencies['eslint'] = '^9.39.2'
      expect(eslintPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect ESLint if not installed', () => {
      expect(eslintPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install ESLint with React and TypeScript plugins', async () => {
      const result = await eslintPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.devDependencies).toContain('eslint')
      expect(result.packages?.devDependencies).toContain('@eslint/js')
      expect(result.packages?.devDependencies).toContain('eslint-plugin-react')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        expect.arrayContaining(['eslint', '@eslint/js', 'eslint-plugin-react']),
        expect.objectContaining({
          dev: true,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should install TypeScript ESLint plugins for TypeScript projects', async () => {
      const result = await eslintPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        expect.arrayContaining(['typescript-eslint']),
        expect.objectContaining({
          dev: true,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.devDependencies['eslint'] = '^9.39.2'

      const result = await eslintPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await eslintPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create ESLint config for TypeScript React project', async () => {
      const result = await eslintPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.endsWith('eslint.config.js')
      )
      expect(configFile).toBeDefined()
      expect(configFile?.type).toBe('create')
      expect(configFile?.content).toContain('typescript-eslint')
      expect(configFile?.content).toContain('eslint-plugin-react')
    })

    it('should create ESLint config for JavaScript React project', async () => {
      mockContext.typescript = false

      const result = await eslintPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.endsWith('eslint.config.js')
      )
      expect(configFile).toBeDefined()
      expect(configFile?.content).toContain('eslint-plugin-react')
      expect(configFile?.content).not.toContain('typescript-eslint')
    })

    it('should skip config creation if eslint.config.js already exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)

      const result = await eslintPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.endsWith('eslint.config.js')
      )
      expect(configFile).toBeUndefined()
    })

    it('should add lint scripts to package.json', async () => {
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        JSON.stringify({ scripts: {} }, null, 2)
      )

      const result = await eslintPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const packageJsonFile = result.files.find((f) =>
        f.path?.endsWith('package.json')
      )
      if (packageJsonFile?.content) {
        const packageJson = JSON.parse(packageJsonFile.content) as {
          scripts?: Record<string, string>
        }
        expect(packageJson.scripts?.['lint']).toBe('eslint .')
        expect(packageJson.scripts?.['lint:fix']).toBe('eslint . --fix')
      }
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await eslintPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (eslintPlugin.rollback) {
        await eslintPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (eslintPlugin.rollback) {
        await expect(eslintPlugin.rollback(mockContext)).rejects.toThrow(
          'Restore failed'
        )
      }
    })
  })
})
