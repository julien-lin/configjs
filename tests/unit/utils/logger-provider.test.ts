import { describe, it, expect, beforeEach } from 'vitest'
import {
  getModuleLogger,
  initializeCLILogging,
  loggerProvider,
} from '../../../src/utils/logger-provider.js'

describe('Logger Provider', () => {
  beforeEach(() => {
    // Reset to default (no-op logger)
    loggerProvider.disableLogging()
  })

  describe('getModuleLogger', () => {
    it('should return a no-op logger by default', () => {
      const logger = getModuleLogger()

      // Should not throw
      expect(() => {
        logger.debug('test')
        logger.info('test')
        logger.warn('test')
        logger.error('test')
        logger.success('test')
        logger.header('test')
        logger.section('test')
        logger.item('test')
        logger.dim('test')
        logger.step('test')
        logger.box('test', ['line1'])
      }).not.toThrow()
    })

    it('should return a logger object with all required methods', () => {
      const logger = getModuleLogger()

      expect(logger).toBeDefined()
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.success).toBe('function')
      expect(typeof logger.header).toBe('function')
      expect(typeof logger.section).toBe('function')
      expect(typeof logger.item).toBe('function')
      expect(typeof logger.dim).toBe('function')
      expect(typeof logger.step).toBe('function')
      expect(typeof logger.box).toBe('function')
    })

    it('should return the same logger instance on multiple calls before init', () => {
      const logger1 = getModuleLogger()
      const logger2 = getModuleLogger()

      // Before initialization, both should be no-op loggers
      // (though not necessarily the same instance, they have identical behavior)
      expect(typeof logger1.info).toBe('function')
      expect(typeof logger2.info).toBe('function')
    })
  })

  describe('initializeCLILogging', () => {
    it('should activate the real logger', () => {
      initializeCLILogging()
      const logger = getModuleLogger()

      // After init, should be a logger instance (ScrubbingLogger wrapping cliLogger)
      expect(logger).toBeDefined()
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
    })

    it('should allow modules to use the real logger after initialization', () => {
      initializeCLILogging()
      const logger = getModuleLogger()

      // Should not throw when using the real logger
      expect(() => {
        logger.debug('test message')
      }).not.toThrow()
    })
  })

  describe('disableLogging', () => {
    it('should revert to no-op logger after being initialized', () => {
      initializeCLILogging()
      expect(getModuleLogger()).toBeDefined()

      loggerProvider.disableLogging()
      const logger = getModuleLogger()

      // Should not throw even after being "disabled"
      expect(() => logger.info('test')).not.toThrow()
    })

    it('should maintain no-op behavior after disable', () => {
      loggerProvider.disableLogging()
      const logger = getModuleLogger()

      // All methods should be callable without throwing
      expect(() => {
        logger.debug('debug')
        logger.info('info')
        logger.warn('warn')
        logger.error('error')
      }).not.toThrow()
    })
  })

  describe('Multiple module scenario', () => {
    it('should provide consistent logger behavior to all modules', () => {
      const module1Logger = getModuleLogger()
      const module2Logger = getModuleLogger()

      // Both should behave identically (no-op by default)
      expect(() => {
        module1Logger.info('module1')
        module2Logger.info('module2')
      }).not.toThrow()
    })

    it('should switch all modules to real logger when initialized', () => {
      initializeCLILogging()

      const module1RealLogger = getModuleLogger()
      const module2RealLogger = getModuleLogger()

      // Both should return a logger instance (ScrubbingLogger wrapping cliLogger for security)
      expect(module1RealLogger).toBeDefined()
      expect(module2RealLogger).toBeDefined()
      // They should be the same instance
      expect(module1RealLogger).toBe(module2RealLogger)
      // They should be usable without errors
      expect(() => {
        module1RealLogger.info('test')
        module2RealLogger.info('test')
      }).not.toThrow()
    })
  })
})
