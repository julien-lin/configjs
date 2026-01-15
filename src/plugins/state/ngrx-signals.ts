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

  configure(): Promise<ConfigResult> {
    return Promise.resolve({
      files: [],
      success: true,
    })
  },
}
