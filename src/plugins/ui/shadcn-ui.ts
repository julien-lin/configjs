import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import {
  checkPathExists,
  readFileContent,
  ensureDirectory,
  normalizePath,
} from '../../utils/fs-helpers.js'
import { getModuleLogger } from '../../utils/logger-provider.js'

const logger = getModuleLogger()

/**
 * Plugin Shadcn/ui
 *
 * Composants UI accessibles et personnalisables
 * Documentation officielle : https://ui.shadcn.com
 *
 * @example
 * ```typescript
 * import { shadcnUiPlugin } from './plugins/ui/shadcn-ui'
 * await shadcnUiPlugin.install(ctx)
 * await shadcnUiPlugin.configure(ctx)
 * ```
 */
export const shadcnUiPlugin: Plugin = {
  name: 'shadcn-ui',
  displayName: 'Shadcn/ui',
  description: 'Composants UI accessibles et personnalisables',
  category: Category.UI,
  version: '^3.6.2',

  frameworks: ['react'],
  requires: ['tailwindcss'],

  /**
   * Détecte si Shadcn/ui est déjà configuré
   * Vérifie la présence de components.json ou des dépendances clés
   */
  detect: (ctx: ProjectContext): boolean => {
    // Shadcn/ui n'est pas un package npm, on détecte via les dépendances clés
    return (
      ctx.dependencies['class-variance-authority'] !== undefined ||
      ctx.devDependencies['class-variance-authority'] !== undefined ||
      ctx.dependencies['@radix-ui/react-slot'] !== undefined ||
      ctx.devDependencies['@radix-ui/react-slot'] !== undefined
    )
  },

  /**
   * Installe les dépendances nécessaires pour Shadcn/ui
   * Shadcn/ui nécessite :
   * - TailwindCSS (déjà installé si le plugin tailwindcss est utilisé)
   * - Radix UI primitives
   * - class-variance-authority, clsx, tailwind-merge
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Shadcn/ui dependencies are already installed')
      return {
        packages: {},
        success: true,
        message: 'Shadcn/ui dependencies already installed',
      }
    }
    try {
      const packages: string[] = [
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        '@radix-ui/react-slot',
      ]

      // Ajouter d'autres primitives Radix UI couramment utilisées
      const radixPrimitives = [
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-label',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-toast',
      ]

      packages.push(...radixPrimitives)

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Shadcn/ui dependencies')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed Shadcn/ui dependencies: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Shadcn/ui dependencies:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Shadcn/ui dependencies: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Shadcn/ui dans le projet
   *
   * Crée :
   * - components.json : Configuration Shadcn/ui
   * - src/lib/utils.ts : Utilitaires (cn helper)
   * - src/components/ui/button.tsx : Exemple de composant Button
   *
   * Documentation : https://ui.shadcn.com/docs/installation
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager(ctx.fsAdapter)
    const writer = new ConfigWriter(backupManager, ctx.fsAdapter)

    const files: ConfigResult['files'] = []
    const projectRoot = ctx.projectRoot
    const srcDir = join(projectRoot, ctx.srcDir)

    try {
      // 1. Créer components.json
      const componentsJsonPath = join(projectRoot, 'components.json')
      const componentsJsonExists = await checkPathExists(
        componentsJsonPath,
        ctx.fsAdapter
      )

      if (componentsJsonExists) {
        logger.warn('components.json already exists, skipping creation')
      } else {
        const componentsJsonContent = getComponentsJsonContent(ctx)

        await writer.createFile(componentsJsonPath, componentsJsonContent)
        files.push({
          type: 'create',
          path: normalizePath(componentsJsonPath),
          content: componentsJsonContent,
          backup: false,
        })

        logger.info(`Created components.json: ${componentsJsonPath}`)
      }

      // 2. Créer src/lib/utils.ts (ou .js) avec la fonction cn
      const libDir = join(srcDir, 'lib')
      await ensureDirectory(libDir, ctx.fsAdapter)

      const utilsPath = join(libDir, `utils.${ctx.typescript ? 'ts' : 'js'}`)
      const utilsExists = await checkPathExists(utilsPath, ctx.fsAdapter)

      if (utilsExists) {
        logger.warn(
          'utils.ts already exists, checking if cn function is present'
        )
        const existingContent = await readFileContent(
          utilsPath,
          'utf-8',
          ctx.fsAdapter
        )
        if (!existingContent.includes('export function cn')) {
          // Ajouter la fonction cn si elle n'existe pas
          const cnFunction = ctx.typescript
            ? getCnFunctionTS()
            : getCnFunctionJS()
          const updatedContent = existingContent + '\n\n' + cnFunction
          await writer.writeFile(utilsPath, updatedContent, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(utilsPath),
            content: updatedContent,
            backup: true,
          })
          logger.info('Added cn function to utils.ts')
        }
      } else {
        const utilsContent = ctx.typescript
          ? getUtilsContentTS()
          : getUtilsContentJS()

        await writer.createFile(utilsPath, utilsContent)
        files.push({
          type: 'create',
          path: normalizePath(utilsPath),
          content: utilsContent,
          backup: false,
        })

        logger.info(`Created utils file: ${utilsPath}`)
      }

      // 3. Créer src/components/ui/button.tsx (exemple de composant)
      const uiDir = join(srcDir, 'components', 'ui')
      await ensureDirectory(uiDir, ctx.fsAdapter)

      const buttonPath = join(uiDir, `button.${ctx.typescript ? 'tsx' : 'jsx'}`)
      const buttonExists = await checkPathExists(buttonPath, ctx.fsAdapter)

      if (!buttonExists) {
        const buttonContent = ctx.typescript
          ? getButtonContentTS()
          : getButtonContentJS()

        await writer.createFile(buttonPath, buttonContent)
        files.push({
          type: 'create',
          path: normalizePath(buttonPath),
          content: buttonContent,
          backup: false,
        })

        logger.info(`Created Button component: ${buttonPath}`)
      }

      // 5. Ajouter les variables CSS dans le fichier CSS principal si nécessaire
      const cssPath = join(srcDir, 'index.css')
      const cssExists = await checkPathExists(cssPath, ctx.fsAdapter)

      if (cssExists) {
        const cssContent = await readFileContent(
          cssPath,
          'utf-8',
          ctx.fsAdapter
        )
        if (!cssContent.includes('@layer base')) {
          const shadcnVariables = getShadcnCSSVariables()
          const updatedCss = cssContent + '\n\n' + shadcnVariables
          await writer.writeFile(cssPath, updatedCss, { backup: true })
          files.push({
            type: 'modify',
            path: normalizePath(cssPath),
            content: updatedCss,
            backup: true,
          })
          logger.info('Added Shadcn/ui CSS variables to index.css')
        }
      }

      return {
        files,
        success: true,
        message: 'Shadcn/ui configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Shadcn/ui:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Shadcn/ui: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Shadcn/ui
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager(_ctx.fsAdapter)
    try {
      await backupManager.restoreAll()
      logger.info('Shadcn/ui configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Shadcn/ui configuration:', error)
      throw error
    }
  },
}

/**
 * Génère le contenu de components.json
 */
function getComponentsJsonContent(ctx: ProjectContext): string {
  const srcDir = ctx.srcDir || 'src'
  const style = 'new-york' // Style par défaut (peut être 'default' ou 'new-york')
  const tailwindConfig = 'tailwind.config.js'
  const tailwindCss = `${srcDir}/index.css`
  const components = `${srcDir}/components`
  const utils = `${srcDir}/lib/utils`

  return JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema.json',
      style,
      rsc: false,
      tsx: ctx.typescript,
      tailwind: {
        config: tailwindConfig,
        css: tailwindCss,
        baseColor: 'slate',
        cssVariables: true,
        prefix: '',
      },
      aliases: {
        components,
        utils,
        ui: `${components}/ui`,
        lib: `${srcDir}/lib`,
        hooks: `${srcDir}/hooks`,
      },
    },
    null,
    2
  )
}

/**
 * Génère le contenu de src/lib/utils.ts
 */
function getUtilsContentTS(): string {
  return `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Fonction utilitaire pour fusionner les classes TailwindCSS
 * 
 * Utilise clsx pour gérer les conditions et twMerge pour résoudre les conflits
 * 
 * @example
 * \`\`\`tsx
 * import { cn } from '@/lib/utils'
 * 
 * <div className={cn('px-2 py-1', isActive && 'bg-blue-500')} />
 * \`\`\`
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`
}

/**
 * Génère le contenu de src/lib/utils.js
 */
function getUtilsContentJS(): string {
  return `import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Fonction utilitaire pour fusionner les classes TailwindCSS
 * 
 * Utilise clsx pour gérer les conditions et twMerge pour résoudre les conflits
 * 
 * @example
 * \`\`\`jsx
 * import { cn } from '@/lib/utils'
 * 
 * <div className={cn('px-2 py-1', isActive && 'bg-blue-500')} />
 * \`\`\`
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
`
}

/**
 * Génère uniquement la fonction cn pour l'ajouter à un fichier existant
 */
function getCnFunctionTS(): string {
  return `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`
}

/**
 * Génère uniquement la fonction cn pour l'ajouter à un fichier existant
 */
function getCnFunctionJS(): string {
  return `import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
`
}

/**
 * Génère le contenu du composant Button (TypeScript)
 */
function getButtonContentTS(): string {
  return `import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
`
}

/**
 * Génère le contenu du composant Button (JavaScript)
 */
function getButtonContentJS(): string {
  return `import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
`
}

/**
 * Génère les variables CSS Shadcn/ui à ajouter dans index.css
 */
function getShadcnCSSVariables(): string {
  return `@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`
}
