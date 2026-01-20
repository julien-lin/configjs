import inquirer from 'inquirer'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'picocolors'
import {
  viteSetupSchema,
  validateInput,
  getValidationErrorMessage,
} from '../../core/input-validator.js'

export interface ViteSetupOptions {
  projectName: string
  template: 'react' | 'react-ts' | 'vue' | 'vue-ts' | 'svelte' | 'svelte-ts'
}

/**
 * Prompt pour demander les options de création d'un projet Vite
 *
 * @param language - Langue sélectionnée
 * @returns Options de création du projet
 */
export async function promptViteSetup(
  language: SupportedLanguage
): Promise<ViteSetupOptions | null> {
  const t = getTranslations(language)

  const answers = await inquirer.prompt<{
    shouldCreate: boolean
    projectName: string
    typescript: boolean
  }>([
    {
      type: 'confirm',
      name: 'shouldCreate',
      message: t.vite.proposeSetup,
      default: true,
    },
    {
      type: 'input',
      name: 'projectName',
      message: t.vite.projectName,
      default: t.vite.projectNamePlaceholder,
      when: (answers): boolean => answers.shouldCreate === true,
      validate: (input: string): string | true => {
        if (!input || input.trim().length === 0) {
          return t.vite.validation.empty
        }
        // Valider que le nom est valide pour un dossier
        if (!/^[a-z0-9-_]+$/i.test(input)) {
          return t.vite.validation.invalid
        }
        return true
      },
    },
    {
      type: 'confirm',
      name: 'typescript',
      message: t.vite.typescript,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
  ])

  if (!answers.shouldCreate) {
    return null
  }

  // SECURITY: Validate all inputs against Zod schema
  try {
    const validated = validateInput(viteSetupSchema, {
      projectName: answers.projectName.trim(),
      template: answers.typescript ? 'react-ts' : 'react',
    })
    return validated
  } catch (error) {
    console.error(pc.red(`❌ ${getValidationErrorMessage(error)}`))
    throw error
  }
}
