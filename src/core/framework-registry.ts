import type { Framework, Bundler } from '../types/index.js'
import type { SupportedLanguage } from '../cli/i18n/types.js'

/**
 * Métadonnées pour un framework
 *
 * Contient toutes les informations nécessaires pour :
 * - Détecter le framework
 * - Créer un projet avec ce framework
 * - Afficher les messages appropriés
 */
export interface FrameworkMetadata {
  /** Identifiant du framework (doit correspondre au type Framework) */
  id: Framework

  /** Nom d'affichage du framework */
  displayName: string

  /** Packages npm à détecter pour identifier ce framework */
  detectPackages: string[]

  /** Bundler par défaut pour ce framework */
  defaultBundler: Bundler

  /** Commande de création de projet (ex: "npm create vite@latest") */
  createCommand: string

  /** Arguments par défaut pour la création */
  createArgs?: (options: unknown) => string[]

  /** Template à utiliser pour la création */
  templates?: {
    js: string
    ts: string
  }

  /** Fonction pour obtenir le prompt de setup */
  getSetupPrompt: (language: SupportedLanguage) => Promise<unknown>

  /** Fonction pour créer le projet */
  createProject: (
    options: unknown,
    currentDir: string,
    language: SupportedLanguage
  ) => Promise<string>

  /** Messages i18n pour ce framework */
  i18nKeys: {
    noFrameworkDetected: string
    creating: string
    folderExists: (name: string) => string
  }
}

/**
 * Registry centralisé des frameworks supportés
 *
 * Cette registry permet d'ajouter facilement de nouveaux frameworks
 * sans dupliquer le code des commandes.
 */
export const frameworkRegistry: Record<Framework, FrameworkMetadata> = {
  react: {
    id: 'react',
    displayName: 'React',
    detectPackages: ['react', 'react-dom'],
    defaultBundler: 'vite',
    createCommand: 'npm create vite@latest',
    templates: {
      js: 'react',
      ts: 'react-ts',
    },
    getSetupPrompt: async (language) => {
      const { promptViteSetup } = await import('../cli/prompts/vite-setup.js')
      return await promptViteSetup(language)
    },
    createProject: async (options, currentDir, language) => {
      const { createViteProject } =
        await import('../cli/utils/vite-installer.js')
      return await createViteProject(
        options as Parameters<typeof createViteProject>[0],
        currentDir,
        language
      )
    },
    i18nKeys: {
      noFrameworkDetected: 'vite.noReactDetected',
      creating: 'vite.creating',
      folderExists: (name: string) => `vite.folderExists(${name})`,
    },
  },

  nextjs: {
    id: 'nextjs',
    displayName: 'Next.js',
    detectPackages: ['next'],
    defaultBundler: 'nextjs',
    createCommand: 'npm create next-app@latest',
    getSetupPrompt: async (language) => {
      const { promptNextjsSetup } =
        await import('../cli/prompts/nextjs-setup.js')
      return await promptNextjsSetup(language)
    },
    createProject: async (options, currentDir, language) => {
      const { createNextjsProject } =
        await import('../cli/utils/nextjs-installer.js')
      return await createNextjsProject(
        options as Parameters<typeof createNextjsProject>[0],
        currentDir,
        language
      )
    },
    i18nKeys: {
      noFrameworkDetected: 'nextjs.noNextjsDetected',
      creating: 'nextjs.creating',
      folderExists: (name: string) => `nextjs.folderExists(${name})`,
    },
  },

  vue: {
    id: 'vue',
    displayName: 'Vue.js',
    detectPackages: ['vue'],
    defaultBundler: 'vite',
    createCommand: 'npm create vite@latest',
    templates: {
      js: 'vue',
      ts: 'vue-ts',
    },
    getSetupPrompt: async (language) => {
      const { promptVueSetup } = await import('../cli/prompts/vue-setup.js')
      return await promptVueSetup(language)
    },
    createProject: async (options, currentDir, language) => {
      const { createVueProject } = await import('../cli/utils/vue-installer.js')
      return await createVueProject(
        options as Parameters<typeof createVueProject>[0],
        currentDir,
        language
      )
    },
    i18nKeys: {
      noFrameworkDetected: 'vue.noVueDetected',
      creating: 'vue.creating',
      folderExists: (name: string) => `vue.folderExists(${name})`,
    },
  },

  svelte: {
    id: 'svelte',
    displayName: 'Svelte',
    detectPackages: ['svelte', '@sveltejs/kit'],
    defaultBundler: 'vite',
    createCommand: 'npm create svelte@latest',
    getSetupPrompt: async (_language) => {
      // TODO: Implémenter promptSvelteSetup
      return await Promise.resolve(null)
    },
    createProject: async (_options, _currentDir, _language) => {
      // TODO: Implémenter createSvelteProject
      return await Promise.reject(
        new Error('Svelte project creation not yet implemented')
      )
    },
    i18nKeys: {
      noFrameworkDetected: 'svelte.noSvelteDetected',
      creating: 'svelte.creating',
      folderExists: (name: string) => `svelte.folderExists(${name})`,
    },
  },
}

/**
 * Récupère les métadonnées d'un framework
 *
 * @param framework - Identifiant du framework
 * @returns Métadonnées du framework ou undefined si non trouvé
 */
export function getFrameworkMetadata(
  framework: Framework
): FrameworkMetadata | undefined {
  return frameworkRegistry[framework]
}

/**
 * Récupère tous les frameworks supportés
 *
 * @returns Liste de tous les frameworks supportés
 */
export function getAllSupportedFrameworks(): Framework[] {
  return Object.keys(frameworkRegistry) as Framework[]
}

/**
 * Vérifie si un framework est supporté
 *
 * @param framework - Identifiant du framework à vérifier
 * @returns true si le framework est supporté
 */
export function isFrameworkSupported(
  framework: string
): framework is Framework {
  return framework in frameworkRegistry
}
