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
 * Plugin Redux Toolkit
 *
 * State management avec Redux Toolkit
 * Documentation officielle : https://redux-toolkit.js.org
 *
 * @example
 * ```typescript
 * import { reduxToolkitPlugin } from './plugins/state/redux-toolkit'
 * await reduxToolkitPlugin.install(ctx)
 * await reduxToolkitPlugin.configure(ctx)
 * ```
 */
export const reduxToolkitPlugin: Plugin = {
  name: '@reduxjs/toolkit',
  displayName: 'Redux Toolkit',
  description: 'State management avec Redux Toolkit',
  category: Category.STATE,
  version: '^2.11.2',

  frameworks: ['react'],
  incompatibleWith: ['zustand', 'jotai'],

  /**
   * Détecte si Redux Toolkit est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@reduxjs/toolkit'] !== undefined ||
      ctx.dependencies['react-redux'] !== undefined
    )
  },

  /**
   * Installe Redux Toolkit et react-redux
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Redux Toolkit is already installed')
      return {
        packages: {},
        success: true,
        message: 'Redux Toolkit already installed',
      }
    }

    const packages: string[] = ['@reduxjs/toolkit', 'react-redux']

    // Ajouter les types TypeScript si nécessaire
    if (ctx.typescript) {
      packages.push('@types/react-redux')
    }

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Redux Toolkit')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Redux Toolkit:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Redux Toolkit: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Redux Toolkit dans le projet
   *
   * Crée :
   * - src/store/index.ts (ou .js) : Configuration du store avec configureStore
   * - src/store/slices/counterSlice.ts (ou .js) : Slice exemple
   *
   * Modifie :
   * - src/App.tsx : Intègre Provider de react-redux
   *
   * Documentation : https://redux-toolkit.js.org/introduction/getting-started
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier store si nécessaire
      const storeDir = join(srcDir, 'store')
      await ensureDirectory(storeDir, ctx.fsAdapter)

      // 2. Créer le dossier slices si nécessaire
      const slicesDir = join(storeDir, 'slices')
      await ensureDirectory(slicesDir, ctx.fsAdapter)

      // 3. Créer src/store/slices/counterSlice.ts (slice exemple)
      const slicePath = join(slicesDir, `counterSlice.${extension}`)
      const sliceContent = ctx.typescript
        ? getCounterSliceContentTS()
        : getCounterSliceContentJS()

      await writer.createFile(slicePath, sliceContent)
      files.push({
        type: 'create',
        path: normalizePath(slicePath),
        content: sliceContent,
        backup: false,
      })

      logger.info(`Created counter slice: ${slicePath}`)

      // 4. Créer src/store/index.ts (configuration du store)
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

      logger.info(`Created Redux store: ${storePath}`)

      // 5. Créer src/store/hooks.ts (hooks typés pour TypeScript uniquement)
      if (ctx.typescript) {
        const hooksPath = join(storeDir, 'hooks.ts')
        const hooksContent = getTypedHooksContentTS()

        await writer.createFile(hooksPath, hooksContent)
        files.push({
          type: 'create',
          path: normalizePath(hooksPath),
          content: hooksContent,
          backup: false,
        })

        logger.info(`Created typed hooks: ${hooksPath}`)
      }

      // 6. Modifier App.tsx pour intégrer Provider
      const appPath = join(srcDir, `App.${ctx.typescript ? 'tsx' : 'jsx'}`)
      const appExists = await checkPathExists(appPath, ctx.fsAdapter)

      if (appExists) {
        const appContent = await readFileContent(
          appPath,
          'utf-8',
          ctx.fsAdapter
        )
        const modifiedAppContent = injectProvider(appContent, ctx.typescript)

        await writer.writeFile(appPath, modifiedAppContent, { backup: true })
        files.push({
          type: 'modify',
          path: normalizePath(appPath),
          content: modifiedAppContent,
          backup: true,
        })

        logger.info(
          `Updated App.${ctx.typescript ? 'tsx' : 'jsx'} with Provider`
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
          `Created App.${ctx.typescript ? 'tsx' : 'jsx'} with Provider`
        )
      }

      return {
        files,
        success: true,
        message: 'Redux Toolkit configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Redux Toolkit:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Redux Toolkit: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Redux Toolkit
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('Redux Toolkit configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Redux Toolkit configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier store/slices/counterSlice.ts (TypeScript)
 * Basé sur la documentation officielle : https://redux-toolkit.js.org
 */
function getCounterSliceContentTS(): string {
  return `import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Slice Redux Toolkit d'exemple - Counter
 * 
 * Documentation : https://redux-toolkit.js.org
 * 
 * Ce slice est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
interface CounterState {
  value: number
}

const initialState: CounterState = {
  value: 0,
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers.
      // It doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a new immutable
      // state based off those changes
      state.value += 1
    },
    decrement: (state) => {
      state.value -= 1
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload
    },
    reset: (state) => {
      state.value = 0
    },
  },
})

// Action creators are generated for each case reducer function
export const { increment, decrement, incrementByAmount, reset } =
  counterSlice.actions

export default counterSlice.reducer
`
}

/**
 * Contenu du fichier store/slices/counterSlice.js (JavaScript)
 */
function getCounterSliceContentJS(): string {
  return `import { createSlice } from '@reduxjs/toolkit'

/**
 * Slice Redux Toolkit d'exemple - Counter
 * 
 * Documentation : https://redux-toolkit.js.org
 * 
 * Ce slice est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
const initialState = {
  value: 0,
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers.
      // It doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a new immutable
      // state based off those changes
      state.value += 1
    },
    decrement: (state) => {
      state.value -= 1
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload
    },
    reset: (state) => {
      state.value = 0
    },
  },
})

// Action creators are generated for each case reducer function
export const { increment, decrement, incrementByAmount, reset } =
  counterSlice.actions

export default counterSlice.reducer
`
}

/**
 * Contenu du fichier store/index.ts (TypeScript)
 * Basé sur la documentation officielle : https://redux-toolkit.js.org/introduction/getting-started
 */
function getStoreContentTS(): string {
  return `import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './slices/counterSlice'

/**
 * Configuration du store Redux Toolkit
 * 
 * Documentation : https://redux-toolkit.js.org
 * 
 * Ce store est créé automatiquement par confjs.
 * Vous pouvez ajouter d'autres reducers ici.
 */
export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
})

// Infer the RootState and AppDispatch types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
`
}

/**
 * Contenu du fichier store/index.js (JavaScript)
 */
function getStoreContentJS(): string {
  return `import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './slices/counterSlice'

/**
 * Configuration du store Redux Toolkit
 * 
 * Documentation : https://redux-toolkit.js.org
 * 
 * Ce store est créé automatiquement par confjs.
 * Vous pouvez ajouter d'autres reducers ici.
 */
export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
})
`
}

/**
 * Contenu du fichier store/hooks.ts (TypeScript)
 * Hooks typés pour utiliser Redux avec TypeScript
 */
function getTypedHooksContentTS(): string {
  return `import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './index'

/**
 * Hooks typés pour Redux Toolkit avec TypeScript
 * 
 * Utilisez ces hooks au lieu des hooks standards de react-redux
 * pour bénéficier du typage automatique.
 * 
 * Exemple d'utilisation :
 * 
 * function Counter() {
 *   const count = useAppSelector((state) => state.counter.value)
 *   const dispatch = useAppDispatch()
 *   
 *   return (
 *     <div>
 *       <span>{count}</span>
 *       <button onClick={() => dispatch(increment())}>+</button>
 *     </div>
 *   )
 * }
 */

// Use throughout your app instead of plain useDispatch and useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
`
}

/**
 * Contenu du fichier App.tsx avec Provider (TypeScript)
 */
function getAppContentTS(): string {
  return `import { Provider } from 'react-redux'
import { store } from './store'
import './App.css'

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <h1>Redux Toolkit App</h1>
      </div>
    </Provider>
  )
}

export default App
`
}

/**
 * Contenu du fichier App.jsx avec Provider (JavaScript)
 */
function getAppContentJS(): string {
  return `import { Provider } from 'react-redux'
import { store } from './store'
import './App.css'

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <h1>Redux Toolkit App</h1>
      </div>
    </Provider>
  )
}

export default App
`
}

/**
 * Injecte Provider dans un fichier App existant
 */
function injectProvider(content: string, isTypeScript: boolean): string {
  // Vérifier si Provider est déjà présent
  if (content.includes('<Provider')) {
    logger.warn('Provider already present in App file')
    return content
  }

  // Vérifier si react-redux est déjà importé
  const hasReactReduxImport =
    content.includes("from 'react-redux'") ||
    content.includes('from "react-redux"')

  // Vérifier si store est déjà importé
  const hasStoreImport =
    content.includes("from './store'") || content.includes('from "./store"')

  let modifiedContent = content

  // Ajouter l'import de Provider si nécessaire
  if (!hasReactReduxImport) {
    const importStatement = isTypeScript
      ? "import { Provider } from 'react-redux'\n"
      : "import { Provider } from 'react-redux'\n"

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

  // Ajouter l'import du store si nécessaire
  if (!hasStoreImport) {
    const storeImport = isTypeScript
      ? "import { store } from './store'\n"
      : "import { store } from './store'\n"

    // Trouver la dernière ligne d'import
    const importLines = modifiedContent.split('\n')
    let lastImportIndex = 0
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i]?.startsWith('import ')) {
        lastImportIndex = i
      }
    }

    importLines.splice(lastImportIndex + 1, 0, storeImport.trim())
    modifiedContent = importLines.join('\n')
  }

  // Remplacer le contenu de la fonction App ou du composant
  // Chercher function App() ou const App = ou export default function App()
  const appFunctionRegex =
    /(export\s+default\s+)?function\s+App\s*\([^)]*\)\s*\{[\s\S]*?\n\s*return\s+[\s\S]*?\n\s*\}/m

  const normalizeReturn = (returnBlock: string): string => {
    // Prendre le contenu après `return`
    const raw = returnBlock.replace(/return\s+/, '').trim()
    // Enlever parenthèses englobantes si présentes
    const withoutParens =
      raw.startsWith('(') && raw.endsWith(')') ? raw.slice(1, -1).trim() : raw
    return withoutParens
  }

  if (appFunctionRegex.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(appFunctionRegex, (match) => {
      // Extraire juste la signature de la fonction
      const signatureMatch = match.match(
        /((export\s+default\s+)?function\s+App\s*\([^)]*\))/
      )
      if (signatureMatch) {
        // Extraire le bloc return (avec ou sans parenthèses)
        const returnMatch = match.match(/return[\s\S]*?\n\s*\}/m)
        const innerContent = returnMatch
          ? normalizeReturn(returnMatch[0].replace(/\}\s*$/, ''))
          : '<div>App</div>'

        const returnStatement = isTypeScript
          ? `  return (\n    <Provider store={store}>\n      ${innerContent.trim()}\n    </Provider>\n  )\n`
          : `  return (\n    <Provider store={store}>\n      ${innerContent.trim()}\n    </Provider>\n  )\n`

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
        const returnMatch = match.match(/return[\s\S]*/m)
        const innerContent = returnMatch
          ? normalizeReturn(returnMatch[0].replace(/\}?\s*$/, ''))
          : '<div>App</div>'

        return `const App = () => {\n  return (\n    <Provider store={store}>\n      ${innerContent.trim()}\n    </Provider>\n  )\n}`
      })
    } else {
      // Ajouter à la fin du fichier si on ne trouve rien
      modifiedContent += `\n\nfunction App() {\n  return (\n    <Provider store={store}>\n      <div>App</div>\n    </Provider>\n  )\n}\n\nexport default App\n`
    }
  }

  return modifiedContent
}
