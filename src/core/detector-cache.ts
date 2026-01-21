import { join } from 'path'
import { watch as fsWatch, type FSWatcher } from 'fs'
import type { ProjectContext } from '../types/index.js'
import { CacheManager } from './cache-manager.js'
import { detectContext, clearDetectionCache } from './detector.js'
import { getModuleLogger } from '../utils/logger-provider.js'
import type { IFsAdapter } from './fs-adapter.js'

const logger = getModuleLogger()

/**
 * DetectorCache integrates CacheManager with framework detection
 * to provide fast cached results for framework detection operations.
 *
 * Features:
 * - Caches detection results with 24h TTL (configurable)
 * - Smart invalidation on file changes (package.json, config files)
 * - File watching for automatic cache invalidation
 * - Manual refresh option
 * - Performance metrics (cache hits/misses)
 *
 * @example
 * ```typescript
 * const cache = DetectorCache.getInstance()
 * await cache.enableWatching('/path/to/project')
 *
 * // First call: fresh detection (slow)
 * const ctx1 = await cache.detectContext('/path/to/project')
 *
 * // Second call: cached (fast, < 100ms)
 * const ctx2 = await cache.detectContext('/path/to/project')
 *
 * // Manual invalidation
 * cache.invalidateProject('/path/to/project')
 * ```
 */
/**
 * DetectorCache integrates CacheManager with framework detection
 * to provide fast cached results for framework detection operations.
 *
 * Features:
 * - Caches detection results with 24h TTL (configurable)
 * - Smart invalidation on file changes (package.json, config files)
 * - File watching for automatic cache invalidation
 * - Manual refresh option
 * - Performance metrics (cache hits/misses)
 *
 * @example
 * ```typescript
 * const cache = DetectorCache.getInstance()
 * await cache.enableWatching('/path/to/project')
 *
 * // First call: fresh detection (slow)
 * const ctx1 = await cache.detectContext('/path/to/project')
 *
 * // Second call: cached (fast, < 100ms)
 * const ctx2 = await cache.detectContext('/path/to/project')
 *
 * // Manual invalidation
 * cache.invalidateProject('/path/to/project')
 * ```
 */
export class DetectorCache {
  private static instance: DetectorCache
  private cacheManager: CacheManager
  private watchers: Map<string, FSWatcher> = new Map()
  private ttlMs: number = 24 * 60 * 60 * 1000 // 24 hours default
  private watchedPaths: Map<string, string[]> = new Map()

  /**
   * Critical files that trigger cache invalidation when changed
   */
  private readonly criticalFiles = [
    'package.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'next.config.js',
    'next.config.mjs',
    'nuxt.config.ts',
    'nuxt.config.js',
    'vite.config.ts',
    'vite.config.js',
    'webpack.config.js',
    'webpack.config.ts',
    'vue.config.js',
    'angular.json',
    'svelte.config.js',
    '.git/config',
  ]

  /**
   * Get singleton instance
   */
  static getInstance(): DetectorCache {
    if (!DetectorCache.instance) {
      DetectorCache.instance = new DetectorCache()
    }
    return DetectorCache.instance
  }

  private constructor() {
    this.cacheManager = new CacheManager({
      maxEntries: 100, // Max 100 projects cached
      maxMemory: 10 * 1024 * 1024, // 10MB for detection cache
      defaultTTL: this.ttlMs,
    })
  }

  /**
   * Configure cache TTL (in milliseconds)
   * Default: 24 hours
   */
  setTTL(ttlMs: number): void {
    this.ttlMs = ttlMs
    logger.debug(`DetectorCache TTL set to ${ttlMs}ms`)
  }

  /**
   * Generate cache key from project root
   */
  private getCacheKey(projectRoot: string): string {
    return `detection:${projectRoot}`
  }

  /**
   * Detect project context with caching
   *
   * @param projectRoot - Absolute path to project root
   * @param fsAdapter - Optional filesystem adapter (for testing)
   * @param forceRefresh - Force fresh detection bypass cache
   * @returns Cached or fresh ProjectContext
   */
  async detectContext(
    projectRoot: string,
    fsAdapter?: IFsAdapter,
    forceRefresh: boolean = false
  ): Promise<ProjectContext> {
    const cacheKey = this.getCacheKey(projectRoot)

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.cacheManager.has(cacheKey)) {
      const cached = this.cacheManager.get<ProjectContext>(cacheKey)
      if (cached) {
        logger.debug(`Cache hit for detection: ${projectRoot}`)
        return cached
      }
    }

    logger.debug(
      `Cache miss for detection: ${projectRoot}, performing fresh detection`
    )

    // Fresh detection
    const context = await detectContext(projectRoot, fsAdapter)

    // Store in cache with configured TTL
    this.cacheManager.set(cacheKey, context, this.ttlMs)

    return context
  }

  /**
   * Enable file watching for automatic cache invalidation
   *
   * @param projectRoot - Project root to watch
   */
  enableWatching(projectRoot: string): void {
    if (this.watchers.has(projectRoot)) {
      logger.debug(`Watching already enabled for ${projectRoot}`)
      return
    }

    const watchedPaths: string[] = []

    // Watch critical files for changes
    for (const file of this.criticalFiles) {
      const filePath = join(projectRoot, file)
      watchedPaths.push(filePath)

      // Ignore watch errors (files might not exist)
      try {
        const watcher = fsWatch(
          filePath,
          { persistent: false },
          (eventType) => {
            if (eventType === 'change') {
              logger.debug(`File changed: ${filePath}, invalidating cache`)
              this.invalidateProject(projectRoot)
            }
          }
        )

        watcher.on('error', () => {
          // Silently ignore watch errors (file might not exist yet)
        })

        this.watchers.set(`${projectRoot}:${file}`, watcher)
      } catch {
        // File doesn't exist yet, skip
      }
    }

    this.watchedPaths.set(projectRoot, watchedPaths)
    logger.debug(
      `Watching enabled for ${projectRoot} (${watchedPaths.length} files)`
    )
  }

  /**
   * Disable file watching
   */
  disableWatching(projectRoot: string): void {
    const keys = Array.from(this.watchers.keys()).filter((key) =>
      key.startsWith(`${projectRoot}:`)
    )

    for (const key of keys) {
      const watcher = this.watchers.get(key)
      if (watcher) {
        watcher.close()
        this.watchers.delete(key)
      }
    }

    this.watchedPaths.delete(projectRoot)
    logger.debug(`Watching disabled for ${projectRoot}`)
  }

  /**
   * Invalidate cache for a specific project
   */
  invalidateProject(projectRoot: string): void {
    const cacheKey = this.getCacheKey(projectRoot)
    this.cacheManager.invalidate(cacheKey)
    logger.debug(`Cache invalidated for ${projectRoot}`)
  }

  /**
   * Clear all detector cache entries
   */
  clearAll(): void {
    this.cacheManager.invalidatePattern(/^detection:/i)
    logger.debug('All detector cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hitRate: number
    totalHits: number
    totalMisses: number
    cacheSize: number
    watchedProjects: number
  } {
    const stats = this.cacheManager.getStats()
    return {
      hitRate: stats.hitRate,
      totalHits: stats.totalHits,
      totalMisses: stats.totalMisses,
      cacheSize: stats.avgEntrySize,
      watchedProjects: this.watchers.size,
    }
  }

  /**
   * Clean up all watchers and cache
   */
  destroy(): void {
    for (const watcher of this.watchers.values()) {
      try {
        watcher.close()
      } catch {
        // Ignore close errors
      }
    }
    this.watchers.clear()
    this.watchedPaths.clear()
    this.clearAll()
    logger.debug('DetectorCache destroyed')
  }

  /**
   * Reset to initial state (for testing)
   */
  reset(): void {
    this.destroy()
    this.ttlMs = 24 * 60 * 60 * 1000
    clearDetectionCache()
    logger.debug('DetectorCache reset')
  }
}

/**
 * Convenience singleton export
 */
export const detectorCache = DetectorCache.getInstance()
