import { pluginRegistry } from '../../plugins/registry.js'
import { Category } from '../../types/index.js'

/**
 * Commande pour lister les bibliothèques disponibles
 *
 * @param options - Options de la commande
 */
export function listLibraries(options: { category?: string }): void {
  console.log('\n📦 Bibliothèques disponibles\n')

  // Filtrer par catégorie si spécifié
  const filteredPlugins = options.category
    ? pluginRegistry.filter((p) => p.category === options.category)
    : pluginRegistry

  if (filteredPlugins.length === 0) {
    console.log(
      `⚠️  Aucune bibliothèque trouvée pour la catégorie: ${options.category}`
    )
    return
  }

  // Grouper par catégorie
  const byCategory = filteredPlugins.reduce(
    (acc, plugin) => {
      if (!acc[plugin.category]) {
        acc[plugin.category] = []
      }
      const categoryArray = acc[plugin.category]
      if (categoryArray) {
        categoryArray.push(plugin)
      }
      return acc
    },
    {} as Record<string, typeof pluginRegistry>
  )

  // Afficher par catégorie
  const categoryLabels: Record<Category, string> = {
    [Category.ROUTING]: '📍 Routing',
    [Category.STATE]: '🗄️  State Management',
    [Category.HTTP]: '🌐 HTTP Client',
    [Category.CSS]: '🎨 CSS Framework',
    [Category.UI]: '🎨 UI Components',
    [Category.FORMS]: '📝 Forms',
    [Category.TOOLING]: '🛠️  Tooling',
    [Category.TESTING]: '🧪 Testing',
    [Category.I18N]: '🌍 Internationalization',
    [Category.ANIMATION]: '✨ Animation',
    [Category.UTILS]: '🔧 Utilities',
  }

  for (const [category, plugins] of Object.entries(byCategory)) {
    const label = categoryLabels[category as Category] || category
    console.log(`${label}`)
    console.log('─'.repeat(50))

    for (const plugin of plugins) {
      const version = plugin.version ? ` (${plugin.version})` : ''
      console.log(`  • ${plugin.displayName}${version}`)
      console.log(`    ${plugin.description}`)
      console.log(`    Package: ${plugin.name}`)

      // Afficher les frameworks supportés
      if (plugin.frameworks && plugin.frameworks.length > 0) {
        console.log(`    Frameworks: ${plugin.frameworks.join(', ')}`)
      }

      // Afficher les incompatibilités
      if (plugin.incompatibleWith && plugin.incompatibleWith.length > 0) {
        console.log(
          `    ⚠️  Incompatible avec: ${plugin.incompatibleWith.join(', ')}`
        )
      }

      console.log('')
    }
  }

  console.log(`\n📊 Total: ${filteredPlugins.length} bibliothèque(s)`)

  if (!options.category) {
    console.log(
      '\n💡 Astuce: Utilisez --category <nom> pour filtrer par catégorie'
    )
    console.log('   Catégories disponibles:')
    console.log(
      Object.keys(categoryLabels)
        .map((cat) => `   - ${cat}`)
        .join('\n')
    )
  }
}
