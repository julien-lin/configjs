import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { tailwindcssNextjsPlugin } from '../../../../src/plugins/css/tailwindcss-nextjs.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('TailwindCSS Next.js Plugin', () => {
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
      dependencies: {},
      devDependencies: {},
    } as ProjectContext

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['tailwindcss', 'postcss', 'autoprefixer'],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should return true if tailwindcss is installed', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { tailwindcss: '^3.4.1' },
      }

      const result = tailwindcssNextjsPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return true if postcss is installed', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { postcss: '^8.4.0' },
      }

      const result = tailwindcssNextjsPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false if TailwindCSS is not installed', () => {
      const result = tailwindcssNextjsPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        devDependencies: { tailwindcss: '^3.4.1' },
      }

      const result = await tailwindcssNextjsPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should install tailwindcss, postcss and autoprefixer as dev dependencies', async () => {
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['tailwindcss', 'postcss', 'autoprefixer'],
      })

      const result = await tailwindcssNextjsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toEqual([
        'tailwindcss',
        'postcss',
        'autoprefixer',
      ])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['tailwindcss', 'postcss', 'autoprefixer'],
        expect.objectContaining({
          dev: true,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should handle installation failure', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await tailwindcssNextjsPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install TailwindCSS')
    })
  })

  describe('configure', () => {
    it('should create tailwind.config.ts and postcss.config.js for TypeScript project', async () => {
      const result = await tailwindcssNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(2)

      const tailwindConfig = result.files.find((f) =>
        f.path?.endsWith('tailwind.config.ts')
      )
      expect(tailwindConfig).toBeDefined()
      expect(tailwindConfig?.type).toBe('create')
      if (tailwindConfig?.content) {
        expect(tailwindConfig.content).toContain('content:')
        expect(tailwindConfig.content).toContain('theme:')
      }

      const postcssConfig = result.files.find((f) =>
        f.path?.endsWith('postcss.config.js')
      )
      expect(postcssConfig).toBeDefined()
      expect(postcssConfig?.type).toBe('create')
    })

    it('should create tailwind.config.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await tailwindcssNextjsPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const tailwindConfig = result.files.find((f) =>
        f.path?.endsWith('tailwind.config.js')
      )
      expect(tailwindConfig).toBeDefined()
    })

    it('should modify existing app/globals.css to add TailwindCSS directives', async () => {
      const existingCss = `body {
  margin: 0;
}
`

      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false) // tailwind.config.ts doesn't exist
        .mockResolvedValueOnce(false) // postcss.config.js doesn't exist
        .mockResolvedValueOnce(true) // app/globals.css exists

      vi.mocked(fsHelpers.readFileContent)
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce(existingCss)

      const result = await tailwindcssNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const cssFile = result.files.find((f) => f.path?.endsWith('globals.css'))
      expect(cssFile).toBeDefined()
      expect(cssFile?.type).toBe('modify')
      if (cssFile?.content) {
        expect(cssFile.content).toContain('@tailwind base')
        expect(cssFile.content).toContain('@tailwind components')
        expect(cssFile.content).toContain('@tailwind utilities')
      }
    })

    it('should create app/globals.css if no CSS file exists', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false) // tailwind.config.ts doesn't exist
        .mockResolvedValueOnce(false) // postcss.config.js doesn't exist
        .mockResolvedValueOnce(false) // app/globals.css doesn't exist
        .mockResolvedValueOnce(false) // src/app/globals.css doesn't exist
        .mockResolvedValueOnce(false) // styles/globals.css doesn't exist
        .mockResolvedValueOnce(false) // src/styles/globals.css doesn't exist

      vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')

      const result = await tailwindcssNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const cssFile = result.files.find((f) => f.path?.endsWith('globals.css'))
      expect(cssFile).toBeDefined()
      expect(cssFile?.type).toBe('create')
      if (cssFile?.content) {
        expect(cssFile.content).toContain('@tailwind base')
      }
    })

    it('should not duplicate TailwindCSS directives if already present', async () => {
      const existingCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
}
`

      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      vi.mocked(fsHelpers.readFileContent)
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce(existingCss)

      const result = await tailwindcssNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const cssFile = result.files.find((f) => f.path?.endsWith('globals.css'))
      if (cssFile?.content) {
        const importCount = (cssFile.content.match(/@tailwind base/g) || [])
          .length
        expect(importCount).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await tailwindcssNextjsPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(tailwindcssNextjsPlugin.name).toBe('tailwindcss-nextjs')
    })

    it('should be compatible with Next.js', () => {
      expect(tailwindcssNextjsPlugin.frameworks).toContain('nextjs')
    })
  })
})
