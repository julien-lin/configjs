import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { nextjsApiRoutesPlugin } from '../../../../src/plugins/nextjs/api-routes.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Next.js API Routes Plugin', () => {
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
      nextjsRouter: 'app', // App Router par défaut
      dependencies: {
        next: '^14.0.0',
      },
      devDependencies: {},
    } as ProjectContext

    vi.mocked(fsHelpers.checkPathExists)
      .mockResolvedValueOnce(false) // app/api/hello/route.ts doesn't exist
      .mockResolvedValueOnce(false) // pages/api/hello.ts doesn't exist
      .mockResolvedValueOnce(true) // app directory exists
      .mockResolvedValueOnce(false) // pages directory doesn't exist

    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should always return false to allow creation', () => {
      const result = nextjsApiRoutesPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should return success without installing packages', async () => {
      const result = await nextjsApiRoutesPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(result.message).toContain('files')
    })
  })

  describe('configure', () => {
    it('should create API route for App Router (TypeScript)', async () => {
      const result = await nextjsApiRoutesPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(1)

      const apiFile = result.files.find((f) =>
        f.path?.endsWith('app/api/hello/route.ts')
      )
      expect(apiFile).toBeDefined()
      expect(apiFile?.type).toBe('create')
      if (apiFile?.content) {
        expect(apiFile.content).toContain('GET')
        expect(apiFile.content).toContain('POST')
        expect(apiFile.content).toContain('NextResponse')
      }
    })

    it('should create API route for Pages Router (TypeScript)', async () => {
      const pagesContext = {
        ...mockContext,
        nextjsRouter: 'pages' as const,
      }

      vi.mocked(fsHelpers.checkPathExists).mockReset()
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValueOnce(false) // pages/api/hello.ts doesn't exist

      const result = await nextjsApiRoutesPlugin.configure(pagesContext)

      expect(result.success).toBe(true)
      const apiFile = result.files.find((f) =>
        f.path?.endsWith('pages/api/hello.ts')
      )
      expect(apiFile).toBeDefined()
      if (apiFile?.content) {
        expect(apiFile.content).toContain('handler')
        expect(apiFile.content).toContain('NextApiRequest')
      }
    })

    it('should create API route for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await nextjsApiRoutesPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const apiFile = result.files.find((f) =>
        f.path?.endsWith('app/api/hello/route.js')
      )
      expect(apiFile).toBeDefined()
    })

    it('should skip creation if API route already exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockReset()
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(true) // app/api/hello/route.ts exists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const result = await nextjsApiRoutesPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBe(0)
    })

    it('should create App Router route by default if no router detected', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockReset()
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)

      const result = await nextjsApiRoutesPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const apiFile = result.files.find((f) =>
        f.path?.endsWith('app/api/hello/route.ts')
      )
      expect(apiFile).toBeDefined()
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await nextjsApiRoutesPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
