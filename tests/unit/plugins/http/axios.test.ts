import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { axiosPlugin } from '../../../../src/plugins/http/axios.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Axios Plugin', () => {
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
    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) => p)
  })

  describe('detect', () => {
    it('should return true if axios is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { axios: '^1.13.2' },
      }

      const result = axiosPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false if Axios is not installed', () => {
      const result = axiosPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { axios: '^1.13.2' },
      }

      const result = await axiosPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should install axios', async () => {
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['axios'],
      })

      const result = await axiosPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toEqual(['axios'])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['axios'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should handle installation failure', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await axiosPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install Axios')
    })
  })

  describe('configure', () => {
    beforeEach(() => {
      // Mock ConfigWriter methods
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(
        undefined
      )
      vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    })

    it('should create lib/api.ts for TypeScript project', async () => {
      const result = await axiosPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      // Vérifier que lib/api.ts est créé
      const apiFile = result.files.find((f) => f.path?.endsWith('lib/api.ts'))
      expect(apiFile).toBeDefined()
      expect(apiFile?.type).toBe('create')
      expect(apiFile?.content).toContain('import axios')
      expect(apiFile?.content).toContain('axios.create')
      expect(apiFile?.content).toContain('interceptors')
    })

    it('should create lib/api.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await axiosPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const apiFile = result.files.find((f) => f.path?.endsWith('lib/api.js'))
      expect(apiFile).toBeDefined()
      expect(apiFile?.content).toContain('import axios')
      expect(apiFile?.content).toContain('axios.create')
    })

    it('should create lib/api-types.ts for TypeScript project', async () => {
      const result = await axiosPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const typesFile = result.files.find((f) =>
        f.path?.endsWith('lib/api-types.ts')
      )
      expect(typesFile).toBeDefined()
      expect(typesFile?.type).toBe('create')
      expect(typesFile?.content).toContain('ApiResponse')
      expect(typesFile?.content).toContain('ApiError')
    })

    it('should not create api-types.ts for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await axiosPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const typesFile = result.files.find((f) =>
        f.path?.endsWith('lib/api-types.ts')
      )
      expect(typesFile).toBeUndefined()
    })

    it('should create api instance with correct Axios configuration', async () => {
      const result = await axiosPlugin.configure(mockContext)

      const apiFile = result.files.find((f) => f.path?.endsWith('lib/api.ts'))
      expect(apiFile?.content).toContain('axios.create')
      expect(apiFile?.content).toContain('baseURL')
      expect(apiFile?.content).toContain('timeout')
      expect(apiFile?.content).toContain('headers')
    })

    it('should include request interceptor', async () => {
      const result = await axiosPlugin.configure(mockContext)

      const apiFile = result.files.find((f) => f.path?.endsWith('lib/api.ts'))
      expect(apiFile?.content).toContain('interceptors.request.use')
      expect(apiFile?.content).toContain('Authorization')
      expect(apiFile?.content).toContain('Bearer')
    })

    it('should include response interceptor with error handling', async () => {
      const result = await axiosPlugin.configure(mockContext)

      const apiFile = result.files.find((f) => f.path?.endsWith('lib/api.ts'))
      expect(apiFile?.content).toContain('interceptors.response.use')
      expect(apiFile?.content).toContain('error.response')
      expect(apiFile?.content).toContain('error.request')
      expect(apiFile?.content).toContain('401')
      expect(apiFile?.content).toContain('403')
      expect(apiFile?.content).toContain('404')
      expect(apiFile?.content).toContain('500')
    })

    it('should export default api instance', async () => {
      const result = await axiosPlugin.configure(mockContext)

      const apiFile = result.files.find((f) => f.path?.endsWith('lib/api.ts'))
      expect(apiFile?.content).toContain('export default api')
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await axiosPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure Axios')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await axiosPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      await expect(axiosPlugin.rollback?.(mockContext)).rejects.toThrow(
        'Restore failed'
      )
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(axiosPlugin.name).toBe('axios')
    })

    it('should have correct display name', () => {
      expect(axiosPlugin.displayName).toBe('Axios')
    })

    it('should have correct version', () => {
      expect(axiosPlugin.version).toBe('^1.13.2')
    })

    it('should be compatible with React, Vue, and Svelte', () => {
      expect(axiosPlugin.frameworks).toContain('react')
      expect(axiosPlugin.frameworks).toContain('vue')
      expect(axiosPlugin.frameworks).toContain('svelte')
    })
  })
})
