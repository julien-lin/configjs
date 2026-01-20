import pc from 'picocolors'
import {
  angularSetupSchema,
  validateInput,
  getValidationErrorMessage,
} from '../../core/input-validator.js'

export interface AngularSetupOptions {
  projectName: string
  useTypeScript: boolean
  useRouting: boolean
  useStylesheet: 'css' | 'scss' | 'sass' | 'less'
}

/**
 * Prompt pour la configuration d'un projet Angular
 */
export function promptAngularSetup(): Promise<AngularSetupOptions> {
  console.log()
  console.log(pc.cyan('⚙️  Angular Project Setup'))
  console.log()

  // SECURITY: Validate all inputs before returning
  const options = {
    projectName: 'my-angular-app',
    useTypeScript: true,
    useRouting: true,
    useStylesheet: 'scss' as const,
  }

  try {
    const validated = validateInput(angularSetupSchema, options)
    return Promise.resolve(validated)
  } catch (error) {
    console.error(pc.red(`❌ ${getValidationErrorMessage(error)}`))
    throw error
  }
}
