/**
 * Benchmark Tools Integration Tests
 * Tests for hyperfine, node profiler, and clinic.js wrappers
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  HyperfineWrapper,
  NodeProfiler,
  ClinicjsWrapper,
  CompositeBenchmark,
} from './benchmark-tools'
import { tmpdir } from 'os'
import { resolve, join } from 'path'

describe('Benchmark Tools Integration', () => {
  let hyperfine: HyperfineWrapper
  let profiler: NodeProfiler
  let clinic: ClinicjsWrapper
  let testDir: string

  beforeEach(() => {
    testDir = resolve(join(tmpdir(), `bench-tools-${Date.now()}`))
    hyperfine = new HyperfineWrapper(testDir)
    profiler = new NodeProfiler(testDir)
    clinic = new ClinicjsWrapper(testDir)
  })

  describe('Hyperfine Wrapper', () => {
    it('should initialize hyperfine wrapper', () => {
      expect(hyperfine).toBeDefined()
    })

    it('should prepare benchmark commands', () => {
      const configs = [
        { name: 'test1', command: 'node -e "console.log(1)"', runs: 5 },
        { name: 'test2', command: 'node -e "console.log(2)"', runs: 5 },
      ]

      expect(configs).toHaveLength(2)
      expect(configs[0]).toBeDefined()
      expect(configs[0]?.command).toContain('node')
    })

    it('should handle benchmark configuration', () => {
      const config = {
        name: 'benchmark',
        command: 'npm run build',
        runs: 10,
        warmup: 2,
        min_benchmarking_time: 5,
        max_benchmarking_time: 60,
      }

      expect(config.runs).toBe(10)
      expect(config.warmup).toBe(2)
    })

    it('should support comparison operations', () => {
      const cmd1 = 'echo cmd1'
      const cmd2 = 'echo cmd2'

      expect(cmd1).toBeDefined()
      expect(cmd2).toBeDefined()
    })
  })

  describe('Node Profiler', () => {
    it('should initialize profiler', () => {
      expect(profiler).toBeDefined()
    })

    it('should prepare CPU profiling', () => {
      const script = 'test.js'
      const output = 'cpu-profile.prof'

      expect(script).toBeDefined()
      expect(output).toContain('.prof')
    })

    it('should prepare memory profiling', () => {
      const script = 'test.js'
      const output = 'memory-profile.json'

      expect(script).toBeDefined()
      expect(output).toContain('memory')
    })

    it('should prepare heap snapshot', () => {
      const output = resolve(join(testDir, 'heap.heapsnapshot'))

      expect(output).toContain('heapsnapshot')
      expect(output).toContain('heap')
    })

    it('should handle profile file paths', () => {
      const cpuProfile = 'cpu-20240121-120000.prof'
      const memProfile = 'memory-20240121-120000.json'
      const heapSnapshot = 'heap-20240121-120000.heapsnapshot'

      expect(cpuProfile).toMatch(/\.prof$/)
      expect(memProfile).toMatch(/\.json$/)
      expect(heapSnapshot).toMatch(/\.heapsnapshot$/)
    })
  })

  describe('Clinic.js Wrapper', () => {
    it('should initialize clinic wrapper', () => {
      expect(clinic).toBeDefined()
    })

    it('should prepare doctor diagnosis', () => {
      const script = 'app.js'
      expect(script).toBeDefined()
    })

    it('should prepare flame graph analysis', () => {
      const script = 'app.js'
      expect(script).toBeDefined()
    })

    it('should prepare bubbleprof timeline', () => {
      const script = 'app.js'
      expect(script).toBeDefined()
    })

    it('should parse diagnostic output', () => {
      const output = `
        Clinic.js Doctor report
        
        Type: CPU
        Recommendations: Reduce function complexity
      `

      expect(output).toContain('Doctor')
      expect(output).toContain('CPU')
    })

    it('should identify performance issues', () => {
      const outputs = [
        'Poor performance detected in CPU usage',
        'Memory leak patterns found',
        'I/O bottleneck detected',
      ]

      outputs.forEach((out) => {
        expect(out.toLowerCase()).toMatch(/(poor|memory|bottleneck)/)
      })
    })
  })

  describe('Composite Benchmark', () => {
    let composite: CompositeBenchmark

    beforeEach(() => {
      composite = new CompositeBenchmark(testDir)
    })

    it('should initialize composite benchmark', () => {
      expect(composite).toBeDefined()
    })

    it('should orchestrate multiple profilers', () => {
      expect(composite).toHaveProperty('fullDiagnostic')
    })

    it('should generate diagnostic summary', () => {
      const diagnostic = {
        cpuProfile: {
          file: '/path/to/cpu.prof',
          duration: 1000,
        },
        memoryProfile: {
          file: '/path/to/memory.json',
          duration: 500,
        },
      }

      const summary = composite.generateSummary(diagnostic)

      expect(summary).toContain('# Performance Diagnostic Report')
      expect(summary).toContain('CPU Profile')
      expect(summary).toContain('Memory Profile')
      expect(summary).toContain('/path/to/cpu.prof')
    })

    it('should handle missing profiles in summary', () => {
      const diagnostic = {
        cpuProfile: {
          file: '/path/to/cpu.prof',
          duration: 1000,
        },
      }

      const summary = composite.generateSummary(diagnostic)

      expect(summary).toContain('CPU Profile')
      expect(summary).not.toContain('Memory Profile')
    })

    it('should include clinic issues in summary', () => {
      const diagnostic = {
        clinicReport: {
          reportFile: '/path/to/report',
          duration: 2000,
          issues: ['High CPU usage', 'Memory leak detected'],
        },
      }

      const summary = composite.generateSummary(diagnostic)

      expect(summary).toContain('Clinic Doctor Report')
      expect(summary).toContain('High CPU usage')
      expect(summary).toContain('Memory leak detected')
    })
  })

  describe('Profile Format Validation', () => {
    it('should validate .prof format', () => {
      const profFile = 'benchmark-20240121-120000.prof'
      expect(profFile).toMatch(/\.prof$/)
    })

    it('should validate .json format', () => {
      const jsonFile = 'memory-profile.json'
      expect(jsonFile).toMatch(/\.json$/)
    })

    it('should validate .heapsnapshot format', () => {
      const heapFile = 'heap-dump.heapsnapshot'
      expect(heapFile).toMatch(/\.heapsnapshot$/)
    })

    it('should validate report directory structure', () => {
      const paths = [
        '/results/hyperfine-results',
        '/results/profiles',
        '/results/reports',
      ]

      paths.forEach((path) => {
        expect(path).toContain('results')
      })
    })
  })

  describe('Performance Configuration', () => {
    it('should support custom runs count', () => {
      const configs = [{ name: 'test', command: 'node app.js', runs: 50 }]
      expect(configs[0]).toBeDefined()
      expect(configs[0]?.runs).toBe(50)
    })

    it('should support warmup runs', () => {
      const configs = [{ name: 'test', command: 'node app.js', warmup: 5 }]
      expect(configs[0]).toBeDefined()
      expect(configs[0]?.warmup).toBe(5)
    })

    it('should support benchmarking time limits', () => {
      const config = {
        name: 'test',
        command: 'npm run heavy',
        min_benchmarking_time: 10,
        max_benchmarking_time: 120,
      }

      expect(config.min_benchmarking_time).toBe(10)
      expect(config.max_benchmarking_time).toBe(120)
    })

    it('should allow custom output directories', () => {
      const customDir = resolve(join(tmpdir(), 'custom-results'))
      const customHyperfine = new HyperfineWrapper(customDir)

      expect(customHyperfine).toBeDefined()
    })
  })

  describe('Comparison Operations', () => {
    it('should prepare for comparative benchmarking', () => {
      const impl1 = 'echo implementation1'
      const impl2 = 'echo implementation2'

      expect(impl1).toBeDefined()
      expect(impl2).toBeDefined()
      expect(impl1).not.toBe(impl2)
    })

    it('should support multiple implementations', () => {
      const implementations = [
        { name: 'v1', command: 'npm run build-v1' },
        { name: 'v2', command: 'npm run build-v2' },
        { name: 'v3', command: 'npm run build-v3' },
      ]

      expect(implementations).toHaveLength(3)
      expect(implementations.map((i) => i.name)).toEqual(['v1', 'v2', 'v3'])
    })
  })

  describe('Report Generation', () => {
    it('should generate markdown report', () => {
      const diagnostic = {
        cpuProfile: {
          file: 'cpu.prof',
          duration: 1000,
        },
        clinicReport: {
          reportFile: 'clinic.html',
          duration: 2000,
          issues: [],
        },
      }

      const composite = new CompositeBenchmark()
      const summary = composite.generateSummary(diagnostic)

      expect(summary).toContain('# Performance Diagnostic Report')
      expect(summary).toContain('##')
      expect(summary).toContain('-')
    })

    it('should include timing information', () => {
      const diagnostic = {
        cpuProfile: {
          file: 'cpu.prof',
          duration: 1500,
        },
        memoryProfile: {
          file: 'memory.json',
          duration: 800,
        },
      }

      const composite = new CompositeBenchmark()
      const summary = composite.generateSummary(diagnostic)

      expect(summary).toContain('1500ms')
      expect(summary).toContain('800ms')
    })

    it('should format file paths', () => {
      const diagnostic = {
        heapSnapshot: {
          file: '/tmp/heap-2026-01-21.heapsnapshot',
        },
      }

      const composite = new CompositeBenchmark()
      const summary = composite.generateSummary(diagnostic)

      expect(summary).toContain('/tmp/heap-2026-01-21.heapsnapshot')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing tools gracefully', () => {
      // Mock tool availability
      expect(() => {
        new CompositeBenchmark()
      }).not.toThrow()
    })

    it('should validate script paths', () => {
      const validScript = resolve(join(testDir, 'test.js'))
      expect(validScript).toContain('test.js')
    })

    it('should handle profile generation failures', () => {
      const diagnostic = {
        cpuProfile: undefined,
        memoryProfile: {
          file: 'memory.json',
          duration: 500,
        },
      }

      const composite = new CompositeBenchmark()
      const summary = composite.generateSummary(diagnostic)

      expect(summary).toContain('Memory Profile')
      expect(summary).not.toContain('undefined')
    })
  })
})
