import type { CacheManager } from './cache-manager'
import { getGlobalCacheManager } from './cache-manager'

/**
 * Plugin execution context
 */
export interface ExecutionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string
  version: string
  description?: string
  category?: string
  lazyLoad?: boolean
  priority?: number // Lower = load first
}

/**
 * Plugin module type
 */
export interface PluginModule {
  name: string
  version: string
  initialize?: () => Promise<void> | void
  destroy?: () => Promise<void> | void
  execute?: (context: ExecutionContext) => Promise<void> | void
}

/**
 * Lazy loaded plugin entry
 */
interface LazyPluginEntry {
  metadata: PluginMetadata
  loader: () => Promise<PluginModule>
  loaded: boolean
  module?: PluginModule
  loadError?: Error
  loadTime: number
}

/**
 * Plugin Loader Statistics
 */
export interface PluginLoaderStats {
  totalRegistered: number
  totalLoaded: number
  totalFailed: number
  cacheSize: number
  loadedPlugins: string[]
  failedPlugins: string[]
  totalLoadTime: number
  averageLoadTime: number
}

/**
 * LazyPluginLoader - Singleton for lazy loading plugins on-demand
 *
 * Features:
 * - Register plugins with lazy loading
 * - Load plugins on-demand
 * - Cache loaded modules
 * - Track loading statistics
 * - Error recovery and retry
 * - Performance monitoring
 */
export class LazyPluginLoader {
  private static instance: LazyPluginLoader
  private plugins: Map<string, LazyPluginEntry> = new Map()
  private loadingPromises: Map<string, Promise<PluginModule>> = new Map()
  private cacheManager: CacheManager
  private totalLoadTime: number = 0
  private loadAttempts: Map<string, number> = new Map()
  private maxRetries: number = 3

  private constructor() {
    this.cacheManager = getGlobalCacheManager()
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(): LazyPluginLoader {
    if (!LazyPluginLoader.instance) {
      LazyPluginLoader.instance = new LazyPluginLoader()
    }
    return LazyPluginLoader.instance
  }

  /**
   * Register a plugin for lazy loading
   */
  registerPlugin(
    name: string,
    metadata: Omit<PluginMetadata, 'name'>,
    loader: () => Promise<PluginModule>
  ): void {
    if (this.plugins.has(name)) {
      console.warn(`Plugin "${name}" already registered, skipping`)
      return
    }

    this.plugins.set(name, {
      metadata: { ...metadata, name },
      loader,
      loaded: false,
      loadTime: 0,
    })
  }

  /**
   * Load a plugin on-demand
   */
  async loadPlugin(name: string): Promise<PluginModule> {
    const entry = this.plugins.get(name)
    if (!entry) {
      throw new Error(`Plugin "${name}" not registered`)
    }

    // Return cached module if already loaded
    if (entry.loaded && entry.module) {
      return entry.module
    }

    // Return existing loading promise to avoid duplicate loads
    const existingPromise = this.loadingPromises.get(name)
    if (existingPromise) {
      return existingPromise
    }

    // Create new loading promise
    const loadPromise = this.performLoad(name, entry)
    this.loadingPromises.set(name, loadPromise)

    try {
      const module = await loadPromise
      return module
    } finally {
      this.loadingPromises.delete(name)
    }
  }

  /**
   * Perform the actual plugin loading with retry logic
   */
  private async performLoad(
    name: string,
    entry: LazyPluginEntry
  ): Promise<PluginModule> {
    const startTime = Date.now()
    const attempts = this.loadAttempts?.get(name) || 0

    try {
      const module = await entry.loader()

      // Initialize module if initialization hook exists
      if (module.initialize) {
        await module.initialize()
      }

      entry.loaded = true
      entry.module = module
      entry.loadTime = Date.now() - startTime
      this.totalLoadTime += entry.loadTime
      if (this.loadAttempts) {
        this.loadAttempts.delete(name)
      }

      // Store in cache with TTL
      if (this.cacheManager) {
        this.cacheManager.set(
          `plugin:${name}`,
          {
            module: module,
            loadedAt: Date.now(),
          },
          86400000 // 24 hours
        )
      }

      return module
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      entry.loadError = err

      // Retry logic
      if (attempts < this.maxRetries) {
        const backoffMs = Math.pow(2, attempts) * 100 // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        if (this.loadAttempts) {
          this.loadAttempts.set(name, attempts + 1)
        }
        return this.performLoad(name, entry)
      }

      throw new Error(
        `Failed to load plugin "${name}" after ${this.maxRetries} retries: ${err.message}`
      )
    }
  }

  /**
   * Load multiple plugins in parallel
   */
  async loadPlugins(names: string[]): Promise<PluginModule[]> {
    const promises = names.map((name) => this.loadPlugin(name))
    return Promise.all(promises)
  }

  /**
   * Load all registered plugins
   */
  async loadAll(): Promise<PluginModule[]> {
    const names = Array.from(this.plugins.keys())
    return this.loadPlugins(names)
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(name: string): boolean {
    const entry = this.plugins.get(name)
    return entry ? entry.loaded : false
  }

  /**
   * Get a loaded plugin module
   */
  getPlugin(name: string): PluginModule | undefined {
    const entry = this.plugins.get(name)
    return entry ? entry.module : undefined
  }

  /**
   * Execute a plugin if loaded
   */
  async executePlugin(name: string, context: ExecutionContext): Promise<void> {
    const module = await this.loadPlugin(name)
    if (module.execute) {
      await module.execute(context)
    }
  }

  /**
   * Unload a plugin and clean up
   */
  async unloadPlugin(name: string): Promise<void> {
    const entry = this.plugins.get(name)
    if (!entry || !entry.loaded || !entry.module) {
      return
    }

    // Call destroy hook if available
    if (entry.module.destroy) {
      await entry.module.destroy()
    }

    entry.loaded = false
    entry.module = undefined
    entry.loadError = undefined

    // Remove from cache
    if (this.cacheManager) {
      this.cacheManager.invalidate(`plugin:${name}`)
    }
  }

  /**
   * Unload all plugins
   */
  async unloadAll(): Promise<void> {
    const names = Array.from(this.plugins.keys())
    await Promise.all(names.map((name) => this.unloadPlugin(name)))
  }

  /**
   * Get plugin metadata
   */
  getMetadata(name: string): PluginMetadata | undefined {
    const entry = this.plugins.get(name)
    return entry ? entry.metadata : undefined
  }

  /**
   * Get all registered plugin metadata
   */
  getAllMetadata(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map((entry) => entry.metadata)
  }

  /**
   * Get load time for a plugin
   */
  getLoadTime(name: string): number {
    const entry = this.plugins.get(name)
    return entry ? entry.loadTime : 0
  }

  /**
   * Get detailed statistics
   */
  getStats(): PluginLoaderStats {
    const entries = Array.from(this.plugins.values())
    const loaded = entries.filter((e) => e.loaded)
    const failed = entries.filter((e) => e.loadError)

    const loadTimes = loaded.map((e) => e.loadTime)
    const averageLoadTime =
      loadTimes.length > 0
        ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
        : 0

    return {
      totalRegistered: this.plugins.size,
      totalLoaded: loaded.length,
      totalFailed: failed.length,
      cacheSize: this.plugins.size,
      loadedPlugins: loaded.map((e) => e.metadata.name),
      failedPlugins: failed.map((e) => e.metadata.name),
      totalLoadTime: this.totalLoadTime,
      averageLoadTime,
    }
  }

  /**
   * Reset to initial state (for testing)
   */
  reset(): void {
    this.plugins.clear()
    this.loadingPromises.clear()
    this.totalLoadTime = 0
    this.loadAttempts.clear()
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.reset()
  }
}

/**
 * Export singleton instance
 */
export const lazyPluginLoader = LazyPluginLoader.getInstance()
