import { describe, it, expect } from 'vitest'
import {
  PluginStream,
  StreamingConfigWriter,
  BatchProcessor,
  StreamingFileProcessor,
  StreamingAggregator,
} from '../../../src/core/streaming'

describe('Streaming Utilities - Memory Optimization', () => {
  describe('PluginStream - Lazy Iteration', () => {
    it('should iterate without loading all items into memory', async () => {
      const items = [
        { name: 'plugin1', version: '1.0.0' },
        { name: 'plugin2', version: '2.0.0' },
        { name: 'plugin3', version: '3.0.0' },
      ]

      const stream = new PluginStream(items)
      let count = 0

      for (const item of stream) {
        expect(item).toBeDefined()
        count++
      }

      expect(count).toBe(3)
    })

    it('should map lazily without creating intermediate array', async () => {
      const items = [1, 2, 3, 4, 5]
      const stream = new PluginStream(items)

      const mapped = [...stream.map((x) => x * 2)]

      expect(mapped).toEqual([2, 4, 6, 8, 10])
    })

    it('should filter lazily without creating intermediate array', () => {
      const items = [1, 2, 3, 4, 5, 6]
      const stream = new PluginStream(items)

      const filtered = [...stream.filter((x) => x % 2 === 0)]

      expect(filtered).toEqual([2, 4, 6])
    })

    it('should flatMap lazily', () => {
      const items = [1, 2, 3]
      const stream = new PluginStream(items)

      const flatMapped = [...stream.flatMap((x) => [x, x * 2])]

      expect(flatMapped).toEqual([1, 2, 2, 4, 3, 6])
    })

    it('should forEach without array allocation', async () => {
      const items = ['a', 'b', 'c']
      const stream = new PluginStream(items)
      const collected: string[] = []

      await stream.forEach((item) => {
        collected.push(item.toUpperCase())
      })

      expect(collected).toEqual(['A', 'B', 'C'])
    })

    it('should reduce without intermediate array', async () => {
      const items = [1, 2, 3, 4, 5]
      const stream = new PluginStream(items)

      const sum = await stream.reduce((acc, x) => acc + x, 0)

      expect(sum).toBe(15)
    })

    it('should get length without consuming stream', () => {
      const items = [1, 2, 3, 4, 5]
      const stream = new PluginStream(items)

      expect(stream.length).toBe(5)

      // Stream should still be iterable
      const result = [...stream]
      expect(result).toHaveLength(5)
    })
  })

  describe('StreamingConfigWriter - Buffered Writing', () => {
    it('should accumulate lines and flush in batches', async () => {
      const flushedBatches: string[][] = []

      const writer = new StreamingConfigWriter(async (lines) => {
        flushedBatches.push([...lines])
      })

      // Add less than flushSize lines (50)
      for (let i = 0; i < 30; i++) {
        await writer.addLine(`line ${i}`)
      }

      expect(flushedBatches).toHaveLength(0) // Not flushed yet

      // Add more to trigger flush
      for (let i = 30; i < 55; i++) {
        await writer.addLine(`line ${i}`)
      }

      expect(flushedBatches).toHaveLength(1) // Flushed once
      expect(flushedBatches[0]).toHaveLength(50)

      // Flush remaining
      await writer.flush()
      expect(flushedBatches).toHaveLength(2)
      expect(flushedBatches[1]).toHaveLength(5)
    })

    it('should process lines from iterable', async () => {
      const flushedBatches: string[][] = []

      const writer = new StreamingConfigWriter(async (lines) => {
        flushedBatches.push([...lines])
      })

      const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`)
      await writer.addLines(lines)

      expect(flushedBatches).toHaveLength(2) // 50 + 50
      expect(flushedBatches[0]).toHaveLength(50)
      expect(flushedBatches[1]).toHaveLength(50)
    })

    it('should track buffer size', async () => {
      const writer = new StreamingConfigWriter(async () => {
        // No-op
      })

      expect(writer.size).toBe(0)

      await writer.addLine('line 1')
      expect(writer.size).toBe(1)

      await writer.addLine('line 2')
      expect(writer.size).toBe(2)

      await writer.flush()
      expect(writer.size).toBe(0)
    })
  })

  describe('BatchProcessor - Batch Processing with Streaming', () => {
    it('should process items in batches', async () => {
      const processor = new BatchProcessor<number, number>(5, async (batch) => {
        return batch.map((x) => x * 2)
      })

      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const results: number[] = []

      for await (const result of processor.processBatches(items)) {
        results.push(result)
      }

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
    })

    it('should handle partial last batch', async () => {
      const processor = new BatchProcessor<number, number>(3, async (batch) => {
        return batch.map((x) => x + 100)
      })

      const items = [1, 2, 3, 4, 5]
      const results: number[] = []

      for await (const result of processor.processBatches(items)) {
        results.push(result)
      }

      expect(results).toEqual([101, 102, 103, 104, 105])
    })
  })

  describe('StreamingFileProcessor - Line Processing', () => {
    it('should read lines without full buffering', () => {
      const processor = new StreamingFileProcessor()
      const content = 'line1\nline2\nline3\n'

      const lines = [...processor.readLines(content)]

      expect(lines).toEqual(['line1', 'line2', 'line3', ''])
    })

    it('should transform lines lazily', () => {
      const processor = new StreamingFileProcessor()
      const lines = ['hello', 'world', 'test']

      const transformed = [
        ...processor.transformLines(lines, (line) => line.toUpperCase()),
      ]

      expect(transformed).toEqual(['HELLO', 'WORLD', 'TEST'])
    })

    it('should filter lines lazily', () => {
      const processor = new StreamingFileProcessor()
      const lines = ['import a', 'const b', 'import c', 'export d']

      const imports = [
        ...processor.filterLines(lines, (line) => line.startsWith('import')),
      ]

      expect(imports).toEqual(['import a', 'import c'])
    })

    it('should join lines with separator', () => {
      const processor = new StreamingFileProcessor()
      const lines = ['line1', 'line2', 'line3']

      const joined = processor.joinLines(lines, '\n')

      expect(joined).toBe('line1\nline2\nline3')
    })
  })

  describe('StreamingAggregator - Memory-efficient Aggregation', () => {
    it('should count items without array allocation', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      const count = StreamingAggregator.count(items)

      expect(count).toBe(10)
    })

    it('should sum values without intermediate storage', () => {
      const values = [1, 2, 3, 4, 5]

      const sum = StreamingAggregator.sum(values)

      expect(sum).toBe(15)
    })

    it('should average values', () => {
      const values = [10, 20, 30]

      const avg = StreamingAggregator.average(values)

      expect(avg).toBe(20)
    })

    it('should find first matching item', () => {
      const items = [1, 2, 3, 4, 5]

      const found = StreamingAggregator.find(items, (x) => x > 3)

      expect(found).toBe(4)
    })

    it('should return undefined if no match', () => {
      const items = [1, 2, 3]

      const found = StreamingAggregator.find(items, (x) => x > 10)

      expect(found).toBeUndefined()
    })

    it('should check if some match', () => {
      const items = [1, 2, 3, 4, 5]

      expect(StreamingAggregator.some(items, (x) => x > 3)).toBe(true)
      expect(StreamingAggregator.some(items, (x) => x > 10)).toBe(false)
    })

    it('should check if all match', () => {
      const items = [2, 4, 6]

      expect(StreamingAggregator.every(items, (x) => x % 2 === 0)).toBe(true)
      expect(StreamingAggregator.every(items, (x) => x > 5)).toBe(false)
    })
  })

  describe('Performance - Memory Reduction', () => {
    it('should reduce memory with streaming vs array on 1000 items', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `plugin-${i}`,
        data: 'x'.repeat(1000),
      }))

      const before = process.memoryUsage().heapUsed

      // Streaming version: no accumulation
      const stream = new PluginStream(items)
      let streamSum = 0
      for (const item of stream) {
        streamSum += item.id
      }

      const after = process.memoryUsage().heapUsed
      const streamMemory = (after - before) / 1024 / 1024

      console.log(
        `  Streaming 1000 items: ${streamMemory.toFixed(2)}MB memory delta`
      )
      expect(streamSum).toBe(499500) // Sum 0..999
      expect(streamMemory).toBeLessThan(5) // Should be minimal
    })

    it('should process 10k items without array explosion', async () => {
      const processor = new BatchProcessor<number, number>(
        100,
        async (batch) => {
          return batch.map((x) => x * 2)
        },
      )

      const before = process.memoryUsage().heapUsed

      let processedCount = 0
      const items = Array.from({ length: 10000 }, (_, i) => i)

      for await (const _result of processor.processBatches(items)) {
        processedCount++
        if (processedCount % 1000 === 0) {
          // Periodic check
          const used = process.memoryUsage().heapUsed
          console.log(
            `  Processed ${processedCount} items, heap: ${((used - before) / 1024 / 1024).toFixed(1)}MB`,
          )
        }
      }

      const after = process.memoryUsage().heapUsed
      const totalMemory = (after - before) / 1024 / 1024

      console.log(
        `  Total for 10k items: ${totalMemory.toFixed(2)}MB memory delta`
      )
      expect(processedCount).toBe(10000)
      expect(totalMemory).toBeLessThan(10) // Should remain bounded
    })
  })
})
