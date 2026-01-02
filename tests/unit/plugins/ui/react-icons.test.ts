import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reactIconsPlugin } from '../../../../src/plugins/ui/react-icons.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('React Icons Plugin', () => {
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
      packages: ['react-icons'],
    })

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect React Icons if installed', () => {
      mockContext.dependencies['react-icons'] = '^5.3.0'
      expect(reactIconsPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect React Icons if not installed', () => {
      expect(reactIconsPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install React Icons', async () => {
      const result = await reactIconsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('react-icons')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['react-icons'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['react-icons'] = '^5.3.0'

      const result = await reactIconsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })
  })

  describe('configure', () => {
    it('should create React Icons example for TypeScript project', async () => {
      const result = await reactIconsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(2)

      const iconExampleFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('components/icons/IconExample.tsx')
      )
      expect(iconExampleFile).toBeDefined()
      expect(iconExampleFile?.content).toContain('react-icons')

      const indexFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('components/icons/index.ts')
      )
      expect(indexFile).toBeDefined()
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (reactIconsPlugin.rollback) {
        await reactIconsPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
