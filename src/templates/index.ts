/**
 * Système de templates pour fichiers de configuration
 *
 * Permet de générer des fichiers de configuration avec des variables
 * substituées selon le contexte du projet.
 */

import type { ProjectContext } from '../types/index.js'

/**
 * Contexte de template avec variables communes
 */
export interface TemplateContext extends Partial<ProjectContext> {
    [key: string]: any
}

/**
 * Résultat du rendu d'un template
 */
export interface RenderedTemplate {
    content: string
    filename: string
    description?: string
}

/**
 * Catalogue de templates disponibles
 */
export const templates = {
    // State Management Templates
    'zustand-store': (ctx: TemplateContext) => zustandStoreTemplate(ctx),

    'redux-store': (ctx: TemplateContext) => reduxStoreTemplate(ctx),

    'pinia-store': (ctx: TemplateContext) => piniaStoreTemplate(ctx),

    // API/HTTP Templates
    'axios-config': (ctx: TemplateContext) => axiosConfigTemplate(ctx),

    'axios-interceptors': (ctx: TemplateContext) =>
        axiosInterceptorsTemplate(ctx),

    'tanstack-query-config': (ctx: TemplateContext) =>
        tanstackQueryConfigTemplate(ctx),

    // Routing Templates
    'react-router-layout': (ctx: TemplateContext) =>
        reactRouterLayoutTemplate(ctx),

    'vue-router-config': (ctx: TemplateContext) => vueRouterConfigTemplate(ctx),

    // CSS/Styling Templates
    'tailwind-config': (ctx: TemplateContext) => tailwindConfigTemplate(ctx),

    'tailwind-css': (ctx: TemplateContext) => tailwindCssTemplate(ctx),

    // Forms Templates
    'react-hook-form-config': (ctx: TemplateContext) =>
        reactHookFormConfigTemplate(ctx),

    'zod-schema': (ctx: TemplateContext) => zodSchemaTemplate(ctx),

    // Testing Templates
    'vitest-setup': (ctx: TemplateContext) => vitestSetupTemplate(ctx),

    'react-testing-library-setup': (ctx: TemplateContext) =>
        reactTestingLibrarySetupTemplate(ctx),

    // Tooling Templates
    'eslint-config': (ctx: TemplateContext) => eslintConfigTemplate(ctx),

    'prettier-config': (ctx: TemplateContext) => prettierConfigTemplate(ctx),

    'husky-setup': (ctx: TemplateContext) => huskySetupTemplate(ctx),
}

/**
 * Rend un template avec les variables du contexte
 *
 * @param name - Nom du template
 * @param ctx - Contexte du template avec les variables
 * @returns Résultat du rendu
 */
export function renderTemplate(
    name: string,
    ctx: TemplateContext
): RenderedTemplate {
    const templateFn = templates[name as keyof typeof templates]

    if (!templateFn) {
        throw new Error(`Template not found: ${name}`)
    }

    return templateFn(ctx)
}

/**
 * Liste tous les templates disponibles
 */
export function listTemplates(): string[] {
    return Object.keys(templates)
}

// ============================================================================
// STATE MANAGEMENT TEMPLATES
// ============================================================================

function zustandStoreTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/store/app.ts',
        description: 'Zustand store application',
        content: `import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
        decrement: () => set((state) => ({ count: state.count - 1 })),
        reset: () => set({ count: 0 }),
      }),
      {
        name: 'app-store',
      }
    )
  )
)
`,
    }
}

function reduxStoreTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/store/index.ts',
        description: 'Redux store configuration',
        content: `import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
`,
    }
}

function piniaStoreTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/stores/app.ts',
        description: 'Pinia store for Vue',
        content: `import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const count = ref(0)

  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => {
    count.value = 0
  }

  const doubleCount = computed(() => count.value * 2)

  return { count, increment, decrement, reset, doubleCount }
})
`,
    }
}

// ============================================================================
// HTTP/API TEMPLATES
// ============================================================================

function axiosConfigTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/api/client.ts',
        description: 'Axios client configuration',
        content: `import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
`,
    }
}

function axiosInterceptorsTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/api/interceptors.ts',
        description: 'Axios interceptors setup',
        content: `import type { AxiosInstance } from 'axios'

export function setupInterceptors(apiClient: AxiosInstance) {
  // Request interceptor
  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = \`Bearer \${token}\`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )
}
`,
    }
}

function tanstackQueryConfigTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/lib/query-client.ts',
        description: 'TanStack Query configuration',
        content: `import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (cache time)
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  })
}

let clientQueryClientInstance: QueryClient | undefined

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient()
  }

  if (!clientQueryClientInstance) {
    clientQueryClientInstance = makeQueryClient()
  }

  return clientQueryClientInstance
}
`,
    }
}

// ============================================================================
// ROUTING TEMPLATES
// ============================================================================

function reactRouterLayoutTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/components/RootLayout.tsx',
        description: 'React Router root layout',
        content: `import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
`,
    }
}

function vueRouterConfigTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/router/index.ts',
        description: 'Vue Router configuration',
        content: `import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/RootLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../pages/Home.vue'),
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
`,
    }
}

// ============================================================================
// CSS/STYLING TEMPLATES
// ============================================================================

function tailwindConfigTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'tailwind.config.ts',
        description: 'Tailwind CSS configuration',
        content: `import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors here
      },
    },
  },
  plugins: [],
} satisfies Config
`,
    }
}

function tailwindCssTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/styles/index.css',
        description: 'Tailwind CSS directives',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom component classes */
@layer components {
  .btn {
    @apply px-4 py-2 rounded font-semibold transition-colors;
  }

  .btn-primary {
    @apply bg-blue-500 text-white hover:bg-blue-600;
  }

  .btn-secondary {
    @apply bg-gray-500 text-white hover:bg-gray-600;
  }
}
`,
    }
}

// ============================================================================
// FORMS TEMPLATES
// ============================================================================

function reactHookFormConfigTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/forms/useForm.ts',
        description: 'React Hook Form setup',
        content: `import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodSchema } from 'zod'

export function useTypedForm<T>(schema: ZodSchema) {
  return useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })
}
`,
    }
}

function zodSchemaTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'src/schemas/user.schema.ts',
        description: 'Zod validation schema',
        content: `import { z } from 'zod'

export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().int().min(18, 'Must be at least 18'),
})

export type User = z.infer<typeof userSchema>
`,
    }
}

// ============================================================================
// TESTING TEMPLATES
// ============================================================================

function vitestSetupTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'vitest.config.ts',
        description: 'Vitest configuration',
        content: `import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
`,
    }
}

function reactTestingLibrarySetupTemplate(
    _ctx: TemplateContext
): RenderedTemplate {
    return {
        filename: 'src/test/setup.ts',
        description: 'React Testing Library setup',
        content: `import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
`,
    }
}

// ============================================================================
// TOOLING TEMPLATES
// ============================================================================

function eslintConfigTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: 'eslint.config.js',
        description: 'ESLint configuration',
        content: `import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import typescript from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
]
`,
    }
}

function prettierConfigTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: '.prettierrc.json',
        description: 'Prettier configuration',
        content: JSON.stringify(
            {
                semi: false,
                singleQuote: true,
                trailingComma: 'es5',
                printWidth: 80,
                tabWidth: 2,
                useTabs: false,
            },
            null,
            2
        ),
    }
}

function huskySetupTemplate(_ctx: TemplateContext): RenderedTemplate {
    return {
        filename: '.husky/pre-commit',
        description: 'Husky pre-commit hook',
        content: `#!/bin/sh
. "\$(dirname "\$0")/_/husky.sh"

npm run lint-staged
`,
    }
}
