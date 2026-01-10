/**
 * Types pour l'internationalisation
 */

export type SupportedLanguage = 'fr' | 'en' | 'es'

export interface Translations {
  language: {
    select: string
    options: Array<{ value: SupportedLanguage; name: string }>
  }
  common: {
    continue: string
    cancel: string
    back: string
    none: string
    selected: (count: number) => string
  }
  plugins: {
    selectCategory: (category: string) => string
    selectMultiple: string
    pressSpace: string
    pressEnter: string
    description: string
  }
  detection: {
    detecting: string
    framework: string
    typescript: string
    bundler: string
    packageManager: string
  }
  confirmation: {
    summary: string
    packagesToInstall: string
    filesToCreate: string
    filesToModify: string
    continueQuestion: string
  }
  installation: {
    installing: string
    configuring: string
    success: string
    error: string
    rollback: string
  }
  report: {
    title: string
    packagesInstalled: string
    filesCreated: string
    filesModified: string
    nextSteps: string
  }
  errors: {
    detectionFailed: string
    installationFailed: string
    validationFailed: string
    incompatiblePlugins: (plugins: string[]) => string
  }
  vite: {
    noReactDetected: string
    proposeSetup: string
    projectName: string
    projectNamePlaceholder: string
    template: string
    templateOptions: Array<{ value: string; name: string }>
    creating: string
    success: string
    error: string
    changingDirectory: string
    validation: {
      empty: string
      invalid: string
    }
    folderExists: (name: string) => string
  }
}
