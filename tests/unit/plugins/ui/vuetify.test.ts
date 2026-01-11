import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { vuetifyPlugin } from '../../../../src/plugins/ui/vuetify.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('Vuetify Plugin', () => {
  let mockContext: ProjectContext

  beforeEach(() => {
    vi.clearAllMocks()

    mockContext = {
      framework: 'vue',
      frameworkVersion: '3.4.0',
      bundler: 'vite',
      bundlerVersion: '5.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/project',
      srcDir: 'src',
      publicDir: 'public',
      os: 'darwin',
      nodeVersion: '20.0.0',
      hasGit: false,
      vueVersion: '3',
      vueApi: 'composition',
      dependencies: {},
      devDependencies: {},
    } as ProjectContext

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(fsHelpers.ensureDirectory).mockResolvedValue(undefined)
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue('')

    vi.spyOn(ConfigWriter.prototype, 'createFile').mockResolvedValue(undefined)
    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(BackupManager.prototype, 'restoreAll').mockResolvedValue(undefined)
  })

  describe('plugin metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(vuetifyPlugin.name).toBe('vuetify')
      expect(vuetifyPlugin.displayName).toBe('Vuetify')
      expect(vuetifyPlugin.category).toBe('ui')
      expect(vuetifyPlugin.frameworks).toEqual(['vue'])
    })

    it('should be compatible only with Vue', () => {
      expect(vuetifyPlugin.frameworks).toEqual(['vue'])
    })
  })

  describe('detect', () => {
    it('should detect when vuetify is in dependencies', () => {
      const ctx = {
        ...mockContext,
        dependencies: { vuetify: '^3.0.0' },
      }

      const result = vuetifyPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should detect when vuetify is in devDependencies', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { vuetify: '^3.0.0' },
      }

      const result = vuetifyPlugin.detect?.(ctx)
      expect(result).toBe(true)
    })

    it('should return false when vuetify is not installed', () => {
      const result = vuetifyPlugin.detect?.(mockContext)
      expect(result).toBe(false)
    })
  })

  describe('install', () => {
    it('should install vuetify and dependencies', async () => {
      const result = await vuetifyPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.dependencies).toContain('vuetify')
      expect(result.packages.dependencies).toContain('@mdi/font')
      expect(result.packages.dependencies).toContain('vite-plugin-vuetify')
    })

    it('should skip installation if already installed', async () => {
      const ctx = {
        ...mockContext,
        dependencies: { vuetify: '^3.0.0' },
      }

      const result = await vuetifyPlugin.install(ctx)

      expect(result.success).toBe(true)
      expect(result.message).toContain('already installed')
    })

    it('should fail if not Vue 3', async () => {
      const ctx = {
        ...mockContext,
        vueVersion: '2' as unknown as '3',
      }

      const result = await vuetifyPlugin.install(ctx)

      expect(result.success).toBe(false)
      expect(result.message).toContain('requires Vue 3')
    })

    it('should install TypeScript types for TypeScript projects', async () => {
      const result = await vuetifyPlugin.install(mockContext)

      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain('@types/node')
    })
  })

  describe('configure', () => {
    it('should create Vuetify config file', async () => {
      const result = await vuetifyPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)

      const configFile = result.files.find((f) =>
        f.path?.includes('plugins/vuetify.ts')
      )
      expect(configFile).toBeDefined()
      expect(configFile?.type).toBe('create')
    })

    it('should create example Vuetify component', async () => {
      const result = await vuetifyPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const componentFile = result.files.find((f) =>
        f.path?.includes('HelloVuetify.vue')
      )
      expect(componentFile).toBeDefined()
      expect(componentFile?.content).toContain('v-card')
      expect(componentFile?.content).toContain('v-btn')
    })

    it('should update main.ts to import Vuetify', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
      vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
        `import { createApp } from 'vue'\nimport App from './App.vue'\n\ncreateApp(App).mount('#app')`
      )

      const result = await vuetifyPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const mainFile = result.files.find(
        (f) => f.type === 'modify' && f.path?.includes('main.ts')
      )
      expect(mainFile).toBeDefined()
    })

    it('should update vite.config.ts to include Vuetify plugin', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.includes('vite.config')) {
          return true
        }
        return false
      })
      vi.mocked(fsHelpers.readFileContent).mockImplementation(async (path) => {
        if (typeof path === 'string' && path.includes('vite.config')) {
          return `import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\n\nexport default defineConfig({\n  plugins: [vue()],\n})`
        }
        return ''
      })

      const result = await vuetifyPlugin.configure(mockContext)

      expect(result.success).toBe(true)
      const viteConfigFile = result.files.find(
        (f) => f.type === 'modify' && f.path?.includes('vite.config')
      )
      expect(viteConfigFile).toBeDefined()
    })

    it('should create JavaScript config for JavaScript projects', async () => {
      const ctx = {
        ...mockContext,
        typescript: false,
      }

      const result = await vuetifyPlugin.configure(ctx)

      expect(result.success).toBe(true)
      const configFile = result.files.find((f) =>
        f.path?.includes('plugins/vuetify.js')
      )
      expect(configFile).toBeDefined()
    })
  })

  describe('rollback', () => {
    it('should restore all backups', async () => {
      const restoreAllSpy = vi
        .spyOn(BackupManager.prototype, 'restoreAll')
        .mockResolvedValue(undefined)

      await vuetifyPlugin.rollback?.(mockContext)

      expect(restoreAllSpy).toHaveBeenCalled()
    })
  })
})
