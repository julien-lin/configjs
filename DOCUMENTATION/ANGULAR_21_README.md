# Angular 21 : Documentation Complète

> 📚 Centre de ressources pour développer avec Angular 21 et ConfigJS

---

## 🎯 Où Commencer ?

### Je suis nouveau avec Angular 21
👉 **Commencez par :** [ANGULAR_21_COMPATIBILITY.md](ANGULAR_21_COMPATIBILITY.md)
- Comprendre les changements majeurs
- Zoneless vs zone.js
- Vitest vs Karma
- NgRx Signals vs NgRx Store

### J'ai un nouveau projet Angular 21
👉 **Suivez :** [ANGULAR_21_INSTALLATION_GUIDE.md](ANGULAR_21_INSTALLATION_GUIDE.md) → **Scénario 1**
- Setup moderne recommandé
- Étapes pas à pas
- Checklist complète

### Je migre depuis Angular ≤20
👉 **Suivez :** [ANGULAR_21_INSTALLATION_GUIDE.md](ANGULAR_21_INSTALLATION_GUIDE.md) → **Scénario 2**
- Phases de migration
- Gestion des risques
- Rollback si problème

### Je dois utiliser les plugins Angular de ConfigJS
👉 **Lire :** [ANGULAR_21_PLUGIN_GUIDE.md](ANGULAR_21_PLUGIN_GUIDE.md)
- Comment les plugins configurent le projet
- Les utilitaires disponibles
- Exemples d'implémentation

### Je veux voir des exemples complets
👉 **Consulter :** [ANGULAR_21_PLUGIN_EXAMPLES.md](ANGULAR_21_PLUGIN_EXAMPLES.md)
- Code complet des plugins
- Patterns communs
- Cas d'usage réels

---

## 📊 Tableau de Navigation Rapide

| Document | Pour Qui | Contient |
|----------|---------|----------|
| **ANGULAR_21_COMPATIBILITY.md** | Tout le monde | Incompatibilités, pièges, choix architecturaux |
| **ANGULAR_21_INSTALLATION_GUIDE.md** | Devs | Steps pas à pas, 4 scénarios, erreurs courantes |
| **ANGULAR_21_PLUGIN_GUIDE.md** | Dev Plugins | APIs, exemples, intégration |
| **ANGULAR_21_PLUGIN_EXAMPLES.md** | Dev Plugins | Code complet, 6 exemples |

---

## 🔴 Les Décisions Cruciales

Vous devez répondre à ces questions UNE SEULE FOIS au démarrage du projet :

### 1. Framework de Test ?

```
Choix 1 : Vitest ✅ RECOMMANDÉ
└─ Mode : Node.js
   Vitesse : ⚡⚡⚡ (1 sec)
   Setup : Facile
   Compatible : Zoneless ready

Choix 2 : Karma ❌ Legacy
└─ Mode : Navigateur
   Vitesse : 🐢 (30 sec)
   Setup : Complexe
   Compatible : Ancien
```

**Décision :** `Vitest` ← pour tous les nouveaux projets

### 2. Change Detection ?

```
Choix 1 : Zoneless ✅ RECOMMANDÉ
└─ Perfs : +30% Core Web Vitals
   Bundle : -20KB
   Compatibilité : Libs récentes
   Complexité : Moyenne

Choix 2 : Zone.js ❌ Legacy
└─ Perfs : Baseline
   Bundle : +20KB
   Compatibilité : Toutes les libs
   Complexité : Faible
```

**Décision :** `Zoneless` ← pour tous les nouveaux projets

### 3. State Management ?

```
Choix 1 : NgRx Signals ✅ RECOMMANDÉ
└─ Style : Signals-first
   Bundle : -30KB
   Perfs : 🚀
   Learning : Nouveau, moins de docs
   Effects : ❌ Non intégrés

Choix 2 : NgRx Store ❌ Legacy
└─ Style : Observable-heavy
   Bundle : +30KB
   Perfs : Normale
   Learning : Bien documenté
   Effects : ✅ Intégrés
```

**Décision :** `NgRx Signals` ← pour tous les nouveaux projets

---

## 📋 Stack Recommandé pour Angular 21

```typescript
// Framework
Angular 21.x              // ✅ Version cible

// Testing
Vitest                    // ✅ Testing rapide
@vitest/angular          // ✅ Intégration Angular

// Change Detection
Zoneless mode            // ✅ Performance
(no zone.js)             // ✅ Bundle léger

// State Management
@ngrx/signals            // ✅ Signals-first
Zod                      // ✅ Validation type-safe

// UI
@angular/cdk             // ✅ Composants de base
lucide-angular           // ✅ Icons (400+)

// HTTP
@angular/common/http     // ✅ Native
toSignal()               // ✅ Convert Observable→Signal

// Routing
@angular/router          // ✅ Standalone-ready
```

**Bundle Total (Gzipped) :** ~80KB (vs 150KB Angular 20)
**Test Speed :** 2-5 sec (vs 30 sec Karma)
**Core Web Vitals :** +30% performance

---

## 🚨 Les Pièges à Éviter ABSOLUMENT

### ❌ Piège #1 : Vitest + Karma Ensemble
```bash
# ❌ NE PAS FAIRE
npm install @vitest/angular vitest
# ... puis garder karma.conf.js
# → Configuration confuse, tests cassés

# ✅ FAIRE : Choisir UNE SEULE
ng test          # Utilise Karma SI présent
npm run test     # Utilise Vitest SI configuré
```

### ❌ Piège #2 : Zoneless + zone.js Ensemble
```typescript
// ❌ NE PAS FAIRE
providers: [
  provideExperimentalZonelessChangeDetection(),
]
// src/polyfills.ts
import 'zone.js';  // ← Ça annule tout !

// ✅ FAIRE : Choisir UN SEUL
// Soit Zoneless (commenter zone.js)
// Soit zone.js (ne pas ajouter provideExperimentalZonelessChangeDetection)
```

### ❌ Piège #3 : Observable + Signal Mélangés
```typescript
// ❌ NE PAS FAIRE
export class DataService {
  data$: Observable<any>;
  count = signal(0);
  
  loadData() {
    this.data$.subscribe(d => {
      this.count.set(d.length);  // Mix!
    });
  }
}

// ✅ FAIRE : Choisir UN SEUL
// Soit tout Observable (RxJS)
// Soit tout Signal (moderne)
```

### ❌ Piège #4 : NgRx Store + Signals Ensemble
```bash
# ❌ NE PAS FAIRE
npm install @ngrx/store @ngrx/signals
# → Bundle lourd, confusion

# ✅ FAIRE : Choisir UN SEUL
npm install @ngrx/signals  # Moderne
# ou
npm install @ngrx/store    # Legacy
```

---

## ✅ Checklist Démarrage Projet

```bash
# 1. Créer le projet
ng new my-app --version 21

# 2. Configuration recommandée
cd my-app

# 3. Installer essentials
npm install @angular/cdk @angular/animations

# 4. Tests (Vitest)
npm install --save-dev @vitest/angular vitest jsdom
npx @configjs/cli vitest --for angular

# 5. State (NgRx Signals)
npm install @ngrx/signals zod

# 6. UI (Icons)
npm install lucide-angular

# 7. Vérifier
npm run test              # Tests passent
npm run build             # Build réussit
ng serve                  # Serveur démarre

# ✅ Prêt !
```

---

## 📖 Guides Détaillés

### Pour les Développeurs d'Applications

1. **Bien démarrer**
   - Lire : ANGULAR_21_COMPATIBILITY.md
   - Suivre : ANGULAR_21_INSTALLATION_GUIDE.md

2. **Patterns Recommandés**
   - Signals partout (pas Observable)
   - Zod pour la validation
   - Vitest pour les tests
   - Zoneless mode

3. **Exemple d'Application**
   - Voir : ANGULAR_21_PLUGIN_EXAMPLES.md → "Scénario Utilisateur"

### Pour les Développeurs de Plugins

1. **Créer un Plugin**
   - Lire : ANGULAR_21_PLUGIN_GUIDE.md
   - Voir : ANGULAR_21_PLUGIN_EXAMPLES.md

2. **Utilitaires Disponibles**
   - `addProviderToAppConfig()` - Ajouter providers
   - `generateVitestConfig()` - Créer vitest.config.ts
   - `generateSignalStoreTemplate()` - Signal Store exemple
   - `generateIconComponent()` - Icon component
   - `generateAccessibleMenuComponent()` - Menu CDK

3. **Implémenter un Plugin**
   ```typescript
   export const myPlugin: Plugin = {
     // ... metadata
     configure: async (ctx: ProjectContext) => {
       await addProviderToAppConfig(ctx.projectRoot, 'animations');
       // ... autres configurations
     },
   };
   ```

---

## 🎓 Concepts Clés Expliqués

### Signal vs Observable
```typescript
// Signal : Simple, performant, Zoneless-ready
const count = signal(0);
count.set(count() + 1);  // Reactif

// Observable : Complexe, legacy, RxJS
const count$ = new BehaviorSubject(0);
count$.next(count$.value + 1);  // Pipe-based

// Qui utiliser ?
// Angular 21 : Signals
// Si besoin RxJS : Observable
// Ne pas mélanger !
```

### Zoneless Mode
```typescript
// Avec Zone.js (Angular ≤20)
setTimeout(() => {
  this.data = 'new';  // Zone.js détecte, Angular re-render
}, 1000);

// Sans Zone.js (Angular 21)
const data = signal('old');
setTimeout(() => {
  data.set('new');  // Explicite, performant
}, 1000);
```

### Vitest vs Karma
```
Vitest: Node.js → Rapide (1-5 sec)
Karma:  Navigateur → Lent (20-30 sec)

Vitest: Configuration simple
Karma:  Configuration complexe

Vitest: Moderne (2024)
Karma:  Legacy (2015)
```

---

## 🔗 Ressources Officielles

- [Angular 21 Docs](https://angular.dev)
- [Zoneless Guide](https://angular.dev/guide/zoneless)
- [NgRx Signals](https://ngrx.io/guide/signals)
- [Vitest Docs](https://vitest.dev)
- [Zod Documentation](https://zod.dev)

---

## 💡 Questions Fréquentes

### Q: Puis-je utiliser Angular Material avec Zoneless ?
**R:** Oui, si version 21+. Sinon, utiliser Daisy UI ou Tailwind + CDK.

### Q: Ai-je besoin de RxJS si j'utilise Signals ?
**R:** Moins qu'avant, mais toujours utile pour HTTP et Events avancés.

### Q: Et les vieilles libs Angular ?
**R:** Upgrader ou chercher une alternative moderne. Zoneless non compatible.

### Q: Puis-je réactiver zone.js après Zoneless ?
**R:** Oui, mais perdez les bénéfices de performance.

### Q: Comment déboguer les Signals ?
**R:** Vue Chrome DevTools → Signals panel (built-in Angular 21)

---

## 🚀 Prochaines Étapes

1. **Lire** ANGULAR_21_COMPATIBILITY.md
2. **Choisir** votre scénario (Novo/Migration)
3. **Suivre** ANGULAR_21_INSTALLATION_GUIDE.md
4. **Vérifier** via checklist
5. **Déployer** 🎉

---

**Version:** Angular 21.x  
**Last Updated:** Janvier 2026  
**Maintainers:** ConfigJS Team
