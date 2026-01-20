# Security Test Fixtures Documentation

## Overview

This directory contains comprehensive security test fixtures used to verify that ConfigJS is protected against common attack vectors.

All test fixtures are categorized by attack type:
- **Shell Injection** - Command execution vulnerabilities
- **Path Traversal** - Directory escape attacks
- **Package Injection** - npm registry poisoning

## Test Fixtures Structure

```
tests/security/fixtures/
├── index.ts                              # Central export & configuration
├── shell-injection-payloads.ts           # Shell injection test cases
├── path-traversal-payloads.ts            # Path traversal test cases
└── package-injection-payloads.ts         # Package injection test cases
```

## Payload Categories

### 1. Shell Injection Payloads

**Reference**: CWE-78 (Improper Neutralization of Special Elements used in an OS Command)

**File**: `shell-injection-payloads.ts`

**Test Cases**:
- Command separators (`;`, `&&`, `||`, `|`, `&`)
- Command substitution (`$()`, `` ` ` ``)
- Variable expansion (`$VAR`, `${VAR}`)
- Glob patterns (`*`, `?`, `[...]`, `{...}`)
- Dangerous commands (rm, curl, wget, nc, etc.)
- Whitespace escapes (`\n`, `\r\t`)
- Unicode/encoding tricks

**Valid Project Names** (should always be accepted):
- Hyphenated: `my-project`
- Camel case: `myProject`
- With numbers: `project123`

**Invalid Project Names** (should always be rejected):
- Path traversal: `../evil`, `../../etc/passwd`
- Hidden files: `.env`, `.`
- Double dots: `..`

### 2. Path Traversal Payloads

**Reference**: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)

**File**: `path-traversal-payloads.ts`

**Test Cases**:
- POSIX traversal: `../`, `../../`, `../../../etc/passwd`
- Windows traversal: `..\`, `..\..\system32\config`
- URL-encoded traversal: `%2e%2e/`, `%2e%2e%2f`
- Normalized tricks: `./../../`, `..//../`
- Symlink traversal
- UNC paths (Windows)
- Sensitive file targets: `.env`, `.ssh/id_rsa`, `.aws/credentials`, `.git/config`

**Valid Paths** (should always be accepted):
- `src/config.json`
- `src/nested/deep/file.js`
- `config.json`

**Invalid Paths** (should always be rejected):
- `/../etc/passwd`
- `../../../../../../etc/passwd`
- `src/../../.env`

### 3. Package Injection Payloads

**Reference**: CWE-77 (Improper Neutralization of Special Elements used in a Command)

**File**: `package-injection-payloads.ts`

**Test Cases**:
- npm flags injection: `--registry`, `--proxy`, `--save`, `--no-save`, `--force`
- Command injection via package list: `lodash && echo pwned`
- URL-based injection: `git+https://evil.com/repo.git`
- Special characters: Newlines, backticks, command substitution
- Scope injection: `@scope/--registry=evil.com`
- Registry formats: `lodash@file:/etc/passwd`

**Valid Package Names**:
- Simple: `lodash`
- With version: `lodash@4.17.21`
- Scoped: `@scope/package`
- Scoped with version: `@scope/package@1.0.0`

**Invalid Package Names**:
- Flag names: `--registry`, `--save`
- Command separators: `pkg; echo`, `pkg && echo`, `pkg | echo`
- Special characters: `` pkg`echo` ``, `pkg$(cmd)`

## Usage in Tests

### Basic Test Structure

```typescript
import { SHELL_INJECTION_PAYLOADS } from './fixtures'

describe('Shell Injection Protection', () => {
  it('should reject all shell injection payloads', () => {
    const payloads = SHELL_INJECTION_PAYLOADS.commandSeparators
    
    for (const { payload, description } of payloads) {
      expect(() => {
        validateProjectName(payload)
      }).toThrow(`Shell injection attempt: ${description}`)
    }
  })
})
```

### Fuzz Testing

```typescript
import { SECURITY_TEST_CONFIG } from './fixtures'

describe('Fuzz Testing', () => {
  it('should handle random inputs safely', () => {
    for (let i = 0; i < SECURITY_TEST_CONFIG.fuzzIterations; i++) {
      const randomInput = generateRandomString(
        SECURITY_TEST_CONFIG.fuzzCharacters,
        SECURITY_TEST_CONFIG.maxStringLength
      )
      
      // Should not crash
      try {
        validateInput(randomInput)
      } catch (e) {
        // OK if validation fails, but should not crash
        expect(e).toBeInstanceOf(Error)
      }
    }
  })
})
```

## Test Outcomes

Each security test should result in one of:

```typescript
enum SecurityTestOutcome {
  PASS = 'PASS',     // Exploit blocked ✅
  FAIL = 'FAIL',     // Exploit succeeded ❌
  ERROR = 'ERROR',   // Test error
  TIMEOUT = 'TIMEOUT' // Test timeout
}
```

## Running Security Tests

```bash
# Run all security tests
npm run test:security

# Run specific security test
npm run test:security -- shell-injection.test.ts

# Run with coverage
npm run test:unit -- tests/security

# Watch mode
npm run test:watch -- tests/security
```

## CI/CD Integration

Security tests are automatically run:
1. On every commit (pre-commit hook)
2. On every push to `main` or `security/main`
3. On every pull request
4. Daily at 2 AM UTC

See `.github/workflows/security-audit.yml` for full configuration.

## Adding New Payloads

To add new attack vectors:

1. **Create new fixture file**: `tests/security/fixtures/new-attack.ts`
2. **Export payloads object** with structure:
   ```typescript
   export const NEW_ATTACK_PAYLOADS = {
     categoryName: [
       { payload: 'value', description: 'What this tests' },
       // ...
     ],
   }
   ```
3. **Export in index.ts**
4. **Create corresponding test**: `tests/security/new-attack.test.ts`
5. **Update this documentation**

## References

- **OWASP Top 10**: https://owasp.org/Top10/
- **CWE-78**: https://cwe.mitre.org/data/definitions/78.html
- **CWE-22**: https://cwe.mitre.org/data/definitions/22.html
- **CWE-77**: https://cwe.mitre.org/data/definitions/77.html
- **npm Security**: https://docs.npmjs.com/cli/audit
- **CVSS v3.1**: https://www.first.org/cvss/v3.1/

## Test Configuration

All tests use `SECURITY_TEST_CONFIG`:
- **testTimeout**: 5000ms per test case
- **fuzzIterations**: 1000 random inputs
- **maxStringLength**: 10000 characters
- **fuzzCharacters**: ASCII + special characters for fuzzing

---

**Document Version**: 1.0  
**Last Updated**: 20 January 2026  
**Related Files**:
- `.github/workflows/security-audit.yml` - CI/CD configuration
- `AUDIT_SECURITE_PERFORMANCE.md` - Full security audit
- `TODO_SECURITY_OPTIMIZATIONS.md` - Implementation roadmap
