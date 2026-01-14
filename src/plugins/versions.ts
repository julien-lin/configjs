/**
 * Registre centralisé des versions de tous les plugins
 *
 * Permet de gérer les versions au même endroit pour éviter
 * les incohérences et faciliter les mises à jour.
 *
 * @example
 * ```typescript
 * import { PLUGIN_VERSIONS, getVersion } from './plugins/versions'
 *
 * const zustandVersion = getVersion('zustand')
 * ```
 */

/**
 * Registre des versions des plugins
 */
export const PLUGIN_VERSIONS = {
  // State Management
  zustand: '^5.0.9',
  jotai: '^2.10.4',
  '@reduxjs/toolkit': '^1.9.7',
  redux: '^4.2.1',
  'react-redux': '^9.1.0',
  pinia: '^2.1.7',
  'pinia-plugin-persistedstate': '^3.2.1',

  // Routing
  'react-router-dom': '^7.11.0',
  'react-router': '^7.11.0',
  '@tanstack/react-router': '^1.57.0',
  'vue-router': '^4.4.0',

  // HTTP/API
  axios: '^1.6.5',
  '@tanstack/react-query': '^5.56.2',
  '@tanstack/vue-query': '^5.92.6',

  // CSS/Styling
  tailwindcss: '^3.4.1',
  postcss: '^8.4.31',
  autoprefixer: '^10.4.16',
  'styled-components': '^6.1.1',
  '@emotion/react': '^11.11.1',
  '@emotion/styled': '^11.11.0',
  'react-bootstrap': '^2.10.0',
  bootstrap: '^5.3.2',

  // Forms
  'react-hook-form': '^7.52.0',
  zod: '^3.23.8',
  '@hookform/resolvers': '^3.3.4',

  // UI Components
  '@radix-ui/react-dialog': '^1.1.1',
  '@radix-ui/react-slot': '^2.0.2',
  'shadcn-ui': '^1.0.0',
  'react-icons': '^5.0.1',
  'react-hot-toast': '^2.4.1',

  // Animation
  'framer-motion': '^10.16.16',

  // Testing
  vitest: '^1.0.4',
  '@vitest/ui': '^1.0.4',
  '@testing-library/react': '^14.1.2',
  '@testing-library/vue': '^8.1.0',
  '@testing-library/jest-dom': '^6.1.5',
  '@testing-library/user-event': '^14.5.1',
  playwright: '^1.41.0',
  '@playwright/test': '^1.41.0',

  // Tooling
  eslint: '^8.55.0',
  '@eslint/js': '^8.55.0',
  typescript: '^5.3.3',
  'typescript-eslint': '^6.15.0',
  prettier: '^3.1.1',
  husky: '^8.0.3',
  'lint-staged': '^16.2.7',
  'vue-tsc': '^3.2.2',
  'vue-i18n': '^11.2.8',
  '@commitlint/cli': '^20.3.1',
  '@commitlint/config-conventional': '^20.3.1',
  'unplugin-auto-import': '^20.3.0',
  'unplugin-vue-components': '^30.0.0',

  // Utilities
  'date-fns': '^2.30.0',
  '@vueuse/core': '^10.7.2',

  // Utils & Helpers
  'es-toolkit': '^0.0.16',
  clsx: '^2.0.0',
  classnames: '^2.3.2',

  // TypeScript types
  '@types/node': '^20.10.6',
  '@types/react': '^18.2.45',
  '@types/react-dom': '^18.2.18',
  '@types/react-router-dom': '^5.3.3',
}

/**
 * Obtient la version d'un plugin
 *
 * @param pluginName - Nom du plugin
 * @returns Version du plugin, ou undefined si non trouvé
 */
export function getVersion(pluginName: string): string | undefined {
  return PLUGIN_VERSIONS[pluginName as keyof typeof PLUGIN_VERSIONS]
}

/**
 * Obtient la version d'un plugin ou lance une erreur si non trouvé
 *
 * @param pluginName - Nom du plugin
 * @returns Version du plugin
 * @throws Si le plugin n'est pas trouvé dans le registre
 */
export function getRequiredVersion(pluginName: string): string {
  const version = getVersion(pluginName)
  if (!version) {
    throw new Error(`Version not found for plugin: ${pluginName}`)
  }
  return version
}

/**
 * Obtient toutes les versions des plugins
 */
export function getAllVersions(): Record<string, string> {
  return PLUGIN_VERSIONS
}

/**
 * Met à jour la version d'un plugin
 *
 * @param pluginName - Nom du plugin
 * @param version - Nouvelle version
 */
export function setVersion(pluginName: string, version: string): void {
  PLUGIN_VERSIONS[pluginName as keyof typeof PLUGIN_VERSIONS] = version
}

/**
 * Vérifie si une version est disponible dans le registre
 *
 * @param pluginName - Nom du plugin
 */
export function hasVersion(pluginName: string): boolean {
  return pluginName in PLUGIN_VERSIONS
}
