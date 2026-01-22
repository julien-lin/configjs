/**
 * Concurrency Controller for Parallel Task Execution
 *
 * Manages parallel execution of tasks with:
 * - Worker pool (max 4 concurrent tasks by default)
 * - Queue management
 * - Error isolation (task failures don't affect others)
 * - Memory-efficient batch processing
 */

import { getModuleLogger } from '../utils/logger-provider.js'

export interface ConcurrencyConfig {
  maxWorkers?: number
  verbose?: boolean
  taskTimeout?: number
}

export interface TaskResult<T> {
  success: boolean
  result?: T
  error?: string
  duration: number
  index: number
}

interface QueueItem<T> {
  id: number
  task: () => Promise<T>
}

export class ConcurrencyController {
  private maxWorkers: number
  private verbose: boolean
  private taskTimeout: number
  private logger = getModuleLogger()
  private activeWorkers = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueueItem<any>[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private results: Map<number, TaskResult<any>> = new Map()

  constructor(config: ConcurrencyConfig = {}) {
    this.maxWorkers = config.maxWorkers ?? 4
    this.verbose = config.verbose ?? false
    this.taskTimeout = config.taskTimeout ?? 0

    if (this.maxWorkers < 1) {
      throw new Error('maxWorkers must be at least 1')
    }
  }

  async executeAll<T>(
    tasks: Array<() => Promise<T>>
  ): Promise<TaskResult<T>[]> {
    if (tasks.length === 0) {
      return []
    }

    this.logger.debug(
      `Starting concurrent execution of ${tasks.length} task(s) with max ${this.maxWorkers} workers`
    )

    this.queue = tasks.map((task, index) => ({
      id: index,
      task,
    }))

    const workerPromises: Promise<void>[] = []
    for (let i = 0; i < Math.min(this.maxWorkers, tasks.length); i++) {
      workerPromises.push(this.worker())
    }

    await Promise.all(workerPromises)

    const results: TaskResult<T>[] = Array.from(
      { length: tasks.length },
      (_, i) => {
        const result = this.results.get(i)
        if (!result) {
          throw new Error(`Missing result for task ${i}`)
        }
        return result as TaskResult<T>
      }
    )

    this.logger.debug(
      `Concurrent execution complete: ${results.filter((r) => r.success).length}/${results.length} successful`
    )

    return results
  }

  async executeSequential<T>(
    taskGroups: Array<Array<() => Promise<T>>>
  ): Promise<TaskResult<T>[][]> {
    const allResults: TaskResult<T>[][] = []
    let globalIndex = 0

    for (const group of taskGroups) {
      const groupQueue: QueueItem<T>[] = group.map((task, localIndex) => ({
        id: globalIndex + localIndex,
        task,
      }))

      this.queue = groupQueue
      this.results.clear()
      this.activeWorkers = 0

      const groupWorkerPromises: Promise<void>[] = []
      for (let i = 0; i < Math.min(this.maxWorkers, group.length); i++) {
        groupWorkerPromises.push(this.worker<T>())
      }

      await Promise.all(groupWorkerPromises)

      const groupResults: TaskResult<T>[] = Array.from(
        { length: group.length },
        (_, i) => {
          const result = this.results.get(globalIndex + i)
          if (!result) {
            throw new Error(`Missing result for task ${globalIndex + i}`)
          }
          return result as TaskResult<T>
        }
      )

      allResults.push(groupResults)
      globalIndex += group.length
    }

    return allResults
  }

  getStatus(): { activeWorkers: number; queueSize: number } {
    return {
      activeWorkers: this.activeWorkers,
      queueSize: this.queue.length,
    }
  }

  private async worker<T>(): Promise<void> {
    while (this.queue.length > 0) {
      const item = this.queue.shift() as QueueItem<T>
      const startTime = Date.now()

      try {
        this.activeWorkers++

        if (this.verbose) {
          this.logger.debug(`Worker executing task ${item.id}`)
        }

        let result: T
        if (this.taskTimeout > 0) {
          result = await this.executeWithTimeout(item.task, this.taskTimeout)
        } else {
          result = await item.task()
        }

        const duration = Date.now() - startTime

        this.results.set(item.id, {
          success: true,
          result,
          duration,
          index: item.id,
        })

        if (this.verbose) {
          this.logger.debug(`Task ${item.id} completed in ${duration}ms`)
        }
      } catch (error) {
        const duration = Date.now() - startTime
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        this.results.set(item.id, {
          success: false,
          error: errorMessage,
          duration,
          index: item.id,
        })

        this.logger.warn(`Task ${item.id} failed: ${errorMessage}`)
      } finally {
        this.activeWorkers--
      }
    }
  }

  private executeWithTimeout<T>(
    task: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let completed = false

      const timeout = setTimeout(() => {
        if (!completed) {
          completed = true
          reject(new Error(`Task timeout after ${timeoutMs}ms`))
        }
      }, timeoutMs)

      task()
        .then((result) => {
          if (!completed) {
            completed = true
            clearTimeout(timeout)
            resolve(result)
          }
        })
        .catch((error: unknown) => {
          if (!completed) {
            completed = true
            clearTimeout(timeout)
            reject(error instanceof Error ? error : new Error(String(error)))
          }
        })
    })
  }
}

let globalController: ConcurrencyController | null = null

export function getGlobalConcurrencyController(
  config?: ConcurrencyConfig
): ConcurrencyController {
  if (!globalController) {
    globalController = new ConcurrencyController(config ?? { maxWorkers: 4 })
  }
  return globalController
}

export function resetGlobalConcurrencyController(): void {
  globalController = null
}
