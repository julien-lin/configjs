/**
 * Logger Provider - Injection de dépendances pour le logging
 *
 * This module provides a centralized logging configuration for the application.
 * - CLI commands use the real logger with colored output
 * - Core modules and plugins receive a logger instance (real or no-op)
 *
 * This allows CLI-only output while keeping modules decoupled from logging.
 */

import type { LogLevel } from './logger.js'
import { logger } from './logger.js'

/**
 * ILogger interface pour l'abstraction du logging
 * Permet aux modules core/plugins d'utiliser le logger sans dépendre directement de logger.ts
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  success(message: string, ...args: unknown[]): void
  header(message: string): void
  section(title: string): void
  item(message: string, color?: 'green' | 'blue' | 'yellow' | 'gray'): void
  dim(message: string): void
  step(message: string): void
  box(title: string, content: string[]): void
}

/**
 * No-op logger pour les modules qui n'ont pas besoin d'afficher d'output
 * Utilisé par défaut dans les modules core/plugins
 */
class NoOpLogger implements ILogger {
  debug(): void {
    // no-op
  }

  info(): void {
    // no-op
  }

  warn(): void {
    // no-op
  }

  error(): void {
    // no-op
  }

  success(): void {
    // no-op
  }

  header(): void {
    // no-op
  }

  section(): void {
    // no-op
  }

  item(): void {
    // no-op
  }

  dim(): void {
    // no-op
  }

  step(): void {
    // no-op
  }

  box(): void {
    // no-op
  }
}

/**
 * SEC-003: ScrubbingLogger - Wraps ILogger with sensitive data redaction
 * All log messages are automatically scrubbed of credentials, tokens, and URLs with auth
 * This is a defensive security layer to prevent accidental credential leakage
 */
class ScrubbingLogger implements ILogger {
  constructor(private innerLogger: ILogger) {}

  private scrubMessage(message: string): string {
    return scrubSensitiveData(message)
  }

  private scrubArgs(args: unknown[]): unknown[] {
    return args.map((arg) => {
      if (typeof arg === 'string') {
        return this.scrubMessage(arg)
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          const json = JSON.stringify(arg)
          const scrubbed = this.scrubMessage(json)
          return JSON.parse(scrubbed) as unknown
        } catch {
          // If can't serialize/parse, return as-is
          return arg
        }
      }
      return arg
    })
  }

  debug(message: string, ...args: unknown[]): void {
    this.innerLogger.debug(this.scrubMessage(message), ...this.scrubArgs(args))
  }

  info(message: string, ...args: unknown[]): void {
    this.innerLogger.info(this.scrubMessage(message), ...this.scrubArgs(args))
  }

  warn(message: string, ...args: unknown[]): void {
    this.innerLogger.warn(this.scrubMessage(message), ...this.scrubArgs(args))
  }

  error(message: string, ...args: unknown[]): void {
    this.innerLogger.error(this.scrubMessage(message), ...this.scrubArgs(args))
  }

  success(message: string, ...args: unknown[]): void {
    this.innerLogger.success(
      this.scrubMessage(message),
      ...this.scrubArgs(args)
    )
  }

  header(message: string): void {
    this.innerLogger.header(this.scrubMessage(message))
  }

  section(title: string): void {
    this.innerLogger.section(this.scrubMessage(title))
  }

  item(message: string, color?: 'green' | 'blue' | 'yellow' | 'gray'): void {
    this.innerLogger.item(this.scrubMessage(message), color)
  }

  dim(message: string): void {
    this.innerLogger.dim(this.scrubMessage(message))
  }

  step(message: string): void {
    this.innerLogger.step(this.scrubMessage(message))
  }

  box(title: string, content: string[]): void {
    this.innerLogger.box(
      this.scrubMessage(title),
      content.map((line) => this.scrubMessage(line))
    )
  }
}

/**
 * Provider singleton pour gérer l'instance de logger
 * - Core modules reçoivent le logger no-op par défaut
 * - CLI peut configurer le logger réel via setLogger()
 * - All loggers are wrapped with ScrubbingLogger for automatic credential redaction (SEC-003)
 */
class LoggerProvider {
  private currentLogger: ILogger = new NoOpLogger()

  /**
   * Get the current logger instance
   * CLI commands should use the real logger
   * Core modules should use whatever is provided
   */
  getLogger(): ILogger {
    return this.currentLogger
  }

  /**
   * Set the active logger (typically called by CLI)
   * Automatically wraps with ScrubbingLogger for credential redaction (SEC-003)
   * @param newLogger - The logger instance to use
   */
  setLogger(newLogger: ILogger): void {
    // Wrap in ScrubbingLogger to automatically redact sensitive data
    this.currentLogger = new ScrubbingLogger(newLogger)
  }

  /**
   * Enable CLI logging (use the real logger)
   * Wraps with ScrubbingLogger for automatic credential redaction (SEC-003)
   */
  enableCLILogging(): void {
    this.currentLogger = new ScrubbingLogger(logger)
  }

  /**
   * Disable logging (use no-op logger)
   */
  disableLogging(): void {
    this.currentLogger = new NoOpLogger()
  }

  /**
   * Set the log level for the real logger
   */
  setLogLevel(level: LogLevel): void {
    // Extract the inner logger from ScrubbingLogger if needed
    if (this.currentLogger instanceof ScrubbingLogger) {
      logger.setLevel(level)
    } else if (this.currentLogger === logger) {
      logger.setLevel(level)
    }
  }
}

/**
 * SEC-003: Sensitive Data Patterns for Log Scrubbing
 * Patterns to match and redact sensitive information from logs
 */
const SENSITIVE_PATTERNS: Array<{
  pattern: RegExp
  replacement: string
  description: string
}> = [
  {
    pattern: /npm_token\s*=\s*\S+/gi,
    replacement: 'npm_token=[REDACTED]',
    description: 'NPM authentication tokens',
  },
  {
    pattern: /npm_auth_token\s*=\s*\S+/gi,
    replacement: 'npm_auth_token=[REDACTED]',
    description: 'NPM authentication tokens',
  },
  {
    pattern: /--token\s*=\s*\S+/gi,
    replacement: '--token=[REDACTED]',
    description: 'Generic token flag',
  },
  {
    pattern: /--auth-token\s*=\s*\S+/gi,
    replacement: '--auth-token=[REDACTED]',
    description: 'Generic auth token flag',
  },
  {
    pattern: /registry\s*=\s*https?:\/\/[^\s]+/gi,
    replacement: 'registry=[REDACTED]',
    description: 'Registry URLs with or without --',
  },
  {
    pattern: /https?:\/\/[^@\s]+@[^\s]+/g,
    replacement: 'https://[REDACTED]@[REDACTED]',
    description: 'URLs with embedded credentials (user:pass@host)',
  },
  {
    pattern: /--proxy\s*=\s*\S+/gi,
    replacement: '--proxy=[REDACTED]',
    description: 'Proxy URLs which might contain credentials',
  },
  {
    pattern: /AWS_SECRET_ACCESS_KEY\s*=\s*\S+/gi,
    replacement: 'AWS_SECRET_ACCESS_KEY=[REDACTED]',
    description: 'AWS secret access keys',
  },
  {
    pattern: /AWS_ACCESS_KEY_ID\s*=\s*\S+/gi,
    replacement: 'AWS_ACCESS_KEY_ID=[REDACTED]',
    description: 'AWS access key IDs (partial redaction)',
  },
  {
    pattern: /github_token\s*=\s*\S+/gi,
    replacement: 'github_token=[REDACTED]',
    description: 'GitHub personal access tokens',
  },
  {
    pattern: /GIT_TOKEN\s*=\s*\S+/gi,
    replacement: 'GIT_TOKEN=[REDACTED]',
    description: 'Git tokens',
  },
  {
    pattern: /Bearer\s+\S+/gi,
    replacement: 'Bearer [REDACTED]',
    description: 'Bearer tokens in Authorization headers',
  },
  {
    pattern: /Authorization:\s*\S+\s+\S+/gi,
    replacement: 'Authorization: [REDACTED]',
    description: 'Authorization headers',
  },
  // Generic token patterns - match common token formats
  {
    pattern: /\bghp_[A-Za-z0-9_]{20,}/g,
    replacement: '[REDACTED]',
    description: 'GitHub personal access tokens (ghp_ prefix)',
  },
  {
    pattern: /\bghu_[A-Za-z0-9_]{20,}/g,
    replacement: '[REDACTED]',
    description: 'GitHub user tokens (ghu_ prefix)',
  },
  {
    pattern: /\bnpm_[A-Za-z0-9_]{20,}/g,
    replacement: '[REDACTED]',
    description: 'NPM tokens (generic npm_ prefix)',
  },
]

/**
 * SEC-003: Scrub sensitive data from log messages
 * Replaces credentials, tokens, and sensitive URLs with [REDACTED] placeholder
 * @param message - Raw log message that might contain sensitive data
 * @returns Scrubbed message with sensitive data replaced
 */
export function scrubSensitiveData(message: string): string {
  let scrubbed = message

  // Apply all sensitive pattern replacements
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, replacement)
  }

  return scrubbed
}

// Singleton instance
export const loggerProvider = new LoggerProvider()

/**
 * Get the global logger instance for modules
 * Usage in core/plugins:
 *   const logger = getModuleLogger()
 *   logger.debug('Debug info') // no-op unless CLI has enabled logging
 */
export function getModuleLogger(): ILogger {
  return loggerProvider.getLogger()
}

/**
 * Convenience export for CLI commands to enable CLI logging
 * Usage in CLI:
 *   initializeCLILogging()
 *   const logger = getModuleLogger() // now returns real logger
 */
export function initializeCLILogging(): void {
  loggerProvider.enableCLILogging()
}

/**
 * Export the real logger for CLI-only operations
 * CLI commands that need direct logging control should use this
 */
export { logger as cliLogger }
