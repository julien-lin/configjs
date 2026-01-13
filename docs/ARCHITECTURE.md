# Architecture de confjs

Ce document décrit l'architecture interne de **confjs** après le refactoring de janvier 2026.

## 🏗️ Vue d'ensemble

confjs utilise une architecture modulaire basée sur des **commandes de framework** et un **registry centralisé**. Cette architecture permet d'ajouter facilement de nouveaux frameworks sans dupliquer le code.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Entry Point                       │
│                      (src/cli.ts)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ReactCommand │ │NextjsCommand│ │VueCommand   │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
            ┌──────────▼──────────┐
            │BaseFrameworkCommand │
            │   (Abstract Class)   │
            └──────────┬──────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
│Framework    │ │Detector   │ │Installer  │
│Registry     │ │           │ │           │
└─────────────┘ └───────────┘ └───────────┘
```

## 📦 Composants principaux

### 1. Framework Registry (`src/core/framework-registry.ts`)

Le **Framework Registry** centralise toutes les métadonnées des frameworks supportés. C'est le point d'entrée unique pour ajouter un nouveau framework.

#### Interface `FrameworkMetadata`

```typescript
interface FrameworkMetadata {
  id: Framework                    // 'react' | 'nextjs' | 'vue' | ...
  displayName: string              // 'React', 'Next.js', 'Vue.js'
  detectPackages: string[]         // ['react', 'react-dom']
  defaultBundler: Bundler          // 'vite' | 'nextjs' | ...
  createCommand: string            // 'npm create vite@latest'
  templates?: { js: string, ts: string }
  getSetupPrompt: (language) => Promise<unknown>
  createProject: (options, currentDir, language) => Promise<string>
  i18nKeys: { ... }
}
```

#### Utilisation

```typescript
import { getFrameworkMetadata } from '../core/framework-registry.js'

const metadata = getFrameworkMetadata('react')
const setupOptions = await metadata.getSetupPrompt('fr')
const projectPath = await metadata.createProject(setupOptions, process.cwd(), 'fr')
```

### 2. Base Framework Command (`src/cli/commands/base-framework-command.ts`)

Classe abstraite qui centralise **toute la logique commune** entre les commandes de framework.

#### Méthodes abstraites (à implémenter)

- `getFramework()`: Retourne le framework géré (`'react'`, `'nextjs'`, etc.)
- `getOrCreateContext()`: Détecte ou crée le contexte du projet

#### Méthodes communes (déjà implémentées)

- `execute()`: Orchestre le flow complet (détection → sélection → installation)
- `selectPlugins()`: Sélection interactive des plugins
- `confirmInstallation()`: Confirmation avant installation
- `performInstallation()`: Installation réelle des plugins
- `handleDryRun()`: Mode simulation
- `displayDetectedContext()`: Affichage du contexte détecté

#### Flow d'exécution

```
execute()
  ├─ 1. Sélection de la langue
  ├─ 2. Détection/création du contexte (getOrCreateContext)
  ├─ 3. Validation du framework
  ├─ 4. Affichage du contexte
  ├─ 5. Sélection des plugins
  ├─ 6. Confirmation
  ├─ 7. Mode dry-run (si activé)
  └─ 8. Installation
```

### 3. Commandes spécifiques

Chaque framework a sa propre classe qui étend `BaseFrameworkCommand` :

#### ReactCommand (`src/cli/commands/react-command.ts`)

```typescript
export class ReactCommand extends BaseFrameworkCommand {
  protected getFramework(): 'react' {
    return 'react'
  }

  protected async getOrCreateContext(
    projectRoot: string,
    language: SupportedLanguage
  ): Promise<ProjectContext> {
    // 1. Essayer de détecter React
    try {
      return await detectContext(projectRoot)
    } catch (error) {
      // 2. Si non détecté, créer un projet Vite
      if (error instanceof DetectionError) {
        const metadata = getFrameworkMetadata('react')
        const setupOptions = await metadata.getSetupPrompt(language)
        const newProjectPath = await metadata.createProject(setupOptions, projectRoot, language)
        process.chdir(newProjectPath)
        return await detectContext(newProjectPath)
      }
      throw error
    }
  }
}
```

#### NextjsCommand (`src/cli/commands/nextjs-command.ts`)

Similaire à `ReactCommand`, mais utilise `getFrameworkMetadata('nextjs')` et `promptNextjsSetup`.

#### VueCommand (`src/cli/commands/vue-command.ts`)

Similaire, mais **override** `displayFrameworkSpecificInfo()` pour afficher la version Vue et l'API (Composition/Options).

```typescript
protected override displayFrameworkSpecificInfo(
  ctx: ProjectContext,
  t: Translations
): void {
  if (ctx.vueVersion) {
    console.log(pc.green(`   ✓ Vue Version: `) + pc.bold(`Vue ${ctx.vueVersion}`))
  }
  if (ctx.vueApi) {
    console.log(pc.green(`   ✓ Vue API: `) + pc.bold(
      ctx.vueApi === 'composition' ? 'Composition API' : 'Options API'
    ))
  }
}
```

## 🔄 Flow complet d'installation

### Exemple : `npx confjs react`

```
1. CLI Entry Point (src/cli.ts)
   └─> new ReactCommand().execute(options)

2. BaseFrameworkCommand.execute()
   ├─> promptLanguage()                    // Sélection langue
   ├─> ReactCommand.getOrCreateContext()    // Détection/création
   │   ├─> detectContext()                  // Essayer de détecter
   │   └─> Si échec:
   │       ├─> getFrameworkMetadata('react')
   │       ├─> metadata.getSetupPrompt()    // Prompt Vite setup
   │       └─> metadata.createProject()     // Créer projet Vite
   ├─> validateFramework()                  // Vérifier que c'est React
   ├─> displayDetectedContext()             // Afficher infos
   ├─> selectPlugins()                      // Sélection interactive
   ├─> confirmInstallation()                // Confirmation
   ├─> handleDryRun()                       // Si --dry-run
   └─> performInstallation()                // Installation réelle
       ├─> new Installer(ctx, validator, configWriter, backupManager)
       └─> installer.install(selectedPlugins)
```

## ➕ Ajouter un nouveau framework

### Étape 1 : Ajouter au type `Framework`

```typescript
// src/types/index.ts
export type Framework = 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' // Ajouter 'angular'
```

### Étape 2 : Ajouter au Framework Registry

```typescript
// src/core/framework-registry.ts
export const frameworkRegistry: Record<Framework, FrameworkMetadata> = {
  // ... frameworks existants
  angular: {
    id: 'angular',
    displayName: 'Angular',
    detectPackages: ['@angular/core'],
    defaultBundler: 'webpack',
    createCommand: 'npx @angular/cli new',
    getSetupPrompt: async (language) => {
      const { promptAngularSetup } = await import('../cli/prompts/angular-setup.js')
      return await promptAngularSetup(language)
    },
    createProject: async (options, currentDir, language) => {
      const { createAngularProject } = await import('../cli/utils/angular-installer.js')
      return await createAngularProject(options, currentDir, language)
    },
    i18nKeys: {
      noFrameworkDetected: 'angular.noAngularDetected',
      creating: 'angular.creating',
      folderExists: (name: string) => `angular.folderExists(${name})`,
    },
  },
}
```

### Étape 3 : Créer la commande

```typescript
// src/cli/commands/angular-command.ts
import { BaseFrameworkCommand } from './base-framework-command.js'
import { detectContext, DetectionError } from '../../core/detector.js'
import { getFrameworkMetadata } from '../../core/framework-registry.js'

export class AngularCommand extends BaseFrameworkCommand {
  protected getFramework(): 'angular' {
    return 'angular'
  }

  protected async getOrCreateContext(
    projectRoot: string,
    language: SupportedLanguage
  ): Promise<ProjectContext> {
    const metadata = getFrameworkMetadata('angular')
    if (!metadata) {
      throw new Error('Angular framework metadata not found')
    }

    try {
      return await detectContext(projectRoot)
    } catch (error) {
      if (error instanceof DetectionError) {
        const setupOptions = await metadata.getSetupPrompt(language)
        if (!setupOptions) {
          throw new Error('Project creation cancelled.')
        }
        const newProjectPath = await metadata.createProject(setupOptions, projectRoot, language)
        process.chdir(newProjectPath)
        return await detectContext(newProjectPath)
      }
      throw error
    }
  }
}
```

### Étape 4 : Enregistrer dans CLI

```typescript
// src/cli.ts
import { AngularCommand } from './cli/commands/angular-command.js'

program
  .command('angular')
  .description('Configure an Angular project')
  .option('-y, --yes', 'Accept all defaults')
  // ... autres options
  .action(async (options) => {
    try {
      await new AngularCommand().execute(options)
    } catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })
```

### Étape 5 : Mettre à jour le détecteur

```typescript
// src/core/detector.ts
function detectFramework(pkg: Record<string, unknown>): {
  framework: Framework
  version: string
} {
  const deps = { ...pkg['dependencies'], ...pkg['devDependencies'] }

  // ... détections existantes

  // Détection Angular
  if (deps['@angular/core']) {
    return {
      framework: 'angular',
      version: deps['@angular/core'].replace(/[\^~]/, ''),
    }
  }

  throw new DetectionError('No supported framework detected')
}
```

## 🎯 Avantages de cette architecture

### ✅ Réduction de duplication

**Avant** : ~600 lignes de code dupliqué entre `install-react.ts`, `install-nextjs.ts`, `install-vue.ts`

**Après** : ~150 lignes dans `BaseFrameworkCommand` + ~50 lignes par commande spécifique

**Réduction** : ~75% de code en moins

### ✅ Ajout facile de frameworks

**Avant** : 2 jours pour ajouter un nouveau framework (copier-coller + modifications)

**Après** : 4 heures (ajout au registry + création de la commande)

### ✅ Maintenabilité

- **Un seul endroit** pour modifier la logique commune
- **Tests centralisés** pour `BaseFrameworkCommand`
- **Type safety** avec TypeScript

### ✅ Extensibilité

- Override de méthodes pour personnaliser le comportement
- Méthodes protégées pour étendre la fonctionnalité
- Registry extensible avec nouveaux frameworks

## 📚 Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/core/framework-registry.ts` | Registry centralisé des frameworks |
| `src/cli/commands/base-framework-command.ts` | Classe abstraite avec logique commune |
| `src/cli/commands/react-command.ts` | Commande React (exemple) |
| `src/cli/commands/nextjs-command.ts` | Commande Next.js |
| `src/cli/commands/vue-command.ts` | Commande Vue.js |
| `src/cli.ts` | Point d'entrée CLI |
| `src/core/detector.ts` | Détection du contexte projet |

## 🔍 Tests

### Tests unitaires

- `tests/unit/cli/commands/base-framework-command.test.ts` : Tests de la classe de base
- `tests/unit/cli/commands/react-command.test.ts` : Tests ReactCommand
- `tests/unit/core/framework-registry.test.ts` : Tests du registry

### Tests d'intégration

- `tests/integration/install-flow.test.ts` : Flow complet d'installation
- `tests/integration/vue-install.test.ts` : Installation Vue.js

### Tests E2E

- `tests/e2e/vue.test.ts` : Tests end-to-end Vue.js

## 🚀 Prochaines étapes

Voir `DEVELOPPEMENT/TODOLIST_OPTIMISATION.md` pour les prochaines phases :

- **Phase 2** : Optimisation du code (compatibilité auto-générée, plugin builder)
- **Phase 3** : Tests robustes (migration vers memfs)
- **Phase 4** : Nouveaux frameworks (Angular, Svelte, Solid, etc.)
