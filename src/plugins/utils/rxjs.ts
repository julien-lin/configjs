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
 * Plugin RxJS pour Angular
 *
 * Bibliothèque réactive - essentielle pour Angular
 */
export const rxjsPlugin: Plugin = {
  name: 'rxjs',
  displayName: 'RxJS',
  description: 'Reactive Extensions pour JavaScript/Angular',
  category: Category.UTILS,
  version: '^7.8.0',

  frameworks: ['angular'],
  requiresTypeScript: false,

  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['rxjs'] !== undefined
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('RxJS is already installed')
      return {
        packages: {},
        success: true,
        message: 'RxJS already installed',
      }
    }

    const packages: string[] = ['rxjs@^7.8.0']

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
      logger.error('Failed to install RxJS', error)
      return {
        packages: {},
        success: false,
        message: `Error installing RxJS: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
