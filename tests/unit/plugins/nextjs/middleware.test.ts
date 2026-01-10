import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { nextjsMiddlewarePlugin } from '../../../../src/plugins/nextjs/middleware.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Next.js Middleware Plugin', () => {
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
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should always return false to allow creation', () => {
      const result = nextjsMiddlewarePlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should return success without installing packages', async () => {
      const result = await nextjsMiddlewarePlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(result.message).toContain('file')
    })
  })

  describe('configure', () => {
    it('should create middleware.ts for TypeScript project', async () => {
      const result = await nextjsMiddlewarePlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(1)

      const middlewareFile = result.files.find((f) =>
        f.path?.endsWith('middleware.ts')
      )
      expect(middlewareFile).toBeDefined()
      expect(middlewareFile?.type).toBe('create')
      if (middlewareFile?.content) {
        expect(middlewareFile.content).toContain('middleware')
        expect(middlewareFile.content).toContain('NextResponse')
        expect(middlewareFile.content).toContain('matcher')
      }
    })

    it('should create middleware.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await nextjsMiddlewarePlugin.configure(ctx)

      expect(result.success).toBe(true)
      const middlewareFile = result.files.find((f) =>
        f.path?.endsWith('middleware.js')
      )
      expect(middlewareFile).toBeDefined()
    })

    it('should skip creation if middleware.ts already exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)

      const result = await nextjsMiddlewarePlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBe(0)
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await nextjsMiddlewarePlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
