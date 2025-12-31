# Guide de Développement de Plugins - confjs

Ce guide explique comment créer des plugins pour **confjs**.

## 📦 Qu'est-ce qu'un plugin ?

Un plugin confjs est un module autonome responsable de :
1. **Installer** une bibliothèque (packages npm)
2. **Configurer** la bibliothèque (fichiers de config, code initial)
3. **Valider** sa compatibilité avec d'autres plugins

## 🏗️ Structure d'un plugin

### Interface Plugin

```typescript
interface Plugin {
  // === MÉTADONNÉES ===
  name: string                    // Nom du package npm
  displayName: string             // Nom affiché à l'utilisateur
  description: string             // Description courte
  category: Category              // Catégorie fonctionnelle
  version?: string                // Version spécifique à installer
  
  // === COMPATIBILITÉ ===
  frameworks: Framework[]         // ['react', 'vue', ...]
  bundlers?: Bundler[]            // Si spécifique à un bundler
  requiresTypeScript?: boolean    // Si nécessite TS
  
  // === RELATIONS ===
  compatibleWith?: string[]       // Plugins compatibles
  incompatibleWith?: string[]     // Plugins exclusifs
  requires?: string[]             // Dépendances obligatoires
  recommends?: string[]           // Dépendances recommandées
  
  // === DÉTECTION ===
  detect?: (ctx: ProjectContext) => boolean | Promise<boolean>
  
  // === LIFECYCLE ===
  preInstall?: (ctx: ProjectContext) => Promise<void>
  install: (ctx: ProjectContext) => Promise<InstallResult>
  postInstall?: (ctx: ProjectContext) => Promise<void>
  configure: (ctx: ProjectContext) => Promise<ConfigResult>
  rollback?: (ctx: ProjectContext) => Promise<void>
}
```

## 🚀 Créer un plugin simple

### Exemple : Plugin Axios

```typescript
// src/plugins/http/axios.ts

import type { Plugin, ProjectContext, InstallResult, ConfigResult } from '../../types'
import { Category } from '../../types'
import { installPackages } from '../../utils/package-manager'
import { writeFile } from '../../utils/fs-helpers'
import { logger } from '../../utils/logger'

export const axiosPlugin: Plugin = {
  // Métadonnées
  name: 'axios',
  displayName: 'Axios',
  description: 'HTTP client avec interceptors et configuration',
  category: Category.HTTP,
  version: '^1.6.0',
  
  // Compatibilité
  frameworks: ['react', 'vue', 'svelte'],
  
  // Détection (optionnelle)
  detect: (ctx: ProjectContext) => {
    return ctx.dependencies['axios'] !== undefined
  },
  
  // Installation
  async install(ctx: ProjectContext) {
    logger.info('Installation de axios...')
    
    const packages = ['axios']
    
    await installPackages(packages, {
      dev: false,
      packageManager: ctx.packageManager,
    })
    
    return {
      packages: { dependencies: packages },
      success: true,
      message: 'Axios installé avec succès',
    }
  },
  
  // Configuration
  async configure(ctx: ProjectContext) {
    logger.info('Configuration de axios...')
    
    const files: FileOperation[] = []
    
    // 1. Créer l'instance API configurée
    const apiContent = generateApiFile(ctx)
    const apiPath = `${ctx.srcDir}/lib/api.${ctx.typescript ? 'ts' : 'js'}`
    
    await writeFile(apiPath, apiContent)
    
    files.push({
      type: 'create',
      path: apiPath,
    })
    
    // 2. Créer les types si TypeScript
    if (ctx.typescript) {
      const typesContent = generateTypesFile()
      const typesPath = `${ctx.srcDir}/lib/api-types.ts`
      
      await writeFile(typesPath, typesContent)
      
      files.push({
        type: 'create',
        path: typesPath,
      })
    }
    
    return {
      files,
      success: true,
      message: 'Axios configuré avec succès',
    }
  },
  
  // Rollback (optionnel)
  async rollback(ctx: ProjectContext) {
    logger.info('Rollback de axios...')
    // Supprimer les fichiers créés
    // Restaurer les backups
  },
}

// === HELPERS ===

function generateApiFile(ctx: ProjectContext): string {
  if (ctx.typescript) {
    return `import axios from 'axios'
import type { ApiError } from './api-types'

// Configuration de base
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur de requête
api.interceptors.request.use(
  (config) => {
    // Ajouter le token si disponible
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      code: error.code,
    }
    
    // Gestion globale des erreurs
    if (error.response?.status === 401) {
      // Redirection vers login
      window.location.href = '/login'
    }
    
    return Promise.reject(apiError)
  }
)

export default api
`
  } else {
    return `import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
`
  }
}

function generateTypesFile(): string {
  return `export interface ApiError {
  message: string
  status?: number
  code?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}
`
}
```

## 🔧 Plugin avancé avec dépendances

### Exemple : Plugin TailwindCSS

```typescript
// src/plugins/css/tailwindcss.ts

export const tailwindcssPlugin: Plugin = {
  name: 'tailwindcss',
  displayName: 'TailwindCSS',
  description: 'Utility-first CSS framework',
  category: Category.CSS,
  
  frameworks: ['react', 'vue', 'svelte'],
  
  // Dépendances requises
  requires: ['postcss', 'autoprefixer'],
  
  // Conflits potentiels
  incompatibleWith: [], // Bootstrap ne bloque pas mais warning
  
  async install(ctx: ProjectContext) {
    // Installation de Tailwind + ses dépendances
    const packages = [
      'tailwindcss',
      'postcss',
      'autoprefixer',
    ]
    
    await installPackages(packages, {
      dev: true,
      packageManager: ctx.packageManager,
    })
    
    return {
      packages: { devDependencies: packages },
      success: true,
    }
  },
  
  async configure(ctx: ProjectContext) {
    const files: FileOperation[] = []
    
    // 1. tailwind.config.js
    const tailwindConfig = generateTailwindConfig(ctx)
    await writeFile('tailwind.config.js', tailwindConfig)
    files.push({ type: 'create', path: 'tailwind.config.js' })
    
    // 2. postcss.config.js
    const postcssConfig = generatePostcssConfig()
    await writeFile('postcss.config.js', postcssConfig)
    files.push({ type: 'create', path: 'postcss.config.js' })
    
    // 3. Injection dans CSS principal
    await injectTailwindDirectives(ctx)
    files.push({
      type: 'modify',
      path: `${ctx.srcDir}/index.css`,
      backup: true,
    })
    
    return { files, success: true }
  },
}

function generateTailwindConfig(ctx: ProjectContext): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./${ctx.srcDir}/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`
}

function generatePostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`
}

async function injectTailwindDirectives(ctx: ProjectContext): Promise<void> {
  const cssPath = `${ctx.srcDir}/index.css`
  const directives = `@tailwind base;
@tailwind components;
@tailwind utilities;

`
  
  // Lire le fichier existant
  const existing = await readFile(cssPath, 'utf-8').catch(() => '')
  
  // Vérifier si déjà présent
  if (existing.includes('@tailwind')) {
    logger.info('Directives Tailwind déjà présentes')
    return
  }
  
  // Injecter au début
  await writeFile(cssPath, directives + existing)
}
```

## 📋 Checklist de développement

### ✅ Avant de créer un plugin

- [ ] Le plugin est-il nécessaire pour le MVP ?
- [ ] La bibliothèque est-elle stable et maintenue ?
- [ ] Y a-t-il des alternatives à considérer ?
- [ ] Les dépendances sont-elles compatibles ?

### ✅ Développement

- [ ] Interface `Plugin` complètement implémentée
- [ ] Métadonnées remplies (name, displayName, description)
- [ ] Catégorie appropriée
- [ ] Frameworks supportés déclarés
- [ ] Compatibilités et conflits documentés
- [ ] Fonction `install()` implémentée
- [ ] Fonction `configure()` implémentée
- [ ] Fonction `rollback()` implémentée (optionnel mais recommandé)

### ✅ Configuration

- [ ] Génération des fichiers de config
- [ ] Injection du code initial si nécessaire
- [ ] Support TypeScript ET JavaScript
- [ ] Gestion des chemins relatifs/absolus
- [ ] Backup des fichiers modifiés

### ✅ Tests

- [ ] Tests unitaires pour helpers
- [ ] Test d'installation dans un vrai projet
- [ ] Test de configuration
- [ ] Test de rollback
- [ ] Test avec/sans TypeScript
- [ ] Test avec différents bundlers

### ✅ Documentation

- [ ] Commentaires JSDoc
- [ ] Exemple d'utilisation
- [ ] Notes de compatibilité
- [ ] Breaking changes documentés

## 🧪 Tester un plugin

### Test manuel

```bash
# 1. Créer un projet React de test
npm create vite@latest test-project -- --template react-ts
cd test-project

# 2. Lier votre version locale de confjs
cd /path/to/confjs
npm link

cd /path/to/test-project
npm link confjs

# 3. Tester votre plugin
confjs react --debug
```

### Test automatisé

```typescript
// tests/unit/plugins/axios.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { axiosPlugin } from '../../../src/plugins/http/axios'
import { createMockContext } from '../../helpers'

describe('Axios Plugin', () => {
  let ctx: ProjectContext
  
  beforeEach(() => {
    ctx = createMockContext({
      framework: 'react',
      typescript: true,
    })
  })
  
  it('devrait installer axios', async () => {
    const result = await axiosPlugin.install(ctx)
    
    expect(result.success).toBe(true)
    expect(result.packages.dependencies).toContain('axios')
  })
  
  it('devrait créer le fichier api.ts', async () => {
    const result = await axiosPlugin.configure(ctx)
    
    expect(result.success).toBe(true)
    expect(result.files).toHaveLength(2) // api.ts + api-types.ts
    expect(result.files[0].path).toMatch(/api\.ts$/)
  })
  
  it('devrait détecter si axios est déjà installé', () => {
    ctx.dependencies['axios'] = '^1.0.0'
    
    const isDetected = axiosPlugin.detect?.(ctx)
    
    expect(isDetected).toBe(true)
  })
})
```

## 📦 Publier un plugin externe

### Structure du package

```
confjs-plugin-react-query/
├── src/
│   └── index.ts
├── package.json
├── README.md
└── tsconfig.json
```

### package.json

```json
{
  "name": "confjs-plugin-react-query",
  "version": "1.0.0",
  "description": "React Query plugin for confjs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["confjs", "plugin", "react-query"],
  "peerDependencies": {
    "confjs": ">=1.0.0"
  }
}
```

### src/index.ts

```typescript
import { definePlugin } from 'confjs'
import { Category } from 'confjs/types'

export default definePlugin({
  name: '@tanstack/react-query',
  displayName: 'React Query',
  description: 'Powerful data synchronization for React',
  category: Category.HTTP,
  frameworks: ['react'],
  
  async install(ctx) {
    // Implementation
  },
  
  async configure(ctx) {
    // Implementation
  },
})
```

### Installation par les utilisateurs

```bash
npm install confjs-plugin-react-query
```

confjs détectera automatiquement le plugin !

## 🎯 Best Practices

### DO ✅

- **Idempotence** : Le plugin doit pouvoir s'exécuter plusieurs fois
- **Vérifications** : Vérifier si déjà installé/configuré
- **Logs clairs** : Utiliser le logger fourni
- **Backup** : Sauvegarder avant modification
- **TypeScript** : Supporter TS et JS
- **Tests** : Couvrir les cas principaux
- **Documentation** : Commenter le code complexe

### DON'T ❌

- **Ne pas** modifier des fichiers sans backup
- **Ne pas** faire d'opérations destructives sans confirmation
- **Ne pas** ignorer les erreurs silencieusement
- **Ne pas** hardcoder des chemins
- **Ne pas** oublier le rollback
- **Ne pas** bloquer l'event loop
- **Ne pas** utiliser `console.log` directement

## 📚 Ressources

- [Types Plugin](../../src/types/index.ts)
- [Exemples de plugins](../../src/plugins/)
- [Utils helpers](../../src/utils/)
- [Tests exemples](../../tests/unit/plugins/)

## 💡 Inspiration

Consultez les plugins existants pour inspiration :
- [React Router](../../src/plugins/routing/react-router.ts)
- [Zustand](../../src/plugins/state/zustand.ts)
- [TailwindCSS](../../src/plugins/css/tailwindcss.ts)

## 🤝 Besoin d'aide ?

Ouvrez une issue ou rejoignez les discussions !

---

**Happy plugin development! 🚀**

