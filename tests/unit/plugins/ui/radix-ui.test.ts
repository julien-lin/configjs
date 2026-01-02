import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { radixUiPlugin } from '../../../../src/plugins/ui/radix-ui.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Radix UI Plugin', () => {
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
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-label',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slot',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-accordion',
      ],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) => p)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Radix UI if @radix-ui/react-dialog is installed', () => {
      mockContext.dependencies['@radix-ui/react-dialog'] = '^1.1.15'
      expect(radixUiPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Radix UI if @radix-ui/react-dropdown-menu is installed', () => {
      mockContext.dependencies['@radix-ui/react-dropdown-menu'] = '^2.1.0'
      expect(radixUiPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Radix UI if @radix-ui/react-slot is installed', () => {
      mockContext.dependencies['@radix-ui/react-slot'] = '^1.2.4'
      expect(radixUiPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Radix UI if dependencies are not installed', () => {
      expect(radixUiPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Radix UI primitives', async () => {
      const result = await radixUiPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('@radix-ui/react-dialog')
      expect(result.packages?.dependencies).toContain(
        '@radix-ui/react-dropdown-menu'
      )
      expect(result.packages?.dependencies).toContain('@radix-ui/react-slot')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        expect.arrayContaining([
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-slot',
        ]),
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['@radix-ui/react-dialog'] = '^1.1.15'

      const result = await radixUiPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await radixUiPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create Radix UI components for TypeScript project', async () => {
      const result = await radixUiPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(3)

      const dialogFile = result.files.find((f) =>
        f.path?.endsWith('components/radix/Dialog.tsx')
      )
      expect(dialogFile).toBeDefined()
      expect(dialogFile?.content).toContain('Dialog')
      expect(dialogFile?.content).toContain('@radix-ui/react-dialog')

      const dropdownMenuFile = result.files.find((f) =>
        f.path?.endsWith('components/radix/DropdownMenu.tsx')
      )
      expect(dropdownMenuFile).toBeDefined()
      expect(dropdownMenuFile?.content).toContain('DropdownMenu')
      expect(dropdownMenuFile?.content).toContain(
        '@radix-ui/react-dropdown-menu'
      )

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/radix/index.ts')
      )
      expect(indexFile).toBeDefined()
      expect(indexFile?.content).toContain('export')
    })

    it('should create Radix UI components for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await radixUiPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const dialogFile = result.files.find((f) =>
        f.path?.endsWith('components/radix/Dialog.jsx')
      )
      expect(dialogFile).toBeDefined()

      const dropdownMenuFile = result.files.find((f) =>
        f.path?.endsWith('components/radix/DropdownMenu.jsx')
      )
      expect(dropdownMenuFile).toBeDefined()

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('components/radix/index.js')
      )
      expect(indexFile).toBeDefined()
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await radixUiPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (radixUiPlugin.rollback) {
        await radixUiPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (radixUiPlugin.rollback) {
        await expect(radixUiPlugin.rollback(mockContext)).rejects.toThrow(
          'Restore failed'
        )
      }
    })
  })
})
