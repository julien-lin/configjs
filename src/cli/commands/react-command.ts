import type { ProjectContext } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { BaseFrameworkCommand } from './base-framework-command.js'
import { detectContext, DetectionError } from '../../core/detector.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'chalk'

/**
 * Commande d'installation pour React
 *
 * Cette classe étend BaseFrameworkCommand et implémente la logique
 * spécifique à React (détection, création de projet Vite, etc.)
 */
export class ReactCommand extends BaseFrameworkCommand {
  protected getFramework(): 'react' {
    return 'react'
  }

  protected async getOrCreateContext(
    projectRoot: string,
    language: SupportedLanguage
  ): Promise<ProjectContext> {
    const t = getTranslations(language)
    const metadata = getFrameworkMetadata('react')

    if (!metadata) {
      throw new Error('React framework metadata not found')
    }

    try {
      return await detectContext(projectRoot)
    } catch (error) {
      // Si React n'est pas détecté, proposer de créer un projet Vite
      if (error instanceof DetectionError) {
        console.log()
        console.log(pc.yellow(t.vite.noReactDetected))
        console.log()

        const setupOptions = await metadata.getSetupPrompt(language)

        if (!setupOptions) {
          console.log()
          console.log(pc.gray(t.common.cancel))
          throw new Error('Project creation cancelled')
        }

        // Créer le projet Vite
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
