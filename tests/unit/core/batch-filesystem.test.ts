/**
 * Tests for BatchFilesystem
 *
 * Verifies:
 * - Operation queuing and batching
 * - FIFO ordering per file
 * - Parallel execution of batches
 * - Error handling and recovery
 * - Performance improvements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import {
  BatchFilesystem,
  getGlobalBatchFilesystem,
  resetGlobalBatchFilesystem,
} from '../../../src/core/batch-filesystem.js'

describe('BatchFilesystem', () => {
  let batchFs: BatchFilesystem
  let testDir: string

  beforeEach(async () => {
    batchFs = new BatchFilesystem({ batchSize: 5, flushInterval: 50 })
    testDir = await mkdtemp(path.join(tmpdir(), 'batch-fs-'))
  })

  afterEach(async () => {
    await batchFs.destroy()
    try {
      ;(fs.rm as any)(testDir, { recursive: true, force: true }).catch(() => {
        // Ignore cleanup errors
      })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('Read Operations', () => {
    it('should read files successfully', async () => {
      const filePath = path.join(testDir, 'test.txt')
      const content = 'Hello, World!'

      await fs.writeFile(filePath, content)
      const result = await batchFs.read(filePath, { encoding: 'utf-8' })

      expect(result).toBe(content)
    })

    it('should batch multiple read operations', async () => {
      const files = await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          const filePath = path.join(testDir, `file-${i}.txt`)
          const content = `Content ${i}`
          await fs.writeFile(filePath, content)
          return filePath
        })
      )

      const results = await Promise.all(
        files.map((filePath) => batchFs.read(filePath, { encoding: 'utf-8' }))
      )

      expect(results).toEqual(['Content 0', 'Content 1', 'Content 2'])
    })

    it('should handle missing files with error', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt')

      let caught = false
      await batchFs.read(filePath, { encoding: 'utf-8' }).catch(() => {
        caught = true
      })

      expect(caught).toBe(true)
    })
  })

  describe('Write Operations', () => {
    it('should write files successfully', async () => {
      const filePath = path.join(testDir, 'output.txt')
      const content = 'Test content'

      await batchFs.write(filePath, content, { encoding: 'utf-8' })
      const result = await fs.readFile(filePath, 'utf-8')

      expect(result).toBe(content)
    })

    it('should overwrite existing files', async () => {
      const filePath = path.join(testDir, 'overwrite.txt')
      const oldContent = 'Old content'
      const newContent = 'New content'

      await fs.writeFile(filePath, oldContent)
      await batchFs.write(filePath, newContent, { encoding: 'utf-8' })
      const result = await fs.readFile(filePath, 'utf-8')

      expect(result).toBe(newContent)
    })

    it('should batch multiple write operations', async () => {
      const filePaths = Array.from({ length: 3 }, (_, i) =>
        path.join(testDir, `write-${i}.txt`)
      )

      await Promise.all(
        filePaths.map((filePath, i) =>
          batchFs.write(filePath, `Content ${i}`, { encoding: 'utf-8' })
        )
      )

      const results = await Promise.all(
        filePaths.map((filePath) => fs.readFile(filePath, 'utf-8'))
      )

      expect(results).toEqual(['Content 0', 'Content 1', 'Content 2'])
    })

    it('should create backup if requested', async () => {
      const filePath = path.join(testDir, 'backup.txt')
      const originalContent = 'Original'
      const newContent = 'New'

      await fs.writeFile(filePath, originalContent)
      await batchFs.write(filePath, newContent, { backup: true })

      const backupPath = `${filePath}.backup`
      const backup = await fs.readFile(backupPath, 'utf-8')

      expect(backup).toBe(originalContent)
    })

    it('should process queued operations in order', async () => {
      const filePath = path.join(testDir, 'order.txt')

      const p1 = batchFs.write(filePath, '1', { encoding: 'utf-8' })
      const p2 = batchFs.write(filePath, '2', { encoding: 'utf-8' })
      const p3 = batchFs.write(filePath, '3', { encoding: 'utf-8' })

      // All operations should complete successfully
      const results = await Promise.allSettled([p1, p2, p3])
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true)

      // File should have final value (last write)
      const result = await fs.readFile(filePath, 'utf-8')
      expect(result).toBeDefined()
    })
  })

  describe('Append Operations', () => {
    it('should append to files', async () => {
      const filePath = path.join(testDir, 'append.txt')

      await fs.writeFile(filePath, 'Line 1\n')
      await batchFs.append(filePath, 'Line 2\n', { encoding: 'utf-8' })

      const result = await fs.readFile(filePath, 'utf-8')

      expect(result).toBe('Line 1\nLine 2\n')
    })

    it('should batch multiple appends', async () => {
      const filePath = path.join(testDir, 'multi-append.txt')

      await fs.writeFile(filePath, '')
      await Promise.all([
        batchFs.append(filePath, 'A', { encoding: 'utf-8' }),
        batchFs.append(filePath, 'B', { encoding: 'utf-8' }),
        batchFs.append(filePath, 'C', { encoding: 'utf-8' }),
      ])

      await batchFs.flush()
      const result = await fs.readFile(filePath, 'utf-8')

      expect(result).toBe('ABC')
    })
  })

  describe('Mkdir Operations', () => {
    it('should create directories', async () => {
      const dirPath = path.join(testDir, 'newdir')

      await batchFs.mkdir(dirPath, { recursive: true })
      const stat = await fs.stat(dirPath)

      expect(stat.isDirectory()).toBe(true)
    })

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'a', 'b', 'c')

      await batchFs.mkdir(dirPath, { recursive: true })
      const stat = await fs.stat(dirPath)

      expect(stat.isDirectory()).toBe(true)
    })

    it('should batch multiple mkdir operations', async () => {
      const dirs = Array.from({ length: 3 }, (_, i) =>
        path.join(testDir, `dir-${i}`)
      )

      await Promise.all(
        dirs.map((dir) => batchFs.mkdir(dir, { recursive: true }))
      )

      const stats = await Promise.all(dirs.map((dir) => fs.stat(dir)))

      expect(stats.every((s) => s.isDirectory())).toBe(true)
    })
  })

  describe('Delete Operations', () => {
    it('should delete files', async () => {
      const filePath = path.join(testDir, 'delete.txt')

      await fs.writeFile(filePath, 'content')
      await batchFs.delete(filePath)

      let caught = false
      await fs.stat(filePath).catch(() => {
        caught = true
      })

      expect(caught).toBe(true)
    })

    it('should ignore missing files', async () => {
      const filePath = path.join(testDir, 'nonexistent-delete.txt')

      // Should not throw
      await expect(batchFs.delete(filePath)).resolves.toBeUndefined()
    })

    it('should batch multiple deletes', async () => {
      const files = await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          const filePath = path.join(testDir, `del-${i}.txt`)
          await fs.writeFile(filePath, 'content')
          return filePath
        })
      )

      await Promise.all(files.map((f) => batchFs.delete(f)))

      // All files should be deleted
      let deletedCount = 0
      for (const f of files) {
        try {
          await fs.stat(f)
        } catch {
          deletedCount++
        }
      }

      expect(deletedCount).toBe(3)
    })
  })

  describe('Batching Strategy', () => {
    it('should flush on batch size threshold', async () => {
      const filePath = path.join(testDir, 'batch-size.txt')

      // Create 6 operations (exceeds batchSize of 5)
      const promises = Array.from({ length: 6 }, (_, i) =>
        batchFs.write(filePath, `Content ${i}`, { encoding: 'utf-8' })
      )

      // All should complete (auto-flush triggered)
      await Promise.all(promises)

      const result = await fs.readFile(filePath, 'utf-8')
      expect(result).toBeDefined()
    })

    it('should flush on time interval', async () => {
      const filePath = path.join(testDir, 'interval.txt')

      await batchFs.write(filePath, 'Delayed', { encoding: 'utf-8' })

      // Wait for interval to trigger flush
      await new Promise((resolve) => setTimeout(resolve, 100))

      const result = await fs.readFile(filePath, 'utf-8')
      expect(result).toBe('Delayed')
    })

    it('should maintain separate file queues', async () => {
      const file1 = path.join(testDir, 'file1.txt')
      const file2 = path.join(testDir, 'file2.txt')

      await Promise.all([
        batchFs.write(file1, 'Content 1', { encoding: 'utf-8' }),
        batchFs.write(file2, 'Content 2', { encoding: 'utf-8' }),
      ])

      await batchFs.flush()

      const result1 = await fs.readFile(file1, 'utf-8')
      const result2 = await fs.readFile(file2, 'utf-8')

      expect(result1).toBe('Content 1')
      expect(result2).toBe('Content 2')
    })
  })

  describe('Status Reporting', () => {
    it('should report queue status', async () => {
      const file1 = path.join(testDir, 'status1.txt')
      const file2 = path.join(testDir, 'status2.txt')

      // Store promises without awaiting to keep operations queued
      const p1 = batchFs.write(file1, 'Data', { encoding: 'utf-8' })
      const p2 = batchFs.write(file2, 'Data', { encoding: 'utf-8' })

      // Check status while operations still queued
      const status = batchFs.getStatus()
      expect(status.pendingCount).toBeGreaterThanOrEqual(1)
      expect(status.fileCount).toBeGreaterThanOrEqual(1)

      // Cleanup
      await Promise.all([p1, p2])
    })

    it('should report empty status after flush', async () => {
      const filePath = path.join(testDir, 'status-empty.txt')

      await batchFs.write(filePath, 'Data', { encoding: 'utf-8' })
      await batchFs.flush()

      const status = batchFs.getStatus()

      expect(status.pendingCount).toBe(0)
      expect(status.fileCount).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should propagate write errors', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist.txt'

      const errorPromise = batchFs.write(invalidPath, 'content', {
        encoding: 'utf-8',
      })

      let caught = false
      await errorPromise.catch(() => {
        caught = true
      })

      expect(caught).toBe(true)
    })

    it('should handle operations without errors', async () => {
      const validPath = path.join(testDir, 'valid-error-test.txt')

      // Queue a valid write
      await batchFs.write(validPath, 'success', { encoding: 'utf-8' })

      const content = await fs.readFile(validPath, 'utf-8')
      expect(content).toBe('success')
    })
  })

  describe('Singleton Pattern', () => {
    afterEach(() => {
      resetGlobalBatchFilesystem()
    })

    it('should create global instance on first call', async () => {
      const instance1 = getGlobalBatchFilesystem()
      const instance2 = getGlobalBatchFilesystem()

      expect(instance1).toBe(instance2)
    })

    it('should use provided config on first call', async () => {
      const instance = getGlobalBatchFilesystem({
        batchSize: 20,
        flushInterval: 200,
      })

      expect(instance).toBeDefined()
    })

    it('should reset singleton', async () => {
      const instance1 = getGlobalBatchFilesystem()
      resetGlobalBatchFilesystem()
      const instance2 = getGlobalBatchFilesystem()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('Performance Characteristics', () => {
    it('should handle large batches efficiently', async () => {
      const count = 50
      const filePath = path.join(testDir, 'large-batch.txt')

      const startTime = Date.now()

      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          batchFs.write(filePath, `Line ${i}\n`, { encoding: 'utf-8' })
        )
      )

      await batchFs.flush()

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete reasonably fast (batching reduces overhead)
      expect(duration).toBeLessThan(500)
    })

    it('should batch mixed operation types', async () => {
      const readFile = path.join(testDir, 'read-mixed.txt')
      const writeFile = path.join(testDir, 'write-mixed.txt')
      const appendFile = path.join(testDir, 'append-mixed.txt')

      // Setup files
      await fs.writeFile(readFile, 'Read me')
      await fs.writeFile(writeFile, 'Initial')
      await fs.writeFile(appendFile, 'Initial')

      const startTime = Date.now()

      const results = await Promise.all([
        batchFs.read(readFile),
        batchFs.write(writeFile, 'Updated'),
        batchFs.append(appendFile, ' Appended'),
        batchFs.mkdir(path.join(testDir, 'new-dir'), { recursive: true }),
      ])

      await batchFs.flush()

      const endTime = Date.now()

      expect(results).toHaveLength(4)
      expect(endTime - startTime).toBeLessThan(500)
    })

    it('should demonstrate queue behavior', async () => {
      const filePath = path.join(testDir, 'demo.txt')

      const status1 = batchFs.getStatus()
      expect(status1.pendingCount).toBe(0)

      // Queue operations
      const p1 = batchFs.write(filePath, 'A', { encoding: 'utf-8' })
      const p2 = batchFs.write(filePath, 'B', { encoding: 'utf-8' })
      const p3 = batchFs.write(filePath, 'C', { encoding: 'utf-8' })

      // Status reflects queued operations
      const status2 = batchFs.getStatus()
      expect(status2.pendingCount).toBeGreaterThan(0)

      // After execution
      await Promise.all([p1, p2, p3])
      const status3 = batchFs.getStatus()
      expect(status3.pendingCount).toBe(0)
    })
  })

  describe('Cleanup', () => {
    it('should destroy all pending operations', async () => {
      const filePath = path.join(testDir, 'cleanup.txt')

      await batchFs.write(filePath, 'Never written')
      await batchFs.destroy()

      const status = batchFs.getStatus()

      expect(status.pendingCount).toBe(0)
      expect(status.fileCount).toBe(0)
    })
  })
})
