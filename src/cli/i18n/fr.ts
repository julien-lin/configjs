import type { Translations } from './types.js'

export const fr: Translations = {
  language: {
    select: 'Choisissez votre langue',
    options: [
      { value: 'fr', name: 'Français' },
      { value: 'en', name: 'English' },
      { value: 'es', name: 'Español' },
    ],
  },
  common: {
    continue: 'Continuer',
    cancel: 'Annuler',
    back: 'Retour',
    none: 'Aucun',
    selected: (count: number) =>
      count === 0
        ? 'Aucune bibliothèque sélectionnée'
        : count === 1
          ? '1 bibliothèque sélectionnée'
          : `${count} bibliothèques sélectionnées`,
  },
  plugins: {
    selectCategory: (category: string) =>
      `Sélectionnez vos bibliothèques : ${category}`,
    selectMultiple: 'Sélection multiple',
    pressSpace: 'Appuyez sur <espace> pour sélectionner',
    pressEnter: 'Appuyez sur <entrée> pour valider',
    description: 'Description',
  },
  detection: {
    detecting: '🔍 Détection du contexte...',
    framework: 'Framework',
    typescript: 'TypeScript',
    bundler: 'Bundler',
    packageManager: 'Gestionnaire de paquets',
  },
  confirmation: {
    summary: "📋 Résumé de l'installation",
    packagesToInstall: '📦 Packages à installer',
    filesToCreate: '📝 Fichiers qui seront créés',
    filesToModify: '📝 Fichiers qui seront modifiés',
    continueQuestion: "Continuer avec l'installation ?",
  },
  installation: {
    installing: 'Installation en cours...',
    configuring: 'Configuration en cours...',
    success: '✨ Installation terminée !',
    error: "❌ Erreur lors de l'installation",
    rollback: '↺ Rollback en cours...',
  },
  report: {
    title: '✨ Installation terminée !',
    packagesInstalled: '📦 Packages installés',
    filesCreated: '📝 Fichiers créés',
    filesModified: '📝 Fichiers modifiés',
    nextSteps: '🚀 Prochaines étapes',
  },
  errors: {
    detectionFailed: 'Échec de la détection du contexte',
    installationFailed: "Échec de l'installation",
    validationFailed: 'Échec de la validation',
    incompatiblePlugins: (plugins: string[]) =>
      `Plugins incompatibles détectés : ${plugins.join(', ')}`,
  },
}
