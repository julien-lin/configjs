# Angular 21 : Compatibilité et Pièges à Éviter

> ⚠️ **Document critique** : Les décisions prises lors de la configuration initiale d'Angular 21 impactent toute la stratégie de plugins et de dépendances. Lisez ce guide avant d'installer quoi que ce soit.

---

## 🎯 Vue d'Ensemble

Angular 21 n'est pas juste une mise à jour mineure - c'est un changement d'architecture majeur qui rompt la compatibilité avec plusieurs patterns Angular 12-20.

| Mode | Zone.js | Testing | Boilerplate | Bundle |
|------|---------|---------|-------------|--------|
| **Angular ≤20** (Legacy) | ✅ Obligatoire | Karma/Jasmine | Beaucoup | Lourd |
| **Angular 21** (Modern) | ❌ Optionnel | **Vitest** | Minimal | Léger |

**Conséquence** : Une lib compilée pour Angular 20 avec zone.js ne fonctionne peut-être pas en Zoneless sur Angular 21.

---

## 🔴 Conflit #1 : Vitest vs Jasmine/Karma (MAJEUR)

### Le Problème

Vous **NE POUVEZ PAS** avoir les deux moteurs de test actifs simultanément pour les mêmes tests.

#### Jasmine/Karma (Ancien)
```
karma.conf.js → Lance le navigateur → Exécute tests avec Jasmine
```

#### Vitest (Nouveau)
```
vitest.config.ts → Node.js JSDOM → Exécute tests ultra-rapidement
```

### Impact sur `ng test`

```bash
# ❌ Si vous avez BOTH karma.conf.js ET vitest.config.ts :
ng test

# Angular cherche karma.conf.js d'abord
# Les tests Vitest sont ignorés
# Configuration confuse, performances imprévisibles
```

### Solution : Choix Explicite

#### Option A : **Migration Complète vers Vitest** (Recommandé)

```bash
# 1. Supprimer les fichiers Karma
rm karma.conf.js
rm src/test.ts

# 2. Supprimer les dépendances Jasmine
npm uninstall --save-dev karma karma-chrome-launcher karma-coverage karma-jasmine jasmine-core @types/jasmine

# 3. Installer Vitest
npm install --save-dev @vitest/angular vitest jsdom

# 4. Créer vitest.config.ts (via ConfigJS ou manuel)
npx @configjs/cli vitest --for angular

# 5. Mettre à jour package.json scripts
# "test": "vitest run"
# "test:watch": "vitest"
# "test:coverage": "vitest run --coverage"
```

**Avant (Karma)**
```bash
ng test                          # 🐢 Démarre navigateur (20s)
# Teste dans le navigateur (flaky, lent)
```

**Après (Vitest)**
```bash
npm run test                     # ⚡ Direct Node.js (1s)
npm run test:watch              # 🔄 Instant feedback
npm run test:coverage           # 📊 Couverture intégrée
```

#### Option B : Garder Karma (Non Recommandé)

Si vous avez des tests qui ne peuvent **vraiment** pas fonctionner avec Vitest :

```bash
# 1. Garder karma.conf.js et src/test.ts
# 2. SUPPRIMER vitest.config.ts
rm vitest.config.ts

# 3. NE PAS installer @vitest/angular
npm uninstall --save-dev @vitest/angular vitest jsdom

# ⚠️ Acceptez les performances lentes et réussies obsolètes
```

### ✅ Checklist Vitest

- [ ] Supprimer `karma.conf.js`
- [ ] Supprimer `src/test.ts` (ancien)
- [ ] Désinstaller `@types/jasmine`
- [ ] Créer nouveau `vitest.config.ts`
- [ ] Créer nouveau `src/test.ts` (version Vitest)
- [ ] Mettre à jour `package.json` scripts
- [ ] Exécuter `npm run test` → doit passer
- [ ] Exécuter `npm run test:watch` → mode interactif OK

---

## 🔴 Conflit #2 : Zoneless Mode (Zone.js)

### Qu'est-ce que c'est ?

**Zone.js** (Angular ≤20) : Patche CHAQUE asynchrone (setTimeout, fetch, etc.) pour alerter Angular que quelque chose a changé → Ré-render.

```typescript
// Avec zone.js (Angular ≤20)
setTimeout(() => {
  this.data = newValue;  // ✅ Zone.js détecte le changement
                         // ✅ Vue se met à jour automatiquement
}, 1000);
```

**Zoneless** (Angular 21) : Vous êtes responsable de dire à Angular "quelque chose a changé".

```typescript
// Sans zone.js (Angular 21 - Zoneless)
setTimeout(() => {
  this.data = newValue;  // ❌ Angular ne sait pas qu'il faut re-render
                         // ❌ Vous DEVEZ utiliser Signals
}, 1000);

// Solution : Utiliser Signals
const data = signal(initialValue);
setTimeout(() => {
  data.set(newValue);    // ✅ Angular voit le changement
}, 1000);
```

### Les Vieilles Libs Cassées

Certaines bibliothèques UI (graphes, carousels, etc.) datant d'Angular 12-15 reposent sur zone.js pour déclencher les mises à jour.

#### Symptômes

```typescript
import { ChartLibraryAngular12 } from 'old-chart-lib';

export class DashboardComponent {
  @ViewChild(ChartLibraryAngular12) chart: ChartLibraryAngular12;

  ngAfterViewInit() {
    // Les données changent dans le composant
    this.data = newData;
    
    // ❌ EN ANGULAR 21 ZONELESS :
    // La lib ne re-render PAS car elle s'attend à zone.js
    // L'écran affiche l'ancien graphe
  }
}
```

### Solution : Décision Architecturale

#### Option A : **Zoneless Mode** (Recommandé - Angular 21 moderne)

```typescript
// app.config.ts
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),  // ✅ Mode moderne
    // ... autres providers
  ],
};
```

**Avantages**
- ✅ +30% amélioration Core Web Vitals (LCP/INP)
- ✅ Moins de CPU consommé
- ✅ Bundle plus petit (~20KB saved)
- ✅ Performance prévisible

**Inconvénients**
- ❌ Incompatibilité avec vieilles libs (Angular <15)
- ❌ Demande un refactorisation des tests

#### Option B : Garder Zone.js (Compatibilité)

```typescript
// app.config.ts
// ❌ NE PAS ajouter provideExperimentalZonelessChangeDetection()
// Zone.js reste activé par défaut

export const appConfig: ApplicationConfig = {
  providers: [
    // ... providers
    // Zone.js sera automatiquement chargé dans polyfills.ts
  ],
};
```

**Avantages**
- ✅ Compatible avec 99% des libs Angular 12-20
- ✅ Zéro refactorisation nécessaire

**Inconvénients**
- ❌ Performance inférieure (raison pour laquelle Angular 21 existe)
- ❌ Bundle plus lourd

### 🔧 Migration Zoneless : Checklist

**Étape 1 : Activer Zoneless**
```typescript
// app.config.ts
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

providers: [
  provideExperimentalZonelessChangeDetection(),
  // ... autres
]
```

**Étape 2 : Remplacer les Vieilles Libs**

| Vieille Lib (Angular ≤20) | Remplacement (Angular 21) | Raison |
|---|---|---|
| `ng2-charts` | `ngx-echarts` ou `chart.js` v4+ | Zoneless-ready |
| `ngx-swiper` | `ng-image-gallery` | Support Signals |
| `ag-grid` < v32 | `ag-grid` v33+ | Zoneless-compatible |

**Étape 3 : Utiliser Signals Partout**

```typescript
// ❌ Ancien pattern (avec zone.js)
export class DashboardComponent {
  data: any;
  
  loadData() {
    this.data = newValue;  // Repose sur zone.js
  }
}

// ✅ Nouveau pattern (Signals)
export class DashboardComponent {
  data = signal<any>(null);
  
  loadData() {
    this.data.set(newValue);  // Explicite et performant
  }
}
```

**Étape 4 : Mettre à Jour Tests**

```typescript
// ❌ Ancien (Karma + fakeAsync)
it('should load data', fakeAsync(() => {
  component.loadData();
  tick(1000);  // Attend zone.js...
  expect(component.data).toBe(expectedValue);
}));

// ✅ Nouveau (Vitest + await)
it('should load data', async () => {
  component.loadData();
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(component.data()).toBe(expectedValue);  // data est un Signal
});
```

**Étape 5 : Vérifier les Polyfills**

```typescript
// src/polyfills.ts - SUPPRIMER zone.js si en Zoneless
// ❌ À SUPPRIMER
// import 'zone.js';
// import 'zone.js/testing';

// ✅ À GARDER (recommandé pour stabilité, à commenter si problèmes)
import '@angular/localize/init';
```

---

## 🟡 Conflit #3 : NgRx Signals vs NgRx Store Classic

### Le Problème

NgRx existe en deux formes incompatibles :

```
@ngrx/store (Classic)          @ngrx/signals (Modern)
├─ Actions                     ├─ signalStore()
├─ Reducers                    ├─ withState()
├─ Effects                     ├─ withMethods()
└─ Selectors                   └─ Pas d'Effects
(Complexe, lourd)              (Simple, performant)
```

### Quand on les Mélange

```bash
npm install @ngrx/store @ngrx/signals
```

```typescript
// App State: NgRx Store (Classic)
export class AppState {
  users$: Observable<User[]>;  // RxJS Observable
}

// Feature State: NgRx Signals (Modern)
export const userStore = signalStore(
  withState({ users: [] }),
);

// ❌ Problème : Deux patterns différents dans la même app
// ❌ Bundle lourd : 2x dépendances
// ❌ Confusion entre Observable et Signal
```

### Solution : Choisir UNE SEULE Stratégie

#### Option A : **NgRx Signals** (Recommandé pour Angular 21)

```bash
npm install @ngrx/signals zod
```

```typescript
// src/app/store/user.store.ts
import { signalStore, withState, withMethods } from '@ngrx/signals';
import { z } from 'zod';

const userSchema = z.object({
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
      const result = userSchema.safeParse(user);
      if (result.success) {
        store.patchState({
          users: [...store.users(), result.data],
        });
      }
    },
  })),
);

// Dans un composant
export class UserListComponent {
  store = inject(userStore);

  get users() {
    return this.store.users;  // Signal !
  }
}
```

**Avantages**
- ✅ Designed for Zoneless
- ✅ Bundle léger
- ✅ Type-safe avec Zod
- ✅ Syntaxe moderne

**Inconvénients**
- ❌ Plus récent, moins d'exemples online
- ❌ Pas d'Effects intégrés

#### Option B : **NgRx Store Classic** (Si vous avez besoin d'Effects)

```bash
npm install @ngrx/store @ngrx/effects
```

```typescript
// C'est l'ancien pattern que tout le monde connaît
// Actions, Reducers, Effects, Selectors
// Fonctionne mais lourd sur Angular 21
```

**Avantages**
- ✅ Bien documenté
- ✅ Effects intégrés

**Inconvénients**
- ❌ Lourd pour Angular 21
- ❌ Incompatible avec Signals
- ❌ Plus de boilerplate

### ✅ Checklist NgRx Signals

- [ ] `npm install @ngrx/signals`
- [ ] `npm uninstall @ngrx/store` (si vous aviez ngRx classic)
- [ ] Créer `src/app/store/*.store.ts`
- [ ] Utiliser `signalStore()` + Zod
- [ ] Remplacer tous les `Observable` par des `Signal`
- [ ] Tests : utiliser `TestBed` avec `provideState()`

---

## 🟡 Conflit #4 : Peer Dependencies

### Le Problème

Certaines libs Angular 21 ont des `peerDependencies` strictes :

```json
{
  "@ngrx/signals": "^18.0.0",
  "peerDependencies": {
    "angular": "^21.0.0",
    "rxjs": "^7.8.0"
  }
}
```

### Quand ça Pose Problème

```bash
npm install @angular/material@20
# ❌ npm ERR! peer dep missing: @angular/core@21

npm install zod
# ⚠️ npm WARN peer dep: @types/zod is optional

npm install --legacy-peer-deps  # ❌ MAUVAISE SOLUTION
```

### Solution Correcte

```bash
# 1. Vérifier les versions
npm ls @angular/core

# 2. Installer avec versions exactes
npm install @ngrx/signals@21 @angular/cdk@21

# 3. Si vraiment nécessaire (rare), utiliser --force
npm install some-old-lib --force
# Mais comprenez les risques !
```

### Tableau des Versions Synchronisées (Angular 21)

| Package | Version | Notes |
|---------|---------|-------|
| @angular/* | ^21.0.0 | Core, CDK, Material |
| @ngrx/* | ^18.0.0 | ou 21.x si existe |
| typescript | ^5.5.0 | Minimum |
| rxjs | ^7.8.0 | Observable |
| zod | ^3.22.0 | Validation (indépendant) |
| vitest | ^1.0.0+ | Testing (indépendant) |

---

## 📊 Tableau Récapitulatif : Remplacements Conseillés

### État Final Recommandé pour Angular 21

| **Catégorie** | **À Installer** | **À Supprimer** | **Raison** |
|---|---|---|---|
| **Framework** | Angular 21.x | Angular ≤20 | Version cible |
| **Testing** | Vitest + @vitest/angular | Karma, Jasmine | Mode Node.js, 10x plus rapide |
| **Change Detection** | Zoneless mode | zone.js | +30% perf Web Vitals |
| **State Mgmt** | @ngrx/signals | @ngrx/store | Signal-first, Zoneless-ready |
| **Validation** | Zod | Ajv, Yup | Type-safe, meilleur DX |
| **Icons** | lucide-angular | ng-icon | 400+ SVG moderne |
| **Animations** | @angular/animations (async) | vieilles libs | Angular native, performant |
| **HTTP** | @angular/common/http | old RxJS patterns | Signals + toSignal() |
| **Forms** | Reactive Forms + Zod | Template Forms | Type-safe + validation |

---

## 🚨 Pièges Courants

### Piège #1 : Oublier de Supprimer zone.js

```typescript
// ❌ Mauvais : Zoneless activé mais zone.js encore chargé
providers: [
  provideExperimentalZonelessChangeDetection(),
],

// polyfills.ts
import 'zone.js';  // ❌ Ça annule tout !
```

**Solution**
```typescript
// polyfills.ts - COMMENTER OU SUPPRIMER
// import 'zone.js';
// import 'zone.js/testing';
```

### Piège #2 : Vieille Lib + Zoneless

```typescript
// ❌ Vieille lib qui repose sur zone.js
import { OldChartComponent } from 'angular-charts-v10';

// Avec Zoneless, elle ne se met pas à jour
// Car elle appelle setTimeout/setInterval sans notifier Angular
```

**Solution**
```typescript
// 1. Vérifier la version de la lib
npm view angular-charts latest

// 2. Mettre à jour vers une version Angular 21-compatible
npm install angular-charts@latest

// OU

// 3. Réactiver zone.js temporairement (perdre les bénéfices)
// Commenter `provideExperimentalZonelessChangeDetection()`
```

### Piège #3 : Tests qui Utilisent fakeAsync

```typescript
// ❌ Karma + fakeAsync (ne fonctionne qu'avec zone.js)
import { fakeAsync, tick } from '@angular/core/testing';

it('should work', fakeAsync(() => {
  component.loadData();
  tick(1000);  // ❌ Ne fonctionne plus bien avec Vitest
  expect(component.data).toBe(expectedValue);
}));
```

**Solution**
```typescript
// ✅ Vitest + async/await
it('should work', async () => {
  component.loadData();
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(component.data()).toBe(expectedValue);
});
```

### Piège #4 : Mélanger Observable et Signal

```typescript
// ❌ Mélange dangereux
export class DataService {
  data$: Observable<any>;     // RxJS Observable
  count = signal<number>(0);  // Signal
  
  loadData() {
    this.data$.subscribe(d => {
      this.count.set(d.length);  // Mix Observable + Signal
    });
  }
}

// Mieux : utiliser `toSignal()` ou garder Signals partout
```

---

## ✅ Checklist Complète : Migrer vers Angular 21 Moderne

```bash
# 1. Framework & Core
[ ] ng update @angular/core @angular/cli
[ ] npm install @angular/animations

# 2. Testing
[ ] npm install --save-dev @vitest/angular vitest jsdom
[ ] Créer vitest.config.ts
[ ] Créer src/test.ts (version Vitest)
[ ] npm uninstall --save-dev karma jasmine @types/jasmine
[ ] Supprimer karma.conf.js

# 3. Change Detection
[ ] Ajouter provideExperimentalZonelessChangeDetection() dans app.config.ts
[ ] Commenter zone.js dans polyfills.ts
[ ] Vérifier que toutes les libs sont Zoneless-compatible

# 4. State Management
[ ] npm install @ngrx/signals
[ ] npm uninstall @ngrx/store (optionnel)
[ ] Créer Signal Stores

# 5. Validation & Types
[ ] npm install zod
[ ] Ajouter Zod schemas aux stores

# 6. Tests Unitaires
[ ] Mettre à jour les tests : fakeAsync → async/await
[ ] Utiliser TestBed avec Vitest
[ ] npm run test -- --run

# 7. Performance
[ ] npm run build
[ ] Vérifier Bundle size
[ ] Vérifier Core Web Vitals
```

---

## 📚 Ressources

- [Angular 21 Migration Guide](https://angular.dev/update-guide)
- [Zoneless Mode Documentation](https://angular.dev/guide/zoneless)
- [NgRx Signals Guide](https://ngrx.io/guide/signals)
- [Vitest Documentation](https://vitest.dev)

---

## 🎯 Conclusion

**Pour un projet Angular 21 moderne :**

✅ **Installez :**
- Vitest (testing)
- Zoneless mode (performance)
- NgRx Signals (state)
- Zod (validation)
- Lucide Angular (icons)

❌ **Évitez :**
- Karma/Jasmine
- zone.js
- NgRx Store classic
- Vieilles libs Angular <15
- Mélanger Observable et Signal

**Bénéfice final :** Bundle -30%, Performance +30%, DX meilleur 🚀
