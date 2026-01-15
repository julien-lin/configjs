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
    generateSignalStoreTemplate,
    addProviderToAppConfig,
} from '../utils/angular-21-config.js'

const logger = getModuleLogger()

/**
 * NgRx Signals Plugin
 * Signal Store for state management in Angular 21
 * Lightweight, modular, and signal-native state management
 */
export const ngrxSignalsPlugin: Plugin = {
    name: '@ngrx/signals',
    displayName: 'NgRx Signals',
    description: 'Modern signal-based state management library for Angular 21+',
    category: Category.STATE,
    version: '^18.0.0',

    frameworks: ['angular'],
    requiresTypeScript: true,

    detect: (ctx: ProjectContext): boolean => {
        return ctx.dependencies['@ngrx/signals'] !== undefined
    },

    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('@ngrx/signals is already installed')
            return {
                packages: {},
                success: true,
                message: '@ngrx/signals already installed',
            }
        }

        const packages: string[] = ['@ngrx/signals@^18.0.0']

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
            logger.error('Failed to install @ngrx/signals', error)
            return {
                packages: {},
                success: false,
                message: `Error installing @ngrx/signals: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        }
    },

    async configure(ctx: ProjectContext): Promise<ConfigResult> {
        try {
            // Generate Signal Store template with Zod schema
            await generateSignalStoreTemplate(ctx.projectRoot, 'app')

            // Add ngrxSignals provider to app.config.ts
            await addProviderToAppConfig('ngrxSignals', ctx.projectRoot)

            logger.success('NgRx Signals configuration completed')
            logger.info('Created: stores/app.store.ts with Signal Store + Zod schema')

            return {
                files: [
                    {
                        type: 'create',
                        path: 'src/app/stores/app.store.ts',
                    },
                    {
                        type: 'modify',
                        path: 'src/app/app.config.ts',
                    },
                ],
                success: true,
            }
        } catch (error) {
            logger.error('Failed to configure NgRx Signals', error)
            return {
                files: [],
                success: false,
                message: `Error configuring NgRx Signals: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        }
    },
}
