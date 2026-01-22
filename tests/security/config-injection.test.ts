/**
 * Config Injection Security Tests
 *
 * Tests for template injection, prototype pollution, and code injection
 * in configuration file handling
 *
 * @see ConfigSanitizer
 */

import { describe, it, expect } from 'vitest'
import { ConfigSanitizer } from '../../src/core/config-sanitizer.js'

describe('Config Injection Security', () => {
  describe('JSON Config Validation', () => {
    it('should reject invalid JSON syntax', () => {
      const malformed = '{ "key": "value"'
      expect(() => ConfigSanitizer.validateJSON(malformed)).toThrow(
        'Invalid JSON'
      )
    })

    it('should reject prototype pollution in JSON', () => {
      const polluted = '{"__proto__": {"isAdmin": true}}'
      expect(() => ConfigSanitizer.validateJSON(polluted)).toThrow(
        'Prototype pollution detected'
      )
    })

    it('should reject constructor pollution', () => {
      const polluted = '{"constructor": {"prototype": {"isAdmin": true}}}'
      expect(() => ConfigSanitizer.validateJSON(polluted)).toThrow(
        'Prototype pollution detected'
      )
    })

    it('should accept valid JSON config', () => {
      const valid = '{"name": "test", "version": "1.0.0"}'
      expect(() => ConfigSanitizer.validateJSON(valid)).not.toThrow()
    })

    it('should reject JSON arrays instead of objects', () => {
      const array = '[1, 2, 3]'
      expect(() => ConfigSanitizer.validateJSON(array)).toThrow(
        'must be an object'
      )
    })

    it('should reject null JSON', () => {
      const nullJson = 'null'
      expect(() => ConfigSanitizer.validateJSON(nullJson)).toThrow()
    })

    it('should handle nested objects correctly', () => {
      const nested = '{"plugins": {"react": {"version": "18"}}}'
      expect(() => ConfigSanitizer.validateJSON(nested)).not.toThrow()
    })
  })

  describe('JavaScript Config Validation', () => {
    it('should reject eval calls', () => {
      const withEval = 'eval("dangerous code")'
      expect(() => ConfigSanitizer.validateJavaScript(withEval)).toThrow()
    })

    it('should reject Function constructor', () => {
      const withFunction = 'new Function("return dangerousCode")()'
      expect(() => ConfigSanitizer.validateJavaScript(withFunction)).toThrow()
    })

    it('should reject dynamic require', () => {
      const withRequire = 'const fs = require("fs")'
      expect(() => ConfigSanitizer.validateJavaScript(withRequire)).toThrow()
    })

    it('should reject process access', () => {
      const withProcess = 'process.exit(0)'
      expect(() => ConfigSanitizer.validateJavaScript(withProcess)).toThrow()
    })

    it('should reject child_process imports', () => {
      const withChild = 'import { exec } from "child_process"'
      expect(() => ConfigSanitizer.validateJavaScript(withChild)).toThrow()
    })

    it('should reject template literals with expressions', () => {
      const withTemplate = 'const cmd = `${userInput}`'
      expect(() => ConfigSanitizer.validateJavaScript(withTemplate)).toThrow()
    })

    it('should accept safe JavaScript config', () => {
      const safe = 'const config = { plugins: ["react"], devServer: {} }'
      expect(() => ConfigSanitizer.validateJavaScript(safe)).not.toThrow()
    })
  })

  describe('YAML Config Validation', () => {
    it('should reject dangerous YAML tags', () => {
      const withTag = 'env: !!env "HOME"'
      expect(() => ConfigSanitizer.validateYAML(withTag)).toThrow()
    })

    it('should reject Python tags', () => {
      const withPython = 'obj: !!python/object'
      expect(() => ConfigSanitizer.validateYAML(withPython)).toThrow()
    })

    it('should reject custom tags with paths', () => {
      const withPath = 'config: !!custom/tag/path'
      expect(() => ConfigSanitizer.validateYAML(withPath)).toThrow()
    })

    it('should reject template syntax in YAML', () => {
      const withTemplate = 'command: ${process.env.CMD}'
      expect(() => ConfigSanitizer.validateYAML(withTemplate)).toThrow()
    })

    it('should reject backticks in YAML', () => {
      const withBacktick = 'script: `rm -rf /`'
      expect(() => ConfigSanitizer.validateYAML(withBacktick)).toThrow()
    })

    it('should accept valid YAML config', () => {
      const valid = `plugins:
  - react
  - typescript
server:
  port: 3000`
      expect(() => ConfigSanitizer.validateYAML(valid)).not.toThrow()
    })

    it('should reject merge keys with colons', () => {
      const withMerge = 'defaults: &defaults\n  <<: *base'
      expect(() => ConfigSanitizer.validateYAML(withMerge)).toThrow()
    })
  })

  describe('TOML Config Validation', () => {
    it('should reject template literals', () => {
      const withTemplate = 'command = "${process.env.CMD}"'
      expect(() => ConfigSanitizer.validateTOML(withTemplate)).toThrow()
    })

    it('should reject backticks', () => {
      const withBacktick = 'script = `rm -rf /`'
      expect(() => ConfigSanitizer.validateTOML(withBacktick)).toThrow()
    })

    it('should reject exec assignments', () => {
      const withExec = 'exec = "dangerous"'
      expect(() => ConfigSanitizer.validateTOML(withExec)).toThrow()
    })

    it('should accept valid TOML config', () => {
      const valid = `[package]
name = "myapp"
version = "1.0.0"

[dependencies]
react = "18.0.0"`
      expect(() => ConfigSanitizer.validateTOML(valid)).not.toThrow()
    })

    it('should reject invalid TOML key=value', () => {
      const invalid = '= "missing key"'
      expect(() => ConfigSanitizer.validateTOML(invalid)).toThrow()
    })
  })

  describe('Value Escaping', () => {
    it('should escape JSON strings', () => {
      const value = 'test"with\'quotes'
      const escaped = ConfigSanitizer.escapeValue(value, 'json')
      expect(escaped).toBe('"test\\"with\'quotes"')
    })

    it('should escape JavaScript strings', () => {
      const value = "test'with'quotes"
      const escaped = ConfigSanitizer.escapeValue(value, 'js')
      expect(escaped).toContain("test\\'with\\'quotes")
    })

    it('should escape YAML strings with special chars', () => {
      const value = 'test: with # comments'
      const escaped = ConfigSanitizer.escapeValue(value, 'yaml')
      expect(escaped).toContain('"')
    })

    it('should escape TOML strings', () => {
      const value = 'test"with"quotes'
      const escaped = ConfigSanitizer.escapeValue(value, 'toml')
      expect(escaped).toBe('"test\\"with\\"quotes"')
    })
  })

  describe('Safe Merging', () => {
    it('should merge valid configs', () => {
      const original = { plugins: ['react'] }
      const updates = { devServer: { port: 3000 } }
      const result = ConfigSanitizer.mergeSafely(original, updates)
      expect(result).toEqual({
        plugins: ['react'],
        devServer: { port: 3000 },
      })
    })

    it('should reject invalid keys during merge', () => {
      const original = { name: 'test' }
      const updates = { 'invalid@key': 'value' }
      expect(() => ConfigSanitizer.mergeSafely(original, updates)).toThrow(
        'Invalid key name'
      )
    })

    it('should reject invalid key names', () => {
      const original = { name: 'test' }
      const updates = { 'invalid-name$!': 'value' }
      expect(() => ConfigSanitizer.mergeSafely(original, updates)).toThrow(
        'Invalid key name'
      )
    })

    it('should deep merge nested configs', () => {
      const original = { plugins: { react: true } }
      const updates = { plugins: { typescript: true } }
      const result = ConfigSanitizer.mergeSafely(original, updates)
      expect(result['plugins']).toEqual({
        react: true,
        typescript: true,
      })
    })

    it('should accept valid key names', () => {
      const original = { name: 'test' }
      const updates = { valid_key: 'value', 'another-key': 'value2' }
      expect(() => ConfigSanitizer.mergeSafely(original, updates)).not.toThrow()
    })
  })

  describe('Safe Modification Detection', () => {
    it('should detect if JSON is safe to modify', () => {
      const valid = '{"name": "test"}'
      expect(ConfigSanitizer.canSafelyModify(valid, 'json')).toBe(true)
    })

    it('should detect if polluted JSON is unsafe', () => {
      const polluted = '{"__proto__": {"isAdmin": true}}'
      expect(ConfigSanitizer.canSafelyModify(polluted, 'json')).toBe(false)
    })

    it('should detect if JavaScript is safe to modify', () => {
      const safe = 'const config = { plugins: [] }'
      expect(ConfigSanitizer.canSafelyModify(safe, 'js')).toBe(true)
    })

    it('should detect if dangerous JavaScript is unsafe', () => {
      const dangerous = 'eval("code")'
      expect(ConfigSanitizer.canSafelyModify(dangerous, 'js')).toBe(false)
    })

    it('should detect if YAML with dangerous tags is unsafe', () => {
      const dangerous = 'env: !!env "HOME"'
      expect(ConfigSanitizer.canSafelyModify(dangerous, 'yaml')).toBe(false)
    })

    it('should detect if TOML with template syntax is unsafe', () => {
      const dangerous = 'cmd = "${USER}"'
      expect(ConfigSanitizer.canSafelyModify(dangerous, 'toml')).toBe(false)
    })
  })

  describe('Real-World Attack Scenarios', () => {
    it('should prevent command injection in JSON', () => {
      const attack = '{"command": "; rm -rf /;"}'
      expect(() => ConfigSanitizer.validateJSON(attack)).not.toThrow() // JSON itself is valid
      // But values should be escaped when used
      const escaped = ConfigSanitizer.escapeValue('; rm -rf /;', 'json')
      expect(escaped).toContain('"')
    })

    it('should prevent code injection in JavaScript config', () => {
      const attack = `export default {
  onBeforeBuild: () => eval("malicious")
}`
      expect(() => ConfigSanitizer.validateJavaScript(attack)).toThrow()
    })

    it('should prevent YAML deserialization attack', () => {
      const attack = `
data: !!python/object/apply:os.system
args: ["rm -rf /"]
`
      expect(() => ConfigSanitizer.validateYAML(attack)).toThrow()
    })

    it('should prevent TOML injection', () => {
      const attack = `[table]
value = "some string"`
      expect(() => ConfigSanitizer.validateTOML(attack)).not.toThrow() // Valid TOML
      // But the exec= pattern should be caught
      const withExec = 'exec = "dangerous"'
      expect(() => ConfigSanitizer.validateTOML(withExec)).toThrow()
    })
  })
})
