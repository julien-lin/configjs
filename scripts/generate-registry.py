#!/usr/bin/env python3
"""
Script pour générer les imports du nouveau registry des plugins.
"""

import os
import re
from pathlib import Path

PLUGINS_DIR = Path("/Users/julien/Desktop/orchestrateur-framework/src/plugins")

def get_all_builder_plugins():
    """Trouve tous les fichiers -builder.ts et génère les imports."""
    
    plugins = []
    
    # Parcourir tous les sous-dossiers sauf builder
    for category_dir in sorted(PLUGINS_DIR.iterdir()):
        if not category_dir.is_dir() or category_dir.name == 'builder':
            continue
        
        for plugin_file in sorted(category_dir.glob('*-builder.ts')):
            # Extraire les infos
            plugin_name = plugin_file.stem.replace('-builder', '')
            category = category_dir.name
            
            # Générer le nom de la variable du plugin
            plugin_var = plugin_name.replace('@', '').replace('/', '').replace('-', '') + "Plugin"
            
            plugins.append({
                'name': plugin_name,
                'category': category,
                'var': plugin_var,
                'path': f'{category}/{plugin_name}-builder'
            })
    
    return plugins

def generate_imports(plugins):
    """Génère les imports TypeScript."""
    
    imports = []
    for plugin in plugins:
        imports.append(f"import {{ {plugin['var']} }} from './{plugin['path']}.js'")
    
    return imports

def generate_registry_array(plugins):
    """Génère l'array du registry groupé par catégorie."""
    
    # Grouper par catégorie
    by_category = {}
    for plugin in plugins:
        cat = plugin['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(plugin)
    
    lines = []
    for category in sorted(by_category.keys()):
        lines.append(f"  // {category.upper()}")
        for plugin in by_category[category]:
            lines.append(f"  {plugin['var']},")
        lines.append("")
    
    return lines

def main():
    print("📝 Génération du nouveau registry...\n")
    
    plugins = get_all_builder_plugins()
    print(f"✅ Trouvé {len(plugins)} plugins builder\n")
    
    # Générer les imports
    imports = generate_imports(plugins)
    print("📦 Imports générés:")
    for imp in imports[:5]:
        print(f"  {imp}")
    print(f"  ... ({len(imports)} total)\n")
    
    # Générer l'array du registry
    registry_lines = generate_registry_array(plugins)
    print("📋 Registry array (extrait):")
    for line in registry_lines[:15]:
        print(f"  {line}")
    print(f"  ... ({len(registry_lines)} total lines)\n")
    
    # Générer le fichier registry complet
    registry_content = '''import type { Plugin, ProjectContext, Framework } from '../types/index.js'
import { Category } from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * Registry centralisé de tous les plugins disponibles
 *
 * Ce registry contient tous les plugins organisés par catégorie.
 * Les plugins sont chargés dynamiquement et validés au chargement.
 *
 * @example
 * ```typescript
 * import { pluginRegistry, getPluginsByCategory } from './plugins/registry'
 *
 * // Obtenir tous les plugins de routing
 * const routingPlugins = getPluginsByCategory(Category.ROUTING)
 *
 * // Rechercher un plugin
 * const router = getPluginById('react-router')
 * ```
 */

// ============================================
// AUTO-GENERATED IMPORTS FROM BUILDER FILES
// ============================================

'''
    
    # Ajouter les imports
    registry_content += '\n'.join(imports) + '\n\n'
    
    # Ajouter le registry array
    registry_content += '''/**
 * Registry de tous les plugins disponibles
 *
 * Les plugins sont organisés par catégorie :
 * - ROUTING : React Router, TanStack Router, etc.
 * - STATE : Zustand, Redux Toolkit, Jotai, etc.
 * - HTTP : Axios, TanStack Query, etc.
 * - CSS : TailwindCSS, Bootstrap, Emotion, etc.
 * - TOOLING : ESLint, Prettier, Husky, etc.
 * - TESTING : React Testing Library, Vitest, etc.
 * - UI : Shadcn/ui, Radix UI, Icons, Toast, etc.
 * - FORMS : React Hook Form, Zod, etc.
 * - ANIMATION : Framer Motion, etc.
 * - NEXTJS : Next.js specific plugins
 * - UTILS : Utilities like date-fns, vueuse
 */
export const pluginRegistry: Plugin[] = [
'''
    
    registry_content += '\n'.join(['  ' + line for line in registry_lines])
    
    registry_content += ''']

/**
 * Valide qu'un plugin respecte l'interface Plugin
 *
 * @param plugin - Plugin à valider
 * @returns true si le plugin est valide, false sinon
 */
function validatePlugin(plugin: Plugin): boolean {
  const requiredFields: (keyof Plugin)[] = [
    'name',
    'displayName',
    'description',
    'category',
    'install',
    'configure',
  ]

  for (const field of requiredFields) {
    if (!(field in plugin) || plugin[field] === undefined) {
      logger.error(`Plugin validation failed: missing field '${field}'`, {
        plugin: plugin.name,
      })
      return false
    }
  }

  // Vérifier que category est valide
  if (!Object.values(Category).includes(plugin.category)) {
    logger.error(
      `Plugin validation failed: invalid category '${plugin.category}'`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  // Vérifier que frameworks est un tableau non vide
  if (!Array.isArray(plugin.frameworks) || plugin.frameworks.length === 0) {
    logger.error(
      `Plugin validation failed: 'frameworks' must be a non-empty array`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  // Vérifier que install et configure sont des fonctions
  if (typeof plugin.install !== 'function') {
    logger.error(
      `Plugin validation failed: 'install' must be a function`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  if (typeof plugin.configure !== 'function') {
    logger.error(
      `Plugin validation failed: 'configure' must be a function`,
      {
        plugin: plugin.name,
      }
    )
    return false
  }

  return true
}

/**
 * Valide tous les plugins du registry au chargement
 *
 * @param plugins - Liste des plugins à valider
 * @returns Liste des plugins valides
 */
function validateRegistry(plugins: Plugin[]): Plugin[] {
  const validPlugins: Plugin[] = []
  const invalidPlugins: string[] = []

  for (const plugin of plugins) {
    if (validatePlugin(plugin)) {
      validPlugins.push(plugin)
    } else {
      invalidPlugins.push(plugin.name)
    }
  }

  if (invalidPlugins.length > 0) {
    logger.warn(`Some plugins failed validation and were excluded:`, {
      invalidPlugins,
      total: plugins.length,
      valid: validPlugins.length,
    })
  }

  return validPlugins
}

// Valider le registry au chargement
const validatedRegistry = validateRegistry(pluginRegistry)

/**
 * Obtient un plugin par son ID (nom du package)
 *
 * @param id - ID du plugin (ex: 'react-router-dom')
 * @returns Le plugin ou undefined si non trouvé
 *
 * @example
 * ```typescript
 * const plugin = getPluginById('react-router-dom')
 * ```
 */
export function getPluginById(id: string): Plugin | undefined {
  return validatedRegistry.find((p) => p.name === id)
}

/**
 * Obtient les plugins par catégorie
 *
 * @param category - Catégorie des plugins
 * @returns Liste des plugins de la catégorie
 *
 * @example
 * ```typescript
 * const routingPlugins = getPluginsByCategory(Category.ROUTING)
 * ```
 */
export function getPluginsByCategory(category: Category): Plugin[] {
  return validatedRegistry.filter((p) => p.category === category)
}

/**
 * Obtient les plugins compatibles avec un contexte de projet donné
 *
 * @param ctx - Contexte du projet
 * @returns Liste des plugins compatibles avec le contexte
 *
 * @example
 * ```typescript
 * const ctx = await detectContext(projectRoot)
 * const compatiblePlugins = getCompatiblePlugins(ctx)
 * // Retourne uniquement les plugins compatibles avec React + TypeScript + Vite
 * ```
 */
export function getCompatiblePlugins(ctx: ProjectContext): Plugin[] {
  return validatedRegistry.filter((plugin) => {
    // Vérifier le framework
    if (!plugin.frameworks.includes(ctx.framework)) {
      return false
    }

    // Vérifier TypeScript si requis
    if (plugin.requiresTypeScript === true && !ctx.typescript) {
      return false
    }

    // Vérifier le bundler si spécifié
    if (plugin.bundlers && plugin.bundlers.length > 0) {
      if (ctx.bundler === null || !plugin.bundlers.includes(ctx.bundler)) {
        return false
      }
    }

    return true
  })
}

/**
 * Obtient les plugins compatibles avec un plugin donné et un contexte
 *
 * @param plugin - Plugin de référence
 * @param ctx - Contexte du projet
 * @returns Liste des plugins compatibles
 *
 * @example
 * ```typescript
 * const compatible = getCompatiblePluginsForPlugin(reactRouterPlugin, ctx)
 * // Retourne les plugins qui ne sont pas dans incompatibleWith
 * ```
 */
export function getCompatiblePluginsForPlugin(
  plugin: Plugin,
  ctx: ProjectContext
): Plugin[] {
  const compatible = getCompatiblePlugins(ctx)

  if (plugin.incompatibleWith) {
    return compatible.filter((p) => !plugin.incompatibleWith!.includes(p.name))
  }

  return compatible
}

/**
 * Recherche des plugins par nom, description ou catégorie
 *
 * @param query - Terme de recherche
 * @returns Liste des plugins correspondant à la recherche
 *
 * @example
 * ```typescript
 * const results = searchPlugins('router')
 * // Retourne : [reactRouterPlugin, tanstackRouterPlugin]
 * ```
 */
export function searchPlugins(query: string): Plugin[] {
  const lowerQuery = query.toLowerCase()

  return validatedRegistry.filter((plugin) => {
    // Recherche dans le nom
    if (plugin.name.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Recherche dans le displayName
    if (plugin.displayName.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Recherche dans la description
    if (plugin.description.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Recherche dans la catégorie
    if (plugin.category.toLowerCase().includes(lowerQuery)) {
      return true
    }

    return false
  })
}

/**
 * Obtient tous les plugins disponibles pour un framework spécifique
 *
 * @param framework - Framework cible
 * @returns Liste des plugins compatibles avec le framework
 *
 * @example
 * ```typescript
 * const reactPlugins = getPluginsByFramework('react')
 * ```
 */
export function getPluginsByFramework(framework: Framework): Plugin[] {
  return validatedRegistry.filter((p) => p.frameworks.includes(framework))
}

/**
 * Obtient les plugins déjà installés dans le projet
 *
 * @param ctx - Contexte du projet
 * @returns Liste des plugins détectés comme installés
 *
 * @example
 * ```typescript
 * const installed = getInstalledPlugins(ctx)
 * ```
 */
export function getInstalledPlugins(ctx: ProjectContext): Plugin[] {
  return validatedRegistry.filter((p) => {
    if (!p.detect) return false
    return p.detect(ctx)
  })
}
'''
    
    # Écrire le fichier
    registry_path = PLUGINS_DIR / "registry.ts"
    registry_path.write_text(registry_content)
    
    print(f"✅ Registry généré: {registry_path}")
    print(f"📊 Total: {len(plugins)} plugins")
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
