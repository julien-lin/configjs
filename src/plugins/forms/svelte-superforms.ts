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
 * Plugin SvelteKit Superforms
 *
 * Bibliothèque légère et performante pour les formulaires Svelte
 * Documentation officielle : https://superforms.rocks
 *
 * Alternative moderne à Formik pour Svelte
 */
export const svelteFormsPlugin: Plugin = {
    name: 'sveltekit-superforms',
    displayName: 'SvelteKit Superforms',
    description: 'Gestion des formulaires avec validation côté serveur et client',
    category: Category.FORMS,
    version: '^2.17.0',

    frameworks: ['svelte'],

    detect: (ctx: ProjectContext): boolean => {
        return ctx.dependencies['sveltekit-superforms'] !== undefined
    },

    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('SvelteKit Superforms is already installed')
            return {
                packages: {},
                success: true,
                message: 'SvelteKit Superforms already installed',
            }
        }

        try {
            const packages = ['sveltekit-superforms']

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
                message: 'SvelteKit Superforms installed successfully',
            }
        } catch (error) {
            logger.error(`Failed to install SvelteKit Superforms: ${String(error)}`)
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
            logger.info(
                'SvelteKit Superforms is ready to use, import from sveltekit-superforms'
            )

            return {
                success: true,
                message: 'SvelteKit Superforms configured successfully',
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
