import { resolve } from 'path'
import { execa } from 'execa'
import { checkPathExists } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'
import type { VueSetupOptions } from '../prompts/vue-setup.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'

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
    })

    logger.info(t.vue.success)

    // Installer les dépendances optionnelles après création
    const optionalDeps: string[] = []

    if (options.router) {
      optionalDeps.push('vue-router@4')
    }

    if (options.pinia) {
      optionalDeps.push('pinia')
    }

    if (options.vitest) {
      optionalDeps.push('vitest', '@vue/test-utils', '@vitest/ui')
    }

    if (options.eslint) {
      optionalDeps.push(
        'eslint',
        'eslint-plugin-vue',
        '@vue/eslint-config-prettier'
      )
    }

    if (options.prettier) {
      optionalDeps.push('prettier', 'eslint-config-prettier')
    }

    if (optionalDeps.length > 0) {
      logger.info(
        `Installing optional dependencies: ${optionalDeps.join(', ')}`
      )
      await execa('npm', ['install', ...optionalDeps], {
        cwd: projectPath,
        stdio: 'inherit',
      })
    }

    return projectPath
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`${t.vue.error}: ${errorMessage}`)
    throw new Error(`${t.vue.error}: ${errorMessage}`)
  }
}
