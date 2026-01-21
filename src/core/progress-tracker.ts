import { EventEmitter } from 'events'

/**
 * Installation stage definition
 */
export interface InstallationStage {
  name: string
  description: string
  estimatedTime: number // ms
  completed: boolean
  progress: number // 0-100
}

/**
 * Progress event details
 */
export interface ProgressEvent {
  stage: string
  progress: number // 0-100 overall
  stageProgress: number // 0-100 for current stage
  elapsedTime: number // ms
  estimatedRemaining: number // ms
  eta: Date
}

/**
 * Progress tracker statistics
 */
export interface ProgressStats {
  totalProgress: number // 0-100
  currentStage: string
  stagesCompleted: number
  totalStages: number
  elapsedTime: number // ms
  estimatedTotal: number // ms
  estimatedRemaining: number // ms
  eta: Date | null
  eventCount: number
  averageEventInterval: number // ms
}

/**
 * ProgressTracker - Singleton for tracking installation progress
 *
 * Features:
 * - Stage-based progress tracking
 * - Automatic ETA calculation
 * - Real-time progress events
 * - Cancellation support
 * - Memory efficient with event batching
 */
export class ProgressTracker extends EventEmitter {
  private static instance: ProgressTracker
  private stages: Map<string, InstallationStage> = new Map()
  private currentStageIndex: number = 0
  private startTime: number = 0
  private lastEventTime: number = 0
  private eventIntervals: number[] = []
  private totalEventCount: number = 0
  private cancelled: boolean = false

  private constructor() {
    super()
    this.setMaxListeners(50)
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(): ProgressTracker {
    if (!ProgressTracker.instance) {
      ProgressTracker.instance = new ProgressTracker()
    }
    return ProgressTracker.instance
  }

  /**
   * Initialize stages for installation
   */
  initializeStages(
    stageDefinitions: Omit<InstallationStage, 'completed' | 'progress'>[]
  ): void {
    this.stages.clear()
    this.currentStageIndex = 0
    this.cancelled = false

    stageDefinitions.forEach((def) => {
      this.stages.set(def.name, {
        ...def,
        completed: false,
        progress: 0,
      })
    })

    this.startTime = Date.now()
    this.lastEventTime = this.startTime
  }

  /**
   * Add stage to tracking
   */
  addStage(name: string, description: string, estimatedTime: number): void {
    if (!this.stages.has(name)) {
      this.stages.set(name, {
        name,
        description,
        estimatedTime,
        completed: false,
        progress: 0,
      })
    }
  }

  /**
   * Update progress for current stage
   */
  updateProgress(stageProgress: number): void {
    if (this.cancelled) return

    const stageNames = Array.from(this.stages.keys())
    if (this.currentStageIndex >= stageNames.length) return

    const stageName = stageNames[this.currentStageIndex]
    if (!stageName) return
    const stage = this.stages.get(stageName)
    if (!stage) return

    // Clamp progress to 0-100
    stage.progress = Math.max(0, Math.min(100, stageProgress))

    // Emit progress event
    this.emitProgressEvent(stageName, stage.progress)
  }

  /**
   * Complete current stage and move to next
   */
  nextStage(): boolean {
    if (this.cancelled) return false

    const stageNames = Array.from(this.stages.keys())
    if (this.currentStageIndex >= stageNames.length) return false

    const currentStageName = stageNames[this.currentStageIndex]
    if (!currentStageName) return false
    const currentStage = this.stages.get(currentStageName)
    if (currentStage) {
      currentStage.completed = true
      currentStage.progress = 100
    }

    this.currentStageIndex += 1

    if (this.currentStageIndex < stageNames.length) {
      const nextStageName = stageNames[this.currentStageIndex]
      if (!nextStageName) return true
      const nextStage = this.stages.get(nextStageName)
      if (nextStage) {
        nextStage.progress = 0
      }

      // Emit stage transition event
      this.emitProgressEvent(nextStageName, 0)
      this.emit('stageChanged', {
        previousStage: currentStageName,
        currentStage: nextStageName,
        timestamp: Date.now(),
      })
    }

    return this.currentStageIndex < stageNames.length
  }

  /**
   * Complete entire progress tracking
   */
  complete(): void {
    const stageNames = Array.from(this.stages.keys())
    stageNames.forEach((name) => {
      const stage = this.stages.get(name)
      if (stage && !stage.completed) {
        stage.completed = true
        stage.progress = 100
      }
    })

    this.currentStageIndex = stageNames.length
    this.emit('complete', {
      totalTime: Date.now() - this.startTime,
      timestamp: Date.now(),
    })
  }

  /**
   * Cancel progress tracking
   */
  cancel(): void {
    this.cancelled = true
    this.emit('cancelled', {
      timestamp: Date.now(),
    })
  }

  /**
   * Check if cancelled
   */
  isCancelled(): boolean {
    return this.cancelled
  }

  /**
   * Emit progress event with ETA calculation
   */
  private emitProgressEvent(stageName: string, stageProgress: number): void {
    const now = Date.now()
    const elapsedTime = now - this.startTime

    // Track event interval for averaging
    if (this.lastEventTime > 0) {
      const interval = now - this.lastEventTime
      this.eventIntervals.push(interval)
      if (this.eventIntervals.length > 100) {
        this.eventIntervals.shift()
      }
    }
    this.lastEventTime = now
    this.totalEventCount += 1

    // Calculate overall progress
    const totalProgress = this.calculateTotalProgress()
    const estimatedRemaining = this.calculateEstimatedRemaining()
    const eta = new Date(now + estimatedRemaining)

    const event: ProgressEvent = {
      stage: stageName,
      progress: totalProgress,
      stageProgress,
      elapsedTime,
      estimatedRemaining,
      eta,
    }

    this.emit('progress', event)
  }

  /**
   * Calculate total progress percentage
   */
  private calculateTotalProgress(): number {
    const stages = Array.from(this.stages.values())
    if (stages.length === 0) return 0

    const totalProgress = stages.reduce((sum, stage) => {
      return sum + stage.progress
    }, 0)

    return Math.round(totalProgress / stages.length)
  }

  /**
   * Calculate estimated remaining time
   */
  private calculateEstimatedRemaining(): number {
    const stageNames = Array.from(this.stages.keys())
    const stages = Array.from(this.stages.values())

    if (stages.length === 0) return 0

    const elapsedTime = Date.now() - this.startTime
    const totalEstimated = stages.reduce(
      (sum, stage) => sum + stage.estimatedTime,
      0
    )

    // Get completion rate (completed time / estimated time)
    let completedTime = 0
    for (let i = 0; i < this.currentStageIndex; i++) {
      const stageName = stageNames[i]
      if (!stageName) continue
      const stage = this.stages.get(stageName)
      if (stage) {
        completedTime += stage.estimatedTime
      }
    }

    // Add current stage progress
    if (this.currentStageIndex < stageNames.length) {
      const currentStageName = stageNames[this.currentStageIndex]
      if (currentStageName) {
        const currentStage = this.stages.get(currentStageName)
        if (currentStage) {
          const currentProgress = currentStage.progress / 100
          completedTime += currentStage.estimatedTime * currentProgress
        }
      }
    }

    // If not enough data for extrapolation, use simple estimate
    if (elapsedTime < 100) {
      return Math.max(0, totalEstimated - completedTime)
    }

    // Extrapolate remaining time based on actual pace
    const pace = elapsedTime / Math.max(1, completedTime)
    const remainingEstimated = totalEstimated - completedTime
    const extrapolatedRemaining = remainingEstimated * pace

    return Math.max(0, Math.round(extrapolatedRemaining))
  }

  /**
   * Get current progress statistics
   */
  getStats(): ProgressStats {
    const stageNames = Array.from(this.stages.keys())
    const stages = Array.from(this.stages.values())
    const completedStages = stages.filter((s) => s.completed).length
    const elapsedTime = this.startTime > 0 ? Date.now() - this.startTime : 0
    const estimatedTotal = stages.reduce(
      (sum, stage) => sum + stage.estimatedTime,
      0
    )
    const estimatedRemaining = this.calculateEstimatedRemaining()
    const totalProgress = this.calculateTotalProgress()
    const currentStage = stageNames[this.currentStageIndex] || ''

    // Calculate average event interval
    const averageEventInterval =
      this.eventIntervals.length > 0
        ? Math.round(
            this.eventIntervals.reduce((a, b) => a + b, 0) /
              this.eventIntervals.length
          )
        : 0

    return {
      totalProgress,
      currentStage,
      stagesCompleted: completedStages,
      totalStages: stages.length,
      elapsedTime,
      estimatedTotal,
      estimatedRemaining,
      eta:
        estimatedRemaining > 0
          ? new Date(Date.now() + estimatedRemaining)
          : null,
      eventCount: this.totalEventCount,
      averageEventInterval,
    }
  }

  /**
   * Reset to initial state (for testing)
   */
  reset(): void {
    this.stages.clear()
    this.currentStageIndex = 0
    this.startTime = 0
    this.lastEventTime = 0
    this.eventIntervals = []
    this.totalEventCount = 0
    this.cancelled = false
    this.removeAllListeners()
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.reset()
    this.removeAllListeners()
  }
}

/**
 * Export singleton instance
 */
export const progressTracker = ProgressTracker.getInstance()
