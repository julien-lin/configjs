import type {
    Plugin,
    ProjectContext,
    ConfigResult,
    InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin Angular Material
 *
 * Composants UI Material Design pour Angular
 */
export const angularMaterialPlugin: Plugin = {
    name: '@angular/material',
    displayName: 'Angular Material',
    description: 'Composants UI Material Design pour Angular',
    category: Category.UI,
    version: '^18.0.0',

    frameworks: ['angular'],
    requiresTypeScript: true,

    detect: (ctx: ProjectContext): boolean => {
        return ctx.dependencies['@angular/material'] !== undefined
    },

    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('Angular Material is already installed')
            return {
                packages: {},
                success: true,
                message: 'Angular Material already installed',
            }
        }

        const packages: string[] = [
            '@angular/material@^18.0.0',
            '@angular/cdk@^18.0.0',
        ]

        try {
            await installPackages(packages, {
                dev: false,
                packageManager: ctx.packageManager,
                projectRoot: ctx.projectRoot,
            })

            return {
                packages: { dependencies: packages },
                success: true,
            }
        } catch (error) {
            logger.error('Failed to install Angular Material', error)
            return {
                packages: {},
                success: false,
                message: `Error installing Angular Material: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        }
    },

    configure(): Promise<ConfigResult> {
        return Promise.resolve({
            files: [],
            success: true,
        })
    },
}
