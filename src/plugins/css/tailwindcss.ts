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
import { checkPathExists, readFileContent } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin TailwindCSS v4
 *
 * Framework CSS utilitaire
 * Documentation officielle : https://tailwindcss.com/docs/installation/using-vite
 *
 * @example
 * ```typescript
 * import { tailwindcssPlugin } from './plugins/css/tailwindcss'
 * await tailwindcssPlugin.install(ctx)
 * await tailwindcssPlugin.configure(ctx)
 * ```
 */
export const tailwindcssPlugin: Plugin = {
  name: 'tailwindcss',
  displayName: 'TailwindCSS',
  description: 'Framework CSS utilitaire',
  category: Category.CSS,
  version: '^4.1.18',

  frameworks: ['react', 'vue', 'svelte'],

  /**
   * Détecte si TailwindCSS est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['tailwindcss'] !== undefined ||
      ctx.devDependencies['tailwindcss'] !== undefined ||
      ctx.dependencies['@tailwindcss/vite'] !== undefined ||
      ctx.devDependencies['@tailwindcss/vite'] !== undefined
    )
  },

  /**
   * Installe TailwindCSS et @tailwindcss/vite
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

    const packages: string[] = ['tailwindcss', '@tailwindcss/vite']

    try {
      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed TailwindCSS')

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
   * Configure TailwindCSS dans le projet
   *
   * Modifie :
   * - vite.config.ts (ou .js) : Ajoute le plugin @tailwindcss/vite
   * - src/index.css (ou main.css) : Ajoute @import "tailwindcss";
   *
   * Documentation : https://tailwindcss.com/docs/installation/using-vite
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const srcDir = resolve(projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Modifier vite.config.ts pour ajouter le plugin
      const viteConfigPath = join(projectRoot, `vite.config.${extension}`)
      const viteConfigExists = await checkPathExists(viteConfigPath)

      if (viteConfigExists) {
        const viteConfigContent = await readFileContent(viteConfigPath)
        const modifiedViteConfig = injectVitePlugin(
          viteConfigContent,
          ctx.typescript
        )

        await writer.writeFile(viteConfigPath, modifiedViteConfig, {
          backup: true,
        })
        files.push({
          type: 'modify',
          path: viteConfigPath,
          content: modifiedViteConfig,
          backup: true,
        })

        logger.info(`Updated vite.config.${extension} with TailwindCSS plugin`)
      } else {
        // Créer vite.config.ts si il n'existe pas
        const viteConfigContent = ctx.typescript
          ? getViteConfigContentTS()
          : getViteConfigContentJS()

        await writer.createFile(viteConfigPath, viteConfigContent)
        files.push({
          type: 'create',
          path: viteConfigPath,
          content: viteConfigContent,
          backup: false,
        })

        logger.info(`Created vite.config.${extension} with TailwindCSS plugin`)
      }

      // 2. Modifier le fichier CSS principal pour ajouter @import "tailwindcss";
      const cssFiles = [
        join(srcDir, 'index.css'),
        join(srcDir, 'main.css'),
        join(srcDir, 'app.css'),
        join(srcDir, 'styles.css'),
      ]

      let cssFileModified = false
      for (const cssPath of cssFiles) {
        const cssExists = await checkPathExists(cssPath)
        if (cssExists) {
          const cssContent = await readFileContent(cssPath)
          const modifiedCss = injectTailwindImport(cssContent)

          await writer.writeFile(cssPath, modifiedCss, { backup: true })
          files.push({
            type: 'modify',
            path: cssPath,
            content: modifiedCss,
            backup: true,
          })

          logger.info(`Updated ${cssPath} with TailwindCSS import`)
          cssFileModified = true
          break
        }
      }

      // Si aucun fichier CSS n'existe, créer index.css
      if (!cssFileModified) {
        const cssPath = join(srcDir, 'index.css')
        const cssContent = getCssContent()

        await writer.createFile(cssPath, cssContent)
        files.push({
          type: 'create',
          path: cssPath,
          content: cssContent,
          backup: false,
        })

        logger.info(`Created ${cssPath} with TailwindCSS import`)
      }

      return {
        files,
        success: true,
        message: 'TailwindCSS configured successfully',
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
    const backupManager = new BackupManager()
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
 * Contenu du fichier vite.config.ts avec TailwindCSS
 */
function getViteConfigContentTS(): string {
  return `import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
`
}

/**
 * Contenu du fichier vite.config.js avec TailwindCSS
 */
function getViteConfigContentJS(): string {
  return `import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
`
}

/**
 * Contenu du fichier CSS avec TailwindCSS
 */
function getCssContent(): string {
  return `@import "tailwindcss";
`
}

/**
 * Injecte le plugin TailwindCSS dans vite.config.ts/js
 */
function injectVitePlugin(content: string, isTypeScript: boolean): string {
  // Vérifier si le plugin est déjà présent
  if (
    content.includes('@tailwindcss/vite') ||
    content.includes('tailwindcss()')
  ) {
    logger.warn('TailwindCSS plugin already present in vite.config')
    return content
  }

  let modifiedContent = content

  // Vérifier si @tailwindcss/vite est déjà importé
  const hasTailwindImport =
    content.includes("from '@tailwindcss/vite'") ||
    content.includes('from "@tailwindcss/vite"')

  // Ajouter l'import si nécessaire
  if (!hasTailwindImport) {
    const importStatement = isTypeScript
      ? "import tailwindcss from '@tailwindcss/vite'\n"
      : "import tailwindcss from '@tailwindcss/vite'\n"

    // Trouver la dernière ligne d'import
    const lines = modifiedContent.split('\n')
    let lastImportIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.startsWith('import ')) {
        lastImportIndex = i
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement.trim())
      modifiedContent = lines.join('\n')
    } else {
      // Si pas d'import, ajouter au début
      modifiedContent = importStatement + modifiedContent
    }
  }

  // Ajouter le plugin dans la configuration
  // Chercher defineConfig({ ... plugins: [...] })
  const pluginsRegex = /plugins:\s*\[([\s\S]*?)\]/m

  if (pluginsRegex.test(modifiedContent)) {
    // Plugin array existe déjà
    modifiedContent = modifiedContent.replace(
      pluginsRegex,
      (match: string, pluginsContent: string) => {
        // Vérifier si tailwindcss() est déjà dans le tableau
        if (pluginsContent.includes('tailwindcss()')) {
          return match
        }

        // Ajouter tailwindcss() au début du tableau
        const trimmedContent = pluginsContent.trim()
        if (trimmedContent.length === 0) {
          return 'plugins: [\n    tailwindcss(),\n  ]'
        }
        return `plugins: [\n    tailwindcss(),${trimmedContent ? `\n    ${trimmedContent}` : ''}\n  ]`
      }
    )
  } else {
    // Pas de plugins array, l'ajouter
    const defineConfigRegex = /defineConfig\(\s*\{([\s\S]*?)\}\s*\)/m

    if (defineConfigRegex.test(modifiedContent)) {
      modifiedContent = modifiedContent.replace(
        defineConfigRegex,
        (_match: string, configContent: string) => {
          // Ajouter plugins avant la fermeture de l'objet
          const trimmed = configContent.trim()
          const hasTrailingComma = trimmed.endsWith(',')
          return `defineConfig({\n  plugins: [\n    tailwindcss(),\n  ],${hasTrailingComma ? '' : '\n'}}`
        }
      )
    } else {
      // Si on ne trouve pas defineConfig, ajouter à la fin
      modifiedContent += '\n\nplugins: [\n  tailwindcss(),\n]'
    }
  }

  return modifiedContent
}

/**
 * Injecte @import "tailwindcss"; dans le fichier CSS
 */
function injectTailwindImport(content: string): string {
  // Vérifier si l'import est déjà présent
  if (
    content.includes('@import "tailwindcss"') ||
    content.includes("@import 'tailwindcss'")
  ) {
    logger.warn('TailwindCSS import already present in CSS file')
    return content
  }

  // Ajouter l'import au début du fichier
  return `@import "tailwindcss";

${content}`
}
