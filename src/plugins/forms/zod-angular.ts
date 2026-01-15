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
 * Zod Plugin for Angular
 * Schema validation and type inference for Angular forms and API data
 */
export const zodAngularPlugin: Plugin = {
  name: 'zod',
  displayName: 'Zod',
  description: 'TypeScript-first schema validation with static type inference',
  category: Category.FORMS,
  version: '^3.23.0',

  frameworks: ['angular'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['zod'] !== undefined
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Zod is already installed')
      return {
        packages: {},
        success: true,
        message: 'Zod already installed',
      }
    }

    const packages: string[] = ['zod@^3.23.0']

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
      logger.error('Failed to install Zod', error)
      return {
        packages: {},
        success: false,
        message: `Error installing Zod: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
