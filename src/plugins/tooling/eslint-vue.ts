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
 * Plugin ESLint Vue
 *
 * Configuration ESLint pour Vue.js
 * Documentation officielle : https://eslint.vuejs.org
 *
 * @example
 * ```typescript
 * import { eslintVuePlugin } from './plugins/tooling/eslint-vue'
 * await eslintVuePlugin.install(ctx)
 * await eslintVuePlugin.configure(ctx)
 * ```
 */
export const eslintVuePlugin: Plugin = {
  name: 'eslint-plugin-vue',
  displayName: 'ESLint Vue',
  description: 'Configuration ESLint pour Vue.js',
  category: Category.TOOLING,
  version: '^9.30.0',

  frameworks: ['vue'],

  /**
   * Détecte si eslint-plugin-vue est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['eslint-plugin-vue'] !== undefined ||
      ctx.devDependencies['eslint-plugin-vue'] !== undefined
    )
  },

  /**
   * Installe ESLint Vue et les dépendances nécessaires
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('ESLint Vue is already installed')
      return {
        packages: {},
        success: true,
        message: 'ESLint Vue already installed',
      }
    }

    try {
      const packages: string[] = [
        'eslint',
        'eslint-plugin-vue',
        '@vue/eslint-config-prettier',
      ]

      // Ajouter typescript-eslint si TypeScript
      if (ctx.typescript) {
        packages.push('typescript-eslint')
      }

      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed ESLint Vue')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install ESLint Vue:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install ESLint Vue: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure ESLint Vue dans le projet
   *
   * Crée ou modifie :
   * - eslint.config.js (flat config pour ESLint v9)
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot

    try {
      // 1. Créer ou modifier eslint.config.js
      const eslintConfigPath = join(projectRoot, 'eslint.config.js')
      const eslintConfigExists = await checkPathExists(eslintConfigPath)

      if (eslintConfigExists) {
        // Modifier le fichier existant pour ajouter la config Vue
        const existingContent = await readFileContent(eslintConfigPath)
        const updatedContent = updateESLintConfig(existingContent, ctx)

        if (updatedContent !== existingContent) {
          await writer.writeFile(eslintConfigPath, updatedContent, {
            backup: true,
          })
          files.push({
            type: 'modify',
            path: normalizePath(eslintConfigPath),
            content: updatedContent,
            backup: true,
          })

          logger.info(`Updated ESLint config: ${eslintConfigPath}`)
        }
      } else {
        // Créer un nouveau fichier de configuration
        const eslintConfigContent = getESLintVueConfigContent(ctx)

        await writer.createFile(eslintConfigPath, eslintConfigContent)
        files.push({
          type: 'create',
          path: normalizePath(eslintConfigPath),
          content: eslintConfigContent,
          backup: false,
        })

        logger.info(`Created ESLint Vue config: ${eslintConfigPath}`)
      }

      return {
        files,
        success: true,
        message: 'ESLint Vue configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure ESLint Vue:', error)
      return {
        files,
        success: false,
        message: `Failed to configure ESLint Vue: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration ESLint Vue
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    await backupManager.restoreAll()
    logger.info('ESLint Vue configuration rolled back')
  },
}

/**
 * Génère le contenu de eslint.config.js pour Vue.js
 */
function getESLintVueConfigContent(ctx: ProjectContext): string {
  const isTypeScript = ctx.typescript

  if (isTypeScript) {
    return `import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueTs from 'eslint-plugin-vue/lib/configs/typescript.js'
import prettier from '@vue/eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
    rules: {
      ...vue.configs.recommended.rules,
      ...vueTs.rules,
      'vue/multi-word-component-names': 'off',
    },
  },
  prettier,
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  }
)
`
  }

  return `import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import prettier from '@vue/eslint-config-prettier'

export default [
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.js', '**/*.jsx'],
    rules: {
      ...vue.configs.recommended.rules,
      'vue/multi-word-component-names': 'off',
    },
  },
  prettier,
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
]
`
}

/**
 * Met à jour un fichier eslint.config.js existant pour ajouter la config Vue
 */
function updateESLintConfig(
  existingContent: string,
  ctx: ProjectContext
): string {
  // Si la config Vue est déjà présente, ne rien faire
  if (
    existingContent.includes('eslint-plugin-vue') ||
    existingContent.includes("from 'eslint-plugin-vue'")
  ) {
    return existingContent
  }

  // Ajouter l'import de eslint-plugin-vue
  const vueImport = ctx.typescript
    ? "import vue from 'eslint-plugin-vue'\nimport vueTs from 'eslint-plugin-vue/lib/configs/typescript.js'\n"
    : "import vue from 'eslint-plugin-vue'\n"

  // Trouver où insérer l'import
  const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*\n)/g
  const imports = existingContent.match(importRegex) || []
  const lastImport = imports.length > 0 ? imports[imports.length - 1] : null
  const lastImportIndex =
    lastImport && lastImport.length > 0
      ? existingContent.lastIndexOf(lastImport) + lastImport.length
      : 0

  // Insérer l'import
  const beforeImports = existingContent.substring(0, lastImportIndex)
  const afterImports = existingContent.substring(lastImportIndex)

  let updatedContent = beforeImports + vueImport + afterImports

  // Ajouter la config Vue dans le tableau de config
  if (ctx.typescript) {
    // Pour TypeScript, ajouter après les configs tseslint
    updatedContent = updatedContent.replace(
      /(\]?\s*tseslint\.config\()/,
      `$1\n  ...vue.configs['flat/recommended'],`
    )
  } else {
    // Pour JavaScript, ajouter dans le tableau
    updatedContent = updatedContent.replace(
      /(\[\s*js\.configs\.recommended,)/,
      `$1\n  ...vue.configs['flat/recommended'],`
    )
  }

  return updatedContent
}
