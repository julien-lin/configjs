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
 * Plugin NgRx pour Angular
 *
 * State management basé sur Redux pour Angular
 */
export const ngrxPlugin: Plugin = {
  name: '@ngrx/store',
  displayName: 'NgRx',
  description: 'State management (Redux-like) pour Angular',
  category: Category.STATE,
  version: '^17.0.0',

  frameworks: ['angular'],
  incompatibleWith: ['akita'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['@ngrx/store'] !== undefined
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('NgRx is already installed')
      return {
        packages: {},
        success: true,
        message: 'NgRx already installed',
      }
    }

    const packages: string[] = [
      '@ngrx/store@^17.0.0',
      '@ngrx/effects@^17.0.0',
      '@ngrx/store-devtools@^17.0.0',
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
      logger.error('Failed to install NgRx', error)
      return {
        packages: {},
        success: false,
        message: `Error installing NgRx: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
