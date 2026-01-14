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
 * Plugin unplugin-auto-import
 *
 * Auto-imports pour Vue (Vite)
 * Documentation officielle : https://github.com/unplugin/unplugin-auto-import
 *
 * @example
 * ```typescript
 * import { unpluginAutoImportPlugin } from './plugins/tooling/unplugin-auto-import'
 * await unpluginAutoImportPlugin.install(ctx)
 * await unpluginAutoImportPlugin.configure(ctx)
 * ```
 */
export const unpluginAutoImportPlugin: Plugin = {
  name: 'unplugin-auto-import',
  displayName: 'Auto Import (Vue)',
  description: 'Auto-imports Vue/Router/Pinia',
  category: Category.TOOLING,
  version: '^20.3.0',

  frameworks: ['vue'],
  bundlers: ['vite'],

  /**
   * Détecte si unplugin-auto-import est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['unplugin-auto-import'] !== undefined ||
      ctx.devDependencies['unplugin-auto-import'] !== undefined
    )
  },

  /**
   * Installe unplugin-auto-import
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('unplugin-auto-import is already installed')
      return {
        packages: {},
        success: true,
        message: 'unplugin-auto-import already installed',
      }
    }

    try {
      const packages: string[] = ['unplugin-auto-import']

      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed unplugin-auto-import')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed unplugin-auto-import: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install unplugin-auto-import:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install unplugin-auto-import: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure unplugin-auto-import
   *
   * Modifie :
   * - vite.config.ts (ou .js)
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const extension = ctx.typescript ? 'ts' : 'js'
    const viteConfigPath = join(projectRoot, `vite.config.${extension}`)

    try {
      const viteConfigExists = await checkPathExists(
        viteConfigPath,
        ctx.fsAdapter
      )

      if (viteConfigExists) {
        const viteContent = await readFileContent(
          viteConfigPath,
          'utf-8',
          ctx.fsAdapter
        )
        const updatedContent = injectAutoImportPlugin(viteContent)

        if (updatedContent !== viteContent) {
          await writer.writeFile(viteConfigPath, updatedContent, {
            backup: true,
          })
          files.push({
            type: 'modify',
            path: normalizePath(viteConfigPath),
            content: updatedContent,
            backup: true,
          })
          logger.info(`Updated ${viteConfigPath} with Auto Import plugin`)
        }
      } else {
        const viteConfigContent = getViteConfigContent()
        await writer.createFile(viteConfigPath, viteConfigContent)
        files.push({
          type: 'create',
          path: normalizePath(viteConfigPath),
          content: viteConfigContent,
          backup: false,
        })
        logger.info(`Created ${viteConfigPath} with Auto Import plugin`)
      }

      return {
        files,
        success: true,
        message: 'unplugin-auto-import configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure unplugin-auto-import:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure unplugin-auto-import: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration unplugin-auto-import
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('unplugin-auto-import configuration rolled back')
    } catch (error) {
      logger.error(
        'Failed to rollback unplugin-auto-import configuration:',
        error
      )
      throw error
    }
  },
}

function getViteConfigContent(): string {
  return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
})
`
}

function injectAutoImportPlugin(content: string): string {
  if (
    content.includes('unplugin-auto-import') ||
    content.includes('AutoImport(')
  ) {
    return content
  }

  let updated = content

  if (!updated.includes("from 'unplugin-auto-import/vite'")) {
    const importStatement =
      "import AutoImport from 'unplugin-auto-import/vite'\n"
    const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*\n)/g
    const imports = updated.match(importRegex) || []
    const lastImportIndex = updated.lastIndexOf(
      imports[imports.length - 1] || ''
    )
    const afterImports =
      lastImportIndex >= 0
        ? lastImportIndex + (imports[imports.length - 1]?.length || 0)
        : 0
    updated =
      updated.slice(0, afterImports) +
      importStatement +
      updated.slice(afterImports)
  }

  const pluginSnippet = `AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    })`

  if (updated.includes('plugins: [')) {
    updated = updated.replace(
      /plugins:\s*\[/,
      `plugins: [\n    ${pluginSnippet},`
    )
  } else if (updated.includes('plugins: [vue()')) {
    updated = updated.replace(
      /plugins:\s*\[\s*vue\(\)\s*,?/,
      `plugins: [vue(), ${pluginSnippet},`
    )
  } else if (updated.includes('vue()')) {
    updated = updated.replace(/vue\(\)\s*,?/, `vue(), ${pluginSnippet},`)
  }

  return updated
}
