import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fsExtra from 'fs-extra'
import { resolve } from 'path'
import {
  readPackageJson,
  writePackageJson,
  readTsConfig,
  checkPathExists,
  ensureDirectory,
  copyFile,
  backupFile,
  restoreBackup,
  readFileContent,
  writeFileContent,
  appendToFile,
} from '../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  readJson: vi.fn(),
  writeJson: vi.fn(),
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

// `mockedFs` alias removed; use typed aliases below

// Typed aliases for mocks to avoid unsafe `any` usage
const pathExistsMock = fsExtra.pathExists as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  mockResolvedValue: (v: boolean) => void
  mockReturnValue: (v: boolean) => void
  mockRejectedValue: (e: unknown) => void
}

const readJsonMock = fsExtra.readJson as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  mockResolvedValue: (v: unknown) => void
  mockRejectedValue: (e: unknown) => void
}

const writeJsonMock = fsExtra.writeJson as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  mockResolvedValue: (v: void) => void
  mockRejectedValue: (e: unknown) => void
}

const ensureDirMock = fsExtra.ensureDir as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  mockResolvedValue: (v: void) => void
  mockRejectedValue: (e: unknown) => void
}

const copyFileMock = fsExtra.copyFile as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  mockResolvedValue: (v: void) => void
  mockRejectedValue: (e: unknown) => void
}

const readFileMock = fsExtra.readFile as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  mockResolvedValue: (v: string) => void
  mockRejectedValue: (e: unknown) => void
}

const writeFileMock = fsExtra.writeFile as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  mockResolvedValue: (v: void) => void
  mockRejectedValue: (e: unknown) => void
}

describe('fs-helpers', () => {
  const mockProjectRoot = '/tmp/test-project'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readPackageJson', () => {
    it('should read package.json successfully', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' },
      }

      pathExistsMock.mockImplementation(() => true)
      readJsonMock.mockImplementation(() => mockPackageJson)

      const result = await readPackageJson(mockProjectRoot)

      expect(result).toEqual(mockPackageJson)
      expect(fsExtra.pathExists).toHaveBeenCalledWith(
        resolve(mockProjectRoot, 'package.json')
      )
      expect(fsExtra.readJson).toHaveBeenCalledWith(
        resolve(mockProjectRoot, 'package.json')
      )
    })

    it('should throw error if package.json not found', async () => {
      pathExistsMock.mockImplementation(() => false)

      await expect(readPackageJson(mockProjectRoot)).rejects.toThrow(
        'package.json not found'
      )
    })

    it('should throw error if package.json is invalid JSON', async () => {
      pathExistsMock.mockImplementation(() => true)
      readJsonMock.mockImplementation(() => {
        throw new Error('Invalid JSON')
      })

      await expect(readPackageJson(mockProjectRoot)).rejects.toThrow(
        'Failed to read package.json'
      )
    })
  })

  describe('writePackageJson', () => {
    it('should write package.json successfully', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
      }

      writeJsonMock.mockImplementation(() => Promise.resolve(undefined))

      await writePackageJson(mockProjectRoot, mockPackageJson)

      expect(fsExtra.writeJson).toHaveBeenCalledWith(
        resolve(mockProjectRoot, 'package.json'),
        mockPackageJson,
        {
          spaces: 2,
          EOL: '\n',
        }
      )
    })

    it('should throw error if write fails', async () => {
      const mockPackageJson = { name: 'test' }

      writeJsonMock.mockRejectedValue(new Error('Write failed'))

      await expect(
        writePackageJson(mockProjectRoot, mockPackageJson)
      ).rejects.toThrow('Failed to write package.json')
    })
  })

  describe('readTsConfig', () => {
    it('should read tsconfig.json successfully', async () => {
      const mockTsConfig = {
        compilerOptions: {
          target: 'ES2022',
          strict: true,
        },
      }

      pathExistsMock.mockImplementation(() => true)
      readJsonMock.mockImplementation(() => mockTsConfig)

      const result = await readTsConfig(mockProjectRoot)

      expect(result).toEqual(mockTsConfig)
      expect(fsExtra.pathExists).toHaveBeenCalledWith(
        resolve(mockProjectRoot, 'tsconfig.json')
      )
    })

    it('should return null if no tsconfig.json found', async () => {
      pathExistsMock.mockImplementation(() => false)

      const result = await readTsConfig(mockProjectRoot)

      expect(result).toBeNull()
    })

    it('should try tsconfig.app.json if tsconfig.json not found', async () => {
      const mockTsConfig = { compilerOptions: {} }

      let callCount = 0
      pathExistsMock.mockImplementation(() => {
        callCount++
        return callCount === 2 // false pour tsconfig.json, true pour tsconfig.app.json
      })

      readJsonMock.mockResolvedValue(mockTsConfig)

      const result = await readTsConfig(mockProjectRoot)

      expect(result).toEqual(mockTsConfig)
      expect(fsExtra.pathExists).toHaveBeenCalledWith(
        resolve(mockProjectRoot, 'tsconfig.app.json')
      )
    })

    it('should return null if tsconfig.json is invalid', async () => {
      pathExistsMock.mockImplementation(() => true)

      readJsonMock.mockImplementation(() => {
        throw new Error('Invalid JSON')
      })

      const result = await readTsConfig(mockProjectRoot)

      expect(result).toBeNull()
    })
  })

  describe('checkPathExists', () => {
    it('should return true if path exists', async () => {
      pathExistsMock.mockImplementation(() => true)

      const result = await checkPathExists('/some/path')

      expect(result).toBe(true)
      expect(fsExtra.pathExists).toHaveBeenCalledWith(resolve('/some/path'))
    })

    it('should return false if path does not exist', async () => {
      pathExistsMock.mockResolvedValue(false)

      const result = await checkPathExists('/some/path')

      expect(result).toBe(false)
    })
  })

  describe('ensureDirectory', () => {
    it('should create directory successfully', async () => {
      ensureDirMock.mockResolvedValue(undefined)

      await ensureDirectory('/some/directory')

      expect(fsExtra.ensureDir).toHaveBeenCalledWith(resolve('/some/directory'))
    })

    it('should throw error if directory creation fails', async () => {
      ensureDirMock.mockRejectedValue(new Error('Permission denied'))

      await expect(ensureDirectory('/some/directory')).rejects.toThrow(
        'Failed to create directory'
      )
    })
  })

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      pathExistsMock.mockImplementation(() => true)
      ensureDirMock.mockImplementation(() => undefined)
      copyFileMock.mockImplementation(() => undefined)

      await copyFile('/source/file.txt', '/dest/file.txt')

      expect(fsExtra.pathExists).toHaveBeenCalledWith(
        resolve('/source/file.txt')
      )
      expect(fsExtra.ensureDir).toHaveBeenCalled()
      expect(fsExtra.copyFile).toHaveBeenCalledWith(
        resolve('/source/file.txt'),
        resolve('/dest/file.txt')
      )
    })

    it('should throw error if source file does not exist', async () => {
      pathExistsMock.mockImplementation(() => false)

      await expect(
        copyFile('/source/file.txt', '/dest/file.txt')
      ).rejects.toThrow('Source file not found')
    })

    it('should throw error if copy fails', async () => {
      pathExistsMock.mockResolvedValue(true)

      ensureDirMock.mockResolvedValue(undefined)

      copyFileMock.mockRejectedValue(new Error('Copy failed'))

      await expect(
        copyFile('/source/file.txt', '/dest/file.txt')
      ).rejects.toThrow('Failed to copy file')
    })
  })

  describe('backupFile', () => {
    it('should create backup successfully', async () => {
      const filePath = '/path/to/file.txt'
      pathExistsMock.mockImplementation(() => true)
      ensureDirMock.mockImplementation(() => undefined)
      copyFileMock.mockImplementation(() => undefined)

      const backupPath = await backupFile(filePath)

      expect(backupPath).toContain('.backup')
      expect(fsExtra.pathExists).toHaveBeenCalledWith(resolve(filePath))
      expect(fsExtra.copyFile).toHaveBeenCalled()
    })

    it('should throw error if file does not exist', async () => {
      pathExistsMock.mockResolvedValue(false)

      await expect(backupFile('/path/to/file.txt')).rejects.toThrow(
        'File not found for backup'
      )
    })
  })

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      const backupPath = '/path/to/file.txt.backup'
      const originalPath = '/path/to/file.txt'

      pathExistsMock.mockResolvedValue(true)

      ensureDirMock.mockResolvedValue(undefined)

      copyFileMock.mockResolvedValue(undefined)

      await restoreBackup(backupPath, originalPath)

      expect(fsExtra.pathExists).toHaveBeenCalledWith(resolve(backupPath))
      expect(fsExtra.copyFile).toHaveBeenCalledWith(
        resolve(backupPath),
        resolve(originalPath)
      )
    })

    it('should throw error if backup file does not exist', async () => {
      pathExistsMock.mockResolvedValue(false)

      await expect(
        restoreBackup('/backup.txt', '/original.txt')
      ).rejects.toThrow('Backup file not found')
    })
  })

  describe('readFileContent', () => {
    it('should read file content successfully', async () => {
      const mockContent = 'Hello World'
      pathExistsMock.mockImplementation(() => true)
      readFileMock.mockImplementation(() => mockContent)

      const result = await readFileContent('/path/to/file.txt')

      expect(result).toBe(mockContent)
      expect(fsExtra.pathExists).toHaveBeenCalledWith(
        resolve('/path/to/file.txt')
      )
      expect(fsExtra.readFile).toHaveBeenCalledWith(
        resolve('/path/to/file.txt'),
        'utf-8'
      )
    })

    it('should throw error if file does not exist', async () => {
      pathExistsMock.mockImplementation(() => false)

      await expect(readFileContent('/path/to/file.txt')).rejects.toThrow(
        'File not found'
      )
    })

    it('should throw error if read fails', async () => {
      pathExistsMock.mockImplementation(() => true)
      readFileMock.mockImplementation(() => {
        throw new Error('Read failed')
      })

      await expect(readFileContent('/path/to/file.txt')).rejects.toThrow(
        'Failed to read file'
      )
    })
  })

  describe('writeFileContent', () => {
    it('should write file content successfully', async () => {
      ensureDirMock.mockImplementation(() => undefined)
      writeFileMock.mockImplementation(() => undefined)

      await writeFileContent('/path/to/file.txt', 'Hello World')

      expect(fsExtra.ensureDir).toHaveBeenCalled()
      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        resolve('/path/to/file.txt'),
        'Hello World',
        'utf-8'
      )
    })

    it('should throw error if write fails', async () => {
      ensureDirMock.mockImplementation(() => undefined)
      writeFileMock.mockImplementation(() => {
        throw new Error('Write failed')
      })

      await expect(
        writeFileContent('/path/to/file.txt', 'Hello World')
      ).rejects.toThrow('Failed to write file')
    })
  })

  describe('appendToFile', () => {
    it('should append content to existing file', async () => {
      const existingContent = 'Existing content'
      const newContent = '\nNew content'

      pathExistsMock.mockImplementation(() => true)
      readFileMock.mockImplementation(() => existingContent)
      ensureDirMock.mockImplementation(() => undefined)
      writeFileMock.mockImplementation(() => undefined)

      await appendToFile('/path/to/file.txt', newContent)

      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        resolve('/path/to/file.txt'),
        existingContent + newContent,
        'utf-8'
      )
    })

    it('should create file if it does not exist', async () => {
      const newContent = 'New content'

      pathExistsMock.mockImplementation(() => false)
      ensureDirMock.mockImplementation(() => undefined)
      writeFileMock.mockImplementation(() => undefined)

      await appendToFile('/path/to/file.txt', newContent)

      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        resolve('/path/to/file.txt'),
        newContent,
        'utf-8'
      )
    })
  })
})
