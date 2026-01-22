import { resolve } from 'path'
import { execa } from 'execa'
import { checkPathExists } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'
import type { NextjsSetupOptions } from '../prompts/nextjs-setup.js'
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
 * Installe un projet Next.js
 *
 * @param options - Options de création du projet
 * @param currentDir - Répertoire actuel
 * @param language - Langue pour les messages
 * @returns Chemin du nouveau projet créé
 * @throws {Error} Si la création échoue
 */
export async function createNextjsProject(
  options: NextjsSetupOptions,
  currentDir: string,
  language: SupportedLanguage
): Promise<string> {
  const t = getTranslations(language)
  const {
    projectName,
    typescript,
    eslint,
    tailwind,
    srcDir,
    appRouter,
    importAlias,
  } = options

  // SECURITY: Validate project name to prevent shell injection
  if (!validateProjectName(projectName)) {
    throw new Error(`Invalid project name: ${projectName}`)
  }

  const projectPath = resolve(currentDir, projectName)

  // Vérifier si le dossier existe déjà
  if (await checkPathExists(projectPath)) {
    throw new Error(t.nextjs.folderExists(projectName))
  }

  logger.info(t.nextjs.creating)

  try {
    // Construire les arguments pour create-next-app
    const args: string[] = ['create', 'next-app@latest', projectName]

    // Ajouter les flags selon les options
    if (typescript) {
      args.push('--typescript')
    } else {
      args.push('--javascript')
    }

    if (eslint) {
      args.push('--eslint')
    } else {
      args.push('--no-eslint')
    }

    if (tailwind) {
      args.push('--tailwind')
    } else {
      args.push('--no-tailwind')
    }

    if (srcDir) {
      args.push('--src-dir')
    } else {
      args.push('--no-src-dir')
    }

    if (appRouter) {
      args.push('--app')
    } else {
      args.push('--pages')
    }

    // Ajouter l'alias d'import
    args.push('--import-alias', importAlias)

    // Exécuter npm create next-app@latest
    const result = await execa('npm', args, {
      cwd: currentDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        // Désactiver les prompts interactifs de create-next-app
        npm_config_yes: 'true',
      },
    })

    if (result.exitCode !== 0) {
      throw new Error(`${t.nextjs.error}: exit code ${result.exitCode}`)
    }

    logger.success(t.nextjs.success)
    logger.info(t.nextjs.changingDirectory)

    return projectPath
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`${t.nextjs.error}: ${errorMessage}`)
    throw error
  }
}
