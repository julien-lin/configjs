import inquirer from 'inquirer'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'picocolors'
import {
  nextjsSetupSchema,
  validateInput,
  getValidationErrorMessage,
} from '../../core/input-validator.js'

export interface NextjsSetupOptions {
  projectName: string
  typescript: boolean
  eslint: boolean
  tailwind: boolean
  srcDir: boolean
  appRouter: boolean
  importAlias: string
}

/**
 * Prompt pour demander les options de création d'un projet Next.js
 *
 * @param language - Langue sélectionnée
 * @returns Options de création du projet
 */
export async function promptNextjsSetup(
  language: SupportedLanguage
): Promise<NextjsSetupOptions | null> {
  const t = getTranslations(language)

  const answers = await inquirer.prompt<{
    shouldCreate: boolean
    projectName: string
    typescript: boolean
    eslint: boolean
    tailwind: boolean
    srcDir: boolean
    appRouter: boolean
    importAlias: string
  }>([
    {
      type: 'confirm',
      name: 'shouldCreate',
      message: t.nextjs.proposeSetup,
      default: true,
    },
    {
      type: 'input',
      name: 'projectName',
      message: t.nextjs.projectName,
      default: t.nextjs.projectNamePlaceholder,
      when: (answers): boolean => answers.shouldCreate === true,
      validate: (input: string): string | true => {
        if (!input || input.trim().length === 0) {
          return t.nextjs.validation.empty
        }
        // Valider que le nom est valide pour un dossier
        if (!/^[a-z0-9-_]+$/i.test(input)) {
          return t.nextjs.validation.invalid
        }
        return true
      },
    },
    {
      type: 'confirm',
      name: 'typescript',
      message: t.nextjs.typescript,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'eslint',
      message: t.nextjs.eslint,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'tailwind',
      message: t.nextjs.tailwind,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'srcDir',
      message: t.nextjs.srcDir,
      default: false,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'appRouter',
      message: t.nextjs.appRouter,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'input',
      name: 'importAlias',
      message: t.nextjs.importAlias,
      default: '@/*',
      when: (answers): boolean => answers.shouldCreate === true,
      validate: (input: string): string | true => {
        if (!input || input.trim().length === 0) {
          return "L'alias d'import ne peut pas être vide"
        }
        // Valider le format de l'alias (ex: @/*, ~/*, etc.)
        if (!/^[@~]\/\*$/.test(input.trim())) {
          return "L'alias doit être au format @/* ou ~/*"
        }
        return true
      },
    },
  ])

  if (!answers.shouldCreate) {
    return null
  }

  // SECURITY: Validate all inputs against Zod schema
  try {
    const validated = validateInput(nextjsSetupSchema, {
      projectName: answers.projectName.trim(),
      typescript: answers.typescript,
      eslint: answers.eslint,
      tailwind: answers.tailwind,
      srcDir: answers.srcDir,
      appRouter: answers.appRouter,
      importAlias: answers.importAlias.trim(),
    })
    return validated
  } catch (error) {
    console.error(pc.red(`❌ ${getValidationErrorMessage(error)}`))
    throw error
  }
}
