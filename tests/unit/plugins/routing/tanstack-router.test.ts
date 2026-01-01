import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { tanstackRouterPlugin } from '../../../../src/plugins/routing/tanstack-router.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('TanStack Router Plugin', () => {
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
    }

    // Mock package-manager
    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['@tanstack/react-router'],
    })

    // Mock fs-helpers
    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)

    // Mock ConfigWriter
    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    // Mock BackupManager
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect TanStack Router if installed in dependencies', () => {
      mockContext.dependencies['@tanstack/react-router'] = '^1.144.0'
      expect(tanstackRouterPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect TanStack Router if installed in devDependencies', () => {
      mockContext.devDependencies['@tanstack/react-router'] = '^1.144.0'
      expect(tanstackRouterPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect TanStack Router if not installed', () => {
      expect(tanstackRouterPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install TanStack Router', async () => {
      const result = await tanstackRouterPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('@tanstack/react-router')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['@tanstack/react-router'],
        {
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
          exact: false,
          silent: false,
        }
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['@tanstack/react-router'] = '^1.144.0'

      const result = await tanstackRouterPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await tanstackRouterPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create router files for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await tanstackRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(5) // __root, index, about, router, App

      // Vérifier que les fichiers ont été créés
      const rootRouteFile = result.files.find((f) =>
        f.path?.endsWith('routes/__root.tsx')
      )
      expect(rootRouteFile).toBeDefined()
      expect(rootRouteFile?.type).toBe('create')
      expect(rootRouteFile?.content).toContain('createRootRoute')

      const indexRouteFile = result.files.find((f) =>
        f.path?.endsWith('routes/index.tsx')
      )
      expect(indexRouteFile).toBeDefined()
      expect(indexRouteFile?.content).toContain('createRoute')

      const aboutRouteFile = result.files.find((f) =>
        f.path?.endsWith('routes/about.tsx')
      )
      expect(aboutRouteFile).toBeDefined()

      const routerFile = result.files.find((f) =>
        f.path?.endsWith('router.tsx')
      )
      expect(routerFile).toBeDefined()
      expect(routerFile?.content).toContain('createRouter')

      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.content).toContain('RouterProvider')
    })

    it('should create router files for JavaScript project', async () => {
      mockContext.typescript = false
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await tanstackRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const rootRouteFile = result.files.find((f) =>
        f.path?.endsWith('routes/__root.jsx')
      )
      expect(rootRouteFile).toBeDefined()

      const routerFile = result.files.find((f) =>
        f.path?.endsWith('router.jsx')
      )
      expect(routerFile).toBeDefined()

      const appFile = result.files.find((f) => f.path?.endsWith('App.jsx'))
      expect(appFile).toBeDefined()
    })

    it('should modify existing App.tsx to add RouterProvider', async () => {
      const existingAppContent = `import './App.css'

function App() {
  return <div>Hello</div>
}

export default App
`

      // checkPathExists est appelé 1 seule fois pour vérifier si App.tsx existe
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await tanstackRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.type).toBe('modify')
      expect(appFile?.content).toContain('RouterProvider')
      expect(appFile?.content).toContain("from '@tanstack/react-router'")
      expect(appFile?.content).toContain("from './router'")
    })

    it('should not duplicate RouterProvider if already present', async () => {
      const existingAppContent = `import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './App.css'

function App() {
  return <RouterProvider router={router} />
}

export default App
`

      // checkPathExists est appelé 1 seule fois pour vérifier si App.tsx existe
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await tanstackRouterPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      // Le contenu ne devrait pas avoir de duplication - doit être inchangé
      expect(appFile?.content).toBe(existingAppContent)
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await tanstackRouterPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi.spyOn(
        BackupManager.prototype,
        'restoreAll'
      ).mockResolvedValue(undefined)

      await tanstackRouterPlugin.rollback(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      await expect(tanstackRouterPlugin.rollback(mockContext)).rejects.toThrow()
    })
  })
})
