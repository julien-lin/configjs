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
 * Plugin Next.js Font Optimization
 *
 * Configure l'optimisation de polices avec next/font
 * Documentation officielle : https://nextjs.org/docs/app/building-your-application/optimizing/fonts
 *
 * @example
 * ```typescript
 * import { nextjsFontOptimizationPlugin } from './plugins/nextjs/font-optimization'
 * await nextjsFontOptimizationPlugin.configure(ctx)
 * ```
 */
export const nextjsFontOptimizationPlugin: Plugin = {
  name: 'nextjs-font-optimization',
  displayName: 'Next.js Font Optimization',
  description: "Configuration de l'optimisation de polices avec next/font",
  category: Category.TOOLING,
  version: undefined,

  frameworks: ['nextjs'],

  /**
   * Détecte si l'optimisation de polices est déjà configurée
   */
  detect: (ctx: ProjectContext): boolean => {
    // Vérifier si next/font est utilisé dans le projet
    return (
      ctx.dependencies['next'] !== undefined ||
      ctx.devDependencies['next'] !== undefined
    )
  },

  /**
   * Pas d'installation nécessaire, next/font est inclus dans Next.js
   */
  install(_ctx: ProjectContext): Promise<InstallResult> {
    logger.info(
      'Font optimization is built into Next.js, no installation needed'
    )
    return Promise.resolve({
      packages: {},
      success: true,
      message: 'Font optimization is built into Next.js',
    })
  },

  /**
   * Configure l'optimisation de polices dans app/layout.tsx ou pages/_app.tsx
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const extension = ctx.typescript ? 'tsx' : 'jsx'
    const hasSrcDir = ctx.srcDir && ctx.srcDir !== '.'

    try {
      // Utiliser ctx.nextjsRouter si disponible, sinon détecter
      const isAppRouter =
        ctx.nextjsRouter === 'app' ||
        (ctx.nextjsRouter === undefined &&
          (await checkPathExists(
            hasSrcDir
              ? join(projectRoot, ctx.srcDir, 'app')
              : join(projectRoot, 'app')
          )))

      const appLayoutPath = hasSrcDir
        ? join(projectRoot, ctx.srcDir, 'app', `layout.${extension}`)
        : join(projectRoot, 'app', `layout.${extension}`)
      const pagesAppPath = hasSrcDir
        ? join(projectRoot, ctx.srcDir, 'pages', `_app.${extension}`)
        : join(projectRoot, 'pages', `_app.${extension}`)

      let targetPath: string | null = null
      let targetContent = ''

      if (isAppRouter) {
        const appLayoutExists = await checkPathExists(appLayoutPath, ctx.fsAdapter)
        if (appLayoutExists) {
          targetPath = appLayoutPath
          targetContent = await readFileContent(appLayoutPath, 'utf-8', ctx.fsAdapter)
        }
      } else {
        const pagesAppExists = await checkPathExists(pagesAppPath, ctx.fsAdapter)
        if (pagesAppExists) {
          targetPath = pagesAppPath
          targetContent = await readFileContent(pagesAppPath, 'utf-8', ctx.fsAdapter)
        }
      }

      if (targetPath && targetContent) {
        // Vérifier si next/font est déjà utilisé
        const hasFontImport = targetContent.includes("from 'next/font")
        const hasGoogleFont =
          targetContent.includes('Inter') || targetContent.includes('Roboto')

        if (!hasFontImport || !hasGoogleFont) {
          const updatedContent = injectFontOptimization(
            targetContent,
            ctx.typescript,
            isAppRouter
          )

          await writer.writeFile(targetPath, updatedContent, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(targetPath),
            content: updatedContent,
            backup: true,
          })
          logger.info(`Added font optimization to ${targetPath}`)
        } else {
          logger.warn('Font optimization already configured')
        }
      } else {
        logger.warn('Could not find layout or _app file to configure fonts')
      }

      return {
        files,
        success: true,
        message: 'Next.js font optimization configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure font optimization:', error)
      return {
        files,
        success: false,
        message: `Failed to configure font optimization: ${error instanceof Error ? error.message : String(error)}`,
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
      logger.info('Font optimization configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback font optimization configuration:', error)
      throw error
    }
  },
}

/**
 * Injecte l'optimisation de polices dans le fichier layout ou _app
 */
function injectFontOptimization(
  content: string,
  _isTypeScript: boolean,
  isAppRouter: boolean
): string {
  // Vérifier si déjà présent
  if (
    content.includes("from 'next/font") ||
    content.includes('from "next/font')
  ) {
    return content
  }

  let modifiedContent = content

  // Ajouter l'import next/font/google
  const fontImport = "import { Inter } from 'next/font/google'\n"
  const lines = modifiedContent.split('\n')
  let lastImportIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('import ')) {
      lastImportIndex = i
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, fontImport.trim())
    modifiedContent = lines.join('\n')
  } else {
    modifiedContent = fontImport + modifiedContent
  }

  // Ajouter la configuration de la police
  const fontConfig = isAppRouter
    ? `\nconst inter = Inter({ subsets: ['latin'] })\n`
    : `\nconst inter = Inter({ subsets: ['latin'] })\n`

  // Injecter après les imports
  modifiedContent = modifiedContent.replace(
    /(import[^;]+;[\s\S]*?)(\n)/,
    (match) => `${match}${fontConfig}`
  )

  // Ajouter className={inter.className} au body ou au composant principal
  if (isAppRouter) {
    if (modifiedContent.includes('<body')) {
      modifiedContent = modifiedContent.replace(
        /<body([^>]*)>/,
        (match: string, attrs: string) => {
          if (attrs.includes('className')) {
            return match
          }
          return `<body${attrs} className={inter.className}>`
        }
      )
    }
  } else {
    // Pour Pages Router, ajouter au composant principal
    if (modifiedContent.includes('return (')) {
      modifiedContent = modifiedContent.replace(
        /(return\s*\([\s\S]*?<div[^>]*)/,
        (match) => {
          if (match.includes('className')) {
            return match
          }
          return `${match} className={inter.className}`
        }
      )
    }
  }

  return modifiedContent
}
