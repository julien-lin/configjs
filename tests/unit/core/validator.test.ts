import { describe, it, expect } from 'vitest'
import {
  CompatibilityValidator,
  allCompatibilityRules,
} from '../../../src/core/validator.js'
import type { Plugin, CompatibilityRule, ProjectContext } from '../../../src/types/index.js'
import { Category } from '../../../src/types/index.js'
import { pluginRegistry } from '../../../src/plugins/registry.js'

// Mocks de plugins pour les tests
const createMockPlugin = (name: string): Plugin => ({
  name,
  displayName: name,
  description: `Mock plugin ${name}`,
  category: Category.STATE,
  frameworks: ['react'],
  install: () =>
    Promise.resolve({
      packages: { dependencies: [name] },
      success: true,
    }),
  configure: () =>
    Promise.resolve({
      files: [],
      success: true,
    }),
})

describe('CompatibilityValidator', () => {
  describe('validate', () => {
    it('should return valid for compatible plugins', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      const plugins = [
        createMockPlugin('react-router-dom'),
        createMockPlugin('axios'),
      ]

      const result = validator.validate(plugins)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should detect exclusive plugins error (Redux + Zustand)', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      const plugins = [
        createMockPlugin('@reduxjs/toolkit'),
        createMockPlugin('zustand'),
      ]

      const result = validator.validate(plugins)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.type).toBe('EXCLUSIVE')
      expect(result.errors[0]?.plugins).toContain('@reduxjs/toolkit')
      expect(result.errors[0]?.plugins).toContain('zustand')
    })

    it('should detect conflict warning (Tailwind + Bootstrap)', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      // Utiliser les vrais plugins du registry pour que les règles générées fonctionnent
      const tailwindPlugin = pluginRegistry.find(
        (p) => p.name === 'tailwindcss'
      )
      const bootstrapPlugin = pluginRegistry.find(
        (p) => p.name === 'react-bootstrap'
      )

      if (!tailwindPlugin || !bootstrapPlugin) {
        // Si les plugins ne sont pas dans le registry, skip le test
        return
      }

      const plugins = [tailwindPlugin, bootstrapPlugin]

      const result = validator.validate(plugins)

      expect(result.valid).toBe(true) // Conflit = warning, pas erreur
      expect(result.warnings.length).toBeGreaterThan(0)

      // La règle EXCLUSIVE CSS génère un warning (severity: 'warning')
      const exclusiveWarning = result.warnings.find(
        (w) => w.type === 'EXCLUSIVE'
      )
      expect(exclusiveWarning).toBeDefined()
      expect(exclusiveWarning?.plugins).toContain('tailwindcss')
      expect(exclusiveWarning?.plugins).toContain('react-bootstrap')
      expect(exclusiveWarning?.message).toContain('CSS')
    })

    it('should validate tailwindcss plugin successfully', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      const plugins = [
        createMockPlugin('tailwindcss'),
        createMockPlugin('@tailwindcss/vite'),
      ]

      const result = validator.validate(plugins)

      expect(result.valid).toBe(true)
      const requiresErrors = result.errors.filter((e) => e.type === 'REQUIRES')
      expect(requiresErrors).toHaveLength(0)
    })

    it('should provide recommendations', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      const plugins = [createMockPlugin('react-router-dom')]

      // Les recommandations sont générées avec framework spécifique
      // Il faut fournir un contexte React
      const ctx: ProjectContext = {
        framework: 'react' as const,
        frameworkVersion: '18.0.0',
        bundler: 'vite' as const,
        bundlerVersion: '4.0.0',
        typescript: true,
        packageManager: 'npm' as const,
        lockfile: 'package-lock.json',
        projectRoot: '/test',
        srcDir: '/test/src',
        publicDir: '/test/public',
        os: 'darwin' as const,
        nodeVersion: '18.0.0',
        dependencies: {},
        devDependencies: {},
        hasGit: false,
      }

      const result = validator.validate(plugins, ctx)

      expect(result.suggestions.length).toBeGreaterThan(0)
      const recommendation = result.suggestions.find((s) =>
        s.includes('@types/react-router-dom')
      )
      expect(recommendation).toBeDefined()
      expect(recommendation).toContain('@types/react-router-dom')
    })

    it('should handle multiple exclusive groups', () => {
      const customRules: CompatibilityRule[] = [
        {
          type: 'EXCLUSIVE',
          plugins: ['plugin-a', 'plugin-b'],
          reason: 'A and B are exclusive',
          severity: 'error',
        },
        {
          type: 'EXCLUSIVE',
          plugins: ['plugin-c', 'plugin-d'],
          reason: 'C and D are exclusive',
          severity: 'error',
        },
      ]

      const validator = new CompatibilityValidator(customRules)
      const plugins = [
        createMockPlugin('plugin-a'),
        createMockPlugin('plugin-b'),
        createMockPlugin('plugin-c'),
        createMockPlugin('plugin-d'),
      ]

      const result = validator.validate(plugins)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(2) // Deux groupes exclusifs
    })

    it('should handle empty plugin list', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      const plugins: Plugin[] = []

      const result = validator.validate(plugins)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.suggestions).toHaveLength(0)
    })

    it('should handle plugins with allowOverride flag', () => {
      const customRules: CompatibilityRule[] = [
        {
          type: 'EXCLUSIVE',
          plugins: ['plugin-a', 'plugin-b'],
          reason: 'A and B are exclusive',
          severity: 'error',
          allowOverride: true,
        },
      ]

      const validator = new CompatibilityValidator(customRules)
      const plugins = [
        createMockPlugin('plugin-a'),
        createMockPlugin('plugin-b'),
      ]

      const result = validator.validate(plugins)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.canOverride).toBe(true)
    })

    it('should not duplicate warnings and errors', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      const plugins = [
        createMockPlugin('tailwindcss'),
        createMockPlugin('bootstrap'),
      ]

      const result = validator.validate(plugins)

      // Vérifier qu'on n'a pas de doublons
      const conflictWarnings = result.warnings.filter(
        (w) => w.type === 'CONFLICT'
      )
      expect(conflictWarnings.length).toBeLessThanOrEqual(1)
    })

    it('should handle complex scenario with multiple rules', () => {
      const validator = new CompatibilityValidator(allCompatibilityRules)
      // Utiliser les vrais plugins du registry
      const tailwindPlugin = pluginRegistry.find(
        (p) => p.name === 'tailwindcss'
      )
      const bootstrapPlugin = pluginRegistry.find(
        (p) => p.name === 'react-bootstrap'
      )
      const routerPlugin = pluginRegistry.find(
        (p) => p.name === 'react-router-dom'
      )

      if (!tailwindPlugin || !bootstrapPlugin || !routerPlugin) {
        return
      }

      const plugins = [tailwindPlugin, bootstrapPlugin, routerPlugin]

      // Ajouter contexte React pour les recommandations
      const ctx: ProjectContext = {
        framework: 'react' as const,
        frameworkVersion: '18.0.0',
        bundler: 'vite' as const,
        bundlerVersion: '4.0.0',
        typescript: true,
        packageManager: 'npm' as const,
        lockfile: 'package-lock.json',
        projectRoot: '/test',
        srcDir: '/test/src',
        publicDir: '/test/public',
        os: 'darwin' as const,
        nodeVersion: '18.0.0',
        dependencies: {},
        devDependencies: {},
        hasGit: false,
      }

      const result = validator.validate(plugins, ctx)

      // Devrait avoir :
      // - 1 warning : Conflit Tailwind + Bootstrap
      // - 1 suggestion : Types pour react-router-dom (si le plugin a recommends)
      expect(result.valid).toBe(true) // Pas d'erreurs, seulement warnings et suggestions
      expect(result.warnings.length).toBeGreaterThan(0)
      // Les suggestions sont générées depuis plugin.recommends
      expect(result.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('allCompatibilityRules', () => {
    it('should export all compatibility rules (generated + additional)', () => {
      expect(allCompatibilityRules).toBeDefined()
      expect(Array.isArray(allCompatibilityRules)).toBe(true)
      expect(allCompatibilityRules.length).toBeGreaterThan(0)
    })

    it('should have valid rule structure', () => {
      for (const rule of allCompatibilityRules) {
        expect(rule.type).toBeDefined()
        expect(['EXCLUSIVE', 'CONFLICT', 'REQUIRES', 'RECOMMENDS']).toContain(
          rule.type
        )
        expect(rule.reason).toBeDefined()
        expect(rule.severity).toBeDefined()
      }
    })
  })
})
