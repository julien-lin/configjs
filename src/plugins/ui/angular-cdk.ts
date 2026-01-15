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

  configure(): Promise<ConfigResult> {
    return Promise.resolve({
      files: [],
      success: true,
    })
  },
}
