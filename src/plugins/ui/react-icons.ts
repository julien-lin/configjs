import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ensureDirectory, normalizePath } from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

import {
  getPluginServices,
  getRollbackManager,
} from '../utils/plugin-services.js'

const logger = getModuleLogger()

/**
 * Plugin React Icons
 *
 * Bibliothèque d'icônes pour React
 * Documentation officielle : https://react-icons.github.io/react-icons
 *
 * @example
 * ```typescript
 * import { reactIconsPlugin } from './plugins/ui/react-icons'
 * await reactIconsPlugin.install(ctx)
 * await reactIconsPlugin.configure(ctx)
 * ```
 */
export const reactIconsPlugin: Plugin = {
  name: 'react-icons',
  displayName: 'React Icons',
  description: "Bibliothèque d'icônes pour React",
  category: Category.UI,
  version: '^5.3.0',

  frameworks: ['react', 'nextjs'],

  /**
   * Détecte si React Icons est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['react-icons'] !== undefined ||
      ctx.devDependencies['react-icons'] !== undefined
    )
  },

  /**
   * Installe React Icons
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('React Icons is already installed')
      return {
        packages: {},
        success: true,
        message: 'React Icons already installed',
      }
    }

    try {
      const packages: string[] = ['react-icons']

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed React Icons')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed React Icons: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install React Icons:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install React Icons: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure React Icons dans le projet
   *
   * Crée :
   * - src/components/icons/IconExample.tsx (ou .jsx) : Exemple d'utilisation
   * - src/components/icons/index.ts (ou .js) : Export centralisé
   *
   * Documentation : https://react-icons.github.io/react-icons
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const { backupManager, writer } = getPluginServices(ctx)

    const files: ConfigResult['files'] = []
    const srcDir = join(ctx.projectRoot, ctx.srcDir)

    try {
      // 1. Créer le dossier components/icons si nécessaire
      const iconsDir = join(srcDir, 'components', 'icons')
      await ensureDirectory(iconsDir, ctx.fsAdapter)

      // 2. Créer src/components/icons/IconExample.tsx (exemple)
      const iconExamplePath = join(
        iconsDir,
        `IconExample.${ctx.typescript ? 'tsx' : 'jsx'}`
      )
      const iconExampleContent = ctx.typescript
        ? getIconExampleContentTS()
        : getIconExampleContentJS()

      await writer.createFile(iconExamplePath, iconExampleContent)
      files.push({
        type: 'create',
        path: normalizePath(iconExamplePath),
        content: iconExampleContent,
        backup: false,
      })

      logger.info(`Created icon example: ${iconExamplePath}`)

      // 3. Créer src/components/icons/index.ts (export centralisé)
      const indexPath = join(iconsDir, `index.${ctx.typescript ? 'ts' : 'js'}`)
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

      logger.info(`Created icons index: ${indexPath}`)

      return {
        files,
        success: true,
        message: 'React Icons configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure React Icons:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure React Icons: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration React Icons
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = getRollbackManager(_ctx)
    try {
      await backupManager.restoreAll()
      logger.info('React Icons configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback React Icons configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu de l'exemple d'icône (TypeScript)
 */
function getIconExampleContentTS(): string {
  return `import { FaReact, FaGithub, FaTwitter } from 'react-icons/fa'
import { SiTypescript } from 'react-icons/si'

/**
 * Exemple d'utilisation de React Icons
 * 
 * Documentation : https://react-icons.github.io/react-icons
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { IconExample } from './components/icons'
 * 
 * function App() {
 *   return <IconExample />
 * }
 * \`\`\`
 */
export function IconExample() {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <FaReact size={24} color="#61DAFB" />
      <SiTypescript size={24} color="#3178C6" />
      <FaGithub size={24} />
      <FaTwitter size={24} color="#1DA1F2" />
    </div>
  )
}
`
}

/**
 * Contenu de l'exemple d'icône (JavaScript)
 */
function getIconExampleContentJS(): string {
  return `import { FaReact, FaGithub, FaTwitter } from 'react-icons/fa'
import { SiTypescript } from 'react-icons/si'

/**
 * Exemple d'utilisation de React Icons
 * 
 * Documentation : https://react-icons.github.io/react-icons
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export function IconExample() {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <FaReact size={24} color="#61DAFB" />
      <SiTypescript size={24} color="#3178C6" />
      <FaGithub size={24} />
      <FaTwitter size={24} color="#1DA1F2" />
    </div>
  )
}
`
}

/**
 * Contenu de l'index (TypeScript)
 */
function getIndexContentTS(): string {
  return `export { IconExample } from './IconExample'

// Réexport des icônes les plus utilisées
export { FaReact, FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa'
export { SiTypescript, SiJavascript, SiReact } from 'react-icons/si'
export { MdHome, MdSettings, MdSearch } from 'react-icons/md'
`
}

/**
 * Contenu de l'index (JavaScript)
 */
function getIndexContentJS(): string {
  return `export { IconExample } from './IconExample'

// Réexport des icônes les plus utilisées
export { FaReact, FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa'
export { SiTypescript, SiJavascript, SiReact } from 'react-icons/si'
export { MdHome, MdSettings, MdSearch } from 'react-icons/md'
`
}
