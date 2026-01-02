import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reactRouterPlugin } from '../../../../src/plugins/routing/react-router.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('React Router Plugin', () => {
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

    // ConfigWriter et BackupManager sont mockés, pas besoin de les instancier

    // Mock fs-helpers
    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )
  })

  describe('detect', () => {
    it('should return true if react-router-dom is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'react-router-dom': '^7.11.0' },
      }

      const result = reactRouterPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return true if react-router is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'react-router': '^7.11.0' },
      }

      const result = reactRouterPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false if React Router is not installed', () => {
      const result = reactRouterPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'react-router-dom': '^7.11.0' },
      }

      const result = await reactRouterPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should install react-router-dom for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['react-router-dom'],
      })

      const result = await reactRouterPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toEqual(['react-router-dom'])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['react-router-dom'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should install react-router-dom and types for TypeScript project', async () => {
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['react-router-dom', '@types/react-router-dom'],
      })

      const result = await reactRouterPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toEqual([
        'react-router-dom',
        '@types/react-router-dom',
      ])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['react-router-dom', '@types/react-router-dom'],
        expect.any(Object)
      )
    })

    it('should handle installation failure', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await reactRouterPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install React Router')
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

    it('should create router.tsx for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false) // App.tsx doesn't exist

      const result = await reactRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      // Vérifier que router.tsx est créé
      const routerFile = result.files.find((f) =>
        f.path?.endsWith('router.tsx')
      )
      expect(routerFile).toBeDefined()
      expect(routerFile?.type).toBe('create')
      expect(routerFile?.content).toContain('createBrowserRouter')
      expect(routerFile?.content).toContain('react-router-dom')
    })

    it('should create router.jsx for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reactRouterPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const routerFile = result.files.find((f) =>
        f.path?.endsWith('router.jsx')
      )
      expect(routerFile).toBeDefined()
      expect(routerFile?.content).toContain('createBrowserRouter')
    })

    it('should create routes/Home.tsx for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reactRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const homeFile = result.files.find((f) =>
        f.path?.includes('routes/Home.tsx')
      )
      expect(homeFile).toBeDefined()
      expect(homeFile?.type).toBe('create')
      expect(homeFile?.content).toContain('Welcome to React Router v7')
    })

    it('should create routes/Home.jsx for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reactRouterPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const homeFile = result.files.find((f) =>
        f.path?.includes('routes/Home.jsx')
      )
      expect(homeFile).toBeDefined()
    })

    it('should modify existing App.tsx to include RouterProvider', async () => {
      const existingAppContent = `import './App.css'

function App() {
  return (
    <div>
      <h1>My App</h1>
    </div>
  )
}

export default App
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true) // App.tsx exists
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await reactRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.type).toBe('modify')
      expect(appFile?.content).toContain('RouterProvider')
      expect(appFile?.content).toContain("from 'react-router-dom'")
      expect(appFile?.content).toContain("from './router'")
    })

    it('should create App.tsx if it does not exist', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false) // App.tsx doesn't exist

      const result = await reactRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.type).toBe('create')
      expect(appFile?.content).toContain('RouterProvider')
    })

    it('should not duplicate RouterProvider if already present', async () => {
      const existingAppContent = `import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './App.css'

function App() {
  return <RouterProvider router={router} />
}

export default App
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await reactRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      // Le fichier devrait être modifié mais sans duplication
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await reactRouterPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure React Router')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await reactRouterPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      await expect(reactRouterPlugin.rollback?.(mockContext)).rejects.toThrow(
        'Restore failed'
      )
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(reactRouterPlugin.name).toBe('react-router-dom')
    })

    it('should have correct display name', () => {
      expect(reactRouterPlugin.displayName).toBe('React Router')
    })

    it('should have correct version', () => {
      expect(reactRouterPlugin.version).toBe('^7.11.0')
    })

    it('should be compatible only with React', () => {
      expect(reactRouterPlugin.frameworks).toEqual(['react'])
    })

    it('should be incompatible with TanStack Router', () => {
      expect(reactRouterPlugin.incompatibleWith).toContain(
        '@tanstack/react-router'
      )
    })
  })
})
