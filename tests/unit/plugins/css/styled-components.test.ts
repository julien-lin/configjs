import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { styledComponentsPlugin } from '../../../../src/plugins/css/styled-components.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Styled Components Plugin', () => {
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
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: 'v18.0.0',
      dependencies: {},
      devDependencies: {},
      hasGit: false,
    }

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['styled-components'],
    })

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) => p)
    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    // Mock BackupManager
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Styled Components if installed in dependencies', () => {
      mockContext.dependencies['styled-components'] = '^6.1.19'
      expect(styledComponentsPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Styled Components if installed in devDependencies', () => {
      mockContext.devDependencies['styled-components'] = '^6.1.19'
      expect(styledComponentsPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Styled Components if not installed', () => {
      expect(styledComponentsPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Styled Components for TypeScript project', async () => {
      vi.mocked(packageManager.installPackages).mockReset()
      vi.mocked(packageManager.installPackages)
        .mockResolvedValueOnce({
          success: true,
          packages: ['styled-components'],
        })
        .mockResolvedValueOnce({
          success: true,
          packages: ['@types/styled-components'],
        })

      const result = await styledComponentsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('styled-components')
      expect(result.packages?.devDependencies).toContain(
        '@types/styled-components'
      )
      expect(packageManager.installPackages).toHaveBeenCalledTimes(2)
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['styled-components'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['@types/styled-components'],
        expect.objectContaining({
          dev: true,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should install Styled Components for JavaScript project', async () => {
      mockContext.typescript = false

      vi.mocked(packageManager.installPackages).mockReset()
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['styled-components'],
      })

      const result = await styledComponentsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('styled-components')
      expect(result.packages?.devDependencies).toBeUndefined()
      expect(packageManager.installPackages).toHaveBeenCalledTimes(1)
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['styled-components'],
        expect.objectContaining({
          dev: false,
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['styled-components'] = '^6.1.19'

      const result = await styledComponentsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await styledComponentsPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create styled components for TypeScript project', async () => {
      const result = await styledComponentsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(3)
      const buttonFile = result.files.find((f) =>
        f.path?.endsWith('components/styled/Button.tsx')
      )
      expect(buttonFile).toBeDefined()
      expect(buttonFile?.type).toBe('create')
      expect(buttonFile?.content).toContain('styled.button')
      expect(buttonFile?.content).toContain('styled-components')

      const cardFile = result.files.find((f) =>
        f.path?.endsWith('components/styled/Card.tsx')
      )
      expect(cardFile).toBeDefined()
      expect(cardFile?.content).toContain('styled.div')
      expect(cardFile?.content).toContain('$primary')

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/styled/index.ts')
      )
      expect(indexFile).toBeDefined()
      expect(indexFile?.content).toContain("from './Button'")
      expect(indexFile?.content).toContain("from './Card'")
    })

    it('should create styled components for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await styledComponentsPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const buttonFile = result.files.find((f) =>
        f.path?.endsWith('components/styled/Button.jsx')
      )
      expect(buttonFile).toBeDefined()

      const cardFile = result.files.find((f) =>
        f.path?.endsWith('components/styled/Card.jsx')
      )
      expect(cardFile).toBeDefined()

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/styled/index.js')
      )
      expect(indexFile).toBeDefined()
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await styledComponentsPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (styledComponentsPlugin.rollback) {
        await styledComponentsPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (styledComponentsPlugin.rollback) {
        await expect(
          styledComponentsPlugin.rollback(mockContext)
        ).rejects.toThrow()
      }
    })
  })
})
