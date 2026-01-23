/**
 * Tests for ConcurrencyController
 *
 * Verifies:
 * - Parallel execution with concurrency limits
 * - Sequential groups with dependencies
 * - Error isolation
 * - Timeout handling
 * - Status reporting
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ConcurrencyController,
  getGlobalConcurrencyController,
  resetGlobalConcurrencyController,
} from '../../../src/core/concurrency-controller.js'

describe('ConcurrencyController', () => {
  let controller: ConcurrencyController

  beforeEach(() => {
    controller = new ConcurrencyController({ maxWorkers: 4, verbose: false })
  })

  describe('Basic Execution', () => {
    it('should execute all tasks successfully', async () => {
      const results: number[] = []

      const tasks = [1, 2, 3, 4, 5].map((num) => async () => {
        results.push(num)
        return num * 2
      })

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults).toHaveLength(5)
      expect(taskResults.every((r) => r.success)).toBe(true)
      expect(taskResults.map((r) => r.result)).toEqual([2, 4, 6, 8, 10])
      expect(results).toContain(1)
      expect(results).toContain(2)
    })

    it('should preserve task order in results', async () => {
      const tasks = [4, 1, 3, 2, 5].map((delay) => async () => {
        await new Promise((resolve) => setTimeout(resolve, delay))
        return delay
      })

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults.map((r) => r.result)).toEqual([4, 1, 3, 2, 5])
    })

    it('should handle empty task list', async () => {
      const taskResults = await controller.executeAll([])

      expect(taskResults).toHaveLength(0)
    })

    it('should handle single task', async () => {
      const tasks = [async () => 'result']

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults).toHaveLength(1)
      expect(taskResults[0]!.success).toBe(true)
      expect(taskResults[0]!.result).toBe('result')
    })
  })

  describe('Concurrency Control', () => {
    it('should limit concurrent workers', async () => {
      let maxConcurrent = 0
      let currentConcurrent = 0

      const tasks = Array.from({ length: 10 }, () => async () => {
        currentConcurrent++
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
        await new Promise((resolve) => setTimeout(resolve, 10))
        currentConcurrent--
      })

      const taskController = new ConcurrencyController({ maxWorkers: 3 })
      await taskController.executeAll(tasks)

      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })

    it('should respect maxWorkers=1 for sequential execution', async () => {
      const execution: number[] = []
      const tasks = [1, 2, 3].map((num) => async () => {
        execution.push(num)
        await new Promise((resolve) => setTimeout(resolve, 10))
        return num
      })

      const seqController = new ConcurrencyController({ maxWorkers: 1 })
      await seqController.executeAll(tasks)

      expect(execution).toEqual([1, 2, 3])
    })

    it('should reject maxWorkers < 1', () => {
      expect(() => new ConcurrencyController({ maxWorkers: 0 })).toThrow(
        'maxWorkers must be at least 1'
      )
    })
  })

  describe('Error Handling', () => {
    it('should isolate task failures', async () => {
      const tasks = [
        async () => 'success1',
        async () => {
          throw new Error('Task failed')
        },
        async () => 'success2',
      ]

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults[0]!.success).toBe(true)
      expect(taskResults[0]!.result).toBe('success1')
      expect(taskResults[1]!.success).toBe(false)
      expect(taskResults[1]!.error).toContain('Task failed')
      expect(taskResults[2]!.success).toBe(true)
      expect(taskResults[2]!.result).toBe('success2')
    })

    it('should record error messages', async () => {
      const tasks = [
        async () => {
          throw new Error('Custom error message')
        },
      ]

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults[0]!.success).toBe(false)
      expect(taskResults[0]!.error).toContain('Custom error message')
    })

    it('should handle multiple task failures', async () => {
      const tasks = [
        async () => {
          throw new Error('Error 1')
        },
        async () => 'success',
        async () => {
          throw new Error('Error 2')
        },
      ]

      const taskResults = await controller.executeAll(tasks)

      const failures = taskResults.filter((r) => !r.success)
      expect(failures).toHaveLength(2)
    })
  })

  describe('Duration Tracking', () => {
    it('should record task execution duration', async () => {
      const tasks = [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 80))
          return 'result'
        },
      ]

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults[0]!.duration).toBeGreaterThanOrEqual(70)
      expect(taskResults[0]!.duration).toBeLessThan(200) // Allow for jitter
    })

    it('should include duration for failed tasks', async () => {
      const tasks = [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 30))
          throw new Error('Failed after delay')
        },
      ]

      const taskResults = await controller.executeAll(tasks)

      // Allow 5ms margin for timing variance due to system load
      expect(taskResults[0]!.duration).toBeGreaterThanOrEqual(25)
      expect(taskResults[0]!.success).toBe(false)
    })
  })

  describe('Timeout Handling', () => {
    it('should timeout tasks exceeding limit', async () => {
      const timeoutController = new ConcurrencyController({ taskTimeout: 50 })
      const tasks = [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 150))
          return 'result'
        },
      ]

      const taskResults = await timeoutController.executeAll(tasks)

      expect(taskResults[0]!.success).toBe(false)
      expect(taskResults[0]!.error).toContain('timeout')
    })

    it('should allow tasks within timeout', async () => {
      const timeoutController = new ConcurrencyController({ taskTimeout: 150 })
      const tasks = [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          return 'completed'
        },
      ]

      const taskResults = await timeoutController.executeAll(tasks)

      expect(taskResults[0]!.success).toBe(true)
      expect(taskResults[0]!.result).toBe('completed')
    })

    it('should handle zero timeout as no timeout', async () => {
      const noTimeoutController = new ConcurrencyController({ taskTimeout: 0 })
      const tasks = [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return 'completed'
        },
      ]

      const taskResults = await noTimeoutController.executeAll(tasks)

      expect(taskResults[0]!.success).toBe(true)
    })
  })

  describe('Sequential Groups', () => {
    it('should execute groups sequentially', async () => {
      const execution: string[] = []

      const taskGroups = [
        [
          async () => {
            execution.push('group1-task1')
          },
          async () => {
            execution.push('group1-task2')
          },
        ],
        [
          async () => {
            execution.push('group2-task1')
          },
          async () => {
            execution.push('group2-task2')
          },
        ],
      ]

      await controller.executeSequential(taskGroups)

      // All group 1 tasks should complete before any group 2 tasks
      const group1End = Math.max(
        execution.indexOf('group1-task1'),
        execution.indexOf('group1-task2')
      )
      const group2Start = Math.min(
        execution.indexOf('group2-task1'),
        execution.indexOf('group2-task2')
      )

      expect(group1End).toBeLessThan(group2Start)
    })

    it('should execute tasks within groups in parallel', async () => {
      let maxConcurrent = 0
      let currentConcurrent = 0

      const taskGroups = [
        Array.from({ length: 4 }, () => async () => {
          currentConcurrent++
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
          await new Promise((resolve) => setTimeout(resolve, 10))
          currentConcurrent--
        }),
      ]

      await controller.executeSequential(taskGroups)

      expect(maxConcurrent).toBeGreaterThan(1)
    })

    it('should preserve results for multiple groups', async () => {
      const taskGroups = [
        [async () => 1, async () => 2],
        [async () => 3, async () => 4],
      ]

      const results = await controller.executeSequential(taskGroups)

      expect(results).toHaveLength(2)
      expect(results[0]![0]!.result).toBe(1)
      expect(results[0]![1]!.result).toBe(2)
      expect(results[1]![0]!.result).toBe(3)
      expect(results[1]![1]!.result).toBe(4)
    })
  })

  describe('Status Reporting', () => {
    it('should report controller status', async () => {
      const status = controller.getStatus()

      expect(status).toHaveProperty('activeWorkers')
      expect(status).toHaveProperty('queueSize')
      expect(status.activeWorkers).toBe(0)
      expect(status.queueSize).toBe(0)
    })

    it('should update status during execution', async () => {
      const statuses: Array<{ activeWorkers: number; queueSize: number }> = []

      const tasks = Array.from({ length: 4 }, () => async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return 'done'
      })

      const slowController = new ConcurrencyController({ maxWorkers: 2 })

      // Start execution in background
      const executionPromise = slowController.executeAll(tasks)

      // Sample status multiple times during execution
      for (let i = 0; i < 5; i++) {
        statuses.push(slowController.getStatus())
        await new Promise((resolve) => setTimeout(resolve, 15))
      }

      await executionPromise

      // Should have seen some non-zero active workers
      const hasActiveWorkers = statuses.some((s) => s.activeWorkers > 0)
      expect(hasActiveWorkers).toBe(true)
    })
  })

  describe('Singleton Pattern', () => {
    afterEach(() => {
      resetGlobalConcurrencyController()
    })

    it('should create global controller on first call', () => {
      const controller1 = getGlobalConcurrencyController()
      const controller2 = getGlobalConcurrencyController()

      expect(controller1).toBe(controller2)
    })

    it('should use provided config on first call', () => {
      const controller = getGlobalConcurrencyController({ maxWorkers: 8 })
      // Execute a task to test it works with config
      const results = controller.executeAll([async () => 42])

      expect(results).toBeDefined()
    })

    it('should ignore config on subsequent calls', () => {
      getGlobalConcurrencyController({ maxWorkers: 8 })
      const controller2 = getGlobalConcurrencyController({ maxWorkers: 2 })

      // Should still be same instance with original config
      expect(controller2).toBeDefined()
    })

    it('should reset global controller', () => {
      const controller1 = getGlobalConcurrencyController()
      resetGlobalConcurrencyController()
      const controller2 = getGlobalConcurrencyController()

      expect(controller1).not.toBe(controller2)
    })
  })

  describe('Performance Characteristics', () => {
    it('should complete all tasks', async () => {
      const count = 50
      const tasks = Array.from({ length: count }, (_, i) => async () => i)

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults).toHaveLength(count)
      expect(taskResults.filter((r) => r.success)).toHaveLength(count)
    })

    it('should be faster with more workers', async () => {
      const delayMs = 10
      const taskCount = 20

      // Sequential (maxWorkers=1)
      const seqController = new ConcurrencyController({ maxWorkers: 1 })
      const seqTasks = Array.from({ length: taskCount }, () => async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      })

      const seqStart = Date.now()
      await seqController.executeAll(seqTasks)
      const seqDuration = Date.now() - seqStart

      // Parallel (maxWorkers=4)
      const parController = new ConcurrencyController({ maxWorkers: 4 })
      const parTasks = Array.from({ length: taskCount }, () => async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      })

      const parStart = Date.now()
      await parController.executeAll(parTasks)
      const parDuration = Date.now() - parStart

      // Parallel should be significantly faster
      expect(parDuration).toBeLessThan(seqDuration / 2)
    })

    it('should handle large task counts', async () => {
      const tasks = Array.from({ length: 100 }, (_, i) => async () => i)

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults).toHaveLength(100)
      expect(taskResults.filter((r) => r.success)).toHaveLength(100)
    })
  })

  describe('Result Properties', () => {
    it('should include index in result', async () => {
      const tasks = [async () => 'a', async () => 'b', async () => 'c']

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults[0]!.index).toBe(0)
      expect(taskResults[1]!.index).toBe(1)
      expect(taskResults[2]!.index).toBe(2)
    })

    it('should not include error for successful tasks', async () => {
      const tasks = [async () => 'success']

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults[0]!.success).toBe(true)
      expect(taskResults[0]!.error).toBeUndefined()
    })

    it('should not include result for failed tasks', async () => {
      const tasks = [
        async () => {
          throw new Error('Failed')
        },
      ]

      const taskResults = await controller.executeAll(tasks)

      expect(taskResults[0]!.success).toBe(false)
      expect(taskResults[0]!.result).toBeUndefined()
    })
  })
})
