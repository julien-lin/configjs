/**
 * Security Test Fixtures Index
 *
 * Centralized export of all security testing payloads and fixtures.
 * Used by security test suites to verify vulnerability protection.
 */

export * from './shell-injection-payloads'
export * from './path-traversal-payloads'
export * from './package-injection-payloads'

/**
 * Standard test configuration
 */
export const SECURITY_TEST_CONFIG = {
  // Timeout for each test case (ms)
  testTimeout: 5000,

  // Number of iterations for fuzz testing
  fuzzIterations: 1000,

  // Max length for generated strings
  maxStringLength: 10000,

  // Characters to use in fuzzing
  fuzzCharacters: [
    ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    '!@#$%^&*()_+-=[]{}|;\':",./<>?`~\\n\\r\\t',
  ],
}

/**
 * Expected outcomes for security tests
 */
export enum SecurityTestOutcome {
  PASS = 'PASS', // Exploit blocked
  FAIL = 'FAIL', // Exploit succeeded (should not happen)
  ERROR = 'ERROR', // Test error
  TIMEOUT = 'TIMEOUT', // Test timeout
}
