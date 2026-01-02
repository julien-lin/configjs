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
import {
  checkPathExists,
  ensureDirectory,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin React Testing Library
 *
 * Tests de composants React
 * Documentation officielle : https://testing-library.com/react
 *
 * @example
 * ```typescript
 * import { reactTestingLibraryPlugin } from './plugins/testing/react-testing-library'
 * await reactTestingLibraryPlugin.install(ctx)
 * await reactTestingLibraryPlugin.configure(ctx)
 * ```
 */
export const reactTestingLibraryPlugin: Plugin = {
  name: 'react-testing-library',
  displayName: 'React Testing Library',
  description: 'Tests de composants React',
  category: Category.TESTING,
  version: '^16.3.1',

  frameworks: ['react'],

  /**
   * Détecte si React Testing Library est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@testing-library/react'] !== undefined ||
      ctx.devDependencies['@testing-library/react'] !== undefined
    )
  },

  /**
   * Installe React Testing Library et ses dépendances
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('React Testing Library is already installed')
      return {
        packages: {},
        success: true,
        message: 'React Testing Library already installed',
      }
    }

    try {
      const packages: string[] = [
        '@testing-library/react',
        '@testing-library/jest-dom',
        '@testing-library/user-event',
      ]

      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed React Testing Library')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed React Testing Library: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install React Testing Library:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install React Testing Library: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure React Testing Library dans le projet
   *
   * Crée :
   * - setupTests.ts (ou .js) : Configuration pour les tests
   * - src/components/__tests__/Example.test.tsx (ou .jsx) : Exemple de test
   *
   * Documentation : https://testing-library.com/react
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const srcDir = join(projectRoot, ctx.srcDir)

    try {
      // 1. Créer setupTests.ts (ou .js) à la racine ou dans src
      const setupTestsPath = join(
        projectRoot,
        `setupTests.${ctx.typescript ? 'ts' : 'js'}`
      )
      const setupTestsExists = await checkPathExists(setupTestsPath)

      if (!setupTestsExists) {
        const setupTestsContent = ctx.typescript
          ? getSetupTestsContentTS()
          : getSetupTestsContentJS()

        await writer.createFile(setupTestsPath, setupTestsContent)
        files.push({
          type: 'create',
          path: normalizePath(setupTestsPath),
          content: setupTestsContent,
          backup: false,
        })

        logger.info(`Created setupTests file: ${setupTestsPath}`)
      }

      // 2. Créer un exemple de test
      const testDir = join(srcDir, 'components', '__tests__')
      await ensureDirectory(testDir)

      const exampleTestPath = join(
        testDir,
        `Example.test.${ctx.typescript ? 'tsx' : 'jsx'}`
      )
      const exampleTestExists = await checkPathExists(exampleTestPath)

      if (!exampleTestExists) {
        const exampleTestContent = ctx.typescript
          ? getExampleTestContentTS()
          : getExampleTestContentJS()

        await writer.createFile(exampleTestPath, exampleTestContent)
        files.push({
          type: 'create',
          path: normalizePath(exampleTestPath),
          content: exampleTestContent,
          backup: false,
        })

        logger.info(`Created example test: ${exampleTestPath}`)
      }

      // 3. Vérifier et mettre à jour vitest.config.ts si nécessaire
      const vitestConfigPath = join(projectRoot, 'vitest.config.ts')
      const vitestConfigExists = await checkPathExists(vitestConfigPath)

      if (vitestConfigExists) {
        // Note : On ne modifie pas automatiquement vitest.config.ts
        // L'utilisateur doit ajouter setupFiles manuellement si nécessaire
        logger.info(
          'vitest.config.ts found. Make sure to add setupFiles if needed.'
        )
      }

      return {
        files,
        success: true,
        message: 'React Testing Library configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure React Testing Library:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure React Testing Library: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration React Testing Library
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('React Testing Library configuration rolled back')
    } catch (error) {
      logger.error(
        'Failed to rollback React Testing Library configuration:',
        error
      )
      throw error
    }
  },
}

/**
 * Contenu de setupTests.ts
 */
function getSetupTestsContentTS(): string {
  return `import '@testing-library/jest-dom'
`
}

/**
 * Contenu de setupTests.js
 */
function getSetupTestsContentJS(): string {
  return `import '@testing-library/jest-dom'
`
}

/**
 * Contenu de l'exemple de test (TypeScript)
 */
function getExampleTestContentTS(): string {
  return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Exemple de test avec React Testing Library
 * 
 * Documentation : https://testing-library.com/react
 * 
 * Ce fichier est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
describe('Example Component', () => {
  it('should render correctly', () => {
    render(<div>Hello World</div>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const { user } = await import('@testing-library/user-event')
    const userEvent = user.setup()

    render(
      <button onClick={() => alert('Clicked!')}>Click me</button>
    )

    const button = screen.getByRole('button', { name: /click me/i })
    await userEvent.click(button)
    
    // Vérifier que l'interaction a fonctionné
    expect(button).toBeInTheDocument()
  })
})
`
}

/**
 * Contenu de l'exemple de test (JavaScript)
 */
function getExampleTestContentJS(): string {
  return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Exemple de test avec React Testing Library
 * 
 * Documentation : https://testing-library.com/react
 * 
 * Ce fichier est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
describe('Example Component', () => {
  it('should render correctly', () => {
    render(<div>Hello World</div>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const { user } = await import('@testing-library/user-event')
    const userEvent = user.setup()

    render(
      <button onClick={() => alert('Clicked!')}>Click me</button>
    )

    const button = screen.getByRole('button', { name: /click me/i })
    await userEvent.click(button)
    
    // Vérifier que l'interaction a fonctionné
    expect(button).toBeInTheDocument()
  })
})
`
}
