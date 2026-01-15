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
 * Lucide Angular Plugin
 * Lightweight icon library for Angular
 * Modern alternative to FontAwesome
 */
export const lucideAngularPlugin: Plugin = {
  name: 'lucide-angular',
  displayName: 'Lucide Angular',
  description: 'Beautiful, consistent, and customizable SVG icons for Angular',
  category: Category.UI,
  version: '^0.400.0',

  frameworks: ['angular'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['lucide-angular'] !== undefined
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('lucide-angular is already installed')
      return {
        packages: {},
        success: true,
        message: 'lucide-angular already installed',
      }
    }

    const packages: string[] = ['lucide-angular@^0.400.0']

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
      logger.error('Failed to install lucide-angular', error)
      return {
        packages: {},
        success: false,
        message: `Error installing lucide-angular: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
