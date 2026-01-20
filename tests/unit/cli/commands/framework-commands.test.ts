/**
 * Unit Tests: Framework Commands (React, Next.js, Vue)
 * Tests paramétrés pour tous les frameworks
 *
 * @group unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReactCommand } from '../../../../src/cli/commands/react-command.js'
import { NextjsCommand } from '../../../../src/cli/commands/nextjs-command.js'
import { VueCommand } from '../../../../src/cli/commands/vue-command.js'
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

// Mock pour les installers
vi.mock('../../../../src/cli/utils/vite-installer.js')
vi.mock('../../../../src/cli/utils/nextjs-installer.js')
vi.mock('../../../../src/cli/utils/vue-installer.js')
vi.mock('../../../../src/cli/prompts/vite-setup.js')
vi.mock('../../../../src/cli/prompts/nextjs-setup.js')
vi.mock('../../../../src/cli/prompts/vue-setup.js')

type FrameworkTestCase = {
  name: string
  Command: typeof ReactCommand | typeof NextjsCommand | typeof VueCommand
  framework: Framework
  mockContext: ProjectContext
}

const frameworkTestCases: FrameworkTestCase[] = [
  {
    name: 'ReactCommand',
    Command: ReactCommand,
    framework: 'react',
    mockContext: {
      framework: 'react',
      frameworkVersion: '19.0.0',
      bundler: 'vite',
      bundlerVersion: '5.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/tmp/test-react',
      srcDir: 'src',
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: 'v20.0.0',
      dependencies: {},
      devDependencies: {},
      hasGit: false,
    },
  },
  {
    name: 'NextjsCommand',
    Command: NextjsCommand,
    framework: 'nextjs',
    mockContext: {
      framework: 'nextjs',
      frameworkVersion: '14.0.0',
      bundler: 'nextjs',
      bundlerVersion: '14.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/tmp/test-nextjs',
      srcDir: 'src',
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: 'v20.0.0',
      dependencies: {},
      devDependencies: {},
      hasGit: false,
      nextjsRouter: 'app',
    },
  },
  {
    name: 'VueCommand',
    Command: VueCommand,
    framework: 'vue',
    mockContext: {
      framework: 'vue',
      frameworkVersion: '3.4.0',
      bundler: 'vite',
      bundlerVersion: '5.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/tmp/test-vue',
      srcDir: 'src',
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: 'v20.0.0',
      dependencies: {},
      devDependencies: {},
      hasGit: false,
      vueVersion: '3',
      vueApi: 'composition',
    } as ProjectContext,
  },
]

describe.each(frameworkTestCases)(
  '$name',
  ({ Command, framework, mockContext }) => {
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
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should return correct framework name', () => {
      const command = new Command()
      // @ts-expect-error - accessing protected method for testing
      expect(command.getFramework()).toBe(framework)
    })

    it('should detect existing project and install plugins', async () => {
      const mockPlugins = [
        {
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'Test',
          category: 'state' as const,
          frameworks: [framework],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )

      const mockInstall = vi.fn().mockResolvedValue({
        success: true,
        installed: ['test-plugin'],
        warnings: [],
        filesCreated: [],
        duration: 100,
      })

      class MockInstaller {
        install = mockInstall
      }

      vi.mocked(installer.Installer).mockImplementation(MockInstaller as never)

      try {
        const command = new Command()
        await command.execute({})
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected behavior
        } else {
          throw error
        }
      }

      expect(detector.detectContext).toHaveBeenCalled()
      expect(pluginSelection.promptPluginSelection).toHaveBeenCalledWith(
        mockContext,
        [],
        'fr'
      )
      expect(mockInstall).toHaveBeenCalled()
    })

    it('should handle all CLI options correctly', async () => {
      const mockPlugins = [
        {
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'Test',
          category: Category.STATE,
          frameworks: [framework],
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(registry.getRecommendedPlugins).mockReturnValue(mockPlugins)

      const mockInstall = vi.fn().mockResolvedValue({
        success: true,
        installed: ['test-plugin'],
        warnings: [],
        filesCreated: [],
        duration: 100,
      })

      class MockInstaller {
        install = mockInstall
      }

      vi.mocked(installer.Installer).mockImplementation(MockInstaller as never)

      try {
        const command = new Command()
        await command.execute({
          yes: true,
          silent: true,
          install: false,
          debug: true,
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'process.exit called') {
          // Expected behavior
        } else {
          throw error
        }
      }

      // Should skip confirmation with silent flag
      expect(confirmation.promptConfirmation).not.toHaveBeenCalled()

      // Should pass skipPackageInstall: true with install: false
      expect(mockInstall).toHaveBeenCalledWith(mockPlugins, {
        skipPackageInstall: true,
      })
    })

    it('should handle dry-run mode', async () => {
      const mockPlugins = [
        {
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'Test',
          category: 'state' as const,
          frameworks: [framework],
          version: '^1.0.0',
          install: vi.fn().mockResolvedValue({ success: true, packages: {} }),
          configure: vi.fn().mockResolvedValue({ success: true, files: [] }),
        },
      ]

      vi.mocked(pluginSelection.promptPluginSelection).mockResolvedValue(
        mockPlugins as never
      )

      const command = new Command()
      await command.execute({ dryRun: true })

      // Should not create installer in dry-run mode
      expect(installer.Installer).not.toHaveBeenCalled()
    })
  }
)
