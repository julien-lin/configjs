import { describe, it, expect, beforeEach } from 'vitest'
import type { ProjectContext, Plugin } from '../../../src/types/index.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../../src/core/validator.js'
import { Category } from '../../../src/types/index.js'

describe('CompatibilityValidator - Next.js Rules', () => {
  let validator: CompatibilityValidator
  let nextjsContext: ProjectContext

  beforeEach(() => {
    validator = new CompatibilityValidator(compatibilityRules)
    nextjsContext = {
      framework: 'nextjs',
      frameworkVersion: '14.0.0',
      bundler: 'nextjs',
      bundlerVersion: '14.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/project',
      srcDir: 'src',
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: 'v20.0.0',
      dependencies: {
        next: '^14.0.0',
      },
      devDependencies: {},
      hasGit: false,
    }
  })

  describe('React Router with Next.js', () => {
    it('should return error when React Router is selected with Next.js', () => {
      const reactRouterPlugin: Plugin = {
        name: 'react-router-dom',
        displayName: 'React Router',
        description: 'Routing library',
        category: Category.ROUTING,
        frameworks: ['react', 'nextjs'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const result = validator.validate([reactRouterPlugin], nextjsContext)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      const error = result.errors.find((e) =>
        e.plugins?.includes('react-router-dom')
      )
      expect(error).toBeDefined()
      expect(error?.message).toContain('React Router')
      expect(error?.message).toContain('Next.js')
    })

    it('should not return error when React Router is selected with React', () => {
      const reactRouterPlugin: Plugin = {
        name: 'react-router-dom',
        displayName: 'React Router',
        description: 'Routing library',
        category: Category.ROUTING,
        frameworks: ['react'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const reactContext: ProjectContext = {
        ...nextjsContext,
        framework: 'react',
        frameworkVersion: '18.2.0',
        bundler: 'vite',
        bundlerVersion: '5.0.0',
      }

      const result = validator.validate([reactRouterPlugin], reactContext)

      // React Router est compatible avec React, pas d'erreur
      const nextjsError = result.errors.find((e) =>
        e.message.includes('Next.js')
      )
      expect(nextjsError).toBeUndefined()
    })
  })

  describe('Framer Motion with Next.js', () => {
    it('should return warning when Framer Motion is selected with Next.js', () => {
      const framerMotionPlugin: Plugin = {
        name: 'framer-motion',
        displayName: 'Framer Motion',
        description: 'Animation library',
        category: Category.ANIMATION,
        frameworks: ['react', 'nextjs'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const result = validator.validate([framerMotionPlugin], nextjsContext)

      expect(result.valid).toBe(true) // Warning, pas d'erreur
      expect(result.warnings.length).toBeGreaterThan(0)
      const warning = result.warnings.find((w) =>
        w.plugins?.includes('framer-motion')
      )
      expect(warning).toBeDefined()
      expect(warning?.message).toContain('Framer Motion')
      expect(warning?.message).toContain('SSR')
    })
  })

  describe('Shadcn/ui recommendation with Next.js', () => {
    it('should suggest shadcn-ui-nextjs when shadcn-ui is selected with Next.js', () => {
      const shadcnUiPlugin: Plugin = {
        name: 'shadcn-ui',
        displayName: 'Shadcn/ui',
        description: 'UI components',
        category: Category.UI,
        frameworks: ['react', 'nextjs'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const result = validator.validate([shadcnUiPlugin], nextjsContext)

      expect(result.suggestions.length).toBeGreaterThan(0)
      const suggestion = result.suggestions.find((s) =>
        s.includes('shadcn-ui-nextjs')
      )
      expect(suggestion).toBeDefined()
      expect(suggestion).toContain('Next.js')
      expect(suggestion).toContain('React Server Components')
    })
  })

  describe('Multiple Next.js conflicts', () => {
    it('should detect both React Router error and Framer Motion warning', () => {
      const reactRouterPlugin: Plugin = {
        name: 'react-router-dom',
        displayName: 'React Router',
        description: 'Routing library',
        category: Category.ROUTING,
        frameworks: ['react', 'nextjs'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const framerMotionPlugin: Plugin = {
        name: 'framer-motion',
        displayName: 'Framer Motion',
        description: 'Animation library',
        category: Category.ANIMATION,
        frameworks: ['react', 'nextjs'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const result = validator.validate(
        [reactRouterPlugin, framerMotionPlugin],
        nextjsContext
      )

      expect(result.valid).toBe(false) // React Router est une erreur
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.warnings.length).toBeGreaterThan(0)

      const routerError = result.errors.find((e) =>
        e.plugins?.includes('react-router-dom')
      )
      expect(routerError).toBeDefined()

      const framerWarning = result.warnings.find((w) =>
        w.plugins?.includes('framer-motion')
      )
      expect(framerWarning).toBeDefined()
    })
  })

  describe('Next.js compatible plugins', () => {
    it('should not return errors for compatible Next.js plugins', () => {
      const tailwindPlugin: Plugin = {
        name: 'tailwindcss-nextjs',
        displayName: 'TailwindCSS (Next.js)',
        description: 'CSS framework',
        category: Category.CSS,
        frameworks: ['nextjs'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const zustandPlugin: Plugin = {
        name: 'zustand',
        displayName: 'Zustand',
        description: 'State management',
        category: Category.STATE,
        frameworks: ['react', 'nextjs'],
        install: async () => ({ packages: {}, success: true }),
        configure: async () => ({ files: [], success: true }),
      }

      const result = validator.validate(
        [tailwindPlugin, zustandPlugin],
        nextjsContext
      )

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
      // Pas d'erreurs spécifiques Next.js
      const nextjsErrors = result.errors.filter((e) =>
        e.message.includes('Next.js')
      )
      expect(nextjsErrors.length).toBe(0)
    })
  })
})
