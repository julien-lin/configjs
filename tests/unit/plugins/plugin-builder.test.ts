import { describe, it, expect, beforeEach } from 'vitest'
import {
  PluginBuilder,
  createPlugin,
} from '../../../src/plugins/builder/plugin-builder.js'
import { Category } from '../../../src/types/index.js'

describe('PluginBuilder', () => {
  let builder: PluginBuilder

  beforeEach(() => {
    builder = new PluginBuilder()
  })

  describe('Basic configuration', () => {
    it('should set name and displayName', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.name).toBe('test-plugin')
      expect(plugin.displayName).toBe('Test Plugin')
    })

    it('should set description', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin', 'Test description')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.description).toBe('Test description')
    })

    it('should set version', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withVersion('^1.0.0')
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.version).toBe('^1.0.0')
    })
  })

  describe('Framework support', () => {
    it('should set single framework', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.frameworks).toEqual(['react'])
    })

    it('should set multiple frameworks', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFrameworks(['react', 'vue'])
        .inCategory(Category.STATE)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.frameworks).toEqual(['react', 'vue'])
    })

    it('should throw when no frameworks specified', () => {
      expect(() => {
        builder.forFrameworks([])
      }).toThrow('At least one framework must be specified')
    })
  })

  describe('Category', () => {
    it('should set category', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.ROUTING)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.category).toBe(Category.ROUTING)
    })

    it('should alias category method', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .category(Category.HTTP)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.category).toBe(Category.HTTP)
    })
  })

  describe('Dependencies', () => {
    it('should set incompatibleWith', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .incompatibleWith(['other-plugin', 'another-plugin'])
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.incompatibleWith).toEqual([
        'other-plugin',
        'another-plugin',
      ])
    })

    it('should add single incompatible plugin', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .addIncompatibleWith('first-plugin')
        .addIncompatibleWith('second-plugin')
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.incompatibleWith).toEqual(['first-plugin', 'second-plugin'])
    })

    it('should set requires', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .requires(['peer-dep'])
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.requires).toEqual(['peer-dep'])
    })

    it('should add single required plugin', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .addRequires('dep1')
        .addRequires('dep2')
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.requires).toEqual(['dep1', 'dep2'])
    })

    it('should set recommends', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .recommends(['types-package'])
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.recommends).toEqual(['types-package'])
    })

    it('should add single recommended plugin', () => {
      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .addRecommends('rec1')
        .addRecommends('rec2')
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.recommends).toEqual(['rec1', 'rec2'])
    })
  })

  describe('Lifecycle handlers', () => {
    it('should set install handler', async () => {
      const installFn = async () => ({
        packages: { dependencies: ['my-package'], devDependencies: [] },
        success: true,
      })

      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstall(installFn)
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      const result = await plugin.install({} as any)
      expect(result.packages.dependencies).toContain('my-package')
    })

    it('should alias withInstallHandler', async () => {
      const installFn = async () => ({
        packages: { dependencies: ['my-package'], devDependencies: [] },
        success: true,
      })

      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstallHandler(installFn)
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      const result = await plugin.install({} as any)
      expect(result.packages.dependencies).toContain('my-package')
    })

    it('should set configure handler', async () => {
      const configureFn = async () => ({
        success: true,
        files: [{ type: 'create' as const, path: 'config-file.ts' }],
      })

      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(configureFn)
        .build()

      const result = await plugin.configure({} as any)
      expect(result.files[0]?.path).toBe('config-file.ts')
    })

    it('should alias withConfigHandler', async () => {
      const configureFn = async () => ({
        success: true,
        files: [{ type: 'create' as const, path: 'config-file.ts' }],
      })

      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigHandler(configureFn)
        .build()

      const result = await plugin.configure({} as any)
      expect(result.files[0]?.path).toBe('config-file.ts')
    })

    it('should set detect handler', async () => {
      const detectFn = async (ctx: any) => 'zustand' in ctx.dependencies

      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withDetect(detectFn)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.detect).toBeDefined()
      const result = await plugin.detect!({
        dependencies: { zustand: '1.0' },
      } as any)
      expect(result).toBe(true)
    })

    it('should set preInstall and postInstall handlers', async () => {
      const preInstallFn = async () => {
        // Setup
      }
      const postInstallFn = async () => {
        // Cleanup
      }

      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withPreInstall(preInstallFn)
        .withPostInstall(postInstallFn)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.preInstall).toBeDefined()
      expect(plugin.postInstall).toBeDefined()
    })

    it('should set rollback handler', async () => {
      const rollbackFn = async () => {
        // Cleanup
      }

      const plugin = builder
        .named('test-plugin', 'Test Plugin')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withRollback(rollbackFn)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.rollback).toBeDefined()
    })
  })

  describe('Method chaining', () => {
    it('should support full fluent API', () => {
      const plugin = builder
        .named('my-state-lib', 'My State Library', 'A state management library')
        .forFrameworks(['react', 'vue'])
        .inCategory(Category.STATE)
        .withVersion('^2.0.0')
        .incompatibleWith(['redux', '@reduxjs/toolkit'])
        .requires(['react', 'vue'])
        .recommends(['@types/my-state-lib'])
        .withInstall(async () => ({
          packages: { dependencies: ['my-state-lib'], devDependencies: ['@types/my-state-lib'] },
          success: true,
        }))
        .withConfigure(async () => ({
          success: true,
          files: [{ type: 'create' as const, path: 'src/store/index.ts' }],
        }))
        .build()

      expect(plugin.name).toBe('my-state-lib')
      expect(plugin.displayName).toBe('My State Library')
      expect(plugin.frameworks).toContain('react')
      expect(plugin.frameworks).toContain('vue')
      expect(plugin.incompatibleWith).toContain('redux')
      expect(plugin.requires).toContain('react')
      expect(plugin.recommends).toContain('@types/my-state-lib')
    })
  })

  describe('Validation', () => {
    it('should throw when build is called without required fields', () => {
      expect(() => {
        builder.build()
      }).toThrow()
    })

    it('should throw when name is missing', () => {
      expect(() => {
        builder
          .forFramework('react')
          .inCategory(Category.STATE)
          .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
          .withConfigure(async () => ({ success: true, files: [] }))
          .build()
      }).toThrow('Missing required property: name')
    })

    it('should throw when install is missing', () => {
      expect(() => {
        builder
          .named('test', 'Test')
          .forFramework('react')
          .inCategory(Category.STATE)
          .withConfigure(async () => ({ success: true, files: [] }))
          .build()
      }).toThrow('Missing required property: install')
    })

    it('should throw when configure is missing', () => {
      expect(() => {
        builder
          .named('test', 'Test')
          .forFramework('react')
          .inCategory(Category.STATE)
          .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
          .build()
      }).toThrow('Missing required property: configure')
    })
  })

  describe('Helper function', () => {
    it('should create plugin using createPlugin helper', () => {
      const plugin = createPlugin()
        .named('helper-test', 'Helper Test')
        .forFramework('react')
        .inCategory(Category.STATE)
        .withInstall(async () => ({ packages: { dependencies: [], devDependencies: [] }, success: true }))
        .withConfigure(async () => ({ success: true, files: [] }))
        .build()

      expect(plugin.name).toBe('helper-test')
    })
  })
})
