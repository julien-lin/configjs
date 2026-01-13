import { describe, it, expect } from 'vitest'
import { generateCompatibilityRules } from '../../../src/core/compatibility-generator.js'
import type { Plugin } from '../../../src/types/index.js'
import { Category } from '../../../src/types/index.js'

/**
 * Tests pour le générateur de règles de compatibilité
 *
 * Vérifie que les règles sont générées correctement à partir des métadonnées des plugins:
 * - EXCLUSIVE: Génération automatique par catégorie
 * - CONFLICT: Génération depuis plugin.incompatibleWith
 * - REQUIRES: Génération depuis plugin.requires
 * - RECOMMENDS: Génération depuis plugin.recommends
 */
describe('Compatibility Rules Generator', () => {
    // ============================================================
    // Tests EXCLUSIVE (par catégorie)
    // ============================================================

    describe('EXCLUSIVE rules generation', () => {
        it('should generate EXCLUSIVE rule for State Management plugins', () => {
            const plugins: Plugin[] = [
                {
                    name: 'zustand',
                    displayName: 'Zustand',
                    description: 'State management',
                    category: Category.STATE,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: '@reduxjs/toolkit',
                    displayName: 'Redux Toolkit',
                    description: 'State management',
                    category: Category.STATE,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: 'jotai',
                    displayName: 'Jotai',
                    description: 'State management',
                    category: Category.STATE,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const exclusiveRule = rules.find((r) => r.type === 'EXCLUSIVE')

            expect(exclusiveRule).toBeDefined()
            expect(exclusiveRule?.plugins).toHaveLength(3)
            expect(exclusiveRule?.plugins).toContain('zustand')
            expect(exclusiveRule?.plugins).toContain('@reduxjs/toolkit')
            expect(exclusiveRule?.plugins).toContain('jotai')
            expect(exclusiveRule?.severity).toBe('error')
            expect(exclusiveRule?.allowOverride).toBe(false)
        })

        it('should generate EXCLUSIVE rule for Routing plugins', () => {
            const plugins: Plugin[] = [
                {
                    name: 'react-router-dom',
                    displayName: 'React Router',
                    description: 'Routing',
                    category: Category.ROUTING,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: '@tanstack/react-router',
                    displayName: 'TanStack Router',
                    description: 'Routing',
                    category: Category.ROUTING,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const exclusiveRule = rules.find((r) => r.type === 'EXCLUSIVE')

            expect(exclusiveRule).toBeDefined()
            expect(exclusiveRule?.plugins).toHaveLength(2)
            expect(exclusiveRule?.plugins).toContain('react-router-dom')
            expect(exclusiveRule?.plugins).toContain('@tanstack/react-router')
            expect(exclusiveRule?.severity).toBe('error')
        })

        it('should generate EXCLUSIVE rule with warning severity for CSS plugins', () => {
            const plugins: Plugin[] = [
                {
                    name: 'tailwindcss',
                    displayName: 'TailwindCSS',
                    description: 'CSS Framework',
                    category: Category.CSS,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: 'styled-components',
                    displayName: 'Styled Components',
                    description: 'CSS-in-JS',
                    category: Category.CSS,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const exclusiveRule = rules.find((r) => r.type === 'EXCLUSIVE')

            expect(exclusiveRule).toBeDefined()
            expect(exclusiveRule?.severity).toBe('warning') // CSS = warning
            expect(exclusiveRule?.allowOverride).toBe(true) // CSS = can override
        })

        it('should NOT generate EXCLUSIVE rule for single plugin in category', () => {
            const plugins: Plugin[] = [
                {
                    name: 'zustand',
                    displayName: 'Zustand',
                    description: 'State management',
                    category: Category.STATE,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const exclusiveRule = rules.find((r) => r.type === 'EXCLUSIVE')

            expect(exclusiveRule).toBeUndefined()
        })

        it('should NOT generate EXCLUSIVE rule for non-exclusive categories', () => {
            const plugins: Plugin[] = [
                {
                    name: 'axios',
                    displayName: 'Axios',
                    description: 'HTTP client',
                    category: Category.HTTP,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: '@tanstack/react-query',
                    displayName: 'TanStack Query',
                    description: 'HTTP client',
                    category: Category.HTTP,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const exclusiveRule = rules.find((r) => r.type === 'EXCLUSIVE')

            // HTTP n'est pas une catégorie exclusive, donc pas de règle EXCLUSIVE
            expect(exclusiveRule).toBeUndefined()
        })
    })

    // ============================================================
    // Tests CONFLICT (incompatibleWith)
    // ============================================================

    describe('CONFLICT rules generation', () => {
        it('should generate CONFLICT rules from plugin.incompatibleWith', () => {
            const plugins: Plugin[] = [
                {
                    name: 'tailwindcss',
                    displayName: 'TailwindCSS',
                    description: 'CSS Framework',
                    category: Category.CSS,
                    frameworks: ['react'],
                    incompatibleWith: ['styled-components', 'emotion'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: 'styled-components',
                    displayName: 'Styled Components',
                    description: 'CSS-in-JS',
                    category: Category.CSS,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: 'emotion',
                    displayName: 'Emotion',
                    description: 'CSS-in-JS',
                    category: Category.CSS,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const conflictRules = rules.filter((r) => r.type === 'CONFLICT')

            // TailwindCSS → Styled Components
            const tailwindStyledConflict = conflictRules.find(
                (r) =>
                    r.plugins?.includes('tailwindcss') &&
                    r.plugins?.includes('styled-components')
            )
            expect(tailwindStyledConflict).toBeDefined()
            expect(tailwindStyledConflict?.severity).toBe('warning') // CSS conflict = warning

            // TailwindCSS → Emotion
            const tailwindEmotionConflict = conflictRules.find(
                (r) =>
                    r.plugins?.includes('tailwindcss') && r.plugins?.includes('emotion')
            )
            expect(tailwindEmotionConflict).toBeDefined()
        })

        it('should generate bidirectional CONFLICT rules when both plugins declare incompatibility', () => {
            const plugins: Plugin[] = [
                {
                    name: 'react-router-dom',
                    displayName: 'React Router',
                    description: 'Routing',
                    category: Category.ROUTING,
                    frameworks: ['react'],
                    incompatibleWith: ['@tanstack/react-router'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: '@tanstack/react-router',
                    displayName: 'TanStack Router',
                    description: 'Routing',
                    category: Category.ROUTING,
                    frameworks: ['react'],
                    incompatibleWith: ['react-router-dom'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const conflictRules = rules.filter(
                (r) =>
                    r.type === 'CONFLICT' &&
                    r.plugins?.includes('react-router-dom') &&
                    r.plugins?.includes('@tanstack/react-router')
            )

            // Les deux plugins déclarent l'incompatibilité → 2 règles (une par direction)
            // Mais comme ils sont tous deux dans ROUTING, ils auront aussi une règle EXCLUSIVE
            expect(conflictRules.length).toBeGreaterThan(0)
        })

        it('should NOT generate CONFLICT rule if incompatible plugin not in registry', () => {
            const plugins: Plugin[] = [
                {
                    name: 'tailwindcss',
                    displayName: 'TailwindCSS',
                    description: 'CSS Framework',
                    category: Category.CSS,
                    frameworks: ['react'],
                    incompatibleWith: ['non-existent-plugin'], // Plugin inexistant
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const conflictRules = rules.filter((r) => r.type === 'CONFLICT')

            // Aucune règle ne devrait être générée pour un plugin inexistant
            const invalidConflict = conflictRules.find((r) =>
                r.plugins?.includes('non-existent-plugin')
            )
            expect(invalidConflict).toBeUndefined()
        })

        it('should generate CONFLICT with error severity for non-CSS conflicts', () => {
            const plugins: Plugin[] = [
                {
                    name: 'plugin-a',
                    displayName: 'Plugin A',
                    description: 'Test plugin',
                    category: Category.TOOLING,
                    frameworks: ['react'],
                    incompatibleWith: ['plugin-b'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: 'plugin-b',
                    displayName: 'Plugin B',
                    description: 'Test plugin',
                    category: Category.TOOLING,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const conflictRule = rules.find(
                (r) =>
                    r.type === 'CONFLICT' &&
                    r.plugins?.includes('plugin-a') &&
                    r.plugins?.includes('plugin-b')
            )

            expect(conflictRule).toBeDefined()
            expect(conflictRule?.severity).toBe('error') // Non-CSS = error
            expect(conflictRule?.allowOverride).toBe(false)
        })
    })

    // ============================================================
    // Tests REQUIRES (dépendances)
    // ============================================================

    describe('REQUIRES rules generation', () => {
        it('should generate REQUIRES rules from plugin.requires', () => {
            const plugins: Plugin[] = [
                {
                    name: 'shadcn-ui',
                    displayName: 'Shadcn/ui',
                    description: 'UI components',
                    category: Category.UI,
                    frameworks: ['react'],
                    requires: ['tailwindcss', 'class-variance-authority'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const requiresRule = rules.find((r) => r.type === 'REQUIRES')

            expect(requiresRule).toBeDefined()
            expect(requiresRule?.plugin).toBe('shadcn-ui')
            expect(requiresRule?.requires).toEqual([
                'tailwindcss',
                'class-variance-authority',
            ])
            expect(requiresRule?.framework).toBe('react')
            expect(requiresRule?.severity).toBe('error')
            expect(requiresRule?.allowOverride).toBe(false)
        })

        it('should generate one REQUIRES rule per framework', () => {
            const plugins: Plugin[] = [
                {
                    name: 'multi-framework-plugin',
                    displayName: 'Multi Framework',
                    description: 'Test plugin',
                    category: Category.UTILS,
                    frameworks: ['react', 'vue', 'svelte'],
                    requires: ['dependency-a', 'dependency-b'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const requiresRules = rules.filter((r) => r.type === 'REQUIRES')

            expect(requiresRules).toHaveLength(3) // Un par framework
            expect(requiresRules.map((r) => r.framework)).toEqual(
                expect.arrayContaining(['react', 'vue', 'svelte'])
            )
        })

        it('should NOT generate REQUIRES rule if plugin.requires is empty', () => {
            const plugins: Plugin[] = [
                {
                    name: 'standalone-plugin',
                    displayName: 'Standalone',
                    description: 'Test plugin',
                    category: Category.UTILS,
                    frameworks: ['react'],
                    requires: [], // Pas de dépendances
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const requiresRule = rules.find((r) => r.type === 'REQUIRES')

            expect(requiresRule).toBeUndefined()
        })
    })

    // ============================================================
    // Tests RECOMMENDS (recommandations)
    // ============================================================

    describe('RECOMMENDS rules generation', () => {
        it('should generate RECOMMENDS rules from plugin.recommends', () => {
            const plugins: Plugin[] = [
                {
                    name: 'react-router-dom',
                    displayName: 'React Router',
                    description: 'Routing',
                    category: Category.ROUTING,
                    frameworks: ['react'],
                    recommends: ['@types/react-router-dom'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const recommendsRule = rules.find((r) => r.type === 'RECOMMENDS')

            expect(recommendsRule).toBeDefined()
            expect(recommendsRule?.plugin).toBe('react-router-dom')
            expect(recommendsRule?.recommends).toEqual(['@types/react-router-dom'])
            expect(recommendsRule?.framework).toBe('react')
            expect(recommendsRule?.severity).toBe('info')
        })

        it('should generate one RECOMMENDS rule per framework', () => {
            const plugins: Plugin[] = [
                {
                    name: 'multi-framework-plugin',
                    displayName: 'Multi Framework',
                    description: 'Test plugin',
                    category: Category.UTILS,
                    frameworks: ['react', 'vue'],
                    recommends: ['recommended-plugin'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const recommendsRules = rules.filter((r) => r.type === 'RECOMMENDS')

            expect(recommendsRules).toHaveLength(2)
            expect(recommendsRules.map((r) => r.framework)).toEqual(
                expect.arrayContaining(['react', 'vue'])
            )
        })

        it('should NOT generate RECOMMENDS rule if plugin.recommends is empty', () => {
            const plugins: Plugin[] = [
                {
                    name: 'no-recommends-plugin',
                    displayName: 'No Recommends',
                    description: 'Test plugin',
                    category: Category.UTILS,
                    frameworks: ['react'],
                    recommends: [],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            const recommendsRule = rules.find((r) => r.type === 'RECOMMENDS')

            expect(recommendsRule).toBeUndefined()
        })
    })

    // ============================================================
    // Tests globaux
    // ============================================================

    describe('Global behavior', () => {
        it('should generate all types of rules from a complex plugin set', () => {
            const plugins: Plugin[] = [
                // State management (EXCLUSIVE)
                {
                    name: 'zustand',
                    displayName: 'Zustand',
                    description: 'State',
                    category: Category.STATE,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: '@reduxjs/toolkit',
                    displayName: 'Redux',
                    description: 'State',
                    category: Category.STATE,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                // UI avec dépendances (REQUIRES)
                {
                    name: 'shadcn-ui',
                    displayName: 'Shadcn',
                    description: 'UI',
                    category: Category.UI,
                    frameworks: ['react'],
                    requires: ['tailwindcss'],
                    recommends: ['@radix-ui/react-icons'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                // CSS avec conflit (CONFLICT)
                {
                    name: 'tailwindcss',
                    displayName: 'Tailwind',
                    description: 'CSS',
                    category: Category.CSS,
                    frameworks: ['react'],
                    incompatibleWith: ['styled-components'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
                {
                    name: 'styled-components',
                    displayName: 'Styled',
                    description: 'CSS',
                    category: Category.CSS,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)

            // Vérifier que tous les types de règles sont générés
            expect(rules.some((r) => r.type === 'EXCLUSIVE')).toBe(true)
            expect(rules.some((r) => r.type === 'CONFLICT')).toBe(true)
            expect(rules.some((r) => r.type === 'REQUIRES')).toBe(true)
            expect(rules.some((r) => r.type === 'RECOMMENDS')).toBe(true)
        })

        it('should return empty array for empty plugin list', () => {
            const rules = generateCompatibilityRules([])
            expect(rules).toEqual([])
        })

        it('should handle plugins with no metadata gracefully', () => {
            const plugins: Plugin[] = [
                {
                    name: 'minimal-plugin',
                    displayName: 'Minimal',
                    description: 'Test',
                    category: Category.UTILS,
                    frameworks: ['react'],
                    install: async () => ({ packages: {}, success: true }),
                    configure: async () => ({ files: [], success: true }),
                },
            ]

            const rules = generateCompatibilityRules(plugins)
            // Devrait fonctionner sans erreur, même sans métadonnées
            expect(rules).toBeDefined()
        })
    })
})
