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
import { ensureDirectory, normalizePath } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Zod
 *
 * Validation de schémas TypeScript-first
 * Documentation officielle : https://zod.dev
 *
 * @example
 * ```typescript
 * import { zodPlugin } from './plugins/forms/zod'
 * await zodPlugin.install(ctx)
 * await zodPlugin.configure(ctx)
 * ```
 */
export const zodPlugin: Plugin = {
  name: 'zod',
  displayName: 'Zod',
  description: 'Validation de schémas TypeScript-first',
  category: Category.FORMS,
  version: '^3.24.1',

  frameworks: ['react', 'vue', 'svelte', 'nextjs'],

  /**
   * Détecte si Zod est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['zod'] !== undefined ||
      ctx.devDependencies['zod'] !== undefined
    )
  },

  /**
   * Installe Zod
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Zod is already installed')
      return {
        packages: {},
        success: true,
        message: 'Zod already installed',
      }
    }

    try {
      const packages: string[] = ['zod']

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Zod')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed Zod: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Zod:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Zod: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Zod dans le projet
   *
   * Crée :
   * - src/lib/schemas/user.ts (ou .js) : Exemple de schéma Zod
   * - src/lib/schemas/index.ts (ou .js) : Export centralisé
   *
   * Documentation : https://zod.dev
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = join(ctx.projectRoot, ctx.srcDir)

    try {
      // 1. Créer le dossier lib/schemas si nécessaire
      const schemasDir = join(srcDir, 'lib', 'schemas')
      await ensureDirectory(schemasDir)

      // 2. Créer src/lib/schemas/user.ts (exemple de schéma)
      const userSchemaPath = join(
        schemasDir,
        `user.${ctx.typescript ? 'ts' : 'js'}`
      )
      const userSchemaContent = ctx.typescript
        ? getUserSchemaContentTS()
        : getUserSchemaContentJS()

      await writer.createFile(userSchemaPath, userSchemaContent)
      files.push({
        type: 'create',
        path: normalizePath(userSchemaPath),
        content: userSchemaContent,
        backup: false,
      })

      logger.info(`Created user schema: ${userSchemaPath}`)

      // 3. Créer src/lib/schemas/index.ts (export centralisé)
      const indexPath = join(
        schemasDir,
        `index.${ctx.typescript ? 'ts' : 'js'}`
      )
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

      logger.info(`Created schemas index: ${indexPath}`)

      return {
        files,
        success: true,
        message: 'Zod configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Zod:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Zod: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Zod
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('Zod configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Zod configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du schéma User (TypeScript)
 */
function getUserSchemaContentTS(): string {
  return `import { z } from 'zod'

/**
 * Exemple de schéma Zod pour un utilisateur
 * 
 * Documentation : https://zod.dev
 * 
 * Ce fichier est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`ts
 * import { userSchema } from './schemas'
 * 
 * // Validation
 * const result = userSchema.safeParse({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   age: 30
 * })
 * 
 * if (result.success) {
 *   console.log(result.data) // Type-safe!
 * } else {
 *   console.error(result.error)
 * }
 * \`\`\`
 */
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  age: z.number().int().min(0).max(150).optional(),
  bio: z.string().max(500).optional(),
})

export type User = z.infer<typeof userSchema>
`
}

/**
 * Contenu du schéma User (JavaScript)
 */
function getUserSchemaContentJS(): string {
  return `import { z } from 'zod'

/**
 * Exemple de schéma Zod pour un utilisateur
 * 
 * Documentation : https://zod.dev
 * 
 * Ce fichier est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  age: z.number().int().min(0).max(150).optional(),
  bio: z.string().max(500).optional(),
})
`
}

/**
 * Contenu de l'index (TypeScript)
 */
function getIndexContentTS(): string {
  return `export { userSchema, type User } from './user'
`
}

/**
 * Contenu de l'index (JavaScript)
 */
function getIndexContentJS(): string {
  return `export { userSchema } from './user'
`
}
