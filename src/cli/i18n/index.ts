import type { SupportedLanguage, Translations } from './types.js'
import { fr } from './fr.js'
import { en } from './en.js'
import { es } from './es.js'

/**
 * Obtient les traductions pour une langue donnée
 *
 * @param lang - Langue souhaitée
 * @returns Traductions pour la langue
 */
export function getTranslations(lang: SupportedLanguage): Translations {
  switch (lang) {
    case 'fr':
      return fr
    case 'en':
      return en
    case 'es':
      return es
    default:
      return en // Fallback vers anglais
  }
}

/**
 * Liste des langues supportées
 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'es']

export type { SupportedLanguage, Translations }
