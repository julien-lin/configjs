import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reactHookFormPlugin } from '../../../../src/plugins/forms/react-hook-form.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('React Hook Form Plugin', () => {
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
      packages: ['react-hook-form'],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) => p)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect React Hook Form if react-hook-form is installed', () => {
      mockContext.dependencies['react-hook-form'] = '^7.69.0'
      expect(reactHookFormPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect React Hook Form if installed in devDependencies', () => {
      mockContext.devDependencies['react-hook-form'] = '^7.69.0'
      expect(reactHookFormPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect React Hook Form if not installed', () => {
      expect(reactHookFormPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install React Hook Form', async () => {
      const result = await reactHookFormPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('react-hook-form')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['react-hook-form'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['react-hook-form'] = '^7.69.0'

      const result = await reactHookFormPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await reactHookFormPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create form examples for TypeScript project', async () => {
      const result = await reactHookFormPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(3)

      const exampleFormFile = result.files.find((f) =>
        f.path?.endsWith('components/forms/ExampleForm.tsx')
      )
      expect(exampleFormFile).toBeDefined()
      expect(exampleFormFile?.type).toBe('create')
      expect(exampleFormFile?.content).toContain('useForm')
      expect(exampleFormFile?.content).toContain('register')
      expect(exampleFormFile?.content).toContain('handleSubmit')

      const validatedFormFile = result.files.find((f) =>
        f.path?.endsWith('components/forms/ValidatedForm.tsx')
      )
      expect(validatedFormFile).toBeDefined()
      expect(validatedFormFile?.type).toBe('create')
      expect(validatedFormFile?.content).toContain('min')
      expect(validatedFormFile?.content).toContain('max')
      expect(validatedFormFile?.content).toContain('minLength')

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/forms/index.ts')
      )
      expect(indexFile).toBeDefined()
      expect(indexFile?.type).toBe('create')
      expect(indexFile?.content).toContain('ExampleForm')
      expect(indexFile?.content).toContain('ValidatedForm')
    })

    it('should create form examples for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await reactHookFormPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const exampleFormFile = result.files.find((f) =>
        f.path?.endsWith('components/forms/ExampleForm.jsx')
      )
      expect(exampleFormFile).toBeDefined()

      const validatedFormFile = result.files.find((f) =>
        f.path?.endsWith('components/forms/ValidatedForm.jsx')
      )
      expect(validatedFormFile).toBeDefined()

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/forms/index.js')
      )
      expect(indexFile).toBeDefined()
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await reactHookFormPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (reactHookFormPlugin.rollback) {
        await reactHookFormPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (reactHookFormPlugin.rollback) {
        await expect(
          reactHookFormPlugin.rollback(mockContext)
        ).rejects.toThrow()
      }
    })
  })
})
