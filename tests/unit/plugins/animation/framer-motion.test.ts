import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { framerMotionPlugin } from '../../../../src/plugins/animation/framer-motion.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Framer Motion Plugin', () => {
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
      dependencies: {},
      devDependencies: {},
    } as unknown as ProjectContext

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['framer-motion'],
    })

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect Framer Motion if installed', () => {
      mockContext.dependencies['framer-motion'] = '^11.11.17'
      expect(framerMotionPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Framer Motion if not installed', () => {
      expect(framerMotionPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Framer Motion', async () => {
      const result = await framerMotionPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('framer-motion')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['framer-motion'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['framer-motion'] = '^11.11.17'

      const result = await framerMotionPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })
  })

  describe('configure', () => {
    it('should create Framer Motion example for TypeScript project', async () => {
      const result = await framerMotionPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(2)

      const animatedBoxFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('components/animation/AnimatedBox.tsx')
      )
      expect(animatedBoxFile).toBeDefined()
      expect(animatedBoxFile?.content).toContain('framer-motion')

      const indexFile = result.files.find((f: { path?: string }) =>
        f.path?.endsWith('components/animation/index.ts')
      )
      expect(indexFile).toBeDefined()
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (framerMotionPlugin.rollback) {
        await framerMotionPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})

