import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { checkPathExists, normalizePath } from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

import {
  getPluginServices,
  getRollbackManager,
} from '../utils/plugin-services.js'

const logger = getModuleLogger()

/**
 * Plugin Next.js Middleware
 *
 * Crée un template de middleware pour Next.js
 * Documentation officielle : https://nextjs.org/docs/app/building-your-application/routing/middleware
 *
 * @example
 * ```typescript
 * import { nextjsMiddlewarePlugin } from './plugins/nextjs/middleware'
 * await nextjsMiddlewarePlugin.configure(ctx)
 * ```
 */
export const nextjsMiddlewarePlugin: Plugin = {
  name: 'nextjs-middleware',
  displayName: 'Next.js Middleware',
  description: 'Template de middleware pour Next.js',
  category: Category.TOOLING,
  version: undefined,

  frameworks: ['nextjs'],

  /**
   * Détecte si le middleware existe déjà
   */
  detect: (_ctx: ProjectContext): boolean => {
    // Le middleware est un fichier, on ne peut pas le détecter via les dépendances
    // On retourne false pour toujours proposer de le créer
    return false
  },

  /**
   * Pas d'installation nécessaire
   */
  install(_ctx: ProjectContext): Promise<InstallResult> {
    logger.info('Middleware is a file, no installation needed')
    return Promise.resolve({
      packages: {},
      success: true,
      message: 'Middleware is a file, no installation needed',
    })
  },

  /**
   * Crée le fichier middleware.ts/js à la racine du projet
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const { writer } = getPluginServices(ctx)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      const middlewarePath = join(projectRoot, `middleware.${extension}`)
      const middlewareExists = await checkPathExists(
        middlewarePath,
        ctx.fsAdapter
      )

      if (middlewareExists) {
        logger.warn('middleware.ts already exists, skipping creation')
      } else {
        const middlewareContent = getMiddlewareContent(extension)

        await writer.createFile(middlewarePath, middlewareContent)
        files.push({
          type: 'create',
          path: normalizePath(middlewarePath),
          content: middlewareContent,
          backup: false,
        })

        logger.info(`Created middleware.${extension}`)
      }

      return {
        files,
        success: true,
        message: 'Next.js middleware created successfully',
      }
    } catch (error) {
      logger.error('Failed to create middleware:', error)
      return {
        files,
        success: false,
        message: `Failed to create middleware: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = getRollbackManager(_ctx)
    try {
      await backupManager.restoreAll()
      logger.info('Middleware configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback middleware configuration:', error)
      throw error
    }
  },
}

/**
 * Génère le contenu du middleware
 */
function getMiddlewareContent(extension: string): string {
  if (extension === 'ts') {
    return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Ajoutez votre logique de middleware ici
  // Exemple : redirection, authentification, etc.
  
  return NextResponse.next()
}

// Configurez les chemins sur lesquels le middleware s'applique
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
`
  }

  return `import { NextResponse } from 'next/server'

export function middleware(request) {
  // Ajoutez votre logique de middleware ici
  // Exemple : redirection, authentification, etc.
  
  return NextResponse.next()
}

// Configurez les chemins sur lesquels le middleware s'applique
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
`
}
