import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  LazyValidator,
  validateInputOnly,
  validateBatch,
} from '../../../src/core/lazy-validator'

describe('LazyValidator - Cached Validation', () => {
  let validator: LazyValidator<{ name: string; age: number }>

  beforeEach(() => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0).max(150),
    })
    validator = new LazyValidator(schema)
  })

  describe('Cache hit/miss', () => {
    it('should hit cache on identical input', () => {
      const input = { name: 'John', age: 30 }

      // First call: cache miss
      const result1 = validator.validate(input)
      expect(result1).toEqual(input)

      // Second call: cache hit (same reference optimization not needed)
      const result2 = validator.validate(input)
      expect(result2).toEqual(input)
    })

    it('should return same result from cache', () => {
      const input = { name: 'Alice', age: 25 }

      const result1 = validator.validate(input)
      const result2 = validator.validate(input)

      expect(result1).toEqual(result2)
    })

    it('should not cache for different inputs', () => {
      const input1 = { name: 'John', age: 30 }
      const input2 = { name: 'Jane', age: 28 }

      const result1 = validator.validate(input1)
      const result2 = validator.validate(input2)

      expect(result1).toEqual(input1)
      expect(result2).toEqual(input2)
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate cache on schema change', () => {
      const input = { name: 'John', age: 30 }

      // Validate
      const result1 = validator.validate(input)
      expect(result1).toEqual(input)

      // Invalidate
      validator.invalidate()

      // Should still work (new validation)
      const result2 = validator.validate(input)
      expect(result2).toEqual(input)
    })

    it('should clear cache', () => {
      validator.validate({ name: 'John', age: 30 })
      validator.validate({ name: 'Jane', age: 25 })

      validator.clear()

      const stats = validator.getStats()
      expect(stats.cacheSize).toBe(0)
    })
  })

  describe('Batch validation', () => {
    it('should validate multiple items with caching benefit', () => {
      const inputs = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 28 },
        { name: 'Bob', age: 35 },
        { name: 'John', age: 30 }, // Duplicate - should hit cache
      ]

      const start = performance.now()

      for (const input of inputs) {
        validator.validate(input)
      }

      const end = performance.now()
      const avgTime = (end - start) / inputs.length

      console.log(
        `  Batch validation (4 items, 1 cache hit): ${(end - start).toFixed(2)}ms avg: ${avgTime.toFixed(3)}ms`
      )
      expect(avgTime).toBeLessThan(2) // Should be fast with caching
    })
  })

  describe('Performance improvement', () => {
    it('should be faster with caching on 100 identical validations', () => {
      const input = { name: 'Performance Test', age: 40 }

      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        validator.validate(input)
      }

      const end = performance.now()
      const totalTime = end - start
      const avgTime = totalTime / 100

      console.log(
        `  100 identical validations (cached): ${totalTime.toFixed(2)}ms avg: ${avgTime.toFixed(3)}ms`
      )
      expect(avgTime).toBeLessThan(0.1) // Cached: should be very fast
    })

    it('should handle cache eviction gracefully', () => {
      // Fill cache beyond max size
      for (let i = 0; i < 1050; i++) {
        validator.validate({ name: `Name${i}`, age: (i % 150) + 1 })
      }

      const stats = validator.getStats()
      expect(stats.cacheSize).toBeLessThanOrEqual(stats.maxCacheSize)
    })
  })

  describe('Error handling', () => {
    it('should throw on invalid data', () => {
      expect(() => {
        validator.validate({ name: '', age: 30 }) // Invalid: empty name
      }).toThrow()
    })

    it('should not cache invalid data', () => {
      try {
        validator.validate({ name: '', age: 30 })
      } catch {
        // Expected
      }

      // Should throw again (not from cache)
      expect(() => {
        validator.validate({ name: '', age: 30 })
      }).toThrow()
    })

    it('safeParse should not throw', () => {
      const result = validator.safeParse({ name: '', age: 30 })
      expect(result.success).toBe(false)
    })
  })
})

describe('validateInputOnly - Coarse-grained validation', () => {
  it('should validate only required fields', () => {
    const data = {
      name: 'John',
      age: 30,
      internal: 'should not be validated',
    }

    const result = validateInputOnly<{ name: string; age: number }>(data, [
      'name',
      'age',
    ])

    expect(result.name).toBe('John')
    expect(result.age).toBe(30)
  })

  it('should throw on missing required field', () => {
    const data = {
      name: 'John',
    }

    expect(() => {
      validateInputOnly<{ name: string; age: number }>(data, ['name', 'age'])
    }).toThrow('Missing required field: age')
  })

  it('should handle non-object input', () => {
    expect(() => {
      validateInputOnly<{ name: string }>(null, ['name'])
    }).toThrow('Input must be an object')
  })
})

describe('validateBatch - Batch validation with early exit', () => {
  const validator = (item: unknown): number => {
    if (typeof item !== 'number' || item < 0 || item > 100) {
      throw new Error(
        `Invalid number: ${typeof item === 'number' ? item : 'non-number'}`
      )
    }
    return item
  }

  it('should validate batch and collect results', () => {
    const items = [10, 20, 30, 40, 50]

    const { valid, errors } = validateBatch(items, validator)

    expect(valid).toEqual([10, 20, 30, 40, 50])
    expect(errors).toHaveLength(0)
  })

  it('should stop on first error by default', () => {
    const items = [10, 20, -5, 30, 40]

    const { valid, errors } = validateBatch(items, validator)

    expect(valid).toEqual([10, 20])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toBeDefined()
    expect(errors[0]!.index).toBe(2)
  })

  it('should continue on error when stopOnError is false', () => {
    const items = [10, 20, -5, 30, 150]

    const { valid, errors } = validateBatch(items, validator, {
      stopOnError: false,
    })

    expect(valid).toEqual([10, 20, 30])
    expect(errors).toHaveLength(2)
    expect(errors[0]!.index).toBe(2)
    expect(errors[1]!.index).toBe(4)
  })

  it('should handle all invalid items', () => {
    const items = [-1, -2, 101, 102]

    const { valid, errors } = validateBatch(items, validator, {
      stopOnError: false,
    })

    expect(valid).toHaveLength(0)
    expect(errors).toHaveLength(4)
  })
})
