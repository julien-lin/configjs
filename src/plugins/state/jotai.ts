import { resolve, join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import {
  checkPathExists,
  ensureDirectory,
  readFileContent,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()
import {
  getPluginServices,
  getRollbackManager,
} from '../utils/plugin-services.js'

/**
 * Plugin Jotai
 *
 * State management atomique pour React
 * Documentation officielle : https://jotai.org
 *
 * @example
 * ```typescript
 * import { jotaiPlugin } from './plugins/state/jotai'
 * await jotaiPlugin.install(ctx)
 * await jotaiPlugin.configure(ctx)
 * ```
 */
export const jotaiPlugin: Plugin = {
  name: 'jotai',
  displayName: 'Jotai',
  description: 'State management atomique',
  category: Category.STATE,
  version: '^2.16.1',

  frameworks: ['react', 'nextjs'],
  incompatibleWith: ['@reduxjs/toolkit', 'zustand'],

  /**
   * Détecte si Jotai est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['jotai'] !== undefined ||
      ctx.devDependencies['jotai'] !== undefined
    )
  },

  /**
   * Installe Jotai
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Jotai is already installed')
      return {
        packages: {},
        success: true,
        message: 'Jotai already installed',
      }
    }

    const packages: string[] = ['jotai']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Jotai')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Jotai:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Jotai: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Jotai dans le projet
   *
   * Crée :
   * - src/store/atoms.ts (ou .js) : Atomes de base
   * - src/store/index.ts (ou .js) : Export des atomes
   *
   * Modifie :
   * - src/App.tsx (ou App.jsx) : Ajoute Provider (optionnel mais recommandé)
   *
   * Documentation : https://jotai.org/docs/core/atom
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const { writer } = getPluginServices(ctx)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier store si nécessaire
      const storeDir = join(srcDir, 'store')
      await ensureDirectory(storeDir, ctx.fsAdapter)

      // 2. Créer src/store/atoms.ts (atomes de base)
      const atomsPath = join(storeDir, `atoms.${extension}`)
      const atomsContent = ctx.typescript
        ? getAtomsContentTS()
        : getAtomsContentJS()

      await writer.createFile(atomsPath, atomsContent)
      files.push({
        type: 'create',
        path: normalizePath(atomsPath),
        content: atomsContent,
        backup: false,
      })

      logger.info(`Created atoms file: ${atomsPath}`)

      // 3. Créer src/store/index.ts (export des atomes)
      const indexPath = join(storeDir, `index.${extension}`)
      const indexContent = ctx.typescript
        ? getIndexContentTS()
        : getIndexContentJS()

      await writer.createFile(indexPath, indexContent)
      files.push({
        type: 'create',
        path: normalizePath(indexPath),
        content: indexContent,
        backup: false,
      })

      logger.info(`Created store index: ${indexPath}`)

      // 4. Modifier App.tsx pour ajouter Provider (optionnel mais recommandé)
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
        message: 'Jotai configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Jotai:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Jotai: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Jotai
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = getRollbackManager(_ctx)
    try {
      await backupManager.restoreAll()
      logger.info('Jotai configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Jotai configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier store/atoms.ts (TypeScript)
 * Atomes de base avec exemples
 */
function getAtomsContentTS(): string {
  return `import { atom } from 'jotai'

/**
 * Atomes Jotai
 * 
 * Documentation : https://jotai.org/docs/core/atom
 * 
 * Ces atomes sont créés automatiquement par confjs.
 * Vous pouvez les modifier selon vos besoins.
 */

// Atome primitif : compteur
export const countAtom = atom(0)

// Atome primitif : message
export const messageAtom = atom('Hello Jotai')

// Atome dérivé en lecture seule : double du compteur
export const doubleCountAtom = atom((get) => get(countAtom) * 2)

// Atome dérivé en lecture-écriture
export const priceAtom = atom(10)

export const discountedPriceAtom = atom(
  (get) => get(priceAtom) * 0.9, // 10% de réduction
  (get, set, newPrice: number) => {
    set(priceAtom, newPrice / 0.9) // Ajuster le prix de base
  }
)
`
}

/**
 * Contenu du fichier store/atoms.js (JavaScript)
 */
function getAtomsContentJS(): string {
  return `import { atom } from 'jotai'

/**
 * Atomes Jotai
 * 
 * Documentation : https://jotai.org/docs/core/atom
 * 
 * Ces atomes sont créés automatiquement par confjs.
 * Vous pouvez les modifier selon vos besoins.
 */

// Atome primitif : compteur
export const countAtom = atom(0)

// Atome primitif : message
export const messageAtom = atom('Hello Jotai')

// Atome dérivé en lecture seule : double du compteur
export const doubleCountAtom = atom((get) => get(countAtom) * 2)

// Atome dérivé en lecture-écriture
export const priceAtom = atom(10)

export const discountedPriceAtom = atom(
  (get) => get(priceAtom) * 0.9, // 10% de réduction
  (get, set, newPrice) => {
    set(priceAtom, newPrice / 0.9) // Ajuster le prix de base
  }
)
`
}

/**
 * Contenu du fichier store/index.ts (TypeScript)
 * Export des atomes
 */
function getIndexContentTS(): string {
  return `/**
 * Store Jotai
 * 
 * Export centralisé de tous les atomes
 * 
 * Documentation : https://jotai.org
 */

export * from './atoms'
`
}

/**
 * Contenu du fichier store/index.js (JavaScript)
 */
function getIndexContentJS(): string {
  return `/**
 * Store Jotai
 * 
 * Export centralisé de tous les atomes
 * 
 * Documentation : https://jotai.org
 */

export * from './atoms'
`
}

/**
 * Contenu du fichier App.tsx avec Provider (TypeScript)
 */
function getAppContentTS(): string {
  return `import { Provider } from 'jotai'
import './App.css'

function App() {
  return (
    <Provider>
      <div className="App">
        <h1>Welcome to Jotai</h1>
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
  return `import { Provider } from 'jotai'
import './App.css'

function App() {
  return (
    <Provider>
      <div className="App">
        <h1>Welcome to Jotai</h1>
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
  if (content.includes('Provider') && content.includes('jotai')) {
    logger.warn('Jotai Provider already present in App file')
    return content
  }

  // Vérifier si Provider est déjà importé
  const hasProviderImport =
    content.includes("from 'jotai'") || content.includes('from "jotai"')

  let modifiedContent = content

  // Ajouter l'import de Provider si nécessaire
  if (!hasProviderImport) {
    const importStatement = isTypeScript
      ? "import { Provider } from 'jotai'\n"
      : "import { Provider } from 'jotai'\n"

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

  // Envelopper le contenu avec Provider
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
          return `${signatureMatch[1]} {\n  return (\n    <Provider>\n${returnContent}\n    </Provider>\n  )\n}\n`
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
          return `return (\n    <Provider>\n${returnContent}\n    </Provider>\n  )`
        }
      )
    } else {
      // Ajouter à la fin du fichier si on ne trouve rien
      modifiedContent += `\n\nfunction App() {\n  return (\n    <Provider>\n      <div>App</div>\n    </Provider>\n  )\n}\n\nexport default App\n`
    }
  }

  return modifiedContent
}
