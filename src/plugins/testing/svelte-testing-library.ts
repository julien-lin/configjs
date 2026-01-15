import type {
    Plugin,
    ProjectContext,
    InstallResult,
    ConfigResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin Svelte Testing Library
 *
 * Outil de test pour composants Svelte
 * Documentation officielle : https://testing-library.com/docs/svelte-testing-library/intro
 *
 * Pair avec Vitest pour des tests unitaires robustes
 */
export const svelteTestingLibraryPlugin: Plugin = {
    name: '@testing-library/svelte',
    displayName: 'Svelte Testing Library',
    description: 'Bibliothèque de test pour composants Svelte',
    category: Category.TESTING,
    version: '^4.2.0',

    frameworks: ['svelte'],
    requires: ['vitest'],

    detect: (ctx: ProjectContext): boolean => {
        return ctx.devDependencies['@testing-library/svelte'] !== undefined
    },

    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('Svelte Testing Library is already installed')
            return {
                packages: {},
                success: true,
                message: 'Svelte Testing Library already installed',
            }
        }

        try {
            const packages = [
                '@testing-library/svelte',
                '@testing-library/dom',
                '@testing-library/user-event',
                '@vitest/ui',
            ]

            await installPackages(packages, {
                dev: true,
                packageManager: ctx.packageManager,
                projectRoot: ctx.projectRoot,
                exact: false,
                silent: false,
            })

            logger.info(`Installed ${packages.length} package(s)`)

            return {
                packages: {
                    devDependencies: packages,
                },
                success: true,
                message: 'Svelte Testing Library installed successfully',
            }
        } catch (error) {
            logger.error(`Failed to install Svelte Testing Library: ${String(error)}`)
            return {
                packages: {},
                success: false,
                message: `Installation failed: ${String(error)}`,
            }
        }
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async configure(_ctx: ProjectContext): Promise<ConfigResult> {
        try {
            logger.info('Svelte Testing Library is configured to work with Vitest')

            return {
                success: true,
                message: 'Svelte Testing Library configured successfully',
                files: [],
            }
        } catch (error) {
            logger.error(`Configuration failed: ${String(error)}`)
            return {
                success: false,
                message: `Configuration failed: ${String(error)}`,
                files: [],
            }
        }
    },
}
