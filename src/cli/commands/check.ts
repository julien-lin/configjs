import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { pluginRegistry } from '../../plugins/registry.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../core/validator.js'
import { logger } from '../../utils/logger.js'

interface ConfigFile {
  plugins: string[]
}

/**
 * Commande pour vérifier la compatibilité sans installer
 *
 * @param options - Options de la commande
 */
export async function checkCompatibility(options: {
  config?: string
}): Promise<void> {
  try {
    console.log('\n🔍 Vérification de la compatibilité\n')

    // 1. Lire le fichier de configuration
    const configPath = options.config || join(process.cwd(), '.confjs.json')

    if (!existsSync(configPath)) {
      console.error(`❌ Fichier de configuration introuvable: ${configPath}`)
      console.log('\n💡 Créez un fichier .confjs.json avec le format suivant:')
      console.log(
        JSON.stringify(
          {
            plugins: ['react-router-dom', 'zustand', 'tailwindcss'],
          },
          null,
          2
        )
      )
      process.exit(1)
    }

    const configContent = await readFile(configPath, 'utf-8')
    let config: ConfigFile
    try {
      const parsed: unknown = JSON.parse(configContent)
      config = parsed as ConfigFile
    } catch {
      console.error(
        '❌ Erreur de parsing JSON dans le fichier de configuration'
      )
      process.exit(1)
    }

    if (!config.plugins || !Array.isArray(config.plugins)) {
      console.error('❌ Format de configuration invalide')
      console.log(
        '   Le champ "plugins" doit être un tableau de noms de packages'
      )
      process.exit(1)
    }

    // 2. Résoudre les plugins
    const selectedPlugins = config.plugins
      .map((name) => pluginRegistry.find((p) => p.name === name))
      .filter(Boolean)

    if (selectedPlugins.length === 0) {
      console.error('❌ Aucun plugin valide trouvé dans la configuration')
      process.exit(1)
    }

    const notFound = config.plugins.filter(
      (name) => !pluginRegistry.find((p) => p.name === name)
    )
    if (notFound.length > 0) {
      console.warn('\n⚠️  Plugins non trouvés:')
      for (const name of notFound) {
        console.warn(`   • ${name}`)
      }
    }

    console.log(`📦 Plugins à vérifier: ${selectedPlugins.length}`)
    for (const plugin of selectedPlugins) {
      if (plugin) {
        console.log(`   • ${plugin.displayName} (${plugin.name})`)
      }
    }

    // 3. Validation
    console.log('\n🔍 Analyse de compatibilité...\n')

    const validator = new CompatibilityValidator(compatibilityRules)
    const validation = validator.validate(
      selectedPlugins as typeof pluginRegistry
    )

    // 4. Afficher les résultats
    if (validation.errors.length === 0) {
      console.log('✅ Aucun conflit détecté\n')
    } else {
      console.error('❌ Conflits détectés:\n')
      for (const error of validation.errors) {
        console.error(`   • ${error.message}`)
        if ('plugins' in error && error.plugins) {
          console.error(`     Plugins: ${error.plugins.join(', ')}`)
        }
      }
      console.log('')
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Avertissements:\n')
      for (const warning of validation.warnings) {
        console.warn(`   • ${warning.message}`)
        if ('plugins' in warning && warning.plugins) {
          console.warn(`     Plugins: ${warning.plugins.join(', ')}`)
        }
      }
      console.log('')
    }

    if (validation.suggestions.length > 0) {
      console.log('💡 Suggestions:\n')
      for (const suggestion of validation.suggestions) {
        console.log(`   • ${suggestion}`)
      }
      console.log('')
    }

    // 5. Résultat final
    if (validation.valid) {
      console.log(
        "✨ Configuration valide ! Vous pouvez procéder à l'installation.\n"
      )
      process.exit(0)
    } else {
      console.error(
        "❌ Configuration invalide. Corrigez les erreurs avant d'installer.\n"
      )
      process.exit(2)
    }
  } catch (error) {
    logger.error('Erreur lors de la vérification:', error)
    if (error instanceof Error) {
      console.error(`\n❌ ${error.message}`)
    }
    process.exit(1)
  }
}
