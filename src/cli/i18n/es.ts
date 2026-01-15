import type { Translations } from './types.js'

export const es: Translations = {
  language: {
    select: 'Elige tu idioma',
    options: [
      { value: 'fr', name: 'Français' },
      { value: 'en', name: 'English' },
      { value: 'es', name: 'Español' },
    ],
  },
  common: {
    continue: 'Continuar',
    cancel: 'Cancelar',
    back: 'Volver',
    none: 'Ninguno',
    selected: (count: number) =>
      count === 0
        ? 'Ninguna biblioteca seleccionada'
        : count === 1
          ? '1 biblioteca seleccionada'
          : `${count} bibliotecas seleccionadas`,
  },
  plugins: {
    selectCategory: (category: string) =>
      `Selecciona tus bibliotecas: ${category}`,
    selectMultiple: 'Selección múltiple',
    pressSpace: 'Presiona <espacio> para seleccionar',
    pressEnter: 'Presiona <entrar> para confirmar',
    description: 'Descripción',
  },
  detection: {
    detecting: '🔍 Detectando contexto...',
    framework: 'Framework',
    typescript: 'TypeScript',
    bundler: 'Bundler',
    packageManager: 'Gestor de paquetes',
  },
  confirmation: {
    summary: '📋 Resumen de la instalación',
    packagesToInstall: '📦 Paquetes a instalar',
    filesToCreate: '📝 Archivos que se crearán',
    filesToModify: '📝 Archivos que se modificarán',
    continueQuestion: '¿Continuar con la instalación?',
  },
  installation: {
    installing: 'Instalando...',
    configuring: 'Configurando...',
    success: '✨ ¡Instalación completada!',
    error: '❌ Error en la instalación',
    rollback: '↺ Revirtiendo...',
  },
  report: {
    title: '✨ ¡Instalación completada!',
    packagesInstalled: '📦 Paquetes instalados',
    filesCreated: '📝 Archivos creados',
    filesModified: '📝 Archivos modificados',
    nextSteps: '🚀 Próximos pasos',
  },
  errors: {
    detectionFailed: 'Fallo en la detección del contexto',
    installationFailed: 'Fallo en la instalación',
    validationFailed: 'Fallo en la validación',
    incompatiblePlugins: (plugins: string[]) =>
      `Plugins incompatibles detectados: ${plugins.join(', ')}`,
  },
  vite: {
    noReactDetected:
      '⚠️  No se detectó ningún proyecto React en el directorio actual.',
    proposeSetup: '¿Desea crear un nuevo proyecto React con Vite?',
    projectName: 'Nombre del proyecto',
    projectNamePlaceholder: 'mi-proyecto-react',
    typescript: '¿Usar TypeScript?',
    template: 'Plantilla',
    templateOptions: [
      { value: 'react', name: 'React (JavaScript)' },
      { value: 'react-ts', name: 'React (TypeScript)' },
    ],
    creating: 'Creando proyecto React con Vite...',
    success: '✅ ¡Proyecto creado con éxito!',
    error: '❌ Error al crear el proyecto',
    changingDirectory: 'Cambiando al directorio del proyecto...',
    validation: {
      empty: 'El nombre del proyecto no puede estar vacío',
      invalid:
        'El nombre del proyecto solo puede contener letras, números, guiones y guiones bajos',
    },
    folderExists: (name: string) =>
      `La carpeta "${name}" ya existe. Por favor, elija otro nombre.`,
  },
  nextjs: {
    noNextjsDetected:
      '⚠️  No se detectó ningún proyecto Next.js en el directorio actual.',
    proposeSetup: '¿Desea crear un nuevo proyecto Next.js?',
    projectName: 'Nombre del proyecto',
    projectNamePlaceholder: 'mi-proyecto-nextjs',
    typescript: '¿Usar TypeScript?',
    eslint: '¿Usar ESLint?',
    tailwind: '¿Usar TailwindCSS?',
    srcDir: '¿Usar directorio src/?',
    appRouter: '¿Usar App Router (recomendado)?',
    importAlias: 'Alias de importación (ej: @/*)',
    creating: 'Creando proyecto Next.js...',
    success: '✅ ¡Proyecto creado con éxito!',
    error: '❌ Error al crear el proyecto',
    changingDirectory: 'Cambiando al directorio del proyecto...',
    validation: {
      empty: 'El nombre del proyecto no puede estar vacío',
      invalid:
        'El nombre del proyecto solo puede contener letras, números, guiones y guiones bajos',
    },
    folderExists: (name: string) =>
      `La carpeta "${name}" ya existe. Por favor, elija otro nombre.`,
  },
  vue: {
    noVueDetected:
      '⚠️  No se detectó ningún proyecto Vue.js en el directorio actual.',
    proposeSetup: '¿Desea crear un nuevo proyecto Vue.js con Vite?',
    projectName: 'Nombre del proyecto',
    projectNamePlaceholder: 'mi-proyecto-vue',
    typescript: '¿Usar TypeScript?',
    router: '¿Usar Vue Router?',
    pinia: '¿Usar Pinia (gestión de estado)?',
    vitest: '¿Usar Vitest (pruebas)?',
    eslint: '¿Usar ESLint?',
    prettier: '¿Usar Prettier?',
    creating: 'Creando proyecto Vue.js con Vite...',
    success: '✅ ¡Proyecto creado con éxito!',
    error: '❌ Error al crear el proyecto',
    changingDirectory: 'Cambiando al directorio del proyecto...',
    validation: {
      empty: 'El nombre del proyecto no puede estar vacío',
      invalid:
        'El nombre del proyecto solo puede contener letras, números, guiones y guiones bajos',
    },
    folderExists: (name: string) =>
      `La carpeta "${name}" ya existe. Por favor, elija otro nombre.`,
  },
  svelte: {
    noSvelteDetected:
      '⚠️  No se detectó ningún proyecto Svelte en el directorio actual.',
    proposeSetup: '¿Desea crear un nuevo proyecto Svelte con Vite?',
    projectName: 'Nombre del proyecto',
    projectNamePlaceholder: 'mi-proyecto-svelte',
    useTypeScript: '¿Usar TypeScript?',
    creatingProject: 'Creando proyecto Svelte con Vite...',
    installingDependencies: 'Instalando dependencias...',
    projectCreated: '¡Proyecto Svelte creado con éxito!',
    creating: 'Creando proyecto Svelte...',
    success: '✅ ¡Proyecto creado con éxito!',
    error: '❌ Error al crear el proyecto',
    changingDirectory: 'Cambiando al directorio del proyecto...',
    validation: {
      empty: 'El nombre del proyecto no puede estar vacío',
      invalid:
        'El nombre del proyecto solo puede contener letras, números, guiones y guiones bajos',
    },
    folderExists: (name: string) =>
      `La carpeta "${name}" ya existe. Por favor, elija otro nombre.`,
  },
  angular: {
    noAngularDetected:
      '⚠️  No se detectó ningún proyecto Angular en el directorio actual.',
    proposeSetup: '¿Desea crear un nuevo proyecto Angular?',
    projectName: 'Nombre del proyecto',
    projectNamePlaceholder: 'mi-proyecto-angular',
    useTypeScript: '¿Usar TypeScript? (recomendado)',
    creatingProject: 'Creando proyecto Angular...',
    installingDependencies: 'Instalando dependencias...',
    projectCreated: '¡Proyecto Angular creado con éxito!',
    creating: 'Creando proyecto Angular...',
    success: '✅ ¡Proyecto creado con éxito!',
    error: '❌ Error al crear el proyecto',
    changingDirectory: 'Cambiando al directorio del proyecto...',
    validation: {
      empty: 'El nombre del proyecto no puede estar vacío',
      invalid:
        'El nombre del proyecto solo puede contener letras, números, guiones y guiones bajos',
    },
    folderExists: (name: string) =>
      `La carpeta "${name}" ya existe. Por favor, elija otro nombre.`,
  },
}
