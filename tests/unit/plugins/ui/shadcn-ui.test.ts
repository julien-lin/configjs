import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { shadcnUiPlugin } from '../../../../src/plugins/ui/shadcn-ui.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Shadcn/ui Plugin', () => {
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
      dependencies: {
        tailwindcss: '^4.1.18',
      },
      devDependencies: {},
    } as unknown as ProjectContext

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: [
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        '@radix-ui/react-slot',
      ],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) => p)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Shadcn/ui if class-variance-authority is installed', () => {
      mockContext.dependencies['class-variance-authority'] = '^0.7.0'
      expect(shadcnUiPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Shadcn/ui if @radix-ui/react-slot is installed', () => {
      mockContext.dependencies['@radix-ui/react-slot'] = '^1.1.0'
      expect(shadcnUiPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Shadcn/ui if dependencies are not installed', () => {
      expect(shadcnUiPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Shadcn/ui dependencies', async () => {
      const result = await shadcnUiPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain(
        'class-variance-authority'
      )
      expect(result.packages?.dependencies).toContain('clsx')
      expect(result.packages?.dependencies).toContain('tailwind-merge')
      expect(result.packages?.dependencies).toContain('@radix-ui/react-slot')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        expect.arrayContaining([
          'class-variance-authority',
          'clsx',
          'tailwind-merge',
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
      mockContext.dependencies['class-variance-authority'] = '^0.7.0'

      const result = await shadcnUiPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await shadcnUiPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create Shadcn/ui configuration for TypeScript project', async () => {
      const result = await shadcnUiPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(3)

      const componentsJsonFile = result.files.find((f) =>
        f.path?.endsWith('components.json')
      )
      expect(componentsJsonFile).toBeDefined()
      expect(componentsJsonFile?.type).toBe('create')
      if (componentsJsonFile?.content) {
        const config = JSON.parse(componentsJsonFile.content) as {
          tsx: boolean
          style: string
        }
        expect(config.tsx).toBe(true)
        expect(config.style).toBe('new-york')
      }

      const utilsFile = result.files.find((f) =>
        f.path?.endsWith('lib/utils.ts')
      )
      expect(utilsFile).toBeDefined()
      expect(utilsFile?.content).toContain('export function cn')

      const buttonFile = result.files.find((f) =>
        f.path?.endsWith('components/ui/button.tsx')
      )
      expect(buttonFile).toBeDefined()
      expect(buttonFile?.content).toContain('Button')
      expect(buttonFile?.content).toContain('@radix-ui/react-slot')
    })

    it('should create Shadcn/ui configuration for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await shadcnUiPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const componentsJsonFile = result.files.find((f) =>
        f.path?.endsWith('components.json')
      )
      if (componentsJsonFile?.content) {
        const config = JSON.parse(componentsJsonFile.content) as {
          tsx: boolean
        }
        expect(config.tsx).toBe(false)
      }

      const utilsFile = result.files.find((f) =>
        f.path?.endsWith('lib/utils.js')
      )
      expect(utilsFile).toBeDefined()

      const buttonFile = result.files.find((f) =>
        f.path?.endsWith('components/ui/button.jsx')
      )
      expect(buttonFile).toBeDefined()
    })

    it('should fail if TailwindCSS is not installed', async () => {
      mockContext.dependencies = {}
      mockContext.devDependencies = {}

      const result = await shadcnUiPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('TailwindCSS is required')
    })

    it('should skip components.json creation if already exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValueOnce(true)

      const result = await shadcnUiPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const componentsJsonFile = result.files.find((f) =>
        f.path?.endsWith('components.json')
      )
      expect(componentsJsonFile).toBeUndefined()
    })

    it('should add cn function to existing utils file', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        'export function other() {}'
      )

      const result = await shadcnUiPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const utilsFile = result.files.find((f) =>
        f.path?.endsWith('lib/utils.ts')
      )
      if (utilsFile?.content) {
        expect(utilsFile.content).toContain('export function cn')
        expect(utilsFile.content).toContain('export function other')
      }
    })

    it('should add CSS variables to existing index.css', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        'body { margin: 0; }'
      )

      const result = await shadcnUiPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const cssFile = result.files.find((f) => f.path?.endsWith('index.css'))
      if (cssFile?.content) {
        expect(cssFile.content).toContain('@layer base')
        expect(cssFile.content).toContain('--background')
        expect(cssFile.content).toContain('--primary')
      }
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await shadcnUiPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (shadcnUiPlugin.rollback) {
        await shadcnUiPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (shadcnUiPlugin.rollback) {
        await expect(shadcnUiPlugin.rollback(mockContext)).rejects.toThrow(
          'Restore failed'
        )
      }
    })
  })
})
