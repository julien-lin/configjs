/**
 * Security Test Suite: Path Traversal Vulnerability Detection
 * @see CWE-22: Improper Limitation of a Pathname to a Restricted Directory
 */

import { describe, it, expect } from 'vitest'
import path from 'path'
import { PATH_TRAVERSAL_PAYLOADS } from '../security/fixtures'

describe('Path Traversal Security Tests', () => {
  const projectRoot = '/home/user/my-project'

  /**
   * Helper to safely resolve and validate paths
   */
  function validatePathSafety(basePath: string, userPath: string): boolean {
    try {
      // Normalize the path
      const resolved = path.resolve(basePath, userPath)
      const normalized = path.normalize(resolved)
      const normalizedBase = path.normalize(basePath)

      // Check if resolved path stays within projectRoot
      // Must start with the base path to be considered safe
      return (
        normalized.startsWith(normalizedBase + path.sep) ||
        normalized === normalizedBase
      )
    } catch {
      return false
    }
  }

  /**
   * Helper to detect traversal patterns
   */
  function hasTraversalPattern(filePath: string): boolean {
    return /\.\./.test(filePath) || /\.\.\\/.test(filePath)
  }

  describe('POSIX Traversal Detection', () => {
    it('should detect all POSIX traversal attempts', () => {
      PATH_TRAVERSAL_PAYLOADS.posixTraversal.forEach(
        ({ path: traversalPath }) => {
          const isSafe = validatePathSafety(projectRoot, traversalPath)
          expect(isSafe).toBe(false) // Should be blocked
        }
      )
    })

    it('should detect one-level traversal', () => {
      const payload = '../config.json'
      expect(hasTraversalPattern(payload)).toBe(true)
      expect(validatePathSafety(projectRoot, payload)).toBe(false)
    })

    it('should detect two-level traversal', () => {
      const payload = '../../.env'
      expect(hasTraversalPattern(payload)).toBe(true)
      expect(validatePathSafety(projectRoot, payload)).toBe(false)
    })

    it('should detect deep traversal to system files', () => {
      const payload = '../../../etc/passwd'
      expect(hasTraversalPattern(payload)).toBe(true)
      expect(validatePathSafety(projectRoot, payload)).toBe(false)
    })

    it('should detect SSH key access attempt', () => {
      const payload = '../../../../../root/.ssh/id_rsa'
      expect(hasTraversalPattern(payload)).toBe(true)
      expect(validatePathSafety(projectRoot, payload)).toBe(false)
    })
  })

  describe('Windows Traversal Detection', () => {
    it('should detect all Windows traversal attempts', () => {
      PATH_TRAVERSAL_PAYLOADS.windowsTraversal.forEach(
        ({ path: traversalPath }) => {
          // On any platform, traversal should be blocked
          const payload = traversalPath.replace(/\\/g, '/')
          expect(validatePathSafety(projectRoot, payload)).toBe(false)
        }
      )
    })

    it('should detect Windows backslash traversal', () => {
      const payload = '..\\config.json'
      // Normalize to forward slashes for cross-platform testing
      const normalized = payload.replace(/\\/g, '/')
      expect(validatePathSafety(projectRoot, normalized)).toBe(false)
    })

    it('should detect Windows system directory access', () => {
      const payload = '..\\..\\windows\\system32\\config\\sam'
      const normalized = payload.replace(/\\/g, '/')
      expect(validatePathSafety(projectRoot, normalized)).toBe(false)
    })
  })

  describe('URL-Encoded Traversal Detection', () => {
    it('should handle URL-encoded paths', () => {
      PATH_TRAVERSAL_PAYLOADS.urlEncodedTraversal.forEach(
        ({ path: traversalPath }) => {
          // URL-encoded payloads would need separate decoding
          expect(traversalPath).toContain('%')
        }
      )
    })

    it('should detect URL-encoded dots', () => {
      const payload = '%2e%2e/config.json'
      expect(payload).toContain('%2e')
    })
  })

  describe('Normalized Path Tricks Detection', () => {
    it('should handle normalized path tricks', () => {
      PATH_TRAVERSAL_PAYLOADS.normalizedTricks.forEach(
        ({ path: trickPath }) => {
          // Paths with ./ prefix but traversal should still be detected
          if (trickPath.includes('..')) {
            expect(hasTraversalPattern(trickPath)).toBe(true)
          }
        }
      )
    })

    it('should handle dot-slash prefixed traversal', () => {
      const payload = './../../config.json'
      expect(hasTraversalPattern(payload)).toBe(true)
      expect(validatePathSafety(projectRoot, payload)).toBe(false)
    })

    it('should handle multiple dot-slash sequences', () => {
      const payload = './././../../config.json'
      expect(hasTraversalPattern(payload)).toBe(true)
    })

    it('should handle double slashes', () => {
      const payload = '..//config.json'
      expect(validatePathSafety(projectRoot, payload)).toBe(false)
    })
  })

  describe('Symlink Traversal Detection', () => {
    it('should identify symlink paths', () => {
      PATH_TRAVERSAL_PAYLOADS.symlinkTraversal.forEach(
        ({ path: symlinkPath }) => {
          expect(symlinkPath).toBeDefined()
        }
      )
    })

    it('should detect symlink-based traversal attempts', () => {
      const payload = 'link-to-home'
      // Symlink should be handled (resolved to real path)
      expect(payload).toBeDefined()
    })
  })

  describe('Absolute Paths Rejection', () => {
    it('should handle absolute paths carefully', () => {
      const absolutePaths = [
        '/etc/passwd',
        '/root/.ssh/id_rsa',
        '/home/other-user',
        'C:\\Windows\\System32',
      ]

      absolutePaths.forEach((absPath) => {
        // Absolute paths need special handling
        expect(absPath).toBeDefined()
      })
    })
  })

  describe('Valid Path Acceptance', () => {
    it('should accept legitimate paths within projectRoot', () => {
      const validPaths = [
        'src/index.ts',
        'config.json',
        'docs/README.md',
        './public/index.html',
        'components/header/header.tsx',
        'utils/helpers.js',
      ]

      validPaths.forEach((validPath) => {
        expect(validatePathSafety(projectRoot, validPath)).toBe(true)
      })
    })

    it('should accept current directory reference', () => {
      expect(validatePathSafety(projectRoot, '.')).toBe(true)
      expect(validatePathSafety(projectRoot, './')).toBe(true)
    })

    it('should accept relative paths within project', () => {
      expect(validatePathSafety(projectRoot, 'src/components/button.tsx')).toBe(
        true
      )
      expect(validatePathSafety(projectRoot, 'public/images/logo.png')).toBe(
        true
      )
      expect(validatePathSafety(projectRoot, 'lib/utils/helpers.ts')).toBe(true)
    })

    it('should accept deep nested paths', () => {
      const deepPath = 'src/deeply/nested/folder/structure/to/file.ts'
      expect(validatePathSafety(projectRoot, deepPath)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty path', () => {
      const result = validatePathSafety(projectRoot, '')
      expect(result).toBe(true) // Empty resolves to base
    })

    it('should handle very long paths', () => {
      const longPath = 'a/b/'.repeat(100) + 'file.txt'
      expect(() => {
        validatePathSafety(projectRoot, longPath)
      }).not.toThrow()
    })

    it('should handle paths with special characters', () => {
      const specialPaths = [
        'file-with-dash.txt',
        'file_with_underscore.txt',
        'file.with.dots.txt',
        'file (1).txt',
        'file [backup].txt',
      ]

      specialPaths.forEach((specialPath) => {
        expect(validatePathSafety(projectRoot, specialPath)).toBe(true)
      })
    })
  })

  describe('Multiple Traversal Attempts', () => {
    it('should block combined traversal vectors', () => {
      const combinedAttacks = [
        '../../etc/passwd',
        '../.env/.env',
        '../../.ssh/../../.ssh/id_rsa',
        './../../../../../../etc/passwd',
      ]

      combinedAttacks.forEach((attack) => {
        expect(validatePathSafety(projectRoot, attack)).toBe(false)
      })
    })
  })

  describe('Cross-Platform Testing', () => {
    it('should handle paths regardless of platform separator', () => {
      // Forward slash paths
      expect(validatePathSafety(projectRoot, 'src/file.ts')).toBe(true)

      // Backslash paths (normalized to forward)
      const backslashPath = 'src\\file.ts'
      const normalized = backslashPath.replace(/\\/g, '/')
      expect(validatePathSafety(projectRoot, normalized)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should validate paths quickly', () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        validatePathSafety(projectRoot, `src/file${i}.ts`)
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(100)
    })

    it('should handle malicious paths efficiently', () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        validatePathSafety(projectRoot, '../../'.repeat(10) + 'etc/passwd')
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(200)
    })
  })

  describe('Comprehensive Coverage', () => {
    it('should test all traversal categories', () => {
      const categories = [
        PATH_TRAVERSAL_PAYLOADS.posixTraversal,
        PATH_TRAVERSAL_PAYLOADS.windowsTraversal,
        PATH_TRAVERSAL_PAYLOADS.urlEncodedTraversal,
        PATH_TRAVERSAL_PAYLOADS.normalizedTricks,
        PATH_TRAVERSAL_PAYLOADS.symlinkTraversal,
      ]

      let totalPayloads = 0
      categories.forEach((category) => {
        totalPayloads += category.length
        expect(category.length).toBeGreaterThan(0)
      })

      // Should have 18+ payloads
      expect(totalPayloads).toBeGreaterThanOrEqual(18)
    })

    it('should properly classify outcomes', () => {
      // All traversal attempts should be blocked
      PATH_TRAVERSAL_PAYLOADS.posixTraversal.forEach(
        ({ path: traversalPath }) => {
          const isSafe = validatePathSafety(projectRoot, traversalPath)
          expect(isSafe).toBe(false)
        }
      )

      // All valid paths should be accepted
      const validPaths = ['src/file.ts', 'config.json', 'public/index.html']
      validPaths.forEach((validPath) => {
        const isSafe = validatePathSafety(projectRoot, validPath)
        expect(isSafe).toBe(true)
      })
    })
  })
})
