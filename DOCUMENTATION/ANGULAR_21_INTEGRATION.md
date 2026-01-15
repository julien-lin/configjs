# Angular 21 Plugins - Guide d'Intégration Complète

## 📋 Vue d'ensemble

Avec Angular 21, l'architecture est basée sur les **standalone components** et la configuration globale se fait via `app.config.ts`. Les 6 nouveaux plugins fournis (Aria, CDK, NgRx Signals, Vitest, Zod, Lucide) doivent être intégrés correctement pour fonctionner.

## 1️⃣ Configuration Globale (`app.config.ts`)

### Mode Zoneless (Obligatoire en v21)

```typescript
import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Mode Zoneless - Standard en Angular 21
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
  ]
}
```

### Ajouter les Providers selon les Plugins

**Pour Angular Material ou CDK (si vous les utilisez) :**
```typescript
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimationsAsync(), // ✅ Nécessaire pour Material & CDK
  ]
}
```

**Pour NgRx Signals :**
```typescript
import { provideStore } from '@ngrx/store'

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    // ✅ Pour NgRx Signals
    // Le Signal Store n'a pas besoin de provider global si 'providedIn: root'
  ]
}
```

## 2️⃣ Testing - Migration vers Vitest

### Créer `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import { ng } from '@angular/build'

export default defineConfig({
  plugins: [ng()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test.ts'],
    },
  },
  define: {
    'ngDevMode': true,
    'ngI18nClosureMode': true,
  },
})
```

### Créer `src/test.ts`

```typescript
import '@angular/localize'
import 'zone.js'
import 'zone.js/testing'
```

### Mettre à jour `angular.json`

```json
{
  "projects": {
    "YOUR_APP": {
      "architect": {
        "test": {
          "builder": "@angular-eslint/builder:lint",
          "options": {
            "lintFilePatterns": [
              "src/**/*.ts",
              "src/**/*.html"
            ]
          }
        }
      }
    }
  }
}
```

## 3️⃣ NgRx Signals avec Zod - Pattern Complet

### Signal Store avec Validation Zod

```typescript
// user.store.ts
import { Injectable } from '@angular/core'
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals'
import { z } from 'zod'

// 1. Schéma Zod pour validation
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(3),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
})

export type User = z.infer<typeof UserSchema>

// 2. Signal Store
export const UserStore = signalStore(
  { providedIn: 'root' },
  withState({
    users: [] as User[],
    selectedUser: null as User | null,
    error: '' as string,
    loading: false,
  }),
  withMethods((store) => ({
    // Validation + update via Zod
    addUser(data: unknown) {
      const result = UserSchema.safeParse(data)

      if (!result.success) {
        patchState(store, {
          error: result.error.errors
            .map((e) => e.message)
            .join(', '),
        })
        return false
      }

      patchState(store, (state) => ({
        users: [...state.users, result.data],
        error: '',
      }))
      return true
    },

    selectUser(userId: number) {
      patchState(store, (state) => ({
        selectedUser: state.users.find((u) => u.id === userId) || null,
      }))
    },

    clearError() {
      patchState(store, { error: '' })
    },
  }))
)
```

### Utiliser le Store dans un Composant

```typescript
import { Component, inject, effect } from '@angular/core'
import { UserStore } from './user.store'

@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `
    <div>
      <h2>Users</h2>
      @for (user of users(); track user.id) {
        <div @click="onSelectUser(user.id)">
          {{ user.name }} ({{ user.role }})
        </div>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>
  `,
})
export class UserListComponent {
  userStore = inject(UserStore)

  users = this.userStore.users
  error = this.userStore.error
  selectedUser = this.userStore.selectedUser

  constructor() {
    // Effect automatique quand selectedUser change
    effect(() => {
      console.log('Selected user:', this.selectedUser())
    })
  }

  onSelectUser(userId: number) {
    this.userStore.selectUser(userId)
  }

  addNewUser() {
    const newUser = {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'user' as const,
    }

    // Validation automatique via Zod
    const success = this.userStore.addUser(newUser)
    if (!success) {
      console.error('Invalid user data')
    }
  }
}
```

## 4️⃣ Lucide Angular - Icons

### Installation et Configuration

```typescript
// app.component.ts
import { Component } from '@angular/core'
import { LucideAngularModule, Home, Settings, User } from 'lucide-angular'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <nav>
      <button>
        <lucide-icon [img]="homeIcon" size="24"></lucide-icon>
        Accueil
      </button>
      <button>
        <lucide-icon [img]="settingsIcon" size="24"></lucide-icon>
        Paramètres
      </button>
    </nav>
  `,
})
export class AppComponent {
  readonly homeIcon = Home
  readonly settingsIcon = Settings
}
```

### Créer un Composant d'Icônes Réutilisable

```typescript
// icon.component.ts
import { Component, input } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import type { Icon } from 'lucide-angular'

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <lucide-icon [img]="icon()" [attr.size]="size()"></lucide-icon>
  `,
})
export class IconComponent {
  icon = input.required<Icon>()
  size = input<number>(24)
}
```

## 5️⃣ Angular Aria & CDK - Accessibilité

### Menu Accessible avec CDK

```typescript
// accessible-menu.component.ts
import { Component } from '@angular/core'
import { CdkMenu, CdkMenuTrigger, CdkMenuItem } from '@angular/cdk/menu'

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CdkMenu, CdkMenuTrigger, CdkMenuItem],
  template: `
    <button [cdkMenuTriggerFor]="menu" class="trigger">
      Menu
    </button>

    <ng-template #menu>
      <div cdkMenu class="cdk-menu">
        <button cdkMenuItem (click)="onEdit()">Éditer</button>
        <button cdkMenuItem (click)="onDelete()">Supprimer</button>
        <button cdkMenuItem (click)="onShare()">Partager</button>
      </div>
    </ng-template>
  `,
})
export class AccessibleMenuComponent {
  onEdit() { console.log('Edit') }
  onDelete() { console.log('Delete') }
  onShare() { console.log('Share') }
}
```

### Drag & Drop avec CDK

```typescript
// drag-drop.component.ts
import { Component } from '@angular/core'
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop'

@Component({
  selector: 'app-drag-drop',
  standalone: true,
  imports: [DragDropModule],
  template: `
    <div cdkDropList
         [cdkDropListData]="items"
         (cdkDropListDropped)="drop($event)">
      @for (item of items; track item.id) {
        <div cdkDrag class="item">{{ item.name }}</div>
      }
    </div>
  `,
})
export class DragDropComponent {
  items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ]

  drop(event: CdkDragDrop<typeof this.items>) {
    const [item] = this.items.splice(event.previousIndex, 1)
    this.items.splice(event.currentIndex, 0, item)
  }
}
```

## 6️⃣ Cleanup - Supprimer les Anciennes Dépendances

### Si vous êtes en full Zoneless

Supprimez de `polyfills.ts` :
```typescript
// ❌ À SUPPRIMER si en mode zoneless
import 'zone.js'
```

### Remplacer CommonModule par la Nouvelle Syntaxe

```typescript
// ❌ Ancien
import { CommonModule } from '@angular/common'
import { NgIf, NgFor } from '@angular/common'

@Component({
  imports: [CommonModule],
  template: `
    <div *ngIf="isVisible">Content</div>
    <div *ngFor="let item of items">{{ item }}</div>
  `
})

// ✅ Nouveau
@Component({
  standalone: true,
  template: `
    @if (isVisible) { Content }
    @for (item of items; track item.id) {
      <div>{{ item }}</div>
    }
  `
})
```

## 📊 Résumé des Intégrations par Plugin

| Plugin | Configuration | Fichier | Action |
|--------|--------------|---------|--------|
| **@angular/aria** | Importer dans composants | Composants | Manuel |
| **@angular/cdk** | CdkDragDrop, CdkMenu | Composants | Manuel |
| **@ngrx/signals** | Signal Store | `.store.ts` | Manuel |
| **Vitest** | vitest.config.ts, src/test.ts | Racine & src | Auto |
| **Zod** | Validation schémas | `.store.ts` | Manuel |
| **Lucide Angular** | LucideAngularModule | Composants | Manuel |

## 🚀 Commande Recommandée

Après installation des plugins :

```bash
# 1. Vérifier les dépendances
npm list @angular/aria @angular/cdk @ngrx/signals vitest zod lucide-angular

# 2. Créer les fichiers de config
npx ng generate @angular-eslint/config vitest

# 3. Tester Vitest
npm run test -- --run

# 4. Build du projet
npm run build
```

---

**Note**: Tous ces patterns suivent les bonnes pratiques Angular 21 avec standalone components et signals. 🎯
