import { describe, it, expect } from 'vitest'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../../src/core/validator.js'
import type { Plugin, CompatibilityRule } from '../../../src/types/index.js'
import { Category } from '../../../src/types/index.js'

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
      const validator = new CompatibilityValidator(compatibilityRules)
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
      const validator = new CompatibilityValidator(compatibilityRules)
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
      const validator = new CompatibilityValidator(compatibilityRules)
      const plugins = [
        createMockPlugin('tailwindcss'),
        createMockPlugin('bootstrap'),
      ]
      // Add required PostCSS deps so the test focuses on conflict (warning)
      plugins.push(createMockPlugin('postcss'))
      plugins.push(createMockPlugin('autoprefixer'))

      const result = validator.validate(plugins)

      expect(result.valid).toBe(true) // Conflit = warning, pas erreur
      expect(result.warnings.length).toBeGreaterThan(0)
      const conflictWarning = result.warnings.find((w) => w.type === 'CONFLICT')
      expect(conflictWarning).toBeDefined()
      expect(conflictWarning?.plugins).toContain('tailwindcss')
      expect(conflictWarning?.plugins).toContain('bootstrap')
    })

    it('should detect missing required dependencies (Tailwind without PostCSS)', () => {
      const validator = new CompatibilityValidator(compatibilityRules)
      const plugins = [createMockPlugin('tailwindcss')]

      const result = validator.validate(plugins)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      const requiresError = result.errors.find((e) => e.type === 'REQUIRES')
      expect(requiresError).toBeDefined()
      expect(requiresError?.plugin).toBe('tailwindcss')
      expect(requiresError?.required).toContain('postcss')
      expect(requiresError?.required).toContain('autoprefixer')
    })

    it('should not error when required dependencies are present', () => {
      const validator = new CompatibilityValidator(compatibilityRules)
      const plugins = [
        createMockPlugin('tailwindcss'),
        createMockPlugin('postcss'),
        createMockPlugin('autoprefixer'),
      ]

      const result = validator.validate(plugins)

      const requiresErrors = result.errors.filter((e) => e.type === 'REQUIRES')
      expect(requiresErrors).toHaveLength(0)
    })

    it('should provide recommendations', () => {
      const validator = new CompatibilityValidator(compatibilityRules)
      const plugins = [createMockPlugin('react-router-dom')]

      const result = validator.validate(plugins)

      expect(result.suggestions.length).toBeGreaterThan(0)
      const recommendation = result.suggestions.find((s) =>
        s.includes('react-router-dom')
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
      const validator = new CompatibilityValidator(compatibilityRules)
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
      const validator = new CompatibilityValidator(compatibilityRules)
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
      const validator = new CompatibilityValidator(compatibilityRules)
      const plugins = [
        createMockPlugin('@reduxjs/toolkit'),
        createMockPlugin('tailwindcss'),
        createMockPlugin('bootstrap'),
        createMockPlugin('react-router-dom'),
      ]

      const result = validator.validate(plugins)

      // Devrait avoir :
      // - 1 erreur : Tailwind sans PostCSS/Autoprefixer
      // - 1 warning : Conflit Tailwind + Bootstrap
      // - 1 suggestion : Types pour react-router-dom
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('compatibilityRules', () => {
    it('should export default compatibility rules', () => {
      expect(compatibilityRules).toBeDefined()
      expect(Array.isArray(compatibilityRules)).toBe(true)
      expect(compatibilityRules.length).toBeGreaterThan(0)
    })

    it('should have valid rule structure', () => {
      for (const rule of compatibilityRules) {
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
