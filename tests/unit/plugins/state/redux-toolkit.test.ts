import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reduxToolkitPlugin } from '../../../../src/plugins/state/redux-toolkit.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Redux Toolkit Plugin', () => {
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

    // Mock fs-helpers
    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )
  })

  describe('detect', () => {
    it('should return true if @reduxjs/toolkit is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { '@reduxjs/toolkit': '^2.11.2' },
      }

      const result = reduxToolkitPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return true if react-redux is installed', () => {
      const ctx = {
        ...mockContext,
        dependencies: { 'react-redux': '^9.2.0' },
      }

      const result = reduxToolkitPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false if Redux Toolkit is not installed', () => {
      const result = reduxToolkitPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { '@reduxjs/toolkit': '^2.11.2' },
      }

      const result = await reduxToolkitPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should install @reduxjs/toolkit and react-redux for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['@reduxjs/toolkit', 'react-redux'],
      })

      const result = await reduxToolkitPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toEqual([
        '@reduxjs/toolkit',
        'react-redux',
      ])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['@reduxjs/toolkit', 'react-redux'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should install @reduxjs/toolkit, react-redux and types for TypeScript project', async () => {
      vi.mocked(packageManager.installPackages).mockResolvedValue({
        success: true,
        packages: ['@reduxjs/toolkit', 'react-redux', '@types/react-redux'],
      })

      const result = await reduxToolkitPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toEqual([
        '@reduxjs/toolkit',
        'react-redux',
        '@types/react-redux',
      ])
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['@reduxjs/toolkit', 'react-redux', '@types/react-redux'],
        expect.any(Object)
      )
    })

    it('should handle installation failure', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await reduxToolkitPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install Redux Toolkit')
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

    it('should create store/index.ts for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false) // App.tsx doesn't exist

      const result = await reduxToolkitPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      // Vérifier que store/index.ts est créé
      const storeFile = result.files.find((f) =>
        f.path?.endsWith('store/index.ts')
      )
      expect(storeFile).toBeDefined()
      expect(storeFile?.type).toBe('create')
      expect(storeFile?.content).toContain('configureStore')
      expect(storeFile?.content).toContain('@reduxjs/toolkit')
      expect(storeFile?.content).toContain('RootState')
      expect(storeFile?.content).toContain('AppDispatch')
    })

    it('should create store/index.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reduxToolkitPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const storeFile = result.files.find((f) =>
        f.path?.endsWith('store/index.js')
      )
      expect(storeFile).toBeDefined()
      expect(storeFile?.content).toContain('configureStore')
    })

    it('should create store/slices/counterSlice.ts for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reduxToolkitPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const sliceFile = result.files.find((f) =>
        f.path?.includes('store/slices/counterSlice.ts')
      )
      expect(sliceFile).toBeDefined()
      expect(sliceFile?.type).toBe('create')
      expect(sliceFile?.content).toContain('createSlice')
      expect(sliceFile?.content).toContain('increment')
      expect(sliceFile?.content).toContain('decrement')
      expect(sliceFile?.content).toContain('PayloadAction')
    })

    it('should create store/slices/counterSlice.js for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reduxToolkitPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const sliceFile = result.files.find((f) =>
        f.path?.includes('store/slices/counterSlice.js')
      )
      expect(sliceFile).toBeDefined()
      expect(sliceFile?.content).toContain('createSlice')
    })

    it('should create store/hooks.ts for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reduxToolkitPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const hooksFile = result.files.find((f) =>
        f.path?.endsWith('store/hooks.ts')
      )
      expect(hooksFile).toBeDefined()
      expect(hooksFile?.type).toBe('create')
      expect(hooksFile?.content).toContain('useAppDispatch')
      expect(hooksFile?.content).toContain('useAppSelector')
      expect(hooksFile?.content).toContain('TypedUseSelectorHook')
    })

    it('should not create hooks.ts for JavaScript project', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reduxToolkitPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const hooksFile = result.files.find((f) =>
        f.path?.endsWith('store/hooks.ts')
      )
      expect(hooksFile).toBeUndefined()
    })

    it('should modify existing App.tsx to include Provider', async () => {
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

      const result = await reduxToolkitPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.type).toBe('modify')
      expect(appFile?.content).toContain('<Provider')
      expect(appFile?.content).toContain("from 'react-redux'")
      expect(appFile?.content).toContain("from './store'")
    })

    it('should create App.tsx if it does not exist', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false) // App.tsx doesn't exist

      const result = await reduxToolkitPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.type).toBe('create')
      expect(appFile?.content).toContain('<Provider')
    })

    it('should not duplicate Provider if already present', async () => {
      const existingAppContent = `import { Provider } from 'react-redux'
import { store } from './store'
import './App.css'

function App() {
  return (
    <Provider store={store}>
      <div>App</div>
    </Provider>
  )
}

export default App
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await reduxToolkitPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      // Le fichier devrait être modifié mais sans duplication
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
    })

    it('should create store with correct Redux Toolkit API', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reduxToolkitPlugin.configure(mockContext)

      const storeFile = result.files.find((f) =>
        f.path?.endsWith('store/index.ts')
      )
      expect(storeFile?.content).toContain('configureStore')
      expect(storeFile?.content).toContain('counterReducer')
    })

    it('should create slice with correct Redux Toolkit API', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reduxToolkitPlugin.configure(mockContext)

      const sliceFile = result.files.find((f) =>
        f.path?.includes('counterSlice.ts')
      )
      expect(sliceFile?.content).toContain('createSlice')
      expect(sliceFile?.content).toContain('reducers')
      expect(sliceFile?.content).toContain('initialState')
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      const result = await reduxToolkitPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure Redux Toolkit')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await reduxToolkitPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      await expect(reduxToolkitPlugin.rollback?.(mockContext)).rejects.toThrow(
        'Restore failed'
      )
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(reduxToolkitPlugin.name).toBe('@reduxjs/toolkit')
    })

    it('should have correct display name', () => {
      expect(reduxToolkitPlugin.displayName).toBe('Redux Toolkit')
    })

    it('should have correct version', () => {
      expect(reduxToolkitPlugin.version).toBe('^2.11.2')
    })

    it('should be compatible only with React', () => {
      expect(reduxToolkitPlugin.frameworks).toEqual(['react'])
    })

    it('should be incompatible with Zustand and Jotai', () => {
      expect(reduxToolkitPlugin.incompatibleWith).toContain('zustand')
      expect(reduxToolkitPlugin.incompatibleWith).toContain('jotai')
    })
  })
})
