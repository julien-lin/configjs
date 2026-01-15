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
  readFileContent,
  ensureDirectory,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin React Bootstrap
 *
 * Composants Bootstrap pour React
 * Documentation officielle : https://react-bootstrap.netlify.app
 *
 * @example
 * ```typescript
 * import { reactBootstrapPlugin } from './plugins/css/react-bootstrap'
 * await reactBootstrapPlugin.install(ctx)
 * await reactBootstrapPlugin.configure(ctx)
 * ```
 */
export const reactBootstrapPlugin: Plugin = {
  name: 'react-bootstrap',
  displayName: 'React Bootstrap',
  description: 'Composants Bootstrap pour React',
  category: Category.CSS,
  version: '^2.10.10', // Bootstrap 5.3.8

  frameworks: ['react'],
  incompatibleWith: ['tailwindcss', 'styled-components', 'emotion'],

  /**
   * Détecte si React Bootstrap est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['react-bootstrap'] !== undefined ||
      ctx.devDependencies['react-bootstrap'] !== undefined ||
      ctx.dependencies['bootstrap'] !== undefined ||
      ctx.devDependencies['bootstrap'] !== undefined
    )
  },

  /**
   * Installe React Bootstrap et Bootstrap
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('React Bootstrap is already installed')
      return {
        packages: {},
        success: true,
        message: 'React Bootstrap already installed',
      }
    }

    try {
      // Installer react-bootstrap et bootstrap
      await installPackages(['react-bootstrap', 'bootstrap'], {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed React Bootstrap')

      return {
        packages: {
          dependencies: ['react-bootstrap', 'bootstrap'],
        },
        success: true,
        message: 'Installed react-bootstrap and bootstrap',
      }
    } catch (error) {
      logger.error('Failed to install React Bootstrap:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install React Bootstrap: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure React Bootstrap dans le projet
   *
   * Modifie :
   * - src/index.tsx (ou .jsx) : Ajoute l'import du CSS Bootstrap
   * - src/App.tsx (ou .jsx) : Ajoute un exemple de composant
   *
   * Crée :
   * - src/components/bootstrap/Example.tsx (ou .jsx) : Exemple de composants
   *
   * Documentation : https://react-bootstrap.netlify.app/docs/getting-started/introduction
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'tsx' : 'jsx'

    try {
      // 1. Créer le dossier components/bootstrap si nécessaire
      const bootstrapDir = join(srcDir, 'components', 'bootstrap')
      await ensureDirectory(bootstrapDir, ctx.fsAdapter)

      // 2. Créer src/components/bootstrap/Example.tsx (exemple de composants)
      const examplePath = join(bootstrapDir, `Example.${extension}`)
      const exampleContent = ctx.typescript
        ? getExampleContentTS()
        : getExampleContentJS()

      await writer.createFile(examplePath, exampleContent)
      files.push({
        type: 'create',
        path: normalizePath(examplePath),
        content: exampleContent,
        backup: false,
      })

      logger.info(`Created Bootstrap example: ${examplePath}`)

      // 3. Modifier src/index.tsx pour ajouter l'import du CSS Bootstrap
      const indexPath = join(srcDir, `index.${ctx.typescript ? 'tsx' : 'jsx'}`)
      const indexExists = await checkPathExists(indexPath, ctx.fsAdapter)

      if (indexExists) {
        const indexContent = await readFileContent(
          indexPath,
          'utf-8',
          ctx.fsAdapter
        )
        const modifiedIndexContent = injectBootstrapCSS(indexContent)

        if (modifiedIndexContent !== indexContent) {
          await writer.writeFile(indexPath, modifiedIndexContent, {
            backup: true,
          })
          files.push({
            type: 'modify',
            path: normalizePath(indexPath),
            content: modifiedIndexContent,
            backup: true,
          })

          logger.info(
            `Updated index.${ctx.typescript ? 'tsx' : 'jsx'} with Bootstrap CSS`
          )
        }
      } else {
        // Créer index.tsx si il n'existe pas
        const indexContent = ctx.typescript
          ? getIndexContentTS()
          : getIndexContentJS()

        await writer.createFile(indexPath, indexContent)
        files.push({
          type: 'create',
          path: indexPath,
          content: indexContent,
          backup: false,
        })

        logger.info(
          `Created index.${ctx.typescript ? 'tsx' : 'jsx'} with Bootstrap CSS`
        )
      }

      return {
        files,
        success: true,
        message: 'React Bootstrap configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure React Bootstrap:', error)
      return {
        files,
        success: false,
        message: `Failed to configure React Bootstrap: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration React Bootstrap
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('React Bootstrap configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback React Bootstrap configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier components/bootstrap/Example.tsx (TypeScript)
 * Exemple de composants React Bootstrap
 */
function getExampleContentTS(): string {
  return `import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

/**
 * Exemples de composants React Bootstrap
 * 
 * Documentation : https://react-bootstrap.netlify.app
 * 
 * Ces exemples sont créés automatiquement par confjs.
 * Vous pouvez les modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { BootstrapExample } from './components/bootstrap/Example'
 * 
 * function App() {
 *   return <BootstrapExample />
 * }
 * \`\`\`
 */
export function BootstrapExample() {
  return (
    <Container>
      <Row>
        <Col>
          <Card className="mt-4">
            <Card.Header>React Bootstrap Example</Card.Header>
            <Card.Body>
              <Card.Title>Welcome to React Bootstrap</Card.Title>
              <Card.Text>
                This is an example of React Bootstrap components created by confjs.
              </Card.Text>
              <Button variant="primary">Primary Button</Button>{' '}
              <Button variant="secondary">Secondary Button</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
`
}

/**
 * Contenu du fichier components/bootstrap/Example.jsx (JavaScript)
 */
function getExampleContentJS(): string {
  return `import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

/**
 * Exemples de composants React Bootstrap
 * 
 * Documentation : https://react-bootstrap.netlify.app
 * 
 * Ces exemples sont créés automatiquement par confjs.
 * Vous pouvez les modifier selon vos besoins.
 */
export function BootstrapExample() {
  return (
    <Container>
      <Row>
        <Col>
          <Card className="mt-4">
            <Card.Header>React Bootstrap Example</Card.Header>
            <Card.Body>
              <Card.Title>Welcome to React Bootstrap</Card.Title>
              <Card.Text>
                This is an example of React Bootstrap components created by confjs.
              </Card.Text>
              <Button variant="primary">Primary Button</Button>{' '}
              <Button variant="secondary">Secondary Button</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
`
}

/**
 * Contenu du fichier index.tsx avec Bootstrap CSS (TypeScript)
 */
function getIndexContentTS(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`
}

/**
 * Contenu du fichier index.jsx avec Bootstrap CSS (JavaScript)
 */
function getIndexContentJS(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`
}

/**
 * Injecte l'import du CSS Bootstrap dans un fichier index existant
 */
function injectBootstrapCSS(content: string): string {
  // Vérifier si Bootstrap CSS est déjà importé (avec ou sans 'from')
  if (
    content.includes("'bootstrap/dist/css/bootstrap.min.css'") ||
    content.includes('"bootstrap/dist/css/bootstrap.min.css"') ||
    content.includes("'bootstrap/dist/css/bootstrap.css'") ||
    content.includes('"bootstrap/dist/css/bootstrap.css"')
  ) {
    logger.warn('Bootstrap CSS already imported in index file')
    return content
  }

  // Ajouter l'import du CSS Bootstrap
  const bootstrapImport = "import 'bootstrap/dist/css/bootstrap.min.css'\n"

  // Trouver la dernière ligne d'import
  const lines = content.split('\n')
  let lastImportIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('import ')) {
      lastImportIndex = i
    }
  }

  // Insérer l'import après les imports existants
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, bootstrapImport.trim())
  } else {
    // Si pas d'import, ajouter au début
    lines.unshift(bootstrapImport.trim())
  }

  return lines.join('\n')
}
