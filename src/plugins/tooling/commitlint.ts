import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import {
  checkPathExists,
  readFileContent,
  ensureDirectory,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Commitlint
 *
 * Validation des messages de commit
 * Documentation officielle : https://commitlint.js.org/
 *
 * @example
 * ```typescript
 * import { commitlintPlugin } from './plugins/tooling/commitlint'
 * await commitlintPlugin.install(ctx)
 * await commitlintPlugin.configure(ctx)
 * ```
 */
export const commitlintPlugin: Plugin = {
  name: '@commitlint/cli',
  displayName: 'Commitlint',
  description: 'Validation des messages de commit',
  category: Category.TOOLING,
  version: '^20.3.1',

  frameworks: ['react', 'vue', 'svelte', 'nextjs'],

  /**
   * Détecte si commitlint est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@commitlint/cli'] !== undefined ||
      ctx.devDependencies['@commitlint/cli'] !== undefined
    )
  },

  /**
   * Installe commitlint
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Commitlint is already installed')
      return {
        packages: {},
        success: true,
        message: 'Commitlint already installed',
      }
    }

    try {
      const packages: string[] = [
        '@commitlint/cli',
        '@commitlint/config-conventional',
      ]

      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Commitlint')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed Commitlint: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Commitlint:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Commitlint: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Commitlint
   *
   * Crée :
   * - commitlint.config.cjs
   * - .husky/commit-msg (si husky est présent)
   * Modifie :
   * - package.json (script commitlint)
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const configPath = join(projectRoot, 'commitlint.config.cjs')
    const packageJsonPath = join(projectRoot, 'package.json')

    try {
      const configExists = await checkPathExists(configPath, ctx.fsAdapter)
      if (!configExists) {
        const configContent = getCommitlintConfig()
        await writer.createFile(configPath, configContent)
        files.push({
          type: 'create',
          path: normalizePath(configPath),
          content: configContent,
          backup: false,
        })
        logger.info(`Created commitlint config: ${configPath}`)
      }

      await writer.modifyPackageJson(projectRoot, (pkg) => {
        pkg.scripts = pkg.scripts || {}
        if (!pkg.scripts['commitlint']) {
          pkg.scripts['commitlint'] = 'commitlint --edit'
        }
        return pkg
      })

      files.push({
        type: 'modify',
        path: normalizePath(packageJsonPath),
        backup: true,
      })

      const huskyDir = join(projectRoot, '.husky')
      const huskyExists = await checkPathExists(huskyDir, ctx.fsAdapter)
      if (huskyExists) {
        await ensureDirectory(huskyDir, ctx.fsAdapter)
        const commitMsgPath = join(huskyDir, 'commit-msg')
        const commitMsgExists = await checkPathExists(
          commitMsgPath,
          ctx.fsAdapter
        )
        if (!commitMsgExists) {
          const commitMsgContent = getCommitMsgHook()
          await writer.createFile(commitMsgPath, commitMsgContent)
          files.push({
            type: 'create',
            path: normalizePath(commitMsgPath),
            content: commitMsgContent,
            backup: false,
          })
          logger.info(`Created commit-msg hook: ${commitMsgPath}`)
        } else {
          const existingContent = await readFileContent(
            commitMsgPath,
            'utf-8',
            ctx.fsAdapter
          )
          if (!existingContent.includes('commitlint')) {
            const updatedContent =
              existingContent.trimEnd() + '\n' + getCommitMsgCommand()
            await writer.writeFile(commitMsgPath, updatedContent, {
              backup: true,
            })
            files.push({
              type: 'modify',
              path: normalizePath(commitMsgPath),
              content: updatedContent,
              backup: true,
            })
            logger.info(`Updated commit-msg hook: ${commitMsgPath}`)
          }
        }
      } else {
        logger.warn(
          '.husky directory not found. Commit-msg hook not created. Install Husky first.'
        )
      }

      return {
        files,
        success: true,
        message: 'Commitlint configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Commitlint:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Commitlint: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Commitlint
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('Commitlint configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Commitlint configuration:', error)
      throw error
    }
  },
}

function getCommitlintConfig(): string {
  return `module.exports = {
  extends: ['@commitlint/config-conventional'],
}
`
}

function getCommitMsgCommand(): string {
  return 'npx --no -- commitlint --edit "$1"'
}

function getCommitMsgHook(): string {
  return `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${getCommitMsgCommand()}
`
}
