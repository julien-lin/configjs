import pc from 'picocolors'

export interface AngularSetupOptions {
    projectName: string
    useTypeScript: boolean
    useRouting: boolean
    useStylesheet: 'css' | 'scss' | 'sass' | 'less'
}

/**
 * Prompt pour la configuration d'un projet Angular
 */
export function promptAngularSetup(): Promise<AngularSetupOptions> {
    console.log()
    console.log(pc.cyan('⚙️  Angular Project Setup'))
    console.log()

    // Pour cette implémentation basique, retourner les options par défaut
    // Dans une implémentation complète, on utiliserait des prompts interactifs
    return Promise.resolve({
        projectName: 'my-angular-app',
        useTypeScript: true,
        useRouting: true,
        useStylesheet: 'scss',
    })
}
