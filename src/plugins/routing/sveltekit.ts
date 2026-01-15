import type {
  Plugin,
  ProjectContext,
  InstallResult,
  ConfigResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin SvelteKit
 *
 * Framework fullstack pour Svelte avec routing intégré
 * Documentation officielle : https://kit.svelte.dev
 *
 * @example
 * ```typescript
 * import { svelteKitPlugin } from './plugins/routing/sveltekit'
 * await svelteKitPlugin.install(ctx)
 * await svelteKitPlugin.configure(ctx)
 * ```
 */
export const svelteKitPlugin: Plugin = {
  name: '@sveltejs/kit',
  displayName: 'SvelteKit',
  description: 'Framework fullstack pour Svelte avec routing intégré',
  category: Category.ROUTING,
  version: '^2.5.0',

  frameworks: ['svelte'],

  /**
   * Détecte si SvelteKit est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['@sveltejs/kit'] !== undefined
  },

  /**
   * Installe SvelteKit
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('SvelteKit is already installed')
      return {
        packages: {},
        success: true,
        message: 'SvelteKit already installed',
      }
    }

    try {
      const packages = ['@sveltejs/kit', '@sveltejs/adapter-auto']

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info(`Installed ${packages.length} package(s)`)

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: 'SvelteKit installed successfully',
      }
    } catch (error) {
      logger.error(`Failed to install SvelteKit: ${String(error)}`)
      return {
        packages: {},
        success: false,
        message: `Installation failed: ${String(error)}`,
      }
    }
  },

  /**
   * Configure SvelteKit
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async configure(_ctx: ProjectContext): Promise<ConfigResult> {
    try {
      logger.info(
        'SvelteKit configuration: Already integrated in vite.config.ts'
      )

      return {
        success: true,
        message: 'SvelteKit configuration already set up',
        files: [],
      }
    } catch (error) {
      logger.error(`Configuration failed: ${String(error)}`)
      return {
        success: false,
        message: `Configuration failed: ${String(error)}`,
        files: [],
      }
    }
  },
}
