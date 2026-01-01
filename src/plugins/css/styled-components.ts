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
import { ensureDirectory } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Styled Components
 *
 * CSS-in-JS avec styled components
 * Documentation officielle : https://styled-components.com
 *
 * @example
 * ```typescript
 * import { styledComponentsPlugin } from './plugins/css/styled-components'
 * await styledComponentsPlugin.install(ctx)
 * await styledComponentsPlugin.configure(ctx)
 * ```
 */
export const styledComponentsPlugin: Plugin = {
  name: 'styled-components',
  displayName: 'Styled Components',
  description: 'CSS-in-JS avec styled components',
  category: Category.CSS,
  version: '^6.1.19',

  frameworks: ['react'],
  incompatibleWith: ['tailwindcss', 'emotion'],

  /**
   * Détecte si Styled Components est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['styled-components'] !== undefined ||
      ctx.devDependencies['styled-components'] !== undefined
    )
  },

  /**
   * Installe Styled Components
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Styled Components is already installed')
      return {
        packages: {},
        success: true,
        message: 'Styled Components already installed',
      }
    }

    try {
      // Installer styled-components
      await installPackages(['styled-components'], {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      // Installer les types TypeScript si nécessaire
      if (ctx.typescript) {
        await installPackages(['@types/styled-components'], {
          dev: true,
          packageManager: ctx.packageManager,
          projectRoot: ctx.projectRoot,
          exact: false,
          silent: false,
        })
      }

      logger.info('Successfully installed Styled Components')

      return {
        packages: {
          dependencies: ['styled-components'],
          ...(ctx.typescript && {
            devDependencies: ['@types/styled-components'],
          }),
        },
        success: true,
        message: `Installed styled-components${ctx.typescript ? ' and @types/styled-components' : ''}`,
      }
    } catch (error) {
      logger.error('Failed to install Styled Components:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Styled Components: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Styled Components dans le projet
   *
   * Crée :
   * - src/components/styled/Button.tsx (ou .jsx) : Exemple de composant stylé
   * - src/components/styled/Card.tsx (ou .jsx) : Exemple de composant stylé avec props
   * - src/components/styled/index.ts (ou .js) : Export des composants
   *
   * Documentation : https://styled-components.com/docs/basics#getting-started
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'tsx' : 'jsx'

    try {
      // 1. Créer le dossier components/styled si nécessaire
      const styledDir = join(srcDir, 'components', 'styled')
      await ensureDirectory(styledDir)

      // 2. Créer src/components/styled/Button.tsx (exemple de composant stylé)
      const buttonPath = join(styledDir, `Button.${extension}`)
      const buttonContent = ctx.typescript
        ? getButtonContentTS()
        : getButtonContentJS()

      await writer.createFile(buttonPath, buttonContent)
      files.push({
        type: 'create',
        path: buttonPath,
        content: buttonContent,
        backup: false,
      })

      logger.info(`Created Button component: ${buttonPath}`)

      // 3. Créer src/components/styled/Card.tsx (exemple avec props)
      const cardPath = join(styledDir, `Card.${extension}`)
      const cardContent = ctx.typescript
        ? getCardContentTS()
        : getCardContentJS()

      await writer.createFile(cardPath, cardContent)
      files.push({
        type: 'create',
        path: cardPath,
        content: cardContent,
        backup: false,
      })

      logger.info(`Created Card component: ${cardPath}`)

      // 4. Créer src/components/styled/index.ts (export des composants)
      const indexPath = join(styledDir, `index.${ctx.typescript ? 'ts' : 'js'}`)
      const indexContent = getIndexContent()

      await writer.createFile(indexPath, indexContent)
      files.push({
        type: 'create',
        path: indexPath,
        content: indexContent,
        backup: false,
      })

      logger.info(`Created styled components index: ${indexPath}`)

      return {
        files,
        success: true,
        message: 'Styled Components configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Styled Components:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Styled Components: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Styled Components
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('Styled Components configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Styled Components configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier components/styled/Button.tsx (TypeScript)
 * Exemple de composant stylé basique
 */
function getButtonContentTS(): string {
  return `import styled from 'styled-components'

/**
 * Composant Button stylé avec Styled Components
 * 
 * Documentation : https://styled-components.com/docs/basics#getting-started
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { Button } from './components/styled'
 * 
 * function App() {
 *   return <Button>Click me</Button>
 * }
 * \`\`\`
 */
export const Button = styled.button\`
  background: #BF4F74;
  color: white;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid #BF4F74;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: white;
    color: #BF4F74;
  }

  &:active {
    transform: scale(0.98);
  }
\`
`
}

/**
 * Contenu du fichier components/styled/Button.jsx (JavaScript)
 */
function getButtonContentJS(): string {
  return `import styled from 'styled-components'

/**
 * Composant Button stylé avec Styled Components
 * 
 * Documentation : https://styled-components.com/docs/basics#getting-started
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export const Button = styled.button\`
  background: #BF4F74;
  color: white;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid #BF4F74;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: white;
    color: #BF4F74;
  }

  &:active {
    transform: scale(0.98);
  }
\`
`
}

/**
 * Contenu du fichier components/styled/Card.tsx (TypeScript)
 * Exemple de composant stylé avec props adaptatives
 */
function getCardContentTS(): string {
  return `import styled from 'styled-components'

/**
 * Composant Card stylé avec props adaptatives
 * 
 * Documentation : https://styled-components.com/docs/basics#adapting-based-on-props
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { Card } from './components/styled'
 * 
 * function App() {
 *   return (
 *     <Card $primary>
 *       <h2>Primary Card</h2>
 *       <p>This is a primary card</p>
 *     </Card>
 *   )
 * }
 * \`\`\`
 */

interface CardProps {
  $primary?: boolean
}

export const Card = styled.div<CardProps>\`
  padding: 2em;
  margin: 1em;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: \${(props) => (props.$primary ? '#BF4F74' : 'white')};
  color: \${(props) => (props.$primary ? 'white' : '#333')};
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  h2 {
    margin-top: 0;
    font-size: 1.5em;
  }

  p {
    margin-bottom: 0;
    line-height: 1.6;
  }
\`
`
}

/**
 * Contenu du fichier components/styled/Card.jsx (JavaScript)
 */
function getCardContentJS(): string {
  return `import styled from 'styled-components'

/**
 * Composant Card stylé avec props adaptatives
 * 
 * Documentation : https://styled-components.com/docs/basics#adapting-based-on-props
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export const Card = styled.div\`
  padding: 2em;
  margin: 1em;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: \${(props) => (props.$primary ? '#BF4F74' : 'white')};
  color: \${(props) => (props.$primary ? 'white' : '#333')};
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  h2 {
    margin-top: 0;
    font-size: 1.5em;
  }

  p {
    margin-bottom: 0;
    line-height: 1.6;
  }
\`
`
}

/**
 * Contenu du fichier components/styled/index.ts/js
 * Export des composants stylés
 */
function getIndexContent(): string {
  return `/**
 * Composants Styled Components
 * 
 * Export centralisé de tous les composants stylés
 * 
 * Documentation : https://styled-components.com
 */

export { Button } from './Button'
export { Card } from './Card'
`
}
