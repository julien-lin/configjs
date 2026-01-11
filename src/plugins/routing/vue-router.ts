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
import {
  checkPathExists,
  ensureDirectory,
  readFileContent,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Vue Router v4
 *
 * Router officiel pour Vue.js 3
 * Documentation officielle : https://router.vuejs.org
 *
 * @example
 * ```typescript
 * import { vueRouterPlugin } from './plugins/routing/vue-router'
 * await vueRouterPlugin.install(ctx)
 * await vueRouterPlugin.configure(ctx)
 * ```
 */
export const vueRouterPlugin: Plugin = {
  name: 'vue-router',
  displayName: 'Vue Router',
  description: 'Router officiel pour Vue.js',
  category: Category.ROUTING,
  version: '^4.4.0',

  frameworks: ['vue'],

  /**
   * Détecte si Vue Router est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return ctx.dependencies['vue-router'] !== undefined
  },

  /**
   * Installe Vue Router
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Vue Router is already installed')
      return {
        packages: {},
        success: true,
        message: 'Vue Router already installed',
      }
    }

    const packages: string[] = ['vue-router@4']

    try {
      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Vue Router v4')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Vue Router:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Vue Router: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Vue Router dans le projet
   *
   * Crée :
   * - src/router/index.ts (ou .js) : Configuration du router
   * - src/views/HomeView.vue : Vue exemple
   * - src/views/AboutView.vue : Vue exemple
   *
   * Modifie :
   * - src/main.ts (ou main.js) : Intègre le router
   * - src/App.vue : Ajoute router-view
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer le dossier router si nécessaire
      const routerDir = join(srcDir, 'router')
      await ensureDirectory(routerDir)

      // 2. Créer le dossier views si nécessaire
      const viewsDir = join(srcDir, 'views')
      await ensureDirectory(viewsDir)

      // 3. Créer src/router/index.ts (configuration du router)
      const routerIndexPath = join(routerDir, `index.${extension}`)
      const routerIndexContent = ctx.typescript
        ? getRouterIndexContentTS()
        : getRouterIndexContentJS()

      await writer.createFile(routerIndexPath, routerIndexContent)
      files.push({
        type: 'create',
        path: normalizePath(routerIndexPath),
        content: routerIndexContent,
        backup: false,
      })

      logger.info(`Created router configuration: ${routerIndexPath}`)

      // 4. Créer src/views/HomeView.vue
      const homeViewPath = join(viewsDir, 'HomeView.vue')
      const homeViewContent = getHomeViewContent()

      await writer.createFile(homeViewPath, homeViewContent)
      files.push({
        type: 'create',
        path: normalizePath(homeViewPath),
        content: homeViewContent,
        backup: false,
      })

      logger.info(`Created HomeView: ${homeViewPath}`)

      // 5. Créer src/views/AboutView.vue
      const aboutViewPath = join(viewsDir, 'AboutView.vue')
      const aboutViewContent = getAboutViewContent()

      await writer.createFile(aboutViewPath, aboutViewContent)
      files.push({
        type: 'create',
        path: normalizePath(aboutViewPath),
        content: aboutViewContent,
        backup: false,
      })

      logger.info(`Created AboutView: ${aboutViewPath}`)

      // 6. Modifier src/main.ts (ou main.js) pour intégrer le router
      const mainPath = join(srcDir, `main.${extension}`)
      if (await checkPathExists(mainPath)) {
        const mainContent = await readFileContent(mainPath)
        const updatedMainContent = updateMainFile(mainContent, ctx.typescript)

        if (updatedMainContent !== mainContent) {
          await writer.writeFile(mainPath, updatedMainContent, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(mainPath),
            content: updatedMainContent,
            backup: true,
          })

          logger.info(`Updated main file: ${mainPath}`)
        }
      } else {
        logger.warn(`Main file not found: ${mainPath}`)
      }

      // 7. Modifier src/App.vue pour ajouter router-view
      const appPath = join(srcDir, 'App.vue')
      if (await checkPathExists(appPath)) {
        const appContent = await readFileContent(appPath)
        const updatedAppContent = updateAppFile(appContent)

        if (updatedAppContent !== appContent) {
          await writer.writeFile(appPath, updatedAppContent, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(appPath),
            content: updatedAppContent,
            backup: true,
          })

          logger.info(`Updated App.vue: ${appPath}`)
        }
      } else {
        logger.warn(`App.vue not found: ${appPath}`)
      }

      return {
        files,
        success: true,
        message: 'Vue Router configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Vue Router:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Vue Router: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Vue Router
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    await backupManager.restoreAll()
    logger.info('Vue Router configuration rolled back')
  },
}

/**
 * Contenu du fichier router/index.ts (TypeScript)
 */
function getRouterIndexContentTS(): string {
  return `import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
`
}

/**
 * Contenu du fichier router/index.js (JavaScript)
 */
function getRouterIndexContentJS(): string {
  return `import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
`
}

/**
 * Contenu du fichier views/HomeView.vue
 */
function getHomeViewContent(): string {
  return `<template>
  <div class="home">
    <h1>Home</h1>
    <p>Welcome to your Vue.js application with Vue Router!</p>
  </div>
</template>

<script setup>
// Composition API
</script>

<style scoped>
.home {
  text-align: center;
  padding: 2rem;
}
</style>
`
}

/**
 * Contenu du fichier views/AboutView.vue
 */
function getAboutViewContent(): string {
  return `<template>
  <div class="about">
    <h1>About</h1>
    <p>This is the about page.</p>
  </div>
</template>

<script setup>
// Composition API
</script>

<style scoped>
.about {
  text-align: center;
  padding: 2rem;
}
</style>
`
}

/**
 * Met à jour le fichier main.ts ou main.js pour intégrer le router
 */
function updateMainFile(content: string, isTypeScript: boolean): string {
  // Vérifier si le router est déjà importé
  if (
    content.includes("from './router'") ||
    content.includes("from './router/index'")
  ) {
    return content
  }

  // Ajouter l'import du router
  const routerImport = isTypeScript
    ? "import router from './router'\n"
    : "import router from './router'\n"

  // Trouver la ligne avec createApp
  const createAppMatch = content.match(/createApp\([^)]+\)/)
  if (!createAppMatch) {
    logger.warn('Could not find createApp in main file')
    return content
  }

  // Ajouter l'import après les autres imports
  const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*\n)/g
  const imports = content.match(importRegex) || []
  const lastImportIndex = content.lastIndexOf(imports[imports.length - 1] || '')
  const afterImports =
    lastImportIndex >= 0
      ? lastImportIndex + (imports[imports.length - 1]?.length || 0)
      : 0

  // Insérer l'import du router
  const beforeImports = content.substring(0, afterImports)
  const afterImportsContent = content.substring(afterImports)

  // Ajouter app.use(router) avant app.mount
  let updatedContent = beforeImports + routerImport + afterImportsContent

  if (!updatedContent.includes('app.use(router)')) {
    updatedContent = updatedContent.replace(
      /(const\s+app\s*=\s*createApp\([^)]+\))/,
      `$1\napp.use(router)`
    )
  }

  return updatedContent
}

/**
 * Met à jour le fichier App.vue pour ajouter router-view
 */
function updateAppFile(content: string): string {
  // Vérifier si router-view est déjà présent
  if (content.includes('<router-view')) {
    return content
  }

  // Ajouter router-view dans le template
  if (content.includes('<template>')) {
    // Remplacer le contenu du template ou ajouter router-view
    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
    if (templateMatch && templateMatch[1]) {
      const templateContent = templateMatch[1]
      if (!templateContent.includes('<router-view')) {
        const updatedTemplate = `<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav>
    <router-view />
  </div>
</template>`
        return content.replace(
          /<template>[\s\S]*?<\/template>/,
          updatedTemplate
        )
      }
    } else {
      // Pas de template, en ajouter un
      const scriptMatch = content.match(/<script[\s\S]*?<\/script>/)
      const styleMatch = content.match(/<style[\s\S]*?<\/style>/)
      let newContent = `<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav>
    <router-view />
  </div>
</template>\n\n`
      if (scriptMatch) {
        newContent += scriptMatch[0] + '\n\n'
      }
      if (styleMatch) {
        newContent += styleMatch[0]
      }
      return newContent
    }
  }

  return content
}
