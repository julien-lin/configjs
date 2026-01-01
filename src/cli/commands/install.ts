import type { CLIOptions } from '../../types/index.js'
import { detectContext } from '../../core/detector.js'
import { pluginRegistry } from '../../plugins/registry.js'
import { promptLanguage } from '../prompts/language.js'
import { promptPluginSelection } from '../prompts/select-plugins.js'
import { promptConfirmation } from '../prompts/confirm.js'
import { getTranslations } from '../i18n/index.js'
import { logger } from '../../utils/logger.js'
import { Installer } from '../../core/installer.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../core/validator.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'

/**
 * Commande d'installation pour React
 *
 * @param options - Options CLI
 */
export async function installReact(options: CLIOptions): Promise<void> {
  try {
    // 1. Sélection de la langue (première question)
    const language = await promptLanguage()
    const t = getTranslations(language)

    console.log(`\n${t.detection.detecting}`)

    // 2. Détection du contexte
    const projectRoot = process.cwd()
    const ctx = await detectContext(projectRoot)

    // Afficher le contexte détecté
    console.log(
      `   ✓ ${t.detection.framework}: ${ctx.framework} ${ctx.frameworkVersion}`
    )
    console.log(
      `   ✓ ${t.detection.typescript}: ${ctx.typescript ? 'Oui' : 'Non'}`
    )
    if (ctx.bundler) {
      console.log(
        `   ✓ ${t.detection.bundler}: ${ctx.bundler} ${ctx.bundlerVersion || ''}`
      )
    }
    console.log(`   ✓ ${t.detection.packageManager}: ${ctx.packageManager}\n`)

    // 3. Sélection des plugins (sauf si --yes)
    let selectedPlugins: (typeof pluginRegistry)[number][] = []

    if (options.yes) {
      // Mode --yes : utiliser les recommandations par défaut
      logger.info('Using default recommendations (--yes mode)')
      // TODO: Implémenter la logique de recommandations par défaut
    } else {
      // Mode interactif : prompts
      selectedPlugins = await promptPluginSelection(
        ctx,
        pluginRegistry,
        language
      )
    }

    if (selectedPlugins.length === 0) {
      console.log(`\n${t.common.selected(0)}`)
      console.log('Exiting...')
      return
    }

    console.log(`\n${t.common.selected(selectedPlugins.length)}`)

    // 4. Confirmation (sauf si --yes ou --silent)
    if (!options.yes && !options.silent) {
      const confirmed = await promptConfirmation(selectedPlugins, language)
      if (!confirmed) {
        console.log(t.common.cancel)
        return
      }
    }

    // 5. Installation
    if (options.dryRun) {
      console.log('\n🔍 Dry-run mode: No changes will be made')
      console.log(`Would install ${selectedPlugins.length} plugins:`)
      for (const plugin of selectedPlugins) {
        console.log(`  - ${plugin.displayName}`)
      }
      return
    }

    console.log(`\n${t.installation.installing}`)

    // Créer les dépendances nécessaires pour Installer
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)

    const installer = new Installer(ctx, validator, configWriter, backupManager)
    const result = await installer.install(selectedPlugins)

    if (result.success) {
      console.log(`\n${t.installation.success}`)
      console.log(`\n${t.report.packagesInstalled}:`)
      for (const pluginName of result.installed) {
        console.log(`   ✓ ${pluginName}`)
      }
      if (result.warnings.length > 0) {
        console.log(`\n⚠️  ${result.warnings.length} warning(s):`)
        for (const warning of result.warnings) {
          console.log(`   ⚠ ${warning.message}`)
        }
      }
    } else {
      console.error(`\n${t.installation.error}`)
      process.exit(1)
    }
  } catch (error) {
    logger.error('Installation failed:', error)
    if (error instanceof Error) {
      console.error(`\n❌ ${error.message}`)
    }
    process.exit(1)
  }
}
