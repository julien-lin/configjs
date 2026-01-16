import { describe, it, expect, beforeEach } from 'vitest'
import { resolve } from 'path'
import {
  MonorepoDetector,
  type MonorepoConfig,
} from '../../../src/core/angular-21-monorepo.js'

describe('MonorepoDetector - Path Generation', () => {
  let mockConfig: MonorepoConfig

  beforeEach(() => {
    mockConfig = {
      type: 'nx',
      sourceLayout: 'src',
      appPath: resolve('/project', 'src', 'app'),
      rootPath: '/project',
      isMonorepo: true,
    }
  })

  describe('getComponentPath', () => {
    it('should return icon component path', () => {
      const path = MonorepoDetector.getComponentPath(mockConfig, 'icon')

      expect(path).toContain('components')
      expect(path).toContain('icon.component.ts')
    })

    it('should return menu component path', () => {
      const path = MonorepoDetector.getComponentPath(mockConfig, 'menu')

      expect(path).toContain('components')
      expect(path).toContain('menu.component.ts')
    })

    it('should include app path in component path', () => {
      const path = MonorepoDetector.getComponentPath(mockConfig, 'icon')

      expect(path).toContain('src/app')
    })
  })

  describe('getStorePath', () => {
    it('should return store path for Signal Store', () => {
      const path = MonorepoDetector.getStorePath(mockConfig)

      expect(path).toContain('stores')
      expect(path).toContain('app.store.ts')
    })

    it('should include app path in store path', () => {
      const path = MonorepoDetector.getStorePath(mockConfig)

      expect(path).toContain('src/app')
    })

    it('should work with different source layouts', () => {
      const libConfig: MonorepoConfig = {
        ...mockConfig,
        sourceLayout: 'lib',
        appPath: resolve('/project', 'lib'),
      }

      const path = MonorepoDetector.getStorePath(libConfig)

      expect(path).toContain('lib')
      expect(path).toContain('stores')
    })
  })

  describe('getAppConfigPath', () => {
    it('should return app config path', () => {
      const path = MonorepoDetector.getAppConfigPath(mockConfig)

      expect(path).toContain('app.config.ts')
    })

    it('should include app path', () => {
      const path = MonorepoDetector.getAppConfigPath(mockConfig)

      expect(path).toContain('src/app')
    })
  })

  describe('getVitestConfigPath', () => {
    it('should return vitest config at root for monorepo', () => {
      const path = MonorepoDetector.getVitestConfigPath(mockConfig)

      expect(path).toBe(resolve('/project', 'vitest.config.ts'))
    })

    it('should return vitest config at root for single project', () => {
      mockConfig.isMonorepo = false
      const path = MonorepoDetector.getVitestConfigPath(mockConfig)

      expect(path).toBe(resolve('/project', 'vitest.config.ts'))
    })

    it('should always be at root regardless of source layout', () => {
      mockConfig.sourceLayout = 'packages'
      mockConfig.appPath = resolve('/project', 'packages', 'app', 'src', 'app')

      const path = MonorepoDetector.getVitestConfigPath(mockConfig)

      expect(path).toBe(resolve('/project', 'vitest.config.ts'))
    })
  })

  describe('getTestFilePath', () => {
    it('should return test.ts path', () => {
      const path = MonorepoDetector.getTestFilePath(mockConfig)

      expect(path).toContain('test.ts')
    })

    it('should include app path', () => {
      const path = MonorepoDetector.getTestFilePath(mockConfig)

      expect(path).toContain('src/app')
    })

    it('should work with lib layout', () => {
      mockConfig.appPath = resolve('/project', 'lib')
      const path = MonorepoDetector.getTestFilePath(mockConfig)

      expect(path).toContain('lib')
      expect(path).toContain('test.ts')
    })
  })

  describe('Configuration for different layouts', () => {
    it('should handle src layout paths correctly', () => {
      const config: MonorepoConfig = {
        type: 'single',
        sourceLayout: 'src',
        appPath: resolve('/project', 'src', 'app'),
        rootPath: '/project',
        isMonorepo: false,
      }

      const storePath = MonorepoDetector.getStorePath(config)
      const testPath = MonorepoDetector.getTestFilePath(config)

      expect(storePath).toContain('src/app')
      expect(testPath).toContain('src/app')
    })

    it('should handle lib layout paths correctly', () => {
      const config: MonorepoConfig = {
        type: 'single',
        sourceLayout: 'lib',
        appPath: resolve('/project', 'lib'),
        rootPath: '/project',
        isMonorepo: false,
      }

      const storePath = MonorepoDetector.getStorePath(config)
      expect(storePath).toContain('lib')
    })

    it('should handle packages layout paths correctly', () => {
      const config: MonorepoConfig = {
        type: 'pnpm',
        sourceLayout: 'packages',
        appPath: resolve('/project', 'packages', 'app', 'src', 'app'),
        rootPath: '/project',
        isMonorepo: true,
      }

      const vitestPath = MonorepoDetector.getVitestConfigPath(config)
      expect(vitestPath).toBe(resolve('/project', 'vitest.config.ts'))
    })
  })
})
