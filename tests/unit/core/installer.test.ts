import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  Plugin,
  ProjectContext,
  ValidationResult,
  InstallResult,
  ConfigResult,
} from '../../../src/types/index.js'
import { Category } from '../../../src/types/index.js'
import { Installer } from '../../../src/core/installer.js'
import { CompatibilityValidator } from '../../../src/core/validator.js'
import { ConfigWriter } from '../../../src/core/config-writer.js'
import { BackupManager } from '../../../src/core/backup-manager.js'
import * as packageManager from '../../../src/utils/package-manager.js'

// Mocks
vi.mock('../../../src/utils/package-manager.js')

describe('Installer', () => {
  let mockContext: ProjectContext
  let validator: CompatibilityValidator
  let writer: ConfigWriter
  let backupManager: BackupManager
  let installer: Installer

  const createMockPlugin = (
    name: string,
    options?: {
      requires?: string[]
      detect?: boolean
      installSuccess?: boolean
      configureSuccess?: boolean
    }
  ): Plugin => ({
    name,
    displayName: name,
    description: `Mock plugin ${name}`,
    category: Category.STATE,
    frameworks: ['react'],
    requires: options?.requires,
    detect:
      options?.detect !== undefined
        ? (): Promise<boolean> => Promise.resolve(Boolean(options.detect))
        : undefined,
    install: (): Promise<InstallResult> =>
      Promise.resolve({
        packages: {
          dependencies: options?.installSuccess !== false ? [name] : [],
        },
        success: options?.installSuccess !== false,
        message:
          options?.installSuccess === false ? 'Install failed' : undefined,
      }),
    configure: (): Promise<ConfigResult> =>
      Promise.resolve({
        files: [],
        success: options?.configureSuccess !== false,
        message:
          options?.configureSuccess === false ? 'Configure failed' : undefined,
      }),
  })

  beforeEach(() => {
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

    validator = new CompatibilityValidator([])
    backupManager = new BackupManager()
    writer = new ConfigWriter(backupManager)
    installer = new Installer(mockContext, validator, writer, backupManager)

    vi.clearAllMocks()
  })

  describe('install', () => {
    it('should install plugins successfully', async () => {
      const plugins = [
        createMockPlugin('plugin-a'),
        createMockPlugin('plugin-b'),
      ]

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a', 'plugin-b'],
      })

      const result = await installer.install(plugins)

      expect(result.success).toBe(true)
      expect(result.installed).toHaveLength(2)
      expect(result.installed).toContain('plugin-a')
      expect(result.installed).toContain('plugin-b')
    })

    it('should validate plugins before installation', async () => {
      const plugins = [createMockPlugin('plugin-a')]
      const mockValidationResult: ValidationResult = {
        valid: false,
        errors: [
          {
            type: 'EXCLUSIVE',
            message: 'Plugin conflict',
            plugins: ['plugin-a', 'plugin-b'],
          },
        ],
        warnings: [],
        suggestions: [],
      }

      const validateSpy = vi
        .spyOn(validator, 'validate')
        .mockReturnValue(mockValidationResult)

      const result = await installer.install(plugins)

      expect(result.success).toBe(false)
      expect(validateSpy).toHaveBeenCalledWith(plugins)
    })

    it('should skip already installed plugins', async () => {
      const plugins = [
        createMockPlugin('plugin-a', { detect: true }),
        createMockPlugin('plugin-b', { detect: false }),
      ]

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-b'],
      })

      const result = await installer.install(plugins)

      expect(result.success).toBe(true)
      expect(result.installed).toHaveLength(2)
    })

    it('should run pre-install and post-install hooks', async () => {
      const preInstallHook = vi.fn().mockResolvedValue(undefined)
      const postInstallHook = vi.fn().mockResolvedValue(undefined)

      const plugin: Plugin = {
        ...createMockPlugin('plugin-a'),
        preInstall: preInstallHook,
        postInstall: postInstallHook,
      }

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a'],
      })

      await installer.install([plugin])

      expect(preInstallHook).toHaveBeenCalledWith(mockContext)
      expect(postInstallHook).toHaveBeenCalledWith(mockContext)
    })

    it('should configure plugins sequentially', async () => {
      const plugins = [
        createMockPlugin('plugin-a'),
        createMockPlugin('plugin-b'),
      ]

      const configureCalls: string[] = []
      const pluginsWithSpy = plugins.map((plugin) => ({
        ...plugin,
        configure: vi.fn().mockImplementation(() => {
          configureCalls.push(plugin.name)
          return Promise.resolve({
            files: [],
            success: true,
          })
        }),
      }))

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a', 'plugin-b'],
      })

      await installer.install(pluginsWithSpy)

      expect(configureCalls).toEqual(['plugin-a', 'plugin-b'])
    })

    it('should rollback on configuration failure', async () => {
      const plugin = createMockPlugin('plugin-a', {
        configureSuccess: false,
      })

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a'],
      })

      const rollbackSpy = vi.spyOn(backupManager, 'restoreAll')

      const result = await installer.install([plugin])

      expect(result.success).toBe(false)
      expect(rollbackSpy).toHaveBeenCalled()
    })

    it('should rollback on installation failure', async () => {
      const plugin = createMockPlugin('plugin-a', {
        installSuccess: false,
      })

      const rollbackSpy = vi.spyOn(backupManager, 'restoreAll')

      const result = await installer.install([plugin])

      expect(result.success).toBe(false)
      expect(rollbackSpy).toHaveBeenCalled()
    })

    it('should include warnings in report', async () => {
      const plugins = [createMockPlugin('plugin-a')]
      const mockValidationResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            type: 'CONFLICT',
            message: 'Potential conflict',
            plugins: ['plugin-a', 'plugin-b'],
          },
        ],
        suggestions: [],
      }

      vi.spyOn(validator, 'validate').mockReturnValue(mockValidationResult)
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a'],
      })

      const result = await installer.install(plugins)

      expect(result.success).toBe(true)
      expect(result.warnings).toHaveLength(1)
    })

    it('should collect files created during configuration', async () => {
      const plugin: Plugin = {
        ...createMockPlugin('plugin-a'),
        configure: () =>
          Promise.resolve({
            files: [
              {
                type: 'create',
                path: '/project/src/config.js',
                content: 'export default {}',
              },
            ],
            success: true,
          }),
      }

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a'],
      })

      const result = await installer.install([plugin])

      expect(result.success).toBe(true)
      expect(result.filesCreated).toHaveLength(1)
      expect(result.filesCreated[0]?.path).toBe('/project/src/config.js')
    })

    it('should measure installation duration', async () => {
      const plugins = [createMockPlugin('plugin-a')]

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a'],
      })

      const startTime = Date.now()
      const result = await installer.install(plugins)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 100) // Marge pour les opérations async
    })

    it('should handle plugin rollback on error', async () => {
      const rollbackSpy = vi.fn().mockResolvedValue(undefined)
      const plugin: Plugin = {
        ...createMockPlugin('plugin-a', { configureSuccess: false }),
        rollback: rollbackSpy,
      }

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['plugin-a'],
      })

      await installer.install([plugin])

      expect(rollbackSpy).toHaveBeenCalledWith(mockContext)
    })
  })
})
