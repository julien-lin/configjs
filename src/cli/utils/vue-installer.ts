import { resolve } from 'path'
import { execa } from 'execa'
import { checkPathExists } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'
import type { VueSetupOptions } from '../prompts/vue-setup.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'

/**
 * Validates project name to prevent shell injection
 */
function validateProjectName(name: string): boolean {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return false
  return !name.includes('..') && !name.includes('/') && !name.includes('\\')
}

/**
 * Installe un projet Vue.js avec Vite
 *
 * @param options - Options de création du projet
 * @param currentDir - Répertoire actuel
 * @param language - Langue pour les messages
 * @returns Chemin du nouveau projet créé
 * @throws {Error} Si la création échoue
 */
export async function createVueProject(
  options: VueSetupOptions,
  currentDir: string,
  language: SupportedLanguage
): Promise<string> {
  const t = getTranslations(language)
  const { projectName, typescript } = options

  // SECURITY: Validate project name to prevent shell injection
  if (!validateProjectName(projectName)) {
    throw new Error(`Invalid project name: ${projectName}`)
  }

  const projectPath = resolve(currentDir, projectName)

  // Vérifier si le dossier existe déjà
  if (await checkPathExists(projectPath)) {
    throw new Error(t.vue.folderExists(projectName))
  }

  logger.info(t.vue.creating)

  try {
    // Utiliser npm create vite@latest avec template Vue
    const template = typescript ? 'vue-ts' : 'vue'
    const args = [
      'create',
      'vite@latest',
      projectName,
      '--',
      '--template',
      template,
    ]

    await execa('npm', args, {
      cwd: currentDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_yes: 'true',
      },
    })

    logger.info(t.vue.success)

    return projectPath
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`${t.vue.error}: ${errorMessage}`)
    throw new Error(`${t.vue.error}: ${errorMessage}`)
  }
}
