import { resolve, join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ensureDirectory, normalizePath } from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()
import {
  getPluginServices,
  getRollbackManager,
} from '../utils/plugin-services.js'

/**
 * Plugin Zustand
 *
 * State management simple et performant pour React
 * Documentation officielle : https://zustand.docs.pmnd.rs
 *
 * @example
 * ```typescript
 * import { zustandPlugin } from './plugins/state/zustand'
 * await zustandPlugin.install(ctx)
 * await zustandPlugin.configure(ctx)
 * ```
 */
export const zustandPlugin: Plugin = {
  name: 'zustand',
  displayName: 'Zustand',
  description: 'State management simple et performant',
  category: Category.STATE,
  version: '^5.0.9',

  frameworks: ['react'],
  incompatibleWith: ['@reduxjs/toolkit', 'jotai'],

  /**
   * Détecte si Zustand est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['zustand'] !== undefined
  },

  /**
   * Installe Zustand
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Zustand is already installed')
      return {
        packages: {},
        success: true,
        message: 'Zustand already installed',
      }
    }

    const packages: string[] = ['zustand']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Zustand')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Zustand:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Zustand: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Zustand dans le projet
   *
   * Crée :
   * - src/store/index.ts (ou .js) : Store Zustand exemple
   * - src/store/useStore.ts (ou .js) : Hook personnalisé (optionnel, pour TypeScript)
   *
   * Documentation : https://zustand.docs.pmnd.rs/getting-started/introduction
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const { writer } = getPluginServices(ctx)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier store si nécessaire
      const storeDir = join(srcDir, 'store')
      await ensureDirectory(storeDir, ctx.fsAdapter)

      // 2. Créer src/store/index.ts (store principal)
      const storePath = join(storeDir, `index.${extension}`)
      const storeContent = ctx.typescript
        ? getStoreContentTS()
        : getStoreContentJS()

      await writer.createFile(storePath, storeContent)
      files.push({
        type: 'create',
        path: normalizePath(storePath),
        content: storeContent,
        backup: false,
      })

      logger.info(`Created Zustand store: ${storePath}`)

      // 3. Pour TypeScript, créer aussi un exemple de hook typé
      if (ctx.typescript) {
        const hookPath = join(storeDir, 'useStore.ts')
        const hookContent = getTypedHookContentTS()

        await writer.createFile(hookPath, hookContent)
        files.push({
          type: 'create',
          path: normalizePath(hookPath),
          content: hookContent,
          backup: false,
        })

        logger.info(`Created typed hook example: ${hookPath}`)
      }

      return {
        files,
        success: true,
        message: 'Zustand configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Zustand:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Zustand: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Zustand
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = getRollbackManager(_ctx)
    try {
      await backupManager.restoreAll()
      logger.info('Zustand configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Zustand configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier store/index.ts (TypeScript)
 * Basé sur la documentation officielle : https://zustand.docs.pmnd.rs/getting-started/introduction
 */
function getStoreContentTS(): string {
  return `import { create } from 'zustand'

/**
 * Store Zustand d'exemple
 * 
 * Documentation : https://zustand.docs.pmnd.rs
 * 
 * Ce store est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
interface BearState {
  bears: number
  increasePopulation: () => void
  removeAllBears: () => void
  updateBears: (newBears: number) => void
}

export const useBearStore = create<BearState>((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
  updateBears: (newBears) => set({ bears: newBears }),
}))
`
}

/**
 * Contenu du fichier store/index.js (JavaScript)
 */
function getStoreContentJS(): string {
  return `import { create } from 'zustand'

/**
 * Store Zustand d'exemple
 * 
 * Documentation : https://zustand.docs.pmnd.rs
 * 
 * Ce store est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
  updateBears: (newBears) => set({ bears: newBears }),
}))
`
}

/**
 * Contenu du fichier store/useStore.ts (TypeScript)
 * Exemple de hook personnalisé avec sélecteurs typés
 */
function getTypedHookContentTS(): string {
  return `import { useBearStore } from './index'

/**
 * Exemple d'utilisation de Zustand avec des sélecteurs typés
 * 
 * Vous pouvez créer des hooks personnalisés pour faciliter l'utilisation
 * de vos stores dans vos composants.
 * 
 * Exemple d'utilisation :
 * 
 * function MyComponent() {
 *   const bears = useBears()
 *   const increase = useIncreaseBears()
 *   
 *   return (
 *     <div>
 *       <p>{bears} bears</p>
 *       <button onClick={increase}>Add bear</button>
 *     </div>
 *   )
 * }
 */

/**
 * Sélecteur pour obtenir uniquement le nombre de bears
 */
export const useBears = () => useBearStore((state) => state.bears)

/**
 * Sélecteur pour obtenir uniquement la fonction increasePopulation
 */
export const useIncreaseBears = () =>
  useBearStore((state) => state.increasePopulation)

/**
 * Sélecteur pour obtenir uniquement la fonction removeAllBears
 */
export const useRemoveAllBears = () =>
  useBearStore((state) => state.removeAllBears)
`
}
