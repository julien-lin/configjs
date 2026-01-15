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
 * Provider singleton pour gérer l'instance de logger
 * - Core modules reçoivent le logger no-op par défaut
 * - CLI peut configurer le logger réel via setLogger()
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
   * @param newLogger - The logger instance to use
   */
  setLogger(newLogger: ILogger): void {
    this.currentLogger = newLogger
  }

  /**
   * Enable CLI logging (use the real logger)
   */
  enableCLILogging(): void {
    this.currentLogger = logger
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
    if (this.currentLogger === logger) {
      logger.setLevel(level)
    }
  }
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
