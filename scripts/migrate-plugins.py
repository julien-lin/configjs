#!/usr/bin/env python3
"""
Script pour migrer automatiquement les plugins vers le pattern builder.
Lit chaque plugin .ts, l'analyse et génère un fichier -builder.ts correspondant.
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Chemins
PLUGINS_DIR = Path(__file__).parent.parent / "src" / "plugins"
MIGRATED_PLUGINS = {
    "zustand",
    "axios",
    "react-router",
    "tailwindcss",
    "prettier"
}

def extract_plugin_metadata(content: str) -> Dict:
    """Extrait les métadonnées d'un plugin du contenu du fichier."""
    metadata = {
        'name': None,
        'displayName': None,
        'description': None,
        'category': None,
        'version': None,
        'frameworks': [],
        'incompatibleWith': [],
        'requires': [],
        'recommends': []
    }
    
    # Extraire name
    name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", content)
    if name_match:
        metadata['name'] = name_match.group(1)
    
    # Extraire displayName
    display_match = re.search(r"displayName:\s*['\"]([^'\"]+)['\"]", content)
    if display_match:
        metadata['displayName'] = display_match.group(1)
    
    # Extraire description
    desc_match = re.search(r"description:\s*['\"]([^'\"]+)['\"]", content)
    if desc_match:
        metadata['description'] = desc_match.group(1)
    
    # Extraire category
    cat_match = re.search(r"category:\s*Category\.([A-Z_]+)", content)
    if cat_match:
        metadata['category'] = cat_match.group(1)
    
    # Extraire version
    ver_match = re.search(r"version:\s*['\"]([^'\"]+)['\"]", content)
    if ver_match:
        metadata['version'] = ver_match.group(1)
    
    # Extraire frameworks (array)
    fw_match = re.search(r"frameworks:\s*\[([^\]]+)\]", content)
    if fw_match:
        frameworks_str = fw_match.group(1)
        frameworks = re.findall(r"['\"]([^'\"]+)['\"]", frameworks_str)
        metadata['frameworks'] = frameworks
    
    # Extraire incompatibleWith
    incompat_match = re.search(r"incompatibleWith:\s*\[([^\]]*)\]", content)
    if incompat_match:
        incompat_str = incompat_match.group(1)
        incompat = re.findall(r"['\"]([^'\"]+)['\"]", incompat_str)
        metadata['incompatibleWith'] = incompat
    
    # Extraire requires
    requires_match = re.search(r"requires:\s*\[([^\]]*)\]", content)
    if requires_match:
        requires_str = requires_match.group(1)
        requires = re.findall(r"['\"]([^'\"]+)['\"]", requires_str)
        metadata['requires'] = requires
    
    # Extraire recommends
    recommends_match = re.search(r"recommends:\s*\[([^\]]*)\]", content)
    if recommends_match:
        recommends_str = recommends_match.group(1)
        recommends = re.findall(r"['\"]([^'\"]+)['\"]", recommends_str)
        metadata['recommends'] = recommends
    
    return metadata

def find_all_plugins() -> Dict[str, Path]:
    """Trouve tous les fichiers plugin .ts (non-builder)."""
    plugins = {}
    
    # Parcourir tous les sous-dossiers de plugins
    for category_dir in PLUGINS_DIR.iterdir():
        if not category_dir.is_dir() or category_dir.name in ['builder', 'versions.ts']:
            continue
        
        for plugin_file in category_dir.glob('*.ts'):
            # Ignorer les fichiers builder et index
            if plugin_file.name.endswith('-builder.ts') or plugin_file.name == 'index.ts':
                continue
            
            # Extraire le nom du plugin
            plugin_name = plugin_file.stem
            
            # Ignorer si déjà migré
            if plugin_name in MIGRATED_PLUGINS:
                continue
            
            plugins[plugin_name] = plugin_file
    
    return plugins

def generate_builder_code(metadata: Dict, original_file: Path) -> str:
    """Génère le code du fichier -builder.ts."""
    
    name = metadata['name']
    display_name = metadata['displayName']
    description = metadata['description']
    category = metadata['category']
    version = metadata['version']
    frameworks = metadata['frameworks']
    incompat = metadata['incompatibleWith']
    requires = metadata['requires']
    recommends = metadata['recommends']
    
    # Construire les imports
    imports = "import { createPlugin } from '../builder/plugin-builder.js'\n"
    imports += "import { getVersion } from '../versions.js'\n"
    imports += "import { renderTemplate } from '../../templates/index.js'\n"
    imports += "import type { ProjectContext, ConfigResult, InstallResult } from '../../types/index.js'\n"
    imports += "import { installPackages } from '../../utils/package-manager.js'\n"
    imports += "import { ConfigWriter } from '../../core/config-writer.js'\n"
    imports += "import { BackupManager } from '../../core/backup-manager.js'\n"
    
    # Construire les frameworks
    frameworks_code = ", ".join([f"'{fw}'" for fw in frameworks])
    
    # Construire les incompatibilités
    incompat_code = ""
    if incompat:
        incompat_items = ", ".join([f"'{item}'" for item in incompat])
        incompat_code = f".incompatibleWith([{incompat_items}])\n  "
    
    # Construire les requires
    requires_code = ""
    if requires:
        requires_items = ", ".join([f"'{item}'" for item in requires])
        requires_code = f".requires([{requires_items}])\n  "
    
    # Construire les recommends
    recommends_code = ""
    if recommends:
        recommends_items = ", ".join([f"'{item}'" for item in recommends])
        recommends_code = f".recommends([{recommends_items}])\n  "
    
    code = f'''import {{ createPlugin }} from '../builder/plugin-builder.js'
import {{ getVersion }} from '../versions.js'
import type {{ ProjectContext, ConfigResult, InstallResult }} from '../../types/index.js'
import {{ installPackages }} from '../../utils/package-manager.js'
import {{ ConfigWriter }} from '../../core/config-writer.js'
import {{ BackupManager }} from '../../core/backup-manager.js'

/**
 * Plugin {display_name}
 *
 * {description}
 * Documentation officielle : https://www.npmjs.com/package/{name}
 */
export const {metadata['name'].replace('@', '').replace('/', '')}Plugin = createPlugin()
  .named('{name}', '{display_name}', '{description}')
  .forFrameworks([{frameworks_code}])
  .inCategory('{category}')
  .withVersion(getVersion('{name}')!)
  {incompat_code}{requires_code}{recommends_code}.withDetect((ctx) => {{
    return ctx.dependencies['{name}'] !== undefined
  }})
  .withInstall(async (ctx) => {{
    const backupManager = new BackupManager()
    const packages = ['{name}@' + getVersion('{name}')]
    
    try {{
      await installPackages(ctx, packages)
      return {{ success: true }}
    }} catch (error) {{
      return {{ success: false, message: String(error) }}
    }}
  }})
  .withConfigure(async (ctx) => {{
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)
    const files: ConfigResult['files'] = []
    
    try {{
      // Configuration de base pour {name}
      // À personnaliser selon les besoins du plugin
      
      return {{ files, success: true }}
    }} catch (error) {{
      return {{ success: false, message: String(error) }}
    }}
  }})
  .build()
'''
    
    return code

def main():
    """Fonction principale."""
    print(f"🔍 Recherche des plugins à migrer...")
    
    plugins = find_all_plugins()
    print(f"✅ Found {len(plugins)} plugins à migrer")
    
    if not plugins:
        print("ℹ️  Aucun plugin à migrer!")
        return 0
    
    # Trier par catégorie
    by_category = {}
    for plugin_name, plugin_path in sorted(plugins.items()):
        category = plugin_path.parent.name
        if category not in by_category:
            by_category[category] = []
        by_category[category].append((plugin_name, plugin_path))
    
    # Afficher le résumé
    print("\n📋 Plugins à migrer par catégorie:")
    total = 0
    for category in sorted(by_category.keys()):
        plugins_list = by_category[category]
        print(f"  {category}: {len(plugins_list)} plugins")
        for name, _ in plugins_list:
            print(f"    - {name}")
        total += len(plugins_list)
    
    print(f"\n📊 Total: {total} plugins")
    print("\n💡 Exécutez: python scripts/migrate-plugins.py --generate")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--generate":
        print("\n🚀 Génération des fichiers -builder.ts...")
        generated = 0
        
        for plugin_name, plugin_path in plugins.items():
            # Lire le contenu du plugin
            content = plugin_path.read_text()
            
            # Extraire les métadonnées
            metadata = extract_plugin_metadata(content)
            
            # Générer le code
            builder_code = generate_builder_code(metadata, plugin_path)
            
            # Créer le fichier -builder.ts
            builder_path = plugin_path.parent / f"{plugin_name}-builder.ts"
            builder_path.write_text(builder_code)
            
            generated += 1
            print(f"  ✅ {plugin_name} ({plugin_path.parent.name})")
        
        print(f"\n✨ Généré {generated} fichiers -builder.ts")
        return 0
    
    return 1

if __name__ == "__main__":
    sys.exit(main())
