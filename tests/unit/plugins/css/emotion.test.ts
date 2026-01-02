import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { emotionPlugin } from '../../../../src/plugins/css/emotion.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Emotion Plugin', () => {
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
      packages: ['@emotion/react'],
    })

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    // Mock ConfigWriter
    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    // Mock BackupManager
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Emotion if @emotion/react is installed in dependencies', () => {
      mockContext.dependencies['@emotion/react'] = '^11.14.0'
      expect(emotionPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Emotion if @emotion/styled is installed in dependencies', () => {
      mockContext.dependencies['@emotion/styled'] = '^11.14.1'
      expect(emotionPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Emotion if installed in devDependencies', () => {
      mockContext.devDependencies['@emotion/react'] = '^11.14.0'
      expect(emotionPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Emotion if not installed', () => {
      expect(emotionPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Emotion packages', async () => {
      vi.mocked(packageManager.installPackages).mockReset()
      vi.mocked(packageManager.installPackages)
        .mockResolvedValueOnce({
          success: true,
          packages: ['@emotion/react'],
        })
        .mockResolvedValueOnce({
          success: true,
          packages: ['@emotion/styled'],
        })

      const result = await emotionPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('@emotion/react')
      expect(result.packages?.dependencies).toContain('@emotion/styled')
      expect(packageManager.installPackages).toHaveBeenCalledTimes(2)
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['@emotion/react'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['@emotion/styled'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['@emotion/react'] = '^11.14.0'

      const result = await emotionPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockReset()
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await emotionPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create emotion components for TypeScript project', async () => {
      const result = await emotionPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(3)
      const buttonFile = result.files.find((f) =>
        f.path?.endsWith('components/emotion/Button.tsx')
      )
      expect(buttonFile).toBeDefined()
      expect(buttonFile?.type).toBe('create')
      expect(buttonFile?.content).toContain('styled.button')
      expect(buttonFile?.content).toContain('@emotion/styled')

      const cardFile = result.files.find((f) =>
        f.path?.endsWith('components/emotion/Card.tsx')
      )
      expect(cardFile).toBeDefined()
      expect(cardFile?.content).toContain('css')
      expect(cardFile?.content).toContain('@emotion/react')
      expect(cardFile?.content).toContain('$primary')

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/emotion/index.ts')
      )
      expect(indexFile).toBeDefined()
      expect(indexFile?.content).toContain("from './Button'")
      expect(indexFile?.content).toContain("from './Card'")
    })

    it('should create emotion components for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await emotionPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const buttonFile = result.files.find((f) =>
        f.path?.endsWith('components/emotion/Button.jsx')
      )
      expect(buttonFile).toBeDefined()

      const cardFile = result.files.find((f) =>
        f.path?.endsWith('components/emotion/Card.jsx')
      )
      expect(cardFile).toBeDefined()

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/emotion/index.js')
      )
      expect(indexFile).toBeDefined()
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await emotionPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (emotionPlugin.rollback) {
        await emotionPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (emotionPlugin.rollback) {
        await expect(emotionPlugin.rollback(mockContext)).rejects.toThrow()
      }
    })
  })
})
