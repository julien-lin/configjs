import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { nextjsImageOptimizationPlugin } from '../../../../src/plugins/nextjs/image-optimization.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Next.js Image Optimization Plugin', () => {
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
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: '20.0.0',
      hasGit: false,
      dependencies: {
        next: '^14.0.0',
      },
      devDependencies: {},
    } as ProjectContext

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should return true if next is installed', () => {
      const result = nextjsImageOptimizationPlugin.detect?.(mockContext)
      expect(result).toBe(true)
    })

    it('should return false if next is not installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: {},
      }
      const result = nextjsImageOptimizationPlugin.detect?.(ctx)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should return success without installing packages', async () => {
      const result = await nextjsImageOptimizationPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(result.message).toContain('built into Next.js')
    })
  })

  describe('configure', () => {
    it('should create next.config.ts with image optimization for TypeScript project', async () => {
      const result = await nextjsImageOptimizationPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(1)

      const configFile = result.files.find((f) =>
        f.path?.endsWith('next.config.ts')
      )
      expect(configFile).toBeDefined()
      expect(configFile?.type).toBe('create')
      if (configFile?.content) {
        expect(configFile.content).toContain('images:')
        expect(configFile.content).toContain('remotePatterns')
      }
    })

    it('should create next.config.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await nextjsImageOptimizationPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.endsWith('next.config.js')
      )
      expect(configFile).toBeDefined()
    })

    it('should modify existing next.config.ts to add image optimization', async () => {
      // Use a format that matches the regex in injectImageConfig
      const existingConfig = `import type { NextConfig } from 'next'

const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingConfig)

      const result = await nextjsImageOptimizationPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      // The plugin should modify the file if content changed
      // injectImageConfig should add images config to the existing config
      const configFile = result.files.find((f) =>
        f.path?.endsWith('next.config.ts')
      )
      // The regex should match and add images config
      expect(configFile).toBeDefined()
      if (configFile) {
        expect(configFile.type).toBe('modify')
        if (configFile.content) {
          expect(configFile.content).toContain('images:')
          expect(configFile.content).toContain('remotePatterns')
        }
      }
    })

    it('should not duplicate image configuration if already present', async () => {
      const existingConfig = `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingConfig)

      const result = await nextjsImageOptimizationPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.endsWith('next.config.ts')
      )
      if (configFile?.content) {
        const imagesCount = (configFile.content.match(/images:/g) || []).length
        expect(imagesCount).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await nextjsImageOptimizationPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
