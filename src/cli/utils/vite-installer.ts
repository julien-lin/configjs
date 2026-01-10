import { resolve } from 'path'
import { execa } from 'execa'
import { checkPathExists } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'
import type { ViteSetupOptions } from '../prompts/vite-setup.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'

/**
 * Installe un projet React avec Vite
 *
 * @param options - Options de création du projet
 * @param currentDir - Répertoire actuel
 * @param language - Langue pour les messages
 * @returns Chemin du nouveau projet créé
 * @throws {Error} Si la création échoue
 */
export async function createViteProject(
  options: ViteSetupOptions,
  currentDir: string,
  language: SupportedLanguage
): Promise<string> {
  const t = getTranslations(language)
  const { projectName, template } = options

  const projectPath = resolve(currentDir, projectName)

  // Vérifier si le dossier existe déjà
  if (await checkPathExists(projectPath)) {
    throw new Error(t.vite.folderExists(projectName))
  }

  logger.info(t.vite.creating)

  try {
    // Exécuter npm create vite@latest
    // Format: npm create vite@latest <project-name> -- --template <template>
    const result = await execa(
      'npm',
      ['create', 'vite@latest', projectName, '--', '--template', template],
      {
        cwd: currentDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          // Désactiver les prompts interactifs de Vite
          npm_config_yes: 'true',
        },
      }
    )

    if (result.exitCode !== 0) {
      throw new Error(`${t.vite.error}: exit code ${result.exitCode}`)
    }

    logger.success(t.vite.success)
    logger.info(t.vite.changingDirectory)

    return projectPath
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`${t.vite.error}: ${errorMessage}`)
    throw error
  }
}
