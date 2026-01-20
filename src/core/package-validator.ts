/**
 * Package Name Validation
 * Prevents npm flag injection and invalid package name patterns
 * Supports scoped (@scope/pkg) and versioned (pkg@1.0.0) packages
 */

/**
 * Regular expression for valid npm package names
 * Based on npm package naming rules:
 * - Must start with @, letter, or digit
 * - Can contain letters, digits, hyphens, underscores, dots
 * - Optional scope prefix: @scope/
 * - Optional version suffix: @version
 */
const PACKAGE_NAME_REGEX =
  /^(@[a-z0-9]([a-z0-9._-]*[a-z0-9])?\/)?[a-z0-9]([a-z0-9._-]*[a-z0-9])?(@[~^>=<*\d.+-]+)?$/i

/**
 * List of npm flags that should never be allowed as package names
 */
const FORBIDDEN_FLAGS = new Set([
  '--registry',
  '--proxy',
  '--https-proxy',
  '--ca',
  '--cafile',
  '--cert',
  '--key',
  '--strict-ssl',
  '--save',
  '--save-dev',
  '--save-optional',
  '--save-exact',
  '--save-bundle',
  '--no-save',
  '--no-save-dev',
  '--no-save-optional',
  '--force',
  '--no-optional',
  '--prefer-offline',
  '--no-audit',
  '--no-fund',
])

/**
 * Validates a single package name
 * Rejects npm flags, invalid formats, and shell metacharacters
 *
 * @param name - Package name to validate (e.g., 'axios', '@scope/pkg', 'pkg@1.0.0')
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * validatePackageName('axios') // true
 * validatePackageName('@nestjs/core@^8.0.0') // true
 * validatePackageName('--registry=https://evil.com') // false
 * validatePackageName('pkg; rm -rf /') // false
 * ```
 */
export function validatePackageName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0) {
    return false
  }

  // Check if starts with npm flag
  if (name.startsWith('--')) {
    return false
  }

  // Check for shell metacharacters
  if (/[;&|`$()[\]{}<>\\]/.test(name)) {
    return false
  }

  // Check if it's a forbidden npm flag
  if (FORBIDDEN_FLAGS.has(name.toLowerCase())) {
    return false
  }

  // Validate against npm package naming rules
  return PACKAGE_NAME_REGEX.test(name)
}

/**
 * Validates multiple package names
 * Returns invalid names for error reporting
 *
 * @param names - Array of package names to validate
 * @returns Array of invalid package names (empty if all valid)
 *
 * @example
 * ```typescript
 * const invalid = validatePackageNames(['axios', '--registry=evil.com', 'lodash'])
 * // Returns: ['--registry=evil.com']
 * ```
 */
export function validatePackageNames(names: string[]): string[] {
  return names.filter((name) => !validatePackageName(name))
}

/**
 * Returns a user-friendly error message for invalid package names
 *
 * @param names - Array of invalid package names
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * const msg = getPackageValidationErrorMessage(['--registry=evil.com', 'pkg@'])
 * // Returns: "Invalid package names: --registry=evil.com, pkg@"
 * ```
 */
export function getPackageValidationErrorMessage(names: string[]): string {
  if (names.length === 0) {
    return 'No invalid package names'
  }

  const list = names.slice(0, 5).join(', ')
  const suffix = names.length > 5 ? ` and ${names.length - 5} more` : ''

  return `Invalid package name${names.length > 1 ? 's' : ''}: ${list}${suffix}`
}

/**
 * Parses a package name into components
 * Handles scoped packages and versions
 *
 * @param name - Package name to parse (e.g., '@scope/pkg@1.0.0')
 * @returns Object with parsed components
 *
 * @example
 * ```typescript
 * parsePackageName('@nestjs/core@^8.0.0')
 * // Returns: { name: '@nestjs/core', scope: 'nestjs', version: '^8.0.0' }
 *
 * parsePackageName('axios@latest')
 * // Returns: { name: 'axios', scope: undefined, version: 'latest' }
 * ```
 */
export function parsePackageName(name: string): {
  name: string
  scope?: string
  version?: string
} {
  // Find the last @ to separate name from version
  const lastAtIndex = name.lastIndexOf('@')

  // Check if it's a scoped package (@ at start) or scoped with version (@ at start and @ later)
  if (name.startsWith('@')) {
    if (lastAtIndex === 0) {
      // Just @scope/pkg with no version
      const scopePart = name.split('/')[0]
      return {
        name,
        scope: scopePart?.substring(1),
      }
    }

    // @scope/pkg@version
    const baseName = name.substring(0, lastAtIndex)
    const version = name.substring(lastAtIndex + 1)
    const scopePart = baseName.split('/')[0]
    const scope = scopePart?.substring(1)

    return {
      name: baseName,
      scope,
      version,
    }
  }

  // Non-scoped package
  if (lastAtIndex > 0) {
    return {
      name: name.substring(0, lastAtIndex),
      version: name.substring(lastAtIndex + 1),
    }
  }

  return { name }
}
