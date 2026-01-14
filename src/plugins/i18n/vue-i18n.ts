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
  ensureDirectory,
  readFileContent,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Vue I18n
 *
 * Internationalisation pour Vue.js
 * Documentation officielle : https://vue-i18n.intlify.dev/
 *
 * @example
 * ```typescript
 * import { vueI18nPlugin } from './plugins/i18n/vue-i18n'
 * await vueI18nPlugin.install(ctx)
 * await vueI18nPlugin.configure(ctx)
 * ```
 */
export const vueI18nPlugin: Plugin = {
  name: 'vue-i18n',
  displayName: 'Vue I18n',
  description: 'Internationalisation pour Vue.js',
  category: Category.I18N,
  version: '^11.2.8',

  frameworks: ['vue'],

  /**
   * Détecte si vue-i18n est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['vue-i18n'] !== undefined ||
      ctx.devDependencies['vue-i18n'] !== undefined
    )
  },

  /**
   * Installe vue-i18n
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('vue-i18n is already installed')
      return {
        packages: {},
        success: true,
        message: 'vue-i18n already installed',
      }
    }

    try {
      const packages: string[] = ['vue-i18n']

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed vue-i18n')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed vue-i18n: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install vue-i18n:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install vue-i18n: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Vue I18n dans le projet
   *
   * Crée :
   * - src/i18n/messages.ts (ou .js)
   * - src/i18n/index.ts (ou .js)
   * Modifie :
   * - src/main.ts (ou main.js)
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const srcDir = join(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      const i18nDir = join(srcDir, 'i18n')
      await ensureDirectory(i18nDir, ctx.fsAdapter)

      const messagesPath = join(i18nDir, `messages.${extension}`)
      const messagesExists = await checkPathExists(messagesPath, ctx.fsAdapter)
      if (!messagesExists) {
        const messagesContent = ctx.typescript
          ? getMessagesContentTS()
          : getMessagesContentJS()
        await writer.createFile(messagesPath, messagesContent)
        files.push({
          type: 'create',
          path: normalizePath(messagesPath),
          content: messagesContent,
          backup: false,
        })
        logger.info(`Created i18n messages: ${messagesPath}`)
      }

      const i18nIndexPath = join(i18nDir, `index.${extension}`)
      const i18nIndexExists = await checkPathExists(
        i18nIndexPath,
        ctx.fsAdapter
      )
      if (!i18nIndexExists) {
        const i18nIndexContent = ctx.typescript
          ? getI18nIndexContentTS()
          : getI18nIndexContentJS()
        await writer.createFile(i18nIndexPath, i18nIndexContent)
        files.push({
          type: 'create',
          path: normalizePath(i18nIndexPath),
          content: i18nIndexContent,
          backup: false,
        })
        logger.info(`Created i18n setup: ${i18nIndexPath}`)
      }

      const mainPath = join(srcDir, `main.${extension}`)
      const mainExists = await checkPathExists(mainPath, ctx.fsAdapter)
      if (mainExists) {
        const mainContent = await readFileContent(
          mainPath,
          'utf-8',
          ctx.fsAdapter
        )
        const updatedMain = injectI18n(mainContent)
        if (updatedMain !== mainContent) {
          await writer.writeFile(mainPath, updatedMain, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(mainPath),
            content: updatedMain,
            backup: true,
          })
          logger.info(`Updated main file with i18n: ${mainPath}`)
        }
      } else {
        logger.warn(`Main file not found: ${mainPath}`)
      }

      return {
        files,
        success: true,
        message: 'Vue I18n configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Vue I18n:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Vue I18n: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Vue I18n
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('Vue I18n configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Vue I18n configuration:', error)
      throw error
    }
  },
}

function getMessagesContentTS(): string {
  return `export const messages = {
  fr: {
    hello: 'Bonjour',
  },
  en: {
    hello: 'Hello',
  },
}
`
}

function getMessagesContentJS(): string {
  return `export const messages = {
  fr: {
    hello: 'Bonjour',
  },
  en: {
    hello: 'Hello',
  },
}
`
}

function getI18nIndexContentTS(): string {
  return `import { createI18n } from 'vue-i18n'
import { messages } from './messages'

export const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'en',
  messages,
})
`
}

function getI18nIndexContentJS(): string {
  return `import { createI18n } from 'vue-i18n'
import { messages } from './messages'

export const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'en',
  messages,
})
`
}

function injectI18n(content: string): string {
  if (content.includes("from './i18n'") || content.includes('from "./i18n"')) {
    return content
  }

  const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*\n)/g
  const imports = content.match(importRegex) || []
  const lastImportIndex = content.lastIndexOf(imports[imports.length - 1] || '')
  const afterImports =
    lastImportIndex >= 0
      ? lastImportIndex + (imports[imports.length - 1]?.length || 0)
      : 0

  const beforeImports = content.substring(0, afterImports)
  const afterImportsContent = content.substring(afterImports)
  let updatedContent =
    beforeImports + "import { i18n } from './i18n'\n" + afterImportsContent

  if (!updatedContent.includes('app.use(i18n)')) {
    updatedContent = updatedContent.replace(
      /(const\s+app\s*=\s*createApp\([^)]+\))/,
      `$1\napp.use(i18n)`
    )
  }

  return updatedContent
}
