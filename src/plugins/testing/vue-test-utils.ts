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
import { ensureDirectory, normalizePath } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Vue Test Utils
 *
 * Utilitaires de test officiels pour Vue.js
 * Documentation officielle : https://test-utils.vuejs.org
 *
 * @example
 * ```typescript
 * import { vueTestUtilsPlugin } from './plugins/testing/vue-test-utils'
 * await vueTestUtilsPlugin.install(ctx)
 * await vueTestUtilsPlugin.configure(ctx)
 * ```
 */
export const vueTestUtilsPlugin: Plugin = {
  name: '@vue/test-utils',
  displayName: 'Vue Test Utils',
  description: 'Utilitaires de test officiels pour Vue.js',
  category: Category.TESTING,
  version: '^2.4.0',

  frameworks: ['vue'],

  /**
   * Détecte si Vue Test Utils est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['@vue/test-utils'] !== undefined ||
      ctx.devDependencies['@vue/test-utils'] !== undefined
    )
  },

  /**
   * Installe Vue Test Utils avec Vitest
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Vue Test Utils is already installed')
      return {
        packages: {},
        success: true,
        message: 'Vue Test Utils already installed',
      }
    }

    const packages: string[] = [
      '@vue/test-utils',
      'vitest',
      '@vitest/ui',
      'jsdom',
    ]

    // Ajouter happy-dom comme alternative à jsdom
    if (!ctx.devDependencies['jsdom'] && !ctx.devDependencies['happy-dom']) {
      packages.push('happy-dom')
    }

    try {
      await installPackages(packages, {
        dev: true,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Vue Test Utils')

      return {
        packages: {
          devDependencies: packages,
        },
        success: true,
        message: `Installed ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Vue Test Utils:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Vue Test Utils: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Vue Test Utils dans le projet
   *
   * Crée :
   * - vitest.config.ts (ou .js) : Configuration Vitest
   * - src/components/__tests__/Example.spec.ts : Exemple de test
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const extension = ctx.typescript ? 'ts' : 'js'

    try {
      // 1. Créer vitest.config.ts (ou .js)
      const vitestConfigPath = join(
        ctx.projectRoot,
        `vitest.config.${extension}`
      )
      const vitestConfigContent = getVitestConfig(ctx.typescript)

      await writer.createFile(vitestConfigPath, vitestConfigContent)
      files.push({
        type: 'create',
        path: normalizePath(vitestConfigPath),
        content: vitestConfigContent,
        backup: false,
      })

      logger.info(`Created Vitest config: ${vitestConfigPath}`)

      // 2. Créer dossier __tests__
      const testsDir = join(
        ctx.projectRoot,
        ctx.srcDir,
        'components',
        '__tests__'
      )
      await ensureDirectory(testsDir, ctx.fsAdapter)

      // 3. Créer exemple de test
      const testFilePath = join(testsDir, `Example.spec.${extension}`)
      const testContent = getExampleTest(ctx.typescript, ctx.vueApi)

      await writer.createFile(testFilePath, testContent)
      files.push({
        type: 'create',
        path: normalizePath(testFilePath),
        content: testContent,
        backup: false,
      })

      logger.info(`Created example test: ${testFilePath}`)

      // 4. Ajouter scripts de test au package.json
      const packageJsonPath = join(ctx.projectRoot, 'package.json')
      await writer.modifyPackageJson(packageJsonPath, (pkg) => {
        pkg.scripts = pkg.scripts || {}
        pkg.scripts['test'] = 'vitest'
        pkg.scripts['test:ui'] = 'vitest --ui'
        pkg.scripts['test:coverage'] = 'vitest --coverage'
        return pkg
      })

      files.push({
        type: 'modify',
        path: normalizePath(packageJsonPath),
        backup: true,
      })

      logger.info('Updated package.json with test scripts')

      return {
        files,
        success: true,
        message: 'Vue Test Utils configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Vue Test Utils:', error)
      return {
        files,
        success: false,
        message: `Failed to configure Vue Test Utils: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Vue Test Utils
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    await backupManager.restoreAll()
    logger.info('Vue Test Utils configuration rolled back')
  },
}

/**
 * Génère la configuration Vitest
 */
function getVitestConfig(typescript: boolean): string {
  if (typescript) {
    return `import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
`
  }

  return `import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
`
}

/**
 * Génère un exemple de test
 */
function getExampleTest(typescript: boolean, vueApi?: string): string {
  if (vueApi === 'composition') {
    if (typescript) {
      return `import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { defineComponent } from 'vue'

const HelloWorld = defineComponent({
  setup() {
    const count = ref(0)
    const increment = () => {
      count.value++
    }

    return { count, increment }
  },
  template: \`
    <div>
      <h1>Count: {{ count }}</h1>
      <button @click="increment">Increment</button>
    </div>
  \`,
})

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(HelloWorld)
    expect(wrapper.text()).toContain('Count: 0')
  })

  it('increments count when button is clicked', async () => {
    const wrapper = mount(HelloWorld)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Count: 1')
  })
})
`
    }

    return `import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { defineComponent } from 'vue'

const HelloWorld = defineComponent({
  setup() {
    const count = ref(0)
    const increment = () => {
      count.value++
    }

    return { count, increment }
  },
  template: \`
    <div>
      <h1>Count: {{ count }}</h1>
      <button @click="increment">Increment</button>
    </div>
  \`,
})

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(HelloWorld)
    expect(wrapper.text()).toContain('Count: 0')
  })

  it('increments count when button is clicked', async () => {
    const wrapper = mount(HelloWorld)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Count: 1')
  })
})
`
  }

  // Options API
  if (typescript) {
    return `import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

const HelloWorld = {
  data() {
    return {
      count: 0,
    }
  },
  methods: {
    increment() {
      this.count++
    },
  },
  template: \`
    <div>
      <h1>Count: {{ count }}</h1>
      <button @click="increment">Increment</button>
    </div>
  \`,
}

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(HelloWorld)
    expect(wrapper.text()).toContain('Count: 0')
  })

  it('increments count when button is clicked', async () => {
    const wrapper = mount(HelloWorld)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Count: 1')
  })
})
`
  }

  return `import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

const HelloWorld = {
  data() {
    return {
      count: 0,
    }
  },
  methods: {
    increment() {
      this.count++
    },
  },
  template: \`
    <div>
      <h1>Count: {{ count }}</h1>
      <button @click="increment">Increment</button>
    </div>
  \`,
}

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(HelloWorld)
    expect(wrapper.text()).toContain('Count: 0')
  })

  it('increments count when button is clicked', async () => {
    const wrapper = mount(HelloWorld)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Count: 1')
  })
})
`
}
