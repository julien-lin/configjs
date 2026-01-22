/**
 * SEC-003: Log Scrubbing Tests
 * Verify that sensitive data patterns are properly redacted from logs
 * Tests cover: npm tokens, AWS keys, GitHub tokens, URLs with auth, registry flags, proxy flags
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  scrubSensitiveData,
  loggerProvider,
  getModuleLogger,
} from '../../src/utils/logger-provider.js'
import type { ILogger } from '../../src/utils/logger-provider.js'

/**
 * Mock logger to capture output
 */
class CaptureLogger implements ILogger {
  messages: Array<{ level: string; message: string; args: unknown[] }> = []

  debug(message: string, ...args: unknown[]): void {
    this.messages.push({ level: 'debug', message, args })
  }

  info(message: string, ...args: unknown[]): void {
    this.messages.push({ level: 'info', message, args })
  }

  warn(message: string, ...args: unknown[]): void {
    this.messages.push({ level: 'warn', message, args })
  }

  error(message: string, ...args: unknown[]): void {
    this.messages.push({ level: 'error', message, args })
  }

  success(message: string, ...args: unknown[]): void {
    this.messages.push({ level: 'success', message, args })
  }

  header(message: string): void {
    this.messages.push({ level: 'header', message, args: [] })
  }

  section(title: string): void {
    this.messages.push({ level: 'section', message: title, args: [] })
  }

  item(message: string, color?: 'green' | 'blue' | 'yellow' | 'gray'): void {
    this.messages.push({ level: 'item', message, args: [color] })
  }

  dim(message: string): void {
    this.messages.push({ level: 'dim', message, args: [] })
  }

  step(message: string): void {
    this.messages.push({ level: 'step', message, args: [] })
  }

  box(title: string, content: string[]): void {
    this.messages.push({ level: 'box', message: title, args: content })
  }

  clear(): void {
    this.messages = []
  }
}

describe('SEC-003: Log Scrubbing', () => {
  let captureLogger: CaptureLogger

  beforeEach(() => {
    captureLogger = new CaptureLogger()
    loggerProvider.setLogger(captureLogger)
  })

  describe('scrubSensitiveData() - Direct function', () => {
    describe('NPM tokens', () => {
      it('should redact npm_token variables', () => {
        const input = 'npm_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        const result = scrubSensitiveData(input)
        expect(result).toBe('npm_token=[REDACTED]')
      })

      it('should redact npm_auth_token variables', () => {
        const input = 'npm_auth_token=secret_token_value_123'
        const result = scrubSensitiveData(input)
        expect(result).toBe('npm_auth_token=[REDACTED]')
      })

      it('should handle multiple npm tokens in one message', () => {
        const input =
          'npm_token=token1 and npm_token=token2 and npm_auth_token=token3'
        const result = scrubSensitiveData(input)
        expect(result).toBe(
          'npm_token=[REDACTED] and npm_token=[REDACTED] and npm_auth_token=[REDACTED]'
        )
      })

      it('should be case insensitive for npm_token', () => {
        const input = 'NPM_TOKEN=secret'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })
    })

    describe('Token flags', () => {
      it('should redact --token flag', () => {
        const input = 'install --token=my_secret_token'
        const result = scrubSensitiveData(input)
        expect(result).toBe('install --token=[REDACTED]')
      })

      it('should redact --auth-token flag', () => {
        const input = 'auth --auth-token=secret_value_12345'
        const result = scrubSensitiveData(input)
        expect(result).toBe('auth --auth-token=[REDACTED]')
      })

      it('should be case insensitive for token flags', () => {
        const input = 'install --TOKEN=secret'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })
    })

    describe('Registry URLs', () => {
      it('should redact --registry flag with URL', () => {
        const input = 'npm install --registry=https://registry.npmjs.org/'
        const result = scrubSensitiveData(input)
        expect(result).toBe('npm install --registry=[REDACTED]')
      })

      it('should redact custom registry URLs', () => {
        const input =
          'npm install --registry=https://private-registry.company.com/'
        const result = scrubSensitiveData(input)
        expect(result).toBe('npm install --registry=[REDACTED]')
      })

      it('should be case insensitive for registry flag', () => {
        const input = 'npm install --REGISTRY=https://registry.npmjs.org'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })
    })

    describe('URLs with embedded credentials', () => {
      it('should redact URLs with user:pass@host format', () => {
        const input = 'Connecting to https://user:password@registry.example.com'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]@[REDACTED]')
      })

      it('should redact http URLs with credentials', () => {
        const input = 'http://admin:secret123@internal-registry.local/v1'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]@[REDACTED]')
      })

      it('should handle multiple URLs with credentials', () => {
        const input =
          'https://user1:pass1@registry1.com and https://user2:pass2@registry2.com'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]@[REDACTED]')
        expect(result.match(/\[REDACTED\]@\[REDACTED\]/g)).toHaveLength(2)
      })
    })

    describe('Proxy URLs', () => {
      it('should redact --proxy flag', () => {
        const input = 'npm install --proxy=http://proxy.company.com:8080'
        const result = scrubSensitiveData(input)
        expect(result).toBe('npm install --proxy=[REDACTED]')
      })

      it('should redact proxy with credentials', () => {
        const input = 'npm config set proxy=http://user:pass@proxy.com:8080'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })

      it('should be case insensitive for proxy flag', () => {
        const input = 'npm install --PROXY=http://proxy.local'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })
    })

    describe('AWS credentials', () => {
      it('should redact AWS_SECRET_ACCESS_KEY', () => {
        const input =
          'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY'
        const result = scrubSensitiveData(input)
        expect(result).toBe('AWS_SECRET_ACCESS_KEY=[REDACTED]')
      })

      it('should redact AWS_ACCESS_KEY_ID', () => {
        const input = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'
        const result = scrubSensitiveData(input)
        expect(result).toBe('AWS_ACCESS_KEY_ID=[REDACTED]')
      })

      it('should handle multiple AWS keys in one message', () => {
        const input =
          'AWS_ACCESS_KEY_ID=key1 AWS_SECRET_ACCESS_KEY=secret1 AWS_ACCESS_KEY_ID=key2'
        const result = scrubSensitiveData(input)
        expect(result).toBe(
          'AWS_ACCESS_KEY_ID=[REDACTED] AWS_SECRET_ACCESS_KEY=[REDACTED] AWS_ACCESS_KEY_ID=[REDACTED]'
        )
      })

      it('should be case insensitive for AWS keys', () => {
        const input = 'aws_secret_access_key=secret123'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })
    })

    describe('GitHub tokens', () => {
      it('should redact GITHUB_TOKEN', () => {
        const input = 'GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })

      it('should redact GIT_TOKEN', () => {
        const input = 'GIT_TOKEN=git_token_secret_value'
        const result = scrubSensitiveData(input)
        expect(result).toBe('GIT_TOKEN=[REDACTED]')
      })

      it('should be case insensitive for GitHub tokens', () => {
        const input = 'github_token=secret'
        const result = scrubSensitiveData(input)
        // Result will have GITHUB_TOKEN uppercase due to case-insensitive replacement
        expect(result).toContain('=[REDACTED]')
      })
    })

    describe('Authorization headers', () => {
      it('should redact Bearer tokens', () => {
        const input =
          'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })

      it('should redact Authorization headers', () => {
        const input = 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ='
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })

      it('should be case insensitive for Bearer tokens', () => {
        const input = 'header: bearer token_value_12345'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })
    })

    describe('Complex real-world scenarios', () => {
      it('should scrub npm install command with token and registry', () => {
        const input =
          'npm install --registry=https://private-registry.example.com --token=secret_npm_token_xyz'
        const result = scrubSensitiveData(input)
        expect(result).not.toContain('private-registry.example.com')
        expect(result).not.toContain('secret_npm_token_xyz')
        expect(result).toContain('[REDACTED]')
      })

      it('should scrub environment setup with multiple credentials', () => {
        const input = `
          export npm_token=abc123def456
          export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG
          export github_token=ghp_abcdefgh
          npm config set registry=https://user:pass@registry.local
        `
        const result = scrubSensitiveData(input)
        expect(result).not.toContain('abc123def456')
        expect(result).not.toContain('wJalrXUtnFEMI/K7MDENG')
        expect(
          result.match(/\[REDACTED\]/g)?.length || 0
        ).toBeGreaterThanOrEqual(4)
      })

      it('should preserve message structure while redacting sensitive parts', () => {
        const input =
          'npm install completed with registry=https://registry.npmjs.org'
        const result = scrubSensitiveData(input)
        expect(result).toContain('npm install completed')
        expect(result).toContain('[REDACTED]')
      })
    })

    describe('Edge cases', () => {
      it('should not modify messages without sensitive data', () => {
        const input = 'npm install @package/name@1.2.3'
        const result = scrubSensitiveData(input)
        expect(result).toBe(input)
      })

      it('should handle empty strings', () => {
        const result = scrubSensitiveData('')
        expect(result).toBe('')
      })

      it('should handle very long messages', () => {
        const input = 'npm_token=secret_value ' + 'normal_text '.repeat(1000)
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
        expect(result).toContain('normal_text')
      })

      it('should handle special characters around credentials', () => {
        const input = 'token="npm_token=secret123" (with=quotes)'
        const result = scrubSensitiveData(input)
        expect(result).toContain('[REDACTED]')
      })
    })
  })

  describe('ScrubbingLogger integration', () => {
    it('should scrub messages passed to logger.debug()', () => {
      const logger = getModuleLogger()
      logger.debug('npm_token=secret_123')

      expect(captureLogger.messages).toHaveLength(1)
      expect(captureLogger.messages[0]?.message).toBe('npm_token=[REDACTED]')
    })

    it('should scrub messages passed to logger.info()', () => {
      const logger = getModuleLogger()
      logger.info('Connecting to https://user:pass@registry.local')

      expect(captureLogger.messages).toHaveLength(1)
      expect(captureLogger.messages[0]?.message).toContain('[REDACTED]')
      expect(captureLogger.messages[0]?.message).not.toContain('user:pass')
    })

    it('should scrub string arguments to logger methods', () => {
      const logger = getModuleLogger()
      logger.warn('Error:', 'AWS_SECRET_ACCESS_KEY=secret123')

      expect(captureLogger.messages).toHaveLength(1)
      expect((captureLogger.messages[0]?.args ?? [])[0]).toContain('[REDACTED]')
    })

    it('should scrub object arguments with stringified properties', () => {
      const logger = getModuleLogger()
      const obj = { token: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz' }
      logger.info('Config:', obj)

      expect(captureLogger.messages).toHaveLength(1)
      // The object args should have redacted token
      const args = captureLogger.messages[0]?.args
      const arg = args?.[0]
      if (typeof arg === 'object' && arg !== null) {
        const stringified = JSON.stringify(arg)
        expect(stringified).toContain('[REDACTED]')
      }
    })

    it('should scrub all log levels', () => {
      const logger = getModuleLogger()
      const sensitiveData = 'npm_token=secret'

      captureLogger.clear()
      logger.debug(sensitiveData)
      expect(captureLogger.messages[0]?.message).toBe('npm_token=[REDACTED]')

      captureLogger.clear()
      logger.info(sensitiveData)
      expect(captureLogger.messages[0]?.message).toBe('npm_token=[REDACTED]')

      captureLogger.clear()
      logger.warn(sensitiveData)
      expect(captureLogger.messages[0]?.message).toBe('npm_token=[REDACTED]')

      captureLogger.clear()
      logger.error(sensitiveData)
      expect(captureLogger.messages[0]?.message).toBe('npm_token=[REDACTED]')

      captureLogger.clear()
      logger.success(sensitiveData)
      expect(captureLogger.messages[0]?.message).toBe('npm_token=[REDACTED]')
    })

    it('should scrub header, section, and other special methods', () => {
      const logger = getModuleLogger()

      logger.header('npm_token=secret_123')
      expect(captureLogger.messages[0]?.message).toBe('npm_token=[REDACTED]')

      captureLogger.clear()
      logger.section('AWS_SECRET_ACCESS_KEY=key123')
      expect(captureLogger.messages[0]?.message).toBe(
        'AWS_SECRET_ACCESS_KEY=[REDACTED]'
      )

      captureLogger.clear()
      logger.dim('github_token=token_xyz')
      expect(captureLogger.messages[0]?.message).toContain('[REDACTED]')

      captureLogger.clear()
      logger.step('proxy=http://user:pass@proxy.local')
      expect(captureLogger.messages[0]?.message).toContain('[REDACTED]')
    })

    it('should scrub box content', () => {
      const logger = getModuleLogger()
      logger.box('Title', ['npm_token=secret', 'github_token=token'])

      expect(captureLogger.messages).toHaveLength(1)
      const args = (captureLogger.messages[0]?.args as string[]) ?? []
      expect(args[0]).toBe('npm_token=[REDACTED]')
      expect(args[1]).toBe('github_token=[REDACTED]')
    })
  })

  describe('LoggerProvider integration', () => {
    it('should maintain scrubbing when enabling CLI logging', () => {
      // Create a new capture logger and set it
      const testCaptureLogger = new CaptureLogger()
      loggerProvider.setLogger(testCaptureLogger)

      const logger = getModuleLogger()
      logger.info('npm_token=secret123')
      expect(testCaptureLogger.messages[0]?.message).toBe(
        'npm_token=[REDACTED]'
      )
    })
  })

  describe('Security compliance', () => {
    it('should not leak npm tokens in logs', () => {
      const logger = getModuleLogger()
      const token = 'npm_abcd1234efgh5678ijkl9012mnop3456'

      logger.error(`Failed to authenticate with token ${token}`)
      const logged = captureLogger.messages[0]?.message
      // Should scrub the generic npm_ token
      expect(logged).toContain('[REDACTED]')
      expect((logged || '').includes(token)).toBeFalsy()
    })

    it('should not leak AWS credentials in logs', () => {
      const logger = getModuleLogger()
      const secretKey = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY'

      logger.debug(`AWS_SECRET_ACCESS_KEY=${secretKey}`)
      const logged = captureLogger.messages[0]?.message
      expect(logged).not.toContain(secretKey)
      expect(logged).toContain('[REDACTED]')
    })

    it('should not leak GitHub tokens in logs', () => {
      const logger = getModuleLogger()
      const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz'

      logger.warn(`GitHub token: ${token}`)
      const logged = captureLogger.messages[0]?.message
      expect(logged).toContain('[REDACTED]')
      expect((logged || '').includes(token)).toBeFalsy()
    })

    it('should not leak registry URLs with auth in logs', () => {
      const logger = getModuleLogger()
      const registryUrl = 'https://admin:secret123@private-registry.company.com'

      logger.info(`Registry: ${registryUrl}`)
      const logged = captureLogger.messages[0]?.message
      expect(logged).not.toContain('admin:secret123')
      expect(logged).toContain('[REDACTED]')
    })
  })
})
