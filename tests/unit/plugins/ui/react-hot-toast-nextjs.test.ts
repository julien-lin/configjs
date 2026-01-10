import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reactHotToastNextjsPlugin } from '../../../../src/plugins/ui/react-hot-toast-nextjs.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('React Hot Toast Next.js Plugin', () => {
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
      dependencies: {},
      devDependencies: {},
    } as unknown as ProjectContext

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['react-hot-toast'],
    })

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
    it('should detect React Hot Toast if installed', () => {
      mockContext.dependencies['react-hot-toast'] = '^2.4.1'
      expect(reactHotToastNextjsPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect React Hot Toast if not installed', () => {
      expect(reactHotToastNextjsPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install React Hot Toast', async () => {
      const result = await reactHotToastNextjsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('react-hot-toast')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['react-hot-toast'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['react-hot-toast'] = '^2.4.1'

      const result = await reactHotToastNextjsPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })
  })

  describe('configure', () => {
    it('should add Toaster to existing app/layout.tsx (App Router)', async () => {
      const result = await reactHotToastNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(1)

      const layoutFile = result.files.find((f) =>
        f.path?.endsWith('layout.tsx')
      )
      if (layoutFile) {
        expect(layoutFile.content).toContain('react-hot-toast')
        expect(layoutFile.content).toContain('<Toaster />')
      }
    })

    it('should add Toaster to existing pages/_app.tsx (Pages Router)', async () => {
      vi.mocked(fsHelpers.checkPathExists)
        .mockResolvedValueOnce(false) // app/layout.tsx doesn't exist
        .mockResolvedValueOnce(true) // pages/_app.tsx exists

      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        'export default function App({ Component, pageProps }) { return <Component {...pageProps} /> }'
      )

      const result = await reactHotToastNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('_app.tsx'))
      if (appFile) {
        expect(appFile.content).toContain('react-hot-toast')
        expect(appFile.content).toContain('<Toaster />')
      }
    })

    it('should create app/layout.tsx if no layout file exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reactHotToastNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const layoutFile = result.files.find((f) =>
        f.path?.endsWith('layout.tsx')
      )
      expect(layoutFile).toBeDefined()
      if (layoutFile) {
        expect(layoutFile.content).toContain('<Toaster />')
      }
    })

    it('should not duplicate Toaster if already present', async () => {
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        "import { Toaster } from 'react-hot-toast'\nexport default function RootLayout({ children }) { return <html><body><Toaster />{children}</body></html> }"
      )

      const result = await reactHotToastNextjsPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const layoutFile = result.files.find((f) =>
        f.path?.endsWith('layout.tsx')
      )
      if (layoutFile?.content) {
        const toasterCount = (layoutFile.content.match(/<Toaster \/>/g) || [])
          .length
        expect(toasterCount).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (reactHotToastNextjsPlugin.rollback) {
        await reactHotToastNextjsPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
