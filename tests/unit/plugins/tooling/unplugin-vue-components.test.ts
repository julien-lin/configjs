import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ProjectContext } from '../../../../src/types/index.js'
import { unpluginVueComponentsPlugin } from '../../../../src/plugins/tooling/unplugin-vue-components.js'
import { ConfigWriter } from '../../../../src/core/config-writer.js'
import { BackupManager } from '../../../../src/core/backup-manager.js'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/core/config-writer.js')
vi.mock('../../../../src/core/backup-manager.js')
vi.mock('../../../../src/utils/package-manager.js', () => ({
  installPackages: vi.fn().mockResolvedValue(undefined),
}))

describe('unplugin-vue-components Plugin', () => {
  let mockContext: ProjectContext
  let restoreSpy!: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockContext = {
      framework: 'vue',
      frameworkVersion: '3.5.0',
      bundler: 'vite',
      bundlerVersion: '7.0.0',
      typescript: true,
      packageManager: 'npm',
      lockfile: 'package-lock.json',
      projectRoot: '/project',
      srcDir: 'src',
      dependencies: {},
      devDependencies: {},
    } as ProjectContext

    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)
    vi.mocked(fsHelpers.readFileContent).mockResolvedValue(
      "import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\n\nexport default defineConfig({\n  plugins: [vue()],\n})\n"
    )
    vi.mocked(fsHelpers.normalizePath).mockImplementation((p) =>
      p.replace(/\\/g, '/')
    )

    vi.spyOn(ConfigWriter.prototype, 'writeFile').mockResolvedValue(undefined)
    restoreSpy = vi
      .spyOn(BackupManager.prototype, 'restoreAll')
      .mockResolvedValue(undefined)
  })

  describe('detect', () => {
    it('should detect unplugin-vue-components in devDependencies', () => {
      const ctx = {
        ...mockContext,
        devDependencies: { 'unplugin-vue-components': '^30.0.0' },
      }
      expect(unpluginVueComponentsPlugin.detect?.(ctx)).toBe(true)
    })
  })

  describe('install', () => {
    it('should install unplugin-vue-components', async () => {
      const result = await unpluginVueComponentsPlugin.install(mockContext)
      expect(result.success).toBe(true)
      expect(result.packages.devDependencies).toContain(
        'unplugin-vue-components'
      )
    })
  })

  describe('configure', () => {
    it('should update vite config', async () => {
      const result = await unpluginVueComponentsPlugin.configure(mockContext)
      expect(result.success).toBe(true)
      expect(result.files.length).toBeGreaterThan(0)
    })
  })

  describe('rollback', () => {
    it('should restore backups', async () => {
      await unpluginVueComponentsPlugin.rollback?.(mockContext)
      expect(restoreSpy).toHaveBeenCalled()
    })
  })
})
