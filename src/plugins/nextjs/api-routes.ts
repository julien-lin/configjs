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
  ensureDirectory,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Next.js API Routes
 *
 * Crée un template d'API route pour Next.js
 * Documentation officielle : https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 *
 * @example
 * ```typescript
 * import { nextjsApiRoutesPlugin } from './plugins/nextjs/api-routes'
 * await nextjsApiRoutesPlugin.configure(ctx)
 * ```
 */
export const nextjsApiRoutesPlugin: Plugin = {
  name: 'nextjs-api-routes',
  displayName: 'Next.js API Routes',
  description: "Template d'API routes pour Next.js",
  category: Category.TOOLING,
  version: undefined,

  frameworks: ['nextjs'],

  /**
   * Détecte si des API routes existent déjà
   */
  detect: (_ctx: ProjectContext): boolean => {
    // On retourne false pour toujours proposer de créer un exemple
    return false
  },

  /**
   * Pas d'installation nécessaire
   */
  install(_ctx: ProjectContext): Promise<InstallResult> {
    logger.info('API routes are files, no installation needed')
    return Promise.resolve({
      packages: {},
      success: true,
      message: 'API routes are files, no installation needed',
    })
  },

  /**
   * Crée un exemple d'API route
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const extension = ctx.typescript ? 'ts' : 'js'
    const hasSrcDir = ctx.srcDir && ctx.srcDir !== '.'

    try {
      // Détecter App Router ou Pages Router
      const appApiPath = hasSrcDir
        ? join(
            projectRoot,
            ctx.srcDir,
            'app',
            'api',
            'hello',
            `route.${extension}`
          )
        : join(projectRoot, 'app', 'api', 'hello', `route.${extension}`)
      const pagesApiPath = hasSrcDir
        ? join(projectRoot, ctx.srcDir, 'pages', 'api', `hello.${extension}`)
        : join(projectRoot, 'pages', 'api', `hello.${extension}`)

      const appApiExists = await checkPathExists(appApiPath, ctx.fsAdapter)
      const pagesApiExists = await checkPathExists(pagesApiPath, ctx.fsAdapter)

      // Si un fichier API existe déjà, ne rien faire
      if (appApiExists || pagesApiExists) {
        logger.warn('API route already exists')
        return {
          files: [],
          success: true,
          message: 'API route already exists',
        }
      }

      // Utiliser ctx.nextjsRouter si disponible, sinon détecter
      const isAppRouter =
        ctx.nextjsRouter === 'app' ||
        (ctx.nextjsRouter === undefined &&
          (await checkPathExists(
            hasSrcDir
              ? join(projectRoot, ctx.srcDir, 'app')
              : join(projectRoot, 'app')
          )))

      let targetPath: string

      if (isAppRouter) {
        // App Router
        targetPath = appApiPath
        await ensureDirectory(
          join(projectRoot, hasSrcDir ? ctx.srcDir : '.', 'app', 'api', 'hello')
        )
      } else {
        // Pages Router
        targetPath = pagesApiPath
        await ensureDirectory(
          join(projectRoot, hasSrcDir ? ctx.srcDir : '.', 'pages', 'api')
        )
      }

      const apiContent = getApiRouteContent(extension, isAppRouter)

      await writer.createFile(targetPath, apiContent)
      files.push({
        type: 'create',
        path: normalizePath(targetPath),
        content: apiContent,
        backup: false,
      })

      logger.info(`Created API route: ${targetPath}`)

      return {
        files,
        success: true,
        message: 'Next.js API route created successfully',
      }
    } catch (error) {
      logger.error('Failed to create API route:', error)
      return {
        files,
        success: false,
        message: `Failed to create API route: ${error instanceof Error ? error.message : String(error)}`,
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
      logger.info('API route configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback API route configuration:', error)
      throw error
    }
  },
}

/**
 * Génère le contenu de l'API route
 */
function getApiRouteContent(extension: string, isAppRouter: boolean): string {
  if (isAppRouter) {
    // App Router : app/api/hello/route.ts
    if (extension === 'ts') {
      return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello from Next.js API!' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ message: 'POST request received', data: body })
}
`
    }

    return `import { NextResponse } from 'next/server'

export async function GET(request) {
  return NextResponse.json({ message: 'Hello from Next.js API!' })
}

export async function POST(request) {
  const body = await request.json()
  return NextResponse.json({ message: 'POST request received', data: body })
}
`
  } else {
    // Pages Router : pages/api/hello.ts
    if (extension === 'ts') {
      return `import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  message: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Hello from Next.js API!' })
  } else if (req.method === 'POST') {
    res.status(200).json({ message: 'POST request received', data: req.body })
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(\`Method \${req.method} Not Allowed\`)
  }
}
`
    }

    return `export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Hello from Next.js API!' })
  } else if (req.method === 'POST') {
    res.status(200).json({ message: 'POST request received', data: req.body })
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(\`Method \${req.method} Not Allowed\`)
  }
}
`
  }
}
