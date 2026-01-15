/**
 * Unit Tests: BaseFrameworkCommand
 * Tests pour la classe abstraite commune à tous les frameworks
 *
 * @group unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BaseFrameworkCommand } from '../../../../src/cli/commands/base-framework-command.js'
import type { ProjectContext, Framework } from '../../../../src/types/index.js'
import { Category } from '../../../../src/types/index.js'
import * as languagePrompt from '../../../../src/cli/prompts/language.js'
import * as detector from '../../../../src/core/detector.js'
import * as pluginSelection from '../../../../src/cli/prompts/select-plugins.js'
import * as confirmation from '../../../../src/cli/prompts/confirm.js'
import * as installer from '../../../../src/core/installer.js'
import * as registry from '../../../../src/plugins/registry.js'

// Mocks
vi.mock('../../../../src/cli/prompts/language.js')
vi.mock('../../../../src/core/detector.js')
vi.mock('../../../../src/cli/prompts/select-plugins.js')
vi.mock('../../../../src/cli/prompts/confirm.js')
vi.mock('../../../../src/core/installer.js')
vi.mock('../../../../src/cli/ui/spinner.js')
vi.mock('../../../../src/cli/ui/report.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/core/validator.js')
vi.mock('../../../../src/plugins/registry.js', () => ({
  pluginRegistry: [],
  getRecommendedPlugins: vi.fn(),
}))

// Classe de test concrète
class TestFrameworkCommand extends BaseFrameworkCommand {
  protected getFramework(): Framework {
    return 'react'
  }

  protected async getOrCreateContext(): Promise<ProjectContext> {
    const ctx = await detector.detectContext(process.cwd())
    return ctx
  }
}

describe('BaseFrameworkCommand', () => {
  const mockContext: ProjectContext = {
    framework: 'react',
    frameworkVersion: '19.0.0',
    bundler: 'vite',
    bundlerVersion: '5.0.0',
    typescript: true,
    packageManager: 'npm',
    lockfile: 'package-lock.json',
    projectRoot: '/tmp/test-project',
    srcDir: 'src',
    publicDir: 'public',
    os: 'darwin',
    nodeVersion: 'v20.0.0',
    dependencies: {},
    devDependencies: {},
    hasGit: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(languagePrompt.promptLanguage).mockResolvedValue('fr')
    vi.mocked(detector.detectContext).mockResolvedValue(mockContext)
    vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue([])
    vi.mocked(confirmation.promptConfirmation).mockResolvedValue(true)
    vi.mocked(registry.getRecommendedPlugins).mockReturnValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('execute - Flow général', () => {
    it('should execute complete installation flow', async () => {
      const mockPlugins = [
        {
          name: 'zustand',
          displayName: 'Zustand',
          description: 'State management',
          category: Category.STATE,
          frameworks: ['react'] as Framework[],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )

      const mockInstall = vi.fn().mockResolvedValue({
        success: true,
        installed: ['zustand'],
        warnings: [],
        filesCreated: [],
        duration: 100,
      })

      class MockInstaller {
        install = mockInstall
      }

      vi.mocked(installer.Installer).mockImplementation(MockInstaller as never)

      try {
        const command = new TestFrameworkCommand()
        await command.execute({})
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected behavior
        } else {
          throw error
        }
      }

      expect(languagePrompt.promptLanguage).toHaveBeenCalled()
      expect(detector.detectContext).toHaveBeenCalled()
      expect(pluginSelection.promptPluginSelection).toHaveBeenCalled()
      expect(confirmation.promptConfirmation).toHaveBeenCalled()
      expect(mockInstall).toHaveBeenCalledWith(mockPlugins, {
        skipPackageInstall: false,
      })
    })

    it('should skip confirmation with --yes flag', async () => {
      const mockPlugins = [
        {
          name: 'zustand',
          displayName: 'Zustand',
          description: 'State management',
          category: Category.STATE,
          frameworks: ['react'] as Framework[],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )
      vi.mocked(registry.getRecommendedPlugins).mockReturnValue(mockPlugins)

      const mockInstall = vi.fn().mockResolvedValue({
        success: true,
        installed: ['zustand'],
        warnings: [],
        filesCreated: [],
        duration: 100,
      })

      class MockInstaller {
        install = mockInstall
      }

      vi.mocked(installer.Installer).mockImplementation(MockInstaller as never)

      try {
        const command = new TestFrameworkCommand()
        await command.execute({ yes: true })
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected behavior
        } else {
          throw error
        }
      }

      expect(pluginSelection.promptPluginSelection).not.toHaveBeenCalled()
      expect(confirmation.promptConfirmation).not.toHaveBeenCalled()
      expect(vi.mocked(registry.getRecommendedPlugins)).toHaveBeenCalledWith(
        mockContext
      )
    })

    it('should skip confirmation with --silent flag', async () => {
      const mockPlugins = [
        {
          name: 'zustand',
          displayName: 'Zustand',
          description: 'State management',
          category: Category.STATE,
          frameworks: ['react'] as Framework[],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )
      vi.mocked(registry.getRecommendedPlugins).mockReturnValue(mockPlugins)

      const mockInstall = vi.fn().mockResolvedValue({
        success: true,
        installed: ['zustand'],
        warnings: [],
        filesCreated: [],
        duration: 100,
      })

      class MockInstaller {
        install = mockInstall
      }

      vi.mocked(installer.Installer).mockImplementation(MockInstaller as never)

      try {
        const command = new TestFrameworkCommand()
        await command.execute({ silent: true })
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected behavior
        } else {
          throw error
        }
      }

      expect(languagePrompt.promptLanguage).not.toHaveBeenCalled()
      expect(pluginSelection.promptPluginSelection).not.toHaveBeenCalled()
      expect(confirmation.promptConfirmation).not.toHaveBeenCalled()
      expect(vi.mocked(registry.getRecommendedPlugins)).toHaveBeenCalledWith(
        mockContext
      )
    })

    it('should exit gracefully when no plugins selected', async () => {
      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue([])

      const command = new TestFrameworkCommand()
      await command.execute({})

      expect(console.log).toHaveBeenCalled()
    })

    it('should exit when user cancels confirmation', async () => {
      const mockPlugins = [
        {
          name: 'zustand',
          displayName: 'Zustand',
          description: 'State management',
          category: Category.STATE,
          frameworks: ['react'] as Framework[],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )
      vi.mocked(confirmation.promptConfirmation).mockResolvedValue(false)

      const command = new TestFrameworkCommand()
      await command.execute({})

      expect(installer.Installer).not.toHaveBeenCalled()
    })
  })

  describe('execute - Dry run mode', () => {
    it('should simulate installation with --dry-run flag', async () => {
      const mockPlugins = [
        {
          name: 'zustand',
          displayName: 'Zustand',
          description: 'State management',
          category: Category.STATE,
          frameworks: ['react'] as Framework[],
          version: '^5.0.0',
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )

      const command = new TestFrameworkCommand()
      await command.execute({ dryRun: true })

      expect(installer.Installer).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('execute - Package installation flags', () => {
    it('should skip package installation with --no-install flag', async () => {
      const mockPlugins = [
        {
          name: 'zustand',
          displayName: 'Zustand',
          description: 'State management',
          category: Category.STATE,
          frameworks: ['react'] as Framework[],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )

      const mockInstall = vi.fn().mockResolvedValue({
        success: true,
        installed: ['zustand'],
        warnings: [],
        filesCreated: [],
        duration: 100,
      })

      class MockInstaller {
        install = mockInstall
      }

      vi.mocked(installer.Installer).mockImplementation(MockInstaller as never)

      try {
        const command = new TestFrameworkCommand()
        await command.execute({ install: false })
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected behavior
        } else {
          throw error
        }
      }

      expect(mockInstall).toHaveBeenCalledWith(mockPlugins, {
        skipPackageInstall: true,
      })
    })
  })

  describe('execute - Error handling', () => {
    it('should handle detection errors gracefully', async () => {
      vi.mocked(detector.detectContext).mockRejectedValue(
        new Error('Detection failed')
      )

      try {
        const command = new TestFrameworkCommand()
        await command.execute({})
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected behavior - command exits on error
          expect(console.log).toHaveBeenCalled()
        } else {
          // Should be a detection error
          expect(error).toBeInstanceOf(Error)
        }
      }
    })

    it('should handle installation errors gracefully', async () => {
      const mockPlugins = [
        {
          name: 'zustand',
          displayName: 'Zustand',
          description: 'State management',
          category: Category.STATE,
          frameworks: ['react'] as Framework[],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )

      const mockInstall = vi.fn().mockResolvedValue({
        success: false,
        installed: [],
        warnings: [],
        filesCreated: [],
        duration: 100,
      })

      class MockInstaller {
        install = mockInstall
      }

      vi.mocked(installer.Installer).mockImplementation(MockInstaller as never)

      try {
        const command = new TestFrameworkCommand()
        await command.execute({})
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected - should exit with code 1
        } else {
          throw error
        }
      }

      expect(mockInstall).toHaveBeenCalled()
    })
  })
})
