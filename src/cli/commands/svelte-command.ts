import type { ProjectContext } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { BaseFrameworkCommand } from './base-framework-command.js'
import { detectContext, DetectionError } from '../../core/detector.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'
import { getTranslations } from '../i18n/index.js'
import pc from 'picocolors'

/**
 * Commande d'installation pour Svelte
 *
 * Cette classe étend BaseFrameworkCommand et implémente la logique
 * spécifique à Svelte (détection, création de projet, affichage version, etc.)
 */
export class SvelteCommand extends BaseFrameworkCommand {
  protected getFramework(): 'svelte' {
    return 'svelte'
  }

  protected async getOrCreateContext(
    projectRoot: string,
    language: SupportedLanguage
  ): Promise<ProjectContext> {
    const t = getTranslations(language)
    const metadata = getFrameworkMetadata('svelte')

    if (!metadata) {
      throw new Error('Svelte framework metadata not found')
    }

    try {
      return await detectContext(projectRoot)
    } catch (error) {
      // Si Svelte n'est pas détecté, proposer de créer un projet Svelte
      if (error instanceof DetectionError) {
        console.log()
        console.log(pc.yellow(t.svelte.noSvelteDetected))
        console.log()

        const setupOptions = await metadata.getSetupPrompt(language)

        if (!setupOptions) {
          console.log()
          console.log(pc.gray(t.common.cancel))
          throw new Error('Project creation cancelled')
        }

        // Créer le projet Svelte
        const newProjectPath = await metadata.createProject(
          setupOptions,
          projectRoot,
          language
        )

        console.log()
        console.log(pc.green(`✨ ${t.svelte.projectCreated}`))
        console.log()

        // Retourner le contexte du nouveau projet
        return await detectContext(newProjectPath)
      }

      throw error
    }
  }

  protected displayFrameworkInfo(ctx: ProjectContext): void {
    console.log()
    console.log(pc.cyan(`${pc.bold('🔍 Détection du contexte...')}`))

    const displayInfo = (label: string, value: string): void => {
      console.log(`   ${pc.green('✓')} ${pc.gray(`${label}:`)} ${value}`)
    }

    displayInfo('Framework', `svelte ${ctx.frameworkVersion || 'unknown'}`)
    displayInfo('TypeScript', ctx.typescript ? 'Yes' : 'No')
    displayInfo('Bundler', `${ctx.bundler} ${ctx.bundlerVersion || 'unknown'}`)
    displayInfo('Package manager', ctx.packageManager || 'npm')

    console.log()
  }
}
