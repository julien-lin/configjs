/**
 * Benchmark Tools Configuration & Wrappers
 *
 * Integrates with:
 * - hyperfine: CLI benchmarking tool
 * - node --inspect: Built-in profiling
 * - clinic.js: Comprehensive Node.js diagnostics
 */

import { spawn, spawnSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { tmpdir } from 'os'

export interface HyperfineConfig {
  name: string
  command: string
  runs?: number
  warmup?: number
  min_benchmarking_time?: number
  max_benchmarking_time?: number
}

export interface HyperfineResult {
  command: string
  mean: number
  stddev: number
  median: number
  user: number
  system: number
  min: number
  max: number
  times: number[]
}

export interface ProfileResult {
  type: 'cpu' | 'memory' | 'heapsnapshot'
  timestamp: number
  duration: number
  file: string
  parsed?: Record<string, any>
}

/**
 * Hyperfine Integration
 * High-precision CLI benchmarking
 */
export class HyperfineWrapper {
  private outputDir: string

  constructor(
    outputDir: string = resolve(join(tmpdir(), 'hyperfine-results'))
  ) {
    this.outputDir = outputDir
  }

  /**
   * Run hyperfine benchmark
   */
  async benchmark(...configs: HyperfineConfig[]): Promise<HyperfineResult[]> {
    const args = [
      '--export-json',
      resolve(join(this.outputDir, `benchmark-${Date.now()}.json`)),
    ]

    configs.forEach((config) => {
      if (config.runs) args.push('--runs', config.runs.toString())
      if (config.warmup) args.push('--warmup', config.warmup.toString())
      if (config.min_benchmarking_time)
        args.push(
          '--min-benchmarking-time',
          config.min_benchmarking_time.toString()
        )
      if (config.max_benchmarking_time)
        args.push(
          '--max-benchmarking-time',
          config.max_benchmarking_time.toString()
        )

      args.push(config.command)
    })

    return new Promise((resolve, reject) => {
      const proc = spawn('hyperfine', args)
      let output = ''
      let error = ''

      proc.stdout.on('data', (data) => {
        output += data.toString()
      })

      proc.stderr.on('data', (data) => {
        error += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(output)
          // Parse results from JSON export
          const jsonFileIndex = args.indexOf('--export-json') + 1
          const jsonFile = args[jsonFileIndex]
          if (jsonFile) {
            try {
              const results = JSON.parse(readFileSync(jsonFile, 'utf-8'))
              resolve(results.results)
            } catch {
              resolve([])
            }
          } else {
            resolve([])
          }
        } else {
          reject(new Error(`hyperfine failed: ${error}`))
        }
      })
    })
  }

  /**
   * Compare two commands
   */
  async compare(
    cmd1: string,
    cmd2: string,
    runs = 10
  ): Promise<{
    cmd1: HyperfineResult
    cmd2: HyperfineResult
    faster: string
    percentDifference: number
  }> {
    const results = await this.benchmark(
      { name: 'cmd1', command: cmd1, runs },
      { name: 'cmd2', command: cmd2, runs }
    )

    const [result1, result2] = results
    if (!result1 || !result2) {
      throw new Error('Benchmark failed to produce results')
    }
    const mean1 = result1.mean
    const mean2 = result2.mean
    const percentDifference = Math.abs((mean1 - mean2) / mean2) * 100

    return {
      cmd1: result1,
      cmd2: result2,
      faster: mean1 < mean2 ? 'cmd1' : 'cmd2',
      percentDifference,
    }
  }
}

/**
 * Node.js Inspector Integration
 * Built-in CPU and memory profiling
 */
export class NodeProfiler {
  private workingDir: string

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir
  }

  /**
   * CPU Profile a function
   */
  async profileCPU(
    script: string,
    outputFile?: string
  ): Promise<{ file: string; duration: number }> {
    const profile =
      outputFile || resolve(join(tmpdir(), `cpu-${Date.now()}.prof`))

    const command = `node --prof "${script}"`
    const start = Date.now()

    return new Promise((resolve, reject) => {
      const proc = spawnSync('bash', ['-c', command], {
        cwd: this.workingDir,
        stdio: 'inherit',
      })

      if (proc.error) {
        reject(proc.error)
      } else {
        // Process .prof file with node --prof-process
        const isolateFile = this.findIsolateFile()
        if (isolateFile) {
          const processor = spawnSync('node', ['--prof-process', isolateFile], {
            encoding: 'utf-8',
          })

          if (processor.stdout) {
            writeFileSync(profile, processor.stdout)
          }
        }

        resolve({
          file: profile,
          duration: Date.now() - start,
        })
      }
    })
  }

  /**
   * Memory Profile a function
   */
  async profileMemory(
    script: string,
    outputFile?: string
  ): Promise<{ file: string; duration: number }> {
    const profile =
      outputFile || resolve(join(tmpdir(), `memory-${Date.now()}.json`))

    const command = `node --trace-gc "${script}"`
    const start = Date.now()

    return new Promise((resolve, reject) => {
      const proc = spawnSync('bash', ['-c', command], {
        cwd: this.workingDir,
        stdio: 'pipe',
      })

      if (proc.error) {
        reject(proc.error)
      } else {
        writeFileSync(profile, proc.stdout?.toString() || '')
        resolve({
          file: profile,
          duration: Date.now() - start,
        })
      }
    })
  }

  /**
   * Heap Snapshot
   */
  async heapSnapshot(outputFile?: string): Promise<{ file: string }> {
    const snapshot =
      outputFile || resolve(join(tmpdir(), `heap-${Date.now()}.heapsnapshot`))

    const script = `
      const v8 = require('v8');
      const fs = require('fs');
      
      // Do some work to generate heap
      const arr = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(100),
        nested: { value: Math.random() }
      }));
      
      // Generate snapshot
      const stream = v8.writeHeapSnapshot();
      stream.pipe(fs.createWriteStream('${snapshot}'));
    `

    return new Promise((resolve, reject) => {
      const proc = spawnSync('node', ['-e', script], {
        stdio: 'inherit',
      })

      if (proc.error) {
        reject(proc.error)
      } else {
        resolve({ file: snapshot })
      }
    })
  }

  /**
   * Find isolate file for prof processing
   */
  private findIsolateFile(): string | null {
    // In a real scenario, this would look for the isolate-*.log file
    // generated by --prof flag
    return null
  }
}

/**
 * Clinic.js Integration
 * Comprehensive diagnostics and recommendations
 */
export class ClinicjsWrapper {
  private workingDir: string

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir
  }

  /**
   * Run clinic doctor diagnosis
   */
  async runDoctor(
    script: string,
    outputDir?: string
  ): Promise<{
    reportFile: string
    duration: number
    issues: string[]
  }> {
    const output = outputDir || resolve(join(tmpdir(), `clinic-${Date.now()}`))
    const start = Date.now()

    return new Promise((resolve, reject) => {
      const proc = spawn(
        'clinic',
        ['doctor', '--output', output, 'node', script],
        {
          cwd: this.workingDir,
        }
      )

      let output_str = ''

      proc.stdout?.on('data', (data) => {
        output_str += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          const issues = this.parseClinicOutput(output_str)
          resolve({
            reportFile: output,
            duration: Date.now() - start,
            issues,
          })
        } else {
          reject(new Error('clinic doctor failed'))
        }
      })
    })
  }

  /**
   * Run clinic flame for flame graphs
   */
  async runFlame(
    script: string,
    outputDir?: string
  ): Promise<{
    reportFile: string
    duration: number
  }> {
    const output =
      outputDir || resolve(join(tmpdir(), `clinic-flame-${Date.now()}`))
    const start = Date.now()

    return new Promise((resolve, reject) => {
      const proc = spawn(
        'clinic',
        ['flame', '--output', output, 'node', script],
        {
          cwd: this.workingDir,
        }
      )

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({
            reportFile: output,
            duration: Date.now() - start,
          })
        } else {
          reject(new Error('clinic flame failed'))
        }
      })
    })
  }

  /**
   * Run clinic bubbleprof for timeline analysis
   */
  async runBubbleprof(
    script: string,
    outputDir?: string
  ): Promise<{
    reportFile: string
    duration: number
  }> {
    const output =
      outputDir || resolve(join(tmpdir(), `clinic-bubble-${Date.now()}`))
    const start = Date.now()

    return new Promise((resolve, reject) => {
      const proc = spawn(
        'clinic',
        ['bubbleprof', '--output', output, 'node', script],
        {
          cwd: this.workingDir,
        }
      )

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({
            reportFile: output,
            duration: Date.now() - start,
          })
        } else {
          reject(new Error('clinic bubbleprof failed'))
        }
      })
    })
  }

  /**
   * Parse clinic output for issues
   */
  private parseClinicOutput(output: string): string[] {
    const issues: string[] = []

    if (output.includes('Poor') || output.includes('Bad')) {
      if (output.includes('CPU')) issues.push('High CPU usage detected')
      if (output.includes('Memory'))
        issues.push('Memory leak patterns detected')
      if (output.includes('I/O')) issues.push('I/O bottleneck detected')
    }

    return issues
  }
}

/**
 * Composite Benchmarking Tool
 * Orchestrates multiple profilers
 */
export class CompositeBenchmark {
  private profiler: NodeProfiler
  private clinic: ClinicjsWrapper

  constructor(workingDir: string = process.cwd()) {
    this.profiler = new NodeProfiler(workingDir)
    this.clinic = new ClinicjsWrapper(workingDir)
  }

  /**
   * Full diagnostic run
   */
  async fullDiagnostic(script: string): Promise<{
    cpuProfile?: { file: string; duration: number }
    memoryProfile?: { file: string; duration: number }
    heapSnapshot?: { file: string }
    clinicReport?: { reportFile: string; duration: number; issues: string[] }
  }> {
    const results: any = {}

    try {
      console.log('Starting CPU profiling...')
      results.cpuProfile = await this.profiler.profileCPU(script)
      console.log(`CPU profile saved to ${results.cpuProfile.file}`)
    } catch (err) {
      console.warn('CPU profiling failed:', err)
    }

    try {
      console.log('Starting memory profiling...')
      results.memoryProfile = await this.profiler.profileMemory(script)
      console.log(`Memory profile saved to ${results.memoryProfile.file}`)
    } catch (err) {
      console.warn('Memory profiling failed:', err)
    }

    try {
      console.log('Generating heap snapshot...')
      results.heapSnapshot = await this.profiler.heapSnapshot()
      console.log(`Heap snapshot saved to ${results.heapSnapshot.file}`)
    } catch (err) {
      console.warn('Heap snapshot failed:', err)
    }

    try {
      console.log('Running clinic doctor...')
      results.clinicReport = await this.clinic.runDoctor(script)
      console.log(`Clinic report saved to ${results.clinicReport.reportFile}`)
    } catch (err) {
      console.warn('Clinic doctor failed:', err)
    }

    return results
  }

  /**
   * Generate summary report
   */
  generateSummary(
    diagnostic: Awaited<ReturnType<typeof this.fullDiagnostic>>
  ): string {
    let summary = '# Performance Diagnostic Report\n\n'

    if (diagnostic.cpuProfile) {
      summary += `## CPU Profile\n`
      summary += `- File: ${diagnostic.cpuProfile.file}\n`
      summary += `- Duration: ${diagnostic.cpuProfile.duration}ms\n\n`
    }

    if (diagnostic.memoryProfile) {
      summary += `## Memory Profile\n`
      summary += `- File: ${diagnostic.memoryProfile.file}\n`
      summary += `- Duration: ${diagnostic.memoryProfile.duration}ms\n\n`
    }

    if (diagnostic.heapSnapshot) {
      summary += `## Heap Snapshot\n`
      summary += `- File: ${diagnostic.heapSnapshot.file}\n\n`
    }

    if (diagnostic.clinicReport) {
      summary += `## Clinic Doctor Report\n`
      summary += `- File: ${diagnostic.clinicReport.reportFile}\n`
      summary += `- Duration: ${diagnostic.clinicReport.duration}ms\n`
      if (diagnostic.clinicReport.issues.length > 0) {
        summary += `- Issues Found:\n`
        diagnostic.clinicReport.issues.forEach((issue) => {
          summary += `  - ${issue}\n`
        })
      }
    }

    return summary
  }
}
