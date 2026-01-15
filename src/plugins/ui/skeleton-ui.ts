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
 * Plugin Skeleton UI
 *
 * Libraire de composants UI basée sur Tailwind pour Svelte
 * Documentation officielle : https://skeleton.brainandbonesllc.com
 *
 * Combinaison parfaite avec TailwindCSS pour des composants modernes
 */
export const skeletonUiPlugin: Plugin = {
    name: '@skeletonlabs/skeleton',
    displayName: 'Skeleton UI',
    description: 'Composants UI légers et personnalisables pour Svelte',
    category: Category.UI,
    version: '^2.12.0',

    frameworks: ['svelte'],
    requires: ['tailwindcss'],

    detect: (ctx: ProjectContext): boolean => {
        return ctx.dependencies['@skeletonlabs/skeleton'] !== undefined
    },

    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('Skeleton UI is already installed')
            return {
                packages: {},
                success: true,
                message: 'Skeleton UI already installed',
            }
        }

        try {
            const packages = ['@skeletonlabs/skeleton', '@skeletonlabs/tw-plugin']

            await installPackages(packages, {
                dev: false,
                packageManager: ctx.packageManager,
                projectRoot: ctx.projectRoot,
                exact: false,
                silent: false,
            })

            logger.info(`Installed ${packages.length} package(s)`)

            return {
                packages: {
                    dependencies: packages,
                },
                success: true,
                message: 'Skeleton UI installed successfully',
            }
        } catch (error) {
            logger.error(`Failed to install Skeleton UI: ${String(error)}`)
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
            logger.info('Skeleton UI is configured to work with TailwindCSS')

            return {
                success: true,
                message: 'Skeleton UI configured successfully',
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
