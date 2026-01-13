import type { CLIOptions } from '../../types/index.js'
import type { ProjectContext, Plugin, Framework } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { pluginRegistry } from '../../plugins/registry.js'
import { promptLanguage } from '../prompts/language.js'
import { promptPluginSelection } from '../prompts/select-plugins.js'
import { promptConfirmation } from '../prompts/confirm.js'
import { getTranslations } from '../i18n/index.js'
import { logger } from '../../utils/logger.js'
import { Installer } from '../../core/installer.js'
import {
  CompatibilityValidator,
  allCompatibilityRules,
} from '../../core/validator.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import { SpinnerManager } from '../ui/spinner.js'
import { displayInstallationReport } from '../ui/report.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'
import pc from 'picocolors'

/**
 * Classe abstraite de base pour les commandes d'installation de framework
 *
 * Cette classe centralise toute la logique commune entre les commandes
 * install-react, install-nextjs, install-vue, etc.
 *
 * Pour ajouter un nouveau framework, il suffit d'étendre cette classe
 * et d'implémenter les méthodes abstraites.
 *
 * @example
 * ```typescript
 * class VueCommand extends BaseFrameworkCommand {
 *   protected getFramework(): Framework {
 *     return 'vue'
 *   }
 *
 *   protected async getOrCreateContext(
 *     projectRoot: string,
 *     language: SupportedLanguage
 *   ): Promise<ProjectContext> {
 *     // Logique spécifique Vue.js
 *   }
 * }
 * ```
 */
export abstract class BaseFrameworkCommand {
  /**
   * Retourne le framework géré par cette commande
   */
  protected abstract getFramework(): Framework

  /**
   * Obtient ou crée le contexte du projet
   *
   * Si le framework n'est pas détecté, cette méthode doit :
   * 1. Proposer de créer un nouveau projet
   * 2. Créer le projet si l'utilisateur accepte
   * 3. Retourner le contexte du projet créé
   *
   * @param projectRoot - Chemin racine du projet
   * @param language - Langue sélectionnée
   * @returns Contexte du projet
   */
  protected abstract getOrCreateContext(
    projectRoot: string,
    language: SupportedLanguage
  ): Promise<ProjectContext>

  /**
   * Affiche les informations spécifiques du contexte détecté
   *
   * Permet d'afficher des informations spécifiques au framework
   * (ex: Vue version, Next.js router type, etc.)
   *
   * @param _ctx - Contexte du projet
   * @param _t - Traductions
   */
  protected displayFrameworkSpecificInfo(
    _ctx: ProjectContext,
    _t: ReturnType<typeof getTranslations>
  ): void {
    // Par défaut, n'affiche rien
    // Les sous-classes peuvent override cette méthode
  }

  /**
   * Vérifie que le framework détecté correspond au framework attendu
   *
   * @param ctx - Contexte du projet
   * @returns true si le framework correspond
   */
  protected validateFramework(ctx: ProjectContext): boolean {
    return ctx.framework === this.getFramework()
  }

  /**
   * Affiche un message d'avertissement si le framework ne correspond pas
   *
   * @param ctx - Contexte du projet
   * @param _t - Traductions
   */
  protected displayFrameworkMismatchWarning(
    ctx: ProjectContext,
    _t: ReturnType<typeof getTranslations>
  ): void {
    const framework = this.getFramework()
    const metadata = getFrameworkMetadata(framework)

    console.log()
    console.log(
      pc.yellow(
        `⚠️  Framework détecté: ${ctx.framework}. Cette commande est destinée aux projets ${metadata?.displayName || framework}.`
      )
    )
    console.log(
      pc.gray(
        `Utilisez "npx @configjs/cli ${ctx.framework}" pour les projets ${ctx.framework}.`
      )
    )
    console.log()
  }

  /**
   * Affiche le contexte détecté
   *
   * @param ctx - Contexte du projet
   * @param t - Traductions
   */
  protected displayDetectedContext(
    ctx: ProjectContext,
    t: ReturnType<typeof getTranslations>
  ): void {
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

    // Afficher les informations spécifiques au framework
    this.displayFrameworkSpecificInfo(ctx, t)

    console.log()
  }

  /**
   * Sélectionne les plugins à installer
   *
   * @param ctx - Contexte du projet
   * @param language - Langue sélectionnée
   * @param options - Options CLI
   * @returns Liste des plugins sélectionnés
   */
  protected async selectPlugins(
    ctx: ProjectContext,
    language: SupportedLanguage,
    options: CLIOptions
  ): Promise<Plugin[]> {
    if (options.yes) {
      // Mode --yes : utiliser les recommandations par défaut
      logger.info('Using default recommendations (--yes mode)')
      // TODO: Implémenter la logique de recommandations par défaut
      return []
    }

    // Mode interactif : prompts
    return promptPluginSelection(ctx, pluginRegistry, language)
  }

  /**
   * Demande confirmation avant installation
   *
   * @param selectedPlugins - Plugins sélectionnés
   * @param language - Langue sélectionnée
   * @param options - Options CLI
   * @returns true si l'utilisateur confirme
   */
  protected async confirmInstallation(
    selectedPlugins: Plugin[],
    language: SupportedLanguage,
    options: CLIOptions
  ): Promise<boolean> {
    if (options.yes || options.silent) {
      return true
    }

    return promptConfirmation(selectedPlugins, language)
  }

  /**
   * Gère le mode dry-run
   *
   * @param selectedPlugins - Plugins sélectionnés
   * @param options - Options CLI
   */
  protected handleDryRun(
    selectedPlugins: Plugin[],
    options: CLIOptions
  ): boolean {
    if (!options.dryRun) {
      return false
    }

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

    return true
  }

  /**
   * Effectue l'installation des plugins
   *
   * @param ctx - Contexte du projet
   * @param selectedPlugins - Plugins sélectionnés
   * @param language - Langue sélectionnée
   * @param options - Options CLI
   */
  protected async performInstallation(
    ctx: ProjectContext,
    selectedPlugins: Plugin[],
    language: SupportedLanguage,
    options: CLIOptions
  ): Promise<void> {
    const t = getTranslations(language)

    // Créer les dépendances nécessaires pour Installer
    const backupManager = new BackupManager()
    const configWriter = new ConfigWriter(backupManager)
    const validator = new CompatibilityValidator(allCompatibilityRules)
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
  }

  /**
   * Méthode principale d'exécution de la commande
   *
   * Cette méthode orchestre toute la logique commune :
   * 1. Sélection de la langue
   * 2. Détection/création du contexte
   * 3. Validation du framework
   * 4. Affichage du contexte
   * 5. Sélection des plugins
   * 6. Confirmation
   * 7. Installation
   *
   * @param options - Options CLI
   */
  async execute(options: CLIOptions): Promise<void> {
    try {
      // 1. Sélection de la langue (première question)
      const language = await promptLanguage()
      const t = getTranslations(language)

      console.log()
      console.log(pc.bold(pc.cyan(`🔍 ${t.detection.detecting}`)))

      // 2. Détection/création du contexte
      const projectRoot = process.cwd()
      const ctx = await this.getOrCreateContext(projectRoot, language)

      // 3. Validation du framework
      if (!this.validateFramework(ctx)) {
        this.displayFrameworkMismatchWarning(ctx, t)
        return
      }

      // 4. Affichage du contexte détecté
      this.displayDetectedContext(ctx, t)

      // 5. Sélection des plugins
      const selectedPlugins = await this.selectPlugins(ctx, language, options)

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

      // 6. Confirmation
      const confirmed = await this.confirmInstallation(
        selectedPlugins,
        language,
        options
      )

      if (!confirmed) {
        console.log()
        console.log(pc.gray(t.common.cancel))
        return
      }

      // 7. Mode dry-run
      if (this.handleDryRun(selectedPlugins, options)) {
        return
      }

      // 8. Installation
      await this.performInstallation(ctx, selectedPlugins, language, options)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(`Fatal error: ${errorMessage}`)
      console.error('Fatal error:', errorMessage)
      process.exit(1)
    }
  }
}
