import { PluginTracker } from '../../core/plugin-tracker.js'
import { detectContext } from '../../core/detector.js'
import { logger } from '../../utils/logger.js'

/**
 * Commande pour afficher les plugins installés
 */
export async function installedCommand(): Promise<void> {
  try {
    // Détecter le projet
    const ctx = await detectContext(process.cwd())

    // Charger le tracker
    const tracker = new PluginTracker(ctx.projectRoot)
    await tracker.load()

    const installedPlugins = tracker.getInstalledPlugins()

    if (installedPlugins.length === 0) {
      console.log('\n📦 No plugins installed yet.\n')
      console.log('Run `configjs install` to add plugins to your project.\n')
      return
    }

    console.log(`\n📦 Installed plugins (${installedPlugins.length}):\n`)

    // Afficher sous forme de liste
    for (const plugin of installedPlugins) {
      const date = new Date(plugin.installedAt).toLocaleDateString()
      console.log(`  ✓ ${plugin.displayName}`)
      console.log(`    Category: ${plugin.category.toUpperCase()}`)
      console.log(`    Version: ${plugin.version || 'N/A'}`)
      console.log(`    Installed: ${date}`)
      console.log()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to list installed plugins: ${errorMessage}`)
    process.exit(1)
  }
}
