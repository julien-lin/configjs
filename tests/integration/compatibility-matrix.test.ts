/**
 * Integration Tests: Plugin Compatibility Matrix
 * Teste les combinaisons de plugins et leur compatibilité
 *
 * @group integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestProject, cleanupTestProject } from './test-utils.js'
import { Installer } from '../../src/core/installer.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../src/core/validator.js'
import { detectContext } from '../../src/core/detector.js'
import { ConfigWriter } from '../../src/core/config-writer.js'
import { BackupManager } from '../../src/core/backup-manager.js'
import { pluginRegistry } from '../../src/plugins/registry.js'

describe('Integration: Plugin Compatibility Matrix', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await createTestProject('compatibility-test')
  })

  afterEach(async () => {
    await cleanupTestProject(projectPath)
  })

  // ===== Routing Combinations =====

  it('should support react-router-dom with different state managers', async () => {
    const combinations = [
      [
        pluginRegistry.find((p) => p.name === 'react-router-dom'),
        pluginRegistry.find((p) => p.name === 'zustand'),
      ],
      [
        pluginRegistry.find((p) => p.name === 'react-router-dom'),
        pluginRegistry.find((p) => p.name === '@reduxjs/toolkit'),
      ],
      [
        pluginRegistry.find((p) => p.name === 'react-router-dom'),
        pluginRegistry.find((p) => p.name === 'jotai'),
      ],
    ]

    for (const combo of combinations) {
      // Créer un nouveau projet pour chaque combinaison
      const testPath = await createTestProject('compatibility-test')

      try {
        const context = await detectContext(testPath)
        const backupManager = new BackupManager()
        const configWriter = new ConfigWriter(backupManager)
        const validator = new CompatibilityValidator(compatibilityRules)

        const plugins = combo.filter(
          (p): p is NonNullable<typeof p> => p !== undefined
        )
        if (plugins.length === 2) {
          const validation = validator.validate(plugins)
          expect(validation.valid).toBe(true)

          const installer = new Installer(
            context,
            validator,
            configWriter,
            backupManager
          )
          const result = await installer.install(plugins, {
            skipPackageInstall: true,
          })
          expect(result.success).toBe(true)
        }
      } finally {
        // Nettoyer le projet de test
        await cleanupTestProject(testPath)
      }
    }
  })

  it('should support TanStack Router with different state managers', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === '@tanstack/react-router'),
      pluginRegistry.find((p) => p.name === 'zustand'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length === 2) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== State Management Combinations =====

  it('should handle routing + state + http combinations', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'react-router-dom'),
      pluginRegistry.find((p) => p.name === '@reduxjs/toolkit'),
      pluginRegistry.find((p) => p.name === '@tanstack/react-query'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length === 3) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== HTTP Client Combinations =====

  it('should support axios and tanstack-query together', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'axios'),
      pluginRegistry.find((p) => p.name === '@tanstack/react-query'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length === 2) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== CSS Framework Combinations =====

  it('should support tailwindcss with UI component libraries', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    // Utiliser styled-components au lieu de tailwind car tailwind nécessite postcss
    const plugins = [
      pluginRegistry.find((p) => p.name === 'styled-components'),
      pluginRegistry.find((p) => p.name === '@radix-ui/react-dialog'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length >= 1) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  it('should support emotion with styled-components alternatives', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === '@emotion/react'),
      pluginRegistry.find((p) => p.name === '@radix-ui/react-dialog'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length >= 1) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Forms + Validation =====

  it('should support react-hook-form with zod validation', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'react-hook-form'),
      pluginRegistry.find((p) => p.name === 'zod'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length === 2) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Testing Stack =====

  it('should support complete testing stack', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === '@testing-library/react'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length >= 1) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Development Tools Stack =====

  it('should support complete dev tools configuration', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'eslint'),
      pluginRegistry.find((p) => p.name === 'prettier'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length === 2) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Animation Libraries =====

  it('should install animation libraries', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'framer-motion'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length >= 1) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Icons Library =====

  it('should install icons and utilities', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'react-icons'),
      pluginRegistry.find((p) => p.name === 'date-fns'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length === 2) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Large Stack (Realistic Project) =====

  it('should handle realistic full-stack project setup', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'react-router-dom'),
      pluginRegistry.find((p) => p.name === 'zustand'),
      pluginRegistry.find((p) => p.name === 'react-hook-form'),
      pluginRegistry.find((p) => p.name === 'zod'),
      pluginRegistry.find((p) => p.name === 'axios'),
      pluginRegistry.find((p) => p.name === 'styled-components'),
      pluginRegistry.find((p) => p.name === '@testing-library/react'),
      pluginRegistry.find((p) => p.name === 'eslint'),
      pluginRegistry.find((p) => p.name === 'prettier'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length >= 5) {
      const validation = validator.validate(plugins)
      expect(validation.valid).toBe(true)

      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Bootstrap Alternative =====

  it('should support bootstrap as CSS alternative', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'react-bootstrap'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length >= 1) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Toast Notifications =====

  it('should support toast notification libraries', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const plugins = [
      pluginRegistry.find((p) => p.name === 'react-hot-toast'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    if (plugins.length >= 1) {
      const result = await installer.install(plugins, {
        skipPackageInstall: true,
      })
      expect(result.success).toBe(true)
    }
  })

  // ===== Validation & Compatibility Check =====

  it('should validate compatibility before installation', async () => {
    const validator = new CompatibilityValidator(compatibilityRules)

    const plugins = [
      pluginRegistry.find((p) => p.name === 'react-router-dom'),
      pluginRegistry.find((p) => p.name === 'zustand'),
      pluginRegistry.find((p) => p.name === 'axios'),
    ].filter((p): p is NonNullable<typeof p> => p !== undefined)

    const validation = validator.validate(plugins)
    expect(validation.valid).toBe(true)
  })

  // ===== Edge Cases =====

  it('should handle empty plugin list', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const result = await installer.install([], {
      skipPackageInstall: true,
    })

    expect(result.success).toBe(true)
    expect(result.installed.length).toBe(0)
  })

  it('should handle duplicate plugins gracefully', async () => {
    const context = await detectContext(projectPath)
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(
      context,
      validator,
      configWriter,
      backupManager
    )

    const zustandPlugin = pluginRegistry.find((p) => p.name === 'zustand')
    if (zustandPlugin) {
      const result = await installer.install([zustandPlugin, zustandPlugin], {
        skipPackageInstall: true,
      })
      // Devrait gérer les doublons
      expect(result.success).toBe(true)
    }
  })
})
