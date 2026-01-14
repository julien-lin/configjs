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
  vite: {
    noReactDetected: '⚠️  No React project detected in the current directory.',
    proposeSetup: 'Would you like to create a new React project with Vite?',
    projectName: 'Project name',
    projectNamePlaceholder: 'my-react-project',
    typescript: 'Use TypeScript?',
    template: 'Template',
    templateOptions: [
      { value: 'react', name: 'React (JavaScript)' },
      { value: 'react-ts', name: 'React (TypeScript)' },
    ],
    creating: 'Creating React project with Vite...',
    success: '✅ Project created successfully!',
    error: '❌ Error creating project',
    changingDirectory: 'Changing to project directory...',
    validation: {
      empty: 'Project name cannot be empty',
      invalid:
        'Project name can only contain letters, numbers, dashes and underscores',
    },
    folderExists: (name: string) =>
      `Folder "${name}" already exists. Please choose another name.`,
  },
  nextjs: {
    noNextjsDetected:
      '⚠️  No Next.js project detected in the current directory.',
    proposeSetup: 'Would you like to create a new Next.js project?',
    projectName: 'Project name',
    projectNamePlaceholder: 'my-nextjs-project',
    typescript: 'Use TypeScript?',
    eslint: 'Use ESLint?',
    tailwind: 'Use TailwindCSS?',
    srcDir: 'Use src/ directory?',
    appRouter: 'Use App Router (recommended)?',
    importAlias: 'Import alias (e.g. @/*)',
    creating: 'Creating Next.js project...',
    success: '✅ Project created successfully!',
    error: '❌ Error creating project',
    changingDirectory: 'Changing to project directory...',
    validation: {
      empty: 'Project name cannot be empty',
      invalid:
        'Project name can only contain letters, numbers, dashes and underscores',
    },
    folderExists: (name: string) =>
      `Folder "${name}" already exists. Please choose another name.`,
  },
  vue: {
    noVueDetected: '⚠️  No Vue.js project detected in the current directory.',
    proposeSetup: 'Would you like to create a new Vue.js project with Vite?',
    projectName: 'Project name',
    projectNamePlaceholder: 'my-vue-project',
    typescript: 'Use TypeScript?',
    router: 'Use Vue Router?',
    pinia: 'Use Pinia (state management)?',
    vitest: 'Use Vitest (testing)?',
    eslint: 'Use ESLint?',
    prettier: 'Use Prettier?',
    creating: 'Creating Vue.js project with Vite...',
    success: '✅ Project created successfully!',
    error: '❌ Error creating project',
    changingDirectory: 'Changing to project directory...',
    validation: {
      empty: 'Project name cannot be empty',
      invalid:
        'Project name can only contain letters, numbers, dashes and underscores',
    },
    folderExists: (name: string) =>
      `Folder "${name}" already exists. Please choose another name.`,
  },
}
