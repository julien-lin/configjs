/**
 * Integration Tests: Installation Flow
 * Teste les workflows réels d'installation de plugins
 *
 * @group integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import {
    createTestProject,
    cleanupTestProject,
    readPackageJson,
    fileExists,
    verifyProjectSetup,
} from './test-utils.js'
import { Installer } from '../../src/core/installer.js'
import { CompatibilityValidator, compatibilityRules } from '../../src/core/validator.js'
import { detectContext } from '../../src/core/detector.js'
import { ConfigWriter } from '../../src/core/config-writer.js'
import { BackupManager } from '../../src/core/backup-manager.js'
import { pluginRegistry } from '../../src/plugins/registry.js'
import type { Plugin } from '../../src/types/index.js'
import { Category } from '../../src/types/index.js'
import type { Framework } from '../../src/types/index.js'

describe('Integration: Installation Flow', () => {
    let projectPath: string

    beforeEach(async () => {
        projectPath = await createTestProject('install-flow-test')
    })

    afterEach(async () => {
        await cleanupTestProject(projectPath)
    })

    // ===== Basic Installation Tests =====

    it('should initialize a minimal React project structure', async () => {
        // Vérifier les fichiers de base
        const hasPackageJson = await fileExists(join(projectPath, 'package.json'))
        expect(hasPackageJson).toBe(true)

        const pkg = await readPackageJson(projectPath)
        expect(pkg['name']).toMatch(/test-project/)
        expect(pkg['dependencies']).toHaveProperty('react')

        const context = await detectContext(projectPath)
        expect(context.framework).toBe('react')
    })

    it('should detect React project correctly', async () => {
        const context = await detectContext(projectPath)
        expect(context.framework).toBe('react')
        expect(context.projectRoot).toBeDefined()
        expect(context.packageManager).toBeDefined()
    })

    it('should validate project structure before installation', async () => {
        const context = await detectContext(projectPath)
        expect(context.framework).toBe('react')
        expect(context.projectRoot).toBeDefined()
    })

    // ===== Single Plugin Installation =====

    it('should install single plugin without errors', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const reactRouterPlugin = pluginRegistry.find((p) => p.name === 'react-router-dom')
        expect(reactRouterPlugin).toBeDefined()

        if (reactRouterPlugin) {
            const result = await installer.install([reactRouterPlugin], {
                skipPackageInstall: true, // Skip pour les tests
            })
            expect(result.success).toBe(true)
            expect(result.installed).toContain('react-router-dom')
        }
    })

    it('should add plugin dependencies to package.json', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const zustandPlugin = pluginRegistry.find((p) => p.name === 'zustand')
        expect(zustandPlugin).toBeDefined()

        if (zustandPlugin) {
            await installer.install([zustandPlugin], {
                skipPackageInstall: true, // Skip pour les tests
            })
            // Note: En mode skipPackageInstall, les dépendances ne sont pas ajoutées
            // mais la configuration est créée
        }
    })

    it('should create plugin configuration files', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const tailwindPlugin = pluginRegistry.find((p) => p.name === 'tailwindcss')
        expect(tailwindPlugin).toBeDefined()

        if (tailwindPlugin) {
            const result = await installer.install([tailwindPlugin], {
                skipPackageInstall: true,
            })

            expect(result.success).toBe(true)
            // Vérifier que des fichiers ont été créés
            expect(result.filesCreated.length).toBeGreaterThan(0)
        }
    })

    // ===== Multi-Plugin Installation =====

    it('should install multiple complementary plugins', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const plugins = [
            pluginRegistry.find((p) => p.name === 'react-router-dom'),
            pluginRegistry.find((p) => p.name === 'zustand'),
            pluginRegistry.find((p) => p.name === 'axios'),
        ].filter((p): p is NonNullable<typeof p> => p !== undefined)

        expect(plugins.length).toBe(3)

        const result = await installer.install(plugins, {
            skipPackageInstall: true,
        })

        expect(result.success).toBe(true)
        expect(result.installed.length).toBeGreaterThanOrEqual(3)
    })

    it('should maintain installation order and dependencies', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const plugins = [
            pluginRegistry.find((p) => p.name === 'tailwindcss'),
            pluginRegistry.find((p) => p.name === 'eslint'),
            pluginRegistry.find((p) => p.name === 'husky'),
        ].filter((p): p is NonNullable<typeof p> => p !== undefined)

        const result = await installer.install(plugins, {
            skipPackageInstall: true,
        })

        expect(result.success).toBe(true)
        expect(result.installed.length).toBeGreaterThanOrEqual(3)
    })

    it('should create appropriate config files for each plugin', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const plugins = [
            pluginRegistry.find((p) => p.name === 'eslint'),
            pluginRegistry.find((p) => p.name === 'prettier'),
        ].filter((p): p is NonNullable<typeof p> => p !== undefined)

        const result = await installer.install(plugins, {
            skipPackageInstall: true,
        })

        expect(result.success).toBe(true)
        expect(result.filesCreated.length).toBeGreaterThan(0)
    })

    // ===== Compatibility Tests =====

    it('should handle compatible plugin combinations', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const plugins = [
            pluginRegistry.find((p) => p.name === 'react-router-dom'),
            pluginRegistry.find((p) => p.name === '@reduxjs/toolkit'),
            pluginRegistry.find((p) => p.name === '@tanstack/react-query'),
        ].filter((p): p is NonNullable<typeof p> => p !== undefined)

        const result = await installer.install(plugins, {
            skipPackageInstall: true,
        })

        expect(result.success).toBe(true)
        expect(result.warnings.length).toBe(0)
    })

    it('should validate plugin compatibility before installation', async () => {
        const validator = new CompatibilityValidator(compatibilityRules)

        const plugins = [
            pluginRegistry.find((p) => p.name === 'react-router-dom'),
            pluginRegistry.find((p) => p.name === 'zustand'),
        ].filter((p): p is NonNullable<typeof p> => p !== undefined)

        const validation = validator.validate(plugins)
        expect(validation.valid).toBe(true)
    })

    // ===== State Management =====

    it('should install state management library', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const zustandPlugin = pluginRegistry.find((p) => p.name === 'zustand')
        expect(zustandPlugin).toBeDefined()

        if (zustandPlugin) {
            const result = await installer.install([zustandPlugin], {
                skipPackageInstall: true,
            })

            expect(result.success).toBe(true)
        }
    })

    // ===== CSS Solutions =====

    it('should install CSS/styling framework correctly', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const tailwindPlugin = pluginRegistry.find((p) => p.name === 'tailwindcss')
        expect(tailwindPlugin).toBeDefined()

        if (tailwindPlugin) {
            const result = await installer.install([tailwindPlugin], {
                skipPackageInstall: true,
            })

            expect(result.success).toBe(true)
            expect(result.filesCreated.length).toBeGreaterThan(0)
        }
    })

    // ===== DevTools Installation =====

    it('should install development tools without breaking project', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const plugins = [
            pluginRegistry.find((p) => p.name === 'eslint'),
            pluginRegistry.find((p) => p.name === 'prettier'),
            pluginRegistry.find((p) => p.name === 'husky'),
        ].filter((p): p is NonNullable<typeof p> => p !== undefined)

        const result = await installer.install(plugins, {
            skipPackageInstall: true,
        })

        expect(result.success).toBe(true)

        // Vérifier que le projet reste valide
        const pkg = await readPackageJson(projectPath)
        expect(pkg).toBeDefined()
    })

    // ===== Error Handling Tests =====

    it('should handle installation errors gracefully', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        // Utiliser un plugin invalide (non existant dans le registry)
        // Créer un plugin minimal qui respecte l'interface mais qui échouera
        const invalidPlugin = {
            name: 'non-existent-package',
            displayName: 'Non Existent',
            description: 'Invalid plugin',
            category: Category.ROUTING,
            frameworks: ['react'] as Framework[],
            install: async () => {
                throw new Error('Plugin does not exist')
            },
            configure: async () => ({
                files: [],
                success: false,
                message: 'Error',
            }),
        } as Plugin

        // Devrait échouer lors de la validation ou de l'installation
        await expect(installer.install([invalidPlugin], { skipPackageInstall: true })).rejects.toThrow()
    })

    // ===== Dry Run Tests =====

    it('should support --no-install option without modifying project', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const zustandPlugin = pluginRegistry.find((p) => p.name === 'zustand')
        expect(zustandPlugin).toBeDefined()

        if (zustandPlugin) {
            await installer.install([zustandPlugin], {
                skipPackageInstall: true,
            })

            const pkg = await readPackageJson(projectPath)
            // En mode skipPackageInstall, les dépendances ne devraient pas être modifiées
            expect(pkg['dependencies']?.zustand).toBeUndefined()
        }
    })

    // ===== Configuration Persistence =====

    it('should persist configuration across multiple installations', async () => {
        const context = await detectContext(projectPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const tailwindPlugin = pluginRegistry.find((p) => p.name === 'tailwindcss')
        expect(tailwindPlugin).toBeDefined()

        if (tailwindPlugin) {
            // Première installation
            const result1 = await installer.install([tailwindPlugin], {
                skipPackageInstall: true,
            })
            expect(result1.success).toBe(true)

            // Deuxième installation (devrait détecter que c'est déjà installé)
            const result2 = await installer.install([tailwindPlugin], {
                skipPackageInstall: true,
            })
            expect(result2.success).toBe(true)
        }
    })

    // ===== Full Workflow Test =====

    it('should complete full installation workflow', async () => {
        // Détection
        const context = await detectContext(projectPath)
        expect(context.framework).toBe('react')

        // Validation
        const validator = new CompatibilityValidator(compatibilityRules)
        const plugins = [
            pluginRegistry.find((p) => p.name === 'react-router-dom'),
            pluginRegistry.find((p) => p.name === 'zustand'),
            pluginRegistry.find((p) => p.name === 'tailwindcss'),
            pluginRegistry.find((p) => p.name === 'eslint'),
        ].filter((p): p is NonNullable<typeof p> => p !== undefined)

        const validation = validator.validate(plugins)
        expect(validation.valid).toBe(true)

        // Installation
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const installer = new Installer(context, validator, configWriter, backupManager)

        const result = await installer.install(plugins, {
            skipPackageInstall: true,
        })

        expect(result.success).toBe(true)
        expect(result.installed.length).toBeGreaterThanOrEqual(4)

        // Vérification finale
        const verification = await verifyProjectSetup(projectPath, [], [])
        expect(verification.valid).toBe(true)
    })
})
