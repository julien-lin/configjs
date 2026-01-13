#!/usr/bin/env python3
"""
Script pour migrer tous les plugins vers l'utilisation de ctx.fsAdapter

Remplacements effectués :
- new BackupManager() → new BackupManager(ctx.fsAdapter)
- new ConfigWriter(backupManager) → new ConfigWriter(backupManager, ctx.fsAdapter)
- ensureDirectory(path) → ensureDirectory(path, ctx.fsAdapter)
- readFileContent(path) → readFileContent(path, 'utf-8', ctx.fsAdapter)
- writeFileContent(path, content) → writeFileContent(path, content, 'utf-8', ctx.fsAdapter)
- checkPathExists(path) → checkPathExists(path, ctx.fsAdapter)
- readPackageJson(path) → readPackageJson(path, ctx.fsAdapter)
- writePackageJson(path, pkg) → writePackageJson(path, pkg, ctx.fsAdapter)
"""

import re
import os
from pathlib import Path

# Dossier des plugins
PLUGINS_DIR = Path(__file__).parent.parent / "src" / "plugins"

# Patterns de remplacement
REPLACEMENTS = [
    # BackupManager (dans configure et rollback)
    (r'new BackupManager\(\)', 'new BackupManager(_ctx?.fsAdapter || ctx?.fsAdapter)'),
    
    # ConfigWriter (dans configure et rollback)
    (r'new ConfigWriter\(backupManager\)', 'new ConfigWriter(backupManager, _ctx?.fsAdapter || ctx?.fsAdapter)'),
    
    # ensureDirectory (dans configure uniquement, pas dans rollback)
    (r'ensureDirectory\(([^,)]+)\)', r'ensureDirectory(\1, ctx.fsAdapter)'),
    
    # readFileContent (dans configure uniquement)
    (r'readFileContent\(([^,)]+)\)', r"readFileContent(\1, 'utf-8', ctx.fsAdapter)"),
    
    # writeFileContent (dans configure uniquement)
    (r'writeFileContent\(([^,)]+),\s*([^,)]+)\)', r"writeFileContent(\1, \2, 'utf-8', ctx.fsAdapter)"),
    
    # checkPathExists (dans configure uniquement)
    (r'checkPathExists\(([^,)]+)\)', r'checkPathExists(\1, ctx.fsAdapter)'),
    
    # readPackageJson (dans configure uniquement)
    (r'readPackageJson\(([^,)]+)\)', r'readPackageJson(\1, ctx.fsAdapter)'),
    
    # writePackageJson (dans configure uniquement)
    (r'writePackageJson\(([^,)]+),\s*([^,)]+)\)', r'writePackageJson(\1, \2, ctx.fsAdapter)'),
]

def migrate_file(file_path: Path) -> bool:
    """Migre un fichier de plugin"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        
        # Appliquer tous les remplacements
        for pattern, replacement in REPLACEMENTS:
            # Vérifier si le pattern existe
            if re.search(pattern, content):
                # Éviter les remplacements déjà faits
                if 'ctx.fsAdapter' not in re.search(pattern, content).group(0):
                    content = re.sub(pattern, replacement, content)
        
        # Ne pas écrire si rien n'a changé
        if content == original_content:
            return False
        
        file_path.write_text(content, encoding='utf-8')
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la migration de {file_path}: {e}")
        return False

def main():
    """Migre tous les fichiers de plugins"""
    migrated_count = 0
    error_count = 0
    
    # Parcourir tous les fichiers .ts dans src/plugins
    for ts_file in PLUGINS_DIR.rglob("*.ts"):
        # Ignorer les fichiers builder et index
        if ts_file.name.endswith('-builder.ts') or ts_file.name == 'index.ts' or ts_file.name == 'registry.ts' or ts_file.name == 'versions.ts':
            continue
        
        print(f"📝 Migration de {ts_file.relative_to(PLUGINS_DIR.parent.parent)}...")
        
        if migrate_file(ts_file):
            migrated_count += 1
            print(f"  ✅ Migré")
        else:
            print(f"  ⏭️  Aucun changement nécessaire")
    
    print(f"\n✅ Migration terminée : {migrated_count} fichier(s) migré(s)")
    if error_count > 0:
        print(f"❌ {error_count} erreur(s)")

if __name__ == "__main__":
    main()
