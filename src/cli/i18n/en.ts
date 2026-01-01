import type { Translations } from './types.js'

export const en: Translations = {
  language: {
    select: 'Choose your language',
    options: [
      { value: 'fr', name: 'Français' },
      { value: 'en', name: 'English' },
      { value: 'es', name: 'Español' },
    ],
  },
  common: {
    continue: 'Continue',
    cancel: 'Cancel',
    back: 'Back',
    none: 'None',
    selected: (count: number) =>
      count === 0
        ? 'No library selected'
        : count === 1
          ? '1 library selected'
          : `${count} libraries selected`,
  },
  plugins: {
    selectCategory: (category: string) => `Select your libraries: ${category}`,
    selectMultiple: 'Multiple selection',
    pressSpace: 'Press <space> to select',
    pressEnter: 'Press <enter> to confirm',
    description: 'Description',
  },
  detection: {
    detecting: '🔍 Detecting context...',
    framework: 'Framework',
    typescript: 'TypeScript',
    bundler: 'Bundler',
    packageManager: 'Package manager',
  },
  confirmation: {
    summary: '📋 Installation Summary',
    packagesToInstall: '📦 Packages to install',
    filesToCreate: '📝 Files that will be created',
    filesToModify: '📝 Files that will be modified',
    continueQuestion: 'Continue with installation?',
  },
  installation: {
    installing: 'Installing...',
    configuring: 'Configuring...',
    success: '✨ Installation completed!',
    error: '❌ Installation error',
    rollback: '↺ Rolling back...',
  },
  report: {
    title: '✨ Installation completed!',
    packagesInstalled: '📦 Installed packages',
    filesCreated: '📝 Created files',
    filesModified: '📝 Modified files',
    nextSteps: '🚀 Next steps',
  },
  errors: {
    detectionFailed: 'Context detection failed',
    installationFailed: 'Installation failed',
    validationFailed: 'Validation failed',
    incompatiblePlugins: (plugins: string[]) =>
      `Incompatible plugins detected: ${plugins.join(', ')}`,
  },
}
