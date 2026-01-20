/**
 * Timeout & Resource Limits Management
 * Prevents DoS attacks via long-running operations and resource exhaustion
 */

/**
 * Timeout configuration per operation type
 */
export const OPERATION_TIMEOUTS = {
  /** Package installation maximum duration */
  PACKAGE_INSTALL: 5 * 60 * 1000, // 5 minutes
  /** Framework detection maximum duration */
  FRAMEWORK_DETECT: 30 * 1000, // 30 seconds
  /** Plugin configuration maximum duration */
  PLUGIN_CONFIG: 60 * 1000, // 1 minute
  /** Input validation maximum duration */
  VALIDATION: 30 * 1000, // 30 seconds
  /** General command execution */
  COMMAND_EXEC: 2 * 60 * 1000, // 2 minutes
} as const

/**
 * Resource limits per operation
 */
export const RESOURCE_LIMITS = {
  /** Maximum stdout/stderr buffer (10MB) */
  MAX_BUFFER: 10 * 1024 * 1024,
  /** Maximum number of concurrent operations */
  MAX_CONCURRENT: 4,
  /** Maximum child processes per operation */
  MAX_CHILD_PROCESSES: 1,
} as const

/**
 * Timeout error information
 */
export interface TimeoutError extends Error {
  code: 'TIMEOUT'
  operation: string
  duration: number
  maxDuration: number
}

/**
 * Creates a timeout promise that rejects after specified duration
 *
 * @param duration - Timeout in milliseconds
 * @param operation - Operation name for error messages
 * @returns Promise that rejects if timeout expires
 *
 * @example
 * ```typescript
 * const timeoutPromise = createTimeout(5000, 'npm install')
 * await Promise.race([installPromise, timeoutPromise])
 * ```
 */
export function createTimeout(
  duration: number,
  operation: string
): Promise<never> {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => {
      const error: TimeoutError = new Error(
        `Operation "${operation}" exceeded timeout of ${duration}ms`
      ) as TimeoutError
      error.code = 'TIMEOUT'
      error.operation = operation
      error.duration = duration
      error.maxDuration = duration
      reject(error)
    }, duration)

    // Ensure timer is unref'd so it doesn't keep process alive
    timer.unref?.()
  })
}

/**
 * Wraps a promise with timeout protection
 *
 * @param promise - Promise to wrap
 * @param timeout - Timeout in milliseconds
 * @param operation - Operation name for error messages
 * @returns Promise that rejects on timeout
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   installPackages(['axios'], options),
 *   OPERATION_TIMEOUTS.PACKAGE_INSTALL,
 *   'npm install'
 * )
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  operation: string
): Promise<T> {
  return Promise.race([promise, createTimeout(timeout, operation)])
}

/**
 * Formats timeout error message with helpful suggestions
 *
 * @param error - Timeout error
 * @param operation - Operation that timed out
 * @returns Formatted error message
 */
export function getTimeoutErrorMessage(
  error: TimeoutError,
  operation: string
): string {
  const suggestions: string[] = []

  if (operation.includes('install') || operation.includes('npm')) {
    suggestions.push('• Check your internet connection')
    suggestions.push(
      '• Try increasing npm timeout: `npm config set fetch-timeout 60000`'
    )
    suggestions.push(
      '• Use a different npm registry: `npm config set registry https://registry.npmjs.org/`'
    )
  }

  if (operation.includes('detect') || operation.includes('framework')) {
    suggestions.push('• Your project may be very large')
    suggestions.push('• Check for large node_modules or build artifacts')
  }

  const base = `${operation} timed out after ${error.duration}ms (max: ${error.maxDuration}ms)`
  const suffix =
    suggestions.length > 0 ? `\n\nSuggestions:\n${suggestions.join('\n')}` : ''

  return base + suffix
}

/**
 * Validates if a duration would exceed operation timeout
 *
 * @param duration - Duration in milliseconds
 * @param maxDuration - Maximum allowed duration
 * @returns true if within limits
 */
export function isWithinTimeout(
  duration: number,
  maxDuration: number
): boolean {
  return duration <= maxDuration
}

/**
 * Calculates remaining timeout
 *
 * @param startTime - Start timestamp (Date.now())
 * @param maxDuration - Maximum allowed duration
 * @returns Remaining time in milliseconds (0 if exceeded)
 */
export function getRemainingTimeout(
  startTime: number,
  maxDuration: number
): number {
  const elapsed = Date.now() - startTime
  return Math.max(0, maxDuration - elapsed)
}

/**
 * Checks if timeout has expired
 *
 * @param startTime - Start timestamp (Date.now())
 * @param maxDuration - Maximum allowed duration
 * @returns true if timeout has expired
 */
export function hasTimeoutExpired(
  startTime: number,
  maxDuration: number
): boolean {
  return Date.now() - startTime > maxDuration
}
