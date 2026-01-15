/**
 * Unit Tests: Framework Installer Factory
 * Tests pour la factory d'installateurs de framework
 *
 * @group unit
 */

import { describe, it, expect } from 'vitest'
import { FrameworkInstallerFactory } from '../../../../src/cli/utils/installer-factory.js'
import type { Framework } from '../../../../src/types/index.js'

describe('FrameworkInstallerFactory', () => {
  describe('create', () => {
    it('should create installer for React', () => {
      const installer = FrameworkInstallerFactory.create('react')
      expect(installer).toBeDefined()
      expect(typeof installer.createProject).toBe('function')
    })

    it('should create installer for Next.js', () => {
      const installer = FrameworkInstallerFactory.create('nextjs')
      expect(installer).toBeDefined()
      expect(typeof installer.createProject).toBe('function')
    })

    it('should create installer for Vue', () => {
      const installer = FrameworkInstallerFactory.create('vue')
      expect(installer).toBeDefined()
      expect(typeof installer.createProject).toBe('function')
    })

    it('should create installer for Svelte', () => {
      const installer = FrameworkInstallerFactory.create('svelte')
      expect(installer).toBeDefined()
      expect(typeof installer.createProject).toBe('function')
    })

    it('should throw error for unsupported framework', () => {
      expect(() => {
        FrameworkInstallerFactory.create('preact' as any)
      }).toThrow('Framework preact is not supported')
    })
  })

  describe('isInstallerAvailable', () => {
    it('should return true for supported frameworks', () => {
      const supportedFrameworks: Framework[] = [
        'react',
        'nextjs',
        'vue',
        'svelte',
        'angular',
      ]

      for (const framework of supportedFrameworks) {
        expect(FrameworkInstallerFactory.isInstallerAvailable(framework)).toBe(
          true
        )
      }
    })

    it('should return false for unsupported frameworks', () => {
      expect(
        FrameworkInstallerFactory.isInstallerAvailable('preact' as Framework)
      ).toBe(false)
      expect(
        FrameworkInstallerFactory.isInstallerAvailable('solid' as Framework)
      ).toBe(false)
      expect(
        FrameworkInstallerFactory.isInstallerAvailable('invalid' as Framework)
      ).toBe(false)
    })
  })

  describe('Installer interface compliance', () => {
    const frameworks: Framework[] = [
      'react',
      'nextjs',
      'vue',
      'svelte',
      'angular',
    ]

    it.each(frameworks)(
      '%s installer should have createProject method',
      (framework) => {
        const installer = FrameworkInstallerFactory.create(framework)
        expect(installer).toHaveProperty('createProject')
        expect(typeof installer.createProject).toBe('function')
      }
    )
  })
})
