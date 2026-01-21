import { describe, it, expect } from 'vitest'
import {
  angularSetupSchema,
  nextjsSetupSchema,
  vueSetupSchema,
  validateInput,
  validateProjectName,
} from '../../src/core/input-validator.js'

describe('Zod Validation Performance - Baseline', () => {
  describe('Single validation benchmarks', () => {
    it('should validate Angular setup in < 2ms (baseline)', () => {
      const start = performance.now()
      const data = {
        projectName: 'my-app',
        useTypeScript: true,
        useRouting: true,
        useStylesheet: 'scss' as const,
      }

      for (let i = 0; i < 100; i++) {
        validateInput(angularSetupSchema, data)
      }

      const end = performance.now()
      const avgTime = (end - start) / 100
      console.log(
        `  Angular validation (100 ops): ${(end - start).toFixed(2)}ms avg: ${avgTime.toFixed(3)}ms`
      )
      expect(avgTime).toBeLessThan(2) // Baseline target
    })

    it('should validate Next.js setup in < 2ms (baseline)', () => {
      const start = performance.now()
      const data = {
        projectName: 'my-app',
        typescript: true,
        eslint: true,
        tailwind: true,
        srcDir: true,
        appRouter: true,
        importAlias: '@/*',
      }

      for (let i = 0; i < 100; i++) {
        validateInput(nextjsSetupSchema, data)
      }

      const end = performance.now()
      const avgTime = (end - start) / 100
      console.log(
        `  Next.js validation (100 ops): ${(end - start).toFixed(2)}ms avg: ${avgTime.toFixed(3)}ms`
      )
      expect(avgTime).toBeLessThan(2) // Baseline target
    })

    it('should validate project name in < 1ms (baseline)', () => {
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        validateProjectName('my-awesome-project-name')
      }

      const end = performance.now()
      const avgTime = (end - start) / 1000
      console.log(
        `  Project name validation (1000 ops): ${(end - start).toFixed(2)}ms avg: ${avgTime.toFixed(3)}ms`
      )
      expect(avgTime).toBeLessThan(1) // Baseline target
    })
  })

  describe('Bulk validation benchmarks', () => {
    it('should validate multiple schemas in < 10ms total (baseline)', () => {
      const start = performance.now()

      for (let i = 0; i < 50; i++) {
        validateInput(angularSetupSchema, {
          projectName: `app-${i}`,
          useTypeScript: i % 2 === 0,
          useRouting: true,
          useStylesheet: 'scss',
        })

        validateInput(nextjsSetupSchema, {
          projectName: `nextapp-${i}`,
          typescript: i % 2 === 0,
          eslint: true,
          tailwind: true,
          srcDir: true,
          appRouter: true,
          importAlias: '@/*',
        })

        validateInput(vueSetupSchema, {
          projectName: `vueapp-${i}`,
          typescript: i % 2 === 0,
        })
      }

      const end = performance.now()
      const totalTime = end - start
      console.log(
        `  Bulk validation (150 ops total): ${totalTime.toFixed(2)}ms`
      )
      expect(totalTime).toBeLessThan(10) // Baseline target
    })
  })

  describe('Invalid input handling', () => {
    it('should reject path traversal attempts quickly', () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        try {
          validateProjectName('../../../etc/passwd')
        } catch {
          // Expected
        }
      }

      const end = performance.now()
      const avgTime = (end - start) / 100
      console.log(
        `  Path traversal rejection (100 ops): ${(end - start).toFixed(2)}ms avg: ${avgTime.toFixed(3)}ms`
      )
      expect(avgTime).toBeLessThan(1) // Should be fast even for invalid input
    })

    it('should reject shell injection attempts quickly', () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        try {
          validateProjectName('app; rm -rf /')
        } catch {
          // Expected
        }
      }

      const end = performance.now()
      const avgTime = (end - start) / 100
      console.log(
        `  Shell injection rejection (100 ops): ${(end - start).toFixed(2)}ms avg: ${avgTime.toFixed(3)}ms`
      )
      expect(avgTime).toBeLessThan(1) // Should be fast even for invalid input
    })
  })

  describe('Memory usage patterns', () => {
    it('should not leak memory on 10k validations', () => {
      const before = process.memoryUsage().heapUsed

      for (let i = 0; i < 10000; i++) {
        validateInput(angularSetupSchema, {
          projectName: `app-${i}`,
          useTypeScript: i % 2 === 0,
          useRouting: true,
          useStylesheet: 'scss',
        })
      }

      const after = process.memoryUsage().heapUsed
      const memoryDelta = (after - before) / 1024 / 1024 // Convert to MB
      console.log(
        `  Memory delta (10k validations): ${memoryDelta.toFixed(2)}MB`
      )
      expect(memoryDelta).toBeLessThan(50) // Should not leak > 50MB
    })
  })
})
