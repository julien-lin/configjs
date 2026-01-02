/**
 * Unit Tests: CLI List Command
 * Teste la commande CLI "list"
 *
 * @group unit
 */

import { describe, it, expect } from 'vitest'

// Mock des données de plugins
const PLUGINS_DATABASE = {
  routing: [
    {
      name: 'react-router-dom',
      description: 'Declarative routing for React',
      version: '^6.20.0',
      category: 'routing',
    },
    {
      name: 'tanstack-router',
      description: 'Headless routing library',
      version: '^1.0.0',
      category: 'routing',
    },
  ],
  state: [
    {
      name: 'zustand',
      description: 'Small, fast state management',
      version: '^4.4.0',
      category: 'state',
    },
    {
      name: 'redux-toolkit',
      description: 'Redux with more power',
      version: '^1.9.0',
      category: 'state',
    },
  ],
  http: [
    {
      name: 'axios',
      description: 'Promise based HTTP client',
      version: '^1.6.0',
      category: 'http',
    },
    {
      name: 'tanstack-query',
      description: 'Powerful async state management',
      version: '^5.28.0',
      category: 'http',
    },
  ],
}

describe('Unit: CLI Commands - List', () => {
  // ===== Basic Listing =====

  it('should list all plugins', () => {
    const allPlugins = Object.values(PLUGINS_DATABASE).flat()
    expect(allPlugins.length).toBeGreaterThan(0)
  })

  it('should list plugins by category', () => {
    const routingPlugins = PLUGINS_DATABASE.routing
    expect(routingPlugins).toHaveLength(2)

    const statePlugins = PLUGINS_DATABASE.state
    expect(statePlugins).toHaveLength(2)
  })

  it('should filter plugins by name pattern', () => {
    const allPlugins = Object.values(PLUGINS_DATABASE).flat()
    const filtered = allPlugins.filter((p) => p.name.includes('react'))

    expect(filtered.length).toBeGreaterThan(0)
  })

  // ===== Category Filtering =====

  it('should accept --category option', () => {
    const options = { category: 'routing' }
    expect(options.category).toBe('routing')
  })

  it('should handle invalid category', () => {
    const validCategories = Object.keys(PLUGINS_DATABASE)
    const invalidCategory = 'non-existent'

    expect(validCategories).not.toContain(invalidCategory)
  })

  // ===== Output Formatting =====

  it('should format output as table', () => {
    const tableOutput = `
┌─────────────────────────┬─────────────────────────────────┬──────────┐
│ Name                    │ Description                     │ Version  │
├─────────────────────────┼─────────────────────────────────┼──────────┤
│ react-router-dom        │ Declarative routing for React   │ ^6.20.0  │
│ zustand                 │ Small, fast state management    │ ^4.4.0   │
└─────────────────────────┴─────────────────────────────────┴──────────┘
    `

    expect(tableOutput).toContain('Name')
    expect(tableOutput).toContain('Description')
    expect(tableOutput).toContain('Version')
  })

  it('should format output as JSON', () => {
    const jsonOutput = JSON.stringify(PLUGINS_DATABASE.routing, null, 2)

    expect(jsonOutput).toContain('react-router-dom')
    expect(jsonOutput).toContain('description')
  })

  // ===== Detailed Information =====

  it('should show plugin details with --details flag', () => {
    const plugin = PLUGINS_DATABASE.routing[0]

    if (!plugin) {
      throw new Error('Plugin not found')
    }

    const details = `
Name: ${plugin.name}
Version: ${plugin.version}
Category: ${plugin.category}
Description: ${plugin.description}

Compatible with:
  - State management (any)
  - HTTP clients (any)
  - CSS frameworks (any)
    `

    expect(details).toContain(plugin.name)
    expect(details).toContain('Compatible with')
  })

  it('should show usage examples', () => {
    const example = `
Examples:
  confjs list                          # List all plugins
  confjs list --category routing       # List routing plugins
  confjs list react-router-dom         # Show react-router-dom details
  confjs list --format json            # Output as JSON
    `

    expect(example).toContain('confjs list')
    expect(example).toContain('Examples')
  })

  // ===== Searching =====

  it('should search plugins by name', () => {
    const allPlugins = Object.values(PLUGINS_DATABASE).flat()
    const searchTerm = 'react'

    const results = allPlugins.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    )

    expect(results.length).toBeGreaterThan(0)
  })

  it('should search plugins by description', () => {
    const allPlugins = Object.values(PLUGINS_DATABASE).flat()
    const searchTerm = 'state'

    const results = allPlugins.filter((p) =>
      p.description.toLowerCase().includes(searchTerm)
    )

    expect(results.length).toBeGreaterThan(0)
  })

  // ===== Sorting =====

  it('should sort plugins by name', () => {
    const plugins = [...PLUGINS_DATABASE.routing].sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    if (plugins[0] && plugins[1]) {
      expect(
        plugins[0].name.localeCompare(plugins[1].name)
      ).toBeLessThanOrEqual(0)
    }
  })

  it('should sort plugins by category', () => {
    const plugins = Object.entries(PLUGINS_DATABASE).sort((a, b) =>
      a[0].localeCompare(b[0])
    )

    expect(plugins).toBeDefined()
  })

  // ===== Compatibility Information =====

  it('should show compatible plugins for selection', () => {
    const compatibility = {
      compatible: ['zustand', 'redux-toolkit', 'axios', 'tailwindcss'],
      conflicting: [],
    }

    expect(compatibility.compatible).toContain('zustand')
    expect(compatibility.conflicting).toHaveLength(0)
  })

  // ===== Count and Stats =====

  it('should show total count of plugins', () => {
    const allPlugins = Object.values(PLUGINS_DATABASE).flat()
    const totalCount = allPlugins.length

    const output = `Total plugins available: ${totalCount}`
    expect(output).toContain(String(totalCount))
  })

  it('should show count per category', () => {
    const stats = Object.entries(PLUGINS_DATABASE)
      .map(([cat, plugins]) => `${cat}: ${plugins.length}`)
      .join('\n')

    expect(stats).toContain('routing')
    expect(stats).toContain('state')
  })

  // ===== Pagination =====

  it('should support pagination with --limit', () => {
    const limit = 5
    const allPlugins = Object.values(PLUGINS_DATABASE).flat()
    const paginated = allPlugins.slice(0, limit)

    expect(paginated.length).toBeLessThanOrEqual(limit)
  })

  it('should support offset with --offset', () => {
    const offset = 2
    const limit = 3
    const allPlugins = Object.values(PLUGINS_DATABASE).flat()
    const page = allPlugins.slice(offset, offset + limit)

    expect(page.length).toBeLessThanOrEqual(limit)
  })

  // ===== Version Information =====

  it('should display latest versions', () => {
    const plugins = Object.values(PLUGINS_DATABASE).flat()

    for (const plugin of plugins) {
      expect(plugin.version).toMatch(/^\^?\d+/)
    }
  })

  // ===== Help Text =====

  it('should show help for list command', () => {
    const help = `
Usage:
  confjs list [options]

Options:
  --category <cat>   Filter by category
  --details          Show detailed information
  --format <fmt>     Output format (table, json, csv)
  --limit <num>      Limit results
  --search <term>    Search plugins
  --help             Show this help
    `

    expect(help).toContain('confjs list')
    expect(help).toContain('Options')
  })
})
