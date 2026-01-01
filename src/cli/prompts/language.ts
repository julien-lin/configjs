import inquirer from 'inquirer'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'

/**
 * Prompt pour sélectionner la langue
 * C'est la première question affichée au démarrage
 *
 * @returns Langue sélectionnée par l'utilisateur
 */
export async function promptLanguage(): Promise<SupportedLanguage> {
  // Utiliser les traductions en anglais pour le prompt de langue
  // (car on ne connaît pas encore la langue de l'utilisateur)
  const defaultTranslations = getTranslations('en')

  const { language } = await inquirer.prompt<{ language: SupportedLanguage }>([
    {
      type: 'list',
      name: 'language',
      message: defaultTranslations.language.select,
      choices: defaultTranslations.language.options.map((opt) => ({
        name: opt.name,
        value: opt.value,
      })),
      default: 'en',
    },
  ])

  return language
}
