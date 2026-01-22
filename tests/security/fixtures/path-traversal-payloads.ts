/**
 * Path Traversal Payloads - Test Fixtures
 * Reference: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
 *
 * These payloads test for directory traversal vulnerabilities
 * ALL payloads should be REJECTED or stay within projectRoot
 */

export const PATH_TRAVERSAL_PAYLOADS = {
  // POSIX path traversal
  posixTraversal: [
    { path: '../config.json', description: 'One level up' },
    { path: '../../.env', description: 'Two levels up' },
    { path: '../../../etc/passwd', description: 'Absolute traversal to /etc' },
    {
      path: '../../../../../../../../etc/passwd',
      description: 'Multiple traversals',
    },
    { path: '../../../../../root/.ssh/id_rsa', description: 'SSH key access' },
  ],

  // Windows path traversal
  windowsTraversal: [
    { path: '..\\config.json', description: 'Backslash traversal' },
    {
      path: '..\\..\\windows\\system32\\config\\sam',
      description: 'Windows registry hive',
    },
    {
      path: '..\\..\\..\\..\\etc\\passwd',
      description: 'Cross-platform traversal',
    },
  ],

  // URL-encoded traversal
  urlEncodedTraversal: [
    { path: '%2e%2e/config.json', description: 'URL-encoded ..' },
    { path: '%2e%2e%2fconfig.json', description: 'URL-encoded ../config' },
    { path: '..%2fconfig.json', description: 'Mixed encoding' },
  ],

  // Normalized path tricks
  normalizedTricks: [
    { path: './../../config.json', description: 'Dot-slash prefix' },
    { path: './././../../config.json', description: 'Multiple dot-slash' },
    { path: '..//config.json', description: 'Double slash' },
    { path: '..//../config.json', description: 'Backslash in traversal' },
  ],

  // Symlink traversal (if symlinks exist)
  symlinkTraversal: [
    { path: 'link-to-home', description: 'Symlink to home directory' },
    { path: 'link-to-root', description: 'Symlink to root' },
    { path: '../symlink-to-etc', description: 'Symlink via traversal' },
  ],

  // UNC paths (Windows network paths)
  uncPaths: [
    { path: '\\\\share\\file', description: 'UNC path' },
    { path: '\\\\?\\c:\\file', description: 'UNC extended path' },
  ],

  // Sensitive file targets
  sensitiveFiles: [
    { path: '../.env', description: 'Environment variables' },
    { path: '../.ssh/id_rsa', description: 'SSH private key' },
    { path: '../.aws/credentials', description: 'AWS credentials' },
    { path: '../package.json', description: 'Parent package.json' },
    { path: '../package-lock.json', description: 'Parent lock file' },
    { path: '../../.git/config', description: 'Git configuration' },
  ],
}

export const VALID_PATHS = [
  { path: 'src/config.json', description: 'Relative path within project' },
  { path: 'src/nested/deep/file.js', description: 'Nested relative path' },
  { path: 'config.json', description: 'File in project root' },
  { path: './', description: 'Current directory' },
]

export const INVALID_PATHS = [
  { path: '/../etc/passwd', description: 'Traversal from root' },
  { path: '../../../../../../etc/passwd', description: 'Deep traversal' },
  { path: 'src/../../.env', description: 'Traversal from within project' },
]
