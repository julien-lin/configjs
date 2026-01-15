import { spawn } from 'child_process'
import { resolve } from 'path'
import type { SupportedLanguage } from '../i18n/types.js'
import type { AngularSetupOptions } from '../prompts/angular-setup.js'
import { getTranslations } from '../i18n/index.js'
import { SpinnerManager } from '../ui/spinner.js'

/**
 * Crée un nouveau projet Angular
 */
export async function createAngularProject(
  options: AngularSetupOptions,
  currentDir: string,
  language: SupportedLanguage
): Promise<string> {
  const t = getTranslations(language)
  const spinner = new SpinnerManager()

  const projectPath = resolve(currentDir, options.projectName)

  try {
    spinner.start(t.angular.creatingProject)

    // Commande ng new avec les options
    const args = [
      'new',
      options.projectName,
      '--skip-git=true',
      '--skip-install=true',
      '--style=' + options.useStylesheet,
      '--routing=' + (options.useRouting ? 'true' : 'false'),
    ]

    if (options.useTypeScript) {
      args.push('--create-application=true')
    }

    // Exécuter ng new
    await new Promise<void>((resolve, reject) => {
      const child = spawn('ng', args, {
        cwd: currentDir,
        stdio: 'pipe',
      })

      child.on('error', reject)
      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Angular CLI failed with code ${code}`))
        }
      })
    })

    spinner.succeed(t.angular.projectCreated)
    return projectPath
  } catch (error) {
    spinner.fail(t.angular.error)
    throw error
  }
}
