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
  normalizePath,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin ESLint
 *
 * Linter JavaScript/TypeScript
 * Documentation officielle : https://eslint.org
 *
 * @example
 * ```typescript
 * import { eslintPlugin } from './plugins/tooling/eslint'
 * await eslintPlugin.install(ctx)
 * await eslintPlugin.configure(ctx)
 * ```
 */
export const eslintPlugin: Plugin = {
  name: 'eslint',
  displayName: 'ESLint',
  description: 'Linter JavaScript/TypeScript',
  category: Category.TOOLING,
  version: '^9.39.2',

  frameworks: ['react', 'vue', 'svelte', 'nextjs'],

  /**
   * Détecte si ESLint est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['eslint'] !== undefined ||
      ctx.devDependencies['eslint'] !== undefined
    )
  },

  /**
   * Installe ESLint et les plugins nécessaires selon le contexte
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('ESLint is already installed')
      return {
        packages: {},
        success: true,
        message: 'ESLint already installed',
      }
    }

    try {
      const packages: string[] = ['eslint']

      // Ajouter les plugins selon le framework et TypeScript
      if (ctx.framework === 'react') {
        packages.push(
          '@eslint/js',
          'eslint-plugin-react',
          'eslint-plugin-react-hooks'
        )
        if (ctx.typescript) {
          packages.push('typescript-eslint')
        }
      }

      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed ESLint')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install ESLint:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install ESLint: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure ESLint dans le projet
   *
   * Crée :
   * - eslint.config.js (flat config pour ESLint v9)
   *
   * Documentation : https://eslint.org/docs/latest/use/configure/configuration-files-new
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot

    try {
      // 1. Créer eslint.config.js (flat config pour ESLint v9)
      const eslintConfigPath = join(projectRoot, 'eslint.config.js')
      const eslintConfigExists = await checkPathExists(eslintConfigPath, ctx.fsAdapter)

      if (eslintConfigExists) {
        logger.warn('eslint.config.js already exists, skipping creation')
      } else {
        const eslintConfigContent = getESLintConfigContent(ctx)

        await writer.createFile(eslintConfigPath, eslintConfigContent)
        files.push({
          type: 'create',
          path: normalizePath(eslintConfigPath),
          content: eslintConfigContent,
          backup: false,
        })

        logger.info(`Created ESLint config: ${eslintConfigPath}`)
      }

      // 2. Ajouter les scripts dans package.json si nécessaire
      const packageJsonPath = join(projectRoot, 'package.json')
      const packageJsonExists = await checkPathExists(packageJsonPath, ctx.fsAdapter)

      if (packageJsonExists) {
        const packageJsonContent = await readFileContent(packageJsonPath, 'utf-8', ctx.fsAdapter)
        const packageJson = JSON.parse(packageJsonContent) as {
          scripts?: Record<string, string>
        }

        if (!packageJson.scripts) {
          packageJson.scripts = {}
        }

        const scriptsToAdd: Record<string, string> = {
          lint: 'eslint .',
          'lint:fix': 'eslint . --fix',
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

          logger.info('Updated package.json with ESLint scripts')
        }
      }

      return {
        files,
        success: true,
        message: 'ESLint configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure ESLint:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure ESLint: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration ESLint
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('ESLint configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback ESLint configuration:', error)
      throw error
    }
  },
}

/**
 * Génère le contenu de eslint.config.js selon le contexte
 */
function getESLintConfigContent(ctx: ProjectContext): string {
  const isTypeScript = ctx.typescript
  const isReact = ctx.framework === 'react'

  if (isReact && isTypeScript) {
    return `import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  }
)
`
  }

  if (isReact) {
    return `import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
]
`
  }

  // Configuration par défaut (JavaScript simple)
  return `import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
]
`
}
