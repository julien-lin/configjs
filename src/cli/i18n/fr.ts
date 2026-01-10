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
  vite: {
    noReactDetected:
      '⚠️  Aucun projet React détecté dans le répertoire actuel.',
    proposeSetup: 'Souhaitez-vous créer un nouveau projet React avec Vite ?',
    projectName: 'Nom du projet',
    projectNamePlaceholder: 'mon-projet-react',
    template: 'Template',
    templateOptions: [
      { value: 'react', name: 'React (JavaScript)' },
      { value: 'react-ts', name: 'React (TypeScript)' },
    ],
    creating: 'Création du projet React avec Vite...',
    success: '✅ Projet créé avec succès !',
    error: '❌ Erreur lors de la création du projet',
    changingDirectory: 'Changement vers le répertoire du projet...',
    validation: {
      empty: 'Le nom du projet ne peut pas être vide',
      invalid:
        'Le nom du projet ne peut contenir que des lettres, chiffres, tirets et underscores',
    },
    folderExists: (name: string) =>
      `Le dossier "${name}" existe déjà. Veuillez choisir un autre nom.`,
  },
  nextjs: {
    noNextjsDetected:
      '⚠️  Aucun projet Next.js détecté dans le répertoire actuel.',
    proposeSetup: 'Souhaitez-vous créer un nouveau projet Next.js ?',
    projectName: 'Nom du projet',
    projectNamePlaceholder: 'mon-projet-nextjs',
    typescript: 'Utiliser TypeScript ?',
    eslint: 'Utiliser ESLint ?',
    tailwind: 'Utiliser TailwindCSS ?',
    srcDir: 'Utiliser le dossier src/ ?',
    appRouter: 'Utiliser App Router (recommandé) ?',
    importAlias: "Alias d'import (ex: @/*)",
    creating: 'Création du projet Next.js...',
    success: '✅ Projet créé avec succès !',
    error: '❌ Erreur lors de la création du projet',
    changingDirectory: 'Changement vers le répertoire du projet...',
    validation: {
      empty: 'Le nom du projet ne peut pas être vide',
      invalid:
        'Le nom du projet ne peut contenir que des lettres, chiffres, tirets et underscores',
    },
    folderExists: (name: string) =>
      `Le dossier "${name}" existe déjà. Veuillez choisir un autre nom.`,
  },
  vue: {
    noVueDetected: '⚠️  Aucun projet Vue.js détecté dans le répertoire actuel.',
    proposeSetup: 'Souhaitez-vous créer un nouveau projet Vue.js avec Vite ?',
    projectName: 'Nom du projet',
    projectNamePlaceholder: 'mon-projet-vue',
    typescript: 'Utiliser TypeScript ?',
    router: 'Utiliser Vue Router ?',
    pinia: 'Utiliser Pinia (state management) ?',
    vitest: 'Utiliser Vitest (testing) ?',
    eslint: 'Utiliser ESLint ?',
    prettier: 'Utiliser Prettier ?',
    creating: 'Création du projet Vue.js avec Vite...',
    success: '✅ Projet créé avec succès !',
    error: '❌ Erreur lors de la création du projet',
    changingDirectory: 'Changement vers le répertoire du projet...',
    validation: {
      empty: 'Le nom du projet ne peut pas être vide',
      invalid:
        'Le nom du projet ne peut contenir que des lettres, chiffres, tirets et underscores',
    },
    folderExists: (name: string) =>
      `Le dossier "${name}" existe déjà. Veuillez choisir un autre nom.`,
  },
}
