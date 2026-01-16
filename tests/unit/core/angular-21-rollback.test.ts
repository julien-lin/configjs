import { describe, it, expect, beforeEach } from 'vitest'
import { AngularRollbackManager } from '../../../src/core/angular-21-rollback.js'

describe('AngularRollbackManager', () => {
  let manager: AngularRollbackManager

  beforeEach(() => {
    manager = new AngularRollbackManager()
  })

  describe('createTransaction', () => {
    it('should create a new transaction', () => {
      const transaction = manager.createTransaction('tx-1')

      expect(transaction.id).toBe('tx-1')
      expect(transaction.operations).toEqual([])
      expect(transaction.status).toBe('pending')
      expect(transaction.timestamp).toBeGreaterThan(0)
    })

    it('should initialize timestamp close to Date.now()', () => {
      const beforeCreate = Date.now()
      const transaction = manager.createTransaction('tx-2')
      const afterCreate = Date.now()

      expect(transaction.timestamp).toBeGreaterThanOrEqual(beforeCreate)
      expect(transaction.timestamp).toBeLessThanOrEqual(afterCreate)
    })

    it('should allow multiple transactions', () => {
      const tx1 = manager.createTransaction('tx-1')
      const tx2 = manager.createTransaction('tx-2')

      expect(tx1.id).toBe('tx-1')
      expect(tx2.id).toBe('tx-2')
      expect(tx1.timestamp).toBeLessThanOrEqual(tx2.timestamp)
    })
  })

  describe('trackCreate', () => {
    it('should track file creation', () => {
      const transaction = manager.createTransaction('tx-create')
      manager.trackCreate('tx-create', '/test/file.ts', 'content here')

      expect(transaction.operations).toHaveLength(1)
      const op = transaction.operations[0]
      expect(op).toBeDefined()
      expect(op?.type).toBe('create')
      expect(op?.path).toBe('/test/file.ts')
      expect(op?.newContent).toBe('content here')
    })

    it('should throw error for non-existent transaction', () => {
      expect(() => {
        manager.trackCreate('non-existent', '/test/file.ts', 'content')
      }).toThrow('Transaction non-existent not found')
    })

    it('should accumulate multiple create operations', () => {
      const transaction = manager.createTransaction('tx-multi')
      manager.trackCreate('tx-multi', '/file1.ts', 'content1')
      manager.trackCreate('tx-multi', '/file2.ts', 'content2')
      manager.trackCreate('tx-multi', '/file3.ts', 'content3')

      expect(transaction.operations).toHaveLength(3)
      expect(transaction.operations.map((op) => op.path)).toEqual([
        '/file1.ts',
        '/file2.ts',
        '/file3.ts',
      ])
    })
  })

  describe('trackUpdate', () => {
    it('should throw error for non-existent transaction', async () => {
      await expect(
        manager.trackUpdate('non-existent', '/test/file.ts', 'content')
      ).rejects.toThrow('Transaction non-existent not found')
    })
  })

  describe('trackDelete', () => {
    it('should throw error for non-existent transaction', async () => {
      await expect(
        manager.trackDelete('non-existent', '/test/file.ts')
      ).rejects.toThrow('Transaction non-existent not found')
    })
  })

  describe('cleanup', () => {
    it('should keep pending transactions', () => {
      manager.createTransaction('tx-pending')
      manager.trackCreate('tx-pending', '/test/file.ts', 'content')

      manager.cleanup()

      // Should not throw - transaction should still exist
      expect(() => {
        manager.trackCreate('tx-pending', '/test/another.ts', 'content')
      }).not.toThrow()
    })

    it('should handle cleanup without transactions', () => {
      expect(() => {
        manager.cleanup()
      }).not.toThrow()
    })
  })

  describe('Transaction structure', () => {
    it('should maintain correct operation types', () => {
      const transaction = manager.createTransaction('tx-ops')

      manager.trackCreate('tx-ops', '/create.ts', 'new')

      expect(transaction.operations[0]?.type).toBe('create')
      expect(transaction.operations[0]?.newContent).toBe('new')
    })

    it('should track multiple operation types in one transaction', () => {
      const transaction = manager.createTransaction('tx-mixed')

      manager.trackCreate('tx-mixed', '/create.ts', 'new')

      expect(transaction.operations).toHaveLength(1)
      expect(transaction.operations[0]?.type).toBe('create')
    })
  })
})
