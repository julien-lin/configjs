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
import { checkPathExists, readFileContent, normalizePath } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Prettier
 *
 * Formateur de code
 * Documentation officielle : https://prettier.io
 *
 * @example
 * ```typescript
 * import { prettierPlugin } from './plugins/tooling/prettier'
 * await prettierPlugin.install(ctx)
 * await prettierPlugin.configure(ctx)
 * ```
 */
export const prettierPlugin: Plugin = {
  name: 'prettier',
  displayName: 'Prettier',
  description: 'Formateur de code',
  category: Category.TOOLING,
  version: '^3.7.4',

  frameworks: ['react', 'vue', 'svelte'],

  /**
   * Détecte si Prettier est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['prettier'] !== undefined ||
      ctx.devDependencies['prettier'] !== undefined
    )
  },

  /**
   * Installe Prettier
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Prettier is already installed')
      return {
        packages: {},
        success: true,
        message: 'Prettier already installed',
      }
    }

    try {
      await installPackages(['prettier'], {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Prettier')

      return {
        packages: {
          devDependencies: ['prettier'],
        },
        success: true,
        message: 'Installed prettier',
      }
    } catch (error) {
      logger.error('Failed to install Prettier:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Prettier: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Prettier dans le projet
   *
   * Crée :
   * - .prettierrc (ou .prettierrc.json) : Configuration Prettier
   * - .prettierignore : Fichiers à ignorer
   *
   * Documentation : https://prettier.io/docs/en/configuration.html
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot

    try {
      // 1. Créer .prettierrc.json
      const prettierrcPath = join(projectRoot, '.prettierrc.json')
      const prettierrcExists = await checkPathExists(prettierrcPath)

      if (prettierrcExists) {
        logger.warn('.prettierrc.json already exists, skipping creation')
      } else {
        const prettierrcContent = getPrettierConfigContent()

        await writer.createFile(prettierrcPath, prettierrcContent)
        files.push({
          type: 'create',
          path: normalizePath(prettierrcPath),
          content: prettierrcContent,
          backup: false,
        })

        logger.info(`Created Prettier config: ${prettierrcPath}`)
      }

      // 2. Créer .prettierignore
      const prettierignorePath = join(projectRoot, '.prettierignore')
      const prettierignoreExists = await checkPathExists(prettierignorePath)

      if (prettierignoreExists) {
        logger.warn('.prettierignore already exists, skipping creation')
      } else {
        const prettierignoreContent = getPrettierIgnoreContent()

        await writer.createFile(prettierignorePath, prettierignoreContent)
        files.push({
          type: 'create',
          path: normalizePath(prettierignorePath),
          content: prettierignoreContent,
          backup: false,
        })

        logger.info(`Created .prettierignore: ${prettierignorePath}`)
      }

      // 3. Ajouter les scripts dans package.json si nécessaire
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

        const scriptsToAdd: Record<string, string> = {
          format: 'prettier --write .',
          'format:check': 'prettier --check .',
        }

        let modified = false
        for (const [key, value] of Object.entries(scriptsToAdd)) {
          if (!packageJson.scripts[key]) {
            packageJson.scripts[key] = value
            modified = true
          }
        }

        if (modified) {
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

          logger.info('Updated package.json with Prettier scripts')
        }
      }

      return {
        files,
        success: true,
        message: 'Prettier configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Prettier:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Prettier: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Prettier
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('Prettier configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Prettier configuration:', error)
      throw error
    }
  },
}

/**
 * Génère le contenu de .prettierrc.json
 */
function getPrettierConfigContent(): string {
  return JSON.stringify(
    {
      semi: false,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 100,
      arrowParens: 'always',
      endOfLine: 'lf',
    },
    null,
    2
  )
}

/**
 * Génère le contenu de .prettierignore
 */
function getPrettierIgnoreContent(): string {
  return `node_modules
dist
build
coverage
.next
.nuxt
.cache
*.log
*.lock
package-lock.json
yarn.lock
pnpm-lock.yaml
`
}
