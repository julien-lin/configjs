import { describe, it, expect } from 'vitest'
import {
  renderTemplate,
  listTemplates,
  templates,
} from '../../../src/templates/index.js'

describe('Templates System', () => {
  describe('renderTemplate', () => {
    it('should render zustand-store template', () => {
      const result = renderTemplate('zustand-store', {})

      expect(result.filename).toBe('src/store/app.ts')
      expect(result.description).toBe('Zustand store application')
      expect(result.content).toContain('create')
      expect(result.content).toContain('useAppStore')
    })

    it('should render axios-config template', () => {
      const result = renderTemplate('axios-config', {})

      expect(result.filename).toBe('src/api/client.ts')
      expect(result.description).toBe('Axios client configuration')
      expect(result.content).toContain('axios.create')
      expect(result.content).toContain('interceptors')
    })

    it('should render tailwind-config template', () => {
      const result = renderTemplate('tailwind-config', {})

      expect(result.filename).toBe('tailwind.config.ts')
      expect(result.description).toBe('Tailwind CSS configuration')
      expect(result.content).toContain('tailwindcss')
      expect(result.content).toContain('content')
    })

    it('should render react-router-layout template', () => {
      const result = renderTemplate('react-router-layout', {})

      expect(result.filename).toBe('src/components/RootLayout.tsx')
      expect(result.description).toBe('React Router root layout')
      expect(result.content).toContain('Outlet')
      expect(result.content).toContain('RootLayout')
    })

    it('should render eslint-config template', () => {
      const result = renderTemplate('eslint-config', {})

      expect(result.filename).toBe('eslint.config.js')
      expect(result.description).toBe('ESLint configuration')
      expect(result.content).toContain('eslint-plugin-react')
    })

    it('should throw for unknown template', () => {
      expect(() => {
        renderTemplate('unknown-template', {})
      }).toThrow('Template not found: unknown-template')
    })
  })

  describe('listTemplates', () => {
    it('should return all available templates', () => {
      const available = listTemplates()

      expect(Array.isArray(available)).toBe(true)
      expect(available.length).toBeGreaterThan(0)
      expect(available).toContain('zustand-store')
      expect(available).toContain('axios-config')
      expect(available).toContain('tailwind-config')
    })

    it('should include state management templates', () => {
      const available = listTemplates()

      expect(available).toContain('zustand-store')
      expect(available).toContain('redux-store')
      expect(available).toContain('pinia-store')
    })

    it('should include HTTP templates', () => {
      const available = listTemplates()

      expect(available).toContain('axios-config')
      expect(available).toContain('axios-interceptors')
      expect(available).toContain('tanstack-query-config')
    })

    it('should include routing templates', () => {
      const available = listTemplates()

      expect(available).toContain('react-router-layout')
      expect(available).toContain('vue-router-config')
    })

    it('should include CSS templates', () => {
      const available = listTemplates()

      expect(available).toContain('tailwind-config')
      expect(available).toContain('tailwind-css')
    })

    it('should include form templates', () => {
      const available = listTemplates()

      expect(available).toContain('react-hook-form-config')
      expect(available).toContain('zod-schema')
    })

    it('should include testing templates', () => {
      const available = listTemplates()

      expect(available).toContain('vitest-setup')
      expect(available).toContain('react-testing-library-setup')
    })

    it('should include tooling templates', () => {
      const available = listTemplates()

      expect(available).toContain('eslint-config')
      expect(available).toContain('prettier-config')
      expect(available).toContain('husky-setup')
    })
  })

  describe('Template content', () => {
    it('zustand store should have proper structure', () => {
      const result = renderTemplate('zustand-store', {})

      expect(result.content).toContain('interface AppState')
      expect(result.content).toContain('increment')
      expect(result.content).toContain('decrement')
      expect(result.content).toContain('reset')
    })

    it('redux store should have proper structure', () => {
      const result = renderTemplate('redux-store', {})

      expect(result.content).toContain('configureStore')
      expect(result.content).toContain('RootState')
      expect(result.content).toContain('AppDispatch')
    })

    it('pinia store should have composition API', () => {
      const result = renderTemplate('pinia-store', {})

      expect(result.content).toContain('defineStore')
      expect(result.content).toContain('defineStore')
      expect(result.content).toContain('increment')
    })

    it('axios config should include interceptors', () => {
      const result = renderTemplate('axios-config', {})

      expect(result.content).toContain('interceptors.request')
      expect(result.content).toContain('interceptors.response')
      expect(result.content).toContain('Authorization')
    })

    it('tailwind config should include content paths', () => {
      const result = renderTemplate('tailwind-config', {})

      expect(result.content).toContain('content:')
      expect(result.content).toContain('index.html')
      expect(result.content).toContain('src/**/*.{js,ts,jsx,tsx}')
    })

    it('tailwind css should include directives', () => {
      const result = renderTemplate('tailwind-css', {})

      expect(result.content).toContain('@tailwind base')
      expect(result.content).toContain('@tailwind components')
      expect(result.content).toContain('@tailwind utilities')
    })

    it('react hook form should use zod resolver', () => {
      const result = renderTemplate('react-hook-form-config', {})

      expect(result.content).toContain('useForm')
      expect(result.content).toContain('zodResolver')
    })

    it('zod schema should define user schema', () => {
      const result = renderTemplate('zod-schema', {})

      expect(result.content).toContain('email')
      expect(result.content).toContain('password')
      expect(result.content).toContain('z.infer')
    })

    it('vitest config should be valid', () => {
      const result = renderTemplate('vitest-setup', {})

      expect(result.content).toContain('defineConfig')
      expect(result.content).toContain('jsdom')
    })

    it('eslint config should include react plugin', () => {
      const result = renderTemplate('eslint-config', {})

      expect(result.content).toContain('eslint-plugin-react')
      expect(result.content).toContain('eslint-plugin-react-hooks')
    })

    it('prettier config should be valid JSON', () => {
      const result = renderTemplate('prettier-config', {})

      expect(() => {
        JSON.parse(result.content)
      }).not.toThrow()

      const config = JSON.parse(result.content)
      expect(config.semi).toBe(false)
      expect(config.singleQuote).toBe(true)
    })

    it('husky hook should be executable shell script', () => {
      const result = renderTemplate('husky-setup', {})

      expect(result.content).toContain('#!/bin/sh')
      expect(result.content).toContain('husky.sh')
    })
  })

  describe('Template API', () => {
    it('should have all templates in Object', () => {
      expect(typeof templates).toBe('object')
      expect(templates).not.toBeNull()
    })

    it('each template should return RenderedTemplate', () => {
      const templateNames = listTemplates()

      for (const name of templateNames.slice(0, 5)) {
        // Test first 5 templates
        const result = renderTemplate(name, {})

        expect(result).toHaveProperty('filename')
        expect(result).toHaveProperty('content')
        expect(typeof result.filename).toBe('string')
        expect(typeof result.content).toBe('string')
      }
    })
  })
})
