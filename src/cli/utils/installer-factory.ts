import type { Framework } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'

/**
 * Interface commune pour tous les installateurs de framework
 *
 * Tous les installateurs doivent implémenter cette interface
 * pour être utilisables par la factory.
 */
export interface FrameworkInstaller {
  /**
   * Crée un nouveau projet avec le framework
   *
   * @param options - Options de création du projet (spécifiques au framework)
   * @param currentDir - Répertoire actuel
   * @param language - Langue pour les messages
   * @returns Chemin du nouveau projet créé
   * @throws {Error} Si la création échoue
   */
  createProject(
    options: unknown,
    currentDir: string,
    language: SupportedLanguage
  ): Promise<string>
}

/**
 * Factory pour créer les installateurs de framework
 *
 * Cette factory centralise la création des installateurs
 * et permet d'ajouter facilement de nouveaux frameworks.
 */
export class FrameworkInstallerFactory {
  /**
   * Crée un installateur pour un framework donné
   *
   * @param framework - Identifiant du framework
   * @returns Installateur pour ce framework
   * @throws {Error} Si le framework n'est pas supporté
   */
  static create(framework: Framework): FrameworkInstaller {
    const metadata = getFrameworkMetadata(framework)

    if (!metadata) {
      throw new Error(`Framework ${framework} is not supported`)
    }

    // Retourner un wrapper qui utilise les métadonnées
    return {
      createProject: async (
        options: unknown,
        currentDir: string,
        language: SupportedLanguage
      ): Promise<string> => {
        return await metadata.createProject(options, currentDir, language)
      },
    }
  }

  /**
   * Vérifie si un framework a un installateur disponible
   *
   * @param framework - Identifiant du framework
   * @returns true si l'installateur est disponible
   */
  static isInstallerAvailable(framework: Framework): boolean {
    const metadata = getFrameworkMetadata(framework)
    return metadata !== undefined && metadata.createProject !== undefined
  }
}
