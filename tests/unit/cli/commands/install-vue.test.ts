import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VueCommand } from '../../../../src/cli/commands/vue-command.js'
import * as languagePrompt from '../../../../src/cli/prompts/language.js'
import * as detector from '../../../../src/core/detector.js'
import * as vueSetup from '../../../../src/cli/prompts/vue-setup.js'
import * as vueInstaller from '../../../../src/cli/utils/vue-installer.js'
import * as pluginSelection from '../../../../src/cli/prompts/select-plugins.js'
import * as confirmation from '../../../../src/cli/prompts/confirm.js'
import * as installer from '../../../../src/core/installer.js'
import type { ProjectContext } from '../../../../src/types/index.js'

// Mocks
vi.mock('../../../../src/cli/prompts/language.js')
vi.mock('../../../../src/core/detector.js')
vi.mock('../../../../src/cli/prompts/vue-setup.js')
vi.mock('../../../../src/cli/utils/vue-installer.js')
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

describe('VueCommand', () => {
  const mockContext: ProjectContext = {
    framework: 'vue',
    frameworkVersion: '3.4.0',
    bundler: 'vite',
    bundlerVersion: '5.0.0',
    typescript: true,
    packageManager: 'npm',
    lockfile: 'package-lock.json',
    projectRoot: '/tmp/test-project',
    srcDir: 'src',
    dependencies: {},
    devDependencies: {},
    vueVersion: '3',
    vueApi: 'composition',
  } as ProjectContext

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    vi.spyOn(process, 'chdir').mockImplementation(() => {})
    vi.mocked(languagePrompt.promptLanguage).mockResolvedValue('fr')
    vi.mocked(detector.detectContext).mockResolvedValue(mockContext)
    vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue([])
    vi.mocked(confirmation.promptConfirmation).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should detect existing Vue.js project and proceed', async () => {
    const mockPlugins = [
      {
        name: 'vue-router',
        displayName: 'Vue Router',
        description: 'Router for Vue',
        category: 'routing' as const,
        frameworks: ['vue'],
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
        duration: 0,
      }),
    }

    vi.mocked(installer.Installer).mockImplementation(
      () => mockInstaller as never
    )

    try {
      const command = new VueCommand()
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

  it('should create new Vue.js project if none detected', async () => {
    const detectionError = new detector.DetectionError('No Vue.js detected')
    vi.mocked(detector.detectContext)
      .mockRejectedValueOnce(detectionError)
      .mockResolvedValueOnce(mockContext)

    const vueOptions = {
      projectName: 'new-vue-project',
      typescript: true,
      router: true,
      pinia: false,
      vitest: false,
      eslint: true,
      prettier: true,
    }

    vi.mocked(vueSetup.promptVueSetup).mockResolvedValue(vueOptions)
    vi.mocked(vueInstaller.createVueProject).mockResolvedValue(
      '/tmp/new-vue-project'
    )

    try {
      const command = new VueCommand()
      await command.execute({})
    } catch (error) {
      if (error instanceof Error && error.message === 'process.exit called') {
        // Expected
      } else {
        throw error
      }
    }

    expect(vueSetup.promptVueSetup).toHaveBeenCalled()
    expect(vueInstaller.createVueProject).toHaveBeenCalledWith(
      vueOptions,
      expect.any(String),
      'fr'
    )
  })

  it('should exit if user cancels Vue.js project creation', async () => {
    const detectionError = new detector.DetectionError('No Vue.js detected')
    vi.mocked(detector.detectContext).mockRejectedValueOnce(detectionError)
    vi.mocked(vueSetup.promptVueSetup).mockResolvedValue(null)

    const command = new VueCommand()
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

    expect(vueInstaller.createVueProject).not.toHaveBeenCalled()
  })

  it('should reject non-Vue.js projects', async () => {
    const reactContext = {
      ...mockContext,
      framework: 'react' as const,
    }

    vi.mocked(detector.detectContext).mockResolvedValueOnce(reactContext)

    try {
      const command = new VueCommand()
      await command.execute({})
    } catch (error) {
      if (error instanceof Error && error.message === 'process.exit called') {
        throw new Error('Should not exit')
      } else {
        throw error
      }
    }

    expect(pluginSelection.promptPluginSelection).not.toHaveBeenCalled()
  })
})
