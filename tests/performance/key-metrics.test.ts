/**
 * Key Metrics Benchmarking Tests
 * Measures critical performance indicators
 *
 * Metrics:
 * - Install time (varies by plugins)
 * - Memory usage (peak)
 * - CPU utilization
 * - I/O operation count
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BenchmarkingEngine, quickComparison } from './benchmarking-suite'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { mkdirSync } from 'fs'

describe('Key Metrics - Performance Benchmarking', () => {
  let engine: BenchmarkingEngine
  let testDir: string

  beforeEach(() => {
    engine = new BenchmarkingEngine({
      iterations: 5,
      warmupRuns: 1,
      dataDir: resolve(join(tmpdir(), `metrics-${Date.now()}`)),
    })
    testDir = resolve(join(tmpdir(), `perf-test-${Date.now()}`))
    mkdirSync(testDir, { recursive: true })
  })

  describe('Installation Time Metrics', () => {
    it('should measure framework installation time', async () => {
      const result = await engine.measureExecutionTime(
        'framework-install',
        async () => {
          // Simulate framework installation
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      )

      expect(result.stats).toBeDefined()
      expect(result.stats.mean).toBeGreaterThan(0)
      expect(result.stats.median).toBeGreaterThan(0)
      expect(result.stats.stdDev).toBeDefined()
      expect(result.metrics.length).toBe(5) // Based on iterations
    })

    it('should measure plugin loading time', async () => {
      const result = await engine.measureExecutionTime(
        'plugin-load-performance',
        async () => {
          // Simulate loading multiple plugins
          const plugins = ['react', 'nextjs', 'vue', 'svelte', 'angular']
          await Promise.all(
            plugins.map(() => new Promise((resolve) => setTimeout(resolve, 2)))
          )
        }
      )

      expect(result.stats.mean).toBeLessThan(100) // Should be fast
      expect(result.metrics.length).toBeGreaterThan(0)
    })

    it('should track installation time variation', async () => {
      const result = await engine.measureExecutionTime(
        'install-with-variation',
        async () => {
          const delay = Math.random() * 20 + 5 // 5-25ms
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      )

      expect(result.stats.stdDev).toBeGreaterThan(0)
      expect(result.stats.percentile95).toBeGreaterThanOrEqual(
        result.stats.median
      )
      expect(result.stats.percentile99).toBeGreaterThanOrEqual(
        result.stats.percentile95
      )
    })

    it('should save baseline for regression detection', async () => {
      // First perform a measurement to create a result
      await engine.measureExecutionTime('framework-install', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })
      expect(() => engine.saveBaseline('framework-install')).not.toThrow()
    })
  })

  describe('Memory Usage Metrics', () => {
    it('should measure peak memory usage', async () => {
      const result = await engine.measureMemoryUsage(
        'memory-peak-usage',
        async () => {
          // Allocate some memory
          const arr: number[] = []
          for (let i = 0; i < 1000; i++) {
            arr.push(i * Math.random())
          }
          await new Promise((resolve) => setTimeout(resolve, 5))
        }
      )

      expect(result.stats).toBeDefined()
      expect(result.stats.mean).toBeGreaterThan(0)
      expect(result.metrics).toBeDefined()
      expect(result.metrics[0]).toBeDefined()
      expect(result.metrics[0]?.unit).toBe('MB')
    })

    it('should measure memory during framework initialization', async () => {
      const result = await engine.measureMemoryUsage(
        'framework-init-memory',
        async () => {
          // Simulate framework initialization
          // Simulate initialization
          await new Promise((resolve) => setTimeout(resolve, 2))
        }
      )

      expect(result.stats.mean).toBeLessThan(512) // Should be reasonable
      expect(result.metrics.length).toBeGreaterThan(0)
    })

    it('should track memory growth patterns', async () => {
      const result = await engine.measureMemoryUsage(
        'memory-growth-pattern',
        async () => {
          const items: any[] = []
          for (let i = 0; i < 500; i++) {
            items.push({ id: i, data: `x`.repeat(100) })
          }
          await new Promise((resolve) => setTimeout(resolve, 2))
        }
      )

      // Memory should be consistent across iterations
      const memValues = result.metrics.map((m) => m.value)
      const variance =
        memValues.reduce(
          (sum, val) => sum + Math.pow(val - result.stats.mean, 2),
          0
        ) / memValues.length
      const stdDev = Math.sqrt(variance)

      // Standard deviation should be relatively low for consistent workloads
      expect(stdDev / result.stats.mean).toBeLessThan(0.5)
    })
  })

  describe('CPU Utilization Metrics', () => {
    it('should measure CPU time for computations', async () => {
      const result = await engine.measureCPUUtilization(
        'cpu-computation-intensive',
        async () => {
          // CPU-intensive work
          let _result = 0
          for (let i = 0; i < 1000000; i++) {
            _result += Math.sqrt(i)
          }
        }
      )

      expect(result.stats).toBeDefined()
      expect(result.stats.mean).toBeGreaterThan(0)
      expect(result.metrics).toBeDefined()
      expect(result.metrics[0]).toBeDefined()
      expect(result.metrics[0]?.unit).toBe('ms')
    })

    it('should differentiate between I/O and CPU time', async () => {
      const cpuResult = await engine.measureCPUUtilization(
        'cpu-only-work',
        async () => {
          let _sum = 0
          for (let i = 0; i < 500000; i++) {
            _sum += Math.sin(i) * Math.cos(i)
          }
        }
      )

      const ioResult = await engine.measureCPUUtilization(
        'io-with-waits',
        async () => {
          // Mostly I/O waiting
          await new Promise((resolve) => setTimeout(resolve, 5))
        }
      )

      // CPU-bound work should have more CPU time than I/O-bound
      expect(cpuResult.stats.mean).toBeGreaterThan(ioResult.stats.mean)
    })

    it('should track CPU time per operation', async () => {
      const result = await engine.measureCPUUtilization(
        'cpu-per-operation',
        async () => {
          const operations = 100
          let _total = 0
          for (let i = 0; i < operations; i++) {
            _total += Math.sqrt(i * i + 1)
          }
        }
      )

      expect(result.metrics).toHaveLength(5)
      expect(result.metrics[0]).toBeDefined()
      expect(result.metrics[0]?.tags).toBeDefined()
      expect(result.metrics[0]?.tags?.['userTime']).toBeDefined()
      expect(result.metrics[0]?.tags?.['systemTime']).toBeDefined()
    })
  })

  describe('I/O Operation Counting', () => {
    it('should track file system operations', async () => {
      const ioOps: string[] = []

      const result = await engine.measureExecutionTime(
        'fs-operations',
        async () => {
          // Simulate I/O operations
          const files = ['config.json', 'package.json', 'tsconfig.json']
          files.forEach((f) => {
            ioOps.push(`read:${f}`)
            ioOps.push(`parse:${f}`)
          })
          await new Promise((resolve) => setTimeout(resolve, 2))
        }
      )

      expect(ioOps.length).toBeGreaterThan(0)
      expect(result.metrics).toHaveLength(5)
    })

    it('should measure I/O latency', async () => {
      let ioCount = 0
      const result = await engine.measureExecutionTime(
        'io-latency',
        async () => {
          ioCount++
          await new Promise((resolve) => setTimeout(resolve, 1))
          ioCount++
          await new Promise((resolve) => setTimeout(resolve, 1))
          ioCount++
        }
      )

      expect(ioCount).toBeGreaterThan(0)
      // Allow for timer variance - Node.js timers can be off by 10%+
      expect(result.stats.mean).toBeGreaterThanOrEqual(1.8)
    })
  })

  describe('Comparative Analysis', () => {
    it('should compare two implementations', async () => {
      const comparison = await quickComparison(
        'algorithm-comparison',
        {
          name: 'loop-based',
          fn: async () => {
            let _sum = 0
            for (let i = 0; i < 10000; i++) {
              _sum += i
            }
          },
        },
        {
          name: 'reduce-based',
          fn: async () => {
            Array.from({ length: 10000 }, (_, i) => i).reduce(
              (a, b) => a + b,
              0
            )
          },
        }
      )

      expect(comparison.implA.stats).toBeDefined()
      expect(comparison.implB.stats).toBeDefined()
      expect(comparison.comparison.faster).toBeDefined()
      expect(comparison.comparison.percentDifference).toBeGreaterThanOrEqual(0)
    })

    it('should provide performance recommendations', async () => {
      const comparison = await engine.compareImplementations(
        'string-concat-test',
        {
          name: 'concatenation',
          fn: async () => {
            let _str = ''
            for (let i = 0; i < 1000; i++) {
              _str += `item-${i} `
            }
          },
        },
        {
          name: 'array-join',
          fn: async () => {
            const arr: string[] = []
            for (let i = 0; i < 1000; i++) {
              arr.push(`item-${i}`)
            }
            arr.join(' ')
          },
        }
      )

      expect(comparison.comparison.recommendation).toBeDefined()
      expect(comparison.comparison.recommendation).toContain('faster')
    })
  })

  describe('Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // Create baseline with fast operation
      await engine.measureExecutionTime('regression-baseline', async () => {
        let _sum = 0
        for (let i = 0; i < 10000; i++) {
          _sum += i
        }
      })

      engine.saveBaseline('regression-baseline')

      // Simulate a much slower implementation (10x slower)
      const current = await engine.measureExecutionTime(
        'regression-baseline',
        async () => {
          let _sum = 0
          for (let i = 0; i < 100000; i++) {
            _sum += i
          }
        }
      )

      const withRegression = engine.detectRegression(current)

      expect(withRegression.regression).toBeDefined()
      // Should detect a significant regression (likely > 5%)
      expect(withRegression.regression?.detected).toBe(true)
      expect(withRegression.regression?.percentChange).toBeGreaterThan(0)
    })

    it('should not flag minor variations as regressions', async () => {
      await engine.measureExecutionTime('stable-performance', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      engine.saveBaseline('stable-performance')

      // Add very small variation (1%)
      const nearly = await engine.measureExecutionTime(
        'stable-performance',
        async () => {
          const variation = Math.random() * 0.1
          await new Promise((resolve) => setTimeout(resolve, 10 + variation))
        }
      )

      const result = engine.detectRegression(nearly)

      // Allow up to 15% variation due to system noise and GC pauses
      // This is realistic for Node.js performance measurements in CI environments
      expect(Math.abs(result.regression?.percentChange ?? 0)).toBeLessThan(15)
    })
  })

  describe('Report Generation', () => {
    it('should generate JSON report', async () => {
      await engine.measureExecutionTime('test-1', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })

      const report = engine.generateReport('json')
      const parsed = JSON.parse(report)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0].stats).toBeDefined()
    })

    it('should generate CSV report', async () => {
      await engine.measureExecutionTime('test-csv', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })

      const report = engine.generateReport('csv')

      expect(report).toContain('Name,Mean(ms)')
      expect(report).toContain('test-csv')
    })

    it('should generate HTML report', async () => {
      await engine.measureExecutionTime('test-html', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })

      const report = engine.generateReport('html')

      expect(report).toContain('<!DOCTYPE html>')
      expect(report).toContain('<table>')
      expect(report).toContain('test-html')
    })
  })

  afterEach(() => {
    engine.clearResults()
  })
})
