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
 * Plugin React Router v7
 *
 * Configuration moderne avec createBrowserRouter et RouterProvider
 * Documentation officielle : https://reactrouter.com
 *
 * @example
 * ```typescript
 * import { reactRouterPlugin } from './plugins/routing/react-router'
 * await reactRouterPlugin.install(ctx)
 * await reactRouterPlugin.configure(ctx)
 * ```
 */
export const reactRouterPlugin: Plugin = {
  name: 'react-router-dom',
  displayName: 'React Router',
  description: 'Routing déclaratif pour React (v7)',
  category: Category.ROUTING,
  version: '^7.11.0',

  frameworks: ['react'],
  incompatibleWith: ['@tanstack/react-router'],
  recommends: ['@types/react-router-dom'],

  /**
   * Détecte si React Router est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['react-router-dom'] !== undefined ||
      ctx.dependencies['react-router'] !== undefined
    )
  },

  /**
   * Installe React Router et les types TypeScript si nécessaire
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('React Router is already installed')
      return {
        packages: {},
        success: true,
        message: 'React Router already installed',
      }
    }

    const packages: string[] = ['react-router-dom']

    // Ajouter les types TypeScript si nécessaire
    if (ctx.typescript) {
      packages.push('@types/react-router-dom')
    }

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info(`Successfully installed React Router v7`)

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install React Router:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install React Router: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure React Router dans le projet
   *
   * Crée :
   * - src/router.tsx (ou .ts) : Configuration du router
   * - src/routes/Home.tsx (ou .tsx) : Route exemple
   *
   * Modifie :
   * - src/App.tsx (ou App.jsx) : Intègre RouterProvider
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'tsx' : 'jsx'

    try {
      // 1. Créer le dossier routes si nécessaire
      const routesDir = join(srcDir, 'routes')
      await ensureDirectory(routesDir, ctx.fsAdapter)

      // 2. Créer src/router.tsx (configuration du router)
      const routerPath = join(srcDir, `router.${extension}`)
      const routerContent = ctx.typescript
        ? getRouterContentTS()
        : getRouterContentJS()

      await writer.createFile(routerPath, routerContent)
      files.push({
        type: 'create',
        path: normalizePath(routerPath),
        content: routerContent,
        backup: false,
      })

      logger.info(`Created router configuration: ${routerPath}`)

      // 3. Créer src/routes/Home.tsx (route exemple)
      const homeRoutePath = join(routesDir, `Home.${extension}`)
      const homeRouteContent = ctx.typescript
        ? getHomeRouteContentTS()
        : getHomeRouteContentJS()

      await writer.createFile(homeRoutePath, homeRouteContent)
      files.push({
        type: 'create',
        path: normalizePath(homeRoutePath),
        content: homeRouteContent,
        backup: false,
      })

      logger.info(`Created example route: ${homeRoutePath}`)

      // 4. Modifier App.tsx pour intégrer RouterProvider
      const appPath = join(srcDir, `App.${extension}`)
      const appExists = await checkPathExists(appPath, ctx.fsAdapter)

      if (appExists) {
        const appContent = await readFileContent(
          appPath,
          'utf-8',
          ctx.fsAdapter
        )
        const modifiedAppContent = injectRouterProvider(
          appContent,
          ctx.typescript
        )

        await writer.writeFile(appPath, modifiedAppContent, { backup: true })
        files.push({
          type: 'modify',
          path: normalizePath(appPath),
          content: modifiedAppContent,
          backup: true,
        })

        logger.info(`Updated App.${extension} with RouterProvider`)
      } else {
        // Créer App.tsx si il n'existe pas
        const appContent = ctx.typescript
          ? getAppContentTS()
          : getAppContentJS()

        await writer.createFile(appPath, appContent)
        files.push({
          type: 'create',
          path: normalizePath(appPath),
          content: appContent,
          backup: false,
        })

        logger.info(`Created App.${extension} with RouterProvider`)
      }

      return {
        files,
        success: true,
        message: 'React Router configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure React Router:', error)
      return {
        files,
        success: false,
        message: `Failed to configure React Router: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration React Router
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('React Router configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback React Router configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier router.tsx (TypeScript)
 */
function getRouterContentTS(): string {
  return `import { createBrowserRouter } from 'react-router-dom'
import Home from './routes/Home'

/**
 * Configuration du router React Router v7
 * 
 * Documentation : https://reactrouter.com
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
])

export default router
`
}

/**
 * Contenu du fichier router.jsx (JavaScript)
 */
function getRouterContentJS(): string {
  return `import { createBrowserRouter } from 'react-router-dom'
import Home from './routes/Home'

/**
 * Configuration du router React Router v7
 * 
 * Documentation : https://reactrouter.com
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
])

export default router
`
}

/**
 * Contenu du fichier routes/Home.tsx (TypeScript)
 */
function getHomeRouteContentTS(): string {
  return `/**
 * Route d'exemple - Home
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier ou la supprimer selon vos besoins.
 */
export default function Home() {
  return (
    <div>
      <h1>Welcome to React Router v7</h1>
      <p>This is the home page.</p>
    </div>
  )
}
`
}

/**
 * Contenu du fichier routes/Home.jsx (JavaScript)
 */
function getHomeRouteContentJS(): string {
  return `/**
 * Route d'exemple - Home
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier ou la supprimer selon vos besoins.
 */
export default function Home() {
  return (
    <div>
      <h1>Welcome to React Router v7</h1>
      <p>This is the home page.</p>
    </div>
  )
}
`
}

/**
 * Contenu du fichier App.tsx avec RouterProvider (TypeScript)
 */
function getAppContentTS(): string {
  return `import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './App.css'

function App() {
  return <RouterProvider router={router} />
}

export default App
`
}

/**
 * Contenu du fichier App.jsx avec RouterProvider (JavaScript)
 */
function getAppContentJS(): string {
  return `import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './App.css'

function App() {
  return <RouterProvider router={router} />
}

export default App
`
}

/**
 * Injecte RouterProvider dans un fichier App existant
 */
function injectRouterProvider(content: string, isTypeScript: boolean): string {
  // Vérifier si RouterProvider est déjà présent
  if (content.includes('RouterProvider')) {
    logger.warn('RouterProvider already present in App file')
    return content
  }

  // Vérifier si react-router-dom est déjà importé
  const hasRouterImport =
    content.includes("from 'react-router-dom'") ||
    content.includes('from "react-router-dom"')

  // Vérifier si router est déjà importé
  const hasRouterImportFromRouter =
    content.includes("from './router'") || content.includes('from "./router"')

  let modifiedContent = content

  // Ajouter l'import de RouterProvider si nécessaire
  if (!hasRouterImport) {
    const importStatement = isTypeScript
      ? "import { RouterProvider } from 'react-router-dom'\n"
      : "import { RouterProvider } from 'react-router-dom'\n"

    // Trouver la dernière ligne d'import
    const importLines = content.split('\n')
    let lastImportIndex = 0
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i]?.startsWith('import ')) {
        lastImportIndex = i
      }
    }

    importLines.splice(lastImportIndex + 1, 0, importStatement.trim())
    modifiedContent = importLines.join('\n')
  }

  // Ajouter l'import du router si nécessaire
  if (!hasRouterImportFromRouter) {
    const routerImport = isTypeScript
      ? "import { router } from './router'\n"
      : "import { router } from './router'\n"

    // Trouver la dernière ligne d'import
    const importLines = modifiedContent.split('\n')
    let lastImportIndex = 0
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i]?.startsWith('import ')) {
        lastImportIndex = i
      }
    }

    importLines.splice(lastImportIndex + 1, 0, routerImport.trim())
    modifiedContent = importLines.join('\n')
  }

  // Détecter si Provider est déjà présent (Redux/autre state management)
  const hasProvider = modifiedContent.includes('<Provider')

  // Remplacer le contenu de la fonction App ou du composant
  // Chercher function App() ou const App = ou export default function App()
  const appFunctionRegex =
    /(export\s+default\s+)?function\s+App\s*\([^)]*\)\s*\{[\s\S]*?return\s+\([\s\S]*?\)\s*;?\s*\n\s*\}/m

  if (appFunctionRegex.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(appFunctionRegex, (match) => {
      // Extraire juste la signature de la fonction
      const signatureMatch = match.match(
        /((export\s+default\s+)?function\s+App\s*\([^)]*\))/
      )
      if (signatureMatch) {
        // Si Provider existe, on enveloppe RouterProvider dans le Provider existant
        if (hasProvider) {
          // Extraire le contenu du Provider
          const providerMatch = match.match(
            /<Provider[\s\S]*?>([\s\S]*?)<\/Provider>/m
          )
          if (providerMatch) {
            const providerOpening = match.match(/<Provider[^>]*>/)?.[0] || ''
            const returnStatement = `  return (\n    ${providerOpening}\n      <RouterProvider router={router} />\n    </Provider>\n  )\n`
            return `${signatureMatch[1]} {\n${returnStatement}}\n`
          }
        }

        // Sinon, juste RouterProvider
        const returnStatement = isTypeScript
          ? '  return <RouterProvider router={router} />\n'
          : '  return <RouterProvider router={router} />\n'

        return `${signatureMatch[1]} {\n${returnStatement}}\n`
      }
      return match
    })
  } else {
    // Chercher const App = () =>
    const arrowFunctionRegex =
      /(const|let|var)\s+App\s*=\s*\([^)]*\)\s*=>\s*\{?[\s\S]*?return\s+[\s\S]*?\}?/m

    if (arrowFunctionRegex.test(modifiedContent)) {
      modifiedContent = modifiedContent.replace(arrowFunctionRegex, (match) => {
        if (hasProvider) {
          // Extraire le contenu du Provider
          const providerMatch = match.match(
            /<Provider[\s\S]*?>([\s\S]*?)<\/Provider>/m
          )
          if (providerMatch) {
            const providerOpening = match.match(/<Provider[^>]*>/)?.[0] || ''
            return `const App = () => {\n  return (\n    ${providerOpening}\n      <RouterProvider router={router} />\n    </Provider>\n  )\n}`
          }
        }
        return `const App = () => {\n  return <RouterProvider router={router} />\n}`
      })
    } else {
      // Ajouter à la fin du fichier si on ne trouve rien
      modifiedContent += `\n\nconst App = () => {\n  return <RouterProvider router={router} />\n}\n\nexport default App\n`
    }
  }

  return modifiedContent
}
