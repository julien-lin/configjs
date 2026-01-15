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
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin unplugin-vue-components
 *
 * Auto-import de composants Vue (Vite)
 * Documentation officielle : https://github.com/unplugin/unplugin-vue-components
 *
 * @example
 * ```typescript
 * import { unpluginVueComponentsPlugin } from './plugins/tooling/unplugin-vue-components'
 * await unpluginVueComponentsPlugin.install(ctx)
 * await unpluginVueComponentsPlugin.configure(ctx)
 * ```
 */
export const unpluginVueComponentsPlugin: Plugin = {
  name: 'unplugin-vue-components',
  displayName: 'Auto Components (Vue)',
  description: 'Auto-import de composants Vue',
  category: Category.TOOLING,
  version: '^30.0.0',

  frameworks: ['vue'],
  bundlers: ['vite'],

  /**
   * Détecte si unplugin-vue-components est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['unplugin-vue-components'] !== undefined ||
      ctx.devDependencies['unplugin-vue-components'] !== undefined
    )
  },

  /**
   * Installe unplugin-vue-components
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('unplugin-vue-components is already installed')
      return {
        packages: {},
        success: true,
        message: 'unplugin-vue-components already installed',
      }
    }

    try {
      const packages: string[] = ['unplugin-vue-components']

      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed unplugin-vue-components')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed unplugin-vue-components: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install unplugin-vue-components:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install unplugin-vue-components: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure unplugin-vue-components
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
        const updatedContent = injectComponentsPlugin(viteContent)

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
          logger.info(`Updated ${viteConfigPath} with Vue Components plugin`)
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
        logger.info(`Created ${viteConfigPath} with Vue Components plugin`)
      }

      return {
        files,
        success: true,
        message: 'unplugin-vue-components configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure unplugin-vue-components:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure unplugin-vue-components: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration unplugin-vue-components
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('unplugin-vue-components configuration rolled back')
    } catch (error) {
      logger.error(
        'Failed to rollback unplugin-vue-components configuration:',
        error
      )
      throw error
    }
  },
}

function getViteConfigContent(): string {
  return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: 'src/components.d.ts',
    }),
  ],
})
`
}

function injectComponentsPlugin(content: string): string {
  if (
    content.includes('unplugin-vue-components') ||
    content.includes('Components(')
  ) {
    return content
  }

  let updated = content

  if (!updated.includes("from 'unplugin-vue-components/vite'")) {
    const importStatement =
      "import Components from 'unplugin-vue-components/vite'\n"
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

  const pluginSnippet = `Components({
      dts: 'src/components.d.ts',
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
