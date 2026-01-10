import type { CLIOptions } from '../../types/index.js'
import { detectContext, DetectionError } from '../../core/detector.js'
import { pluginRegistry } from '../../plugins/registry.js'
import { promptLanguage } from '../prompts/language.js'
import { promptPluginSelection } from '../prompts/select-plugins.js'
import { promptConfirmation } from '../prompts/confirm.js'
import { promptViteSetup } from '../prompts/vite-setup.js'
import { createViteProject } from '../utils/vite-installer.js'
import { getTranslations } from '../i18n/index.js'
import { logger } from '../../utils/logger.js'
import { Installer } from '../../core/installer.js'
import {
  CompatibilityValidator,
  compatibilityRules,
} from '../../core/validator.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import { SpinnerManager } from '../ui/spinner.js'
import { displayInstallationReport } from '../ui/report.js'
import pc from 'picocolors'

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

    console.log()
    console.log(pc.bold(pc.cyan(`🔍 ${t.detection.detecting}`)))

    // 2. Détection du contexte
    let projectRoot = process.cwd()
    let ctx

    try {
      ctx = await detectContext(projectRoot)
    } catch (error) {
      // Si React n'est pas détecté, proposer de créer un projet Vite
      if (error instanceof DetectionError) {
        console.log()
        console.log(pc.yellow(t.vite.noReactDetected))
        console.log()

        const viteOptions = await promptViteSetup(language)

        if (!viteOptions) {
          console.log()
          console.log(pc.gray(t.common.cancel))
          return
        }

        // Créer le projet Vite
        const newProjectPath = await createViteProject(
          viteOptions,
          projectRoot,
          language
        )

        // Changer vers le nouveau répertoire
        process.chdir(newProjectPath)
        projectRoot = newProjectPath

        console.log()

        // Réessayer la détection du contexte
        ctx = await detectContext(projectRoot)
      } else {
        throw error
      }
    }

    // Afficher le contexte détecté
    console.log(
      pc.green(`   ✓ ${t.detection.framework}: `) +
        pc.bold(`${ctx.framework} ${pc.gray(ctx.frameworkVersion)}`)
    )
    console.log(
      pc.green(`   ✓ ${t.detection.typescript}: `) +
        pc.bold(ctx.typescript ? 'Oui' : 'Non')
    )
    if (ctx.bundler) {
      console.log(
        pc.green(`   ✓ ${t.detection.bundler}: `) +
          pc.bold(`${ctx.bundler} ${pc.gray(ctx.bundlerVersion || '')}`)
      )
    }
    console.log(
      pc.green(`   ✓ ${t.detection.packageManager}: `) +
        pc.bold(ctx.packageManager)
    )
    console.log()

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
      console.log()
      console.log(pc.yellow(`⚠️  ${t.common.selected(0)}`))
      console.log(pc.gray('Exiting...'))
      return
    }

    console.log()
    console.log(
      pc.bold(pc.green(`✓ ${t.common.selected(selectedPlugins.length)}`))
    )
    console.log()

    // 4. Confirmation (sauf si --yes ou --silent)
    if (!options.yes && !options.silent) {
      const confirmed = await promptConfirmation(selectedPlugins, language)
      if (!confirmed) {
        console.log(t.common.cancel)
        return
      }
    }

    // 5. Mode Dry-Run (simulation détaillée)
    if (options.dryRun) {
      console.log()
      console.log(pc.bold(pc.yellow('━'.repeat(60))))
      console.log(pc.bold(pc.yellow('🔍 MODE DRY-RUN (simulation uniquement)')))
      console.log(pc.bold(pc.yellow('━'.repeat(60))))
      console.log()
      console.log(pc.bold(pc.cyan('📦 Packages à installer :')))
      for (const plugin of selectedPlugins) {
        console.log(
          pc.blue(`   • ${plugin.displayName}`) +
            pc.gray(
              ` (${plugin.name}${plugin.version ? `@${plugin.version}` : ''})`
            )
        )
      }
      console.log()
      console.log(pc.bold(pc.cyan('📝 Fichiers qui seraient créés/modifiés :')))
      for (const plugin of selectedPlugins) {
        console.log(pc.gray(`   • ${plugin.displayName} configuration`))
      }
      console.log()
      console.log(
        pc.yellow("⚠️  Aucune modification n'a été effectuée (dry-run)")
      )
      console.log(
        pc.cyan('💡 Exécutez sans --dry-run pour appliquer les changements')
      )
      console.log()
      return
    }

    // Créer les dépendances nécessaires pour Installer
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(compatibilityRules)
    const installer = new Installer(ctx, validator, configWriter, backupManager)

    // Mode --no-install : générer uniquement les configs
    if (options.install === false) {
      console.log()
      console.log(pc.yellow('⚙️  Mode configuration uniquement (--no-install)'))
      console.log(pc.gray('Les packages ne seront PAS installés'))
      console.log()
    }

    // Installation avec spinner
    const spinner = new SpinnerManager()
    spinner.start(t.installation.installing)

    try {
      const result = await installer.install(selectedPlugins, {
        skipPackageInstall: options.install === false,
      })

      spinner.succeed(t.installation.success)

      if (result.success) {
        // Afficher le rapport détaillé
        displayInstallationReport(result, selectedPlugins, language)
      } else {
        console.error(`\n${t.installation.error}`)
        process.exit(1)
      }
    } catch (error) {
      spinner.fail(t.installation.error)
      throw error
    }
  } catch (error) {
    logger.error('Installation failed:', error)
    if (error instanceof Error) {
      console.error(`\n❌ ${error.message}`)
    }
    process.exit(1)
  }
}
