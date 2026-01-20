import type { ProjectContext } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { BaseFrameworkCommand } from './base-framework-command.js'
import { detectContext, DetectionError } from '../../core/detector.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'picocolors'

/**
 * Commande d'installation pour Vue.js
 *
 * Cette classe étend BaseFrameworkCommand et implémente la logique
 * spécifique à Vue.js (détection, création de projet, affichage version/API, etc.)
 */
export class VueCommand extends BaseFrameworkCommand {
  protected getFramework(): 'vue' {
    return 'vue'
  }

  protected async getOrCreateContext(
    projectRoot: string,
    language: SupportedLanguage
  ): Promise<ProjectContext> {
    const t = getTranslations(language)
    const metadata = getFrameworkMetadata('vue')

    if (!metadata) {
      throw new Error('Vue.js framework metadata not found')
    }

    try {
      return await detectContext(projectRoot)
    } catch (error) {
      // Si Vue.js n'est pas détecté, proposer de créer un projet Vue.js
      if (error instanceof DetectionError) {
        console.log()
        console.log(pc.yellow(t.vue.noVueDetected))
        console.log()

        const setupOptions = await metadata.getSetupPrompt(language)

        if (!setupOptions) {
          console.log()
          console.log(pc.gray(t.common.cancel))
          throw new Error('Project creation cancelled')
        }

        // Créer le projet Vue.js
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

  protected override displayFrameworkSpecificInfo(
    ctx: ProjectContext,
    _t: ReturnType<typeof getTranslations>
  ): void {
    if (ctx.vueVersion) {
      console.log(
        pc.green(`   ✓ Vue Version: `) + pc.bold(`Vue ${ctx.vueVersion}`)
      )
    }
    if (ctx.vueApi) {
      console.log(
        pc.green(`   ✓ Vue API: `) +
          pc.bold(
            ctx.vueApi === 'composition' ? 'Composition API' : 'Options API'
          )
      )
    }
  }
}
