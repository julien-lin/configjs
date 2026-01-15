import { execSync } from 'child_process'
import { join } from 'path'
import type { SvelteSetupOptions } from '../prompts/svelte-setup.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'picocolors'
import { checkPathExists } from '../../utils/fs-helpers.js'

/**
 * Crée un nouveau projet Svelte avec Vite
 *
 * Utilise `npm create svelte@latest` pour générer la structure initiale
 * puis configure TypeScript selon le choix de l'utilisateur
 *
 * @param options - Options de configuration (nom, TypeScript)
 * @param currentDir - Répertoire actuel où créer le projet
 * @param language - Langue pour les messages
 * @returns Chemin du projet créé
 * @throws Erreur si le projet existe déjà ou si la création échoue
 */
export async function createSvelteProject(
  options: SvelteSetupOptions,
  currentDir: string,
  language: SupportedLanguage
): Promise<string> {
  const t = getTranslations(language)
  const projectPath = join(currentDir, options.projectName)

  // Vérifier que le répertoire n'existe pas déjà
  if (await checkPathExists(projectPath)) {
    throw new Error(
      t.vite.folderExists?.(options.projectName) ||
        `Folder ${options.projectName} already exists`
    )
  }

  console.log()
  console.log(
    pc.cyan(`✨ ${t.svelte.creatingProject || 'Creating Svelte project...'}`)
  )
  console.log()

  try {
    // Créer le projet Svelte
    const templateSuffix = options.useTypeScript ? '' : '-js'
    const createCommand = `npm create svelte@latest ${options.projectName} -- --template skeleton${templateSuffix} --no-install`

    execSync(createCommand, {
      cwd: currentDir,
      stdio: 'inherit',
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    })

    // Installer les dépendances
    console.log()
    console.log(
      pc.cyan(
        `📦 ${t.svelte.installingDependencies || 'Installing dependencies...'}`
      )
    )
    console.log()

    execSync('npm install', {
      cwd: projectPath,
      stdio: 'inherit',
    })

    console.log()
    console.log(
      pc.green(
        `✅ ${t.svelte.projectCreated || 'Svelte project created successfully!'}`
      )
    )
    console.log()

    return projectPath
  } catch (error) {
    console.error(
      pc.red(
        `❌ Failed to create Svelte project: ${error instanceof Error ? error.message : String(error)}`
      )
    )
    throw error
  }
}
