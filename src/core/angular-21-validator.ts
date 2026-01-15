import fs from 'fs/promises'
import { join } from 'path'
import { getModuleLogger } from '../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Validation result for Angular 21 setup
 */
export interface ValidationResult {
    isValid: boolean
    errors: string[] // Incompatibilités bloquantes
    warnings: string[] // Incompatibilités acceptables
    suggestions: string[] // Recommendations
}

/**
 * Detects incompatibilities in Angular 21 project setup
 * Validates:
 * - Vitest + Karma coexistence
 * - Zoneless + zone.js coexistence
 * - NgRx Signals + NgRx Store coexistence
 * - Old library compatibility with Zoneless
 */
export async function validateAngularSetup(
    projectRoot: string
): Promise<ValidationResult> {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
    }

    try {
        // Read package.json
        const packageJsonPath = join(projectRoot, 'package.json')
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent)

        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        }

        // ============================================================
        // 1. Check Vitest + Karma coexistence
        // ============================================================
        const hasVitest = !!allDeps['vitest'] || !!allDeps['@vitest/angular']
        const hasKarma = !!allDeps['karma']

        if (hasVitest && hasKarma) {
            result.isValid = false
            result.errors.push(
                '❌ Vitest and Karma cannot coexist. Choose one testing framework.' +
                '\n   → Run: npm uninstall karma karma-jasmine karma-chrome-launcher'
            )
        }

        if (hasVitest) {
            result.suggestions.push(
                '✅ Vitest detected - Remove karma.conf.js if present'
            )
        }

        // ============================================================
        // 2. Check Zoneless + zone.js coexistence
        // ============================================================
        const hasZoneless = await checkZonelessMode(projectRoot)
        const hasZoneJs = !!allDeps['zone.js']

        if (hasZoneless && hasZoneJs) {
            result.warnings.push(
                '⚠️  Zoneless mode enabled but zone.js still in package.json.' +
                '\n   → This will cause unexpected behavior.' +
                '\n   → Remove zone.js: npm uninstall zone.js'
            )
        }

        if (hasZoneless) {
            result.suggestions.push('✅ Zoneless mode active - Remove zone.js entry')
        }

        // ============================================================
        // 3. Check NgRx Signals + NgRx Store Redux
        // ============================================================
        const hasNgrxSignals = !!allDeps['@ngrx/signals']
        const hasNgrxStore = !!allDeps['@ngrx/store']

        if (hasNgrxSignals && hasNgrxStore) {
            result.warnings.push(
                '⚠️  Both @ngrx/signals and @ngrx/store detected.' +
                '\n   → Avoid mixing Signal Store with Redux Store.' +
                '\n   → Consider removing @ngrx/store if using Signal Store.'
            )
            result.suggestions.push(
                '💡 Migrate: Remove @ngrx/store and use Signal Store exclusively'
            )
        }

        // ============================================================
        // 4. Check for old library incompatibilities with Zoneless
        // ============================================================
        if (hasZoneless) {
            const oldLibraries = checkOldLibraries(allDeps)
            if (oldLibraries.length > 0) {
                result.warnings.push(
                    '⚠️  Detected libraries incompatible with Zoneless:' +
                    `\n   ${oldLibraries.map((lib) => `→ ${lib}`).join('\n   ')}` +
                    '\n   These libraries expect zone.js. Consider upgrading or keeping zone.js.'
                )
                result.suggestions.push(
                    '💡 Either: 1) Upgrade old libraries, or 2) Revert to zone.js'
                )
            }
        }

        // ============================================================
        // 5. Check for Angular version compatibility
        // ============================================================
        const angularVersion = parseVersion(allDeps['@angular/core'] || '')
        if (angularVersion.major < 21) {
            result.errors.push(
                `❌ Angular ${angularVersion.major}.${angularVersion.minor} detected. ` +
                'Angular 21+ required for this configuration.'
            )
            result.isValid = false
        } else if (angularVersion.major === 21) {
            result.suggestions.push('✅ Angular 21 detected - Fully compatible')
        } else {
            result.suggestions.push(
                `✅ Angular ${angularVersion.major} detected - Compatible with newer features`
            )
        }

        // ============================================================
        // 6. Check for TypeScript version
        // ============================================================
        const tsVersion = parseVersion(
            packageJson.devDependencies?.['typescript'] || ''
        )
        if (tsVersion.major >= 5) {
            result.suggestions.push(
                `✅ TypeScript ${tsVersion.major}.${tsVersion.minor} - Good for type inference`
            )
        } else {
            result.warnings.push(
                `⚠️  TypeScript ${tsVersion.major}.${tsVersion.minor} detected. ` +
                'Recommend upgrading to TS 5+ for better type inference.'
            )
        }

        return result
    } catch (error) {
        logger.error(
            `Failed to validate Angular setup: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return {
            isValid: false,
            errors: [
                `Failed to validate setup: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ],
            warnings: [],
            suggestions: [],
        }
    }
}

/**
 * Check if Zoneless mode is enabled in app.config.ts
 */
async function checkZonelessMode(projectRoot: string): Promise<boolean> {
    try {
        const appConfigPath = join(projectRoot, 'src/app/app.config.ts')
        const content = await fs.readFile(appConfigPath, 'utf-8')
        return content.includes('provideExperimentalZonelessChangeDetection')
    } catch {
        return false
    }
}

/**
 * Check for libraries known to be incompatible with Zoneless
 */
function checkOldLibraries(deps: Record<string, string>): string[] {
    const incompatibleLibraries = [
        'ngx-bootstrap', // < v14
        'primeng', // < v16
        'material-design-icons',
        '@syncfusion', // < v22
        'ag-grid-angular', // < v30
    ]

    return Object.keys(deps).filter((dep) => {
        // Check if any incompatible library is installed
        return incompatibleLibraries.some((lib) => dep.includes(lib))
    })
}

/**
 * Parse version string like "1.2.3" or "^1.2.3"
 */
function parseVersion(versionString: string): {
    major: number
    minor: number
    patch: number
} {
    // Remove ^ ~ > < = etc.
    const cleanVersion = versionString.replace(/^[^\d]+/, '')
    const parts = cleanVersion.split('.')

    return {
        major: parseInt(parts[0] || '0', 10),
        minor: parseInt(parts[1] || '0', 10),
        patch: parseInt(parts[2] || '0', 10),
    }
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
    let output = '\n📋 Angular 21 Setup Validation\n'
    output += '═'.repeat(50) + '\n'

    if (result.isValid) {
        output += '✅ Configuration is valid\n'
    } else {
        output += '❌ Configuration has errors (must fix before proceeding)\n'
    }

    if (result.errors.length > 0) {
        output += '\n🔴 ERRORS (Blocking):\n'
        result.errors.forEach((error) => {
            output += `   ${error}\n`
        })
    }

    if (result.warnings.length > 0) {
        output += '\n🟡 WARNINGS (Caution):\n'
        result.warnings.forEach((warning) => {
            output += `   ${warning}\n`
        })
    }

    if (result.suggestions.length > 0) {
        output += '\n💡 SUGGESTIONS:\n'
        result.suggestions.forEach((suggestion) => {
            output += `   ${suggestion}\n`
        })
    }

    output += '\n' + '═'.repeat(50) + '\n'
    return output
}
