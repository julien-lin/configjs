import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextjsCommand } from '../../../../src/cli/commands/nextjs-command.js'
import * as languagePrompt from '../../../../src/cli/prompts/language.js'
import * as detector from '../../../../src/core/detector.js'
import * as nextjsSetup from '../../../../src/cli/prompts/nextjs-setup.js'
import * as nextjsInstaller from '../../../../src/cli/utils/nextjs-installer.js'
import * as pluginSelection from '../../../../src/cli/prompts/select-plugins.js'
import * as confirmation from '../../../../src/cli/prompts/confirm.js'
import * as installer from '../../../../src/core/installer.js'
import type { ProjectContext } from '../../../../src/types/index.js'

// Mocks
vi.mock('../../../../src/cli/prompts/language.js')
vi.mock('../../../../src/core/detector.js')
vi.mock('../../../../src/cli/prompts/nextjs-setup.js')
vi.mock('../../../../src/cli/utils/nextjs-installer.js')
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
}))

describe('NextjsCommand', () => {
  const mockContext: ProjectContext = {
    framework: 'nextjs',
    frameworkVersion: '14.0.0',
    bundler: 'nextjs',
    bundlerVersion: '14.0.0',
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
    vi.mocked(languagePrompt.promptLanguage).mockResolvedValue('fr')
    vi.mocked(detector.detectContext).mockResolvedValue(mockContext)
    vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue([])
    vi.mocked(confirmation.promptConfirmation).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should detect existing Next.js project and proceed', async () => {
    const mockPlugins = [
      {
        name: 'tailwindcss',
        displayName: 'TailwindCSS',
        description: 'CSS framework',
        category: 'css' as const,
        frameworks: ['nextjs', 'react'],
        install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
        configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
      },
    ]

    vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
      mockPlugins as never
    )

    const mockInstaller = {
      install: vi.fn().mockResolvedValue({
        success: true,
        installed: [],
        warnings: [],
        filesCreated: [],
      }),
    }

    vi.mocked(installer.Installer).mockImplementation(
      () => mockInstaller as never
    )

    try {
      const command = new NextjsCommand()
      await command.execute({})
    } catch (error) {
      // Ignore process.exit errors in tests
      if (error instanceof Error && error.message === 'process.exit called') {
        // Expected behavior
      } else {
        throw error
      }
    }

    expect(detector.detectContext).toHaveBeenCalled()
    expect(pluginSelection.promptPluginSelection).toHaveBeenCalled()
  })

  it('should create Next.js project if not detected', async () => {
    const setupOptions = {
      projectName: 'my-nextjs-app',
      typescript: true,
      eslint: true,
      tailwind: true,
      srcDir: false,
      appRouter: true,
      importAlias: '@/*',
    }

    vi.mocked(detector.detectContext)
      .mockRejectedValueOnce(
        new detector.DetectionError('No Next.js project detected')
      )
      .mockResolvedValueOnce(mockContext)

    vi.mocked(nextjsSetup.promptNextjsSetup).mockResolvedValue(setupOptions)
    vi.mocked(nextjsInstaller.createNextjsProject).mockResolvedValue(
      '/tmp/my-nextjs-app'
    )

    const mockChdir = vi.spyOn(process, 'chdir').mockImplementation(() => {})

    const command = new NextjsCommand()
    await command.execute({})

    expect(nextjsSetup.promptNextjsSetup).toHaveBeenCalled()
    expect(nextjsInstaller.createNextjsProject).toHaveBeenCalledWith(
      setupOptions,
      expect.any(String),
      'fr'
    )
    expect(mockChdir).toHaveBeenCalledWith('/tmp/my-nextjs-app')
    expect(detector.detectContext).toHaveBeenCalledTimes(2)
  })

  it('should exit if user cancels project creation', async () => {
    vi.mocked(detector.detectContext).mockRejectedValueOnce(
      new detector.DetectionError('No Next.js project detected')
    )
    vi.mocked(nextjsSetup.promptNextjsSetup).mockResolvedValue(null)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const command = new NextjsCommand()
    try {
      await command.execute({})
    } catch (error) {
      // Ignore process.exit errors in tests
      if (error instanceof Error && error.message === 'process.exit called') {
        // Expected behavior
      } else {
        throw error
      }
    }

    expect(nextjsSetup.promptNextjsSetup).toHaveBeenCalled()
    expect(nextjsInstaller.createNextjsProject).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should warn if framework is not Next.js', async () => {
    const reactContext = {
      ...mockContext,
      framework: 'react' as const,
    }

    vi.mocked(detector.detectContext).mockResolvedValue(reactContext)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const command = new NextjsCommand()
    await command.execute({})

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Framework détecté: react')
    )

    consoleSpy.mockRestore()
  })

  it('should exit if no plugins selected', async () => {
    vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue([])

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const command = new NextjsCommand()
    await command.execute({})

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Aucune bibliothèque sélectionnée')
    )

    consoleSpy.mockRestore()
  })

  it('should exit if user cancels confirmation', async () => {
    const mockPlugins = [
      {
        name: 'tailwindcss',
        displayName: 'TailwindCSS',
        description: 'CSS framework',
        category: 'css' as const,
        frameworks: ['nextjs'],
        install: vi.fn(),
        configure: vi.fn(),
      },
    ]

    vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
      mockPlugins as never
    )
    vi.mocked(confirmation.promptConfirmation).mockResolvedValue(false)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const command = new NextjsCommand()
    await command.execute({})

    expect(confirmation.promptConfirmation).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Annuler'))

    consoleSpy.mockRestore()
  })
})
