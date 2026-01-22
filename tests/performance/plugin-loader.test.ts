import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import { join } from 'path'
import { tmpdir } from 'os'
import { mkdtemp, remove, writeFile } from 'fs-extra'
import {
  LazyPluginLoader,
  type PluginModule,
} from '../../src/core/plugin-loader'

describe('LazyPluginLoader', () => {
  let loader: LazyPluginLoader

  beforeEach(() => {
    loader = LazyPluginLoader.getInstance()
    loader.reset()
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const l1 = LazyPluginLoader.getInstance()
      const l2 = LazyPluginLoader.getInstance()
      expect(l1).toBe(l2)
    })
  })

  describe('Registration', () => {
    it('should register plugin', () => {
      const mockLoader = async () =>
        ({
          name: 'test',
          version: '1.0.0',
        }) as PluginModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      const meta = loader.getMetadata('test')

      expect(meta?.name).toBe('test')
      expect(meta?.version).toBe('1.0.0')
    })

    it('should prevent duplicate registration', () => {
      const loader1 = async () =>
        ({ name: 'test', version: '1.0.0' }) as PluginModule
      const loader2 = async () =>
        ({ name: 'test', version: '2.0.0' }) as PluginModule

      loader.registerPlugin('test', { version: '1.0.0' }, loader1)
      loader.registerPlugin('test', { version: '2.0.0' }, loader2)

      const meta = loader.getMetadata('test')
      expect(meta?.version).toBe('1.0.0')
    })

    it('should get all registered plugins', () => {
      const mockLoader = async () =>
        ({ name: 'test', version: '1.0.0' }) as PluginModule

      loader.registerPlugin('test1', { version: '1.0.0' }, mockLoader)
      loader.registerPlugin('test2', { version: '1.0.0' }, mockLoader)

      const allMeta = loader.getAllMetadata()
      expect(allMeta).toHaveLength(2)
    })
  })

  describe('Loading', () => {
    it('should load plugin on-demand', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      const loaded = await loader.loadPlugin('test')

      expect(loaded.name).toBe('test')
    })

    it('should cache loaded plugins', async () => {
      let callCount = 0
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => {
        callCount++
        return mockModule
      }

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      await loader.loadPlugin('test')
      await loader.loadPlugin('test')

      expect(callCount).toBe(1) // Called once, cached on second call
    })

    it('should initialize plugin on load', async () => {
      let initCalled = false
      const mockModule: PluginModule = {
        name: 'test',
        version: '1.0.0',
        initialize: async () => {
          initCalled = true
        },
      }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      await loader.loadPlugin('test')

      expect(initCalled).toBe(true)
    })

    it('should throw on unregistered plugin', async () => {
      await expect(loader.loadPlugin('nonexistent')).rejects.toThrow(
        'not registered'
      )
    })
  })

  describe('Parallel Loading', () => {
    it('should load multiple plugins in parallel', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test1', { version: '1.0.0' }, mockLoader)
      loader.registerPlugin('test2', { version: '1.0.0' }, mockLoader)

      const results = await loader.loadPlugins(['test1', 'test2'])

      expect(results).toHaveLength(2)
      expect(results[0]?.name).toBe('test')
    })

    it('should load all plugins', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test1', { version: '1.0.0' }, mockLoader)
      loader.registerPlugin('test2', { version: '1.0.0' }, mockLoader)

      const results = await loader.loadAll()

      expect(results).toHaveLength(2)
    })
  })

  describe('State', () => {
    it('should track loaded state', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)

      expect(loader.isLoaded('test')).toBe(false)
      await loader.loadPlugin('test')
      expect(loader.isLoaded('test')).toBe(true)
    })

    it('should retrieve loaded plugin', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      await loader.loadPlugin('test')

      const plugin = loader.getPlugin('test')
      expect(plugin?.name).toBe('test')
    })
  })

  describe('Execution', () => {
    it('should execute plugin', async () => {
      let executed = false
      const mockModule: PluginModule = {
        name: 'test',
        version: '1.0.0',
        execute: async () => {
          executed = true
        },
      }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      await loader.executePlugin('test', {})

      expect(executed).toBe(true)
    })

    it('should load plugin before executing', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)

      expect(loader.isLoaded('test')).toBe(false)
      await loader.executePlugin('test', {})
      expect(loader.isLoaded('test')).toBe(true)
    })
  })

  describe('Unloading', () => {
    it('should unload plugin', async () => {
      let destroyed = false
      const mockModule: PluginModule = {
        name: 'test',
        version: '1.0.0',
        destroy: async () => {
          destroyed = true
        },
      }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      await loader.loadPlugin('test')
      await loader.unloadPlugin('test')

      expect(destroyed).toBe(true)
      expect(loader.isLoaded('test')).toBe(false)
    })

    it('should unload all plugins', async () => {
      let destroyCount = 0
      const mockModule: PluginModule = {
        name: 'test',
        version: '1.0.0',
        destroy: async () => {
          destroyCount++
        },
      }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test1', { version: '1.0.0' }, mockLoader)
      loader.registerPlugin('test2', { version: '1.0.0' }, mockLoader)

      await loader.loadAll()
      await loader.unloadAll()

      expect(destroyCount).toBe(2)
    })
  })

  describe('Statistics', () => {
    it('should provide statistics', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test1', { version: '1.0.0' }, mockLoader)
      loader.registerPlugin('test2', { version: '1.0.0' }, mockLoader)
      await loader.loadPlugin('test1')

      const stats = loader.getStats()

      expect(stats.totalRegistered).toBe(2)
      expect(stats.totalLoaded).toBe(1)
      expect(stats.loadedPlugins).toContain('test1')
    })

    it('should track load times', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return mockModule
      }

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      await loader.loadPlugin('test')

      const stats = loader.getStats()
      expect(stats.totalLoadTime).toBeGreaterThan(0)
      expect(stats.averageLoadTime).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should fail after max retries', async () => {
      const failLoader = async () => {
        throw new Error('Load failed')
      }

      loader.registerPlugin('test', { version: '1.0.0' }, failLoader)

      await expect(loader.loadPlugin('test')).rejects.toThrow('after')
    })

    it('should track failed plugins', async () => {
      const failLoader = async () => {
        throw new Error('Load failed')
      }

      loader.registerPlugin('failed', { version: '1.0.0' }, failLoader)

      try {
        await loader.loadPlugin('failed')
      } catch {
        // Expected
      }

      const stats = loader.getStats()
      expect(stats.totalFailed).toBeGreaterThan(0)
      expect(stats.failedPlugins).toContain('failed')
    })
  })

  describe('Cleanup', () => {
    it('should reset to initial state', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      await loader.loadPlugin('test')

      loader.reset()

      expect(loader.getAllMetadata()).toHaveLength(0)
      expect(loader.isLoaded('test')).toBe(false)
    })

    it('should support destroy', async () => {
      const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
      const mockLoader = async () => mockModule

      loader.registerPlugin('test', { version: '1.0.0' }, mockLoader)
      loader.destroy()

      expect(loader.getAllMetadata()).toHaveLength(0)
    })
  })

  describe('Signature Verification', () => {
    it('should load plugin when signature matches', async () => {
      const baseDir = await mkdtemp(join(tmpdir(), 'configjs-plugin-'))
      const pluginPath = join(baseDir, 'plugin.js')
      const content = 'export const plugin = {}'

      try {
        await writeFile(pluginPath, content)
        const signature = createHash('sha256').update(content).digest('hex')

        const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
        const mockLoader = async () => mockModule

        loader.registerPlugin(
          'test',
          {
            version: '1.0.0',
            signature,
            signaturePath: pluginPath,
          },
          mockLoader
        )

        await expect(loader.loadPlugin('test')).resolves.toBeDefined()
      } finally {
        await remove(baseDir)
      }
    })

    it('should reject plugin when signature mismatches', async () => {
      const baseDir = await mkdtemp(join(tmpdir(), 'configjs-plugin-'))
      const pluginPath = join(baseDir, 'plugin.js')

      try {
        await writeFile(pluginPath, 'export const plugin = {}')

        const mockModule: PluginModule = { name: 'test', version: '1.0.0' }
        const mockLoader = async () => mockModule

        loader.registerPlugin(
          'test',
          {
            version: '1.0.0',
            signature: 'deadbeef',
            signaturePath: pluginPath,
          },
          mockLoader
        )

        await expect(loader.loadPlugin('test')).rejects.toThrow(
          'Invalid signature'
        )
      } finally {
        await remove(baseDir)
      }
    })
  })
})
