import { PluginTracker } from '../../core/plugin-tracker.js'
import { detectContext } from '../../core/detector.js'
import { logger } from '../../utils/logger.js'
import { confirm } from '@inquirer/prompts'

/**
 * Commande pour supprimer un plugin installé
 */
export async function removeCommand(pluginName?: string): Promise<void> {
  try {
    // Détecter le projet
    const ctx = await detectContext(process.cwd())

    // Charger le tracker
    const tracker = new PluginTracker(ctx.projectRoot)
    await tracker.load()

    if (!pluginName) {
      console.log('\n❌ Please specify a plugin name to remove.\n')
      console.log('Usage: configjs remove <plugin-name>\n')
      console.log('Example: configjs remove react-router\n')
      process.exit(1)
    }

    // Vérifier si le plugin est installé
    const plugin = tracker.getPlugin(pluginName)

    if (!plugin) {
      console.log(`\n❌ Plugin '${pluginName}' is not installed.\n`)
      console.log('Run `configjs installed` to see installed plugins.\n')
      process.exit(1)
    }

    // Confirmation
    console.log(`\n⚠️  You are about to remove: ${plugin.displayName}\n`)
    console.log(
      '⚠️  WARNING: This will only untrack the plugin from the config.'
    )
    console.log('   You will need to manually:')
    console.log('   - Remove the packages (npm uninstall ...)')
    console.log('   - Delete the generated files')
    console.log('   - Clean up the configuration\n')

    const confirmed = await confirm({
      message: 'Continue?',
      default: false,
    })

    if (!confirmed) {
      console.log('\n❌ Cancelled.\n')
      return
    }

    // Supprimer du tracker
    await tracker.removePlugin(pluginName)

    console.log(`\n✅ ${plugin.displayName} has been removed from tracking.\n`)
    console.log('📝 Manual cleanup required:')

    if (
      plugin.packages.dependencies &&
      plugin.packages.dependencies.length > 0
    ) {
      console.log(`   npm uninstall ${plugin.packages.dependencies.join(' ')}`)
    }

    if (
      plugin.packages.devDependencies &&
      plugin.packages.devDependencies.length > 0
    ) {
      console.log(
        `   npm uninstall ${plugin.packages.devDependencies.join(' ')}`
      )
    }

    console.log()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to remove plugin: ${errorMessage}`)
    process.exit(1)
  }
}
