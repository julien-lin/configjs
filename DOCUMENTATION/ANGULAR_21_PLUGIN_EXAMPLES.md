# Exemples d'Intégration Angular 21

## 1️⃣ Exemple: Plugin Vitest Angular

### Code du Plugin
```typescript
// src/plugins/testing/vitest-angular.ts
import { Plugin, ProjectContext, InstallResult, Category } from '../../types';
import {
  generateVitestConfig,
  generateTestFile,
} from '../utils/angular-21-config';

export const vitestAngularPlugin: Plugin = {
  name: '@vitest/angular',
  displayName: 'Vitest (Angular)',
  description: 'Fast testing framework for Angular 21',
  category: Category.TESTING,
  frameworks: ['angular'],
  version: '1.0.0',

  detect: (ctx: ProjectContext) => {
    return ctx.framework === 'angular';
  },

  install: async (ctx: ProjectContext): Promise<InstallResult> => {
    console.log('Installing Vitest for Angular...');
    // Installation handled by package manager
    return {
      success: true,
      message: 'Vitest packages installed',
    };
  },

  configure: async (ctx: ProjectContext) => {
    console.log('Configuring Vitest for Angular 21...');

    try {
      // Génère vitest.config.ts
      await generateVitestConfig(ctx.projectRoot);

      // Génère src/test.ts
      await generateTestFile(ctx.projectRoot);

      console.log(`
✨ Vitest configured successfully!

Next steps:
1. npm install (install all packages)
2. npm run test (run tests once)
3. npm run test:watch (watch mode)
4. npm run test:coverage (coverage report)

Files created:
✅ vitest.config.ts (at project root)
✅ src/test.ts (test setup)
      `);

      return {
        success: true,
        message: 'Vitest configured',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to configure Vitest: ${String(error)}`,
      };
    }
  },
};
```

### Résultat pour l'Utilisateur
```bash
$ npx @configjs/cli vitest --for angular

✨ Installing Vitest for Angular 21...
✅ npm install @vitest/angular

✅ Creating vitest.config.ts
✅ Creating src/test.ts

✨ Vitest configured successfully!
```

---

## 2️⃣ Exemple: Plugin NgRx Signals

### Code du Plugin
```typescript
// src/plugins/state/ngrx-signals.ts
import { Plugin, ProjectContext, InstallResult, Category } from '../../types';
import { generateSignalStoreTemplate } from '../utils/angular-21-config';

export const ngrxSignalsPlugin: Plugin = {
  name: '@ngrx/signals',
  displayName: 'NgRx Signals',
  description: 'Signal-based state management for Angular 21',
  category: Category.STATE,
  frameworks: ['angular'],
  version: '1.0.0',

  detect: (ctx: ProjectContext) => {
    return ctx.framework === 'angular';
  },

  install: async (ctx: ProjectContext): Promise<InstallResult> => {
    console.log('Installing @ngrx/signals...');
    return {
      success: true,
      message: '@ngrx/signals installed',
    };
  },

  configure: async (ctx: ProjectContext) => {
    console.log('Configuring NgRx Signals...');

    try {
      // Crée un Signal Store template
      await generateSignalStoreTemplate(ctx.projectRoot, 'app');

      console.log(`
✨ NgRx Signals configured!

Created files:
✅ src/app/store/app.store.ts (example Signal Store)

This store includes:
- Zod validation schema
- Type-safe state management
- Methods for updating state
- Automatic type inference

Example usage in component:
import { inject } from '@angular/core';
import { appStore } from '@app/store/app.store';

export class MyComponent {
  store = inject(appStore);

  addItem(item: any) {
    this.store.addItem(item);
  }
}
      `);

      return {
        success: true,
        message: 'NgRx Signals configured',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to configure NgRx Signals: ${String(error)}`,
      };
    }
  },
};
```

---

## 3️⃣ Exemple: Plugin Angular CDK

### Code du Plugin
```typescript
// src/plugins/ui/angular-cdk.ts
import { Plugin, ProjectContext, InstallResult, Category } from '../../types';
import {
  addProviderToAppConfig,
  generateAccessibleMenuComponent,
} from '../utils/angular-21-config';

export const angularCdkPlugin: Plugin = {
  name: '@angular/cdk',
  displayName: 'Angular CDK',
  description: 'Component Development Kit for Angular 21',
  category: Category.UI,
  frameworks: ['angular'],
  version: '1.0.0',

  detect: (ctx: ProjectContext) => {
    return ctx.framework === 'angular';
  },

  install: async (ctx: ProjectContext): Promise<InstallResult> => {
    console.log('Installing @angular/cdk...');
    return {
      success: true,
      message: '@angular/cdk installed',
    };
  },

  configure: async (ctx: ProjectContext) => {
    console.log('Configuring Angular CDK...');

    try {
      // Ajoute provider pour animations asynchrones
      await addProviderToAppConfig(ctx.projectRoot, 'animations');

      // Crée un composant Menu accessible
      await generateAccessibleMenuComponent(ctx.projectRoot);

      console.log(`
✨ Angular CDK configured!

Created files:
✅ src/app/components/menu/menu.component.ts (accessible menu)

Features available:
- CdkMenu for accessible menus
- CdkDrag & CdkDrop for drag-drop
- Virtual scrolling (CdkVirtualScrollViewport)
- Portal for dynamic components
- Focus management

App.config.ts updated:
✅ provideAnimationsAsync() added to providers
      `);

      return {
        success: true,
        message: 'Angular CDK configured',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to configure Angular CDK: ${String(error)}`,
      };
    }
  },
};
```

---

## 4️⃣ Exemple: Plugin Lucide Icons

### Code du Plugin
```typescript
// src/plugins/ui/lucide-angular.ts
import { Plugin, ProjectContext, InstallResult, Category } from '../../types';
import { generateIconComponent } from '../utils/angular-21-config';

export const lucideAngularPlugin: Plugin = {
  name: 'lucide-angular',
  displayName: 'Lucide Icons',
  description: 'Beautiful SVG icons for Angular 21',
  category: Category.UI,
  frameworks: ['angular'],
  version: '1.0.0',

  detect: (ctx: ProjectContext) => {
    return ctx.framework === 'angular';
  },

  install: async (ctx: ProjectContext): Promise<InstallResult> => {
    console.log('Installing lucide-angular...');
    return {
      success: true,
      message: 'lucide-angular installed',
    };
  },

  configure: async (ctx: ProjectContext) => {
    console.log('Configuring Lucide Icons...');

    try {
      // Crée un composant Icon réutilisable
      await generateIconComponent(ctx.projectRoot);

      console.log(`
✨ Lucide Icons configured!

Created files:
✅ src/app/components/icon/icon.component.ts (reusable icon component)

Usage example:
<app-icon iconName="home" [size]="24" [strokeWidth]="2" />
<app-icon iconName="user" [size]="32" />
<app-icon iconName="settings" />

Available icons: 400+ beautiful SVG icons
- Customizable size and stroke width
- Fully accessible
- Tree-shakeable

See: https://lucide.dev for full icon list
      `);

      return {
        success: true,
        message: 'Lucide Icons configured',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to configure Lucide Icons: ${String(error)}`,
      };
    }
  },
};
```

---

## 5️⃣ Flux Complet: Installation Multiple

### Scénario Utilisateur
```bash
$ npx @configjs/cli setup --for angular --with vitest ngrx-signals lucide-angular angular-cdk
```

### Ce qui se Passe Automatiquement

1. **Vitest Plugin**
   - ✅ `npm install @vitest/angular`
   - ✅ Crée `vitest.config.ts`
   - ✅ Crée `src/test.ts`

2. **NgRx Signals Plugin**
   - ✅ `npm install @ngrx/signals`
   - ✅ Crée `src/app/store/app.store.ts`

3. **Lucide Icons Plugin**
   - ✅ `npm install lucide-angular`
   - ✅ Crée `src/app/components/icon/icon.component.ts`

4. **Angular CDK Plugin**
   - ✅ `npm install @angular/cdk`
   - ✅ Modifie `app.config.ts`: ajoute `provideAnimationsAsync()`
   - ✅ Crée `src/app/components/menu/menu.component.ts`

### Résultat Final
```
src/app/
├── app.config.ts (✅ modifié avec providers)
├── store/
│   └── app.store.ts (✅ créé avec Signal Store)
├── components/
│   ├── icon/
│   │   └── icon.component.ts (✅ créé)
│   └── menu/
│       └── menu.component.ts (✅ créé)
├── vitest.config.ts (✅ créé à la racine)
└── src/test.ts (✅ créé)

Package.json:
✅ @vitest/angular
✅ @ngrx/signals
✅ lucide-angular
✅ @angular/cdk
```

---

## 🎯 Points Clés

✅ **Chaque plugin a 3 phases:**
1. `detect()` - Vérifie si applicable
2. `install()` - Installe les packages
3. `configure()` - Configure le projet (IMPORTANT!)

✅ **Les utilitaires disponibles:**
- `addProviderToAppConfig()` - Ajoute providers à app.config.ts
- `generateVitestConfig()` - Crée vitest.config.ts
- `generateTestFile()` - Crée src/test.ts
- `generateSignalStoreTemplate()` - Crée Signal Store avec Zod
- `generateIconComponent()` - Crée composant Icon
- `generateAccessibleMenuComponent()` - Crée Menu CDK

✅ **Avantages par rapport à l'installation manuelle:**
- Zéro configuration manuelle
- Fichiers de configuration automatiques
- Composants exemples fournis
- Intégration correcte avec app.config.ts
- Projets prêts à l'emploi immédiatement

---

## 🧪 Tester ces Plugins

```bash
# 1. Créer un projet Angular test
ng new my-test-app

# 2. Aller dans le projet
cd my-test-app

# 3. Exécuter ConfigJS
npx @configjs/cli vitest --for angular

# 4. Vérifier les fichiers créés
ls -la src/
cat vitest.config.ts
cat src/test.ts

# 5. Vérifier app.config.ts
cat src/app/app.config.ts
# Doit contenir les imports et providers
```

---

**Documentation Complète:** [ANGULAR_21_PLUGIN_GUIDE.md](ANGULAR_21_PLUGIN_GUIDE.md)
