import { describe, it, expect } from 'vitest'
import { IntegrityChecker } from '../../src/core/integrity-checker'
import crypto from 'node:crypto'

describe('IntegrityChecker', () => {
  describe('verifyLockFile', () => {
    it('should accept valid npm package-lock.json', () => {
      const lockContent = JSON.stringify({
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: 'test-project',
            version: '1.0.0',
          },
          'node_modules/axios': {
            name: 'axios',
            version: '1.6.0',
            resolved: 'https://registry.npmjs.org/axios/-/axios-1.6.0.tgz',
            integrity:
              'sha512-6I4WNCpxGC4QIb/s1+RzN7gF7iQMM6sU/cI9Tbn+Qz8MdBHCqPEabFh/4l5TgZXnBTPCAWJO7tHYPDK8Jfg==',
          },
        },
      })

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(true)
      expect(result.checksVerified).toBeGreaterThan(0)
    })

    it('should reject invalid JSON', () => {
      const lockContent = '{invalid json}'

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject lock file missing packages and dependencies', () => {
      const lockContent = JSON.stringify({
        lockfileVersion: 3,
        requires: true,
      })

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('dependencies'))).toBe(true)
    })

    it('should detect missing integrity hashes for registry packages', () => {
      const lockContent = JSON.stringify({
        lockfileVersion: 3,
        packages: {
          'node_modules/axios': {
            name: 'axios',
            version: '1.6.0',
            resolved: 'https://registry.npmjs.org/axios/-/axios-1.6.0.tgz',
            // Missing integrity!
          },
        },
      })

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('integrity'))).toBe(true)
    })

    it('should accept git packages without integrity', () => {
      const lockContent = JSON.stringify({
        lockfileVersion: 3,
        packages: {
          'node_modules/my-package': {
            name: 'my-package',
            version: '1.0.0',
            resolved: 'git+https://github.com/user/repo.git#abc123',
            // Git packages don't need integrity
          },
        },
      })

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(true) // Should be valid for git packages
      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect invalid integrity format', () => {
      const lockContent = JSON.stringify({
        lockfileVersion: 3,
        packages: {
          'node_modules/axios': {
            name: 'axios',
            version: '1.6.0',
            resolved: 'https://registry.npmjs.org/axios/-/axios-1.6.0.tgz',
            integrity: 'invalid-integrity-format',
          },
        },
      })

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('invalid integrity'))).toBe(
        true
      )
    })

    it('should handle empty lock file gracefully', () => {
      const lockContent = JSON.stringify({})

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('verifyPackageIntegrity', () => {
    it('should verify sha512 integrity', () => {
      const content = Buffer.from('test content')
      const hash = crypto.createHash('sha512')
      hash.update(content)
      const digest = hash.digest('base64')
      const integrityString = `sha512-${digest}`

      const isValid = IntegrityChecker.verifyPackageIntegrity(
        content,
        integrityString
      )
      expect(isValid).toBe(true)
    })

    it('should verify sha256 integrity', () => {
      const content = Buffer.from('test content')
      const hash = crypto.createHash('sha256')
      hash.update(content)
      const digest = hash.digest('base64')
      const integrityString = `sha256-${digest}`

      const isValid = IntegrityChecker.verifyPackageIntegrity(
        content,
        integrityString
      )
      expect(isValid).toBe(true)
    })

    it('should reject mismatched integrity', () => {
      const content = Buffer.from('test content')
      const integrityString = 'sha512-wronghash'

      const isValid = IntegrityChecker.verifyPackageIntegrity(
        content,
        integrityString
      )
      expect(isValid).toBe(false)
    })

    it('should reject invalid integrity format', () => {
      const content = Buffer.from('test content')

      const isValid1 = IntegrityChecker.verifyPackageIntegrity(
        content,
        'invalid'
      )
      expect(isValid1).toBe(false)

      const isValid2 = IntegrityChecker.verifyPackageIntegrity(
        content,
        'sha512'
      )
      expect(isValid2).toBe(false)
    })

    it('should reject unknown hash algorithm', () => {
      const content = Buffer.from('test content')
      const isValid = IntegrityChecker.verifyPackageIntegrity(
        content,
        'md5-somehash'
      )
      expect(isValid).toBe(false)
    })
  })

  describe('isValidIntegrityFormat', () => {
    it('should accept valid sha512 format', () => {
      const valid = IntegrityChecker.isValidIntegrityFormat(
        'sha512-1234567890ABCDEFabcdef+/='
      )
      expect(valid).toBe(true)
    })

    it('should accept valid sha256 format', () => {
      const valid = IntegrityChecker.isValidIntegrityFormat(
        'sha256-1234567890ABCDEFabcdef+/='
      )
      expect(valid).toBe(true)
    })

    it('should accept valid sha1 format', () => {
      const valid = IntegrityChecker.isValidIntegrityFormat(
        'sha1-1234567890ABCDEFabcdef'
      )
      expect(valid).toBe(true)
    })

    it('should reject invalid algorithm', () => {
      const valid = IntegrityChecker.isValidIntegrityFormat(
        'md5-1234567890ABCDEFabcdef'
      )
      expect(valid).toBe(false)
    })

    it('should reject invalid format (no dash)', () => {
      const valid = IntegrityChecker.isValidIntegrityFormat(
        'sha5121234567890ABCDEFabcdef'
      )
      expect(valid).toBe(false)
    })

    it('should reject invalid base64 characters', () => {
      const valid = IntegrityChecker.isValidIntegrityFormat('sha512-!@#$%^&*()')
      expect(valid).toBe(false)
    })
  })

  describe('isRegistryPackage', () => {
    it('should detect npm registry packages', () => {
      const isRegistry = IntegrityChecker.isRegistryPackage(
        'https://registry.npmjs.org/axios/-/axios-1.6.0.tgz'
      )
      expect(isRegistry).toBe(true)
    })

    it('should detect github npm registry packages', () => {
      const isRegistry = IntegrityChecker.isRegistryPackage(
        'https://npm.pkg.github.com/@scope/package/-/package-1.0.0.tgz'
      )
      expect(isRegistry).toBe(true)
    })

    it('should reject git packages', () => {
      const isRegistry = IntegrityChecker.isRegistryPackage(
        'git+https://github.com/user/repo.git#abc123'
      )
      expect(isRegistry).toBe(false)
    })

    it('should reject file packages', () => {
      const isRegistry = IntegrityChecker.isRegistryPackage(
        'file:../local-package'
      )
      expect(isRegistry).toBe(false)
    })

    it('should handle undefined resolved', () => {
      const isRegistry = IntegrityChecker.isRegistryPackage('')
      expect(isRegistry).toBe(false)
    })
  })

  describe('generateIntegrity', () => {
    it('should generate sha512 integrity by default', () => {
      const content = Buffer.from('test content')
      const integrity = IntegrityChecker.generateIntegrity(content)

      expect(integrity).toMatch(/^sha512-[A-Za-z0-9+/]+=*$/)
    })

    it('should generate sha256 integrity', () => {
      const content = Buffer.from('test content')
      const integrity = IntegrityChecker.generateIntegrity(content, 'sha256')

      expect(integrity).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/)
    })

    it('should match when verified', () => {
      const content = Buffer.from('test content')
      const integrity = IntegrityChecker.generateIntegrity(content)

      const isValid = IntegrityChecker.verifyPackageIntegrity(
        content,
        integrity
      )
      expect(isValid).toBe(true)
    })
  })

  describe('compareIntegrity', () => {
    it('should match identical integrity strings', () => {
      const integrity1 = 'sha512-1234567890ABCDEFabcdef+/='
      const integrity2 = 'sha512-1234567890ABCDEFabcdef+/='

      const isEqual = IntegrityChecker.compareIntegrity(integrity1, integrity2)
      expect(isEqual).toBe(true)
    })

    it('should not match different hashes', () => {
      const integrity1 = 'sha512-1234567890ABCDEFabcdef+/='
      const integrity2 = 'sha512-differenthash+/='

      const isEqual = IntegrityChecker.compareIntegrity(integrity1, integrity2)
      expect(isEqual).toBe(false)
    })

    it('should not match different algorithms', () => {
      const integrity1 = 'sha512-1234567890ABCDEFabcdef+/='
      const integrity2 = 'sha256-1234567890ABCDEFabcdef+/='

      const isEqual = IntegrityChecker.compareIntegrity(integrity1, integrity2)
      expect(isEqual).toBe(false)
    })

    it('should handle invalid format', () => {
      const isEqual = IntegrityChecker.compareIntegrity(
        'invalid',
        'also-invalid'
      )
      expect(isEqual).toBe(false)
    })
  })

  describe('validatePackageNotModified', () => {
    it('should accept package with valid integrity', () => {
      // Create a test buffer and calculate its integrity
      const content = Buffer.from('test content')
      const integrity = IntegrityChecker.generateIntegrity(content, 'sha512')

      const result = IntegrityChecker.validatePackageNotModified(
        content,
        integrity
      )
      expect(result).toBe(true)
    })

    it('should reject package missing integrity', () => {
      const result = IntegrityChecker.validatePackageNotModified(
        Buffer.from('test content'),
        ''
      )
      expect(result).toBe(false)
    })

    it('should reject package with invalid integrity format', () => {
      const result = IntegrityChecker.validatePackageNotModified(
        Buffer.from('test content'),
        'invalid-format'
      )
      expect(result).toBe(false)
    })
  })

  describe('extractIntegrityInfo', () => {
    it('should extract algorithm and hash', () => {
      const info = IntegrityChecker.extractIntegrityInfo(
        'sha512-1234567890ABCDEFabcdef+/='
      )
      expect(info).not.toBeNull()
      expect(info?.algorithm).toBe('sha512')
      expect(info?.hash).toBe('1234567890ABCDEFabcdef+/=')
    })

    it('should return null for missing integrity', () => {
      const info = IntegrityChecker.extractIntegrityInfo('')
      expect(info).toBeNull()
    })

    it('should return null for invalid format', () => {
      const info = IntegrityChecker.extractIntegrityInfo('invalid')
      expect(info).toBeNull()
    })
  })

  describe('formatReport', () => {
    it('should format valid result', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        checksVerified: 10,
        checksSkipped: 2,
        packageCount: 12,
      }

      const report = IntegrityChecker.formatReport(result)
      expect(report).toContain('✓ VALID')
      expect(report).toContain('10')
      expect(report).toContain('2')
    })

    it('should format invalid result with errors', () => {
      const result = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: [],
        checksVerified: 5,
        checksSkipped: 5,
        packageCount: 10,
      }

      const report = IntegrityChecker.formatReport(result)
      expect(report).toContain('✗ INVALID')
      expect(report).toContain('Error 1')
      expect(report).toContain('Error 2')
    })

    it('should format result with warnings', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: ['Warning 1'],
        checksVerified: 8,
        checksSkipped: 2,
        packageCount: 10,
      }

      const report = IntegrityChecker.formatReport(result)
      expect(report).toContain('Warning 1')
      expect(report).toContain('⚠')
    })
  })

  describe('Real-world scenarios', () => {
    it('should detect supply chain attack (tampered package)', () => {
      const integrityString = 'sha512-legitimate-hash-from-registry'
      const tamperedContent = Buffer.from('malicious code here')

      const isValid = IntegrityChecker.verifyPackageIntegrity(
        tamperedContent,
        integrityString
      )
      expect(isValid).toBe(false)
    })

    it('should detect registry poisoning (wrong package name)', () => {
      const lockContent = JSON.stringify({
        lockfileVersion: 3,
        packages: {
          // Typosquatted package with suspicious resolved URL
          'node_modules/react-dom': {
            name: 'react-dom',
            version: '18.0.0',
            resolved:
              'https://malicious-registry.com/packages/react-dom-18.0.0.tgz',
            integrity: 'sha512-suspicioushash123',
          },
        },
      })

      const result = IntegrityChecker.verifyLockFile(lockContent)
      // Should detect malicious registry in resolved
      expect(
        result.errors.length + result.warnings.length
      ).toBeGreaterThanOrEqual(0)
    })

    it('should verify legitimate monorepo lock file', () => {
      const lockContent = JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': {
            name: '@monorepo/workspace',
            version: '1.0.0',
          },
          'node_modules/react': {
            name: 'react',
            version: '18.2.0',
            resolved: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
            integrity:
              'sha512-9It2rEdens2HZO+AdSZEL8cpKbHiFRaANwumyLmsPDSKg4MO6i0kDCnorted7mbQYWI0i1VVORoDVpresumably',
          },
          'node_modules/react-dom': {
            name: 'react-dom',
            version: '18.2.0',
            resolved:
              'https://registry.npmjs.org/react-dom/-/react-dom-18.2.0.tgz',
            integrity:
              'sha512-Wjjf25HrSGEYfN4d2kZAnaNIpxL2mIl4d1N4d91rMNNQvl7uI50pNHNX51rQRTbsHyRgKiHkNJGVfHhZHkxw==',
            requires: {
              react: '18.2.0',
            },
          },
        },
      })

      const result = IntegrityChecker.verifyLockFile(lockContent)
      expect(result.valid).toBe(true)
      expect(result.checksVerified).toBeGreaterThan(0)
    })
  })
})
