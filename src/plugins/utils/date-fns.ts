import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ensureDirectory, normalizePath } from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

import { getPluginServices, getRollbackManager } from './plugin-services.js'

const logger = getModuleLogger()

/**
 * Plugin date-fns
 *
 * Manipulation de dates moderne
 * Documentation officielle : https://date-fns.org
 *
 * @example
 * ```typescript
 * import { dateFnsPlugin } from './plugins/utils/date-fns'
 * await dateFnsPlugin.install(ctx)
 * await dateFnsPlugin.configure(ctx)
 * ```
 */
export const dateFnsPlugin: Plugin = {
  name: 'date-fns',
  displayName: 'date-fns',
  description: 'Manipulation de dates moderne',
  category: Category.TOOLING,
  version: '^4.1.0',

  frameworks: ['react', 'vue', 'svelte', 'nextjs'],

  /**
   * Détecte si date-fns est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['date-fns'] !== undefined ||
      ctx.devDependencies['date-fns'] !== undefined
    )
  },

  /**
   * Installe date-fns
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('date-fns is already installed')
      return {
        packages: {},
        success: true,
        message: 'date-fns already installed',
      }
    }

    try {
      const packages: string[] = ['date-fns']

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed date-fns')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed date-fns: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install date-fns:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install date-fns: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure date-fns dans le projet
   *
   * Crée :
   * - src/lib/utils/date.ts (ou .js) : Utilitaires de dates
   *
   * Documentation : https://date-fns.org
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const { backupManager, writer } = getPluginServices(ctx)

    const files: ConfigResult['files'] = []
    const srcDir = join(ctx.projectRoot, ctx.srcDir)

    try {
      // 1. Créer le dossier lib/utils si nécessaire
      const utilsDir = join(srcDir, 'lib', 'utils')
      await ensureDirectory(utilsDir, ctx.fsAdapter)

      // 2. Créer src/lib/utils/date.ts (utilitaires de dates)
      const dateUtilsPath = join(
        utilsDir,
        `date.${ctx.typescript ? 'ts' : 'js'}`
      )
      const dateUtilsContent = ctx.typescript
        ? getDateUtilsContentTS()
        : getDateUtilsContentJS()

      await writer.createFile(dateUtilsPath, dateUtilsContent)
      files.push({
        type: 'create',
        path: normalizePath(dateUtilsPath),
        content: dateUtilsContent,
        backup: false,
      })

      logger.info(`Created date utilities: ${dateUtilsPath}`)

      return {
        files,
        success: true,
        message: 'date-fns configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure date-fns:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure date-fns: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration date-fns
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = getRollbackManager(_ctx)
    try {
      await backupManager.restoreAll()
      logger.info('date-fns configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback date-fns configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu des utilitaires de dates (TypeScript)
 */
function getDateUtilsContentTS(): string {
  return `import {
  format,
  formatDistance,
  formatRelative,
  isToday,
  isYesterday,
  isTomorrow,
  parseISO,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Utilitaires de manipulation de dates avec date-fns
 * 
 * Documentation : https://date-fns.org
 * 
 * Ce fichier est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`ts
 * import { formatDate, formatRelativeDate, getTimeAgo } from './lib/utils/date'
 * 
 * const date = new Date()
 * formatDate(date) // "1 janvier 2026"
 * formatRelativeDate(date) // "aujourd'hui"
 * getTimeAgo(date) // "il y a 2 heures"
 * \`\`\`
 */

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string, formatStr = 'd MMMM yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: fr })
}

/**
 * Formate une date relative (aujourd'hui, hier, demain)
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(dateObj)) return "aujourd'hui"
  if (isYesterday(dateObj)) return 'hier'
  if (isTomorrow(dateObj)) return 'demain'
  
  return formatRelative(dateObj, new Date(), { locale: fr })
}

/**
 * Retourne le temps écoulé depuis une date
 */
export function getTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: fr })
}

/**
 * Calcule la différence en jours entre deux dates
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return differenceInDays(d2, d1)
}

/**
 * Calcule la différence en heures entre deux dates
 */
export function getHoursDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return differenceInHours(d2, d1)
}

/**
 * Calcule la différence en minutes entre deux dates
 */
export function getMinutesDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return differenceInMinutes(d2, d1)
}
`
}

/**
 * Contenu des utilitaires de dates (JavaScript)
 */
function getDateUtilsContentJS(): string {
  return `import {
  format,
  formatDistance,
  formatRelative,
  isToday,
  isYesterday,
  isTomorrow,
  parseISO,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns'
import { fr } from 'date-fns/locale'

const logger = getModuleLogger()

/**
 * Utilitaires de manipulation de dates avec date-fns
 * 
 * Documentation : https://date-fns.org
 * 
 * Ce fichier est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */

/**
 * Formate une date en français
 */
export function formatDate(date, formatStr = 'd MMMM yyyy') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: fr })
}

/**
 * Formate une date relative (aujourd'hui, hier, demain)
 */
export function formatRelativeDate(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(dateObj)) return "aujourd'hui"
  if (isYesterday(dateObj)) return 'hier'
  if (isTomorrow(dateObj)) return 'demain'
  
  return formatRelative(dateObj, new Date(), { locale: fr })
}

/**
 * Retourne le temps écoulé depuis une date
 */
export function getTimeAgo(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: fr })
}

/**
 * Calcule la différence en jours entre deux dates
 */
export function getDaysDifference(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return differenceInDays(d2, d1)
}

/**
 * Calcule la différence en heures entre deux dates
 */
export function getHoursDifference(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return differenceInHours(d2, d1)
}

/**
 * Calcule la différence en minutes entre deux dates
 */
export function getMinutesDifference(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return differenceInMinutes(d2, d1)
}
`
}
