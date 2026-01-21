import { describe, it, expect, beforeEach } from 'vitest'
import {
  ProgressTracker,
  progressTracker,
  type ProgressEvent,
} from '../../src/core/progress-tracker'

describe('ProgressTracker', () => {
  beforeEach(() => {
    progressTracker.reset()
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const t1 = ProgressTracker.getInstance()
      const t2 = ProgressTracker.getInstance()
      expect(t1).toBe(t2)
    })

    it('should export singleton', () => {
      expect(progressTracker).toBeInstanceOf(ProgressTracker)
    })
  })

  describe('Stage Management', () => {
    it('should initialize stages', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        { name: 'validate', description: 'Validation', estimatedTime: 2000 },
      ]
      progressTracker.initializeStages(stages)
      const stats = progressTracker.getStats()
      expect(stats.totalStages).toBe(2)
      expect(stats.stagesCompleted).toBe(0)
    })

    it('should transition stages', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        { name: 'validate', description: 'Validation', estimatedTime: 2000 },
      ]
      progressTracker.initializeStages(stages)
      const result = progressTracker.nextStage()
      expect(result).toBe(true)
      const stats = progressTracker.getStats()
      expect(stats.currentStage).toBe('validate')
    })

    it('should return false when no more stages', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.nextStage()
      const result = progressTracker.nextStage()
      expect(result).toBe(false)
    })

    it('should add stages dynamically', () => {
      progressTracker.addStage('test', 'Test', 500)
      const stats = progressTracker.getStats()
      expect(stats.totalStages).toBe(1)
    })
  })

  describe('Progress Tracking', () => {
    it('should update progress', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(50)
      const stats = progressTracker.getStats()
      expect(stats.totalProgress).toBe(50)
    })

    it('should clamp progress 0-100', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(-10)
      expect(progressTracker.getStats().totalProgress).toBe(0)
      progressTracker.updateProgress(150)
      expect(progressTracker.getStats().totalProgress).toBe(100)
    })

    it('should calculate overall progress from multiple stages', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        { name: 'validate', description: 'Validation', estimatedTime: 2000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(100)
      progressTracker.nextStage()
      progressTracker.updateProgress(50)
      const stats = progressTracker.getStats()
      expect(stats.totalProgress).toBe(75) // (100 + 50) / 2
    })

    it('should track event count', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(25)
      progressTracker.updateProgress(50)
      progressTracker.updateProgress(75)
      const stats = progressTracker.getStats()
      expect(stats.eventCount).toBe(3)
    })

    it('should emit progress events', () => {
      return new Promise<void>((resolve) => {
        const stages = [
          { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        ]
        progressTracker.initializeStages(stages)

        progressTracker.on('progress', (event: ProgressEvent) => {
          expect(event).toHaveProperty('stage')
          expect(event).toHaveProperty('progress')
          expect(event).toHaveProperty('eta')
          resolve()
        })

        progressTracker.updateProgress(50)
      })
    })
  })

  describe('ETA Calculation', () => {
    it('should provide ETA estimate', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 2000 },
        { name: 'validate', description: 'Validation', estimatedTime: 2000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(50)
      const stats = progressTracker.getStats()
      expect(stats.estimatedTotal).toBe(4000)
      expect(stats.estimatedRemaining).toBeGreaterThanOrEqual(0)
    })

    it('should provide reasonable ETA in events', () => {
      return new Promise<void>((resolve) => {
        const stages = [
          { name: 'detect', description: 'Detection', estimatedTime: 2000 },
        ]
        progressTracker.initializeStages(stages)

        progressTracker.on('progress', (event: ProgressEvent) => {
          expect(event.eta).toBeInstanceOf(Date)
          expect(event.eta.getTime()).toBeGreaterThan(Date.now())
          resolve()
        })

        progressTracker.updateProgress(50)
      })
    })

    it('should improve ETA as progress advances', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 5000 },
        { name: 'validate', description: 'Validation', estimatedTime: 5000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(25)
      const stats1 = progressTracker.getStats()
      progressTracker.updateProgress(75)
      const stats2 = progressTracker.getStats()
      expect(stats2.estimatedRemaining).toBeLessThan(stats1.estimatedRemaining)
    })
  })

  describe('Events', () => {
    it('should emit stageChanged', () => {
      return new Promise<void>((resolve) => {
        const stages = [
          { name: 'detect', description: 'Detection', estimatedTime: 1000 },
          { name: 'validate', description: 'Validation', estimatedTime: 2000 },
        ]
        progressTracker.initializeStages(stages)

        progressTracker.on('stageChanged', (data) => {
          expect(data.previousStage).toBe('detect')
          expect(data.currentStage).toBe('validate')
          resolve()
        })

        progressTracker.nextStage()
      })
    })

    it('should emit complete', () => {
      return new Promise<void>((resolve) => {
        const stages = [
          { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        ]
        progressTracker.initializeStages(stages)

        progressTracker.on('complete', (data) => {
          expect(data).toHaveProperty('totalTime')
          resolve()
        })

        progressTracker.complete()
      })
    })

    it('should emit cancelled', () => {
      return new Promise<void>((resolve) => {
        const stages = [
          { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        ]
        progressTracker.initializeStages(stages)

        progressTracker.on('cancelled', () => {
          resolve()
        })

        progressTracker.cancel()
      })
    })
  })

  describe('Cancellation', () => {
    it('should support cancellation', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.cancel()
      expect(progressTracker.isCancelled()).toBe(true)
    })

    it('should stop updates after cancellation', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.cancel()
      progressTracker.updateProgress(50)
      const stats = progressTracker.getStats()
      expect(stats.totalProgress).toBe(0)
    })

    it('should prevent nextStage after cancellation', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        { name: 'validate', description: 'Validation', estimatedTime: 2000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.cancel()
      const result = progressTracker.nextStage()
      expect(result).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should provide statistics', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      const stats = progressTracker.getStats()
      expect(stats).toHaveProperty('totalProgress')
      expect(stats).toHaveProperty('currentStage')
      expect(stats).toHaveProperty('stagesCompleted')
      expect(stats).toHaveProperty('totalStages')
      expect(stats).toHaveProperty('elapsedTime')
      expect(stats).toHaveProperty('estimatedTotal')
      expect(stats).toHaveProperty('estimatedRemaining')
    })

    it('should track elapsed time', () => {
      return new Promise<void>((resolve) => {
        const stages = [
          { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        ]
        progressTracker.initializeStages(stages)

        setTimeout(() => {
          const stats = progressTracker.getStats()
          expect(stats.elapsedTime).toBeGreaterThanOrEqual(50)
          expect(stats.elapsedTime).toBeLessThan(300)
          resolve()
        }, 100)
      })
    })
  })

  describe('Completion', () => {
    it('should mark all stages completed', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        { name: 'validate', description: 'Validation', estimatedTime: 2000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.complete()
      const stats = progressTracker.getStats()
      expect(stats.stagesCompleted).toBe(2)
    })

    it('should mark stages as completed when transitioned', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
        { name: 'validate', description: 'Validation', estimatedTime: 2000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(100)
      progressTracker.nextStage()
      const stats = progressTracker.getStats()
      expect(stats.stagesCompleted).toBe(1)
    })
  })

  describe('Reset & Cleanup', () => {
    it('should reset to initial state', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.updateProgress(50)
      progressTracker.reset()
      const stats = progressTracker.getStats()
      expect(stats.totalProgress).toBe(0)
      expect(stats.elapsedTime).toBe(0)
      expect(stats.totalStages).toBe(0)
    })

    it('should clear listeners on reset', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      let eventFired = false
      progressTracker.on('progress', () => {
        eventFired = true
      })
      progressTracker.reset()
      progressTracker.updateProgress(50)
      expect(eventFired).toBe(false)
    })

    it('should cleanup resources', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)
      progressTracker.destroy()
      const stats = progressTracker.getStats()
      expect(stats.totalStages).toBe(0)
    })
  })

  describe('Integration', () => {
    it('should handle full workflow', () => {
      const stages = [
        {
          name: 'detect',
          description: 'Framework detection',
          estimatedTime: 1000,
        },
        {
          name: 'validate',
          description: 'Configuration validation',
          estimatedTime: 2000,
        },
        {
          name: 'install',
          description: 'Dependency installation',
          estimatedTime: 5000,
        },
      ]

      progressTracker.initializeStages(stages)

      const events: ProgressEvent[] = []
      progressTracker.on('progress', (event) => {
        events.push(event)
      })

      // First stage
      progressTracker.updateProgress(100)
      progressTracker.nextStage()

      // Second stage
      progressTracker.updateProgress(50)
      progressTracker.nextStage()

      // Third stage
      progressTracker.updateProgress(100)
      progressTracker.nextStage()

      const stats = progressTracker.getStats()
      expect(stats.stagesCompleted).toBe(3)
      expect(events.length).toBeGreaterThan(0)
    })

    it('should handle concurrent updates', () => {
      const stages = [
        { name: 'detect', description: 'Detection', estimatedTime: 1000 },
      ]
      progressTracker.initializeStages(stages)

      const updates = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      updates.forEach((value) => {
        progressTracker.updateProgress(value)
      })

      const stats = progressTracker.getStats()
      expect(stats.totalProgress).toBe(100)
      expect(stats.eventCount).toBe(10)
    })
  })
})
