import { z } from 'zod'

/**
 * Centralized input validation schemas using Zod
 * All user inputs are validated against these schemas
 * Prevents shell injection, path traversal, and other injection attacks
 */

/**
 * Project name validation:
 * - Only alphanumeric, dots, dashes, underscores
 * - Min 1, Max 100 characters
 * - Rejects path traversal attempts (.. / \)
 * - Rejects shell metacharacters
 */
const projectNameSchema = z
  .string()
  .min(1, 'Project name cannot be empty')
  .max(100, 'Project name cannot exceed 100 characters')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'Project name can only contain letters, numbers, dots, dashes, and underscores'
  )
  .refine(
    (name) => !name.includes('..'),
    'Project name cannot contain path traversal (..) patterns'
  )
  .refine(
    (name) => !name.includes('/') && !name.includes('\\'),
    'Project name cannot contain path separators'
  )
  .transform((name) => name.trim())

/**
 * Svelte setup options validation
 */
export const svelteSetupSchema = z.object({
  projectName: projectNameSchema,
  useTypeScript: z.boolean(),
})

export type SvelteSetupOptions = z.infer<typeof svelteSetupSchema>

/**
 * Angular setup options validation
 */
export const angularSetupSchema = z.object({
  projectName: projectNameSchema,
  useTypeScript: z.boolean(),
  useRouting: z.boolean(),
  useStylesheet: z.enum(['css', 'scss', 'sass', 'less']),
})

export type AngularSetupOptions = z.infer<typeof angularSetupSchema>

/**
 * Vue setup options validation
 */
export const vueSetupSchema = z.object({
  projectName: projectNameSchema,
  typescript: z.boolean(),
})

export type VueSetupOptions = z.infer<typeof vueSetupSchema>

/**
 * Next.js setup options validation
 */
export const nextjsSetupSchema = z.object({
  projectName: projectNameSchema,
  typescript: z.boolean(),
  eslint: z.boolean(),
  tailwind: z.boolean(),
  srcDir: z.boolean(),
  appRouter: z.boolean(),
  importAlias: z
    .string()
    .min(1, 'Import alias cannot be empty')
    .max(50, 'Import alias cannot exceed 50 characters')
    .regex(
      /^@[a-zA-Z0-9_/*-]+$/,
      'Import alias must start with @ and contain only valid characters'
    )
    .default('@/*'),
})

export type NextjsSetupOptions = z.infer<typeof nextjsSetupSchema>

/**
 * Vite setup options validation
 */
export const viteSetupSchema = z.object({
  projectName: projectNameSchema,
  template: z.enum([
    'react',
    'react-ts',
    'vue',
    'vue-ts',
    'svelte',
    'svelte-ts',
  ]),
})

export type ViteSetupOptions = z.infer<typeof viteSetupSchema>

/**
 * Generic validation function with error handling
 * Returns validated data or throws descriptive error
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.flatten().fieldErrors
      const errorMessages: string[] = []
      for (const [field, msgs] of Object.entries(messages)) {
        if (msgs && Array.isArray(msgs)) {
          errorMessages.push(`${field}: ${(msgs as unknown[]).join(', ')}`)
        }
      }
      throw new Error(`Input validation failed: ${errorMessages.join('; ')}`)
    }
    throw error
  }
}

/**
 * Safe project name validation helper
 * Used in installers as first line of defense
 */
export function validateProjectName(name: string): boolean {
  try {
    projectNameSchema.parse(name)
    return true
  } catch {
    return false
  }
}

/**
 * Get validation error message for user feedback
 */
export function getValidationErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    const messages = error.flatten().fieldErrors
    const errorMessages: string[] = []
    for (const [field, msgs] of Object.entries(messages)) {
      if (msgs && Array.isArray(msgs)) {
        errorMessages.push(`${field}: ${(msgs as unknown[]).join(', ')}`)
      }
    }
    return errorMessages.join('; ')
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Validation failed'
}
