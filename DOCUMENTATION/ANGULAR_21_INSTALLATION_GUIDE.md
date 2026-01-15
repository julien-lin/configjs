# Angular 21 : Workflow d'Installation Sécurisé

> Guide pas à pas pour installer les plugins Angular 21 sans créer de conflits

---

## 📋 Avant de Commencer

**Répondez à ces questions :**

1. **Quel est votre point de départ ?**
   - [ ] Nouveau projet Angular 21 fraîchement créé
   - [ ] Migration depuis Angular ≤20
   - [ ] Projet existant Angel 21

2. **Avez-vous d'anciennes dépendances ?**
   - [ ] `@ngrx/store` (NgRx classic)
   - [ ] `karma`, `jasmine`, `@types/jasmine`
   - [ ] `zone.js` dans polyfills.ts
   - [ ] Des libs Angular <15

3. **Stratégie de test ?**
   - [ ] Je veux Vitest (recommandé)
   - [ ] Je dois garder Karma

4. **Mode performance ?**
   - [ ] Je veux Zoneless (recommandé)
   - [ ] Je veux zone.js (compatibilité)

---

## 🎯 Scénario 1 : Nouveau Projet Angular 21 (IDÉAL)

### Situation
```bash
# Viens de faire
ng new my-app --version 21
```

### Workflow Recommandé

#### Étape 1 : Configuration de Base

```bash
cd my-app

# 1.1 Ajouter Angular 21 essentials
npm install @angular/animations @angular/cdk

# 1.2 Configurer app.config.ts pour Zoneless
# (Manuellement ou via ConfigJS)
```

**Fichier : src/app/app.config.ts**
```typescript
import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),  // ✅ Zoneless
    provideRouter(routes),
    provideAnimationsAsync(),
  ],
};
```

#### Étape 2 : Configurer le Testing avec Vitest

```bash
# 2.1 Installer Vitest
npm install --save-dev @vitest/angular vitest jsdom

# 2.2 Créer vitest.config.ts
npx @configjs/cli vitest --for angular

# 2.3 Vérifier les fichiers créés
ls -la vitest.config.ts
ls -la src/test.ts
```

**Fichier : vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';
import { getVitestConfig } from 'ng-vitest-helper';

export default defineConfig(
  getVitestConfig({
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test.ts'],
  }),
);
```

#### Étape 3 : État Management avec NgRx Signals

```bash
# 3.1 Installer NgRx Signals
npm install @ngrx/signals

# 3.2 Installer validation
npm install zod

# 3.3 Créer Signal Stores
mkdir -p src/app/store
```

**Fichier : src/app/store/user.store.ts**
```typescript
import { signalStore, withState, withMethods } from '@ngrx/signals';
import { z } from 'zod';

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

export const userStore = signalStore(
  { providedIn: 'root' },
  withState({
    users: [] as z.infer<typeof userSchema>[],
    loading: false,
  }),
  withMethods((store) => ({
    addUser: (user: z.infer<typeof userSchema>) => {
      const validated = userSchema.safeParse(user);
      if (validated.success) {
        store.patchState({
          users: [...store.users(), validated.data],
        });
      }
    },
  })),
);
```

#### Étape 4 : UI & Icons

```bash
# 4.1 Installer Lucide pour les icônes
npm install lucide-angular

# 4.2 Créer composant Icon réutilisable
npx @configjs/cli lucide-angular --for angular
```

#### Étape 5 : Vérifier tout Fonctionne

```bash
# 5.1 Tests
npm run test

# 5.2 Build
npm run build

# 5.3 Vérifier bundle
npm run build -- --stats-json
# Installer webpack-bundle-analyzer si besoin
npm install --save-dev webpack-bundle-analyzer
```

#### ✅ Checklist Étape 1

- [ ] `npm run test` passe
- [ ] `npm run build` crée un bundle
- [ ] `ng serve` démarre sans erreurs
- [ ] Aucun message `peer dependency` en rouge
- [ ] `vitest.config.ts` existe
- [ ] `src/test.ts` existe (version Vitest)
- [ ] `karma.conf.js` n'existe PAS
- [ ] `zone.js` ne figure pas dans `polyfills.ts`

---

## 🎯 Scénario 2 : Migration depuis Angular ≤20

### Situation
```bash
# Vous avez un projet Angular 20 existant avec :
# - Karma/Jasmine
# - NgRx Store classic
# - zone.js
# - Vieilles libs
```

### Workflow de Migration (PAR ÉTAPES)

#### Phase 1 : Mise à Jour Angular 21 (CRITIQUE)

```bash
# 1.1 Mettre à jour le framework
ng update @angular/core @angular/cli --major

# 1.2 Vérifier qu'il n'y a pas d'erreurs
npm run build
```

**⚠️ Blockers Potentiels :**
- Erreurs de compilation TypeScript
- Dépendances incompatibles
- Scripts dans package.json cassés

#### Phase 2 : Migration Vitest (INDÉPENDANT)

**⚠️ ATTENTION : À faire AVANT de changer la change detection**

```bash
# 2.1 Installer Vitest EN PARALLÈLE (Karma reste intouché)
npm install --save-dev @vitest/angular vitest jsdom

# 2.2 Créer vitest.config.ts SANS toucher karma.conf.js
npx @configjs/cli vitest --for angular

# 2.3 DUPLIQUER et CONVERTIR les tests
# Les vieux tests Karma restent intacts
# Les nouveaux tests Vitest à côté

# 2.4 Exécuter les tests Vitest
npm run test:vitest

# 2.5 Une fois que tout passe, SUPPRIMER Karma
npm uninstall --save-dev karma karma-chrome-launcher jasmine-core @types/jasmine
rm karma.conf.js
# Garder src/test.ts mais utiliser la version Vitest
```

**Exemple : Convertir un test**

```typescript
// ❌ ANCIEN (Karma + Jasmine)
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load data', fakeAsync(() => {
    component.loadData();
    tick(1000);
    expect(component.data).toBe('expected');
  }));
});

// ✅ NOUVEAU (Vitest + Signals)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],  // standalone!
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load data', async () => {
    component.loadData();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(component.data()).toBe('expected');  // .data est un Signal
  });
});
```

#### Phase 3 : Zoneless Mode (DÉLICATE)

**⚠️ ATTENTION : À faire APRÈS les tests**

```bash
# 3.1 Activer Zoneless dans app.config.ts
# import { provideExperimentalZonelessChangeDetection } from '@angular/core';
# providers: [provideExperimentalZonelessChangeDetection(), ...]

# 3.2 Commenter zone.js
# src/polyfills.ts : // import 'zone.js';

# 3.3 Lancer les tests
npm run test

# ⚠️ SI ERREURS :
# - Les vieilles libs ne supportent pas Zoneless
# - Les composants ne se mettent pas à jour
# SOLUTION : Réactiver zone.js temporairement
#   - Décommenter zone.js dans polyfills.ts
#   - Continuer avec zone.js jusqu'à avoir le temps d'upgrader les libs
```

**Libs problématiques + Solutions :**

| Lib | Version Problème | Solution |
|---|---|---|
| `ng2-charts` | <7 | `npm install ng2-charts@latest` |
| `ngx-swiper` | <15 | Utiliser Swiper vanilla + wrapper Angular |
| `ag-grid` | <32 | `npm install ag-grid@latest` |
| `@ngx-translate` | <14 | Utiliser `@angular/localize` ou mettre à jour |

#### Phase 4 : NgRx Migration (OPTIONNEL)

```bash
# 4.1 Installer NgRx Signals EN PARALLÈLE
npm install @ngrx/signals

# 4.2 CRÉER les nouveaux Stores avec Signals
# Les anciens Stores @ngrx/store restent intacts

# 4.3 Migrer features une par une
# Feature A : ancien @ngrx/store
# Feature B : nouveau @ngrx/signals
# Graduellement, tout passe à Signals

# 4.4 Une fois tout migré, supprimer @ngrx/store
npm uninstall @ngrx/store @ngrx/effects
```

#### ✅ Checklist Phase 2

- [ ] `npm run test` passe (Vitest)
- [ ] `npm run build` crée un bundle
- [ ] Aucun `peer dependency` warning rouge
- [ ] `karma.conf.js` a été supprimé
- [ ] Tests Vitest exécutés et passés

#### ✅ Checklist Phase 3

- [ ] `provideExperimentalZonelessChangeDetection()` dans app.config.ts
- [ ] `zone.js` commenté dans polyfills.ts
- [ ] `npm run test` passe
- [ ] `npm run build` crée un bundle
- [ ] Pas d'erreurs Change Detection

#### ✅ Checklist Phase 4

- [ ] `@ngrx/signals` installé
- [ ] Nouveaux Stores créés
- [ ] Tests mis à jour
- [ ] Anciens Stores supprimés
- [ ] `@ngrx/store` désinstallé

---

## 🎯 Scénario 3 : Je dois Garder zone.js (Compatibilité)

### Situation
```bash
# Vous avez une lib Angular <15 qui CASSE avec Zoneless
# Exemple : vieux composant de graphe ou carrousel
```

### Solution : Mode Hybride

**NE PAS activer Zoneless :**

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
// ❌ NE PAS importer provideExperimentalZonelessChangeDetection

export const appConfig: ApplicationConfig = {
  providers: [
    // Zone.js sera automatiquement chargé
    provideRouter(routes),
  ],
};
```

**Garder zone.js :**

```typescript
// src/polyfills.ts
import 'zone.js';  // ✅ Garder pour compatibilité
import 'zone.js/testing';  // ✅ Pour tests
```

**Inconvénient :**
- ❌ Performance Zoneless perdue
- ❌ Bundle un peu plus lourd
- ✅ Mais compatibilité 100%

**Plan d'action :**
1. Consulter docs de la vieille lib
2. Vérifier s'il y a une version Angel 21-compatible
3. Si oui : `npm install lib@latest`
4. Si non : chercher une alternative moderne
5. Dernier recours : garder zone.js

---

## 🎯 Scénario 4 : Je dois Garder Karma/Jasmine

### Situation
```bash
# Vous avez besoin de Karma pour une raison spécifique
# (rare, mais possible)
```

### Solution : Garder Karma

**NE PAS installer Vitest :**

```bash
# ❌ Ne pas faire
npm install @vitest/angular vitest

# ✅ Garder
# karma.conf.js
# src/test.ts (version Karma)
# @types/jasmine
```

**Tests normalement :**

```bash
ng test  # Utilise Karma
```

**Inconvénients :**
- ❌ Tests très lents (20-30 secondes)
- ❌ Flaky (parfois fail au random)
- ✅ Compatible avec tout

---

## ⚠️ Erreurs Courantes et Solutions

### Erreur 1 : "Cannot find module vitest"

```bash
# ❌ Vous avez installé Vitest mais pas @vitest/angular
npm install --save-dev @vitest/angular vitest jsdom
```

### Erreur 2 : "Zone is not defined"

```bash
# Zoneless n'aime pas zone.js
# Solution 1 : Supprimer zone.js (Zoneless)
# Solution 2 : Supprimer Zoneless (zone.js)
```

### Erreur 3 : "Cannot read property X of undefined"

```typescript
// ❌ Changement vers Signals
this.data = undefined;      // RxJS pattern
this.data().foo;            // Crash si data est undefined

// ✅ Correct
this.data = signal<Data | null>(null);
this.data()?.foo;           // Safe navigation
```

### Erreur 4 : "Peer dependency warning"

```bash
npm install something@old
# ⚠️ peer dep missing: angular@21

# Solution :
npm install something@new
# ou
npm install something --force  # À éviter !
```

---

## 📊 Tableau Récapitulatif : Qui Fait Quoi

| Scénario | Testing | Zoneless | State Mgmt |
|----------|---------|----------|-----------|
| **Nouveau projet** | Vitest ✅ | Oui ✅ | Signals ✅ |
| **Migration (step 1)** | Vitest ✅ | Non | Store classique |
| **Migration (step 2)** | Vitest ✅ | Oui ✅ | Signaux ✅ |
| **Vieille lib** | Vitest ✅ | Non | Selon lib |
| **Legacy mode** | Karma | Non | Store classique |

---

## 🚀 Commandes Utiles

```bash
# Tests
npm run test              # Vitest une fois
npm run test:watch       # Vitest mode watch
npm run test:coverage    # Rapport de couverture

# Build
npm run build            # Build production
npm run build -- --stats-json  # Analyze bundle

# Development
ng serve                 # Dev server
ng serve --open         # Ouvrir dans navigateur

# Checks
npm run lint            # ESLint
npm run typecheck       # TypeScript
npm run test -- --run   # Vitest une fois
```

---

## 📞 Problèmes ?

Consultez :
- 📖 [ANGULAR_21_COMPATIBILITY.md](ANGULAR_21_COMPATIBILITY.md)
- 📖 [ANGULAR_21_PLUGIN_GUIDE.md](ANGULAR_21_PLUGIN_GUIDE.md)
- 📖 [ANGULAR_21_PLUGIN_EXAMPLES.md](ANGULAR_21_PLUGIN_EXAMPLES.md)
