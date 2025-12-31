import { describe, it, expect, beforeEach, vi } from 'vitest'
import { platform, version } from 'process'
import { fsMocks } from '../test-utils/fs-mocks'
import * as packageManager from '../../../src/utils/package-manager.js'
import {
  detectContext,
  clearDetectionCache,
  DetectionError,
} from '../../../src/core/detector.js'

// Mocks
vi.mock('../../../src/utils/fs-helpers.js')
vi.mock('../../../src/utils/package-manager.js')

describe('detector', () => {
  const mockProjectRoot = '/tmp/test-project'

  beforeEach(() => {
    vi.clearAllMocks()
    clearDetectionCache()
  })

  describe('detectContext', () => {
    it('should detect React + Vite + TypeScript project', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {
          vite: '^5.0.0',
          typescript: '^5.0.0',
        },
      }

      const mockTsConfig = {
        compilerOptions: {
          target: 'ES2022',
        },
      }

      // Mock fs-helpers
      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(mockTsConfig as never)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('vite.config.ts') ||
            pathStr.includes('tsconfig.json') ||
            pathStr.includes('src') ||
            pathStr.includes('public')
        )
      })

      // Mock package-manager
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.framework).toBe('react')
      expect(context.frameworkVersion).toBe('18.2.0')
      expect(context.bundler).toBe('vite')
      expect(context.bundlerVersion).toBe('5.0.0')
      expect(context.typescript).toBe(true)
      expect(context.packageManager).toBe('npm')
      expect(context.lockfile).toBe('package-lock.json')
      expect(context.srcDir).toBe('src')
      expect(context.publicDir).toBe('public')
      expect(context.os).toBe(platform as 'darwin' | 'win32' | 'linux')
      expect(context.nodeVersion).toBe(version)
    })

    it('should detect React + CRA + JavaScript project', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          'react-scripts': '^5.0.0',
        },
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') || pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('yarn')

      const context = await detectContext(mockProjectRoot)

      expect(context.framework).toBe('react')
      expect(context.bundler).toBe('cra')
      expect(context.bundlerVersion).toBe('5.0.0')
      expect(context.typescript).toBe(false)
      expect(context.packageManager).toBe('yarn')
      expect(context.lockfile).toBe('yarn.lock')
    })

    it('should detect Vue project', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          vue: '^3.3.0',
        },
        devDependencies: {
          vite: '^5.0.0',
        },
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('vite.config.js') ||
            pathStr.includes('src') ||
            pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('pnpm')

      const context = await detectContext(mockProjectRoot)

      expect(context.framework).toBe('vue')
      expect(context.frameworkVersion).toBe('3.3.0')
      expect(context.bundler).toBe('vite')
      expect(context.packageManager).toBe('pnpm')
      expect(context.lockfile).toBe('pnpm-lock.yaml')
    })

    it('should detect Svelte project', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          svelte: '^4.0.0',
        },
        devDependencies: {
          vite: '^5.0.0',
        },
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('vite.config.js') ||
            pathStr.includes('src') ||
            pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('bun')

      const context = await detectContext(mockProjectRoot)

      expect(context.framework).toBe('svelte')
      expect(context.frameworkVersion).toBe('4.0.0')
      expect(context.packageManager).toBe('bun')
      expect(context.lockfile).toBe('bun.lockb')
    })

    it('should throw error if package.json not found', async () => {
      fsMocks.readPackageJson.mockRejectedValue(
        new Error('package.json not found')
      )

      await expect(detectContext(mockProjectRoot)).rejects.toThrow(
        DetectionError
      )
      await expect(detectContext(mockProjectRoot)).rejects.toThrow(
        'Invalid project'
      )
    })

    it('should throw error if no framework detected', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {},
        devDependencies: {},
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)

      await expect(detectContext(mockProjectRoot)).rejects.toThrow(
        DetectionError
      )
      await expect(detectContext(mockProjectRoot)).rejects.toThrow(
        'No supported framework detected'
      )
    })

    it('should detect Webpack bundler', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {
          webpack: '^5.0.0',
        },
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('webpack.config.js') ||
            pathStr.includes('src') ||
            pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.bundler).toBe('webpack')
      expect(context.bundlerVersion).toBe('5.0.0')
    })

    it('should return null bundler if none detected', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {},
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') || pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.bundler).toBeNull()
      expect(context.bundlerVersion).toBeNull()
    })

    it('should detect app directory instead of src', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {},
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('app') ||
            pathStr.includes('public') ||
            pathStr.includes('package.json')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.srcDir).toBe('app')
    })

    it('should detect static directory instead of public', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {},
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') ||
            pathStr.includes('static') ||
            pathStr.includes('package.json')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.publicDir).toBe('static')
    })

    it('should detect Git repository', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {},
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') ||
            pathStr.includes('public') ||
            pathStr.includes('.git') ||
            pathStr.includes('hooks')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.hasGit).toBe(true)
      expect(context.gitHooksPath).toBeDefined()
    })

    it('should return cached context on second call', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {},
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') || pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context1 = await detectContext(mockProjectRoot)
      const context2 = await detectContext(mockProjectRoot)

      expect(context1).toEqual(context2)
      // readPackageJson should only be called once due to cache
      expect(fsMocks.readPackageJson).toHaveBeenCalledTimes(1)
    })

    it('should extract dependencies correctly', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
          axios: '^1.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          eslint: '^8.0.0',
        },
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') || pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.dependencies).toEqual({
        react: '^18.2.0',
        axios: '^1.0.0',
      })
      expect(context.devDependencies).toEqual({
        typescript: '^5.0.0',
        eslint: '^8.0.0',
      })
    })

    it('should handle missing dependencies gracefully', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') || pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      const context = await detectContext(mockProjectRoot)

      expect(context.dependencies).toEqual({
        react: '^18.2.0',
      })
      expect(context.devDependencies).toEqual({})
    })
  })

  describe('clearDetectionCache', () => {
    it('should clear the detection cache', async () => {
      const mockPackageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {},
      }

      fsMocks.readPackageJson.mockResolvedValue(mockPackageJson as never)
      fsMocks.readTsConfig.mockResolvedValue(null)
      fsMocks.checkPathExists.mockImplementation((path) => {
        const pathStr = String(path)
        return Promise.resolve(
          pathStr.includes('src') || pathStr.includes('public')
        )
      })
      vi.mocked(packageManager.detectPackageManager).mockResolvedValue('npm')

      await detectContext(mockProjectRoot)
      clearDetectionCache()
      await detectContext(mockProjectRoot)

      // Should be called twice after cache clear
      expect(fsMocks.readPackageJson).toHaveBeenCalledTimes(2)
    })
  })
})
