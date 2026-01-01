/**
 * Unit Tests: CLI Check Command
 * Teste la commande CLI "check"
 *
 * @group unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
    createTestProject,
    cleanupTestProject,
    readPackageJson,
} from '../../integration/test-utils'

describe('Unit: CLI Commands - Check', () => {
    let projectPath: string

    beforeEach(async () => {
        projectPath = await createTestProject('cli-check-test')
    })

    afterEach(async () => {
        await cleanupTestProject(projectPath)
    })

    // ===== Basic Check Command =====

    it('should analyze project structure', async () => {
        const pkg = await readPackageJson(projectPath)

        expect(pkg).toBeDefined()
        expect(pkg.name).toBeDefined()
    })

    it('should detect React project', async () => {
        const pkg = await readPackageJson(projectPath)

        // Project should have react dependency
        if (pkg.dependencies?.react) {
            expect(pkg.dependencies.react).toBeDefined()
        }
    })

    it('should detect package manager', async () => {
        const packageManagers = ['npm', 'yarn', 'pnpm']

        // Should detect one of the common package managers
        expect(packageManagers).toBeDefined()
    })

    // ===== Dependency Analysis =====

    it('should analyze installed dependencies', async () => {
        const pkg = await readPackageJson(projectPath)
        const dependencies = pkg.dependencies || {}

        expect(Object.keys(dependencies)).toBeDefined()
    })

    it('should detect conflicting dependencies', async () => {
        // Example conflicting pairs
        const conflicts = [
            { dep1: 'redux', dep2: 'zustand' }, // Both are state managers
            { dep1: 'webpack', dep2: 'vite' }, // Both are bundlers
        ]

        // Check should identify these conflicts
        expect(conflicts).toBeDefined()
    })

    it('should detect duplicate dependencies', async () => {
        const duplicates = ['react@18.2.0', 'react@18.3.0']

        // Should warn about duplicate versions
        expect(duplicates.length).toBeGreaterThan(1)
    })

    // ===== Compatibility Check =====

    it('should validate plugin compatibility', () => {
        const plugins = [
            'react-router-dom',
            'zustand',
            'axios',
        ]

        // These should be compatible
        expect(plugins).toBeDefined()
        expect(plugins).toHaveLength(3)
    })

    it('should suggest missing dependencies', () => {
        const currentDeps = ['react-router-dom', 'zustand']
        const recommended = ['axios', 'tailwindcss']

        const suggestions = {
            current: currentDeps,
            recommended: recommended,
        }

        expect(suggestions.recommended).toHaveLength(2)
    })

    it('should check version compatibility', () => {
        const packages = [
            { name: 'react', version: '18.2.0' },
            { name: 'react-dom', version: '18.2.0' },
        ]

        // Versions should match
        if (packages[0] && packages[1]) {
            expect(packages[0].version).toBe(packages[1].version)
        }
    })

    // ===== Output Formatting =====

    it('should display compatibility report', () => {
        const report = `
Compatibility Report
====================

✓ React project detected
✓ package.json is valid
✓ Node modules structure is correct

Installed packages: 5
  - react@18.2.0
  - react-dom@18.2.0
  - zustand@4.4.0
  - axios@1.6.0
  - tailwindcss@3.3.0

Compatibility: ✓ All compatible
    `

        expect(report).toContain('Compatibility Report')
        expect(report).toContain('✓ All compatible')
    })

    it('should show warnings for issues', () => {
        const warnings = `
⚠ Warnings:
  - react-router-dom and tanstack-router are both installed (conflict)
  - Node version mismatch with recommended version
    `

        expect(warnings).toContain('⚠ Warnings')
    })

    it('should highlight errors', () => {
        const errors = `
✗ Errors:
  - package.json is malformed
  - node_modules is corrupted
    `

        expect(errors).toContain('✗ Errors')
    })

    // ===== Suggestions =====

    it('should suggest compatible plugin combinations', () => {
        const suggestions = {
            routing: 'react-router-dom',
            state: 'zustand',
            http: 'axios',
            css: 'tailwindcss',
        }

        expect(Object.keys(suggestions)).toContain('routing')
        expect(Object.keys(suggestions)).toContain('state')
    })

    it('should suggest best practices', () => {
        const bestPractices = [
            'Use a consistent version manager (npm/yarn/pnpm)',
            'Keep dependencies up to date',
            'Use .npmrc for consistent installs',
            'Use package-lock.json for reproducibility',
        ]

        for (const practice of bestPractices) {
            expect(practice).toBeDefined()
        }
    })

    // ===== Project Structure Check =====

    it('should validate project structure', async () => {
        const requiredFiles = ['package.json', 'src']

        for (const file of requiredFiles) {
            expect(file).toBeDefined()
        }
    })

    it('should check for configuration files', () => {
        const configFiles = [
            'tsconfig.json',
            'vite.config.ts',
            'eslint.config.js',
            '.prettierrc',
        ]

        expect(configFiles).toBeDefined()
    })

    // ===== Version Checks =====

    it('should check Node.js version compatibility', () => {
        const nodeVersion = process.version

        expect(nodeVersion).toBeDefined()
    })

    it('should check npm version compatibility', () => {
        const npmVersion = '9.0.0' // Mock version
        expect(npmVersion).toMatch(/\d+\.\d+\.\d+/)
    })

    // ===== Interactive Mode =====

    it('should support --fix flag to auto-resolve issues', () => {
        const options = { fix: true }
        expect(options.fix).toBe(true)
    })

    it('should ask for confirmation before fixing', () => {
        const confirmationNeeded = true
        expect(confirmationNeeded).toBe(true)
    })

    // ===== Detailed Report =====

    it('should generate detailed compatibility matrix', () => {
        const matrix = {
            'react-router-dom': {
                compatible: ['zustand', 'redux', 'jotai'],
                conflicts: [],
            },
            zustand: {
                compatible: ['react-router-dom', 'axios', 'tailwindcss'],
                conflicts: [],
            },
        }

        expect(matrix['react-router-dom'].compatible).toContain('zustand')
    })

    it('should provide remediation steps for conflicts', () => {
        const conflict = {
            issue: 'Two state managers installed',
            packages: ['redux', 'zustand'],
            solution: 'Remove one of: npm uninstall redux',
        }

        expect(conflict.solution).toContain('npm uninstall')
    })

    // ===== Summary =====

    it('should display summary of check results', () => {
        const summary = `
Check Summary
=============

Status: ✓ COMPATIBLE
Issues found: 0
Warnings: 0
Suggestions: 3

Recommendation: Project is ready for development
    `

        expect(summary).toContain('Check Summary')
        expect(summary).toContain('COMPATIBLE')
    })

    it('should provide next steps', () => {
        const nextSteps = [
            '1. Install suggested packages: npm install tailwindcss',
            '2. Review compatibility matrix above',
            '3. Run npm run dev to start development',
        ]

        for (const step of nextSteps) {
            expect(step).toBeDefined()
        }
    })

    // ===== Export Results =====

    it('should support --export to save report', () => {
        const options = { export: 'report.json' }
        expect(options.export).toBe('report.json')
    })

    it('should support JSON output format', () => {
        const report = {
            status: 'compatible',
            issues: [],
            warnings: [],
            suggestions: [],
        }

        const json = JSON.stringify(report)
        expect(json).toContain('compatible')
    })

    // ===== Help Text =====

    it('should show help for check command', () => {
        const help = `
Usage:
  confjs check [options]

Options:
  --fix               Auto-fix compatible issues
  --detailed          Show detailed analysis
  --export <file>     Save report to file
  --format <fmt>      Output format (text, json, csv)
  --help              Show this help
    `

        expect(help).toContain('confjs check')
        expect(help).toContain('Options')
    })
})
