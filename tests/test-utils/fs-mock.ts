/**
 * Utilitaire memfs pour les tests d'intégration
 * Utilise un système de fichiers en mémoire au lieu du disque
 *
 * Bénéfices:
 * - Tests 100x plus rapides (pas d'I/O disque)
 * - Pas de nettoyage de fichiers nécessaire
 * - Tests isolés et parallélisables
 * - Pas de dépendances à l'environnement
 *
 * @group test-utils
 */

import { createFsFromVolume, Volume } from 'memfs'
import type { IFs } from 'memfs'
import * as path from 'path'
import type {
  ProjectContext,
  Framework,
  PackageManager,
} from '../../src/types/index.js'
import { FileSystemAdapter } from '../../src/core/fs-adapter.js'
import type { IFsAdapter } from '../../src/core/fs-adapter.js'

let mockVolume: Volume | null = null
let mockFs: IFs | null = null
const mockCwd = '/mock-project'

/**
 * Initialise un système de fichiers mock avec memfs
 */
function initializeMockFs(files: Record<string, string> = {}): IFs {
  mockVolume = new Volume()
  mockFs = createFsFromVolume(mockVolume)

  // Utiliser fromJSON pour initialiser memfs correctement
  const fileStructure: Record<string, string | null> = {
    '/': null, // Créer la racine
    [mockCwd]: null, // Créer le dossier du projet
  }

  // Ajouter tous les fichiers à la structure
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(mockCwd, filePath)

    // Créer explicitement tous les dossiers parents
    const dirs = path.dirname(fullPath).split(path.sep).filter(Boolean)
    let currentPath = ''
    for (const dir of dirs) {
      currentPath = path.join(currentPath || '/', dir)
      if (!fileStructure[currentPath]) {
        fileStructure[currentPath] = null
      }
    }

    fileStructure[fullPath] = content
  }

  // Créer tous les répertoires et fichiers
  mockVolume.fromJSON(fileStructure)

  return mockFs
}

/**
 * Crée un projet mock avec une structure de base
 */
export function createMockProject(
  framework: Framework,
  options: {
    typescript?: boolean
    packageManager?: PackageManager
    files?: Record<string, string>
  } = {}
): { projectRoot: string; context: ProjectContext } {
  const { typescript = true, packageManager = 'npm', files = {} } = options

  const packageJson = getFrameworkPackageJson(framework, typescript)

  const baseFiles: Record<string, string> = {
    [`package.json`]: JSON.stringify(packageJson, null, 2),
    [`${getLockfile(packageManager)}`]: '',
    ...(typescript ? { [`tsconfig.json`]: getTsConfig() } : {}),
    [`src/App.${typescript ? 'tsx' : 'jsx'}`]: getAppFile(
      framework,
      typescript
    ),
    [`src/main.${typescript ? 'ts' : 'js'}`]: getMainFile(
      framework,
      typescript
    ),
    ...files,
  }

  resetMockFs()
  initializeMockFs(baseFiles)

  const context: ProjectContext = {
    framework,
    frameworkVersion: getFrameworkVersion(framework),
    bundler: getDefaultBundler(framework),
    bundlerVersion: '5.0.0',
    typescript,
    packageManager,
    lockfile: getLockfile(packageManager),
    projectRoot: mockCwd,
    srcDir: 'src',
    publicDir: 'public',
    os: 'darwin',
    nodeVersion: 'v20.0.0',
    dependencies: (packageJson['dependencies'] as Record<string, string>) || {},
    devDependencies:
      (packageJson['devDependencies'] as Record<string, string>) || {},
    hasGit: false,
  }

  return { projectRoot: mockCwd, context }
}

/**
 * Réinitialise le système de fichiers en mémoire
 */
export function resetMockFs(): void {
  mockVolume = null
  mockFs = null
}

/**
 * Vérifie si un fichier existe en mémoire
 */
export function mockFileExists(filePath: string): boolean {
  if (!mockVolume) return false
  try {
    const fullPath = path.join(mockCwd, filePath)
    mockVolume.statSync(fullPath)
    return true
  } catch {
    return false
  }
}

/**
 * Lit un fichier en mémoire
 */
export function readMockFile(filePath: string): string {
  if (!mockVolume) throw new Error('Mock FS not initialized')
  const fullPath = path.join(mockCwd, filePath)
  return mockVolume.readFileSync(fullPath, 'utf-8').toString()
}

/**
 * Écrit un fichier en mémoire
 */
export function writeMockFile(filePath: string, content: string): void {
  if (!mockVolume) throw new Error('Mock FS not initialized')
  const fullPath = path.join(mockCwd, filePath)
  const dir = path.dirname(fullPath)

  // Créer les répertoires parent si nécessaire
  try {
    mockVolume.mkdirSync(dir, { recursive: true })
  } catch {
    // Ignorer si déjà existant
  }

  mockVolume.writeFileSync(fullPath, content)
}

/**
 * Liste les fichiers d'un dossier en mémoire
 */
export function listMockDir(dirPath: string = '.'): string[] {
  if (!mockVolume) return []
  try {
    const fullPath = path.join(mockCwd, dirPath)
    return (mockVolume.readdirSync(fullPath) as string[]) || []
  } catch {
    return []
  }
}

/**
 * Récupère le chemin du projet mock
 */
export function getMockProjectRoot(): string {
  return mockCwd
}

/**
 * Récupère le filesystem mock actuel
 */
export function getMockFs(): IFs | null {
  return mockFs
}

/**
 * Récupère le volume mock actuel
 */
export function getMockVolume(): Volume | null {
  return mockVolume
}

/**
 * Crée un FileSystemAdapter depuis le mockFs actuel
 * Utilisé pour passer aux fonctions qui acceptent IFsAdapter
 */
export function getMockFsAdapter(): IFsAdapter | null {
  if (!mockFs) {
    return null
  }
  return new FileSystemAdapter(mockFs)
}

// ===== Helpers privés =====

function getTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        strict: true,
        esModuleInterop: true,
        moduleResolution: 'bundler',
      },
    },
    null,
    2
  )
}

function getFrameworkPackageJson(
  framework: Framework,
  typescript: boolean
): Record<string, unknown> {
  const base = {
    name: `test-${framework}-project`,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
  }

  switch (framework) {
    case 'react':
      return {
        ...base,
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.2.0',
          vite: '^5.0.0',
          ...(typescript
            ? {
                typescript: '^5.3.0',
                '@types/react': '^19.0.0',
                '@types/react-dom': '^19.0.0',
              }
            : {}),
        },
      }

    case 'nextjs':
      return {
        ...base,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: '^14.0.0',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: typescript
          ? {
              typescript: '^5.3.0',
              '@types/react': '^19.0.0',
              '@types/react-dom': '^19.0.0',
              '@types/node': '^20.0.0',
            }
          : {},
      }

    case 'vue':
      return {
        ...base,
        dependencies: {
          vue: '^3.4.0',
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^5.0.0',
          vite: '^5.0.0',
          ...(typescript ? { typescript: '^5.3.0', 'vue-tsc': '^1.8.0' } : {}),
        },
      }

    case 'svelte':
      return {
        ...base,
        dependencies: {
          svelte: '^4.0.0',
        },
        devDependencies: {
          '@sveltejs/vite-plugin-svelte': '^3.0.0',
          vite: '^5.0.0',
          ...(typescript
            ? { typescript: '^5.3.0', 'svelte-check': '^3.0.0' }
            : {}),
        },
      }

    default:
      return base
  }
}

function getFrameworkVersion(framework: Framework): string {
  switch (framework) {
    case 'react':
      return '19.0.0'
    case 'nextjs':
      return '14.0.0'
    case 'vue':
      return '3.4.0'
    case 'svelte':
      return '4.0.0'
    default:
      return '1.0.0'
  }
}

function getDefaultBundler(
  framework: Framework
): 'vite' | 'nextjs' | 'webpack' | null {
  switch (framework) {
    case 'react':
    case 'vue':
    case 'svelte':
      return 'vite'
    case 'nextjs':
      return 'nextjs'
    default:
      return null
  }
}

function getLockfile(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'npm':
      return 'package-lock.json'
    case 'yarn':
      return 'yarn.lock'
    case 'pnpm':
      return 'pnpm-lock.yaml'
    case 'bun':
      return 'bun.lockb'
    default:
      return 'package-lock.json'
  }
}

function getAppFile(framework: Framework, typescript: boolean): string {
  switch (framework) {
    case 'react':
    case 'nextjs':
      return `export default function App() {
  return <div>Hello ${framework}</div>
}`
    case 'vue':
      return `<script${typescript ? ' setup lang="ts"' : ' setup'}>
</script>

<template>
  <div>Hello Vue</div>
</template>`
    case 'svelte':
      return `<script${typescript ? ' lang="ts"' : ''}>
</script>

<div>Hello Svelte</div>`
    default:
      return ''
  }
}

function getMainFile(framework: Framework, typescript: boolean): string {
  switch (framework) {
    case 'react':
      return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.${typescript ? 'tsx' : 'jsx'}'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
    case 'nextjs':
      return `// Next.js entry point`
    case 'vue':
      return `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`
    case 'svelte':
      return `import App from './App.svelte'

export default new App({
  target: document.getElementById('app')!,
})`
    default:
      return ''
  }
}
