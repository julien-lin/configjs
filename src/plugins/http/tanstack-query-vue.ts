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
 * Plugin TanStack Query (Vue)
 *
 * Data fetching et caching pour Vue
 * Documentation officielle : https://tanstack.com/query/latest/docs/framework/vue/overview
 *
 * @example
 * ```typescript
 * import { tanstackVueQueryPlugin } from './plugins/http/tanstack-query-vue'
 * await tanstackVueQueryPlugin.install(ctx)
 * await tanstackVueQueryPlugin.configure(ctx)
 * ```
 */
export const tanstackVueQueryPlugin: Plugin = {
  name: '@tanstack/vue-query',
  displayName: 'TanStack Query (Vue)',
  description: 'Data fetching et caching pour Vue',
  category: Category.HTTP,
  version: '^5.92.6',

  frameworks: ['vue'],

  /**
   * Détecte si TanStack Vue Query est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@tanstack/vue-query'] !== undefined ||
      ctx.devDependencies['@tanstack/vue-query'] !== undefined
    )
  },

  /**
   * Installe TanStack Vue Query
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('TanStack Vue Query is already installed')
      return {
        packages: {},
        success: true,
        message: 'TanStack Vue Query already installed',
      }
    }

    const packages: string[] = ['@tanstack/vue-query']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed TanStack Vue Query')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install TanStack Vue Query:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install TanStack Vue Query: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure TanStack Vue Query
   *
   * Crée :
   * - src/lib/query-client.ts
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
      const libDir = join(srcDir, 'lib')
      await ensureDirectory(libDir, ctx.fsAdapter)

      const queryClientPath = join(libDir, `query-client.${extension}`)
      const queryClientExists = await checkPathExists(
        queryClientPath,
        ctx.fsAdapter
      )
      if (!queryClientExists) {
        const queryClientContent = ctx.typescript
          ? getQueryClientContentTS()
          : getQueryClientContentJS()
        await writer.createFile(queryClientPath, queryClientContent)
        files.push({
          type: 'create',
          path: normalizePath(queryClientPath),
          content: queryClientContent,
          backup: false,
        })
        logger.info(`Created TanStack Query client: ${queryClientPath}`)
      }

      const mainPath = join(srcDir, `main.${extension}`)
      const mainExists = await checkPathExists(mainPath, ctx.fsAdapter)
      if (mainExists) {
        const mainContent = await readFileContent(
          mainPath,
          'utf-8',
          ctx.fsAdapter
        )
        const updatedMain = injectVueQuery(mainContent)
        if (updatedMain !== mainContent) {
          await writer.writeFile(mainPath, updatedMain, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(mainPath),
            content: updatedMain,
            backup: true,
          })
          logger.info(`Updated main file with Vue Query: ${mainPath}`)
        }
      } else {
        logger.warn(`Main file not found: ${mainPath}`)
      }

      return {
        files,
        success: true,
        message: 'TanStack Vue Query configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure TanStack Vue Query:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure TanStack Vue Query: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration TanStack Vue Query
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('TanStack Vue Query configuration rolled back')
    } catch (error) {
      logger.error(
        'Failed to rollback TanStack Vue Query configuration:',
        error
      )
      throw error
    }
  },
}

function getQueryClientContentTS(): string {
  return `import { QueryClient } from '@tanstack/vue-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
})
`
}

function getQueryClientContentJS(): string {
  return `import { QueryClient } from '@tanstack/vue-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
})
`
}

function injectVueQuery(content: string): string {
  if (
    content.includes('@tanstack/vue-query') ||
    content.includes('VueQueryPlugin')
  ) {
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
    beforeImports +
    "import { VueQueryPlugin } from '@tanstack/vue-query'\n" +
    "import { queryClient } from './lib/query-client'\n" +
    afterImportsContent

  if (!updatedContent.includes('app.use(VueQueryPlugin')) {
    updatedContent = updatedContent.replace(
      /(const\s+app\s*=\s*createApp\([^)]+\))/,
      `$1\napp.use(VueQueryPlugin, { queryClient })`
    )
  }

  return updatedContent
}
