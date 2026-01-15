import type {
    Plugin,
    ProjectContext,
    ConfigResult,
    InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { getModuleLogger } from '../../utils/logger-provider.js'
import {
    generateAccessibleMenuComponent,
    addProviderToAppConfig,
} from '../utils/angular-21-config.js'

const logger = getModuleLogger()

/**
 * Angular CDK Plugin
 * Component Development Kit for Angular
 */
export const angularCdkPlugin: Plugin = {
    name: '@angular/cdk',
    displayName: 'Angular CDK',
    description:
        'Provides low-level components and directives for building custom UI components',
    category: Category.UI,
    version: '^21.0.0',

    frameworks: ['angular'],
    requiresTypeScript: true,

    detect: (ctx: ProjectContext): boolean => {
        return ctx.dependencies['@angular/cdk'] !== undefined
    },

    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('@angular/cdk is already installed')
            return {
                packages: {},
                success: true,
                message: '@angular/cdk already installed',
            }
        }

        const packages: string[] = ['@angular/cdk@^21.0.0']

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
            logger.error('Failed to install @angular/cdk', error)
            return {
                packages: {},
                success: false,
                message: `Error installing @angular/cdk: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        }
    },

    async configure(ctx: ProjectContext): Promise<ConfigResult> {
        try {
            // Generate accessible menu component with CdkMenu
            await generateAccessibleMenuComponent(ctx.projectRoot)

            // Add animations provider to app.config.ts
            await addProviderToAppConfig('animations', ctx.projectRoot)

            logger.success('Angular CDK configuration completed')
            logger.info(
                'Created: components/menu.component.ts with CdkMenu + animations'
            )

            return {
                files: [
                    {
                        type: 'create',
                        path: 'src/app/components/menu.component.ts',
                    },
                    {
                        type: 'modify',
                        path: 'src/app/app.config.ts',
                    },
                ],
                success: true,
            }
        } catch (error) {
            logger.error('Failed to configure Angular CDK', error)
            return {
                files: [],
                success: false,
                message: `Error configuring Angular CDK: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        }
    },
}
