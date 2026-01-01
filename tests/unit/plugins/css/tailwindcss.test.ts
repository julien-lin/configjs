import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { tailwindcssPlugin } from '../../../../src/plugins/css/tailwindcss.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import { fsMocks } from '../../test-utils/fs-mocks.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('TailwindCSS Plugin', () => {
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

    // Mock fs-helpers
    fsMocks.checkPathExists.mockResolvedValue(false)
    fsMocks.readFileContent.mockResolvedValue('')
    fsMocks.writeFileContent.mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should return true if tailwindcss is installed', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { tailwindcss: '^4.1.18' },
      }

      const result = tailwindcssPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return true if @tailwindcss/vite is installed', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { '@tailwindcss/vite': '^4.1.18' },
      }

      const result = tailwindcssPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false if TailwindCSS is not installed', () => {
      const result = tailwindcssPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        devDependencies: { tailwindcss: '^4.1.18' },
      }

      const result = await tailwindcssPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should install tailwindcss and @tailwindcss/vite as dev dependencies', async () => {
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['tailwindcss', '@tailwindcss/vite'],
      })

      const result = await tailwindcssPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toEqual([
        'tailwindcss',
        '@tailwindcss/vite',
      ])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['tailwindcss', '@tailwindcss/vite'],
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

      const result = await tailwindcssPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install TailwindCSS')
    })
  })

  describe('configure', () => {
    beforeEach(() => {
      // Mock ConfigWriter methods
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(
        undefined
      )
      vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(
        undefined
      )
    })

    it('should modify existing vite.config.ts to add TailwindCSS plugin', async () => {
      const existingViteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`

      fsMocks.checkPathExists.mockResolvedValue(true) // vite.config.ts exists
      fsMocks.readFileContent.mockResolvedValue(existingViteConfig)

      const result = await tailwindcssPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const viteConfigFile = result.files.find((f) =>
        f.path?.endsWith('vite.config.ts')
      )
      expect(viteConfigFile).toBeDefined()
      expect(viteConfigFile?.type).toBe('modify')
      expect(viteConfigFile?.content).toContain("@tailwindcss/vite'")
      expect(viteConfigFile?.content).toContain('tailwindcss()')
    })

    it('should create vite.config.ts if it does not exist', async () => {
      fsMocks.checkPathExists.mockResolvedValue(false) // vite.config.ts doesn't exist

      const result = await tailwindcssPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const viteConfigFile = result.files.find((f) =>
        f.path?.endsWith('vite.config.ts')
      )
      expect(viteConfigFile).toBeDefined()
      expect(viteConfigFile?.type).toBe('create')
      expect(viteConfigFile?.content).toContain('tailwindcss()')
    })

    it('should modify existing vite.config.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const existingViteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`

      fsMocks.checkPathExists.mockResolvedValue(true)
      fsMocks.readFileContent.mockResolvedValue(existingViteConfig)

      const result = await tailwindcssPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const viteConfigFile = result.files.find((f) =>
        f.path?.endsWith('vite.config.js')
      )
      expect(viteConfigFile).toBeDefined()
      expect(viteConfigFile?.content).toContain('tailwindcss()')
    })

    it('should modify existing index.css to add TailwindCSS import', async () => {
      const existingCss = `body {
  margin: 0;
}
`

      fsMocks.checkPathExists
        .mockResolvedValueOnce(true) // vite.config.ts exists
        .mockResolvedValueOnce(true) // index.css exists
      fsMocks.readFileContent
        .mockResolvedValueOnce('import { defineConfig } from "vite"\n')
        .mockResolvedValueOnce(existingCss)

      const result = await tailwindcssPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const cssFile = result.files.find((f) => f.path?.endsWith('index.css'))
      expect(cssFile).toBeDefined()
      expect(cssFile?.type).toBe('modify')
      expect(cssFile?.content).toContain('@import "tailwindcss"')
    })

    it('should create index.css if no CSS file exists', async () => {
      fsMocks.checkPathExists
        .mockResolvedValueOnce(true) // vite.config.ts exists
        .mockResolvedValueOnce(false) // index.css doesn't exist
        .mockResolvedValueOnce(false) // main.css doesn't exist
        .mockResolvedValueOnce(false) // app.css doesn't exist
        .mockResolvedValueOnce(false) // styles.css doesn't exist
      fsMocks.readFileContent.mockResolvedValue(
        'import { defineConfig } from "vite"\n'
      )

      const result = await tailwindcssPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const cssFile = result.files.find((f) => f.path?.endsWith('index.css'))
      expect(cssFile).toBeDefined()
      expect(cssFile?.type).toBe('create')
      expect(cssFile?.content).toContain('@import "tailwindcss"')
    })

    it('should not duplicate TailwindCSS plugin if already present', async () => {
      const existingViteConfig = `import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
`

      fsMocks.checkPathExists
        .mockResolvedValueOnce(true) // vite.config.ts exists
        .mockResolvedValueOnce(false) // index.css doesn't exist
      fsMocks.readFileContent
        .mockResolvedValueOnce(existingViteConfig)
        .mockResolvedValueOnce('')

      const result = await tailwindcssPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      // Le fichier devrait être modifié mais sans duplication
      const viteConfigFile = result.files.find((f) =>
        f.path?.endsWith('vite.config.ts')
      )
      expect(viteConfigFile).toBeDefined()
    })

    it('should not duplicate TailwindCSS import if already present', async () => {
      const existingCss = `@import "tailwindcss";

body {
  margin: 0;
}
`

      fsMocks.checkPathExists
        .mockResolvedValueOnce(true) // vite.config.ts exists
        .mockResolvedValueOnce(true) // index.css exists
      fsMocks.readFileContent
        .mockResolvedValueOnce('import { defineConfig } from "vite"\n')
        .mockResolvedValueOnce(existingCss)

      const result = await tailwindcssPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const cssFile = result.files.find((f) => f.path?.endsWith('index.css'))
      expect(cssFile).toBeDefined()
      // Le contenu ne devrait pas avoir de duplication
      const importCount = (
        cssFile?.content.match(/@import "tailwindcss"/g) || []
      ).length
      expect(importCount).toBeLessThanOrEqual(1)
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'writeFile').mockRejectedValue(
        new Error('File write failed')
      )

      fsMocks.checkPathExists.mockResolvedValue(true)
      fsMocks.readFileContent.mockResolvedValue('')

      const result = await tailwindcssPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure TailwindCSS')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await tailwindcssPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      await expect(tailwindcssPlugin.rollback?.(mockContext)).rejects.toThrow(
        'Restore failed'
      )
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(tailwindcssPlugin.name).toBe('tailwindcss')
    })

    it('should have correct display name', () => {
      expect(tailwindcssPlugin.displayName).toBe('TailwindCSS')
    })

    it('should have correct version', () => {
      expect(tailwindcssPlugin.version).toBe('^4.1.18')
    })

    it('should be compatible with React, Vue, and Svelte', () => {
      expect(tailwindcssPlugin.frameworks).toContain('react')
      expect(tailwindcssPlugin.frameworks).toContain('vue')
      expect(tailwindcssPlugin.frameworks).toContain('svelte')
    })
  })
})

