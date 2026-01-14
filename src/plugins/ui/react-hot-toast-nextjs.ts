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
import { logger } from '../../utils/logger.js'

/**
 * Plugin React Hot Toast pour Next.js
 *
 * Notifications toast pour Next.js
 * Documentation officielle : https://react-hot-toast.com
 *
 * @example
 * ```typescript
 * import { reactHotToastNextjsPlugin } from './plugins/ui/react-hot-toast-nextjs'
 * await reactHotToastNextjsPlugin.install(ctx)
 * await reactHotToastNextjsPlugin.configure(ctx)
 * ```
 */
export const reactHotToastNextjsPlugin: Plugin = {
  name: 'react-hot-toast-nextjs',
  displayName: 'React Hot Toast (Next.js)',
  description: 'Notifications toast pour Next.js',
  category: Category.UI,
  version: '^2.4.1',

  frameworks: ['nextjs'],

  /**
   * Détecte si React Hot Toast est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['react-hot-toast'] !== undefined ||
      ctx.devDependencies['react-hot-toast'] !== undefined
    )
  },

  /**
   * Installe React Hot Toast
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('React Hot Toast is already installed')
      return {
        packages: {},
        success: true,
        message: 'React Hot Toast already installed',
      }
    }

    try {
      const packages: string[] = ['react-hot-toast']

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed React Hot Toast')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed React Hot Toast: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install React Hot Toast:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install React Hot Toast: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure React Hot Toast dans le projet Next.js
   *
   * Ajoute :
   * - Toaster dans app/layout.tsx (App Router) ou pages/_app.tsx (Pages Router)
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
        // App Router
        const appLayoutExists = await checkPathExists(
          appLayoutPath,
          ctx.fsAdapter
        )
        if (appLayoutExists) {
          targetPath = appLayoutPath
          targetContent = await readFileContent(
            appLayoutPath,
            'utf-8',
            ctx.fsAdapter
          )
        } else {
          // Créer app/layout.tsx par défaut
          targetPath = appLayoutPath
          targetContent = ctx.typescript
            ? getAppLayoutContentTS()
            : getAppLayoutContentJS()
        }
      } else {
        // Pages Router
        const pagesAppExists = await checkPathExists(
          pagesAppPath,
          ctx.fsAdapter
        )
        if (pagesAppExists) {
          targetPath = pagesAppPath
          targetContent = await readFileContent(
            pagesAppPath,
            'utf-8',
            ctx.fsAdapter
          )
        } else {
          // Créer pages/_app.tsx par défaut
          targetPath = pagesAppPath
          targetContent = ctx.typescript
            ? getPagesAppContentTS()
            : getPagesAppContentJS()
        }
      }

      if (targetPath) {
        // Vérifier si Toaster est déjà présent
        const hasImport = targetContent.includes('react-hot-toast')
        const hasToaster = targetContent.includes('<Toaster />')

        if (!hasImport || !hasToaster) {
          const updatedContent = injectToaster(
            targetContent,
            ctx.typescript,
            isAppRouter
          )
          await writer.writeFile(targetPath, updatedContent, { backup: true })
          files.push({
            type: targetContent ? 'modify' : 'create',
            path: normalizePath(targetPath),
            content: updatedContent,
            backup: targetContent ? true : false,
          })
          logger.info(`Added Toaster to ${targetPath}`)
        } else {
          logger.warn('Toaster already configured')
        }
      }

      return {
        files,
        success: true,
        message: 'React Hot Toast configured successfully for Next.js',
      }
    } catch (error) {
      logger.error('Failed to configure React Hot Toast:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure React Hot Toast: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration React Hot Toast
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('React Hot Toast configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback React Hot Toast configuration:', error)
      throw error
    }
  },
}

/**
 * Injecte le Toaster dans le fichier layout ou _app
 */
function injectToaster(
  content: string,
  _isTypeScript: boolean,
  isAppRouter: boolean
): string {
  // Vérifier si déjà présent
  if (content.includes('<Toaster />') || content.includes('<Toaster/>')) {
    return content
  }

  let modifiedContent = content

  // Ajouter l'import si nécessaire
  if (!content.includes('react-hot-toast')) {
    const importStatement = "import { Toaster } from 'react-hot-toast'\n"
    const lines = modifiedContent.split('\n')
    let lastImportIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.startsWith('import ')) {
        lastImportIndex = i
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement.trim())
      modifiedContent = lines.join('\n')
    } else {
      modifiedContent = importStatement + modifiedContent
    }
  }

  // Injecter le Toaster dans le return
  if (isAppRouter) {
    // Pour App Router : injecter dans le body du layout
    if (modifiedContent.includes('return (')) {
      modifiedContent = modifiedContent.replace(
        /(return\s*\([\s\S]*?<body[^>]*>)/,
        (match) => `${match}\n        <Toaster />`
      )
    } else if (modifiedContent.includes('<body')) {
      modifiedContent = modifiedContent.replace(
        /(<body[^>]*>)/,
        (match) => `${match}\n        <Toaster />`
      )
    } else {
      // Ajouter avant la fermeture du composant
      modifiedContent = modifiedContent.replace(
        /(\s*)(<\/[^>]+>\s*)$/,
        (match, indent) => `${indent}<Toaster />\n${match}`
      )
    }
  } else {
    // Pour Pages Router : injecter dans le return de _app
    if (modifiedContent.includes('return (')) {
      modifiedContent = modifiedContent.replace(
        /(return\s*\([\s\S]*?<)/,
        (match) => `${match}<Toaster />\n      `
      )
    } else {
      // Ajouter avant la fermeture du composant
      modifiedContent = modifiedContent.replace(
        /(\s*)(<\/[^>]+>\s*)$/,
        (match, indent) => `${indent}<Toaster />\n${match}`
      )
    }
  }

  return modifiedContent
}

/**
 * Contenu par défaut pour app/layout.tsx (App Router)
 */
function getAppLayoutContentTS(): string {
  return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster />
        {children}
      </body>
    </html>
  )
}
`
}

function getAppLayoutContentJS(): string {
  return `import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster />
        {children}
      </body>
    </html>
  )
}
`
}

/**
 * Contenu par défaut pour pages/_app.tsx (Pages Router - TypeScript)
 */
function getPagesAppContentTS(): string {
  return `import type { AppProps } from 'next/app'
import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Toaster />
      <Component {...pageProps} />
    </>
  )
}
`
}

/**
 * Contenu par défaut pour pages/_app.jsx (Pages Router - JavaScript)
 */
function getPagesAppContentJS(): string {
  return `import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Toaster />
      <Component {...pageProps} />
    </>
  )
}
`
}
