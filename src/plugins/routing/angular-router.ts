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
 * Plugin Angular Router
 *
 * Routing intégré dans Angular (RouterModule)
 * Les routes sont définies dans le fichier app-routing.module.ts
 */
export const angularRouterPlugin: Plugin = {
  name: '@angular/router',
  displayName: 'Angular Router',
  description: 'Routing déclaratif pour Angular',
  category: Category.ROUTING,
  version: '^18.0.0',

  frameworks: ['angular'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['@angular/router'] !== undefined
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Angular Router is already installed')
      return {
        packages: {},
        success: true,
        message: 'Angular Router already installed',
      }
    }

    const packages: string[] = ['@angular/router@^18.0.0']

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
      logger.error('Failed to install Angular Router', error)
      return {
        packages: {},
        success: false,
        message: `Error installing Angular Router: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
