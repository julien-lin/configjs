#!/usr/bin/env node

import { Command } from 'commander'
import { version } from '../package.json'

const program = new Command()

program
  .name('confjs')
  .description('Configure your frontend stack, instantly')
  .version(version)

program
  .command('react')
  .description('Configure a React project')
  .option('-y, --yes', 'Accept all defaults')
  .option('-d, --dry-run', 'Simulate without writing to disk')
  .option('-s, --silent', 'Non-interactive mode')
  .option('--debug', 'Enable debug logs')
  .option('-c, --config <file>', 'Use configuration file')
  .option('-f, --force', 'Force installation (overwrite configs)')
  .option('--no-install', 'Generate configs only, skip package installation')
  .action(
    async (options: {
      yes?: boolean
      dryRun?: boolean
      silent?: boolean
      debug?: boolean
      config?: string
      force?: boolean
      install?: boolean
    }) => {
      try {
        const { installReact } = await import('./cli/commands/install.js')
        await installReact(options)
      } catch (error) {
        console.error('Error:', error)
        process.exit(1)
      }
    }
  )

program
  .command('list')
  .description('List available libraries')
  .option('-c, --category <category>', 'Filter by category')
  .action(async (options: { category?: string }) => {
    try {
      const { listLibraries } = await import('./cli/commands/list.js')
      await listLibraries(options)
    } catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

program
  .command('check')
  .description('Check compatibility without installing')
  .option('-c, --config <file>', 'Configuration file to check')
  .action(async (options: { config?: string }) => {
    try {
      const { checkCompatibility } = await import('./cli/commands/check.js')
      await checkCompatibility(options)
    } catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

program.parse()
