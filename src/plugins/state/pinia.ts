import { resolve, join } from 'path'
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
 * Plugin Pinia
 *
 * State management officiel pour Vue.js 3
 * Documentation officielle : https://pinia.vuejs.org
 *
 * @example
 * ```typescript
 * import { piniaPlugin } from './plugins/state/pinia'
 * await piniaPlugin.install(ctx)
 * await piniaPlugin.configure(ctx)
 * ```
 */
export const piniaPlugin: Plugin = {
  name: 'pinia',
  displayName: 'Pinia',
  description: 'State management officiel pour Vue.js',
  category: Category.STATE,
  version: '^2.2.0',

  frameworks: ['vue'],

  /**
   * Détecte si Pinia est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['pinia'] !== undefined
  },

  /**
   * Installe Pinia
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Pinia is already installed')
      return {
        packages: {},
        success: true,
        message: 'Pinia already installed',
      }
    }

    // Vérifier que c'est Vue 3
    if (ctx.vueVersion !== '3') {
      logger.error('Pinia requires Vue 3')
      return {
        packages: {},
        success: false,
        message: 'Pinia requires Vue 3',
      }
    }

    const packages: string[] = ['pinia']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Pinia')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Pinia:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Pinia: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Pinia dans le projet
   *
   * Crée :
   * - src/stores/index.ts (ou .js) : Configuration Pinia
   * - src/stores/counter.ts (ou .js) : Store exemple
   *
   * Modifie :
   * - src/main.ts (ou main.js) : Intègre Pinia
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier stores si nécessaire
      const storesDir = join(srcDir, 'stores')
      await ensureDirectory(storesDir)

      // 2. Créer src/stores/index.ts (configuration Pinia)
      const storesIndexPath = join(storesDir, `index.${extension}`)
      const storesIndexContent = ctx.typescript
        ? getStoresIndexContentTS()
        : getStoresIndexContentJS()

      await writer.createFile(storesIndexPath, storesIndexContent)
      files.push({
        type: 'create',
        path: normalizePath(storesIndexPath),
        content: storesIndexContent,
        backup: false,
      })

      logger.info(`Created Pinia stores index: ${storesIndexPath}`)

      // 3. Créer src/stores/counter.ts (store exemple)
      const counterStorePath = join(storesDir, `counter.${extension}`)
      const counterStoreContent = ctx.typescript
        ? getCounterStoreContentTS()
        : getCounterStoreContentJS()

      await writer.createFile(counterStorePath, counterStoreContent)
      files.push({
        type: 'create',
        path: normalizePath(counterStorePath),
        content: counterStoreContent,
        backup: false,
      })

      logger.info(`Created counter store: ${counterStorePath}`)

      // 4. Modifier src/main.ts (ou main.js) pour intégrer Pinia
      const mainPath = join(srcDir, `main.${extension}`)
      if (await checkPathExists(mainPath)) {
        const mainContent = await readFileContent(mainPath)
        const updatedMainContent = updateMainFile(mainContent, ctx.typescript)

        if (updatedMainContent !== mainContent) {
          await writer.writeFile(mainPath, updatedMainContent, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(mainPath),
            content: updatedMainContent,
            backup: true,
          })

          logger.info(`Updated main file: ${mainPath}`)
        }
      } else {
        logger.warn(`Main file not found: ${mainPath}`)
      }

      return {
        files,
        success: true,
        message: 'Pinia configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Pinia:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Pinia: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Pinia
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    await backupManager.restoreAll()
    logger.info('Pinia configuration rolled back')
  },
}

/**
 * Contenu du fichier stores/index.ts (TypeScript)
 */
function getStoresIndexContentTS(): string {
  return `import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia
`
}

/**
 * Contenu du fichier stores/index.js (JavaScript)
 */
function getStoresIndexContentJS(): string {
  return `import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia
`
}

/**
 * Contenu du fichier stores/counter.ts (TypeScript)
 */
function getCounterStoreContentTS(): string {
  return `import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++
    },
    decrement() {
      this.count--
    },
  },
})
`
}

/**
 * Contenu du fichier stores/counter.js (JavaScript)
 */
function getCounterStoreContentJS(): string {
  return `import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++
    },
    decrement() {
      this.count--
    },
  },
})
`
}

/**
 * Met à jour le fichier main.ts ou main.js pour intégrer Pinia
 */
function updateMainFile(content: string, isTypeScript: boolean): string {
  // Vérifier si Pinia est déjà importé
  if (
    content.includes("from './stores'") ||
    content.includes("from './stores/index'")
  ) {
    return content
  }

  // Ajouter l'import de Pinia
  const piniaImport = isTypeScript
    ? "import pinia from './stores'\n"
    : "import pinia from './stores'\n"

  // Trouver la ligne avec createApp
  const createAppMatch = content.match(/createApp\([^)]+\)/)
  if (!createAppMatch) {
    logger.warn('Could not find createApp in main file')
    return content
  }

  // Ajouter l'import après les autres imports
  const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*\n)/g
  const imports = content.match(importRegex) || []
  const lastImportIndex = content.lastIndexOf(imports[imports.length - 1] || '')
  const afterImports =
    lastImportIndex >= 0
      ? lastImportIndex + (imports[imports.length - 1]?.length || 0)
      : 0

  // Insérer l'import de Pinia
  const beforeImports = content.substring(0, afterImports)
  const afterImportsContent = content.substring(afterImports)

  // Ajouter app.use(pinia) avant app.mount
  let updatedContent = beforeImports + piniaImport + afterImportsContent

  if (!updatedContent.includes('app.use(pinia)')) {
    updatedContent = updatedContent.replace(
      /(const\s+app\s*=\s*createApp\([^)]+\))/,
      `$1\napp.use(pinia)`
    )
  }

  return updatedContent
}
