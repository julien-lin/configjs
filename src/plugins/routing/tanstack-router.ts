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
 * Plugin TanStack Router
 *
 * Router type-safe et performant pour React
 * Documentation officielle : https://tanstack.com/router
 *
 * @example
 * ```typescript
 * import { tanstackRouterPlugin } from './plugins/routing/tanstack-router'
 * await tanstackRouterPlugin.install(ctx)
 * await tanstackRouterPlugin.configure(ctx)
 * ```
 */
export const tanstackRouterPlugin: Plugin = {
  name: '@tanstack/react-router',
  displayName: 'TanStack Router',
  description: 'Router type-safe et performant',
  category: Category.ROUTING,
  version: '^1.144.0',

  frameworks: ['react'],
  incompatibleWith: ['react-router-dom'],

  /**
   * Détecte si TanStack Router est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@tanstack/react-router'] !== undefined ||
      ctx.devDependencies['@tanstack/react-router'] !== undefined
    )
  },

  /**
   * Installe TanStack Router
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('TanStack Router is already installed')
      return {
        packages: {},
        success: true,
        message: 'TanStack Router already installed',
      }
    }

    const packages: string[] = ['@tanstack/react-router']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed TanStack Router')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install TanStack Router:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install TanStack Router: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure TanStack Router dans le projet
   *
   * Crée :
   * - src/routes/__root.tsx (ou .tsx) : Route racine
   * - src/routes/index.tsx (ou .tsx) : Route d'accueil
   * - src/routes/about.tsx (ou .tsx) : Route exemple
   * - src/router.tsx (ou .tsx) : Configuration du router
   *
   * Modifie :
   * - src/App.tsx : Intègre RouterProvider
   *
   * Documentation : https://tanstack.com/router/latest/docs/framework/react/quick-start
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

      // 2. Créer src/routes/__root.tsx (route racine)
      const rootRoutePath = join(routesDir, `__root.${extension}`)
      const rootRouteContent = ctx.typescript
        ? getRootRouteContentTS()
        : getRootRouteContentJS()

      await writer.createFile(rootRoutePath, rootRouteContent)
      files.push({
        type: 'create',
        path: normalizePath(rootRoutePath),
        content: rootRouteContent,
        backup: false,
      })

      logger.info(`Created root route: ${rootRoutePath}`)

      // 3. Créer src/routes/index.tsx (route d'accueil)
      const indexRoutePath = join(routesDir, `index.${extension}`)
      const indexRouteContent = ctx.typescript
        ? getIndexRouteContentTS()
        : getIndexRouteContentJS()

      await writer.createFile(indexRoutePath, indexRouteContent)
      files.push({
        type: 'create',
        path: normalizePath(indexRoutePath),
        content: indexRouteContent,
        backup: false,
      })

      logger.info(`Created index route: ${indexRoutePath}`)

      // 4. Créer src/routes/about.tsx (route exemple)
      const aboutRoutePath = join(routesDir, `about.${extension}`)
      const aboutRouteContent = ctx.typescript
        ? getAboutRouteContentTS()
        : getAboutRouteContentJS()

      await writer.createFile(aboutRoutePath, aboutRouteContent)
      files.push({
        type: 'create',
        path: normalizePath(aboutRoutePath),
        content: aboutRouteContent,
        backup: false,
      })

      logger.info(`Created about route: ${aboutRoutePath}`)

      // 5. Créer src/router.tsx (configuration du router)
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

      // 6. Modifier App.tsx pour intégrer RouterProvider
      const appPath = join(srcDir, `App.${extension}`)
      const appExists = await checkPathExists(appPath, ctx.fsAdapter)

      if (appExists) {
        const appContent = await readFileContent(appPath, 'utf-8', ctx.fsAdapter)
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
        message: 'TanStack Router configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure TanStack Router:', error)
      return {
        files,
        success: false,
        message: `Failed to configure TanStack Router: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration TanStack Router
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('TanStack Router configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback TanStack Router configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier routes/__root.tsx (TypeScript)
 * Route racine de TanStack Router
 */
function getRootRouteContentTS(): string {
  return `import { createRootRoute, Outlet, Link } from '@tanstack/react-router'

/**
 * Route racine de TanStack Router
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */
export const rootRoute = createRootRoute({
  component: () => (
    <div>
      <nav>
        <Link to="/">Home</Link> | <Link to="/about">About</Link>
      </nav>
      <Outlet />
    </div>
  ),
})
`
}

/**
 * Contenu du fichier routes/__root.jsx (JavaScript)
 */
function getRootRouteContentJS(): string {
  return `import { createRootRoute, Outlet } from '@tanstack/react-router'

/**
 * Route racine de TanStack Router
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */
export const Route = createRootRoute({
  component: () => (
    <div>
      <nav>
        <a href="/">Home</a> | <a href="/about">About</a>
      </nav>
      <Outlet />
    </div>
  ),
})
`
}

/**
 * Contenu du fichier routes/index.tsx (TypeScript)
 * Route d'accueil
 */
function getIndexRouteContentTS(): string {
  return `import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'

/**
 * Route d'accueil
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    return (
      <div>
        <h1>Welcome to TanStack Router</h1>
        <p>This is the home page.</p>
      </div>
    )
  },
})
`
}

/**
 * Contenu du fichier routes/index.jsx (JavaScript)
 */
function getIndexRouteContentJS(): string {
  return `import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'

/**
 * Route d'accueil
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    return (
      <div>
        <h1>Welcome to TanStack Router</h1>
        <p>This is the home page.</p>
      </div>
    )
  },
})
`
}

/**
 * Contenu du fichier routes/about.tsx (TypeScript)
 * Route exemple
 */
function getAboutRouteContentTS(): string {
  return `import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'

/**
 * Route About (exemple)
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */
export const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: () => {
    return (
      <div>
        <h1>About</h1>
        <p>This is the about page.</p>
      </div>
    )
  },
})
`
}

/**
 * Contenu du fichier routes/about.jsx (JavaScript)
 */
function getAboutRouteContentJS(): string {
  return `import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'

/**
 * Route About (exemple)
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Cette route est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */
export const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: () => {
    return (
      <div>
        <h1>About</h1>
        <p>This is the about page.</p>
      </div>
    )
  },
})
`
}

/**
 * Contenu du fichier router.tsx (TypeScript)
 * Configuration du router TanStack Router (code-based routing)
 */
function getRouterContentTS(): string {
  return `import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { aboutRoute } from './routes/about'

/**
 * Configuration du router TanStack Router
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Ce router utilise code-based routing (plus simple pour l'intégration).
 * Vous pouvez passer à file-based routing si vous préférez.
 * 
 * Ce router est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */

// Créer le router avec les routes définies
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute])

export const router = createRouter({ routeTree })

// Déclarer le type du router pour TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
`
}

/**
 * Contenu du fichier router.jsx (JavaScript)
 */
function getRouterContentJS(): string {
  return `import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { aboutRoute } from './routes/about'

/**
 * Configuration du router TanStack Router
 * 
 * Documentation : https://tanstack.com/router
 * 
 * Ce router utilise code-based routing (plus simple pour l'intégration).
 * Vous pouvez passer à file-based routing si vous préférez.
 * 
 * Ce router est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */

// Créer le router avec les routes définies
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute])

export const router = createRouter({ routeTree })
`
}

/**
 * Contenu du fichier App.tsx avec RouterProvider (TypeScript)
 */
function getAppContentTS(): string {
  return `import { RouterProvider } from '@tanstack/react-router'
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
  return `import { RouterProvider } from '@tanstack/react-router'
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

  // Vérifier si @tanstack/react-router est déjà importé
  const hasRouterImport =
    content.includes("from '@tanstack/react-router'") ||
    content.includes('from "@tanstack/react-router"')

  // Vérifier si router est déjà importé
  const hasRouterImportFromRouter =
    content.includes("from './router'") || content.includes('from "./router"')

  let modifiedContent = content

  // Ajouter l'import de RouterProvider si nécessaire
  if (!hasRouterImport) {
    const importStatement = isTypeScript
      ? "import { RouterProvider } from '@tanstack/react-router'\n"
      : "import { RouterProvider } from '@tanstack/react-router'\n"

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
    /(export\s+default\s+)?function\s+App\s*\([^)]*\)\s*\{[\s\S]*?\n\s*return\s+\([\s\S]*?\)\s*;?\s*\n\s*\}/m

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
      // Si on ne trouve pas le pattern, ajouter à la fin du fichier
      modifiedContent += `\n\nconst App = () => {\n  return <RouterProvider router={router} />\n}\n\nexport default App\n`
    }
  }

  return modifiedContent
}
