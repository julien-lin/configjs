# Guide d'Intégration Angular 21 pour les Plugins

## 📚 Vue d'ensemble

Ce guide explique comment intégrer correctement les plugins Angular 21 dans le framework ConfigJS. Les plugins ne doivent pas se contenter d'installer les packages - ils doivent **configurer le projet** pour que tout fonctionne ensemble.

## 🎯 Objectif Principal

```
Installation Package    ← npm install @ngrx/signals
          ↓
  ┌─────────────┐
  │ Le problème │  Le projet reçoit le package, mais ne sait pas comment l'utiliser
  └─────────────┘
          ↓
    Configuration      ← Créer app.config.ts, ajouter providers, créer des exemples
          ↓
        ✨ Success     Le projet est prêt à utiliser le nouveau plugin
```

## 📦 Utilitaires Disponibles

Tous les utilitaires sont dans `src/plugins/utils/angular-21-config.ts`:

### 1. `addProviderToAppConfig(projectRoot, providerId)`
Ajoute automatiquement un provider à `app.config.ts`.

```typescript
import { addProviderToAppConfig } from './angular-21-config';

await addProviderToAppConfig(projectPath, 'zoneless');
// Ajoute automatiquement à app.config.ts:
// import { provideExperimentalZonelessChangeDetection } from '@angular/core';
// providers: [provideExperimentalZonelessChangeDetection(), ...]
```

**Providers disponibles:**
- `'zoneless'` → `provideExperimentalZonelessChangeDetection()`
- `'animations'` → `provideAnimationsAsync()`
- `'router'` → `provideRouter(routes)`
- `'http'` → `provideHttpClient()`
- `'ngrxSignals'` → `provideState(...)`

### 2. `generateVitestConfig(projectRoot)`
Crée `vitest.config.ts` avec la configuration Angular.

```typescript
import { generateVitestConfig } from './angular-21-config';

await generateVitestConfig(projectPath);
// Crée vitest.config.ts avec environnement jsdom
```

### 3. `generateTestFile(projectRoot)`
Crée `src/test.ts` pour configurer l'environnement de test.

```typescript
import { generateTestFile } from './angular-21-config';

await generateTestFile(projectPath);
// Crée src/test.ts avec zone.js et Angular testing setup
```

### 4. `generateSignalStoreTemplate(projectRoot, storeName)`
Crée un Signal Store avec intégration Zod.

```typescript
import { generateSignalStoreTemplate } from './angular-21-config';

await generateSignalStoreTemplate(projectPath, 'user');
// Crée src/app/store/user.store.ts
// - signalStore avec withState et withMethods
// - Zod schema pour validation
// - Type inference automatique
```

### 5. `generateIconComponent(projectRoot)`
Crée un composant Icon réutilisable pour Lucide.

```typescript
import { generateIconComponent } from './angular-21-config';

await generateIconComponent(projectPath);
// Crée src/app/components/icon/icon.component.ts
// - Support multi-icônes
// - Customizable size et strokeWidth
```

### 6. `generateAccessibleMenuComponent(projectRoot)`
Crée un Menu accessible avec Angular CDK.

```typescript
import { generateAccessibleMenuComponent } from './angular-21-config';

await generateAccessibleMenuComponent(projectPath);
// Crée src/app/components/menu/menu.component.ts
// - CdkMenu pour accessibilité
// - Support clavier et lecteur d'écran
```

## 🔌 Comment Utiliser dans un Plugin

### Template de Plugin Complet

```typescript
import { Plugin, PluginMetadata } from '../../types';
import {
  addProviderToAppConfig,
  generateVitestConfig,
  generateTestFile,
} from './angular-21-config';

export const myAngularPlugin: Plugin = {
  metadata: {
    name: 'my-angular-plugin',
    version: '1.0.0',
    description: 'My Angular plugin with configuration',
  },

  async detect(projectPath: string) {
    // Vérifie si le plugin est applicable
    return await isAngularProject(projectPath);
  },

  async install(projectPath: string) {
    // Installe le package npm
    await runCommand(`npm install my-package`);
  },

  async configure(projectPath: string) {
    // 🔑 Cette méthode est appelée APRÈS install()
    // C'est ici qu'on configure le projet

    console.log('Configuring my-angular-plugin...');

    // Exemple 1: Ajouter un provider
    await addProviderToAppConfig(projectPath, 'animations');

    // Exemple 2: Générer un fichier de configuration
    await generateVitestConfig(projectPath);

    // Exemple 3: Créer un composant template
    await generateSignalStoreTemplate(projectPath, 'myStore');

    console.log('✨ Plugin configured!');
  },
};
```

## 🎬 Exemple Concret: Plugin Vitest

### Avant (Ancien flux)
```bash
$ npm install @vitest/angular
# ... project doesn't know what to do with it
# Developer must manually:
# 1. Create vitest.config.ts
# 2. Create src/test.ts
# 3. Remove karma.conf.js
# 4. Update angular.json
```

### Après (Nouveau flux avec plugin)
```bash
$ npx @configjs/cli vitest --for angular
# ConfigJS automatically:
# ✅ npm install @vitest/angular
# ✅ generateVitestConfig(projectPath)
# ✅ generateTestFile(projectPath)
# ✅ Log success message with next steps
```

### Code du Plugin Vitest
```typescript
import { Plugin, PluginMetadata } from '../../types';
import { generateVitestConfig, generateTestFile } from './angular-21-config';

export const vitestAngularPlugin: Plugin = {
  metadata: {
    name: '@vitest/angular',
    version: '1.0.0',
    description: 'Testing framework for Angular 21',
  },

  async detect(projectPath: string) {
    return isAngularProject(projectPath);
  },

  async install(projectPath: string) {
    // Installe les packages
    await runCommand('npm install --save-dev vitest @vitest/angular jsdom');
  },

  async configure(projectPath: string) {
    console.log('Setting up Vitest for Angular...\n');

    // Génère les fichiers de configuration
    await generateVitestConfig(projectPath);
    await generateTestFile(projectPath);

    // Message d'success
    console.log(`
    ✨ Vitest is now configured!

    To start testing:
    1. npm run test (pour une exécution unique)
    2. npm run test:watch (pour mode watch)
    3. npm run test:coverage (pour couverture)

    Configuration files created:
    - vitest.config.ts (at project root)
    - src/test.ts (test setup)
    `);
  },
};
```

## 🛠️ Flux d'Exécution Complète

```
User runs: npx @configjs/cli vitest --for angular
            ↓
      [CLI détecte Angular]
            ↓
   [CLI trouve plugin Vitest]
            ↓
  [plugin.detect()] → true (c'est un projet Angular)
            ↓
  [plugin.install()] → npm install @vitest/angular
            ↓
 [plugin.configure()] → Appelle les utilitaires
            ├─ generateVitestConfig() → crée vitest.config.ts
            ├─ generateTestFile() → crée src/test.ts
            └─ Log success message
            ↓
    ✨ Project is ready to use Vitest!
```

## 📋 Checklist pour Créer un Plugin Angular

- [ ] Le plugin hérite correctement de `Plugin` interface
- [ ] `metadata` est complètement rempli
- [ ] `detect()` retourne un booléen ou Promise<boolean>
- [ ] `install()` installe les packages nécessaires
- [ ] `configure()` appelle les utilitaires pour configurer le projet
- [ ] Les messages de log sont clairs et utiles
- [ ] Les fichiers générés suivent les conventions Angular 21
- [ ] Tests unitaires pour vérifier la génération des fichiers
- [ ] Documentation dans `DOCUMENTATION/` est à jour

## 🧪 Tester l'Intégration

### Créer un Projet Test

```bash
# 1. Créer un projet Angular temporaire
ng new test-plugin-integration

# 2. Tester le plugin
npx @configjs/cli [plugin-name] --for angular
# ou avec le CLI local:
npm run cli -- [plugin-name] --for angular

# 3. Vérifier les fichiers créés
ls -la src/
cat vitest.config.ts
cat src/test.ts
cat src/app/components/

# 4. Vérifier app.config.ts
cat src/app/app.config.ts
# Doit contenir les imports et providers corrects
```

### Vérifier les Modifications

```bash
# app.config.ts doit avoir:
grep -i "provideExperimentalZonelessChangeDetection\|provideAnimationsAsync\|provideRouter" src/app/app.config.ts

# vitest.config.ts doit exister:
test -f vitest.config.ts && echo "✅ vitest.config.ts exists"

# src/test.ts doit exister:
test -f src/test.ts && echo "✅ src/test.ts exists"

# Composants doivent être créés:
test -d src/app/components && echo "✅ components directory exists"
```

## 🎨 Bonnes Pratiques

### 1. Toujours Vérifier que le Fichier Existe
```typescript
async configure(projectPath: string) {
  // ❌ Mauvais: Peut échouer si le fichier n'existe pas
  await addProviderToAppConfig(projectPath, 'zoneless');

  // ✅ Bon: Vérifier d'abord
  const appConfigPath = resolve(projectPath, 'src', 'app.config.ts');
  if (await pathExists(appConfigPath)) {
    await addProviderToAppConfig(projectPath, 'zoneless');
  } else {
    logger.warn('app.config.ts not found, skipping provider');
  }
}
```

### 2. Ne Pas Dupliquer les Imports
Les utilitaires vérifient déjà si un provider existe avant de l'ajouter - aucune action supplémentaire nécessaire.

### 3. Fournir des Messages Utiles
```typescript
console.log(`
  ✨ Plugin configured successfully!

  Created files:
  - vitest.config.ts
  - src/test.ts

  Next steps:
  1. npm install
  2. npm run test
`);
```

### 4. Utiliser les Logger de ConfigJS
```typescript
import { logger } from '../../utils/logger';

logger.success('Configuration successful');
logger.warn('File already exists, skipping');
logger.error('Configuration failed');
```

## 📚 Exemples Complets

Voir `src/plugins/utils/angular-21-examples.ts` pour 6 exemples complets:
1. **exampleVitestAngularPlugin** - Test framework
2. **exampleNgrxSignalsPlugin** - State management
3. **exampleLucideAngularPlugin** - Icon library
4. **exampleAngularCdkPlugin** - Component patterns
5. **exampleZodAngularPlugin** - Schema validation
6. **exampleCompleteAngularSetupPlugin** - Setup complet

## 🚀 Commandes de Développement

```bash
# Lint et tests
npm run lint
npm run typecheck
npm run test -- --run

# Build
npm run build

# Développement
npm run dev
```

## ❓ FAQ

**Q: Que faire si app.config.ts n'existe pas?**
A: Les utilitaires vérifient l'existence du fichier. Si absent, afficher un message d'erreur utile.

**Q: Peut-on avoir plusieurs providers du même type?**
A: Non, les utilitaires évitent les doublons en vérifiant le contenu du fichier d'abord.

**Q: Les fichiers générés sont-ils personnalisables?**
A: Oui, les utilitaires génèrent des templates. Les développeurs peuvent les modifier après création.

**Q: Comment tester les utilitaires?**
A: Voir `tests/unit/plugins/utils/` pour les tests unitaires des utilitaires.

---

Pour des questions ou améliorations, consultez la documentation principale: `docs/PLUGIN_DEVELOPMENT.md`
