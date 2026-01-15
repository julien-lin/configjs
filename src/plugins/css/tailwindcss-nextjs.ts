import { join } from 'path'
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
import {
  checkPathExists,
  readFileContent,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin TailwindCSS pour Next.js
 *
 * Framework CSS utilitaire pour Next.js
 * Documentation officielle : https://tailwindcss.com/docs/guides/nextjs
 *
 * @example
 * ```typescript
 * import { tailwindcssNextjsPlugin } from './plugins/css/tailwindcss-nextjs'
 * await tailwindcssNextjsPlugin.install(ctx)
 * await tailwindcssNextjsPlugin.configure(ctx)
 * ```
 */
export const tailwindcssNextjsPlugin: Plugin = {
  name: 'tailwindcss-nextjs',
  displayName: 'TailwindCSS (Next.js)',
  description: 'Framework CSS utilitaire pour Next.js',
  category: Category.CSS,
  version: '^3.4.1',

  frameworks: ['nextjs'],

  /**
   * Détecte si TailwindCSS est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['tailwindcss'] !== undefined ||
      ctx.devDependencies['tailwindcss'] !== undefined ||
      ctx.dependencies['postcss'] !== undefined ||
      ctx.devDependencies['postcss'] !== undefined ||
      ctx.dependencies['autoprefixer'] !== undefined ||
      ctx.devDependencies['autoprefixer'] !== undefined
    )
  },

  /**
   * Installe TailwindCSS, PostCSS et Autoprefixer pour Next.js
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('TailwindCSS is already installed')
      return {
        packages: {},
        success: true,
        message: 'TailwindCSS already installed',
      }
    }

    const packages: string[] = ['tailwindcss', 'postcss', 'autoprefixer']

    try {
      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed TailwindCSS for Next.js')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install TailwindCSS:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install TailwindCSS: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure TailwindCSS dans le projet Next.js
   *
   * Crée/modifie :
   * - tailwind.config.js (ou .ts) : Configuration TailwindCSS
   * - postcss.config.js (ou .mjs) : Configuration PostCSS
   * - app/globals.css ou styles/globals.css : Import TailwindCSS
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const extension = ctx.typescript ? 'ts' : 'js'
    const postcssExtension = ctx.typescript ? 'js' : 'mjs'

    try {
      // 1. Créer/Mettre à jour tailwind.config.js
      const tailwindConfigPath = join(
        projectRoot,
        `tailwind.config.${extension}`
      )
      const tailwindConfigExists = await checkPathExists(
        tailwindConfigPath,
        ctx.fsAdapter
      )

      if (tailwindConfigExists) {
        const existingContent = await readFileContent(
          tailwindConfigPath,
          'utf-8',
          ctx.fsAdapter
        )
        // Vérifier si déjà configuré
        if (
          existingContent.includes('content:') &&
          existingContent.includes('theme:')
        ) {
          logger.info('TailwindCSS config already exists')
        } else {
          const tailwindConfig = getTailwindConfigContent(ctx, extension)
          await writer.writeFile(tailwindConfigPath, tailwindConfig, {
            backup: true,
          })
          files.push({
            type: 'modify',
            path: normalizePath(tailwindConfigPath),
            content: tailwindConfig,
            backup: true,
          })
        }
      } else {
        const tailwindConfig = getTailwindConfigContent(ctx, extension)
        await writer.createFile(tailwindConfigPath, tailwindConfig)
        files.push({
          type: 'create',
          path: normalizePath(tailwindConfigPath),
          content: tailwindConfig,
          backup: false,
        })
        logger.info(`Created tailwind.config.${extension}`)
      }

      // 2. Créer/Mettre à jour postcss.config.js
      const postcssConfigPath = join(
        projectRoot,
        `postcss.config.${postcssExtension}`
      )
      const postcssConfigExists = await checkPathExists(
        postcssConfigPath,
        ctx.fsAdapter
      )

      if (!postcssConfigExists) {
        const postcssConfig = getPostcssConfigContent(postcssExtension)
        await writer.createFile(postcssConfigPath, postcssConfig)
        files.push({
          type: 'create',
          path: normalizePath(postcssConfigPath),
          content: postcssConfig,
          backup: false,
        })
        logger.info(`Created postcss.config.${postcssExtension}`)
      }

      // 3. Modifier le fichier CSS global
      // Next.js utilise app/globals.css (App Router) ou styles/globals.css (Pages Router)
      const cssFiles = [
        join(projectRoot, 'app', 'globals.css'),
        join(projectRoot, ctx.srcDir, 'app', 'globals.css'),
        join(projectRoot, 'styles', 'globals.css'),
        join(projectRoot, ctx.srcDir, 'styles', 'globals.css'),
      ]

      let cssFileModified = false
      for (const cssPath of cssFiles) {
        const cssExists = await checkPathExists(cssPath, ctx.fsAdapter)
        if (cssExists) {
          const cssContent = await readFileContent(
            cssPath,
            'utf-8',
            ctx.fsAdapter
          )
          const modifiedCss = injectTailwindDirectives(cssContent)

          await writer.writeFile(cssPath, modifiedCss, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(cssPath),
            content: modifiedCss,
            backup: true,
          })

          logger.info(`Updated ${cssPath} with TailwindCSS directives`)
          cssFileModified = true
          break
        }
      }

      // Si aucun fichier CSS n'existe, créer app/globals.css
      if (!cssFileModified) {
        const cssPath = join(projectRoot, 'app', 'globals.css')
        const cssContent = getCssContent()

        await writer.createFile(cssPath, cssContent)
        files.push({
          type: 'create',
          path: normalizePath(cssPath),
          content: cssContent,
          backup: false,
        })

        logger.info(`Created ${cssPath} with TailwindCSS directives`)
      }

      return {
        files,
        success: true,
        message: 'TailwindCSS configured successfully for Next.js',
      }
    } catch (error) {
      logger.error('Failed to configure TailwindCSS:', error)
      return {
        files,
        success: false,
        message: `Failed to configure TailwindCSS: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration TailwindCSS
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('TailwindCSS configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback TailwindCSS configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier tailwind.config.js/ts pour Next.js
 */
function getTailwindConfigContent(
  ctx: ProjectContext,
  extension: string
): string {
  const isTS = extension === 'ts'
  const contentPaths = [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ]

  if (ctx.srcDir && ctx.srcDir !== 'src') {
    contentPaths.unshift(`./${ctx.srcDir}/**/*.{js,ts,jsx,tsx,mdx}`)
  }

  const contentArray = contentPaths.map((path) => `    "${path}"`).join(',\n')

  if (isTS) {
    return `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
${contentArray},
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
`
  }

  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
${contentArray},
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`
}

/**
 * Contenu du fichier postcss.config.js/mjs
 */
function getPostcssConfigContent(extension: string): string {
  if (extension === 'mjs') {
    return `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
`
  }

  return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`
}

/**
 * Contenu du fichier CSS avec les directives TailwindCSS
 */
function getCssContent(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`
}

/**
 * Injecte les directives TailwindCSS dans le fichier CSS
 */
function injectTailwindDirectives(content: string): string {
  // Vérifier si les directives sont déjà présentes
  if (
    content.includes('@tailwind base') ||
    content.includes('@tailwind components') ||
    content.includes('@tailwind utilities')
  ) {
    logger.warn('TailwindCSS directives already present in CSS file')
    return content
  }

  // Ajouter les directives au début du fichier
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

${content}`
}
