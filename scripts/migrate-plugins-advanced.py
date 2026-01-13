#!/usr/bin/env python3
"""
Script avancé pour migrer les plugins vers le pattern builder.
Extrait les fonctions install() et configure() et les adapte au builder.
"""

import os
import re
from pathlib import Path
from typing import Dict, Optional, Tuple

PLUGINS_DIR = Path(__file__).parent.parent / "src" / "plugins"
MIGRATED_PLUGINS = {"zustand", "axios", "react-router", "tailwindcss", "prettier"}

def extract_function(content: str, func_name: str) -> Optional[str]:
    """Extrait une fonction async du contenu."""
    # Pattern pour trouver async function ou method
    pattern = rf"async\s+{func_name}\s*\([^)]*\)\s*:\s*Promise<[^>]+>\s*\{{"
    match = re.search(pattern, content)
    if not match:
        return None
    
    # Trouver la position de début
    start = match.start()
    
    # Trouver la position de fin (matching brace)
    brace_count = 0
    in_string = False
    escape = False
    pos = content.find('{', start)
    
    if pos == -1:
        return None
    
    start_brace = pos
    pos += 1
    
    while pos < len(content):
        char = content[pos]
        
        if escape:
            escape = False
            pos += 1
            continue
        
        if char == '\\':
            escape = True
            pos += 1
            continue
        
        if char in ['"', "'", '`']:
            in_string = not in_string
            pos += 1
            continue
        
        if not in_string:
            if char == '{':
                brace_count += 1
            elif char == '}':
                if brace_count == 0:
                    return content[start:pos+1]
                brace_count -= 1
        
        pos += 1
    
    return None

def extract_plugin_metadata(content: str) -> Dict:
    """Extrait les métadonnées d'un plugin."""
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
    
    # Extraire frameworks
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
    
    for category_dir in PLUGINS_DIR.iterdir():
        if not category_dir.is_dir() or category_dir.name in ['builder', 'versions.ts']:
            continue
        
        for plugin_file in category_dir.glob('*.ts'):
            if plugin_file.name.endswith('-builder.ts') or plugin_file.name == 'index.ts':
                continue
            
            plugin_name = plugin_file.stem
            
            if plugin_name in MIGRATED_PLUGINS:
                continue
            
            plugins[plugin_name] = plugin_file
    
    return plugins

def generate_builder_code(metadata: Dict, original_file: Path) -> str:
    """Génère le code du fichier -builder.ts."""
    
    # Lire le contenu original pour extraire les fonctions
    original_content = original_file.read_text()
    
    # Extraire les fonctions
    detect_func = extract_function(original_content, "detect")
    install_func = extract_function(original_content, "install")
    configure_func = extract_function(original_content, "configure")
    
    name = metadata['name']
    display_name = metadata['displayName']
    description = metadata['description']
    category = metadata['category']
    
    # Construire les frameworks
    frameworks_code = ", ".join([f"'{fw}'" for fw in metadata['frameworks']])
    
    # Construire les incompatibilités
    incompat_code = ""
    if metadata['incompatibleWith']:
        incompat_items = ", ".join([f"'{item}'" for item in metadata['incompatibleWith']])
        incompat_code = f".incompatibleWith([{incompat_items}])\n  "
    
    # Construire les requires
    requires_code = ""
    if metadata['requires']:
        requires_items = ", ".join([f"'{item}'" for item in metadata['requires']])
        requires_code = f".requires([{requires_items}])\n  "
    
    # Construire les recommends
    recommends_code = ""
    if metadata['recommends']:
        recommends_items = ", ".join([f"'{item}'" for item in metadata['recommends']])
        recommends_code = f".recommends([{recommends_items}])\n  "
    
    # Construire la fonction detect
    detect_code = ""
    if detect_func:
        # Extraire juste le contenu de la fonction
        detect_body = re.search(r"async\s+detect\s*\([^)]*\)[^{]*\{(.*)\}", detect_func, re.DOTALL)
        if detect_body:
            detect_content = detect_body.group(1).strip()
            detect_code = f".withDetect((ctx) => {{\n    {detect_content}\n  }})\n  "
    else:
        detect_code = f".withDetect((ctx) => {{\n    return ctx.dependencies['{name}'] !== undefined\n  }})\n  "
    
    # Construire la fonction install
    install_code = ""
    if install_func:
        install_body = re.search(r"async\s+install\s*\([^)]*\)[^{]*\{(.*)\}", install_func, re.DOTALL)
        if install_body:
            install_content = install_body.group(1).strip()
            install_code = f".withInstall(async (ctx) => {{\n    {install_content}\n  }})\n  "
    else:
        install_code = f".withInstall(async (ctx) => {{\n    const packages = ['{name}@' + getVersion('{name}')]\n    try {{\n      await installPackages(ctx, packages)\n      return {{ success: true }}\n    }} catch (error) {{\n      return {{ success: false, message: String(error) }}\n    }}\n  }})\n  "
    
    # Construire la fonction configure
    configure_code = ""
    if configure_func:
        configure_body = re.search(r"async\s+configure\s*\([^)]*\)[^{]*\{(.*)\}", configure_func, re.DOTALL)
        if configure_body:
            configure_content = configure_body.group(1).strip()
            configure_code = f".withConfigure(async (ctx) => {{\n    {configure_content}\n  }})\n  "
    else:
        configure_code = f".withConfigure(async (ctx) => {{\n    const backupManager = new BackupManager()\n    const writer = new ConfigWriter(backupManager)\n    const files = []\n    try {{\n      // Configuration de base pour {name}\n      return {{ files, success: true }}\n    }} catch (error) {{\n      return {{ success: false, message: String(error) }}\n    }}\n  }})\n  "
    
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
  {incompat_code}{requires_code}{recommends_code}{detect_code}{install_code}{configure_code}.build()
'''
    
    return code

def main():
    """Fonction principale."""
    print("🚀 Génération des fichiers -builder.ts...")
    
    plugins = find_all_plugins()
    print(f"📦 Migrating {len(plugins)} plugins\n")
    
    generated = 0
    for plugin_name in sorted(plugins.keys()):
        plugin_path = plugins[plugin_name]
        
        try:
            content = plugin_path.read_text()
            metadata = extract_plugin_metadata(content)
            builder_code = generate_builder_code(metadata, plugin_path)
            
            builder_path = plugin_path.parent / f"{plugin_name}-builder.ts"
            builder_path.write_text(builder_code)
            
            generated += 1
            print(f"  ✅ {plugin_name:30} ({plugin_path.parent.name})")
        except Exception as e:
            print(f"  ❌ {plugin_name:30} - {str(e)}")
    
    print(f"\n✨ Généré {generated}/{len(plugins)} fichiers -builder.ts")
    return 0 if generated == len(plugins) else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
