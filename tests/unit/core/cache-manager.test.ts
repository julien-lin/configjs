/**
 * Tests for CacheManager
 *
 * Verifies:
 * - Cache get/set operations
 * - LRU eviction policy
 * - TTL expiration
 * - Memory management
 * - Hit/miss tracking
 * - Pattern invalidation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  CacheManager,
  getGlobalCacheManager,
  resetGlobalCacheManager,
} from '../../../src/core/cache-manager.js'

describe('CacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager({ maxEntries: 10, maxMemory: 1024 * 100 })
  })

  afterEach(() => {
    cache.clear()
  })

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should overwrite existing keys', () => {
      cache.set('key1', 'value1')
      cache.set('key1', 'value2')
      expect(cache.get('key1')).toBe('value2')
    })

    it('should support different types', () => {
      cache.set('str', 'string')
      cache.set('num', 42)
      cache.set('obj', { a: 1, b: 2 })
      cache.set('arr', [1, 2, 3])
      cache.set('bool', true)

      expect(cache.get('str')).toBe('string')
      expect(cache.get('num')).toBe(42)
      expect(cache.get('obj')).toEqual({ a: 1, b: 2 })
      expect(cache.get('arr')).toEqual([1, 2, 3])
      expect(cache.get('bool')).toBe(true)
    })

    it('should check key existence', () => {
      cache.set('exists', 'value')
      expect(cache.has('exists')).toBe(true)
      expect(cache.has('notexists')).toBe(false)
    })
  })

  describe('TTL & Expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('temp', 'value', 50) // 50ms TTL

      expect(cache.get('temp')).toBe('value')

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(cache.get('temp')).toBeUndefined()
    })

    it('should use default TTL', async () => {
      const cacheWithTTL = new CacheManager({
        defaultTTL: 50,
        maxEntries: 10,
      })

      cacheWithTTL.set('key', 'value')
      expect(cacheWithTTL.get('key')).toBe('value')

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(cacheWithTTL.get('key')).toBeUndefined()
      cacheWithTTL.clear()
    })

    it('should not expire entries without TTL', () => {
      cache.set('permanent', 'value', undefined)
      expect(cache.get('permanent')).toBe('value')
      expect(cache.get('permanent')).toBe('value')
    })
  })

  describe('LRU Eviction', () => {
    it('should evict least recently used when max entries reached', () => {
      const smallCache = new CacheManager({ maxEntries: 3, maxMemory: 10000 })

      smallCache.set('key1', 'a')
      smallCache.set('key2', 'b')
      smallCache.set('key3', 'c')

      // Access key1 to make it recently used
      smallCache.get('key1')

      // Add new entry - should evict key2 (least recently used)
      smallCache.set('key4', 'd')

      expect(smallCache.get('key1')).toBe('a')
      expect(smallCache.get('key2')).toBeUndefined()
      expect(smallCache.get('key3')).toBe('c')
      expect(smallCache.get('key4')).toBe('d')

      smallCache.clear()
    })

    it('should respect max entries limit', () => {
      const smallCache = new CacheManager({ maxEntries: 5, maxMemory: 10000 })

      for (let i = 0; i < 10; i++) {
        smallCache.set(`key${i}`, `value${i}`)
      }

      const stats = smallCache.getStats()
      expect(stats.totalEntries).toBeLessThanOrEqual(5)

      smallCache.clear()
    })
  })

  describe('Memory Management', () => {
    it('should respect memory limits', () => {
      const tinyCache = new CacheManager({
        maxEntries: 100,
        maxMemory: 200,
      })

      // Try to add large values
      tinyCache.set('key1', 'a'.repeat(100))
      tinyCache.set('key2', 'b'.repeat(100))
      tinyCache.set('key3', 'c'.repeat(100))

      const stats = tinyCache.getStats()
      expect(stats.memoryUsage).toBeLessThanOrEqual(200)

      tinyCache.clear()
    })

    it('should track memory usage accurately', () => {
      cache.set('test', 'hello')
      const statsAfter = cache.getStats()

      expect(statsAfter.memoryUsage).toBeGreaterThan(0)
      expect(statsAfter.avgEntrySize).toBeGreaterThan(0)
    })

    it('should reduce memory on invalidation', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const statsBefore = cache.getStats()

      cache.invalidate('key1')

      const statsAfter = cache.getStats()
      expect(statsAfter.memoryUsage).toBeLessThan(statsBefore.memoryUsage)
    })
  })

  describe('Invalidation', () => {
    it('should invalidate specific keys', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      cache.invalidate('key1')

      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')
    })

    it('should invalidate by pattern (string)', () => {
      cache.set('user:1', 'data1')
      cache.set('user:2', 'data2')
      cache.set('post:1', 'data3')

      cache.invalidatePattern('user:*')

      expect(cache.get('user:1')).toBeUndefined()
      expect(cache.get('user:2')).toBeUndefined()
      expect(cache.get('post:1')).toBe('data3')
    })

    it('should invalidate by pattern (regex)', () => {
      cache.set('config:app', 'value1')
      cache.set('config:db', 'value2')
      cache.set('data:other', 'value3')

      cache.invalidatePattern(/^config:/)

      expect(cache.get('config:app')).toBeUndefined()
      expect(cache.get('config:db')).toBeUndefined()
      expect(cache.get('data:other')).toBe('value3')
    })

    it('should clear entire cache', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      cache.clear()

      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
      expect(cache.getStats().totalEntries).toBe(0)
    })
  })

  describe('Statistics', () => {
    it('should track hit rate', () => {
      cache.set('key1', 'value1')

      cache.get('key1') // hit
      cache.get('key1') // hit
      cache.get('missing') // miss

      const stats = cache.getStats()

      expect(stats.totalHits).toBe(2)
      expect(stats.totalMisses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.667, 2)
    })

    it('should report empty stats when no access', () => {
      const stats = cache.getStats()

      expect(stats.totalHits).toBe(0)
      expect(stats.totalMisses).toBe(0)
      expect(stats.hitRate).toBe(0)
    })

    it('should track entry count', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      const stats = cache.getStats()

      expect(stats.totalEntries).toBe(3)
    })

    it('should calculate average entry size', () => {
      cache.set('short', 'x')
      cache.set('longer', 'xxxxxxxxxx')

      const stats = cache.getStats()

      expect(stats.avgEntrySize).toBeGreaterThan(0)
      expect(stats.totalEntries).toBe(2)
    })
  })

  describe('Singleton Pattern', () => {
    afterEach(() => {
      resetGlobalCacheManager()
    })

    it('should create global instance on first call', () => {
      const instance1 = getGlobalCacheManager()
      const instance2 = getGlobalCacheManager()

      expect(instance1).toBe(instance2)
    })

    it('should accept options on first call', () => {
      const instance = getGlobalCacheManager({
        maxEntries: 500,
        maxMemory: 100 * 1024 * 1024,
      })

      expect(instance).toBeDefined()
    })

    it('should reset singleton', () => {
      const instance1 = getGlobalCacheManager()
      resetGlobalCacheManager()
      const instance2 = getGlobalCacheManager()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('Performance Characteristics', () => {
    it('should handle large number of entries efficiently', () => {
      const largeCache = new CacheManager({
        maxEntries: 1000,
        maxMemory: 50 * 1024 * 1024,
      })

      const startTime = Date.now()

      // Set 500 entries
      for (let i = 0; i < 500; i++) {
        largeCache.set(`key${i}`, `value${i}`)
      }

      // Get 500 entries
      for (let i = 0; i < 500; i++) {
        largeCache.get(`key${i}`)
      }

      const duration = Date.now() - startTime

      // Should complete quickly (< 50ms for 1000 operations)
      expect(duration).toBeLessThan(50)

      largeCache.clear()
    })

    it('should demonstrate hit rate improvement', () => {
      cache.set('config:app', 'settings')
      cache.set('data:user', 'userdata')

      // Simulate repeated access pattern
      for (let i = 0; i < 100; i++) {
        cache.get('config:app')
        cache.get('data:user')
      }

      const stats = cache.getStats()

      // Should have high hit rate
      expect(stats.hitRate).toBeGreaterThan(0.95)
    })

    it('should handle mixed access patterns', () => {
      // Populate cache
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`)
      }

      // Mix of hits and misses
      cache.get('key1') // hit
      cache.get('key2') // hit
      cache.get('missing1') // miss
      cache.get('key3') // hit
      cache.get('missing2') // miss
      cache.get('key4') // hit

      const stats = cache.getStats()

      expect(stats.totalHits).toBe(4)
      expect(stats.totalMisses).toBe(2)
      expect(stats.hitRate).toBeCloseTo(0.667, 2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      cache.set('empty', '')
      expect(cache.get('empty')).toBe('')
    })

    it('should handle numeric keys', () => {
      cache.set('0', 'zero')
      cache.set('1', 'one')

      expect(cache.get('0')).toBe('zero')
      expect(cache.get('1')).toBe('one')
    })

    it('should handle special characters in keys', () => {
      cache.set('key:with:colons', 'value1')
      cache.set('key/with/slashes', 'value2')
      cache.set('key.with.dots', 'value3')

      expect(cache.get('key:with:colons')).toBe('value1')
      expect(cache.get('key/with/slashes')).toBe('value2')
      expect(cache.get('key.with.dots')).toBe('value3')
    })

    it('should handle very large objects', () => {
      const largeObj = {
        data: Array(100)
          .fill(0)
          .map((_, i) => ({
            id: i,
            name: `item${i}`,
            value: Math.random(),
          })),
      }

      cache.set('large', largeObj)
      const retrieved = cache.get('large')

      expect(retrieved).toEqual(largeObj)
    })
  })
})
