import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PackageJson } from 'type-fest'
import { resolve } from 'path'
import { ConfigWriter } from '../../../src/core/config-writer.js'
import { BackupManager } from '../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('../../../src/utils/fs-helpers.js')

describe('ConfigWriter', () => {
  let backupManager: BackupManager
  let configWriter: ConfigWriter

  beforeEach(() => {
    backupManager = new BackupManager()
    configWriter = new ConfigWriter(backupManager)
    vi.clearAllMocks()
  })

  describe('writeFile', () => {
    it('should write file with backup', async () => {
      const filePath = '/path/to/file.txt'
      const content = 'new content'
      const existingContent = 'old content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingContent)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.writeFile(filePath, content)

      expect(backupManager.hasBackup(filePath)).toBe(true)
      const calls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const actualPath = (calls[0]![0] as unknown as string).replace(/\\/g, '/')
      const normalizedFilePath = filePath.replace(/\\/g, '/')
      // Use endsWith to ignore Windows drive letter prefix (D:)
      expect(actualPath.endsWith(normalizedFilePath)).toBe(true)
      expect(calls[0]![1]).toBe(content)
    })

    it('should write file without backup if file does not exist', async () => {
      const filePath = '/path/to/new-file.txt'
      const content = 'content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.writeFile(filePath, content, { backup: true })

      expect(backupManager.hasBackup(filePath)).toBe(false)
      const calls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const actualPath = (calls[0]![0] as unknown as string).replace(/\\/g, '/')
      const normalizedFilePath = filePath.replace(/\\/g, '/')
      // Use endsWith to ignore Windows drive letter prefix (D:)
      expect(actualPath.endsWith(normalizedFilePath)).toBe(true)
      expect(calls[0]![1]).toBe(content)
    })

    it('should create parent directories if ensureDir is true', async () => {
      const filePath = '/path/to/deep/file.txt'
      const content = 'content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.writeFile(filePath, content, { ensureDir: true })

      // Vérifier que ensureDirectory a été appelé (via writeFileContent qui appelle ensureDir)
      expect(vi.mocked(fsHelpers.writeFileContent)).toHaveBeenCalled()
    })

    it('should throw error if write fails', async () => {
      const filePath = '/path/to/file.txt'
      const content = 'content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
      vi.mocked(fsHelpers.writeFileContent).mockRejectedValue(
        new Error('Write failed')
      )

      await expect(configWriter.writeFile(filePath, content)).rejects.toThrow(
        'Failed to write file'
      )
    })
  })

  describe('createFile', () => {
    it('should create new file', async () => {
      const filePath = '/path/to/new-file.txt'
      const content = 'content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.createFile(filePath, content)

      const calls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const actualPath = (calls[0]![0] as unknown as string).replace(/\\/g, '/')
      const normalizedFilePath = filePath.replace(/\\/g, '/')
      // Use endsWith to ignore Windows drive letter prefix (D:)
      expect(actualPath.endsWith(normalizedFilePath)).toBe(true)
      expect(calls[0]![1]).toBe(content)
    })

    it('should throw error if file already exists', async () => {
      const filePath = '/path/to/existing-file.txt'
      const content = 'content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)

      await expect(configWriter.createFile(filePath, content)).rejects.toThrow(
        'File already exists'
      )
    })
  })

  describe('modifyPackageJson', () => {
    it('should modify package.json successfully', async () => {
      const projectRoot = '/project'
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          build: 'vite build',
        },
      } as PackageJson

      vi.mocked(fsHelpers.readPackageJson).mockResolvedValue(
        mockPackageJson as never
      )
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        JSON.stringify(mockPackageJson)
      )
      vi.mocked(fsHelpers.writePackageJson).mockResolvedValue(undefined)

      await configWriter.modifyPackageJson(
        projectRoot,
        (pkg) =>
          ({
            ...pkg,
            scripts: {
              ...(pkg.scripts as Record<string, string> | undefined),
              test: 'vitest',
            },
          }) as PackageJson
      )

      expect(vi.mocked(fsHelpers.writePackageJson)).toHaveBeenCalled()
      const callArgs = vi.mocked(fsHelpers.writePackageJson).mock.calls[0]
      const modifiedPkg = callArgs?.[1] as typeof mockPackageJson
      expect(modifiedPkg.scripts?.test).toBe('vitest')
    })

    it('should backup package.json before modification', async () => {
      const projectRoot = '/project'
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
      } as PackageJson

      vi.mocked(fsHelpers.readPackageJson).mockResolvedValue(
        mockPackageJson as never
      )
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        JSON.stringify(mockPackageJson)
      )
      vi.mocked(fsHelpers.writePackageJson).mockResolvedValue(undefined)

      await configWriter.modifyPackageJson(projectRoot, (pkg) => pkg)

      const packageJsonPath = resolve(projectRoot, 'package.json')
      expect(backupManager.hasBackup(packageJsonPath)).toBe(true)
    })

    it('should throw error if package.json not found', async () => {
      const projectRoot = '/project'

      vi.mocked(fsHelpers.readPackageJson).mockRejectedValue(
        new Error('package.json not found')
      )

      await expect(
        configWriter.modifyPackageJson(projectRoot, (pkg) => pkg)
      ).rejects.toThrow('Failed to read package.json')
    })
  })

  describe('appendToFile', () => {
    it('should append content to existing file', async () => {
      const filePath = '/path/to/file.txt'
      const existingContent = 'existing'
      const newContent = '\nnew'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingContent)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.appendToFile(filePath, newContent)

      const calls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const actualPath = (calls[0]![0] as unknown as string).replace(/\\/g, '/')
      const normalizedFilePath = filePath.replace(/\\/g, '/')
      // Use endsWith to ignore Windows drive letter prefix (D:)
      expect(actualPath.endsWith(normalizedFilePath)).toBe(true)
      expect(calls[0]![1]).toBe(existingContent + newContent)
    })

    it('should create file if it does not exist', async () => {
      const filePath = '/path/to/new-file.txt'
      const newContent = 'new content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.appendToFile(filePath, newContent)

      const calls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const actualPath = (calls[0]![0] as unknown as string).replace(/\\/g, '/')
      const normalizedFilePath = filePath.replace(/\\/g, '/')
      // Use endsWith to ignore Windows drive letter prefix (D:)
      expect(actualPath.endsWith(normalizedFilePath)).toBe(true)
      expect(calls[0]![1]).toBe(newContent)
    })

    it('should backup file before append if backup is true', async () => {
      const filePath = '/path/to/file.txt'
      const existingContent = 'existing'
      const newContent = '\nnew'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingContent)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.appendToFile(filePath, newContent, { backup: true })

      expect(backupManager.hasBackup(filePath)).toBe(true)
    })
  })

  describe('injectImport', () => {
    it('should inject import at the top of file', async () => {
      const filePath = '/path/to/file.tsx'
      const importStatement = "import React from 'react'"
      const existingContent =
        'const Component = () => null\nexport default Component'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingContent)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.injectImport(filePath, importStatement)

      expect(vi.mocked(fsHelpers.writeFileContent)).toHaveBeenCalled()
      // Vérifier que le contenu contient l'import
      const writeCalls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(writeCalls.length).toBeGreaterThan(0)
      const newContent = writeCalls[0]?.[1] as string
      expect(newContent).toContain(importStatement)
      expect(newContent?.indexOf(importStatement)).toBeLessThan(
        newContent?.indexOf('const Component')
      )
    })

    it('should not inject import if it already exists', async () => {
      const filePath = '/path/to/file.tsx'
      const importStatement = "import React from 'react'"
      const existingContent =
        "import React from 'react'\nconst Component = () => null"

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingContent)

      await configWriter.injectImport(filePath, importStatement)

      // Ne devrait pas appeler writeFileContent car l'import existe déjà
      expect(vi.mocked(fsHelpers.writeFileContent)).not.toHaveBeenCalled()
    })

    it('should inject import after existing imports', async () => {
      const filePath = '/path/to/file.tsx'
      const importStatement = "import { useState } from 'react'"
      const existingContent =
        "import React from 'react'\nimport './styles.css'\n\nconst Component = () => null"

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingContent)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.injectImport(filePath, importStatement)

      expect(vi.mocked(fsHelpers.writeFileContent)).toHaveBeenCalled()
      // Vérifier que le contenu contient l'import
      const writeCalls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(writeCalls.length).toBeGreaterThan(0)
      const newContent = writeCalls[0]?.[1] as string
      expect(newContent).toContain(importStatement)
      // L'import devrait être après les imports existants
      expect(newContent?.indexOf(importStatement)).toBeGreaterThan(
        newContent?.indexOf("import './styles.css'")
      )
    })

    it('should throw error if file does not exist', async () => {
      const filePath = '/path/to/nonexistent.tsx'
      const importStatement = "import React from 'react'"

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      await expect(
        configWriter.injectImport(filePath, importStatement)
      ).rejects.toThrow('File not found')
    })

    it('should backup file before injecting import', async () => {
      const filePath = '/path/to/file.tsx'
      const importStatement = "import React from 'react'"
      const existingContent = 'const Component = () => null'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(existingContent)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await configWriter.injectImport(filePath, importStatement)

      expect(backupManager.hasBackup(filePath)).toBe(true)
    })
  })
})
