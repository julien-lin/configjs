/**
 * Template pour app.config.ts Angular 21 avec tous les providers modernes
 * Ce template doit être utilisé par les plugins Angular pour configurer le projet
 */

export const ANGULAR_21_APP_CONFIG_TEMPLATE = `import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { provideRouter } from '@angular/router'
import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Mode Zoneless - Standard en Angular 21 pour les performances
    provideExperimentalZonelessChangeDetection(),

    // 2. Routeur
    provideRouter(routes),

    // 3. Animations - Nécessaire pour Material & CDK
    provideAnimationsAsync(),

    // 4. NgRx Signal Store (décommentez si vous utilisez @ngrx/signals)
    // withNgrxSignalStore(),

    // 5. HTTP Client (décommentez si vous utilisez l'API)
    // provideHttpClient(),

    // 6. Service Worker (décommentez pour PWA)
    // provideServiceWorker('ngsw-worker.js', {
    //   enabled: !isDevMode(),
    //   registrationStrategy: 'registerWhenStable:30000'
    // })
  ],
}
`

export const ANGULAR_21_VITEST_CONFIG_TEMPLATE = `import { defineConfig } from 'vitest/config'
import { ng } from '@angular/build'

export default defineConfig({
  plugins: [
    ng.ssr && ng.ssr(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test.ts',
      ],
    },
  },
  define: {
    'ngDevMode': true,
    'ngI18nClosureMode': true,
  },
})
`

export const ANGULAR_21_TEST_TS_TEMPLATE = `import '@angular/localize'
import 'zone.js'
import 'zone.js/testing'
`

export const SIGNAL_STORE_EXAMPLE_TEMPLATE = `import { Injectable, inject } from '@angular/core'
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals'
import { z } from 'zod'

// 1. Validation du schéma avec Zod
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(3, 'Le nom doit avoir au moins 3 caractères'),
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'user', 'guest']),
})

export type User = z.infer<typeof UserSchema>

// 2. Signal Store avec intégration Zod
export const UserStore = signalStore(
  { providedIn: 'root' },
  withState({
    users: [] as User[],
    selectedUser: null as User | null,
    error: '' as string,
    loading: false,
  }),
  withMethods((store) => ({
    // Méthode pour ajouter un utilisateur avec validation Zod
    addUser(data: unknown) {
      const result = UserSchema.safeParse(data)

      if (!result.success) {
        patchState(store, {
          error: result.error.errors.map((e) => e.message).join(', '),
        })
        return false
      }

      patchState(store, (state) => ({
        users: [...state.users, result.data],
        error: '',
      }))
      return true
    },

    // Méthode pour sélectionner un utilisateur
    selectUser(userId: number) {
      patchState(store, (state) => ({
        selectedUser: state.users.find((u) => u.id === userId) || null,
      }))
    },

    // Méthode pour nettoyer l'erreur
    clearError() {
      patchState(store, { error: '' })
    },
  }))
)
`

export const LUCIDE_COMPONENT_EXAMPLE = `import { Component } from '@angular/core'
import { LucideAngularModule, Home, User, Settings, LogOut } from 'lucide-angular'

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [LucideAngularModule],
  template: \`
    <nav class="navbar">
      <div class="flex gap-4">
        <button class="icon-btn" title="Accueil">
          <lucide-icon [img]="homeIcon"></lucide-icon>
        </button>
        <button class="icon-btn" title="Profil">
          <lucide-icon [img]="userIcon"></lucide-icon>
        </button>
        <button class="icon-btn" title="Paramètres">
          <lucide-icon [img]="settingsIcon"></lucide-icon>
        </button>
        <button class="icon-btn" title="Déconnexion">
          <lucide-icon [img]="logoutIcon"></lucide-icon>
        </button>
      </div>
    </nav>
  \`,
  styles: [\`
    .navbar {
      display: flex;
      align-items: center;
      padding: 1rem;
      background: #f5f5f5;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }

    .icon-btn:hover {
      background: #e0e0e0;
    }

    lucide-icon {
      width: 24px;
      height: 24px;
      color: #333;
    }
  \`],
})
export class NavbarComponent {
  // Importez les icônes que vous utilisez
  readonly homeIcon = Home
  readonly userIcon = User
  readonly settingsIcon = Settings
  readonly logoutIcon = LogOut
}
`

export const ARIA_ACCESSIBLE_MENU_EXAMPLE = `import { Component, signal } from '@angular/core'
import { NgIf, NgFor } from '@angular/common'
import { CdkMenu, CdkMenuTrigger } from '@angular/cdk/menu'

@Component({
  selector: 'app-accessible-menu',
  standalone: true,
  imports: [NgIf, NgFor, CdkMenu, CdkMenuTrigger],
  template: \`
    <button [cdkMenuTriggerFor]="menu" class="menu-trigger">
      Menu
    </button>

    <ng-template #menu>
      <div cdkMenu class="cdk-menu">
        <button cdkMenuItem (click)="onEdit()">Éditer</button>
        <button cdkMenuItem (click)="onDelete()">Supprimer</button>
        <button cdkMenuItem (click)="onShare()">Partager</button>
      </div>
    </ng-template>
  \`,
  styles: [\`
    .menu-trigger {
      padding: 0.5rem 1rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    .cdk-menu {
      background: white;
      border: 1px solid #ddd;
      border-radius: 0.25rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      min-width: 150px;
    }

    .cdk-menu button {
      display: block;
      width: 100%;
      padding: 0.75rem;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
      transition: background 0.2s;
    }

    .cdk-menu button:hover {
      background: #f5f5f5;
    }
  \`],
})
export class AccessibleMenuComponent {
  onEdit() {
    console.log('Edit clicked')
  }

  onDelete() {
    console.log('Delete clicked')
  }

  onShare() {
    console.log('Share clicked')
  }
}
`
