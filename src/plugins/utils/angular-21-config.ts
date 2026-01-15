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
 */
export async function generateVitestConfig(projectRoot: string): Promise<void> {
  const vitestConfigPath = resolve(projectRoot, 'vitest.config.ts')

  const vitestContent = `import { defineConfig } from 'vitest/config';
import { getVitestConfig } from 'ng-vitest-helper';

export default defineConfig(
  getVitestConfig({
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  }),
);
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

  const testContent = `// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js';
import 'zone.js/testing';

// First, initialize the Angular testing environment.
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Then we find all the tests.
const context = require.context('./', true, /\\\\.spec\\\\.ts$/);
// And load the modules.
context.keys().map(context);

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
 */
export async function generateSignalStoreTemplate(
  projectRoot: string,
  storeName: string = 'app'
): Promise<void> {
  const storeDir = resolve(projectRoot, 'src', 'app', 'store')
  const storePath = resolve(storeDir, `${storeName}.store.ts`)

  const storeName_PascalCase =
    storeName.charAt(0).toUpperCase() + storeName.slice(1)

  const storeContent = `import { signalStore, withState, withMethods } from '@ngrx/signals';
import { z } from 'zod';

// Zod validation schema
export const ${storeName}Schema = z.object({
  title: z.string(),
  items: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })),
});

// Type inference from schema
export type ${storeName_PascalCase}State = z.infer<typeof ${storeName}Schema>;

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
    addItem: (item: ${storeName_PascalCase}State['items'][0]) => {
      const result = ${storeName}Schema.safeParse({
        ...store(),
        items: [...store().items, item],
      });

      if (result.success) {
        store.patchState({ items: result.data.items });
      } else {
        console.error('Validation failed:', result.error);
      }
    },
    clear: () => {
      store.patchState({ items: [] });
    },
  })),
);
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
 */
export async function generateIconComponent(
  projectRoot: string
): Promise<void> {
  const componentDir = resolve(projectRoot, 'src', 'app', 'components', 'icon')
  const componentPath = resolve(componentDir, 'icon.component.ts')

  const componentContent = `import { Component, input } from '@angular/core';
import * as Icons from 'lucide-angular';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [Object.values(Icons)],
  template: 'Icon component ready to use',
  styles: [
    '.icon { display: inline-flex; align-items: center; justify-content: center; }',
  ],
})
export class IconComponent {
  iconName = input<string>('home');
  size = input<number>(24);
  strokeWidth = input<number>(2);

  Home = Icons.Home;
  User = Icons.User;
  Settings = Icons.Settings;
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
 */
export async function generateAccessibleMenuComponent(
  projectRoot: string
): Promise<void> {
  const componentDir = resolve(projectRoot, 'src', 'app', 'components', 'menu')
  const componentPath = resolve(componentDir, 'menu.component.ts')

  const componentContent = `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkMenu, CdkMenuTrigger, CdkMenuItem } from '@angular/cdk/menu';

@Component({
  selector: 'app-accessible-menu',
  standalone: true,
  imports: [CommonModule, CdkMenu, CdkMenuTrigger, CdkMenuItem],
  template: 'Menu component with CdkMenu setup',
  styles: [
    '.cdk-menu { display: flex; flex-direction: column; min-width: 150px; }',
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
