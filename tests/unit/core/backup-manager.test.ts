import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolve } from 'path'
import * as fsHelpers from '../../../src/utils/fs-helpers.js'
import { BackupManager } from '../../../src/core/backup-manager.js'

// Mocks
vi.mock('../../../src/utils/fs-helpers.js')

describe('BackupManager', () => {
  let backupManager: BackupManager

  beforeEach(() => {
    backupManager = new BackupManager()
    vi.clearAllMocks()
  })

  describe('backup', () => {
    it('should backup file content', () => {
      const filePath = '/path/to/file.txt'
      const content = 'original content'

      backupManager.backup(filePath, content)

      expect(backupManager.hasBackup(filePath)).toBe(true)
      expect(backupManager.getBackup(filePath)).toBe(content)
    })

    it('should overwrite existing backup', () => {
      const filePath = '/path/to/file.txt'
      const content1 = 'original content'
      const content2 = 'updated content'

      backupManager.backup(filePath, content1)
      backupManager.backup(filePath, content2)

      expect(backupManager.getBackup(filePath)).toBe(content2)
    })

    it('should resolve file path', () => {
      const filePath = './relative/path.txt'
      const content = 'content'

      backupManager.backup(filePath, content)

      const resolvedPath = resolve(filePath)
      expect(backupManager.hasBackup(resolvedPath)).toBe(true)
    })
  })

  describe('backupFromDisk', () => {
    it('should backup file from disk', async () => {
      const filePath = '/path/to/file.txt'
      const content = 'file content'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(content)

      await backupManager.backupFromDisk(filePath)

      expect(backupManager.hasBackup(filePath)).toBe(true)
      expect(backupManager.getBackup(filePath)).toBe(content)
      expect(vi.mocked(fsHelpers.checkPathExists)).toHaveBeenCalled()
      // Check mock was called - normalize the path for cross-platform compatibility
      const calls = vi.mocked(fsHelpers.readFileContent).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const normalizedCall = calls[0]![0].replace(/\\/g, '/')
      const normalizedInput = filePath.replace(/\\/g, '/')
      expect(normalizedCall).toBe(normalizedInput)
    })

    it('should throw error if file does not exist', async () => {
      const filePath = '/path/to/nonexistent.txt'

      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)

      await expect(backupManager.backupFromDisk(filePath)).rejects.toThrow(
        'File not found for backup'
      )
    })
  })

  describe('restore', () => {
    it('should restore file from backup', async () => {
      const filePath = '/path/to/file.txt'
      const content = 'backup content'

      backupManager.backup(filePath, content)
      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await backupManager.restore(filePath)

      const calls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const actualPath = (calls[0]![0] as unknown as string).replace(/\\/g, '/')
      const normalizedFilePath = filePath.replace(/\\/g, '/')
      expect(actualPath).toBe(normalizedFilePath)
      expect(calls[0]![1]).toBe(content)
    })

    it('should throw error if no backup exists', async () => {
      const filePath = '/path/to/file.txt'

      await expect(backupManager.restore(filePath)).rejects.toThrow(
        'No backup found for file'
      )
    })

    it('should throw error if restore fails', async () => {
      const filePath = '/path/to/file.txt'
      const content = 'backup content'

      backupManager.backup(filePath, content)
      vi.mocked(fsHelpers.writeFileContent).mockRejectedValue(
        new Error('Write failed')
      )

      await expect(backupManager.restore(filePath)).rejects.toThrow(
        'Failed to restore file'
      )
    })
  })

  describe('restoreAll', () => {
    it('should restore all backed up files', async () => {
      const file1 = '/path/to/file1.txt'
      const file2 = '/path/to/file2.txt'
      const content1 = 'content1'
      const content2 = 'content2'

      backupManager.backup(file1, content1)
      backupManager.backup(file2, content2)

      vi.mocked(fsHelpers.writeFileContent).mockResolvedValue(undefined)

      await backupManager.restoreAll()

      const calls = vi.mocked(fsHelpers.writeFileContent).mock.calls
      expect(calls.length).toBe(2)
      // Normalize paths for Windows compatibility
      const normalizedCalls = calls.map(
        (call) => [String(call[0]).replace(/\\/g, '/'), call[1]] as const
      )
      const normalizedFile1 = file1.replace(/\\/g, '/')
      const normalizedFile2 = file2.replace(/\\/g, '/')
      expect(normalizedCalls[0][0]).toBe(normalizedFile1)
      expect(normalizedCalls[0][1]).toBe(content1)
      expect(normalizedCalls[1][0]).toBe(normalizedFile2)
      expect(normalizedCalls[1][1]).toBe(content2)
      expect(vi.mocked(fsHelpers.writeFileContent)).toHaveBeenCalledTimes(2)
    })

    it('should do nothing if no backups exist', async () => {
      await backupManager.restoreAll()

      expect(vi.mocked(fsHelpers.writeFileContent)).not.toHaveBeenCalled()
    })

    it('should throw error if some restores fail', async () => {
      const file1 = '/path/to/file1.txt'
      const file2 = '/path/to/file2.txt'
      const content1 = 'content1'
      const content2 = 'content2'

      backupManager.backup(file1, content1)
      backupManager.backup(file2, content2)

      vi.mocked(fsHelpers.writeFileContent).mockResolvedValueOnce(undefined)
      vi.mocked(fsHelpers.writeFileContent).mockRejectedValueOnce(
        new Error('Write failed')
      )

      await expect(backupManager.restoreAll()).rejects.toThrow(
        'Failed to restore'
      )
    })
  })

  describe('hasBackup', () => {
    it('should return true if backup exists', () => {
      const filePath = '/path/to/file.txt'
      backupManager.backup(filePath, 'content')

      expect(backupManager.hasBackup(filePath)).toBe(true)
    })

    it('should return false if no backup exists', () => {
      const filePath = '/path/to/file.txt'

      expect(backupManager.hasBackup(filePath)).toBe(false)
    })
  })

  describe('getBackup', () => {
    it('should return backup content', () => {
      const filePath = '/path/to/file.txt'
      const content = 'backup content'

      backupManager.backup(filePath, content)

      expect(backupManager.getBackup(filePath)).toBe(content)
    })

    it('should return undefined if no backup exists', () => {
      const filePath = '/path/to/file.txt'

      expect(backupManager.getBackup(filePath)).toBeUndefined()
    })
  })

  describe('removeBackup', () => {
    it('should remove backup', () => {
      const filePath = '/path/to/file.txt'
      backupManager.backup(filePath, 'content')

      const removed = backupManager.removeBackup(filePath)

      expect(removed).toBe(true)
      expect(backupManager.hasBackup(filePath)).toBe(false)
    })

    it('should return false if backup does not exist', () => {
      const filePath = '/path/to/file.txt'

      const removed = backupManager.removeBackup(filePath)

      expect(removed).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear all backups', () => {
      backupManager.backup('/path/to/file1.txt', 'content1')
      backupManager.backup('/path/to/file2.txt', 'content2')

      expect(backupManager.size()).toBe(2)

      backupManager.clear()

      expect(backupManager.size()).toBe(0)
      expect(backupManager.hasBackup('/path/to/file1.txt')).toBe(false)
      expect(backupManager.hasBackup('/path/to/file2.txt')).toBe(false)
    })
  })

  describe('size', () => {
    it('should return number of backups', () => {
      expect(backupManager.size()).toBe(0)

      backupManager.backup('/path/to/file1.txt', 'content1')
      expect(backupManager.size()).toBe(1)

      backupManager.backup('/path/to/file2.txt', 'content2')
      expect(backupManager.size()).toBe(2)

      backupManager.removeBackup('/path/to/file1.txt')
      expect(backupManager.size()).toBe(1)
    })
  })

  describe('listBackups', () => {
    it('should return list of backed up file paths', () => {
      const file1 = '/path/to/file1.txt'
      const file2 = '/path/to/file2.txt'

      backupManager.backup(file1, 'content1')
      backupManager.backup(file2, 'content2')

      const backups = backupManager.listBackups()

      expect(backups).toHaveLength(2)
      expect(backups).toContain(resolve(file1))
      expect(backups).toContain(resolve(file2))
    })

    it('should return empty array if no backups', () => {
      const backups = backupManager.listBackups()

      expect(backups).toEqual([])
    })
  })
})
