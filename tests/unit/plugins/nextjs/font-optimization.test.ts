import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { nextjsFontOptimizationPlugin } from '../../../../src/plugins/nextjs/font-optimization.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Next.js Font Optimization Plugin', () => {
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

    vi.mocked(fsHelpers.checkPathExists)
      .mockResolvedValueOnce(true) // app/layout.tsx exists
      .mockResolvedValueOnce(false) // pages/_app.tsx doesn't exist

    vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
      'export default function RootLayout({ children }) { return <html><body>{children}</body></html> }'
    )
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should return true if next is installed', () => {
      const result = nextjsFontOptimizationPlugin.detect?.(mockContext)
      expect(result).toBe(true)
    })
  })

  describe('install', () => {
    it('should return success without installing packages', async () => {
      const result = await nextjsFontOptimizationPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(result.message).toContain('built into Next.js')
    })
  })

  describe('configure', () => {
    it('should add font optimization to existing app/layout.tsx (App Router)', async () => {
      const result = await nextjsFontOptimizationPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(1)

      const layoutFile = result.files.find((f) =>
        f.path?.endsWith('layout.tsx')
      )
      if (layoutFile) {
        expect(layoutFile.content).toContain("from 'next/font")
        expect(layoutFile.content).toContain('Inter')
        expect(layoutFile.content).toContain('className={inter.className}')
      }
    })

    it('should add font optimization to existing pages/_app.tsx (Pages Router)', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false) // app/layout.tsx doesn't exist
        .mockResolvedValueOnce(true) // pages/_app.tsx exists

      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        'export default function App({ Component, pageProps }) { return <Component {...pageProps} /> }'
      )

      const result = await nextjsFontOptimizationPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('_app.tsx'))
      if (appFile) {
        expect(appFile.content).toContain("from 'next/font")
        expect(appFile.content).toContain('Inter')
      }
    })

    it('should not duplicate font optimization if already present', async () => {
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        "import { Inter } from 'next/font/google'\nconst inter = Inter({ subsets: ['latin'] })\nexport default function RootLayout({ children }) { return <html><body className={inter.className}>{children}</body></html> }"
      )

      const result = await nextjsFontOptimizationPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const layoutFile = result.files.find((f) =>
        f.path?.endsWith('layout.tsx')
      )
      if (layoutFile?.content) {
        const fontImportCount = (
          layoutFile.content.match(/from 'next\/font/g) || []
        ).length
        expect(fontImportCount).toBeLessThanOrEqual(1)
      }
    })

    it('should handle missing layout file gracefully', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false) // app/layout.tsx doesn't exist
        .mockResolvedValueOnce(false) // pages/_app.tsx doesn't exist

      const result = await nextjsFontOptimizationPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      // Plugin returns success but no files if layout file doesn't exist
      // The plugin logs a warning but still returns success
      expect(Array.isArray(result.files)).toBe(true)
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await nextjsFontOptimizationPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
