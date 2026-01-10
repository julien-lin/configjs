import inquirer from 'inquirer'
import type { Plugin } from '../../types/index.js'
import { Category } from '../../types/index.js'
import type { ProjectContext } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'
import { getPluginsByCategory } from '../../plugins/registry.js'

/**
 * Traduit le nom de la catégorie selon la langue
 */
function getCategoryName(category: Category, _lang: SupportedLanguage): string {
  const categoryMap: Record<Category, string> = {
    [Category.ROUTING]: 'Routing',
    [Category.STATE]: 'State Management',
    [Category.HTTP]: 'HTTP Client',
    [Category.CSS]: 'CSS / Styling',
    [Category.UI]: 'UI Components',
    [Category.FORMS]: 'Forms',
    [Category.TOOLING]: 'Tooling',
    [Category.TESTING]: 'Testing',
    [Category.I18N]: 'Internationalization',
    [Category.ANIMATION]: 'Animation',
    [Category.UTILS]: 'Utilities',
  }
  return categoryMap[category] || category
}

/**
 * Formate un plugin pour l'affichage dans Inquirer
 * Affiche le nom et la description
 */
function formatPluginChoice(
  plugin: Plugin,
  _lang: SupportedLanguage
): { name: string; value: string; short: string } {
  return {
    name: `${plugin.displayName}\n  ${plugin.description}`,
    value: plugin.name,
    short: plugin.displayName,
  }
}

/**
 * Prompt pour sélectionner les plugins par catégorie
 *
 * @param ctx - Contexte du projet
 * @param availablePlugins - Liste des plugins disponibles
 * @param lang - Langue choisie
 * @returns Liste des plugins sélectionnés
 */
export async function promptPluginSelection(
  ctx: ProjectContext,
  availablePlugins: Plugin[],
  lang: SupportedLanguage
): Promise<Plugin[]> {
  const translations = getTranslations(lang)
  const selectedPlugins: Plugin[] = []

  // Grouper les plugins par catégorie
  const pluginsByCategory = new Map<Category, Plugin[]>()

  for (const plugin of availablePlugins) {
    // Filtrer par framework
    if (!plugin.frameworks.includes(ctx.framework)) {
      continue
    }

    // Exclure React Router si Next.js est détecté (Next.js a son propre routing)
    if (ctx.framework === 'nextjs' && plugin.name === 'react-router-dom') {
      continue
    }

    // Filtrer par TypeScript si requis
    if (plugin.requiresTypeScript === true && !ctx.typescript) {
      continue
    }

    // Filtrer par bundler si spécifié
    if (
      plugin.bundlers &&
      ctx.bundler &&
      !plugin.bundlers.includes(ctx.bundler)
    ) {
      continue
    }

    const category = plugin.category
    if (!pluginsByCategory.has(category)) {
      pluginsByCategory.set(category, [])
    }
    const categoryPluginsList = pluginsByCategory.get(category)
    if (categoryPluginsList !== undefined) {
      categoryPluginsList.push(plugin)
    }
  }

  // Parcourir chaque catégorie
  const categories = Array.from(pluginsByCategory.keys()).sort()

  for (const category of categories) {
    const plugins = pluginsByCategory.get(category)
    if (plugins === undefined || plugins.length === 0) {
      continue
    }

    const categoryName = getCategoryName(category, lang)
    const categoryPlugins = getPluginsByCategory(category).filter((p) =>
      plugins.some((ap) => ap.name === p.name)
    )

    // Créer les choix avec descriptions
    const choices = [
      ...categoryPlugins.map((plugin) => formatPluginChoice(plugin, lang)),
      new inquirer.Separator(),
      {
        name: translations.common.none,
        value: '__none__',
        short: translations.common.none,
      },
    ]

    const { selected } = await inquirer.prompt<{ selected: string[] }>([
      {
        type: 'checkbox',
        name: 'selected',
        message: `${translations.plugins.selectCategory(categoryName)}\n${translations.plugins.pressSpace} | ${translations.plugins.pressEnter}`,
        choices,
        pageSize: 10,
        loop: false,
      },
    ])

    // Ajouter les plugins sélectionnés (exclure '__none__')
    const pluginNames = selected.filter((name) => name !== '__none__')
    for (const pluginName of pluginNames) {
      const plugin = categoryPlugins.find((p) => p.name === pluginName)
      if (plugin !== undefined) {
        selectedPlugins.push(plugin)
      }
    }
  }

  return selectedPlugins
}
