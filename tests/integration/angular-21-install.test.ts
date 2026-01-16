/**
 * Integration Tests: Angular 21 Setup Workflow
 * Tests the complete Angular 21 setup and validation workflow
 *
 * @group integration
 */

import { describe, it, expect } from 'vitest'
import {
    formatValidationResult,
    type ValidationResult,
} from '../../src/core/angular-21-validator.js'
import {
    MonorepoDetector,
    type MonorepoConfig,
} from '../../src/core/angular-21-monorepo.js'
import { AngularRollbackManager } from '../../src/core/angular-21-rollback.js'

describe('Integration: Angular 21 Setup', () => {
    describe('Validation Result Formatting', () => {
        it('should format a complete valid Angular 21 setup result', () => {
            const result: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: [
                    '✅ Angular 21 detected - Fully compatible',
                    '✅ Vitest detected - Remove karma.conf.js if present',
                    '✅ TypeScript 5.3 - Good for type inference',
                ],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('✅ Configuration is valid')
            expect(formatted).toContain('Angular 21 detected')
            expect(formatted).toContain('Vitest detected')
            expect(formatted).toContain('TypeScript 5.3')
        })

        it('should format an Angular 21 setup with warnings', () => {
            const result: ValidationResult = {
                isValid: false,
                errors: ['❌ Vitest and Karma cannot coexist'],
                warnings: [
                    '⚠️  Both @ngrx/signals and @ngrx/store detected',
                    '⚠️  Zoneless mode enabled but zone.js still in package.json',
                ],
                suggestions: [
                    '💡 Migrate: Remove @ngrx/store and use Signal Store exclusively',
                    '💡 Remove zone.js: npm uninstall zone.js',
                ],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('❌ Configuration has errors')
            expect(formatted).toContain('Vitest and Karma cannot coexist')
            expect(formatted).toContain('ngrx/signals and @ngrx/store detected')
            expect(formatted).toContain('Zoneless mode enabled')
        })
    })

    describe('Monorepo Path Generation', () => {
        it('should generate paths for Nx monorepo setup', () => {
            const config: MonorepoConfig = {
                type: 'nx',
                sourceLayout: 'src',
                appPath: '/project/src/app',
                rootPath: '/project',
                isMonorepo: true,
            }

            const appConfigPath = MonorepoDetector.getAppConfigPath(config)
            const storePath = MonorepoDetector.getStorePath(config)
            const vitestPath = MonorepoDetector.getVitestConfigPath(config)

            expect(appConfigPath).toContain('app.config.ts')
            expect(storePath).toContain('stores/app.store.ts')
            expect(vitestPath).toContain('vitest.config.ts')
        })

        it('should generate paths for single project setup', () => {
            const config: MonorepoConfig = {
                type: 'single',
                sourceLayout: 'src',
                appPath: '/project/src/app',
                rootPath: '/project',
                isMonorepo: false,
            }

            const testPath = MonorepoDetector.getTestFilePath(config)
            const iconPath = MonorepoDetector.getComponentPath(config, 'icon')

            expect(testPath).toContain('test.ts')
            expect(iconPath).toContain('icon.component.ts')
        })

        it('should generate paths for pnpm monorepo with packages layout', () => {
            const config: MonorepoConfig = {
                type: 'pnpm',
                sourceLayout: 'packages',
                appPath: '/project/packages/app/src/app',
                rootPath: '/project',
                isMonorepo: true,
            }

            const menuPath = MonorepoDetector.getComponentPath(config, 'menu')
            const vitestPath = MonorepoDetector.getVitestConfigPath(config)

            expect(menuPath).toContain('menu.component.ts')
            // Vitest should always be at project root
            expect(vitestPath).toBe('/project/vitest.config.ts')
        })
    })

    describe('Rollback Manager Transaction Lifecycle', () => {
        it('should manage transaction lifecycle correctly', () => {
            const manager = new AngularRollbackManager()

            // Create transaction
            const tx = manager.createTransaction('tx-setup')
            expect(tx.status).toBe('pending')
            expect(tx.operations).toHaveLength(0)

            // Track operations
            manager.trackCreate(
                'tx-setup',
                '/app/app.config.ts',
                'export const appConfig = { /* ... */ }'
            )
            manager.trackCreate('tx-setup', '/app/test.ts', 'import { ... }')

            expect(tx.operations).toHaveLength(2)
            expect(tx.operations[0]).toBeDefined()
            expect(tx.operations[1]).toBeDefined()
            expect(tx.operations[0]?.type).toBe('create')
            expect(tx.operations[1]?.type).toBe('create')

            // Cleanup
            manager.cleanup()
        })

        it('should handle multiple independent transactions', () => {
            const manager = new AngularRollbackManager()

            const tx1 = manager.createTransaction('tx-files')
            manager.trackCreate('tx-files', '/file1.ts', 'content1')

            const tx2 = manager.createTransaction('tx-config')
            manager.trackCreate('tx-config', '/app.config.ts', 'config')

            expect(tx1.operations).toHaveLength(1)
            expect(tx2.operations).toHaveLength(1)
            expect(tx1.id).not.toBe(tx2.id)
        })
    })

    describe('Complete Angular 21 Setup Simulation', () => {
        it('should validate, plan paths, and prepare transactions for Angular 21 setup', () => {
            // Step 1: Validation result
            const validationResult: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: [
                    '✅ Angular 21 detected - Fully compatible',
                    '✅ Vitest detected - Remove karma.conf.js if present',
                ],
            }

            // Step 2: Monorepo configuration
            const monorepoConfig: MonorepoConfig = {
                type: 'nx',
                sourceLayout: 'src',
                appPath: '/my-ng-project/src/app',
                rootPath: '/my-ng-project',
                isMonorepo: true,
            }

            // Step 3: Transaction planning
            const manager = new AngularRollbackManager()
            const setupTx = manager.createTransaction('tx-angular21-setup')

            // Track file operations
            const appConfigPath = MonorepoDetector.getAppConfigPath(monorepoConfig)
            const storePath = MonorepoDetector.getStorePath(monorepoConfig)

            manager.trackCreate(
                'tx-angular21-setup',
                appConfigPath,
                'export const appConfig = { /* Angular 21 config */ }'
            )
            manager.trackCreate(
                'tx-angular21-setup',
                storePath,
                'export const store = signalStore({ /* ... */ })'
            )

            // Verify complete workflow
            const formatted = formatValidationResult(validationResult)
            expect(formatted).toContain('✅ Configuration is valid')
            expect(appConfigPath).toContain('app.config.ts')
            expect(storePath).toContain('app.store.ts')
            expect(setupTx.operations).toHaveLength(2)
            expect(setupTx.operations[0]).toBeDefined()
            expect(setupTx.operations[1]).toBeDefined()
        })

        it('should handle Angular version conflicts in validation', () => {
            const result: ValidationResult = {
                isValid: false,
                errors: [
                    '❌ Angular 20.0 detected. Angular 21+ required for this configuration.',
                ],
                warnings: [],
                suggestions: [],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('❌ Configuration has errors')
            expect(formatted).toContain('Angular 21+ required')
        })

        it('should handle testing framework conflicts', () => {
            const result: ValidationResult = {
                isValid: false,
                errors: [
                    '❌ Vitest and Karma cannot coexist. Choose one testing framework.',
                ],
                warnings: [],
                suggestions: [
                    '💡 Migration path: Remove Karma entirely and use Vitest with @vitest/angular',
                ],
            }

            const formatted = formatValidationResult(result)

            expect(formatted).toContain('Vitest and Karma cannot coexist')
            expect(formatted).toContain('Migration path')
        })
    })
})
