import inquirer from 'inquirer'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'

export interface VueSetupOptions {
  projectName: string
  typescript: boolean
  router: boolean
  pinia: boolean
  vitest: boolean
  eslint: boolean
  prettier: boolean
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
    router: boolean
    pinia: boolean
    vitest: boolean
    eslint: boolean
    prettier: boolean
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
    {
      type: 'confirm',
      name: 'router',
      message: t.vue.router,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'pinia',
      message: t.vue.pinia,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'vitest',
      message: t.vue.vitest,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'eslint',
      message: t.vue.eslint,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
    {
      type: 'confirm',
      name: 'prettier',
      message: t.vue.prettier,
      default: true,
      when: (answers): boolean => answers.shouldCreate === true,
    },
  ])

  if (!answers.shouldCreate) {
    return null
  }

  return {
    projectName: answers.projectName.trim(),
    typescript: answers.typescript,
    router: answers.router,
    pinia: answers.pinia,
    vitest: answers.vitest,
    eslint: answers.eslint,
    prettier: answers.prettier,
  }
}
