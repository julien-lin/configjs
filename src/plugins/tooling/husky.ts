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
import { execa } from 'execa'

/**
 * Plugin Husky
 *
 * Git hooks
 * Documentation officielle : https://typicode.github.io/husky
 *
 * @example
 * ```typescript
 * import { huskyPlugin } from './plugins/tooling/husky'
 * await huskyPlugin.install(ctx)
 * await huskyPlugin.configure(ctx)
 * ```
 */
export const huskyPlugin: Plugin = {
  name: 'husky',
  displayName: 'Husky',
  description: 'Git hooks',
  category: Category.TOOLING,
  version: '^9.1.7',

  frameworks: ['react', 'vue', 'svelte'],

  /**
   * Détecte si Husky est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['husky'] !== undefined ||
      ctx.devDependencies['husky'] !== undefined
    )
  },

  /**
   * Installe Husky
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Husky is already installed')
      return {
        packages: {},
        success: true,
        message: 'Husky already installed',
      }
    }

    try {
      await installPackages(['husky'], {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Husky')

      return {
        packages: {
          devDependencies: ['husky'],
        },
        success: true,
        message: 'Installed husky',
      }
    } catch (error) {
      logger.error('Failed to install Husky:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Husky: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Husky dans le projet
   *
   * Crée :
   * - .husky/pre-commit : Hook pre-commit
   * - .husky/pre-push : Hook pre-push
   * - package.json : Script prepare pour initialiser Husky
   *
   * Documentation : https://typicode.github.io/husky/getting-started.html
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot

    try {
      // 1. Initialiser Husky si .git existe
      const gitDir = join(projectRoot, '.git')
      const gitExists = await checkPathExists(gitDir)

      if (!gitExists) {
        logger.warn(
          '.git directory not found. Husky requires Git to be initialized.'
        )
        return {
          files,
          success: false,
          message: 'Git repository not found. Please initialize Git first.',
        }
      }

      // 2. Créer le dossier .husky
      const huskyDir = join(projectRoot, '.husky')
      await ensureDirectory(huskyDir)

      // 3. Créer .husky/pre-commit
      const preCommitPath = join(huskyDir, 'pre-commit')
      const preCommitExists = await checkPathExists(preCommitPath)

      if (!preCommitExists) {
        const preCommitContent = getPreCommitContent()

        await writer.createFile(preCommitPath, preCommitContent)
        files.push({
          type: 'create',
          path: normalizePath(preCommitPath),
          content: preCommitContent,
          backup: false,
        })

        logger.info(`Created pre-commit hook: ${preCommitPath}`)
      }

      // 4. Créer .husky/pre-push
      const prePushPath = join(huskyDir, 'pre-push')
      const prePushExists = await checkPathExists(prePushPath)

      if (!prePushExists) {
        const prePushContent = getPrePushContent()

        await writer.createFile(prePushPath, prePushContent)
        files.push({
          type: 'create',
          path: prePushPath,
          content: prePushContent,
          backup: false,
        })

        logger.info(`Created pre-push hook: ${prePushPath}`)
      }

      // 5. Ajouter le script prepare dans package.json
      const packageJsonPath = join(projectRoot, 'package.json')
      const packageJsonExists = await checkPathExists(packageJsonPath)

      if (packageJsonExists) {
        const packageJsonContent = await readFileContent(packageJsonPath)
        const packageJson = JSON.parse(packageJsonContent) as {
          scripts?: Record<string, string>
        }

        if (!packageJson.scripts) {
          packageJson.scripts = {}
        }

        if (!packageJson.scripts['prepare']) {
          packageJson.scripts['prepare'] = 'husky'
          const updatedContent = JSON.stringify(packageJson, null, 2) + '\n'
          await writer.writeFile(packageJsonPath, updatedContent, {
            backup: true,
          })
          files.push({
            type: 'modify',
            path: normalizePath(packageJsonPath),
            content: updatedContent,
            backup: true,
          })

          logger.info('Updated package.json with Husky prepare script')
        }
      }

      // 6. Initialiser Husky (exécuter husky init)
      try {
        await execa('npx', ['husky', 'init'], {
          cwd: projectRoot,
          stdio: 'inherit',
        })
        logger.info('Husky initialized successfully')
      } catch {
        logger.warn(
          'Failed to run husky init automatically. You may need to run it manually: npx husky init'
        )
      }

      return {
        files,
        success: true,
        message: 'Husky configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Husky:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Husky: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Husky
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('Husky configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Husky configuration:', error)
      throw error
    }
  },
}

/**
 * Génère le contenu de .husky/pre-commit
 */
function getPreCommitContent(): string {
  return `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run format:check
`
}

/**
 * Génère le contenu de .husky/pre-push
 */
function getPrePushContent(): string {
  return `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:unit
`
}
