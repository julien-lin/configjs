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
    ensureDirectory,
    normalizePath,
    readFileContent,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Vuetify
 *
 * Framework UI Material Design pour Vue.js 3
 * Documentation officielle : https://vuetifyjs.com
 *
 * @example
 * ```typescript
 * import { vuetifyPlugin } from './plugins/ui/vuetify'
 * await vuetifyPlugin.install(ctx)
 * await vuetifyPlugin.configure(ctx)
 * ```
 */
export const vuetifyPlugin: Plugin = {
    name: 'vuetify',
    displayName: 'Vuetify',
    description: 'Framework UI Material Design pour Vue.js 3',
    category: Category.UI,
    version: '^3.5.0',

    frameworks: ['vue'],

    /**
     * Détecte si Vuetify est déjà installé
     */
    detect: (ctx: ProjectContext): boolean => {
        return (
            ctx.dependencies['vuetify'] !== undefined ||
            ctx.devDependencies['vuetify'] !== undefined
        )
    },

    /**
     * Installe Vuetify avec ses dépendances
     */
    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('Vuetify is already installed')
            return {
                packages: {},
                success: true,
                message: 'Vuetify already installed',
            }
        }

        // Vérifier que c'est bien Vue 3
        if (ctx.vueVersion !== '3') {
            return {
                packages: {},
                success: false,
                message:
                    'Vuetify 3 requires Vue 3. Current version is Vue ' + ctx.vueVersion,
            }
        }

        const packages: string[] = [
            'vuetify',
            '@mdi/font', // Material Design Icons
            'vite-plugin-vuetify',
        ]

        // Installer les packages Vuetify
        const devPackages: string[] = []

        // Ajouter types si TypeScript
        if (ctx.typescript) {
            devPackages.push('@types/node')
        }

        try {
            // Installer les packages principaux
            await installPackages(packages, {
                dev: false,
                packageManager: ctx.packageManager,
                projectRoot: ctx.projectRoot,
                exact: false,
                silent: false,
            })

            // Installer les packages de dev si nécessaire
            if (devPackages.length > 0) {
                await installPackages(devPackages, {
                    dev: true,
                    packageManager: ctx.packageManager,
                    projectRoot: ctx.projectRoot,
                    exact: false,
                    silent: false,
                })
            }

            logger.info('Successfully installed Vuetify')

            return {
                packages: {
                    dependencies: packages,
                    devDependencies: devPackages,
                },
                success: true,
                message: `Installed ${packages.concat(devPackages).join(', ')}`,
            }
        } catch (error) {
            logger.error('Failed to install Vuetify:', error)
            return {
                packages: {},
                success: false,
                message: `Failed to install Vuetify: ${error instanceof Error ? error.message : String(error)}`,
            }
        }
    },

    /**
     * Configure Vuetify dans le projet
     *
     * Crée :
     * - src/plugins/vuetify.ts (ou .js) : Configuration Vuetify
     * - src/components/HelloVuetify.vue : Exemple de composant
     * - Met à jour main.ts (ou .js) pour importer Vuetify
     * - Met à jour vite.config.ts (ou .js) pour ajouter le plugin Vuetify
     */
    async configure(ctx: ProjectContext): Promise<ConfigResult> {
        const backupManager = new BackupManager()
        const writer = new ConfigWriter(backupManager)

        const files: ConfigResult['files'] = []
        const extension = ctx.typescript ? 'ts' : 'js'

        try {
            // 1. Créer dossier plugins si nécessaire
            const pluginsDir = join(ctx.projectRoot, ctx.srcDir, 'plugins')
            await ensureDirectory(pluginsDir)

            // 2. Créer fichier de configuration Vuetify
            const vuetifyConfigPath = join(pluginsDir, `vuetify.${extension}`)
            const vuetifyConfigContent = getVuetifyConfig(ctx.typescript)

            await writer.createFile(vuetifyConfigPath, vuetifyConfigContent)
            files.push({
                type: 'create',
                path: normalizePath(vuetifyConfigPath),
                content: vuetifyConfigContent,
                backup: false,
            })

            logger.info(`Created Vuetify config: ${vuetifyConfigPath}`)

            // 3. Créer composant exemple
            const componentsDir = join(ctx.projectRoot, ctx.srcDir, 'components')
            await ensureDirectory(componentsDir)

            const componentPath = join(componentsDir, 'HelloVuetify.vue')
            const componentContent = getExampleComponent()

            await writer.createFile(componentPath, componentContent)
            files.push({
                type: 'create',
                path: normalizePath(componentPath),
                content: componentContent,
                backup: false,
            })

            logger.info(`Created example component: ${componentPath}`)

            // 4. Mettre à jour main.ts (ou .js)
            const mainPath = join(ctx.projectRoot, ctx.srcDir, `main.${extension}`)
            const mainExists = await checkPathExists(mainPath)

            if (mainExists) {
                const mainContent = await readFileContent(mainPath)
                const updatedMainContent = updateMainFile(mainContent, extension)

                await writer.writeFile(mainPath, updatedMainContent, { backup: true })
                files.push({
                    type: 'modify',
                    path: normalizePath(mainPath),
                    backup: true,
                })

                logger.info(`Updated ${mainPath} to import Vuetify`)
            }

            // 5. Mettre à jour vite.config.ts (ou .js)
            const viteConfigPath = join(ctx.projectRoot, `vite.config.${extension}`)
            const viteConfigExists = await checkPathExists(viteConfigPath)

            if (viteConfigExists) {
                const viteContent = await readFileContent(viteConfigPath)
                const updatedViteContent = updateViteConfig(viteContent)

                await writer.writeFile(viteConfigPath, updatedViteContent, {
                    backup: true,
                })
                files.push({
                    type: 'modify',
                    path: normalizePath(viteConfigPath),
                    backup: true,
                })

                logger.info(`Updated ${viteConfigPath} to include Vuetify plugin`)
            }

            return {
                files,
                success: true,
                message: 'Vuetify configured successfully',
            }
        } catch (error) {
            logger.error('Failed to configure Vuetify:', error)
            return {
                files,
                success: false,
                message: `Failed to configure Vuetify: ${error instanceof Error ? error.message : String(error)}`,
            }
        }
    },

    /**
     * Rollback de la configuration Vuetify
     */
    async rollback(_ctx: ProjectContext): Promise<void> {
        const backupManager = new BackupManager()
        await backupManager.restoreAll()
        logger.info('Vuetify configuration rolled back')
    },
}

/**
 * Génère le fichier de configuration Vuetify
 */
function getVuetifyConfig(typescript: boolean): string {
    if (typescript) {
        return `import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1867c0',
          secondary: '#5CBBF6',
        },
      },
    },
  },
})
`
    }

    return `import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1867c0',
          secondary: '#5CBBF6',
        },
      },
    },
  },
})
`
}

/**
 * Génère un exemple de composant Vuetify
 */
function getExampleComponent(): string {
    return `<template>
  <v-container>
    <v-row>
      <v-col cols="12" class="text-center">
        <v-card class="mx-auto" max-width="500" elevation="4">
          <v-card-title class="text-h4 primary white--text">
            <v-icon left dark>mdi-vuetify</v-icon>
            Welcome to Vuetify
          </v-card-title>

          <v-card-text class="pa-6">
            <p class="text-h6 mb-4">
              Material Design Component Framework for Vue.js
            </p>

            <v-chip
              color="primary"
              label
              class="ma-1"
            >
              <v-icon left>mdi-check</v-icon>
              80+ Components
            </v-chip>

            <v-chip
              color="secondary"
              label
              class="ma-1"
            >
              <v-icon left>mdi-check</v-icon>
              Responsive
            </v-chip>

            <v-chip
              color="success"
              label
              class="ma-1"
            >
              <v-icon left>mdi-check</v-icon>
              Customizable
            </v-chip>
          </v-card-text>

          <v-card-actions>
            <v-btn
              color="primary"
              variant="elevated"
              href="https://vuetifyjs.com"
              target="_blank"
              block
            >
              <v-icon left>mdi-book-open-variant</v-icon>
              View Documentation
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// Votre logique ici
</script>

<style scoped>
.v-card-title {
  justify-content: center;
}
</style>
`
}

/**
 * Met à jour le fichier main.ts pour importer Vuetify
 */
function updateMainFile(content: string, extension: string): string {
    // Vérifier si Vuetify est déjà importé
    if (content.includes('vuetify') || content.includes('createVuetify')) {
        return content
    }

    // Ajouter l'import Vuetify
    const importStatement = `import vuetify from './plugins/vuetify${extension === 'ts' ? '' : '.js'}'\n`

    // Trouver la ligne createApp
    const createAppMatch = content.match(/(createApp\([^)]+\))/)
    if (createAppMatch && createAppMatch[1]) {
        const createAppCall = createAppMatch[1]
        const updatedCreateApp = createAppCall + '\n  .use(vuetify)'

        // Remplacer createApp(...) par createApp(...).use(vuetify)
        let updatedContent = content.replace(createAppCall, updatedCreateApp)

        // Ajouter l'import au début
        const firstImportIndex = updatedContent.indexOf('import')
        if (firstImportIndex !== -1) {
            updatedContent =
                updatedContent.slice(0, firstImportIndex) +
                importStatement +
                updatedContent.slice(firstImportIndex)
        } else {
            updatedContent = importStatement + updatedContent
        }

        return updatedContent
    }

    return content
}

/**
 * Met à jour vite.config.ts pour ajouter le plugin Vuetify
 */
function updateViteConfig(content: string): string {
    // Vérifier si le plugin est déjà importé
    if (content.includes('vite-plugin-vuetify')) {
        return content
    }

    // Ajouter l'import du plugin
    const importStatement = `import vuetify from 'vite-plugin-vuetify'\n`

    // Ajouter l'import après les autres imports
    const lastImportMatch = content.match(/import[^;]+;/g)
    if (lastImportMatch && lastImportMatch.length > 0) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1]
        if (lastImport) {
            content = content.replace(lastImport, lastImport + '\n' + importStatement)
        }
    } else {
        // Ajouter au début si aucun import
        content = importStatement + content
    }

    // Ajouter le plugin dans le tableau plugins
    const pluginsMatch = content.match(/plugins:\s*\[([^\]]*)\]/)
    if (pluginsMatch) {
        const pluginsContent = pluginsMatch[1]
        if (pluginsContent !== undefined) {
            const updatedPlugins = pluginsContent.trim()
                ? pluginsContent + ',\n    vuetify({ autoImport: true })'
                : '\n    vuetify({ autoImport: true })\n  '

            content = content.replace(
                /plugins:\s*\[([^\]]*)\]/,
                `plugins: [${updatedPlugins}]`
            )
        }
    }

    return content
}
