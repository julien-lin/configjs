import type {
    Plugin,
    ProjectContext,
    ConfigResult,
    InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { getModuleLogger } from '../../utils/logger-provider.js'
import { resolve } from 'path'
import fs from 'fs/promises'

const logger = getModuleLogger()

/**
 * Angular Aria Plugin
 * Headless accessibility library for building accessible components
 * New in Angular 21
 */
export const angularAriaPlugin: Plugin = {
    name: '@angular/aria',
    displayName: 'Angular Aria',
    description:
        'Headless accessibility library for managing keyboard navigation and ARIA roles',
    category: Category.UI,
    version: '^21.0.0',

    frameworks: ['angular'],
    requiresTypeScript: true,

    detect: (ctx: ProjectContext): boolean => {
        return ctx.dependencies['@angular/aria'] !== undefined
    },

    async install(ctx: ProjectContext): Promise<InstallResult> {
        if (this.detect?.(ctx)) {
            logger.info('@angular/aria is already installed')
            return {
                packages: {},
                success: true,
                message: '@angular/aria already installed',
            }
        }

        const packages: string[] = ['@angular/aria@^21.0.0']

        try {
            await installPackages(packages, {
                dev: false,
                packageManager: ctx.packageManager,
                projectRoot: ctx.projectRoot,
            })

            return {
                packages: { dependencies: packages },
                success: true,
            }
        } catch (error) {
            logger.error('Failed to install @angular/aria', error)
            return {
                packages: {},
                success: false,
                message: `Error installing @angular/aria: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        }
    },

    async configure(ctx: ProjectContext): Promise<ConfigResult> {
        try {
            const componentsDir = resolve(ctx.projectRoot, 'src/app/components')
            await fs.mkdir(componentsDir, { recursive: true })

            // Create accessible button component with Aria attributes
            const accessibleButtonPath = resolve(
                componentsDir,
                'accessible-button.component.ts'
            )
            const accessibleButtonContent = `import { Component, Input } from '@angular/core'
import { NgIf } from '@angular/common'

@Component({
  selector: 'app-accessible-button',
  standalone: true,
  imports: [NgIf],
  template: \`
    <button
      [attr.aria-label]="ariaLabel || label"
      [attr.aria-pressed]="ariaPressed"
      [attr.aria-disabled]="disabled"
      [disabled]="disabled"
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      {{ label }}
    </button>
  \`,
  styles: [
    \`
      :host(:focus-visible) {
        outline: 2px solid #2563eb;
      }
    \`,
  ],
})
export class AccessibleButtonComponent {
  @Input() label = 'Button'
  @Input() ariaLabel: string | null = null
  @Input() ariaPressed = false
  @Input() disabled = false
}
`
            await fs.writeFile(accessibleButtonPath, accessibleButtonContent, 'utf-8')

            // Create accessible navigation component
            const accessibleNavPath = resolve(
                componentsDir,
                'accessible-nav.component.ts'
            )
            const accessibleNavContent = `import { Component } from '@angular/core'
import { NgFor } from '@angular/common'
import { RouterLink, RouterLinkActive } from '@angular/router'

interface NavItem {
  label: string
  path: string
}

@Component({
  selector: 'app-accessible-nav',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive],
  template: \`
    <nav [attr.aria-label]="'Main navigation'" role="navigation">
      <ul class="flex gap-4">
        <li *ngFor="let item of navItems">
          <a
            [routerLink]="item.path"
            routerLinkActive="active"
            [attr.aria-current]="ariaCurrentPage(item.path)"
            class="px-3 py-2 rounded hover:bg-gray-100"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </nav>
  \`,
  styles: [
    \`
      a.active {
        background-color: #dbeafe;
        font-weight: bold;
      }
    \`,
  ],
})
export class AccessibleNavComponent {
  navItems: NavItem[] = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ]

  ariaCurrentPage(path: string): string | null {
    // Set aria-current="page" for current route
    return null // Implement with Router if needed
  }
}
`
            await fs.writeFile(accessibleNavPath, accessibleNavContent, 'utf-8')

            logger.success('Angular Aria configuration completed')
            logger.info(
                'Created: components/accessible-button.component.ts and accessible-nav.component.ts'
            )

            return {
                files: [
                    {
                        type: 'create',
                        path: 'src/app/components/accessible-button.component.ts',
                    },
                    {
                        type: 'create',
                        path: 'src/app/components/accessible-nav.component.ts',
                    },
                ],
                success: true,
            }
        } catch (error) {
            logger.error('Failed to configure Angular Aria', error)
            return {
                files: [],
                success: false,
                message: `Error configuring Angular Aria: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        }
    },
}
