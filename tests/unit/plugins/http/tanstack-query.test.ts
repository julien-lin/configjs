import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { tanstackQueryPlugin } from '../../../../src/plugins/http/tanstack-query.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('TanStack Query Plugin', () => {
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

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['@tanstack/react-query'],
    })

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
    it('should detect TanStack Query if installed in dependencies', () => {
      mockContext.dependencies['@tanstack/react-query'] = '^5.90.16'
      expect(tanstackQueryPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect TanStack Query if installed in devDependencies', () => {
      mockContext.devDependencies['@tanstack/react-query'] = '^5.90.16'
      expect(tanstackQueryPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect TanStack Query if not installed', () => {
      expect(tanstackQueryPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install TanStack Query', async () => {
      const result = await tanstackQueryPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('@tanstack/react-query')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['@tanstack/react-query'],
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
      mockContext.dependencies['@tanstack/react-query'] = '^5.90.16'

      const result = await tanstackQueryPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await tanstackQueryPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create query client and example files for TypeScript project', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await tanstackQueryPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(4) // query-client, example query, example mutation, App

      // Vérifier que les fichiers ont été créés
      const queryClientFile = result.files.find((f) =>
        f.path?.endsWith('lib/query-client.ts')
      )
      expect(queryClientFile).toBeDefined()
      expect(queryClientFile?.type).toBe('create')
      expect(queryClientFile?.content).toContain('QueryClient')

      const exampleQueryFile = result.files.find((f) =>
        f.path?.endsWith('lib/queries/example.ts')
      )
      expect(exampleQueryFile).toBeDefined()
      expect(exampleQueryFile?.content).toContain('useQuery')

      const exampleMutationFile = result.files.find((f) =>
        f.path?.endsWith('lib/mutations/example.ts')
      )
      expect(exampleMutationFile).toBeDefined()
      expect(exampleMutationFile?.content).toContain('useMutation')

      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.content).toContain('QueryClientProvider')
      expect(appFile?.content).toContain("from '@tanstack/react-query'")
    })

    it('should create query client and example files for JavaScript project', async () => {
      mockContext.typescript = false
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await tanstackQueryPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const queryClientFile = result.files.find((f) =>
        f.path?.endsWith('lib/query-client.js')
      )
      expect(queryClientFile).toBeDefined()

      const exampleQueryFile = result.files.find((f) =>
        f.path?.endsWith('lib/queries/example.js')
      )
      expect(exampleQueryFile).toBeDefined()

      const exampleMutationFile = result.files.find((f) =>
        f.path?.endsWith('lib/mutations/example.js')
      )
      expect(exampleMutationFile).toBeDefined()

      const appFile = result.files.find((f) => f.path?.endsWith('App.jsx'))
      expect(appFile).toBeDefined()
    })

    it('should modify existing App.tsx to add QueryClientProvider', async () => {
      const existingAppContent = `import './App.css'

function App() {
  return <div>Hello</div>
}

export default App
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await tanstackQueryPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const appFile = result.files.find((f) => f.path?.endsWith('App.tsx'))
      expect(appFile).toBeDefined()
      expect(appFile?.type).toBe('modify')
      expect(appFile?.content).toContain('QueryClientProvider')
      expect(appFile?.content).toContain("from '@tanstack/react-query'")
      expect(appFile?.content).toContain("from './lib/query-client'")
    })

    it('should not duplicate QueryClientProvider if already present', async () => {
      const existingAppContent = `import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>Hello</div>
    </QueryClientProvider>
  )
}

export default App
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingAppContent)

      const result = await tanstackQueryPlugin.configure(mockContext)

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

      const result = await tanstackQueryPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (tanstackQueryPlugin.rollback) {
        await tanstackQueryPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (tanstackQueryPlugin.rollback) {
        await expect(
          tanstackQueryPlugin.rollback(mockContext)
        ).rejects.toThrow()
      }
    })
  })
})
