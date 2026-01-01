import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { jotaiPlugin } from '../../../../src/plugins/state/jotai.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('Jotai Plugin', () => {
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

    // Mock package-manager
    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['jotai'],
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
    it('should detect Jotai if installed in dependencies', () => {
      mockContext.dependencies['jotai'] = '^2.16.1'
      expect(jotaiPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect Jotai if installed in devDependencies', () => {
      mockContext.devDependencies['jotai'] = '^2.16.1'
      expect(jotaiPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect Jotai if not installed', () => {
      expect(jotaiPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install Jotai', async () => {
      const result = await jotaiPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('jotai')
      expect(packageManager.installPackages).toHaveBeenCalledWith(['jotai'], {
        dev: false,
        packageManager: 'npm',
        projectRoot: '/project',
        exact: false,
        silent: false,
      })
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['jotai'] = '^2.16.1'

      const result = await jotaiPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await jotaiPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create store files for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await jotaiPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(3) // atoms.ts, index.ts, App.tsx

      // Vérifier que les fichiers ont été créés
      const atomsFile = result.files.find((f) =>
        f.path?.endsWith('store/atoms.ts')
      )
      expect(atomsFile).toBeDefined()
      expect(atomsFile?.type).toBe('create')
      expect(atomsFile?.content).toContain('atom')
      expect(atomsFile?.content).toContain('countAtom')

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('store/index.ts')
      )
      expect(indexFile).toBeDefined()
      expect(indexFile?.content).toContain("from './atoms'")

      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.content).toContain('Provider')
      expect(appFile?.content).toContain("from 'jotai'")
    })

    it('should create store files for JavaScript project', async () => {
      mockContext.typescript = false
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await jotaiPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const atomsFile = result.files.find((f) =>
        f.path?.endsWith('store/atoms.js')
      )
      expect(atomsFile).toBeDefined()

      const indexFile = result.files.find((f) =>
        f.path?.endsWith('store/index.js')
      )
      expect(indexFile).toBeDefined()

      const appFile = result.files.find((f) => f.path?.endsWith('App.jsx'))
      expect(appFile).toBeDefined()
    })

    it('should modify existing App.tsx to add Provider', async () => {
      const existingAppContent = `import './App.css'

function App() {
  return <div>Hello</div>
}

export default App
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await jotaiPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.type).toBe('modify')
      expect(appFile?.content).toContain('Provider')
      expect(appFile?.content).toContain("from 'jotai'")
    })

    it('should not duplicate Provider if already present', async () => {
      const existingAppContent = `import { Provider } from 'jotai'
import './App.css'

function App() {
  return (
    <Provider>
      <div>Hello</div>
    </Provider>
  )
}

export default App
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await jotaiPlugin.configure(mockContext)

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

      const result = await jotaiPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (jotaiPlugin.rollback) {
        await jotaiPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (jotaiPlugin.rollback) {
        await expect(jotaiPlugin.rollback(mockContext)).rejects.toThrow()
      }
    })
  })
})
