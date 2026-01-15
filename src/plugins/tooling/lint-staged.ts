import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { checkPathExists, normalizePath } from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

import {
  getPluginServices,
  getRollbackManager,
} from '../utils/plugin-services.js'

const logger = getModuleLogger()

/**
 * Plugin lint-staged
 *
 * Exécute des tâches sur les fichiers modifiés avant commit
 * Documentation officielle : https://github.com/lint-staged/lint-staged
 *
 * @example
 * ```typescript
 * import { lintStagedPlugin } from './plugins/tooling/lint-staged'
 * await lintStagedPlugin.install(ctx)
 * await lintStagedPlugin.configure(ctx)
 * ```
 */
export const lintStagedPlugin: Plugin = {
  name: 'lint-staged',
  displayName: 'lint-staged',
  description: 'Lint et formatage des fichiers git stagés',
  category: Category.TOOLING,
  version: '^16.2.7',

  frameworks: ['react', 'vue', 'svelte', 'nextjs'],

  /**
   * Détecte si lint-staged est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['lint-staged'] !== undefined ||
      ctx.devDependencies['lint-staged'] !== undefined
    )
  },

  /**
   * Installe lint-staged
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('lint-staged is already installed')
      return {
        packages: {},
        success: true,
        message: 'lint-staged already installed',
      }
    }

    try {
      await installPackages(['lint-staged'], {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed lint-staged')

      return {
        packages: {
          devDependencies: ['lint-staged'],
        },
        success: true,
        message: 'Installed lint-staged',
      }
    } catch (error) {
      logger.error('Failed to install lint-staged:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install lint-staged: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure lint-staged
   *
   * Crée :
   * - lint-staged.config.cjs
   * Modifie :
   * - package.json (script lint-staged)
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const { backupManager, writer } = getPluginServices(ctx)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const configPath = join(projectRoot, 'lint-staged.config.cjs')
    const packageJsonPath = join(projectRoot, 'package.json')

    try {
      const configExists = await checkPathExists(configPath, ctx.fsAdapter)
      if (!configExists) {
        const configContent = getLintStagedConfig()
        await writer.createFile(configPath, configContent)
        files.push({
          type: 'create',
          path: normalizePath(configPath),
          content: configContent,
          backup: false,
        })
        logger.info(`Created lint-staged config: ${configPath}`)
      }

      await writer.modifyPackageJson(projectRoot, (pkg) => {
        pkg.scripts = pkg.scripts || {}
        if (!pkg.scripts['lint-staged']) {
          pkg.scripts['lint-staged'] = 'lint-staged'
        }
        return pkg
      })

      files.push({
        type: 'modify',
        path: normalizePath(packageJsonPath),
        backup: true,
      })

      logger.info('Updated package.json with lint-staged script')

      return {
        files,
        success: true,
        message: 'lint-staged configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure lint-staged:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure lint-staged: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration lint-staged
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = getRollbackManager(_ctx)
    try {
      await backupManager.restoreAll()
      logger.info('lint-staged configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback lint-staged configuration:', error)
      throw error
    }
  },
}

function getLintStagedConfig(): string {
  return `module.exports = {
  '*.{js,ts,jsx,tsx,vue}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,scss}': ['prettier --write'],
}
`
}
