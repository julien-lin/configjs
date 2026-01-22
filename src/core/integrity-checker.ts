/**
 * Package Integrity Checker - Verify package authenticity and integrity
 *
 * Prevents supply chain attacks by:
 * 1. Verifying package-lock.json integrity before installation
 * 2. Checking SHA-512/SHA-256 hashes of packages
 * 3. Detecting tampering or corruption
 * 4. Validating post-installation integrity
 *
 * @module integrity-checker
 */

import { createHash } from 'node:crypto'

export interface IntegrityCheckResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  checksVerified: number
  checksSkipped: number
  packageCount?: number
}

export interface PackageIntegrityInfo {
  name: string
  version: string
  integrity: string
  requires?: Record<string, string>
  resolved?: string
}

/**
 * Package Integrity Checker for verifying package authenticity
 */
export class IntegrityChecker {
  /**
   * Verify package-lock.json integrity
   * Checks for:
   * - Valid JSON structure
   * - Required fields present
   * - Integrity hashes present
   * - No sign of tampering
   *
   * @param lockContent - Raw package-lock.json content
   * @returns Validation result with errors/warnings
   */
  static verifyLockFile(lockContent: string): IntegrityCheckResult {
    const result: IntegrityCheckResult = {
      valid: true,
      errors: [],
      warnings: [],
      checksVerified: 0,
      checksSkipped: 0,
      packageCount: 0,
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const lockFile = JSON.parse(lockContent)

      // Verify basic structure
      if (!lockFile || typeof lockFile !== 'object') {
        result.valid = false
        result.errors.push('Lock file is not a valid JSON object')
        return result
      }

      // Check required fields

      if (!(lockFile as Record<string, unknown>)['lockfileVersion']) {
        result.warnings.push('Missing lockfileVersion field')
      }

      if (
        !(lockFile as Record<string, unknown>)['dependencies'] &&
        !(lockFile as Record<string, unknown>)['packages']
      ) {
        result.valid = false
        result.errors.push('Lock file missing both dependencies and packages')
        return result
      }

      // Verify integrity hashes on packages
      const packages =
        ((lockFile as Record<string, unknown>)['packages'] as Record<
          string,
          unknown
        >) ||
        ((lockFile as Record<string, unknown>)['dependencies'] as Record<
          string,
          unknown
        >) ||
        {}
      let packageCount = 0

      for (const [name, pkg] of Object.entries(packages)) {
        if (name === '') continue // Skip root package
        packageCount++

        const pkgData = pkg as Record<string, unknown>

        // Check for integrity hash

        const integrity =
          (pkgData['integrity'] as string | undefined) ?? undefined

        const resolved =
          (pkgData['resolved'] as string | undefined) ?? undefined

        if (!integrity) {
          // npm packages from registry MUST have integrity
          if (resolved && this.isRegistryPackage(resolved)) {
            result.errors.push(
              `Package ${name} missing integrity hash (registry package)`
            )
            result.valid = false
          } else {
            result.warnings.push(
              `Package ${name} missing integrity hash (git/file)`
            )
            result.checksSkipped++
          }
        } else {
          // Validate integrity format (should be algo-hash)
          if (!this.isValidIntegrityFormat(integrity)) {
            result.errors.push(
              `Package ${name} has invalid integrity format: ${integrity}`
            )
            result.valid = false
          } else {
            result.checksVerified++
          }
        }
      }

      if (packageCount === 0) {
        result.warnings.push('Lock file contains no packages')
      }

      result.packageCount = packageCount
      return result
    } catch (error) {
      result.valid = false
      if (error instanceof SyntaxError) {
        result.errors.push(`Invalid JSON in lock file: ${error.message}`)
      } else {
        result.errors.push(`Error parsing lock file: ${String(error)}`)
      }
      return result
    }
  }

  /**
   * Verify integrity hash of a package
   * Compares provided hash with calculated hash
   *
   * @param content - Package content (tarball)
   * @param integrityString - Expected integrity string (e.g., "sha512-ABC...")
   * @returns true if integrity is valid
   */
  static verifyPackageIntegrity(
    content: Buffer,
    integrityString: string
  ): boolean {
    try {
      if (!content || !integrityString) {
        return false
      }

      const parts = integrityString.split('-')
      const algorithm = parts[0]
      const expectedHash = parts[1]

      if (!algorithm || !expectedHash) {
        return false
      }

      // Calculate hash based on algorithm
      const hash = createHash(algorithm)
      hash.update(content)
      const calculatedHash = hash.digest('base64')

      // Compare hashes
      return calculatedHash === expectedHash
    } catch {
      return false
    }
  }

  /**
   * Check if integrity format is valid
   * Valid formats: sha512-ABC..., sha256-ABC..., sha1-ABC...
   *
   * @param integrityString - Integrity string to validate
   * @returns true if format is valid
   */
  static isValidIntegrityFormat(integrityString: string): boolean {
    if (!integrityString || typeof integrityString !== 'string') {
      return false
    }

    const parts = integrityString.split('-')
    const algorithm = parts[0]
    const hash = parts[1]

    if (!algorithm || !hash) {
      return false
    }

    // Validate algorithm
    const validAlgorithms = ['sha512', 'sha256', 'sha1']
    if (!validAlgorithms.includes(algorithm)) {
      return false
    }

    // Validate hash is base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    return base64Regex.test(hash)
  }

  /**
   * Check if a package is from npm registry
   * Registry packages have resolved URLs pointing to registry
   *
   * @param resolvedUrl - Resolved URL from lock file
   * @returns true if package is from npm registry
   */
  static isRegistryPackage(resolvedUrl: string): boolean {
    if (!resolvedUrl || typeof resolvedUrl !== 'string') {
      return false
    }

    // Registry packages have URLs like: https://registry.npmjs.org/package/-/package-1.0.0.tgz
    return (
      resolvedUrl.includes('registry.npmjs.org') ||
      resolvedUrl.includes('npm.pkg.github.com') ||
      (resolvedUrl.startsWith('https://') &&
        !resolvedUrl.includes('github.com/'))
    )
  }

  /**
   * Generate integrity hash for content
   *
   * @param content - Content to hash
   * @param algorithm - Hash algorithm (sha512, sha256, sha1)
   * @returns Integrity string (e.g., "sha512-ABC...")
   */
  static generateIntegrity(content: Buffer, algorithm = 'sha512'): string {
    const hash = createHash(algorithm)
    hash.update(content)
    return `${algorithm}-${hash.digest('base64')}`
  }

  /**
   * Compare two integrity strings
   *
   * @param integrity1 - First integrity string
   * @param integrity2 - Second integrity string
   * @returns true if integrities match
   */
  static compareIntegrity(integrity1: string, integrity2: string): boolean {
    if (!integrity1 || !integrity2) {
      return false
    }

    const parts1 = integrity1.split('-')
    const algo1 = parts1[0]
    const hash1 = parts1[1]

    const parts2 = integrity2.split('-')
    const algo2 = parts2[0]
    const hash2 = parts2[1]

    if (!algo1 || !hash1 || !algo2 || !hash2) {
      return false
    }

    // Compare algorithms (case-insensitive) and hashes
    return algo1.toLowerCase() === algo2.toLowerCase() && hash1 === hash2
  }

  /**
   * Validate that package has not been modified
   * Compares calculated hash with stored integrity
   *
   * @param content - Package content
   * @param storedIntegrity - Integrity from lock file
   * @returns true if package matches integrity
   */
  static validatePackageNotModified(
    content: Buffer,
    storedIntegrity: string
  ): boolean {
    try {
      const parts = storedIntegrity.split('-')
      const algorithm = parts[0]
      const expectedHash = parts[1]

      if (!algorithm || !expectedHash) {
        return false
      }

      const hash = createHash(algorithm)
      hash.update(content)
      const calculatedHash = hash.digest('base64')

      return calculatedHash === expectedHash
    } catch {
      return false
    }
  }

  /**
   * Extract algorithm and hash from integrity string
   *
   * @param integrityString - Integrity string to parse
   * @returns Object with algorithm and hash, or null if invalid
   */
  static extractIntegrityInfo(
    integrityString: string
  ): { algorithm: string; hash: string } | null {
    if (!integrityString) {
      return null
    }

    const parts = integrityString.split('-')
    const algorithm = parts[0]
    const hash = parts[1]

    if (!algorithm || !hash) {
      return null
    }

    return { algorithm, hash }
  }

  /**
   * Format verification report for display
   *
   * @param result - Verification result
   * @returns Formatted report string
   */
  static formatReport(result: IntegrityCheckResult): string {
    let report = `Package Integrity Report\n`
    report += `========================\n\n`

    report += `Status: ${result.valid ? '✓ VALID' : '✗ INVALID'}\n\n`

    if (result.packageCount !== undefined) {
      report += `Packages Checked: ${result.packageCount}\n`
      report += `Verified: ${result.checksVerified}\n`
      report += `Skipped: ${result.checksSkipped}\n\n`
    }

    if (result.errors.length > 0) {
      report += `Errors (${result.errors.length}):\n`
      result.errors.forEach((error) => {
        report += `  - ${error}\n`
      })
      report += '\n'
    }

    if (result.warnings.length > 0) {
      report += `⚠ Warnings (${result.warnings.length}):\n`
      result.warnings.forEach((warning) => {
        report += `  - ${warning}\n`
      })
    }

    return report
  }
}
