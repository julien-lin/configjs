import { describe, it, expect } from 'vitest'
import {
    formatValidationResult,
    type ValidationResult,
} from '../../../src/core/angular-21-validator.js'

describe('Angular 21 Validator', () => {
    describe('formatValidationResult', () => {
        it('should format valid result correctly', () => {
            const result: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: ['✅ All checks passed'],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('Angular 21 Setup Validation')
            expect(formatted).toContain('✅ Configuration is valid')
            expect(formatted).toContain('All checks passed')
        })

        it('should format invalid result with errors', () => {
            const result: ValidationResult = {
                isValid: false,
                errors: ['❌ Critical issue'],
                warnings: [],
                suggestions: [],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('Angular 21 Setup Validation')
            expect(formatted).toContain('❌ Configuration has errors')
            expect(formatted).toContain('🔴 ERRORS (Blocking)')
            expect(formatted).toContain('Critical issue')
        })

        it('should format result with all sections', () => {
            const result: ValidationResult = {
                isValid: false,
                errors: ['Error 1'],
                warnings: ['Warning 1'],
                suggestions: ['Suggestion 1'],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('🔴 ERRORS')
            expect(formatted).toContain('🟡 WARNINGS')
            expect(formatted).toContain('💡 SUGGESTIONS')
            expect(formatted).toContain('Error 1')
            expect(formatted).toContain('Warning 1')
            expect(formatted).toContain('Suggestion 1')
        })

        it('should include header and footer separators', () => {
            const result: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: [],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('═')
            const lines = formatted.split('\n')
            const separatorLines = lines.filter((l) => l.includes('═'))
            expect(separatorLines.length).toBeGreaterThanOrEqual(2)
        })

        it('should not include ERRORS section when no errors', () => {
            const result: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: ['Warning'],
                suggestions: [],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).not.toContain('🔴 ERRORS')
            expect(formatted).toContain('🟡 WARNINGS')
        })

        it('should not include WARNINGS section when no warnings', () => {
            const result: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: ['Suggestion'],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).not.toContain('🟡 WARNINGS')
            expect(formatted).toContain('💡 SUGGESTIONS')
        })

        it('should not include SUGGESTIONS section when no suggestions', () => {
            const result: ValidationResult = {
                isValid: false,
                errors: ['Error'],
                warnings: [],
                suggestions: [],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).not.toContain('💡 SUGGESTIONS')
            expect(formatted).toContain('🔴 ERRORS')
        })
    })
})
