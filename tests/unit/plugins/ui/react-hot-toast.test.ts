import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reactHotToastPlugin } from '../../../../src/plugins/ui/react-hot-toast.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('React Hot Toast Plugin', () => {
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
      packages: ['react-hot-toast'],
    })

    vi.mocked(fsHelpers.checkPathExists)
      .mockResolvedValueOnce(true) // App.tsx exists
      .mockResolvedValueOnce(false) // main.tsx doesn't exist
      .mockResolvedValueOnce(false) // index.tsx doesn't exist

    vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
      'function App() { return <div>Hello</div> }'
    )
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect React Hot Toast if installed', () => {
      mockContext.dependencies['react-hot-toast'] = '^2.4.1'
      expect(reactHotToastPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect React Hot Toast if not installed', () => {
      expect(reactHotToastPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install React Hot Toast', async () => {
      const result = await reactHotToastPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('react-hot-toast')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['react-hot-toast'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['react-hot-toast'] = '^2.4.1'

      const result = await reactHotToastPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })
  })

  describe('configure', () => {
    it('should add Toaster to existing App.tsx', async () => {
      const result = await reactHotToastPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(1)

      const appFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('App.tsx')
      )
      if (appFile) {
        expect(appFile.content).toContain('react-hot-toast')
        expect(appFile.content).toContain('<Toaster />')
      }
    })

    it('should create App.tsx if no app file exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockReset()
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reactHotToastPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('App.tsx')
      )
      expect(appFile).toBeDefined()
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (reactHotToastPlugin.rollback) {
        await reactHotToastPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
