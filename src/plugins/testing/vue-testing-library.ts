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
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin Testing Library (Vue)
 *
 * Tests de composants Vue
 * Documentation officielle : https://testing-library.com/docs/vue-testing-library/intro
 *
 * @example
 * ```typescript
 * import { vueTestingLibraryPlugin } from './plugins/testing/vue-testing-library'
 * await vueTestingLibraryPlugin.install(ctx)
 * await vueTestingLibraryPlugin.configure(ctx)
 * ```
 */
export const vueTestingLibraryPlugin: Plugin = {
  name: '@testing-library/vue',
  displayName: 'Testing Library (Vue)',
  description: 'Tests de composants Vue',
  category: Category.TESTING,
  version: '^8.1.0',

  frameworks: ['vue'],

  /**
   * Détecte si Testing Library (Vue) est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@testing-library/vue'] !== undefined ||
      ctx.devDependencies['@testing-library/vue'] !== undefined
    )
  },

  /**
   * Installe Testing Library (Vue) et ses dépendances
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Testing Library (Vue) is already installed')
      return {
        packages: {},
        success: true,
        message: 'Testing Library (Vue) already installed',
      }
    }

    try {
      const packages: string[] = [
        '@testing-library/vue',
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

      logger.info('Successfully installed Testing Library (Vue)')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed Testing Library (Vue): ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Testing Library (Vue):', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Testing Library (Vue): ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Testing Library (Vue) dans le projet
   *
   * Crée :
   * - src/test/setup.ts (ou .js) : setup tests
   * - src/components/__tests__/Example.test.ts (ou .js) : exemple de test
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const srcDir = join(projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      const setupPath = join(srcDir, 'test', `setup.${extension}`)
      const setupExists = await checkPathExists(setupPath, ctx.fsAdapter)
      if (!setupExists) {
        await ensureDirectory(join(srcDir, 'test'), ctx.fsAdapter)
        const setupContent = getSetupContent()
        await writer.createFile(setupPath, setupContent)
        files.push({
          type: 'create',
          path: normalizePath(setupPath),
          content: setupContent,
          backup: false,
        })
        logger.info(`Created test setup: ${setupPath}`)
      }

      const testDir = join(srcDir, 'components', '__tests__')
      await ensureDirectory(testDir, ctx.fsAdapter)
      const testPath = join(
        testDir,
        `Example.test.${ctx.typescript ? 'ts' : 'js'}`
      )
      const testExists = await checkPathExists(testPath, ctx.fsAdapter)
      if (!testExists) {
        const testContent = getExampleTest(ctx.typescript)
        await writer.createFile(testPath, testContent)
        files.push({
          type: 'create',
          path: normalizePath(testPath),
          content: testContent,
          backup: false,
        })
        logger.info(`Created example test: ${testPath}`)
      }

      // Note : ne modifie pas vitest.config.ts automatiquement
      const vitestConfigPath = join(projectRoot, 'vitest.config.ts')
      const vitestConfigExists = await checkPathExists(
        vitestConfigPath,
        ctx.fsAdapter
      )
      if (vitestConfigExists) {
        logger.info(
          'vitest.config.ts found. Make sure to add setupFiles if needed.'
        )
      }

      return {
        files,
        success: true,
        message: 'Testing Library (Vue) configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Testing Library (Vue):', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Testing Library (Vue): ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Testing Library (Vue)
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('Testing Library (Vue) configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Testing Library (Vue):', error)
      throw error
    }
  },
}

function getSetupContent(): string {
  return `import '@testing-library/jest-dom'
`
}

function getExampleTest(isTypeScript: boolean): string {
  if (isTypeScript) {
    return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { defineComponent } from 'vue'

describe('Example component', () => {
  it('renders text', () => {
    const Component = defineComponent({
      template: '<div>Hello Testing Library</div>',
    })

    render(Component)
    expect(screen.getByText('Hello Testing Library')).toBeInTheDocument()
  })
})
`
  }

  return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { defineComponent } from 'vue'

describe('Example component', () => {
  it('renders text', () => {
    const Component = defineComponent({
      template: '<div>Hello Testing Library</div>',
    })

    render(Component)
    expect(screen.getByText('Hello Testing Library')).toBeInTheDocument()
  })
})
`
}
