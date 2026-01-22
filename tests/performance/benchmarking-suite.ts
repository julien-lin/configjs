/**
 * Performance Benchmarking Suite
 * Comprehensive framework for measuring and tracking performance metrics
 *
 * Features:
 * - Baseline measurements with statistical analysis
 * - Regression detection with configurable thresholds
 * - Comparative analysis between implementations
 * - Persistent metrics storage
 * - CI/CD integration hooks
 *
 * @module tests/performance/benchmarking-suite
 */

import { performance } from 'perf_hooks'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { tmpdir } from 'os'

export interface BenchmarkMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  iteration: number
  tags?: Record<string, string>
}

export interface BenchmarkResult {
  name: string
  metrics: BenchmarkMetric[]
  stats: {
    mean: number
    median: number
    stdDev: number
    min: number
    max: number
    percentile95: number
    percentile99: number
  }
  baseline?: number
  regression?: {
    detected: boolean
    percentChange: number
    threshold: number
  }
}

export interface BenchmarkConfig {
  iterations: number
  warmupRuns: number
  timeout: number
  memoryThreshold: number // MB
  regressionThreshold: number // percentage
  dataDir: string
  resultFormat: 'json' | 'csv' | 'html'
}

/**
 * Core Benchmarking Engine
 * Manages measurement collection and statistical analysis
 */
export class BenchmarkingEngine {
  private config: BenchmarkConfig
  private results: Map<string, BenchmarkResult> = new Map()

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      iterations: 10,
      warmupRuns: 2,
      timeout: 30000, // 30 seconds
      memoryThreshold: 512, // MB
      regressionThreshold: 5, // %
      dataDir: resolve(join(tmpdir(), 'benchmark-data')),
      resultFormat: 'json',
      ...config,
    }

    this.ensureDataDirectory()
  }

  private ensureDataDirectory(): void {
    if (!existsSync(this.config.dataDir)) {
      mkdirSync(this.config.dataDir, { recursive: true })
    }
  }

  /**
   * Measure execution time of a function
   */
  async measureExecutionTime(
    name: string,
    fn: () => void | Promise<void>,
    tags: Record<string, string> = {}
  ): Promise<BenchmarkResult> {
    const metrics: BenchmarkMetric[] = []

    // Warmup runs
    for (let i = 0; i < this.config.warmupRuns; i++) {
      await fn()
    }

    // Actual measurements
    for (let i = 0; i < this.config.iterations; i++) {
      const startMark = `${name}-start-${i}`
      const endMark = `${name}-end-${i}`

      performance.mark(startMark)
      const startMem = this.getMemoryUsage()

      try {
        await Promise.race([
          fn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout: ${name}`)),
              this.config.timeout
            )
          ),
        ])
      } catch (error) {
        console.warn(`Benchmark ${name} iteration ${i} failed:`, error)
        continue
      }

      performance.mark(endMark)
      const endMem = this.getMemoryUsage()

      try {
        const measure = performance.measure(name, startMark, endMark)
        metrics.push({
          name,
          value: measure.duration,
          unit: 'ms',
          timestamp: Date.now(),
          iteration: i,
          tags: {
            ...tags,
            memoryDelta: `${Math.round(endMem - startMem)}MB`,
          },
        })
      } finally {
        performance.clearMarks(startMark)
        performance.clearMarks(endMark)
      }
    }

    return this.analyzeMetrics(name, metrics)
  }

  /**
   * Measure memory usage
   */
  async measureMemoryUsage(
    name: string,
    fn: () => void | Promise<void>
  ): Promise<BenchmarkResult> {
    const metrics: BenchmarkMetric[] = []

    for (let i = 0; i < this.config.iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const beforeMem = this.getMemoryUsage()

      try {
        await Promise.race([
          fn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout: ${name}`)),
              this.config.timeout
            )
          ),
        ])
      } catch (error) {
        console.warn(`Memory benchmark ${name} iteration ${i} failed:`, error)
        continue
      }

      const afterMem = this.getMemoryUsage()
      const peakMem = this.getPeakMemoryUsage()

      metrics.push({
        name,
        value: peakMem,
        unit: 'MB',
        timestamp: Date.now(),
        iteration: i,
        tags: {
          delta: `${Math.round(afterMem - beforeMem)}MB`,
          peak: `${Math.round(peakMem)}MB`,
        },
      })
    }

    return this.analyzeMetrics(name, metrics)
  }

  /**
   * Measure CPU utilization
   */
  async measureCPUUtilization(
    name: string,
    fn: () => void | Promise<void>
  ): Promise<BenchmarkResult> {
    const metrics: BenchmarkMetric[] = []

    for (let i = 0; i < this.config.iterations; i++) {
      const start = process.cpuUsage()

      try {
        await Promise.race([
          fn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout: ${name}`)),
              this.config.timeout
            )
          ),
        ])
      } catch (error) {
        console.warn(`CPU benchmark ${name} iteration ${i} failed:`, error)
        continue
      }

      const elapsed = process.cpuUsage(start)
      const cpuTime = (elapsed.user + elapsed.system) / 1000 // Convert to ms

      metrics.push({
        name,
        value: cpuTime,
        unit: 'ms',
        timestamp: Date.now(),
        iteration: i,
        tags: {
          userTime: `${Math.round(elapsed.user / 1000)}ms`,
          systemTime: `${Math.round(elapsed.system / 1000)}ms`,
        },
      })
    }

    return this.analyzeMetrics(name, metrics)
  }

  /**
   * Compare two implementations
   */
  async compareImplementations(
    name: string,
    implA: { name: string; fn: () => void | Promise<void> },
    implB: { name: string; fn: () => void | Promise<void> }
  ): Promise<{
    implA: BenchmarkResult
    implB: BenchmarkResult
    comparison: {
      faster: string
      percentDifference: number
      recommendation: string
    }
  }> {
    const resultA = await this.measureExecutionTime(
      `${name}-${implA.name}`,
      implA.fn
    )
    const resultB = await this.measureExecutionTime(
      `${name}-${implB.name}`,
      implB.fn
    )

    const meanA = resultA.stats.mean
    const meanB = resultB.stats.mean
    const percentDifference = Math.abs((meanA - meanB) / meanB) * 100

    return {
      implA: resultA,
      implB: resultB,
      comparison: {
        faster: meanA < meanB ? implA.name : implB.name,
        percentDifference,
        recommendation:
          percentDifference > 5
            ? `${meanA < meanB ? implA.name : implB.name} is ${percentDifference.toFixed(2)}% faster`
            : 'No significant difference',
      },
    }
  }

  /**
   * Detect performance regressions
   */
  detectRegression(
    current: BenchmarkResult,
    baselineFile?: string
  ): BenchmarkResult {
    const baseline = this.loadBaseline(
      baselineFile || `${current.name}-baseline.json`
    )

    if (!baseline) {
      return {
        ...current,
        regression: {
          detected: false,
          percentChange: 0,
          threshold: this.config.regressionThreshold,
        },
      }
    }

    const percentChange = ((current.stats.mean - baseline) / baseline) * 100
    const detected = Math.abs(percentChange) > this.config.regressionThreshold

    return {
      ...current,
      baseline,
      regression: {
        detected,
        percentChange,
        threshold: this.config.regressionThreshold,
      },
    }
  }

  /**
   * Analyze collected metrics
   */
  private analyzeMetrics(
    name: string,
    metrics: BenchmarkMetric[]
  ): BenchmarkResult {
    if (metrics.length === 0) {
      throw new Error(`No metrics collected for ${name}`)
    }

    const values = metrics.map((m) => m.value).sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    const mean = sum / values.length
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length
    const stdDev = Math.sqrt(variance)

    if (values.length === 0) {
      throw new Error(`No metrics found for ${name}`)
    }

    const result: BenchmarkResult = {
      name,
      metrics,
      stats: {
        mean,
        median: this.getPercentile(values, 50),
        stdDev,
        min: values[0] as number,
        max: values[values.length - 1] as number,
        percentile95: this.getPercentile(values, 95),
        percentile99: this.getPercentile(values, 99),
      },
    }

    this.results.set(name, result)
    this.saveResult(result)

    return result
  }

  /**
   * Calculate percentile
   */
  private getPercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    const value = sortedValues[Math.max(0, index)]
    if (value === undefined) {
      throw new Error('Invalid percentile calculation')
    }
    return value
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage()
    return usage.heapUsed / 1024 / 1024
  }

  /**
   * Get peak memory usage in MB
   */
  private getPeakMemoryUsage(): number {
    const usage = process.memoryUsage()
    return usage.heapTotal / 1024 / 1024
  }

  /**
   * Save result to file
   */
  private saveResult(result: BenchmarkResult): void {
    const filename = resolve(
      join(this.config.dataDir, `${result.name}-${Date.now()}.json`)
    )
    writeFileSync(filename, JSON.stringify(result, null, 2))
  }

  /**
   * Load baseline metrics
   */
  private loadBaseline(filename: string): number | null {
    try {
      const filepath = resolve(join(this.config.dataDir, filename))
      if (!existsSync(filepath)) {
        return null
      }
      const data = JSON.parse(readFileSync(filepath, 'utf-8'))
      return data.stats?.mean ?? null
    } catch {
      return null
    }
  }

  /**
   * Save baseline for future comparisons
   */
  saveBaseline(name: string): void {
    const result = this.results.get(name)
    if (!result) {
      throw new Error(`No result found for ${name}`)
    }
    const filename = resolve(join(this.config.dataDir, `${name}-baseline.json`))
    writeFileSync(filename, JSON.stringify(result, null, 2))
  }

  /**
   * Generate performance report
   */
  generateReport(
    format: 'json' | 'csv' | 'html' = this.config.resultFormat
  ): string {
    const results = Array.from(this.results.values())

    if (format === 'json') {
      return JSON.stringify(results, null, 2)
    }

    if (format === 'csv') {
      let csv = 'Name,Mean(ms),Median(ms),StdDev,Min,Max,P95,P99\n'
      results.forEach((r) => {
        csv += `${r.name},${r.stats.mean.toFixed(3)},${r.stats.median.toFixed(3)},${r.stats.stdDev.toFixed(3)},${r.stats.min.toFixed(3)},${r.stats.max.toFixed(3)},${r.stats.percentile95.toFixed(3)},${r.stats.percentile99.toFixed(3)}\n`
      })
      return csv
    }

    if (format === 'html') {
      let html = `<!DOCTYPE html>
<html>
<head>
  <title>Performance Benchmark Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Performance Benchmark Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <table>
    <tr>
      <th>Benchmark</th>
      <th>Mean (ms)</th>
      <th>Median (ms)</th>
      <th>StdDev</th>
      <th>Min</th>
      <th>Max</th>
      <th>P95</th>
      <th>P99</th>
    </tr>`

      results.forEach((r) => {
        html += `
    <tr>
      <td>${r.name}</td>
      <td>${r.stats.mean.toFixed(3)}</td>
      <td>${r.stats.median.toFixed(3)}</td>
      <td>${r.stats.stdDev.toFixed(3)}</td>
      <td>${r.stats.min.toFixed(3)}</td>
      <td>${r.stats.max.toFixed(3)}</td>
      <td>${r.stats.percentile95.toFixed(3)}</td>
      <td>${r.stats.percentile99.toFixed(3)}</td>
    </tr>`
      })

      html += `
  </table>
</body>
</html>`
      return html
    }

    throw new Error(`Unsupported format: ${String(format)}`)
  }

  /**
   * Get all results
   */
  getResults(): BenchmarkResult[] {
    return Array.from(this.results.values())
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results.clear()
  }
}

/**
 * Convenience functions for quick benchmarking
 */
export async function quickBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations = 10
): Promise<BenchmarkResult> {
  const engine = new BenchmarkingEngine({ iterations })
  return engine.measureExecutionTime(name, fn)
}

export async function quickMemoryBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations = 10
): Promise<BenchmarkResult> {
  const engine = new BenchmarkingEngine({ iterations })
  return engine.measureMemoryUsage(name, fn)
}

export async function quickComparison(
  name: string,
  implA: { name: string; fn: () => void | Promise<void> },
  implB: { name: string; fn: () => void | Promise<void> }
): Promise<any> {
  const engine = new BenchmarkingEngine({ iterations: 5 })
  return engine.compareImplementations(name, implA, implB)
}
