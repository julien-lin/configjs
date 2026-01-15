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
 * Angular Aria Plugin
 * Headless accessibility library for building accessible components
 * New in Angular 21
 */
export const angularAriaPlugin: Plugin = {
  name: '@angular/aria',
  displayName: 'Angular Aria',
  description:
    'Headless accessibility library for managing keyboard navigation and ARIA roles',
  category: Category.UI,
  version: '^21.0.0',

  frameworks: ['angular'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['@angular/aria'] !== undefined
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('@angular/aria is already installed')
      return {
        packages: {},
        success: true,
        message: '@angular/aria already installed',
      }
    }

    const packages: string[] = ['@angular/aria@^21.0.0']

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
      logger.error('Failed to install @angular/aria', error)
      return {
        packages: {},
        success: false,
        message: `Error installing @angular/aria: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
