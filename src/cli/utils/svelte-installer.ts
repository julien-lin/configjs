import { spawn } from 'child_process'
import { join } from 'path'
import type { SvelteSetupOptions } from '../prompts/svelte-setup.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'chalk'
import { checkPathExists } from '../../utils/fs-helpers.js'

/**
 * Validates project name to prevent shell injection
 */
function validateProjectName(name: string): boolean {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return false
  return !name.includes('..') && !name.includes('/') && !name.includes('\\')
}

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

  // SECURITY: Validate project name to prevent shell injection
  if (!validateProjectName(options.projectName)) {
    throw new Error(`Invalid project name: ${options.projectName}`)
  }

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
    // Créer le projet Svelte - SECURE: use spawn with array args, shell: false
    const templateSuffix = options.useTypeScript ? '' : '-js'
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'npm',
        [
          'create',
          'svelte@latest',
          options.projectName,
          '--',
          '--template',
          `skeleton${templateSuffix}`,
          '--no-install',
        ],
        {
          cwd: currentDir,
          stdio: 'inherit',
          shell: false,
        }
      )

      child.on('error', (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      })

      child.on('exit', (code: number | null) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`npm create svelte failed with code ${code}`))
        }
      })
    })

    // Installer les dépendances
    console.log()
    console.log(
      pc.cyan(
        `📦 ${t.svelte.installingDependencies || 'Installing dependencies...'}`
      )
    )
    console.log()

    await new Promise<void>((resolve, reject) => {
      const child = spawn('npm', ['install'], {
        cwd: projectPath,
        stdio: 'inherit',
        shell: false,
      })

      child.on('error', (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      })

      child.on('exit', (code: number | null) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`npm install failed with code ${code}`))
        }
      })
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
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(pc.red(`❌ Failed to create Svelte project: ${errorMsg}`))
    throw error
  }
}
