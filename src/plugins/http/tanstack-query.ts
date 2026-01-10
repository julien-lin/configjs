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
 * Plugin TanStack Query (React Query)
 *
 * Data fetching, caching et synchronisation serveur pour React
 * Documentation officielle : https://tanstack.com/query
 *
 * @example
 * ```typescript
 * import { tanstackQueryPlugin } from './plugins/http/tanstack-query'
 * await tanstackQueryPlugin.install(ctx)
 * await tanstackQueryPlugin.configure(ctx)
 * ```
 */
export const tanstackQueryPlugin: Plugin = {
  name: '@tanstack/react-query',
  displayName: 'TanStack Query',
  description: 'Data fetching et caching',
  category: Category.HTTP,
  version: '^5.90.16',

  frameworks: ['react', 'nextjs'],

  /**
   * Détecte si TanStack Query est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@tanstack/react-query'] !== undefined ||
      ctx.devDependencies['@tanstack/react-query'] !== undefined
    )
  },

  /**
   * Installe TanStack Query
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('TanStack Query is already installed')
      return {
        packages: {},
        success: true,
        message: 'TanStack Query already installed',
      }
    }

    const packages: string[] = ['@tanstack/react-query']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed TanStack Query')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install TanStack Query:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install TanStack Query: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure TanStack Query dans le projet
   *
   * Crée :
   * - src/lib/query-client.ts (ou .js) : Configuration du QueryClient
   * - src/lib/queries/example.ts (ou .js) : Exemple de query
   * - src/lib/mutations/example.ts (ou .js) : Exemple de mutation
   *
   * Modifie :
   * - src/App.tsx (ou App.jsx) : Ajoute QueryClientProvider
   *
   * Documentation : https://tanstack.com/query/latest/docs/framework/react/quick-start
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier lib si nécessaire
      const libDir = join(srcDir, 'lib')
      await ensureDirectory(libDir)

      // 2. Créer src/lib/query-client.ts (configuration du QueryClient)
      const queryClientPath = join(libDir, `query-client.${extension}`)
      const queryClientContent = ctx.typescript
        ? getQueryClientContentTS()
        : getQueryClientContentJS()

      await writer.createFile(queryClientPath, queryClientContent)
      files.push({
        type: 'create',
        path: normalizePath(queryClientPath),
        content: queryClientContent,
        backup: false,
      })

      logger.info(`Created query client: ${queryClientPath}`)

      // 3. Créer src/lib/queries/example.ts (exemple de query)
      const queriesDir = join(libDir, 'queries')
      await ensureDirectory(queriesDir)

      const exampleQueryPath = join(queriesDir, `example.${extension}`)
      const exampleQueryContent = ctx.typescript
        ? getExampleQueryContentTS()
        : getExampleQueryContentJS()

      await writer.createFile(exampleQueryPath, exampleQueryContent)
      files.push({
        type: 'create',
        path: normalizePath(exampleQueryPath),
        content: exampleQueryContent,
        backup: false,
      })

      logger.info(`Created example query: ${exampleQueryPath}`)

      // 4. Créer src/lib/mutations/example.ts (exemple de mutation)
      const mutationsDir = join(libDir, 'mutations')
      await ensureDirectory(mutationsDir)

      const exampleMutationPath = join(mutationsDir, `example.${extension}`)
      const exampleMutationContent = ctx.typescript
        ? getExampleMutationContentTS()
        : getExampleMutationContentJS()

      await writer.createFile(exampleMutationPath, exampleMutationContent)
      files.push({
        type: 'create',
        path: normalizePath(exampleMutationPath),
        content: exampleMutationContent,
        backup: false,
      })

      logger.info(`Created example mutation: ${exampleMutationPath}`)

      // 5. Modifier App.tsx pour ajouter QueryClientProvider
      const appPath = join(srcDir, `App.${ctx.typescript ? 'tsx' : 'jsx'}`)
      const appExists = await checkPathExists(appPath)

      if (appExists) {
        const appContent = await readFileContent(appPath)
        const modifiedAppContent = injectQueryClientProvider(
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

        logger.info(
          `Updated App.${ctx.typescript ? 'tsx' : 'jsx'} with QueryClientProvider`
        )
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

        logger.info(
          `Created App.${ctx.typescript ? 'tsx' : 'jsx'} with QueryClientProvider`
        )
      }

      return {
        files,
        success: true,
        message: 'TanStack Query configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure TanStack Query:', error)
      return {
        files,
        success: false,
        message: `Failed to configure TanStack Query: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration TanStack Query
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('TanStack Query configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback TanStack Query configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier lib/query-client.ts (TypeScript)
 * Configuration du QueryClient
 */
function getQueryClientContentTS(): string {
  return `import { QueryClient } from '@tanstack/react-query'

/**
 * QueryClient pour TanStack Query
 * 
 * Documentation : https://tanstack.com/query
 * 
 * Ce QueryClient est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { queryClient } from './lib/query-client'
 * 
 * // Utiliser dans QueryClientProvider
 * <QueryClientProvider client={queryClient}>
 *   <App />
 * </QueryClientProvider>
 * \`\`\`
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Temps de cache par défaut : 5 minutes
      staleTime: 1000 * 60 * 5,
      // Temps avant garbage collection : 10 minutes
      gcTime: 1000 * 60 * 10,
      // Réessayer 3 fois en cas d'erreur
      retry: 3,
      // Réessayer seulement si l'erreur n'est pas 4xx
      retryOnMount: true,
      // Refetch quand la fenêtre reprend le focus
      refetchOnWindowFocus: true,
      // Refetch quand la connexion est rétablie
      refetchOnReconnect: true,
    },
    mutations: {
      // Réessayer 1 fois en cas d'erreur
      retry: 1,
    },
  },
})
`
}

/**
 * Contenu du fichier lib/query-client.js (JavaScript)
 */
function getQueryClientContentJS(): string {
  return `import { QueryClient } from '@tanstack/react-query'

/**
 * QueryClient pour TanStack Query
 * 
 * Documentation : https://tanstack.com/query
 * 
 * Ce QueryClient est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Temps de cache par défaut : 5 minutes
      staleTime: 1000 * 60 * 5,
      // Temps avant garbage collection : 10 minutes
      gcTime: 1000 * 60 * 10,
      // Réessayer 3 fois en cas d'erreur
      retry: 3,
      // Réessayer seulement si l'erreur n'est pas 4xx
      retryOnMount: true,
      // Refetch quand la fenêtre reprend le focus
      refetchOnWindowFocus: true,
      // Refetch quand la connexion est rétablie
      refetchOnReconnect: true,
    },
    mutations: {
      // Réessayer 1 fois en cas d'erreur
      retry: 1,
    },
  },
})
`
}

/**
 * Contenu du fichier lib/queries/example.ts (TypeScript)
 * Exemple de query
 */
function getExampleQueryContentTS(): string {
  return `import { useQuery } from '@tanstack/react-query'

/**
 * Exemple de query TanStack Query
 * 
 * Documentation : https://tanstack.com/query
 * 
 * Cette query est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { useTodos } from './lib/queries/example'
 * 
 * function Todos() {
 *   const { data, isLoading, error } = useTodos()
 * 
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 * 
 *   return (
 *     <ul>
 *       {data?.map((todo) => (
 *         <li key={todo.id}>{todo.title}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * \`\`\`
 */

// Fonction de fetch (à remplacer par votre API)
async function fetchTodos() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos')
  if (!response.ok) {
    throw new Error('Failed to fetch todos')
  }
  return response.json()
}

export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })
}
`
}

/**
 * Contenu du fichier lib/queries/example.js (JavaScript)
 */
function getExampleQueryContentJS(): string {
  return `import { useQuery } from '@tanstack/react-query'

/**
 * Exemple de query TanStack Query
 * 
 * Documentation : https://tanstack.com/query
 * 
 * Cette query est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */

// Fonction de fetch (à remplacer par votre API)
async function fetchTodos() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos')
  if (!response.ok) {
    throw new Error('Failed to fetch todos')
  }
  return response.json()
}

export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })
}
`
}

/**
 * Contenu du fichier lib/mutations/example.ts (TypeScript)
 * Exemple de mutation
 */
function getExampleMutationContentTS(): string {
  return `import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Exemple de mutation TanStack Query
 * 
 * Documentation : https://tanstack.com/query
 * 
 * Cette mutation est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { useCreateTodo } from './lib/mutations/example'
 * 
 * function CreateTodo() {
 *   const mutation = useCreateTodo()
 * 
 *   return (
 *     <button
 *       onClick={() => {
 *         mutation.mutate({
 *           id: Date.now(),
 *           title: 'New Todo',
 *         })
 *       }}
 *       disabled={mutation.isPending}
 *     >
 *       {mutation.isPending ? 'Creating...' : 'Create Todo'}
 *     </button>
 *   )
 * }
 * \`\`\`
 */

// Fonction de création (à remplacer par votre API)
async function createTodo(todo: { id: number; title: string }) {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(todo),
  })
  if (!response.ok) {
    throw new Error('Failed to create todo')
  }
  return response.json()
}

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      // Invalider et refetch les todos après création
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
`
}

/**
 * Contenu du fichier lib/mutations/example.js (JavaScript)
 */
function getExampleMutationContentJS(): string {
  return `import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Exemple de mutation TanStack Query
 * 
 * Documentation : https://tanstack.com/query
 * 
 * Cette mutation est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */

// Fonction de création (à remplacer par votre API)
async function createTodo(todo) {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(todo),
  })
  if (!response.ok) {
    throw new Error('Failed to create todo')
  }
  return response.json()
}

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      // Invalider et refetch les todos après création
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
`
}

/**
 * Contenu du fichier App.tsx avec QueryClientProvider (TypeScript)
 */
function getAppContentTS(): string {
  return `import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <h1>Welcome to TanStack Query</h1>
      </div>
    </QueryClientProvider>
  )
}

export default App
`
}

/**
 * Contenu du fichier App.jsx avec QueryClientProvider (JavaScript)
 */
function getAppContentJS(): string {
  return `import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <h1>Welcome to TanStack Query</h1>
      </div>
    </QueryClientProvider>
  )
}

export default App
`
}

/**
 * Injecte QueryClientProvider dans un fichier App existant
 */
function injectQueryClientProvider(
  content: string,
  isTypeScript: boolean
): string {
  // Vérifier si QueryClientProvider est déjà présent
  if (
    content.includes('QueryClientProvider') &&
    content.includes('@tanstack/react-query')
  ) {
    logger.warn('QueryClientProvider already present in App file')
    return content
  }

  // Vérifier si QueryClientProvider est déjà importé
  const hasQueryClientProviderImport =
    content.includes("from '@tanstack/react-query'") ||
    content.includes('from "@tanstack/react-query"')

  // Vérifier si queryClient est déjà importé
  const hasQueryClientImport =
    content.includes("from './lib/query-client'") ||
    content.includes('from "./lib/query-client"')

  let modifiedContent = content

  // Ajouter l'import de QueryClientProvider si nécessaire
  if (!hasQueryClientProviderImport) {
    const importStatement = isTypeScript
      ? "import { QueryClientProvider } from '@tanstack/react-query'\n"
      : "import { QueryClientProvider } from '@tanstack/react-query'\n"

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

  // Ajouter l'import du queryClient si nécessaire
  if (!hasQueryClientImport) {
    const queryClientImport = isTypeScript
      ? "import { queryClient } from './lib/query-client'\n"
      : "import { queryClient } from './lib/query-client'\n"

    // Trouver la dernière ligne d'import
    const importLines = modifiedContent.split('\n')
    let lastImportIndex = 0
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i]?.startsWith('import ')) {
        lastImportIndex = i
      }
    }

    importLines.splice(lastImportIndex + 1, 0, queryClientImport.trim())
    modifiedContent = importLines.join('\n')
  }

  // Envelopper le contenu avec QueryClientProvider
  // Chercher function App() ou const App = ou export default function App()
  const appFunctionRegex =
    /(export\s+default\s+)?function\s+App\s*\([^)]*\)\s*\{[\s\S]*?\n\s*return\s+\([\s\S]*?\)\s*;?\s*\n\s*\}/m

  if (appFunctionRegex.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(appFunctionRegex, (match) => {
      // Extraire le contenu du return
      const returnMatch = match.match(/return\s+\(([\s\S]*?)\)\s*;?\s*\n\s*\}/)
      if (returnMatch) {
        const returnContent = returnMatch[1]
        const signatureMatch = match.match(
          /((export\s+default\s+)?function\s+App\s*\([^)]*\))/
        )
        if (signatureMatch) {
          return `${signatureMatch[1]} {\n  return (\n    <QueryClientProvider client={queryClient}>\n${returnContent}\n    </QueryClientProvider>\n  )\n}\n`
        }
      }
      return match
    })
  } else {
    // Si on ne trouve pas le pattern, chercher juste le return
    const returnRegex = /return\s+\(([\s\S]*?)\)\s*;?/m
    if (returnRegex.test(modifiedContent)) {
      modifiedContent = modifiedContent.replace(
        returnRegex,
        (_, returnContent) => {
          return `return (\n    <QueryClientProvider client={queryClient}>\n${returnContent}\n    </QueryClientProvider>\n  )`
        }
      )
    } else {
      // Ajouter à la fin du fichier si on ne trouve rien
      modifiedContent += `\n\nfunction App() {\n  return (\n    <QueryClientProvider client={queryClient}>\n      <div>App</div>\n    </QueryClientProvider>\n  )\n}\n\nexport default App\n`
    }
  }

  return modifiedContent
}
