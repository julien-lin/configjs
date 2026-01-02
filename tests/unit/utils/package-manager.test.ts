import { describe, it, expect, beforeEach, vi } from 'vitest'
import { execa } from 'execa'
import { pathExists } from 'fs-extra'
import {
  detectPackageManager,
  installPackages,
  uninstallPackages,
  runScript,
} from '../../../src/utils/package-manager.js'
import type { PackageManager } from '../../../src/types/index.js'

// Mocks
vi.mock('execa')
vi.mock('fs-extra')

describe('package-manager', () => {
  const mockProjectRoot = '/tmp/test-project'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectPackageManager', () => {
    it('should detect pnpm from pnpm-lock.yaml', async () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      vi.mocked(pathExists).mockImplementation((path: string) => {
        const normalizedPath = String(path).replace(/\\/g, '/')
        if (normalizedPath.includes('pnpm-lock.yaml')) {
          return Promise.resolve(true)
        }
        return Promise.resolve(false)
      })

      const result = await detectPackageManager(mockProjectRoot)

      expect(result).toBe('pnpm')
    })

    it('should detect yarn from yarn.lock', async () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      vi.mocked(pathExists).mockImplementation((path: string) => {
        const normalizedPath = String(path).replace(/\\/g, '/')
        if (normalizedPath.includes('yarn.lock')) {
          return Promise.resolve(true)
        }
        return Promise.resolve(false)
      })

      const result = await detectPackageManager(mockProjectRoot)

      expect(result).toBe('yarn')
    })

    it('should detect npm from package-lock.json', async () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      vi.mocked(pathExists).mockImplementation((path: string) => {
        const normalizedPath = String(path).replace(/\\/g, '/')
        if (normalizedPath.includes('package-lock.json')) {
          return Promise.resolve(true)
        }
        return Promise.resolve(false)
      })

      const result = await detectPackageManager(mockProjectRoot)

      expect(result).toBe('npm')
    })

    it('should detect bun from bun.lockb', async () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      vi.mocked(pathExists).mockImplementation((path: string) => {
        const normalizedPath = String(path).replace(/\\/g, '/')
        if (normalizedPath.includes('bun.lockb')) {
          return Promise.resolve(true)
        }
        return Promise.resolve(false)
      })

      const result = await detectPackageManager(mockProjectRoot)

      expect(result).toBe('bun')
    })

    it('should default to npm when no lockfile found', async () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      vi.mocked(pathExists).mockImplementation(() => Promise.resolve(false))

      const result = await detectPackageManager(mockProjectRoot)

      expect(result).toBe('npm')
    })

    it('should prioritize pnpm over yarn when both exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      vi.mocked(pathExists).mockImplementation((path: string) => {
        const normalizedPath = String(path).replace(/\\/g, '/')
        return Promise.resolve(
          normalizedPath.includes('pnpm-lock.yaml') ||
          normalizedPath.includes('yarn.lock')
        )
      })

      const result = await detectPackageManager(mockProjectRoot)

      expect(result).toBe('pnpm')
    })
  })

  describe('installPackages', () => {
    const mockOptions = {
      packageManager: 'npm' as PackageManager,
      projectRoot: mockProjectRoot,
      dev: false,
      exact: false,
      silent: false,
    }

    const mockExecaResult = {
      exitCode: 0,
      stdout: '',
      stderr: '',
      command: '',
      escapedCommand: '',
      killed: false,
      signal: null,
      timedOut: false,
      isCanceled: false,
      failed: false,
    } as unknown as Awaited<ReturnType<typeof execa>>

    it('should install packages with npm', async () => {
      vi.mocked(execa).mockResolvedValue(mockExecaResult)

      const result = await installPackages(['axios', 'zustand'], mockOptions)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual(['axios', 'zustand'])
      const callArgs = vi.mocked(execa).mock.calls[0]
      expect(callArgs?.[0]).toBe('npm')
      expect(callArgs?.[1]).toEqual(['install', 'axios', 'zustand'])
    })

    it('should install dev dependencies with --save-dev', async () => {
      vi.mocked(execa).mockResolvedValue(mockExecaResult)

      await installPackages(['eslint'], {
        ...mockOptions,
        dev: true,
      })

      const callArgs = vi.mocked(execa).mock.calls[0]
      expect(callArgs?.[0]).toBe('npm')
      expect(callArgs?.[1]).toEqual(['install', '--save-dev', 'eslint'])
    })

    it('should install with pnpm', async () => {
      vi.mocked(execa).mockResolvedValue(mockExecaResult)

      await installPackages(['axios'], {
        ...mockOptions,
        packageManager: 'pnpm',
      })

      const callArgs = vi.mocked(execa).mock.calls[0]
      expect(callArgs?.[0]).toBe('pnpm')
      expect(callArgs?.[1]).toEqual(['add', 'axios'])
    })

    it('should install with yarn', async () => {
      vi.mocked(execa).mockResolvedValue(mockExecaResult)

      await installPackages(['axios'], {
        ...mockOptions,
        packageManager: 'yarn',
      })

      const callArgs = vi.mocked(execa).mock.calls[0]
      expect(callArgs?.[0]).toBe('yarn')
      expect(callArgs?.[1]).toEqual(['add', 'axios'])
    })

    it('should return success false on installation failure', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Installation failed'))

      const result = await installPackages(['axios'], mockOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return success true for empty packages array', async () => {
      const result = await installPackages([], mockOptions)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual([])
      expect(execa).not.toHaveBeenCalled()
    })

    it('should use exact version with --save-exact', async () => {
      vi.mocked(execa).mockResolvedValue(mockExecaResult)

      await installPackages(['axios'], {
        ...mockOptions,
        exact: true,
      })

      const callArgs = vi.mocked(execa).mock.calls[0]
      expect(callArgs?.[0]).toBe('npm')
      expect(callArgs?.[1]).toEqual(['install', '--save-exact', 'axios'])
    })
  })

  describe('uninstallPackages', () => {
    const mockOptions = {
      packageManager: 'npm' as PackageManager,
      projectRoot: mockProjectRoot,
    }

    const mockExecaResult = {
      exitCode: 0,
      stdout: '',
      stderr: '',
      command: '',
      escapedCommand: '',
      killed: false,
      signal: null,
      timedOut: false,
      isCanceled: false,
      failed: false,
    } as unknown as Awaited<ReturnType<typeof execa>>

    it('should uninstall packages with npm', async () => {
      vi.mocked(execa).mockResolvedValue(mockExecaResult)

      const result = await uninstallPackages(['axios'], mockOptions)

      expect(result.success).toBe(true)
      const callArgs = vi.mocked(execa).mock.calls[0]
      expect(callArgs?.[0]).toBe('npm')
      expect(callArgs?.[1]).toEqual(['uninstall', 'axios'])
    })

    it('should return success false on uninstallation failure', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Uninstallation failed'))

      const result = await uninstallPackages(['axios'], mockOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('runScript', () => {
    const mockOptions = {
      packageManager: 'npm' as PackageManager,
      projectRoot: mockProjectRoot,
    }

    const mockExecaResult = {
      exitCode: 0,
      stdout: '',
      stderr: '',
      command: '',
      escapedCommand: '',
      killed: false,
      signal: null,
      timedOut: false,
      isCanceled: false,
      failed: false,
    } as unknown as Awaited<ReturnType<typeof execa>>

    it('should run script with npm', async () => {
      vi.mocked(execa).mockResolvedValue(mockExecaResult)

      const result = await runScript('build', mockOptions)

      expect(result.success).toBe(true)
      const callArgs = vi.mocked(execa).mock.calls[0]
      expect(callArgs?.[0]).toBe('npm')
      expect(callArgs?.[1]).toEqual(['run', 'build'])
    })

    it('should return success false on script failure', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Script failed'))

      const result = await runScript('build', mockOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
