import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { shadcnUiNextjsPlugin } from '../../../../src/plugins/ui/shadcn-ui-nextjs.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Shadcn/ui Next.js Plugin', () => {
  let mockContext: ProjectContext

  beforeEach(() => {
    vi.clearAllMocks()

    mockContext = {
      framework: 'nextjs',
      frameworkVersion: '14.0.0',
      bundler: 'nextjs',
      bundlerVersion: '14.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/project',
      srcDir: 'src',
      dependencies: {
        tailwindcss: '^3.4.1',
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
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Shadcn/ui if class-variance-authority is installed', () => {
      mockContext.dependencies['class-variance-authority'] = '^0.7.0'
      expect(shadcnUiNextjsPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Shadcn/ui if dependencies are not installed', () => {
      expect(shadcnUiNextjsPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Shadcn/ui dependencies', async () => {
      const result = await shadcnUiNextjsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain(
        'class-variance-authority'
      )
      expect(result.packages?.dependencies).toContain('clsx')
      expect(result.packages?.dependencies).toContain('tailwind-merge')
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

      const result = await shadcnUiNextjsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })
  })

  describe('configure', () => {
    it('should create Shadcn/ui configuration for Next.js TypeScript project', async () => {
      const result = await shadcnUiNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(3)

      const componentsJsonFile = result.files.find((f) =>
        f.path?.endsWith('components.json')
      )
      expect(componentsJsonFile).toBeDefined()
      expect(componentsJsonFile?.type).toBe('create')
      if (componentsJsonFile?.content) {
        const config = JSON.parse(componentsJsonFile.content) as {
          rsc: boolean
          tsx: boolean
        }
        expect(config.rsc).toBe(true)
        expect(config.tsx).toBe(true)
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
    })

    it('should create Shadcn/ui configuration for JavaScript project', async () => {
      mockContext.typescript = false

      const result = await shadcnUiNextjsPlugin.configure(mockContext)

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

    it('should skip components.json creation if already exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValueOnce(true)

      const result = await shadcnUiNextjsPlugin.configure(mockContext)

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

      const result = await shadcnUiNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const utilsFile = result.files.find((f) =>
        f.path?.endsWith('lib/utils.ts')
      )
      if (utilsFile?.content) {
        expect(utilsFile.content).toContain('export function cn')
        expect(utilsFile.content).toContain('export function other')
      }
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (shadcnUiNextjsPlugin.rollback) {
        await shadcnUiNextjsPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
