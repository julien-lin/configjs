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
 * Vitest Plugin for Angular
 * Modern testing framework for Angular 21
 * Default test runner in Angular 21 projects
 */
export const vitestAngularPlugin: Plugin = {
  name: 'vitest',
  displayName: 'Vitest Angular',
  description: 'Lightning-fast unit testing framework for Angular projects',
  category: Category.TESTING,
  version: '^1.0.0',

  frameworks: ['angular'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.devDependencies?.['vitest'] !== undefined ||
      ctx.devDependencies?.['@vitest/angular'] !== undefined
    )
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Vitest is already installed')
      return {
        packages: {},
        success: true,
        message: 'Vitest already installed',
      }
    }

    const packages: string[] = [
      'vitest@^1.0.0',
      '@vitest/angular@^1.0.0',
      '@vitest/ui@^1.0.0',
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
      logger.error('Failed to install Vitest', error)
      return {
        packages: {},
        success: false,
        message: `Error installing Vitest: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
