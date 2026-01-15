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
 * Plugin Jasmine/Karma pour les tests Angular
 *
 * Framework de test par défaut dans Angular
 */
export const jasmineKarmaPlugin: Plugin = {
  name: '@angular/core:testing',
  displayName: 'Jasmine & Karma',
  description: 'Framework de test pour Angular',
  category: Category.TESTING,
  version: '^18.0.0',

  frameworks: ['angular'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.devDependencies['jasmine-core'] !== undefined &&
      ctx.devDependencies['karma'] !== undefined
    )
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Jasmine & Karma are already installed')
      return {
        packages: {},
        success: true,
        message: 'Jasmine & Karma already installed',
      }
    }

    const packages: string[] = [
      'jasmine-core@^5.0.0',
      'karma@^6.4.0',
      'karma-jasmine@^5.1.0',
      'karma-chrome-launcher@^3.2.0',
      '@angular/platform-browser-dynamic@^18.0.0',
    ]

    try {
      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
      })

      return {
        packages: { devDependencies: packages },
        success: true,
      }
    } catch (error) {
      logger.error('Failed to install Jasmine & Karma', error)
      return {
        packages: {},
        success: false,
        message: `Error installing Jasmine & Karma: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
