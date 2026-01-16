import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { getModuleLogger } from '../../utils/logger-provider.js'
import { resolve } from 'path'
import fs from 'fs/promises'

const logger = getModuleLogger()

/**
 * Zod Plugin for Angular
 * Schema validation and type inference for Angular forms and API data
 */
export const zodAngularPlugin: Plugin = {
  name: 'zod',
  displayName: 'Zod',
  description: 'TypeScript-first schema validation with static type inference',
  category: Category.FORMS,
  version: '^3.23.0',

  frameworks: ['angular'],
  requiresTypeScript: true,

  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['zod'] !== undefined
  },

  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Zod is already installed')
      return {
        packages: {},
        success: true,
        message: 'Zod already installed',
      }
    }

    const packages: string[] = ['zod@^3.23.0']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
      })

      return {
        packages: { dependencies: packages },
        success: true,
      }
    } catch (error) {
      logger.error('Failed to install Zod', error)
      return {
        packages: {},
        success: false,
        message: `Error installing Zod: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },

  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    try {
      const schemasDir = resolve(ctx.projectRoot, 'src/app/schemas')
      await fs.mkdir(schemasDir, { recursive: true })

      // Create user schema example
      const userSchemaPath = resolve(schemasDir, 'user.schema.ts')
      const userSchemaContent = `import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  createdAt: z.date(),
})

export type User = z.infer<typeof UserSchema>
`
      await fs.writeFile(userSchemaPath, userSchemaContent, 'utf-8')

      // Create validator service
      const validatorPath = resolve(
        ctx.projectRoot,
        'src/app/services/user.validator.ts'
      )
      await fs.mkdir(resolve(ctx.projectRoot, 'src/app/services'), {
        recursive: true,
      })
      const validatorContent = `import { Injectable } from '@angular/core'
import { UserSchema, type User } from '../schemas/user.schema'

@Injectable({
  providedIn: 'root',
})
export class UserValidator {
  validate(data: unknown): { success: boolean; data?: User; error?: string } {
    try {
      const user = UserSchema.parse(data)
      return { success: true, data: user }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }
    }
  }

  validatePartial(
    data: unknown
  ): { success: boolean; data?: Partial<User>; error?: string } {
    try {
      const user = UserSchema.partial().parse(data)
      return { success: true, data: user }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }
    }
  }
}
`
      await fs.writeFile(validatorPath, validatorContent, 'utf-8')

      logger.success('Zod configuration completed')
      logger.info(
        'Created: schemas/user.schema.ts and services/user.validator.ts'
      )

      return {
        files: [
          {
            type: 'create',
            path: 'src/app/schemas/user.schema.ts',
          },
          {
            type: 'create',
            path: 'src/app/services/user.validator.ts',
          },
        ],
        success: true,
      }
    } catch (error) {
      logger.error('Failed to configure Zod', error)
      return {
        files: [],
        success: false,
        message: `Error configuring Zod: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
}
