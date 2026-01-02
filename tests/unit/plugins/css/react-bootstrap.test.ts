import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { reactBootstrapPlugin } from '../../../../src/plugins/css/react-bootstrap.js'
import * as packageManager from '../../../../src/utils/package-manager.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../../src/utils/package-manager.js')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')

describe('React Bootstrap Plugin', () => {
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
    } as ProjectContext

    vi.mocked(packageManager.installPackages).mockResolvedValue({
      success: true,
      packages: ['react-bootstrap', 'bootstrap'],
    })

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')
    vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    // Mock ConfigWriter
    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)

    // Mock BackupManager
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect React Bootstrap if react-bootstrap is installed', () => {
      mockContext.dependencies['react-bootstrap'] = '^2.10.10'
      expect(reactBootstrapPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect React Bootstrap if bootstrap is installed', () => {
      mockContext.dependencies['bootstrap'] = '^5.3.8'
      expect(reactBootstrapPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should detect React Bootstrap if installed in devDependencies', () => {
      mockContext.devDependencies['react-bootstrap'] = '^2.10.10'
      expect(reactBootstrapPlugin.detect?.(mockContext)).toBe(true)
    })

    it('should not detect React Bootstrap if not installed', () => {
      expect(reactBootstrapPlugin.detect?.(mockContext)).toBe(false)
    })
  })

  describe('install', () => {
    it('should install React Bootstrap and Bootstrap', async () => {
      const result = await reactBootstrapPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages?.dependencies).toContain('react-bootstrap')
      expect(result.packages?.dependencies).toContain('bootstrap')
      expect(packageManager.installPackages).toHaveBeenCalledWith(
        ['react-bootstrap', 'bootstrap'],
        expect.objectContaining({
          dev: false,
          packageManager: 'npm',
          projectRoot: '/project',
        })
      )
    })

    it('should skip installation if already installed', async () => {
      mockContext.dependencies['react-bootstrap'] = '^2.10.10'

      const result = await reactBootstrapPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages).toEqual({})
      expect(packageManager.installPackages).not.toHaveBeenCalled()
    })

    it('should handle installation errors', async () => {
      vi.mocked(packageManager.installPackages).mockRejectedValue(
        new Error('Installation failed')
      )

      const result = await reactBootstrapPlugin.install(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to install')
    })
  })

  describe('configure', () => {
    it('should create Bootstrap components for TypeScript project', async () => {
      const existingIndexContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        existingIndexContent
      )

      const result = await reactBootstrapPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThanOrEqual(2)
      const exampleFile = result.files.find((f) =>
        f.path?.endsWith('components/bootstrap/Example.tsx')
      )
      expect(exampleFile).toBeDefined()
      expect(exampleFile?.type).toBe('create')
      expect(exampleFile?.content).toContain('react-bootstrap/Button')
      expect(exampleFile?.content).toContain('react-bootstrap/Card')

      const indexFile = result.files.find((f) => f.path?.endsWith('index.tsx'))
      expect(indexFile).toBeDefined()
      expect(indexFile?.type).toBe('modify')
      expect(indexFile?.content).toContain(
        "'bootstrap/dist/css/bootstrap.min.css'"
      )
    })

    it('should create Bootstrap example and update index for JavaScript project', async () => {
      mockContext.typescript = false
      const existingIndexContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        existingIndexContent
      )

      const result = await reactBootstrapPlugin.configure(mockContext)

      expect(result.success).toBe(true)

      const exampleFile = result.files.find((f) =>
        f.path?.endsWith('components/bootstrap/Example.jsx')
      )
      expect(exampleFile).toBeDefined()

      const indexFile = result.files.find((f) => f.path?.endsWith('index.jsx'))
      expect(indexFile).toBeDefined()
      expect(indexFile?.content).toContain(
        "'bootstrap/dist/css/bootstrap.min.css'"
      )
    })

    it('should create index.tsx if it does not exist', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reactBootstrapPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const indexFile = result.files.find((f) => f.path?.endsWith('index.tsx'))
      expect(indexFile).toBeDefined()
      expect(indexFile?.type).toBe('create')
      expect(indexFile?.content).toContain(
        "'bootstrap/dist/css/bootstrap.min.css'"
      )
    })

    it('should not duplicate Bootstrap CSS import if already present', async () => {
      const existingIndexContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        existingIndexContent
      )

      const result = await reactBootstrapPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const indexFile = result.files.find((f) => f.path?.endsWith('index.tsx'))
      if (indexFile) {
        expect(indexFile.content).toBe(existingIndexContent)
      }
    })

    it('should handle configuration errors gracefully', async () => {
      vi.spyOn(ConfigWriter.prototype, 'createFile').mockRejectedValue(
        new Error('File creation failed')
      )

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      const result = await reactBootstrapPlugin.configure(mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to configure')
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      if (reactBootstrapPlugin.rollback) {
        await reactBootstrapPlugin.rollback(mockContext)
      }

      expect(restoreAllSpy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      vi.spyOn(BackupManager.prototype, 'restoreAll').mockRejectedValue(
        new Error('Restore failed')
      )

      if (reactBootstrapPlugin.rollback) {
        await expect(
          reactBootstrapPlugin.rollback(mockContext)
        ).rejects.toThrow()
      }
    })
  })
})
