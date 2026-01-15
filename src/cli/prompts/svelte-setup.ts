import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'
import { input, confirm } from '@inquirer/prompts'
import pc from 'picocolors'

export interface SvelteSetupOptions {
    projectName: string
    useTypeScript: boolean
}

/**
 * Prompt interactif pour la configuration d'un projet Svelte
 *
 * Demande à l'utilisateur:
 * - Le nom du projet
 * - S'il souhaite utiliser TypeScript
 *
 * @param language - Langue de l'interface
 * @returns Options de configuration pour la création du projet
 */
export async function promptSvelteSetup(
    language: SupportedLanguage
): Promise<SvelteSetupOptions | null> {
    const t = getTranslations(language)

    console.log()
    console.log(pc.cyan(pc.bold('📋 Svelte Project Setup')))
    console.log()

    // Demander le nom du projet
    const projectName = await input({
        message: t.svelte.projectName || 'Project name',
        default: 'my-svelte-app',
        validate: (value: string) => {
            if (!value || value.trim().length === 0) {
                return 'Project name cannot be empty'
            }
            return true
        },
    })

    // Demander si TypeScript est souhaité
    const useTypeScript = await confirm({
        message: t.svelte.useTypeScript || 'Use TypeScript?',
        default: true,
    })

    return {
        projectName: projectName.trim(),
        useTypeScript,
    }
}
