import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { normalizePath } from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

import { join } from 'path'
import {
  getPluginServices,
  getRollbackManager,
} from '../utils/plugin-services.js'

const logger = getModuleLogger()

/**
 * Plugin vue-tsc
 *
 * Typecheck Vue SFC (TypeScript)
 * Documentation officielle : https://github.com/vuejs/language-tools
 *
 * @example
 * ```typescript
 * import { vueTscPlugin } from './plugins/tooling/vue-tsc'
 * await vueTscPlugin.install(ctx)
 * await vueTscPlugin.configure(ctx)
 * ```
 */
export const vueTscPlugin: Plugin = {
  name: 'vue-tsc',
  displayName: 'vue-tsc',
  description: 'Typecheck Vue SFC (TypeScript)',
  category: Category.TOOLING,
  version: '^3.2.2',

  frameworks: ['vue'],
  requiresTypeScript: true,

  /**
   * Détecte si vue-tsc est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['vue-tsc'] !== undefined ||
      ctx.devDependencies['vue-tsc'] !== undefined
    )
  },

  /**
   * Installe vue-tsc
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('vue-tsc is already installed')
      return {
        packages: {},
        success: true,
        message: 'vue-tsc already installed',
      }
    }

    try {
      const packages: string[] = ['vue-tsc']

      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed vue-tsc')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed vue-tsc: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install vue-tsc:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install vue-tsc: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure vue-tsc dans le projet
   *
   * Ajoute le script typecheck si absent
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const { writer } = getPluginServices(ctx)

    const files: ConfigResult['files'] = []
    const packageJsonPath = join(ctx.projectRoot, 'package.json')

    try {
      await writer.modifyPackageJson(ctx.projectRoot, (pkg) => {
        pkg.scripts = pkg.scripts || {}
        if (!pkg.scripts['typecheck']) {
          pkg.scripts['typecheck'] = 'vue-tsc --noEmit'
        }
        return pkg
      })

      files.push({
        type: 'modify',
        path: normalizePath(packageJsonPath),
        backup: true,
      })

      logger.info('Updated package.json with vue-tsc typecheck script')

      return {
        files,
        success: true,
        message: 'vue-tsc configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure vue-tsc:', error)
      return {
        files,
        success: false,
        message: `Failed to configure vue-tsc: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration vue-tsc
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = getRollbackManager(_ctx)
    await backupManager.restoreAll()
    logger.info('vue-tsc configuration rolled back')
  },
}
