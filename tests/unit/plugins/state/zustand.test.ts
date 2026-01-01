import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { zustandPlugin } from '../../../../src/plugins/state/zustand.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Zustand Plugin', () => {
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
    }

    // Mock fs-helpers
    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should return true if zustand is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { zustand: '^5.0.9' },
      }

      const result = zustandPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false if Zustand is not installed', () => {
      const result = zustandPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { zustand: '^5.0.9' },
      }

      const result = await zustandPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should install zustand', async () => {
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['zustand'],
      })

      const result = await zustandPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toEqual(['zustand'])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['zustand'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should handle installation failure', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await zustandPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install Zustand')
    })
  })

  describe('configure', () => {
    beforeEach(() => {
      // Mock ConfigWriter methods
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(
        undefined
      )
      vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    })

    it('should create store/index.ts for TypeScript project', async () => {
      const result = await zustandPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      // Vérifier que store/index.ts est créé
      const storeFile = result.files.find((f) =>
        f.path?.endsWith('store/index.ts')
      )
      expect(storeFile).toBeDefined()
      expect(storeFile?.type).toBe('create')
      expect(storeFile?.content).toContain("import { create } from 'zustand'")
      expect(storeFile?.content).toContain('useBearStore')
      expect(storeFile?.content).toContain('bears')
    })

    it('should create store/index.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await zustandPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const storeFile = result.files.find((f) =>
        f.path?.endsWith('store/index.js')
      )
      expect(storeFile).toBeDefined()
      expect(storeFile?.content).toContain("import { create } from 'zustand'")
    })

    it('should create store/useStore.ts for TypeScript project', async () => {
      const result = await zustandPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const hookFile = result.files.find((f) =>
        f.path?.endsWith('store/useStore.ts')
      )
      expect(hookFile).toBeDefined()
      expect(hookFile?.type).toBe('create')
      expect(hookFile?.content).toContain('useBears')
      expect(hookFile?.content).toContain('useIncreaseBears')
    })

    it('should not create useStore.ts for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await zustandPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const hookFile = result.files.find((f) =>
        f.path?.endsWith('store/useStore.ts')
      )
      expect(hookFile).toBeUndefined()
    })

    it('should create store with correct Zustand API', async () => {
      const result = await zustandPlugin.configure(mockContext)

      const storeFile = result.files.find((f) =>
        f.path?.endsWith('store/index.ts')
      )
      expect(storeFile?.content).toContain('create')
      expect(storeFile?.content).toContain('set')
      expect(storeFile?.content).toContain('increasePopulation')
      expect(storeFile?.content).toContain('removeAllBears')
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await zustandPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure Zustand')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await zustandPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      await expect(zustandPlugin.rollback?.(mockContext)).rejects.toThrow(
        'Restore failed'
      )
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(zustandPlugin.name).toBe('zustand')
    })

    it('should have correct display name', () => {
      expect(zustandPlugin.displayName).toBe('Zustand')
    })

    it('should have correct version', () => {
      expect(zustandPlugin.version).toBe('^5.0.9')
    })

    it('should be compatible only with React', () => {
      expect(zustandPlugin.frameworks).toEqual(['react'])
    })

    it('should be incompatible with Redux Toolkit and Jotai', () => {
      expect(zustandPlugin.incompatibleWith).toContain('@reduxjs/toolkit')
      expect(zustandPlugin.incompatibleWith).toContain('jotai')
    })
  })
})
