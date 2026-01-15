import type { ProjectContext } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { BaseFrameworkCommand } from './base-framework-command.js'
import { detectContext, DetectionError } from '../../core/detector.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'picocolors'

/**
 * Commande d'installation pour Angular
 *
 * Cette classe étend BaseFrameworkCommand et implémente la logique
 * spécifique à Angular (détection, création de projet, etc.)
 */
export class AngularCommand extends BaseFrameworkCommand {
    protected getFramework(): 'angular' {
        return 'angular'
    }

    protected async getOrCreateContext(
        projectRoot: string,
        language: SupportedLanguage
    ): Promise<ProjectContext> {
        const t = getTranslations(language)
        const metadata = getFrameworkMetadata('angular')

        if (!metadata) {
            throw new Error('Angular framework metadata not found')
        }

        try {
            return await detectContext(projectRoot)
        } catch (error) {
            // Si Angular n'est pas détecté, proposer de créer un projet Angular
            if (error instanceof DetectionError) {
                console.log()
                console.log(pc.yellow(t.angular.noAngularDetected))
                console.log()

                const setupOptions = await metadata.getSetupPrompt(language)
                const projectPath = await metadata.createProject(
                    setupOptions,
                    projectRoot,
                    language
                )

                console.log()
                console.log(pc.green(t.angular.projectCreated))
                console.log()

                // Détecter le contexte du nouveau projet
                return await detectContext(projectPath)
            }

            throw error
        }
    }
}
