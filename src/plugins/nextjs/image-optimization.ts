import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import {
  checkPathExists,
  readFileContent,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Next.js Image Optimization
 *
 * Configure l'optimisation d'images pour Next.js
 * Documentation officielle : https://nextjs.org/docs/app/api-reference/components/image
 *
 * @example
 * ```typescript
 * import { nextjsImageOptimizationPlugin } from './plugins/nextjs/image-optimization'
 * await nextjsImageOptimizationPlugin.configure(ctx)
 * ```
 */
export const nextjsImageOptimizationPlugin: Plugin = {
  name: 'nextjs-image-optimization',
  displayName: 'Next.js Image Optimization',
  description: "Configuration de l'optimisation d'images pour Next.js",
  category: Category.TOOLING,
  version: undefined,

  frameworks: ['nextjs'],

  /**
   * Détecte si l'optimisation d'images est déjà configurée
   */
  detect: (ctx: ProjectContext): boolean => {
    // L'optimisation d'images est toujours disponible dans Next.js
    // On vérifie si next.config est configuré
    return (
      ctx.dependencies['next'] !== undefined ||
      ctx.devDependencies['next'] !== undefined
    )
  },

  /**
   * Pas d'installation nécessaire, Next.js inclut déjà l'optimisation d'images
   */
  install(_ctx: ProjectContext): Promise<InstallResult> {
    logger.info(
      'Image optimization is built into Next.js, no installation needed'
    )
    return Promise.resolve({
      packages: {},
      success: true,
      message: 'Image optimization is built into Next.js',
    })
  },

  /**
   * Configure l'optimisation d'images dans next.config.js
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      const nextConfigPath = join(projectRoot, `next.config.${extension}`)
      const nextConfigExists = await checkPathExists(
        nextConfigPath,
        ctx.fsAdapter
      )

      if (nextConfigExists) {
        const existingContent = await readFileContent(
          nextConfigPath,
          'utf-8',
          ctx.fsAdapter
        )
        const updatedContent = injectImageConfig(existingContent, extension)

        if (updatedContent !== existingContent) {
          await writer.writeFile(nextConfigPath, updatedContent, {
            backup: true,
          })
          files.push({
            type: 'modify',
            path: normalizePath(nextConfigPath),
            content: updatedContent,
            backup: true,
          })
          logger.info(
            `Updated next.config.${extension} with image optimization`
          )
        }
      } else {
        // Créer next.config.js avec configuration d'images
        const configContent = getNextConfigContent(extension)
        await writer.createFile(nextConfigPath, configContent)
        files.push({
          type: 'create',
          path: normalizePath(nextConfigPath),
          content: configContent,
          backup: false,
        })
        logger.info(`Created next.config.${extension} with image optimization`)
      }

      return {
        files,
        success: true,
        message: 'Next.js image optimization configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure image optimization:', error)
      return {
        files,
        success: false,
        message: `Failed to configure image optimization: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('Image optimization configuration rolled back')
    } catch (error) {
      logger.error(
        'Failed to rollback image optimization configuration:',
        error
      )
      throw error
    }
  },
}

/**
 * Génère le contenu de next.config.js/ts avec configuration d'images
 */
function getNextConfigContent(extension: string): string {
  if (extension === 'ts') {
    return `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
`
  }

  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
`
}

/**
 * Injecte la configuration d'images dans next.config.js/ts existant
 */
function injectImageConfig(content: string, _extension: string): string {
  // Vérifier si la configuration images existe déjà
  if (content.includes('images:') && content.includes('remotePatterns')) {
    logger.warn('Image configuration already exists in next.config')
    return content
  }

  let modifiedContent = content

  // Chercher nextConfig = { ... } ou const nextConfig = { ... }
  const configRegex =
    /(const\s+nextConfig\s*=\s*\{|nextConfig\s*=\s*\{)([\s\S]*?)(\})/m

  if (configRegex.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      configRegex,
      (match: string, start: string, configContent: string) => {
        // Vérifier si images existe déjà
        if (configContent.includes('images:')) {
          return match
        }

        // Ajouter images avant la fermeture
        const trimmed = configContent.trim()
        const hasTrailingComma = trimmed.endsWith(',')
        const imageConfig = `  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },${hasTrailingComma ? '' : '\n'}`

        return `${start}${trimmed}${hasTrailingComma ? '' : ','}\n${imageConfig}\n}`
      }
    )
  } else {
    // Si on ne trouve pas la structure, ajouter à la fin
    const imageConfig = `\n  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },`
    modifiedContent = modifiedContent.replace(
      /(\}\s*)$/,
      (match) => `${imageConfig}\n${match}`
    )
  }

  return modifiedContent
}
