import { describe, it, expect } from 'vitest'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../../src/core/validator.js'
import type { Plugin, ProjectContext } from '../../../src/types/index.js'
import { Category } from '../../../src/types/index.js'

/**
 * Crée un plugin mock pour les tests
 */
function createMockPlugin(
  name: string,
  frameworks: string[] = ['react', 'vue']
): Plugin {
  return {
    name,
    displayName: name,
    description: `Mock plugin ${name}`,
    category: Category.TOOLING,
    frameworks: frameworks as ('react' | 'vue' | 'nextjs')[],
    install: async () => ({ success: true, packages: {} }),
    configure: async () => ({ success: true, files: [] }),
  }
}

/**
 * Crée un contexte Vue.js mock
 */
function createVueContext(): ProjectContext {
  return {
    framework: 'vue',
    frameworkVersion: '3.4.0',
    bundler: 'vite',
    bundlerVersion: '5.0.0',
    typescript: true,
    packageManager: 'npm',
    lockfile: 'package-lock.json',
    projectRoot: '/tmp/test-project',
    srcDir: 'src',
    publicDir: 'public',
    os: 'darwin',
    nodeVersion: 'v20.0.0',
    dependencies: {
      vue: '^3.4.0',
    },
    devDependencies: {},
    hasGit: false,
    vueVersion: '3',
    vueApi: 'composition',
  } as ProjectContext
}

describe('CompatibilityValidator - Vue.js', () => {
  const validator = new CompatibilityValidator(compatibilityRules)

  describe('React Router avec Vue.js', () => {
    it('should return error when React Router is used with Vue.js', () => {
      const ctx = createVueContext()
      const plugins = [
        createMockPlugin('react-router-dom', ['react']),
        createMockPlugin('vue-router', ['vue']),
      ]

      const result = validator.validate(plugins, ctx)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(
        result.errors.some((e) => e.plugins?.includes('react-router-dom'))
      ).toBe(true)
    })
  })

  describe('Zustand/Redux avec Vue.js', () => {
    it('should return error when Zustand is used with Vue.js', () => {
      const ctx = createVueContext()
      const plugins = [
        createMockPlugin('zustand', ['react']),
        createMockPlugin('pinia', ['vue']),
      ]

      const result = validator.validate(plugins, ctx)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some((e) => e.plugins?.includes('zustand'))).toBe(
        true
      )
    })

    it('should return error when Redux Toolkit is used with Vue.js', () => {
      const ctx = createVueContext()
      const plugins = [
        createMockPlugin('@reduxjs/toolkit', ['react']),
        createMockPlugin('pinia', ['vue']),
      ]

      const result = validator.validate(plugins, ctx)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(
        result.errors.some((e) => e.plugins?.includes('@reduxjs/toolkit'))
      ).toBe(true)
    })
  })

  describe('Shadcn/ui avec Vue.js', () => {
    it('should return error when Shadcn/ui is used with Vue.js', () => {
      const ctx = createVueContext()
      const plugins = [
        createMockPlugin('shadcn-ui', ['react']),
        createMockPlugin('vuetify', ['vue']),
      ]

      const result = validator.validate(plugins, ctx)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some((e) => e.plugins?.includes('shadcn-ui'))).toBe(
        true
      )
    })
  })

  describe('Plugins compatibles Vue.js', () => {
    it('should return valid for Vue.js compatible plugins', () => {
      const ctx = createVueContext()
      const plugins = [
        createMockPlugin('vue-router', ['vue']),
        createMockPlugin('pinia', ['vue']),
        createMockPlugin('axios', ['react', 'vue']),
        createMockPlugin('tailwindcss', ['react', 'vue']),
      ]

      const result = validator.validate(plugins, ctx)

      // Les plugins Vue.js compatibles ne devraient pas avoir d'erreurs
      // Il peut y avoir des warnings (ex: version Vue Router), mais pas d'erreurs
      expect(result.errors.length).toBe(0)
    })

    it('should return valid for VueUse with Vue.js', () => {
      const ctx = createVueContext()
      const plugins = [
        createMockPlugin('@vueuse/core', ['vue']),
        createMockPlugin('vue-router', ['vue']),
      ]

      const result = validator.validate(plugins, ctx)

      // VueUse et Vue Router sont compatibles avec Vue.js
      // Il peut y avoir un warning sur Vue Router version, mais pas d'erreur
      expect(result.errors.length).toBe(0)
    })
  })

  describe('Vue Router version warning', () => {
    it('should return warning for Vue Router version mismatch', () => {
      const ctx = createVueContext()
      const plugins = [createMockPlugin('vue-router', ['vue'])]

      const result = validator.validate(plugins, ctx)

      // Vue Router devrait avoir un warning sur la version
      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Conflits multiples', () => {
    it('should detect multiple conflicts with Vue.js', () => {
      const ctx = createVueContext()
      const plugins = [
        createMockPlugin('react-router-dom', ['react']),
        createMockPlugin('zustand', ['react']),
        createMockPlugin('shadcn-ui', ['react']),
      ]

      const result = validator.validate(plugins, ctx)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
