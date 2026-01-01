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
 * Plugin Emotion
 *
 * CSS-in-JS performant pour React
 * Documentation officielle : https://emotion.sh
 *
 * @example
 * ```typescript
 * import { emotionPlugin } from './plugins/css/emotion'
 * await emotionPlugin.install(ctx)
 * await emotionPlugin.configure(ctx)
 * ```
 */
export const emotionPlugin: Plugin = {
  name: '@emotion/react',
  displayName: 'Emotion',
  description: 'CSS-in-JS performant',
  category: Category.CSS,
  version: '^11.14.0',

  frameworks: ['react'],
  incompatibleWith: ['tailwindcss', 'styled-components'],

  /**
   * Détecte si Emotion est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@emotion/react'] !== undefined ||
      ctx.devDependencies['@emotion/react'] !== undefined ||
      ctx.dependencies['@emotion/styled'] !== undefined ||
      ctx.devDependencies['@emotion/styled'] !== undefined
    )
  },

  /**
   * Installe Emotion
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Emotion is already installed')
      return {
        packages: {},
        success: true,
        message: 'Emotion already installed',
      }
    }

    try {
      // Installer @emotion/react (requis)
      await installPackages(['@emotion/react'], {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      // Installer @emotion/styled (recommandé pour styled API)
      await installPackages(['@emotion/styled'], {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Emotion')

      return {
        packages: {
          dependencies: ['@emotion/react', '@emotion/styled'],
        },
        success: true,
        message: 'Installed @emotion/react and @emotion/styled',
      }
    } catch (error) {
      logger.error('Failed to install Emotion:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Emotion: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Emotion dans le projet
   *
   * Crée :
   * - src/components/emotion/Button.tsx (ou .jsx) : Exemple avec styled API
   * - src/components/emotion/Card.tsx (ou .jsx) : Exemple avec css prop
   * - src/components/emotion/index.ts (ou .js) : Export des composants
   *
   * Documentation : https://emotion.sh/docs/introduction
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'tsx' : 'jsx'

    try {
      // 1. Créer le dossier components/emotion si nécessaire
      const emotionDir = join(srcDir, 'components', 'emotion')
      await ensureDirectory(emotionDir)

      // 2. Créer src/components/emotion/Button.tsx (exemple avec styled API)
      const buttonPath = join(emotionDir, `Button.${extension}`)
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

      // 3. Créer src/components/emotion/Card.tsx (exemple avec css prop)
      const cardPath = join(emotionDir, `Card.${extension}`)
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

      // 4. Créer src/components/emotion/index.ts (export des composants)
      const indexPath = join(
        emotionDir,
        `index.${ctx.typescript ? 'ts' : 'js'}`
      )
      const indexContent = getIndexContent()

      await writer.createFile(indexPath, indexContent)
      files.push({
        type: 'create',
        path: indexPath,
        content: indexContent,
        backup: false,
      })

      logger.info(`Created emotion components index: ${indexPath}`)

      return {
        files,
        success: true,
        message: 'Emotion configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Emotion:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Emotion: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Emotion
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('Emotion configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Emotion configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier components/emotion/Button.tsx (TypeScript)
 * Exemple de composant stylé avec styled API
 */
function getButtonContentTS(): string {
  return `import styled from '@emotion/styled'

/**
 * Composant Button stylé avec Emotion (styled API)
 * 
 * Documentation : https://emotion.sh/docs/styled
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { Button } from './components/emotion'
 * 
 * function App() {
 *   return <Button>Click me</Button>
 * }
 * \`\`\`
 */
export const Button = styled.button\`
  padding: 32px;
  background-color: hotpink;
  font-size: 24px;
  border-radius: 4px;
  color: black;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: white;
    background-color: #BF4F74;
  }

  &:active {
    transform: scale(0.98);
  }
\`
`
}

/**
 * Contenu du fichier components/emotion/Button.jsx (JavaScript)
 */
function getButtonContentJS(): string {
  return `import styled from '@emotion/styled'

/**
 * Composant Button stylé avec Emotion (styled API)
 * 
 * Documentation : https://emotion.sh/docs/styled
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export const Button = styled.button\`
  padding: 32px;
  background-color: hotpink;
  font-size: 24px;
  border-radius: 4px;
  color: black;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: white;
    background-color: #BF4F74;
  }

  &:active {
    transform: scale(0.98);
  }
\`
`
}

/**
 * Contenu du fichier components/emotion/Card.tsx (TypeScript)
 * Exemple de composant avec css prop
 */
function getCardContentTS(): string {
  return `import { css } from '@emotion/react'

/**
 * Composant Card avec css prop
 * 
 * Documentation : https://emotion.sh/docs/css-prop
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { Card } from './components/emotion'
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
  children: React.ReactNode
}

export function Card({ $primary = false, children }: CardProps) {
  const cardStyles = css\`
    padding: 2em;
    margin: 1em;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background: \${$primary ? '#BF4F74' : 'white'};
    color: \${$primary ? 'white' : '#333'};
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

  return <div css={cardStyles}>{children}</div>
}
`
}

/**
 * Contenu du fichier components/emotion/Card.jsx (JavaScript)
 */
function getCardContentJS(): string {
  return `import { css } from '@emotion/react'

/**
 * Composant Card avec css prop
 * 
 * Documentation : https://emotion.sh/docs/css-prop
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export function Card({ $primary = false, children }) {
  const cardStyles = css\`
    padding: 2em;
    margin: 1em;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background: \${$primary ? '#BF4F74' : 'white'};
    color: \${$primary ? 'white' : '#333'};
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

  return <div css={cardStyles}>{children}</div>
}
`
}

/**
 * Contenu du fichier components/emotion/index.ts/js
 * Export des composants Emotion
 */
function getIndexContent(): string {
  return `/**
 * Composants Emotion
 * 
 * Export centralisé de tous les composants Emotion
 * 
 * Documentation : https://emotion.sh
 */

export { Button } from './Button'
export { Card } from './Card'
`
}
