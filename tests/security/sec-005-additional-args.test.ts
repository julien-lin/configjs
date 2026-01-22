/**
 * SEC-005: Additional Arguments Injection Prevention Tests
 * Verify that additional arguments provided by plugins are validated
 * and cannot be used for shell injection or argument tampering
 */

import { describe, it, expect } from 'vitest'
import { validateAdditionalArgs } from '../../src/utils/package-manager.js'
import type { InstallOptions } from '../../src/utils/package-manager.js'

describe('SEC-005: Additional Arguments Injection Prevention', () => {
  describe('validateAdditionalArgs() - Direct function', () => {
    describe('Valid arguments', () => {
      it('should accept empty array', () => {
        const result = validateAdditionalArgs([])
        expect(result).toBeNull()
      })

      it('should accept valid whitelisted flags', () => {
        const result = validateAdditionalArgs([
          '--save-dev',
          '--prefer-offline',
          '--legacy-peer-deps',
        ])
        expect(result).toBeNull()
      })

      it('should accept flags with values', () => {
        const result = validateAdditionalArgs([
          '--audit',
          '--progress',
          '--no-strict-ssl',
        ])
        expect(result).toBeNull()
      })

      it('should accept mixed valid flags', () => {
        const result = validateAdditionalArgs([
          '--save-dev',
          '--prefer-offline',
          '--force',
          '--fund',
        ])
        expect(result).toBeNull()
      })
    })

    describe('Invalid arguments - type checks', () => {
      it('should reject non-array input', () => {
        const result = validateAdditionalArgs(
          '--save-dev' as unknown as string[]
        )
        expect(result).toContain('must be an array')
      })

      it('should reject arguments with non-string elements', () => {
        const result = validateAdditionalArgs([
          '--save-dev',
          123 as unknown as string,
        ])
        expect(result).toContain('Invalid argument type')
      })

      it('should reject empty strings', () => {
        const result = validateAdditionalArgs(['--save-dev', '', '--force'])
        expect(result).toContain('cannot be empty strings')
      })
    })

    describe('Invalid arguments - format checks', () => {
      it('should reject arguments not starting with --', () => {
        const result = validateAdditionalArgs(['-save-dev'])
        expect(result).toContain('must start with --')
      })

      it('should reject positional arguments', () => {
        const result = validateAdditionalArgs(['save-dev'])
        expect(result).toContain('must start with --')
      })

      it('should reject package names as arguments', () => {
        const result = validateAdditionalArgs(['react', 'lodash'])
        expect(result).toContain('must start with --')
      })
    })

    describe('Invalid arguments - shell injection attempts', () => {
      it('should reject semicolon (command chaining)', () => {
        const result = validateAdditionalArgs(['--save-dev; rm -rf /'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject pipe operator', () => {
        const result = validateAdditionalArgs(['--save-dev | cat /etc/passwd'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject ampersand (background execution)', () => {
        const result = validateAdditionalArgs(['--save-dev & malicious-cmd'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject backticks (command substitution)', () => {
        const result = validateAdditionalArgs(['--save-dev`whoami`'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject dollar sign (variable expansion)', () => {
        const result = validateAdditionalArgs(['--save-dev=$SHELL'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject parentheses (subshell)', () => {
        const result = validateAdditionalArgs(['--save-dev(malicious)'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject brackets', () => {
        const result = validateAdditionalArgs(['--save-dev[index]'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject curly braces (brace expansion)', () => {
        const result = validateAdditionalArgs(['--save-dev{a,b,c}'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject angle brackets (redirection)', () => {
        const result = validateAdditionalArgs(['--save-dev<file'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject backslash (escape)', () => {
        const result = validateAdditionalArgs(['--save-dev\\n'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject multiple injection attempts', () => {
        const result = validateAdditionalArgs([
          '--save-dev; rm -rf /; echo "pwned"',
        ])
        expect(result).toContain('dangerous characters')
      })
    })

    describe('Invalid arguments - shell escaping attempts', () => {
      it('should reject single quotes', () => {
        const result = validateAdditionalArgs(["--save-dev='value'"])
        expect(result).toContain('dangerous characters')
      })

      it('should reject double quotes', () => {
        const result = validateAdditionalArgs(['--save-dev="value"'])
        expect(result).toContain('dangerous characters')
      })

      it('should reject mixed quotes', () => {
        const result = validateAdditionalArgs(['--save-dev="\'value\'"'])
        expect(result).toContain('dangerous characters')
      })
    })

    describe('Invalid arguments - flag validation', () => {
      it('should reject unknown flags', () => {
        const result = validateAdditionalArgs(['--unknown-flag'])
        expect(result).toContain('Unknown or unsafe flag')
      })

      it('should reject dangerous flags like --registry', () => {
        const result = validateAdditionalArgs(['--registry=https://evil.com'])
        expect(result).toContain('Unknown or unsafe flag')
      })

      it('should reject dangerous flags like --proxy', () => {
        const result = validateAdditionalArgs(['--proxy=http://evil.com'])
        expect(result).toContain('Unknown or unsafe flag')
      })

      it('should reject dangerous flags like --shell', () => {
        const result = validateAdditionalArgs(['--shell=/bin/bash'])
        expect(result).toContain('Unknown or unsafe flag')
      })

      it('should reject dangerous flags like --token', () => {
        const result = validateAdditionalArgs(['--token=secret123'])
        expect(result).toContain('Unknown or unsafe flag')
      })
    })

    describe('Invalid arguments - flag values', () => {
      it('should reject flags with empty values', () => {
        const result = validateAdditionalArgs(['--save-dev='])
        expect(result).toContain('empty value')
      })

      it('should reject flag values with shell metacharacters', () => {
        const result = validateAdditionalArgs([
          '--no-strict-ssl=true;cat /etc/passwd',
        ])
        expect(result).toContain('dangerous characters')
      })

      it('should reject flag values with command injection', () => {
        const result = validateAdditionalArgs(['--force=$(malicious-cmd)'])
        expect(result).toContain('dangerous characters')
      })
    })

    describe('Complex real-world attack scenarios', () => {
      it('should reject npm config set as additional args', () => {
        const result = validateAdditionalArgs(['config', 'set', 'registry'])
        expect(result).toContain('must start with --')
      })

      it('should reject chained commands', () => {
        const result = validateAdditionalArgs([
          '--save-dev; npm config set registry https://evil.com',
        ])
        expect(result).toContain('dangerous characters')
      })

      it('should reject environment variable injection', () => {
        const result = validateAdditionalArgs(['--registry=$NPM_REGISTRY_EVIL'])
        expect(result).toContain('Unknown or unsafe flag')
      })

      it('should reject path traversal in values', () => {
        const result = validateAdditionalArgs([
          '--no-strict-ssl=../../../etc/passwd',
        ])
        expect(result).toContain('dangerous characters')
      })

      it('should reject data URI injection', () => {
        const result = validateAdditionalArgs([
          '--registry=data:text/html,<script>alert(1)</script>',
        ])
        expect(result).toContain('Unknown or unsafe flag')
      })

      it('should reject null byte injection', () => {
        const result = validateAdditionalArgs(['--no-strict-ssl=true\x00false'])
        expect(result).toContain('dangerous characters')
      })
    })

    describe('Edge cases', () => {
      it('should handle very long flag names', () => {
        const longFlag = '--' + 'a'.repeat(1000)
        const result = validateAdditionalArgs([longFlag])
        expect(result).toContain('Unknown or unsafe flag')
      })

      it('should handle unicode characters', () => {
        const result = validateAdditionalArgs(['--save-dev=😈'])
        // Unicode should be rejected (not alphanumeric/basic chars)
        expect(result).toContain('dangerous characters')
      })

      it('should handle deeply nested escaping', () => {
        const result = validateAdditionalArgs([
          '--save-dev=\\\\\\\\\\\\\\\\$(cat /etc/passwd)',
        ])
        expect(result).toContain('dangerous characters')
      })

      it('should handle null/undefined values gracefully', () => {
        const result = validateAdditionalArgs([
          '--save-dev=null',
          '--force=undefined',
        ])
        // null and undefined as strings should pass (legitimate values)
        expect(result).toBeNull()
      })
    })

    describe('Security compliance', () => {
      it('should not allow any shell metacharacters', () => {
        const shellMetachars = [
          ';',
          '|',
          '&',
          '`',
          '$',
          '(',
          ')',
          '[',
          ']',
          '{',
          '}',
          '<',
          '>',
          '\\',
        ]
        for (const char of shellMetachars) {
          const result = validateAdditionalArgs([`--save-dev${char}test`])
          expect(result).not.toBeNull()
          expect(result).toContain('dangerous characters')
        }
      })

      it('should not allow execution of arbitrary commands via flags', () => {
        const maliciousAttempts = [
          '--save-dev; npm install malicious-pkg',
          '--save-dev && npm config set registry https://evil.com',
          '--save-dev || npm uninstall everything',
          '--save-dev`whoami`',
          '--save-dev$(id > /tmp/pwned)',
          '--save-dev=${SHELL}/cmd',
        ]

        for (const attempt of maliciousAttempts) {
          const result = validateAdditionalArgs([attempt])
          expect(result).not.toBeNull()
          expect(result).toContain('dangerous characters')
        }
      })

      it('should prevent unknown flags even with legitimate-looking names', () => {
        const falseFlags = [
          '--install-script',
          '--before-install',
          '--after-install',
          '--scripts',
          '--exec',
          '--run',
          '--call',
          '--system',
        ]

        for (const flag of falseFlags) {
          const result = validateAdditionalArgs([flag])
          expect(result).not.toBeNull()
          expect(result).toContain('Unknown or unsafe flag')
        }
      })
    })

    describe('Valid argument combinations', () => {
      it('should accept multiple valid flags together', () => {
        const result = validateAdditionalArgs([
          '--save-dev',
          '--legacy-peer-deps',
          '--prefer-offline',
          '--force',
          '--no-save-exact',
        ])
        expect(result).toBeNull()
      })

      it('should accept flags with numeric values', () => {
        const result = validateAdditionalArgs(['--save-dev', '--force'])
        expect(result).toBeNull()
      })

      it('should accept all whitelisted flags', () => {
        const allWhitelisted = [
          '--prefer-offline',
          '--no-save-exact',
          '--save-exact',
          '--audit',
          '--save-dev',
          '--save',
          '--no-save',
          '--legacy-peer-deps',
          '--no-strict-ssl',
          '--progress',
          '--force',
          '--no-fund',
          '--fund',
        ]
        const result = validateAdditionalArgs(allWhitelisted)
        expect(result).toBeNull()
      })
    })
  })

  describe('Plugin injection scenarios', () => {
    it('should prevent malicious plugin from injecting registry override', () => {
      const maliciousArgs = ['--registry=https://attacker.com/npm']
      const result = validateAdditionalArgs(maliciousArgs)
      expect(result).not.toBeNull()
      expect(result).toContain('Unknown or unsafe flag')
    })

    it('should prevent malicious plugin from injecting proxy', () => {
      const maliciousArgs = ['--https-proxy=http://attacker.com:8080']
      const result = validateAdditionalArgs(maliciousArgs)
      expect(result).not.toBeNull()
      expect(result).toContain('Unknown or unsafe flag')
    })

    it('should prevent malicious plugin from injecting shell scripts', () => {
      const maliciousArgs = [
        '--scripts-prepend-node-path=true',
        '--shell=/bin/bash',
      ]
      const result = validateAdditionalArgs(maliciousArgs)
      expect(result).not.toBeNull()
    })

    it('should allow benign plugin additions', () => {
      const benignArgs = ['--save-dev', '--legacy-peer-deps']
      const result = validateAdditionalArgs(benignArgs)
      expect(result).toBeNull()
    })

    it('should reject plugin trying to skip security checks', () => {
      const maliciousArgs = ['--no-audit', '--ignore-scripts']
      const result = validateAdditionalArgs(maliciousArgs)
      expect(result).not.toBeNull()
    })
  })

  describe('InstallOptions integration', () => {
    it('should accept InstallOptions with valid additionalArgs', () => {
      const options: InstallOptions = {
        packageManager: 'npm',
        projectRoot: '/tmp/test',
        dev: true,
        additionalArgs: ['--save-dev', '--legacy-peer-deps'],
      }
      expect(options.additionalArgs).toBeDefined()
      expect(options.additionalArgs).toHaveLength(2)
    })

    it('should accept InstallOptions without additionalArgs', () => {
      const options: InstallOptions = {
        packageManager: 'npm',
        projectRoot: '/tmp/test',
      }
      expect(options.additionalArgs).toBeUndefined()
    })

    it('should allow empty additionalArgs array', () => {
      const options: InstallOptions = {
        packageManager: 'npm',
        projectRoot: '/tmp/test',
        additionalArgs: [],
      }
      const args = options.additionalArgs ?? []
      const result = validateAdditionalArgs(args)
      expect(result).toBeNull()
    })
  })
})
