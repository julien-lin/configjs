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
import { ensureDirectory, normalizePath } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin VueUse
 *
 * Collection de composables Vue.js
 * Documentation officielle : https://vueuse.org
 *
 * @example
 * ```typescript
 * import { vueusePlugin } from './plugins/utils/vueuse'
 * await vueusePlugin.install(ctx)
 * await vueusePlugin.configure(ctx)
 * ```
 */
export const vueusePlugin: Plugin = {
  name: '@vueuse/core',
  displayName: 'VueUse',
  description: 'Collection de composables Vue.js',
  category: Category.TOOLING,
  version: '^11.0.0',

  frameworks: ['vue'],

  /**
   * Détecte si VueUse est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@vueuse/core'] !== undefined ||
      ctx.devDependencies['@vueuse/core'] !== undefined
    )
  },

  /**
   * Installe VueUse
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('VueUse is already installed')
      return {
        packages: {},
        success: true,
        message: 'VueUse already installed',
      }
    }

    const packages: string[] = ['@vueuse/core']

    // Ajouter @vueuse/nuxt si c'est un projet Nuxt (détection future)
    // Pour l'instant, on installe juste le core

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed VueUse')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install VueUse:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install VueUse: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure VueUse dans le projet
   *
   * Crée :
   * - src/composables/useExample.ts (ou .js) : Exemple d'utilisation
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier composables si nécessaire
      const composablesDir = join(srcDir, 'composables')
      await ensureDirectory(composablesDir)

      // 2. Créer src/composables/useExample.ts (exemple d'utilisation)
      const examplePath = join(composablesDir, `useExample.${extension}`)
      const exampleContent = ctx.typescript
        ? getExampleContentTS()
        : getExampleContentJS()

      await writer.createFile(examplePath, exampleContent)
      files.push({
        type: 'create',
        path: normalizePath(examplePath),
        content: exampleContent,
        backup: false,
      })

      logger.info(`Created VueUse example: ${examplePath}`)

      return {
        files,
        success: true,
        message: 'VueUse configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure VueUse:', error)
      return {
        files,
        success: false,
        message: `Failed to configure VueUse: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration VueUse
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    await backupManager.restoreAll()
    logger.info('VueUse configuration rolled back')
  },
}

/**
 * Contenu du fichier composables/useExample.ts (TypeScript)
 */
function getExampleContentTS(): string {
  return `import { ref, computed } from 'vue'
import { useMouse, useCounter } from '@vueuse/core'

/**
 * Exemple de composable utilisant VueUse
 */
export function useExample() {
  // Utiliser useMouse de VueUse
  const { x, y } = useMouse()

  // Utiliser useCounter de VueUse
  const { count, increment, decrement } = useCounter()

  // Computed property
  const position = computed(() => \`Position: \${x.value}, \${y.value}\`)

  return {
    x,
    y,
    count,
    increment,
    decrement,
    position,
  }
}
`
}

/**
 * Contenu du fichier composables/useExample.js (JavaScript)
 */
function getExampleContentJS(): string {
  return `import { computed } from 'vue'
import { useMouse, useCounter } from '@vueuse/core'

/**
 * Exemple de composable utilisant VueUse
 */
export function useExample() {
  // Utiliser useMouse de VueUse
  const { x, y } = useMouse()

  // Utiliser useCounter de VueUse
  const { count, increment, decrement } = useCounter()

  // Computed property
  const position = computed(() => \`Position: \${x.value}, \${y.value}\`)

  return {
    x,
    y,
    count,
    increment,
    decrement,
    position,
  }
}
`
}
