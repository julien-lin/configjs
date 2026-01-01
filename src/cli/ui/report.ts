import type { InstallationReport } from '../../types/index.js'
import type { Plugin } from '../../types/index.js'
import type { SupportedLanguage } from '../i18n/types.js'
import { getTranslations } from '../i18n/index.js'

/**
 * Affiche le rapport final d'installation
 *
 * @param report - Rapport d'installation
 * @param plugins - Plugins installés
 * @param lang - Langue pour les traductions
 */
export function displayInstallationReport(
  report: InstallationReport,
  plugins: Plugin[],
  lang: SupportedLanguage
): void {
  const t = getTranslations(lang)

  console.log(`\n${t.report.title}`)
  if (report.duration > 0) {
    const durationSeconds = (report.duration / 1000).toFixed(1)
    console.log(`   (${durationSeconds}s)\n`)
  } else {
    console.log('')
  }

  // Packages installés
  if (report.installed.length > 0) {
    console.log(`${t.report.packagesInstalled}:`)
    for (const pluginName of report.installed) {
      const plugin = plugins.find((p) => p.name === pluginName)
      const version = plugin?.version ? ` (${plugin.version})` : ''
      console.log(`   ✓ ${plugin?.displayName || pluginName}${version}`)
    }
    console.log('')
  }

  // Fichiers créés
  const createdFiles = report.filesCreated.filter((f) => f.type === 'create')
  if (createdFiles.length > 0) {
    console.log(`${t.report.filesCreated}:`)
    for (const file of createdFiles) {
      console.log(`   • ${file.path}`)
    }
    console.log('')
  }

  // Fichiers modifiés
  const modifiedFiles = report.filesCreated.filter((f) => f.type === 'modify')
  if (modifiedFiles.length > 0) {
    console.log(`${t.report.filesModified}:`)
    for (const file of modifiedFiles) {
      console.log(`   • ${file.path}`)
    }
    console.log('')
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log(`⚠️  ${report.warnings.length} warning(s):`)
    for (const warning of report.warnings) {
      console.log(`   ⚠ ${warning.message}`)
      if (warning.plugins && warning.plugins.length > 0) {
        console.log(`     Plugins: ${warning.plugins.join(', ')}`)
      }
    }
    console.log('')
  }

  // Prochaines étapes
  displayNextSteps(lang)
}

/**
 * Affiche les prochaines étapes après installation
 *
 * @param lang - Langue pour les traductions
 */
function displayNextSteps(lang: SupportedLanguage): void {
  const t = getTranslations(lang)

  console.log(`${t.report.nextSteps}:`)
  console.log('   1. npm run dev')
  console.log('   2. Visitez http://localhost:5173')
  console.log('   3. Consultez la documentation dans src/')
  console.log('')
}

/**
 * Affiche un résumé simple de l'installation
 *
 * @param report - Rapport d'installation
 * @param lang - Langue pour les traductions
 */
export function displaySimpleReport(
  report: InstallationReport,
  lang: SupportedLanguage
): void {
  const t = getTranslations(lang)

  if (report.success) {
    console.log(`\n${t.installation.success}`)
    console.log(`   ${report.installed.length} plugin(s) installé(s)`)
    if (report.warnings.length > 0) {
      console.log(`   ⚠️  ${report.warnings.length} warning(s)`)
    }
  } else {
    console.log(`\n${t.installation.error}`)
  }
}
