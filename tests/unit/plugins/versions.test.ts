import { describe, it, expect } from 'vitest'
import {
  PLUGIN_VERSIONS,
  getVersion,
  getRequiredVersion,
  getAllVersions,
  setVersion,
  hasVersion,
} from '../../../src/plugins/versions.js'

describe('Plugin Versions Registry', () => {
  describe('PLUGIN_VERSIONS constant', () => {
    it('should contain state management versions', () => {
      expect(PLUGIN_VERSIONS.zustand).toBeDefined()
      expect(PLUGIN_VERSIONS.jotai).toBeDefined()
      expect(PLUGIN_VERSIONS['@reduxjs/toolkit']).toBeDefined()
      expect(PLUGIN_VERSIONS.pinia).toBeDefined()
    })

    it('should contain routing versions', () => {
      expect(PLUGIN_VERSIONS['react-router-dom']).toBeDefined()
      expect(PLUGIN_VERSIONS['@tanstack/react-router']).toBeDefined()
      expect(PLUGIN_VERSIONS['vue-router']).toBeDefined()
    })

    it('should contain HTTP versions', () => {
      expect(PLUGIN_VERSIONS.axios).toBeDefined()
      expect(PLUGIN_VERSIONS['@tanstack/react-query']).toBeDefined()
      expect(PLUGIN_VERSIONS['@tanstack/vue-query']).toBeDefined()
    })

    it('should contain CSS versions', () => {
      expect(PLUGIN_VERSIONS.tailwindcss).toBeDefined()
      expect(PLUGIN_VERSIONS['styled-components']).toBeDefined()
      expect(PLUGIN_VERSIONS['@emotion/react']).toBeDefined()
      expect(PLUGIN_VERSIONS['react-bootstrap']).toBeDefined()
    })

    it('should contain form versions', () => {
      expect(PLUGIN_VERSIONS['react-hook-form']).toBeDefined()
      expect(PLUGIN_VERSIONS.zod).toBeDefined()
    })

    it('should contain UI versions', () => {
      expect(PLUGIN_VERSIONS['shadcn-ui']).toBeDefined()
      expect(PLUGIN_VERSIONS['@radix-ui/react-dialog']).toBeDefined()
      expect(PLUGIN_VERSIONS['react-icons']).toBeDefined()
      expect(PLUGIN_VERSIONS['react-hot-toast']).toBeDefined()
    })

    it('should contain animation versions', () => {
      expect(PLUGIN_VERSIONS['framer-motion']).toBeDefined()
    })

    it('should contain testing versions', () => {
      expect(PLUGIN_VERSIONS.vitest).toBeDefined()
      expect(PLUGIN_VERSIONS['@testing-library/react']).toBeDefined()
      expect(PLUGIN_VERSIONS.playwright).toBeDefined()
    })

    it('should contain tooling versions', () => {
      expect(PLUGIN_VERSIONS.eslint).toBeDefined()
      expect(PLUGIN_VERSIONS.prettier).toBeDefined()
      expect(PLUGIN_VERSIONS.husky).toBeDefined()
    })

    it('should contain utility versions', () => {
      expect(PLUGIN_VERSIONS['date-fns']).toBeDefined()
      expect(PLUGIN_VERSIONS['@vueuse/core']).toBeDefined()
    })

    it('should contain TypeScript type versions', () => {
      expect(PLUGIN_VERSIONS['@types/node']).toBeDefined()
      expect(PLUGIN_VERSIONS['@types/react']).toBeDefined()
      expect(PLUGIN_VERSIONS['@types/react-router-dom']).toBeDefined()
    })
  })

  describe('getVersion', () => {
    it('should return version for existing plugin', () => {
      const version = getVersion('zustand')
      expect(version).toBeDefined()
      expect(typeof version).toBe('string')
      expect(version).toMatch(/^\^/)
    })

    it('should return undefined for non-existing plugin', () => {
      const version = getVersion('non-existing-plugin')
      expect(version).toBeUndefined()
    })

    it('should return correct versions for common plugins', () => {
      expect(getVersion('zustand')).toBe('^5.0.9')
      expect(getVersion('axios')).toBe('^1.6.5')
      expect(getVersion('tailwindcss')).toBe('^3.4.1')
    })
  })

  describe('getRequiredVersion', () => {
    it('should return version for existing plugin', () => {
      const version = getRequiredVersion('zustand')
      expect(version).toBe('^5.0.9')
    })

    it('should throw for non-existing plugin', () => {
      expect(() => {
        getRequiredVersion('non-existing-plugin')
      }).toThrow('Version not found for plugin: non-existing-plugin')
    })
  })

  describe('getAllVersions', () => {
    it('should return all versions as object', () => {
      const versions = getAllVersions()

      expect(typeof versions).toBe('object')
      expect(Object.keys(versions).length).toBeGreaterThan(0)
    })

    it('should include all major plugins', () => {
      const versions = getAllVersions()

      expect('zustand' in versions).toBe(true)
      expect('axios' in versions).toBe(true)
      expect('tailwindcss' in versions).toBe(true)
      expect('eslint' in versions).toBe(true)
    })
  })

  describe('setVersion', () => {
    it('should update version for existing plugin', () => {
      const originalVersion = getVersion('zustand')
      setVersion('zustand', '^6.0.0')

      expect(getVersion('zustand')).toBe('^6.0.0')

      // Restore
      setVersion('zustand', originalVersion!)
    })

    it('should add new plugin version', () => {
      setVersion('new-plugin', '^1.0.0')
      expect(getVersion('new-plugin')).toBe('^1.0.0')

      // Cleanup
      delete PLUGIN_VERSIONS['new-plugin' as keyof typeof PLUGIN_VERSIONS]
    })
  })

  describe('hasVersion', () => {
    it('should return true for existing plugins', () => {
      expect(hasVersion('zustand')).toBe(true)
      expect(hasVersion('axios')).toBe(true)
      expect(hasVersion('tailwindcss')).toBe(true)
    })

    it('should return false for non-existing plugins', () => {
      expect(hasVersion('non-existing-plugin')).toBe(false)
      expect(hasVersion('fake-plugin')).toBe(false)
    })
  })

  describe('Version format', () => {
    it('all versions should follow semantic versioning format', () => {
      const versions = getAllVersions()
      const semverRegex = /^[\^~=v]?\d+\.\d+\.\d+/

      for (const [name, version] of Object.entries(versions)) {
        expect(
          semverRegex.test(version),
          `Plugin ${name} has invalid version format: ${version}`
        ).toBe(true)
      }
    })

    it('most versions should use caret notation', () => {
      const versions = getAllVersions()
      const caretVersions = Object.values(versions).filter((v) =>
        v.startsWith('^')
      )

      expect(caretVersions.length).toBeGreaterThan(
        Object.keys(versions).length * 0.8
      )
    })
  })

  describe('Plugin coverage', () => {
    it('should have at least 50 plugins', () => {
      const versions = getAllVersions()
      expect(Object.keys(versions).length).toBeGreaterThanOrEqual(50)
    })

    it('should cover major categories', () => {
      const versions = getAllVersions()

      // State Management
      expect('zustand' in versions).toBe(true)

      // Routing
      expect('react-router-dom' in versions).toBe(true)

      // HTTP
      expect('axios' in versions).toBe(true)

      // CSS
      expect('tailwindcss' in versions).toBe(true)

      // Testing
      expect('vitest' in versions).toBe(true)

      // Tooling
      expect('eslint' in versions).toBe(true)
    })
  })

  describe('TypeScript types', () => {
    it('should include type definitions', () => {
      expect(hasVersion('@types/node')).toBe(true)
      expect(hasVersion('@types/react')).toBe(true)
      expect(hasVersion('@types/react-dom')).toBe(true)
    })

    it('should have types for scoped packages', () => {
      expect(hasVersion('@types/react-router-dom')).toBe(true)
    })
  })
})
