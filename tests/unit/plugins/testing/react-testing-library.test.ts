import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reactTestingLibraryPlugin } from '../../../../src/plugins/testing/react-testing-library.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('React Testing Library Plugin', () => {
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
      packages: [
        '@testing-library/react',
        '@testing-library/jest-dom',
        '@testing-library/user-event',
      ],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect React Testing Library if installed', () => {
      mockContext.devDependencies['@testing-library/react'] = '^16.3.1'
      expect(reactTestingLibraryPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect React Testing Library if not installed', () => {
      expect(reactTestingLibraryPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install React Testing Library packages', async () => {
      const result = await reactTestingLibraryPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.devDependencies).toContain(
        '@testing-library/react'
      )
      expect(result.packages?.devDependencies).toContain(
        '@testing-library/jest-dom'
      )
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '@testing-library/react',
          '@testing-library/jest-dom',
          '@testing-library/user-event',
        ]),
        expect.objectContaining({
          dev: true,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.devDependencies['@testing-library/react'] = '^16.3.1'

      const result = await reactTestingLibraryPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await reactTestingLibraryPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create setupTests file for TypeScript project', async () => {
      const result = await reactTestingLibraryPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(2)

      const setupTestsFile = result.files.find((f) =>
        f.path?.endsWith('setupTests.ts')
      )
      expect(setupTestsFile).toBeDefined()
      expect(setupTestsFile?.content).toContain('@testing-library/jest-dom')

      const exampleTestFile = result.files.find((f) =>
        f.path?.endsWith('Example.test.tsx')
      )
      expect(exampleTestFile).toBeDefined()
      expect(exampleTestFile?.content).toContain('React Testing Library')
    })

    it('should create setupTests file for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await reactTestingLibraryPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const setupTestsFile = result.files.find((f) =>
        f.path?.endsWith('setupTests.js')
      )
      expect(setupTestsFile).toBeDefined()

      const exampleTestFile = result.files.find((f) =>
        f.path?.endsWith('Example.test.jsx')
      )
      expect(exampleTestFile).toBeDefined()
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await reactTestingLibraryPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (reactTestingLibraryPlugin.rollback) {
        await reactTestingLibraryPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (reactTestingLibraryPlugin.rollback) {
        await expect(
          reactTestingLibraryPlugin.rollback(mockContext)
        ).rejects.toThrow('Restore failed')
      }
    })
  })
})
