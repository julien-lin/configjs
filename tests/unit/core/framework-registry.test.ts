/**
 * Unit Tests: Framework Registry
 * Tests pour le registre centralisé des frameworks
 *
 * @group unit
 */

import { describe, it, expect } from 'vitest'
import {
  frameworkRegistry,
  getFrameworkMetadata,
  getAllSupportedFrameworks,
  isFrameworkSupported,
} from '../../../src/core/framework-registry.js'
import type { Framework } from '../../../src/types/index.js'

describe('Framework Registry', () => {
  describe('frameworkRegistry', () => {
    it('should contain all supported frameworks', () => {
      const frameworks: Framework[] = ['react', 'nextjs', 'vue', 'svelte']

      for (const framework of frameworks) {
        expect(frameworkRegistry).toHaveProperty(framework)
      }
    })

    it('should have valid metadata for each framework', () => {
      for (const [framework, metadata] of Object.entries(frameworkRegistry)) {
        expect(metadata.id).toBe(framework)
        expect(metadata.displayName).toBeDefined()
        expect(metadata.displayName).not.toBe('')
        expect(metadata.createCommand).toBeDefined()
        expect(metadata.detectPackages).toBeInstanceOf(Array)
        expect(metadata.detectPackages.length).toBeGreaterThan(0)
        expect(metadata.defaultBundler).toBeDefined()
      }
    })

    it('should have correct detect packages for React', () => {
      expect(frameworkRegistry.react.detectPackages).toEqual([
        'react',
        'react-dom',
      ])
    })

    it('should have correct detect packages for Next.js', () => {
      expect(frameworkRegistry.nextjs.detectPackages).toEqual(['next'])
    })

    it('should have correct detect packages for Vue', () => {
      expect(frameworkRegistry.vue.detectPackages).toEqual(['vue'])
    })

    it('should have correct detect packages for Svelte', () => {
      expect(frameworkRegistry.svelte.detectPackages).toEqual([
        'svelte',
        '@sveltejs/kit',
      ])
    })

    it('should have correct default bundler for each framework', () => {
      expect(frameworkRegistry.react.defaultBundler).toBe('vite')
      expect(frameworkRegistry.nextjs.defaultBundler).toBe('nextjs')
      expect(frameworkRegistry.vue.defaultBundler).toBe('vite')
      expect(frameworkRegistry.svelte.defaultBundler).toBe('vite')
    })
  })

  describe('getFrameworkMetadata', () => {
    it('should return metadata for valid framework', () => {
      const metadata = getFrameworkMetadata('react')
      expect(metadata).toBeDefined()
      expect(metadata!.id).toBe('react')
      expect(metadata!.displayName).toBe('React')
    })

    it('should return undefined for invalid framework', () => {
      // @ts-expect-error - testing invalid framework
      const metadata = getFrameworkMetadata('invalid-framework')
      expect(metadata).toBeUndefined()
    })

    it('should return correct metadata for all frameworks', () => {
      const frameworks: Framework[] = ['react', 'nextjs', 'vue', 'svelte']

      for (const framework of frameworks) {
        const metadata = getFrameworkMetadata(framework)
        expect(metadata!.id).toBe(framework)
        expect(metadata!.displayName).toBeDefined()
      }
    })
  })

  describe('getAllSupportedFrameworks', () => {
    it('should return all frameworks', () => {
      const frameworks = getAllSupportedFrameworks()
      expect(frameworks).toHaveLength(5)
      expect(frameworks).toContain('react')
      expect(frameworks).toContain('nextjs')
      expect(frameworks).toContain('vue')
      expect(frameworks).toContain('svelte')
      expect(frameworks).toContain('angular')
    })

    it('should return array of Framework type', () => {
      const frameworks = getAllSupportedFrameworks()
      for (const framework of frameworks) {
        expect(typeof framework).toBe('string')
        expect(frameworkRegistry).toHaveProperty(framework)
      }
    })
  })

  describe('isFrameworkSupported', () => {
    it('should return true for supported frameworks', () => {
      expect(isFrameworkSupported('react')).toBe(true)
      expect(isFrameworkSupported('nextjs')).toBe(true)
      expect(isFrameworkSupported('vue')).toBe(true)
      expect(isFrameworkSupported('svelte')).toBe(true)
      expect(isFrameworkSupported('angular')).toBe(true)
    })

    it('should return false for unsupported frameworks', () => {
      expect(isFrameworkSupported('preact')).toBe(false)
      expect(isFrameworkSupported('solid')).toBe(false)
      expect(isFrameworkSupported('invalid')).toBe(false)
      expect(isFrameworkSupported('')).toBe(false)
    })
  })

  describe('Framework metadata consistency', () => {
    it('should have unique display names', () => {
      const displayNames = Object.values(frameworkRegistry).map(
        (m) => m.displayName
      )
      const uniqueNames = new Set(displayNames)
      expect(uniqueNames.size).toBe(displayNames.length)
    })

    it('should have valid create commands', () => {
      for (const metadata of Object.values(frameworkRegistry)) {
        expect(metadata.createCommand).toMatch(/^(npm|npx|pnpm|yarn)\s/)
      }
    })

    it('should have non-empty detect packages', () => {
      for (const metadata of Object.values(frameworkRegistry)) {
        expect(metadata.detectPackages.length).toBeGreaterThan(0)
        for (const pkg of metadata.detectPackages) {
          expect(pkg).toBeDefined()
          expect(pkg.length).toBeGreaterThan(0)
        }
      }
    })

    it('should have valid bundler references', () => {
      const validBundlers = ['vite', 'webpack', 'nextjs', 'rspack', 'cra']
      for (const metadata of Object.values(frameworkRegistry)) {
        expect(validBundlers).toContain(metadata.defaultBundler)
      }
    })
  })
})
