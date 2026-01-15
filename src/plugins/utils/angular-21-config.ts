import { promises as fs } from 'fs'
import { resolve } from 'path'
import { logger } from '../../utils/logger'

/**
 * ⚠️ IMPORTANT : Lire DOCUMENTATION/ANGULAR_21_COMPATIBILITY.md avant d'utiliser ces utilitaires
 *
 * Incompatibilités Majeures à Connaître :
 * 1. Vitest vs Karma : Vous ne pouvez avoir QUE UN seul !
 * 2. Zoneless vs zone.js : Choisir UNE SEULE stratégie !
 * 3. NgRx Signals vs Store : Ne pas mélanger !
 * 4. Vieilles libs (Angular <15) peuvent casser avec Zoneless
 *
 * Voir : DOCUMENTATION/ANGULAR_21_INSTALLATION_GUIDE.md pour workflow sécurisé
 */

export interface AngularProvider {
    import: string
    functionCall: string
    description: string
    warning?: string
}

/**
 * Options de configuration pour Vitest
 */
export interface VitestOptions {
    coverage?: boolean
    browsers?: 'jsdom' | 'happy-dom'
    reporters?: ('text' | 'json' | 'html')[]
    setupFiles?: string[]
}

/**
 * Options de configuration pour Signal Store
 */
export interface SignalStoreOptions {
    withZod?: boolean
    includeExamples?: boolean
    methods?: ('add' | 'update' | 'delete' | 'clear')[]
}

/**
 * Options de configuration pour composants générés
 */
export interface ComponentOptions {
    standalone?: boolean
    styles?: 'tailwind' | 'inline' | 'none'
}

/**
 * Providers pour app.config.ts Angular 21
 *
 * ⚠️ ATTENTION : Choisir UNE stratégie et s'y tenir !
 */
export const ANGULAR_21_PROVIDERS: Record<string, AngularProvider> = {
    zoneless: {
        import: 'provideExperimentalZonelessChangeDetection',
        functionCall: 'provideExperimentalZonelessChangeDetection()',
        description: 'Mode Zoneless (+30% perf, -20KB bundle)',
        warning:
            '⚠️ Incompatible avec vieilles libs (Angular <15). Supprimer zone.js de polyfills.ts',
    },
    animations: {
        import: 'provideAnimationsAsync',
        functionCall: 'provideAnimationsAsync()',
        description: 'Animations asynchrones',
        warning: '✅ Compatible avec Zoneless',
    },
    router: {
        import: 'provideRouter',
        functionCall: 'provideRouter(routes)',
        description: 'Routeur Angular',
        warning: '✅ Compatible avec Zoneless',
    },
    http: {
        import: 'provideHttpClient',
        functionCall: 'provideHttpClient()',
        description: 'Client HTTP',
        warning: '✅ Utiliser toSignal() pour convertir Observable→Signal',
    },
    ngrxSignals: {
        import: 'provideState',
        functionCall: "provideState({ providedIn: 'root' })",
        description: 'NgRx Signals Store (Moderne, Zoneless-ready)',
        warning: '⚠️ Ne PAS mélanger avec @ngrx/store classique',
    },
}

/**
 * Ajoute un provider à app.config.ts
 *
 * ⚠️ IMPORTANT :
 * - Zoneless + zone.js ne doivent PAS être ensemble
 * - Supprimer zone.js de polyfills.ts si vous activez Zoneless
 */
export async function addProviderToAppConfig(
    projectRoot: string,
    providerId: keyof typeof ANGULAR_21_PROVIDERS
): Promise<void> {
    const appConfigPath = resolve(projectRoot, 'src', 'app.config.ts')
    const provider = ANGULAR_21_PROVIDERS[providerId]

    if (!provider) {
        logger.error(`Unknown provider: ${providerId}`)
        return
    }

    // Afficher l'avertissement si présent
    if (provider.warning) {
        logger.warn(provider.warning)
    }

    try {
        let content = await fs.readFile(appConfigPath, 'utf-8')

        // Vérifier si le provider est déjà présent
        if (content.includes(provider.functionCall)) {
            logger.info(`Provider '${providerId}' already exists in app.config.ts`)
            return
        }

        // Ajouter l'import si absent
        const importLine = `import { ${provider.import} } from '@angular/core';`
        if (!content.includes(provider.import)) {
            const lastImportMatch = content.match(
                /import .* from '@angular\/[^']*';/g
            )
            if (lastImportMatch && lastImportMatch.length > 0) {
                const lastImportLine = lastImportMatch[lastImportMatch.length - 1]
                if (lastImportLine) {
                    content = content.replace(
                        lastImportLine,
                        `${lastImportLine}\nimport { ${provider.import} } from '@angular/core';`
                    )
                }
            } else {
                content = `${importLine}\n\n${content}`
            }
        }

        // Ajouter le provider dans le tableau
        const providersMatch = content.match(/providers:\s*\[([\s\S]*?)\]/)
        if (providersMatch && providersMatch[1]) {
            const providers = providersMatch[1]
            const newProviders = providers.includes(provider.functionCall)
                ? providers
                : `${providers.trimEnd()},\n    ${provider.functionCall}`
            content = content.replace(
                /providers:\s*\[([\s\S]*?)\]/,
                `providers: [${newProviders}]`
            )
        }

        await fs.writeFile(appConfigPath, content, 'utf-8')
        logger.success(`Added provider '${providerId}' to app.config.ts`)
    } catch (error) {
        logger.error(`Failed to add provider to app.config.ts: ${String(error)}`)
    }
}

/**
 * Génère vitest.config.ts pour Angular 21
 * @param projectRoot - Chemin racine du projet
 * @param options - Options de configuration optionnelles
 */
export async function generateVitestConfig(
    projectRoot: string,
    options: VitestOptions = {}
): Promise<void> {
    const {
        coverage = true,
        browsers = 'jsdom',
        reporters = ['text', 'json', 'html'],
        setupFiles = ['src/test.ts'],
    } = options

    const vitestConfigPath = resolve(projectRoot, 'vitest.config.ts')

    const vitestContent = `import { defineConfig } from 'vitest/config';
import angular from '@angular/build/tools/esbuild/angular-app-esbuild-plugin';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: '${browsers}',
    setupFiles: [${setupFiles.map((f) => `'${f}'`).join(', ')}],
    ${coverage
            ? `coverage: {
      provider: 'v8',
      reporter: [${reporters.map((r) => `'${r}'`).join(', ')}],
      exclude: ['node_modules/', 'tests/'],
    },`
            : '// coverage disabled'
        }
  },
});
`

    try {
        await fs.writeFile(vitestConfigPath, vitestContent, 'utf-8')
        logger.success('Created vitest.config.ts')
    } catch (error) {
        logger.error(`Failed to create vitest.config.ts: ${String(error)}`)
    }
}

/**
 * Génère src/test.ts pour setup Angular + Vitest
 */
export async function generateTestFile(projectRoot: string): Promise<void> {
    const testPath = resolve(projectRoot, 'src', 'test.ts')

    const testContent = `import 'zone.js';
import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Initialize Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
`

    try {
        await fs.writeFile(testPath, testContent, 'utf-8')
        logger.success('Created src/test.ts')
    } catch (error) {
        logger.error(`Failed to create src/test.ts: ${String(error)}`)
    }
}

/**
 * Crée un fichier Signal Store template avec Zod
 * @param projectRoot - Chemin racine du projet
 * @param storeName - Nom du store
 * @param options - Options de configuration optionnelles
 */
export async function generateSignalStoreTemplate(
    projectRoot: string,
    storeName: string = 'app',
    options: SignalStoreOptions = {}
): Promise<void> {
    const {
        withZod = true,
        includeExamples = true,
        methods = ['add', 'clear'],
    } = options

    const storeDir = resolve(projectRoot, 'src', 'app', 'store')
    const storePath = resolve(storeDir, `${storeName}.store.ts`)

    const storeName_PascalCase =
        storeName.charAt(0).toUpperCase() + storeName.slice(1)

    // Construire les méthodes dynamiquement
    const methodsCode = methods
        .map((method) => {
            switch (method) {
                case 'add':
                    return `    addItem: (item: ${storeName_PascalCase}State['items'][0]) => {
      ${withZod
                            ? `const result = ${storeName}Schema.safeParse({
        ...store(),
        items: [...store().items, item],
      });
      if (result.success) {
        store.patchState({ items: result.data.items });
      } else {
        console.error('Validation failed:', result.error);
      }`
                            : `store.patchState({ items: [...store().items, item] });`
                        }
    },`
                case 'update':
                    return `    updateItem: (id: number, updates: Partial<${storeName_PascalCase}State['items'][0]>) => {
      const updated = store().items.map(item => item.id === id ? { ...item, ...updates } : item);
      store.patchState({ items: updated });
    },`
                case 'delete':
                    return `    removeItem: (id: number) => {
      store.patchState({ items: store().items.filter(item => item.id !== id) });
    },`
                case 'clear':
                    return `    clear: () => {
      store.patchState({ items: [] });
    },`
                default:
                    return ''
            }
        })
        .join('\n')

    const storeContent = `import { signalStore, withState, withMethods } from '@ngrx/signals';
${withZod ? "import { z } from 'zod';" : ''}

${withZod
            ? `// Zod validation schema
export const ${storeName}Schema = z.object({
  title: z.string(),
  items: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })),
});

// Type inference from schema
export type ${storeName_PascalCase}State = z.infer<typeof ${storeName}Schema>;`
            : `// State type definition
export interface ${storeName_PascalCase}State {
  title: string;
  items: Array<{ id: number; name: string }>;
}`
        }

// Initial state
const initialState: ${storeName_PascalCase}State = {
  title: '${storeName_PascalCase} Store',
  items: [],
};

// Signal Store
export const ${storeName}Store = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
${methodsCode}
  })),
);
${includeExamples
            ? `
// Usage example in a component:
// import { ${storeName}Store } from './store/${storeName}.store';
// export class MyComponent {
//   store = inject(${storeName}Store);
//   
//   addNewItem(name: string) {
//     this.store.addItem({ id: Date.now(), name });
//   }
// }`
            : ''
        }
`

    try {
        await fs.mkdir(storeDir, { recursive: true })
        await fs.writeFile(storePath, storeContent, 'utf-8')
        logger.success(`Created store/${storeName}.store.ts`)
    } catch (error) {
        logger.error(`Failed to create store template: ${String(error)}`)
    }
}

/**
 * Crée un composant Icon réutilisable pour Lucide
 * @param projectRoot - Chemin racine du projet
 * @param options - Options de configuration optionnelles
 */
export async function generateIconComponent(
    projectRoot: string,
    options: ComponentOptions = {}
): Promise<void> {
    const { standalone = true, styles = 'inline' } = options

    const componentDir = resolve(projectRoot, 'src', 'app', 'components', 'icon')
    const componentPath = resolve(componentDir, 'icon.component.ts')

    const stylesContent =
        styles === 'none'
            ? ''
            : `  styles: [
    \`:host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    ::ng-deep lucide-icon {
      vertical-align: middle;
    }\`,
  ],`

    const componentContent = `import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as LucideIcons from 'lucide-angular';

@Component({
  selector: 'app-icon',
  standalone: ${standalone},
  imports: [CommonModule],
  template: \`
    <ng-container [ngSwitch]="iconName()">
      <lucide-icon-home *ngSwitchCase="'home'" [size]="size()" [stroke-width]="strokeWidth()"></lucide-icon-home>
      <lucide-icon-user *ngSwitchCase="'user'" [size]="size()" [stroke-width]="strokeWidth()"></lucide-icon-user>
      <lucide-icon-settings *ngSwitchCase="'settings'" [size]="size()" [stroke-width]="strokeWidth()"></lucide-icon-settings>
      <lucide-icon-search *ngSwitchCase="'search'" [size]="size()" [stroke-width]="strokeWidth()"></lucide-icon-search>
      <lucide-icon-menu *ngSwitchCase="'menu'" [size]="size()" [stroke-width]="strokeWidth()"></lucide-icon-menu>
      <lucide-icon-x *ngSwitchCase="'close'" [size]="size()" [stroke-width]="strokeWidth()"></lucide-icon-x>
      <!-- Fallback to home icon if name not found -->
      <lucide-icon-home *ngSwitchDefault [size]="size()" [stroke-width]="strokeWidth()"></lucide-icon-home>
    </ng-container>
  \`,
${stylesContent}
})
export class IconComponent {
  iconName = input<string>('home');
  size = input<number>(24);
  strokeWidth = input<number>(2);
}
`

    try {
        await fs.mkdir(componentDir, { recursive: true })
        await fs.writeFile(componentPath, componentContent, 'utf-8')
        logger.success('Created components/icon/icon.component.ts')
    } catch (error) {
        logger.error(`Failed to create icon component: ${String(error)}`)
    }
}

/**
 * Crée un composant Menu accessible avec CDK
 * @param projectRoot - Chemin racine du projet
 * @param options - Options de configuration optionnelles
 */
export async function generateAccessibleMenuComponent(
    projectRoot: string,
    options: ComponentOptions = {}
): Promise<void> {
    const { standalone = true } = options

    const componentDir = resolve(projectRoot, 'src', 'app', 'components', 'menu')
    const componentPath = resolve(componentDir, 'menu.component.ts')

    const componentContent = `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkMenu, CdkMenuTrigger, CdkMenuItem } from '@angular/cdk/menu';

@Component({
  selector: 'app-accessible-menu',
  standalone: ${standalone},
  imports: [CommonModule, CdkMenu, CdkMenuTrigger, CdkMenuItem],
  template: \`
    <div class="menu-container">
      <button 
        [cdkMenuTriggerFor]="menu" 
        class="menu-trigger"
        aria-label="Open application menu">
        Menu ▼
      </button>
      
      <ng-template #menu="cdkMenu">
        <div cdkMenu class="cdk-menu" role="menu">
          <button 
            cdkMenuItem 
            class="menu-item"
            (click)="onHome()"
            role="menuitem">
            🏠 Home
          </button>
          
          <button 
            cdkMenuItem 
            class="menu-item"
            (click)="onProfile()"
            role="menuitem">
            👤 Profile
          </button>
          
          <button 
            cdkMenuItem 
            class="menu-item"
            (click)="onSettings()"
            role="menuitem">
            ⚙️ Settings
          </button>
          
          <hr class="menu-divider" />
          
          <button 
            cdkMenuItem 
            class="menu-item menu-item--danger"
            (click)="onLogout()"
            role="menuitem">
            🚪 Logout
          </button>
        </div>
      </ng-template>
    </div>
  \`,
  styles: [
    \`
      .menu-container {
        position: relative;
        display: inline-block;
      }

      .menu-trigger {
        padding: 0.5rem 1rem;
        background-color: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .menu-trigger:hover {
        background-color: #2563eb;
      }

      .menu-trigger:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }

      .cdk-menu {
        display: flex;
        flex-direction: column;
        min-width: 200px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .menu-item {
        padding: 0.75rem 1rem;
        text-align: left;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.95rem;
        color: #374151;
        transition: background-color 0.15s;
      }

      .menu-item:hover {
        background-color: #f3f4f6;
      }

      .menu-item:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: -2px;
      }

      .menu-item--danger {
        color: #dc2626;
      }

      .menu-item--danger:hover {
        background-color: #fee2e2;
      }

      .menu-divider {
        margin: 0.5rem 0;
        border: none;
        border-top: 1px solid #e5e7eb;
      }
    \`,
  ],
})
export class AccessibleMenuComponent {
  onHome() {
    console.log('Navigate to home');
  }

  onProfile() {
    console.log('Navigate to profile');
  }

  onSettings() {
    console.log('Navigate to settings');
  }

  onLogout() {
    console.log('Logout');
  }
}
`

    try {
        await fs.mkdir(componentDir, { recursive: true })
        await fs.writeFile(componentPath, componentContent, 'utf-8')
        logger.success('Created components/menu/menu.component.ts')
    } catch (error) {
        logger.error(`Failed to create menu component: ${String(error)}`)
    }
}
