import inquirer from 'inquirer'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'picocolors'
import {
  vueSetupSchema,
  validateInput,
  getValidationErrorMessage,
} from '../../core/input-validator.js'

export interface VueSetupOptions {
  projectName: string
  typescript: boolean
}

/**
 * Prompt pour demander les options de création d'un projet Vue.js
 *
 * @param language - Langue sélectionnée
 * @returns Options de création du projet
 */
export async function promptVueSetup(
  language: SupportedLanguage
): Promise<VueSetupOptions | null> {
  const t = getTranslations(language)

  const answers = await inquirer.prompt<{
    shouldCreate: boolean
    projectName: string
    typescript: boolean
  }>([
    {
      type: 'confirm',
      name: 'shouldCreate',
      message: t.vue.proposeSetup,
      default: true,
    },
    {
      type: 'input',
      name: 'projectName',
      message: t.vue.projectName,
      default: t.vue.projectNamePlaceholder,
      when: (answers): boolean => answers.shouldCreate === true,
      validate: (input: string): string | true => {
        if (!input || input.trim().length === 0) {
          return t.vue.validation.empty
        }
        // Valider que le nom est valide pour un dossier
        if (!/^[a-z0-9-_]+$/i.test(input)) {
          return t.vue.validation.invalid
        }
        return true
      },
    },
    {
      type: 'confirm',
      name: 'typescript',
      message: t.vue.typescript,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
  ])

  if (!answers.shouldCreate) {
    return null
  }

  // SECURITY: Validate all inputs against Zod schema
  try {
    const validated = validateInput(vueSetupSchema, {
      projectName: answers.projectName.trim(),
      typescript: answers.typescript,
    })
    return validated
  } catch (error) {
    console.error(pc.red(`❌ ${getValidationErrorMessage(error)}`))
    throw error
  }
}
