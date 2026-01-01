import inquirer from 'inquirer'
import type { Plugin } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'

/**
 * Affiche un résumé de l'installation et demande confirmation
 *
 * @param selectedPlugins - Plugins sélectionnés
 * @param lang - Langue choisie
 * @returns true si l'utilisateur confirme, false sinon
 */
export async function promptConfirmation(
  selectedPlugins: Plugin[],
  lang: SupportedLanguage
): Promise<boolean> {
  const translations = getTranslations(lang)

  // Afficher le résumé
  console.log(`\n${translations.confirmation.summary}\n`)
  console.log(`${translations.confirmation.packagesToInstall}:`)
  for (const plugin of selectedPlugins) {
    console.log(
      `   • ${plugin.displayName}${plugin.version ? ` (${plugin.version})` : ''}`
    )
  }

  // Demander confirmation
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: translations.confirmation.continueQuestion,
      default: true,
    },
  ])

  return confirm
}
