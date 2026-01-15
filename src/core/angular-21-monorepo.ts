import { promises as fs } from 'fs'
import { resolve } from 'path'
import { getModuleLogger } from '../utils/logger-provider.js'

const logger = getModuleLogger()

export type MonorepoType = 'nx' | 'pnpm' | 'yarn' | 'lerna' | 'single'
export type SourceLayout = 'src' | 'lib' | 'packages'

export interface MonorepoConfig {
  type: MonorepoType
  sourceLayout: SourceLayout
  appPath: string // Path to app source folder (e.g., src/app or packages/myapp/src/app)
  rootPath: string // Root of monorepo or single project
  isMonorepo: boolean
}

/**
 * Detects project structure and returns appropriate paths
 */
export class MonorepoDetector {
  /**
   * Detects monorepo type from configuration files
   */
  static async detectMonorepoType(projectRoot: string): Promise<MonorepoType> {
    try {
      // Check for Nx
      if (await this.fileExists(resolve(projectRoot, 'nx.json'))) {
        return 'nx'
      }

      // Check for pnpm workspaces
      const pnpmWorkspaces = resolve(projectRoot, 'pnpm-workspace.yaml')
      if (await this.fileExists(pnpmWorkspaces)) {
        return 'pnpm'
      }

      // Check for Yarn workspaces
      const packageJson = await this.readJson(
        resolve(projectRoot, 'package.json')
      )
      if (packageJson?.workspaces) {
        return 'yarn'
      }

      // Check for Lerna
      if (await this.fileExists(resolve(projectRoot, 'lerna.json'))) {
        return 'lerna'
      }

      return 'single'
    } catch (error) {
      logger.warn('Error detecting monorepo type, defaulting to single', error)
      return 'single'
    }
  }

  /**
   * Detects source layout (src vs lib vs packages)
   */
  static async detectSourceLayout(projectRoot: string): Promise<SourceLayout> {
    try {
      // Check for src/
      if (await this.dirExists(resolve(projectRoot, 'src'))) {
        return 'src'
      }

      // Check for lib/
      if (await this.dirExists(resolve(projectRoot, 'lib'))) {
        return 'lib'
      }

      // Check for packages/
      if (await this.dirExists(resolve(projectRoot, 'packages'))) {
        return 'packages'
      }

      // Default to src
      return 'src'
    } catch (error) {
      logger.warn('Error detecting source layout, defaulting to src', error)
      return 'src'
    }
  }

  /**
   * Detects full monorepo configuration
   */
  static async detectConfig(projectRoot: string): Promise<MonorepoConfig> {
    const type = await this.detectMonorepoType(projectRoot)
    const sourceLayout = await this.detectSourceLayout(projectRoot)
    const isMonorepo = type !== 'single'

    // Construct app path based on layout
    let appPath: string
    switch (sourceLayout) {
      case 'lib':
        appPath = isMonorepo
          ? resolve(projectRoot, 'lib', 'app')
          : resolve(projectRoot, 'lib')
        break
      case 'packages':
        appPath = resolve(projectRoot, 'packages', 'app', 'src', 'app')
        break
      case 'src':
      default:
        appPath = resolve(projectRoot, 'src', 'app')
    }

    return {
      type,
      sourceLayout,
      appPath,
      rootPath: projectRoot,
      isMonorepo,
    }
  }

  /**
   * Returns appropriate paths for file generation
   */
  static getComponentPath(
    config: MonorepoConfig,
    componentType: 'icon' | 'menu'
  ): string {
    const componentName = componentType === 'icon' ? 'icon' : 'menu'
    return resolve(
      config.appPath,
      'components',
      `${componentName}.component.ts`
    )
  }

  /**
   * Returns store path for Signal Store
   */
  static getStorePath(config: MonorepoConfig): string {
    return resolve(config.appPath, 'stores', 'app.store.ts')
  }

  /**
   * Returns config path for app.config.ts
   */
  static getAppConfigPath(config: MonorepoConfig): string {
    return resolve(config.appPath, 'app.config.ts')
  }

  /**
   * Returns vitest.config.ts path
   */
  static getVitestConfigPath(config: MonorepoConfig): string {
    // vitest.config.ts stays at root for most monorepos
    return resolve(config.rootPath, 'vitest.config.ts')
  }

  /**
   * Returns test.ts path
   */
  static getTestFilePath(config: MonorepoConfig): string {
    return resolve(config.appPath, 'test.ts')
  }

  /**
   * Helper: check if file exists
   */
  private static async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  }

  /**
   * Helper: check if directory exists
   */
  private static async dirExists(path: string): Promise<boolean> {
    try {
      const stat = await fs.stat(path)
      return stat.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Helper: read JSON file safely
   */
  private static async readJson(path: string): Promise<any> {
    try {
      const content = await fs.readFile(path, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }
}

export const monorepoDetector = new MonorepoDetector()
