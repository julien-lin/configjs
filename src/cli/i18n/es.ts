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
}
