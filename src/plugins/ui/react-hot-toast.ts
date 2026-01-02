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
import { checkPathExists, readFileContent, normalizePath } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin React Hot Toast
 *
 * Notifications toast pour React
 * Documentation officielle : https://react-hot-toast.com
 *
 * @example
 * ```typescript
 * import { reactHotToastPlugin } from './plugins/ui/react-hot-toast'
 * await reactHotToastPlugin.install(ctx)
 * await reactHotToastPlugin.configure(ctx)
 * ```
 */
export const reactHotToastPlugin: Plugin = {
  name: 'react-hot-toast',
  displayName: 'React Hot Toast',
  description: 'Notifications toast pour React',
  category: Category.UI,
  version: '^2.4.1',

  frameworks: ['react'],

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
   * Configure React Hot Toast dans le projet
   *
   * Ajoute :
   * - Toaster dans le composant racine (App.tsx ou main.tsx)
   *
   * Documentation : https://react-hot-toast.com
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = join(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'tsx' : 'jsx'

    try {
      // 1. Chercher App.tsx/jsx ou main.tsx/jsx
      const appPath = join(srcDir, `App.${extension}`)
      const mainPath = join(srcDir, `main.${extension}`)
      const indexPath = join(srcDir, `index.${extension}`)

      let targetPath: string | null = null
      let targetContent = ''

      if (await checkPathExists(appPath)) {
        targetPath = appPath
        targetContent = await readFileContent(appPath)
      } else if (await checkPathExists(mainPath)) {
        targetPath = mainPath
        targetContent = await readFileContent(mainPath)
      } else if (await checkPathExists(indexPath)) {
        targetPath = indexPath
        targetContent = await readFileContent(indexPath)
      }

      if (targetPath && targetContent) {
        // Vérifier si Toaster est déjà présent
        const hasImport = targetContent.includes('react-hot-toast')
        const hasToaster = targetContent.includes('<Toaster />')

        if (!hasImport || !hasToaster) {
          const updatedContent = injectToaster(targetContent, ctx.typescript)
          await writer.writeFile(targetPath, updatedContent, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(targetPath),
            content: updatedContent,
            backup: true,
          })
          logger.info(`Added Toaster to ${targetPath}`)
        } else {
          logger.warn('Toaster already configured in the app')
        }
      } else {
        // Créer un fichier App.tsx/jsx si aucun n'existe
        const newAppPath = join(srcDir, `App.${extension}`)
        const newAppContent = ctx.typescript
          ? getAppContentTS()
          : getAppContentJS()

        await writer.createFile(newAppPath, newAppContent)
        files.push({
          type: 'create',
          path: normalizePath(newAppPath),
          content: newAppContent,
          backup: false,
        })
        logger.info(`Created App.${extension} with Toaster`)
      }

      return {
        files,
        success: true,
        message: 'React Hot Toast configured successfully',
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
    const backupManager = new BackupManager()
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
 * Injecte le Toaster dans le contenu existant
 */
function injectToaster(content: string, typescript: boolean): string {
  // Ajouter l'import
  const importStatement = typescript
    ? "import { Toaster } from 'react-hot-toast'\n"
    : "import { Toaster } from 'react-hot-toast'\n"

  // Vérifier si l'import et le composant existent déjà
  const hasImport = content.includes("from 'react-hot-toast'")
  const hasToaster = content.includes('<Toaster />')
  if (hasImport && hasToaster) {
    return content
  }

  // Trouver le dernier import (sinon on préfixe)
  const imports = content.match(/^import .+$/gm) || []
  const lastImport = imports[imports.length - 1]
  const lastImportIndex = lastImport ? content.lastIndexOf(lastImport) : -1

  const newContent =
    lastImportIndex >= 0 && lastImport
      ? `${content.slice(0, lastImportIndex + lastImport.length)}\n${importStatement}${content.slice(lastImportIndex + lastImport.length + 1)}`
      : `${importStatement}${content}`

  // Ajouter <Toaster /> avant la dernière fermeture de div si trouvée
  const lastClosingDiv = newContent.lastIndexOf('</div>')
  if (lastClosingDiv !== -1) {
    return (
      newContent.slice(0, lastClosingDiv) +
      '  <Toaster />\n' +
      newContent.slice(lastClosingDiv)
    )
  }

  // Si pas de </div>, ajouter avant le return
  if (newContent.includes('return (')) {
    const returnIndex = newContent.indexOf('return (')
    const closingParen = newContent.indexOf(')', returnIndex)
    if (closingParen !== -1) {
      return (
        newContent.slice(0, closingParen) +
        '  <Toaster />\n' +
        newContent.slice(closingParen)
      )
    }
  }

  return newContent + '\n  <Toaster />\n'
}

/**
 * Contenu de App.tsx avec Toaster
 */
function getAppContentTS(): string {
  return `import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <div>
      <h1>My App</h1>
      <Toaster />
    </div>
  )
}

export default App
`
}

/**
 * Contenu de App.jsx avec Toaster
 */
function getAppContentJS(): string {
  return `import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <div>
      <h1>My App</h1>
      <Toaster />
    </div>
  )
}

export default App
`
}
