import type { ProjectContext } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { BaseFrameworkCommand } from './base-framework-command.js'
import { detectContext, DetectionError } from '../../core/detector.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'chalk'

/**
 * Commande d'installation pour Next.js
 *
 * Cette classe étend BaseFrameworkCommand et implémente la logique
 * spécifique à Next.js (détection, création de projet, affichage router type, etc.)
 */
export class NextjsCommand extends BaseFrameworkCommand {
  protected getFramework(): 'nextjs' {
    return 'nextjs'
  }

  protected async getOrCreateContext(
    projectRoot: string,
    language: SupportedLanguage
  ): Promise<ProjectContext> {
    const t = getTranslations(language)
    const metadata = getFrameworkMetadata('nextjs')

    if (!metadata) {
      throw new Error('Next.js framework metadata not found')
    }

    try {
      return await detectContext(projectRoot)
    } catch (error) {
      // Si Next.js n'est pas détecté, proposer de créer un projet Next.js
      if (error instanceof DetectionError) {
        console.log()
        console.log(pc.yellow(t.nextjs.noNextjsDetected))
        console.log()

        const setupOptions = await metadata.getSetupPrompt(language)

        if (!setupOptions) {
          console.log()
          console.log(pc.gray(t.common.cancel))
          throw new Error('Project creation cancelled')
        }

        // Créer le projet Next.js
        const newProjectPath = await metadata.createProject(
          setupOptions,
          projectRoot,
          language
        )

        // Use the new project path (no process.chdir needed)
        projectRoot = newProjectPath

        console.log()

        // Réessayer la détection du contexte
        return await detectContext(projectRoot)
      }

      throw error
    }
  }
}
