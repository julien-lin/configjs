import { resolve, join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import { ensureDirectory, normalizePath } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Axios
 *
 * Client HTTP basé sur les promesses pour navigateur et node.js
 * Documentation officielle : https://axios-http.com
 *
 * @example
 * ```typescript
 * import { axiosPlugin } from './plugins/http/axios'
 * await axiosPlugin.install(ctx)
 * await axiosPlugin.configure(ctx)
 * ```
 */
export const axiosPlugin: Plugin = {
  name: 'axios',
  displayName: 'Axios',
  description: 'Client HTTP basé sur les promesses',
  category: Category.HTTP,
  version: '^1.13.2',

  frameworks: ['react', 'vue', 'svelte', 'nextjs'],

  /**
   * Détecte si Axios est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['axios'] !== undefined
  },

  /**
   * Installe Axios
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Axios is already installed')
      return {
        packages: {},
        success: true,
        message: 'Axios already installed',
      }
    }

    const packages: string[] = ['axios']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Axios')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Axios:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Axios: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Axios dans le projet
   *
   * Crée :
   * - src/lib/api.ts (ou .js) : Instance axios configurée
   * - src/lib/api-types.ts : Types TypeScript (uniquement pour TS)
   *
   * Documentation : https://axios-http.com
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier lib si nécessaire
      const libDir = join(srcDir, 'lib')
      await ensureDirectory(libDir)

      // 2. Créer src/lib/api.ts (instance axios configurée)
      const apiPath = join(libDir, `api.${extension}`)
      const apiContent = ctx.typescript ? getApiContentTS() : getApiContentJS()

      await writer.createFile(apiPath, apiContent)
      files.push({
        type: 'create',
        path: normalizePath(apiPath),
        content: apiContent,
        backup: false,
      })

      logger.info(`Created Axios instance: ${apiPath}`)

      // 3. Pour TypeScript, créer aussi les types
      if (ctx.typescript) {
        const typesPath = join(libDir, 'api-types.ts')
        const typesContent = getApiTypesContentTS()

        await writer.createFile(typesPath, typesContent)
        files.push({
          type: 'create',
          path: normalizePath(typesPath),
          content: typesContent,
          backup: false,
        })

        logger.info(`Created API types: ${typesPath}`)
      }

      return {
        files,
        success: true,
        message: 'Axios configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Axios:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Axios: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Axios
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('Axios configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Axios configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier lib/api.ts (TypeScript)
 * Basé sur la documentation officielle : https://axios-http.com
 */
function getApiContentTS(): string {
  return `import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * Instance Axios configurée
 * 
 * Documentation : https://axios-http.com
 * 
 * Cette instance est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */

// Configuration de base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Intercepteur de requête
 * Permet de modifier les requêtes avant leur envoi
 */
api.interceptors.request.use(
  (config) => {
    // Ajouter un token d'authentification si disponible
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

/**
 * Intercepteur de réponse
 * Permet de gérer les réponses et les erreurs globalement
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Traiter la réponse si nécessaire
    return response
  },
  (error: AxiosError) => {
    // Gestion globale des erreurs
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'erreur
      switch (error.response.status) {
        case 401:
          // Non autorisé - rediriger vers la page de connexion
          console.error('Unauthorized - redirecting to login')
          // window.location.href = '/login'
          break
        case 403:
          console.error('Forbidden')
          break
        case 404:
          console.error('Not found')
          break
        case 500:
          console.error('Server error')
          break
        default:
          console.error('Request failed:', error.response.status)
      }
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('No response received:', error.request)
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Error setting up request:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
`
}

/**
 * Contenu du fichier lib/api.js (JavaScript)
 */
function getApiContentJS(): string {
  return `import axios from 'axios'

/**
 * Instance Axios configurée
 * 
 * Documentation : https://axios-http.com
 * 
 * Cette instance est créée automatiquement par confjs.
 * Vous pouvez la modifier selon vos besoins.
 */

// Configuration de base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Intercepteur de requête
 * Permet de modifier les requêtes avant leur envoi
 */
api.interceptors.request.use(
  (config) => {
    // Ajouter un token d'authentification si disponible
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Intercepteur de réponse
 * Permet de gérer les réponses et les erreurs globalement
 */
api.interceptors.response.use(
  (response) => {
    // Traiter la réponse si nécessaire
    return response
  },
  (error) => {
    // Gestion globale des erreurs
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'erreur
      switch (error.response.status) {
        case 401:
          // Non autorisé - rediriger vers la page de connexion
          console.error('Unauthorized - redirecting to login')
          // window.location.href = '/login'
          break
        case 403:
          console.error('Forbidden')
          break
        case 404:
          console.error('Not found')
          break
        case 500:
          console.error('Server error')
          break
        default:
          console.error('Request failed:', error.response.status)
      }
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('No response received:', error.request)
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Error setting up request:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
`
}

/**
 * Contenu du fichier lib/api-types.ts (TypeScript)
 * Types pour les réponses API
 */
function getApiTypesContentTS(): string {
  return `/**
 * Types pour les réponses API
 * 
 * Ces types sont créés automatiquement par confjs.
 * Vous pouvez les modifier selon vos besoins.
 */

/**
 * Réponse API générique
 */
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  success: boolean
}

/**
 * Erreur API
 */
export interface ApiError {
  message: string
  code?: string
  status?: number
}

/**
 * Exemple d'utilisation :
 * 
 * import api from './api'
 * import type { ApiResponse } from './api-types'
 * 
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 * }
 * 
 * async function getUser(id: number): Promise<ApiResponse<User>> {
 *   const response = await api.get(\`/users/\${id}\`)
 *   return response.data
 * }
 */
`
}
