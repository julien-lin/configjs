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
  .action(async (options: {
    yes?: boolean
    dryRun?: boolean
    silent?: boolean
    debug?: boolean
    config?: string
    force?: boolean
  }) => {
    try {
      const { installReact } = await import('./cli/commands/install.js')
      await installReact(options)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error:', error)
      process.exit(1)
    }
  })

program
  .command('list')
  .description('List available libraries')
  .option('-c, --category <category>', 'Filter by category')
  .action((options) => {
    // eslint-disable-next-line no-console
    console.log('📦 Available libraries')
    // eslint-disable-next-line no-console
    console.log('Options:', options)
    // eslint-disable-next-line no-console
    console.log('\n⚠️  Implementation coming soon...')

    // TODO: Implement
    // const { listLibraries } = await import('./cli/commands/list')
    // await listLibraries(options)
  })

program
  .command('check')
  .description('Check compatibility without installing')
  .option('-c, --config <file>', 'Configuration file to check')
  .action(() => {
    // eslint-disable-next-line no-console
    console.log('🔍 Checking compatibility')
    // eslint-disable-next-line no-console
    console.log('\n⚠️  Implementation coming soon...')

    // TODO: Implement
    // const { checkCompatibility } = await import('./cli/commands/check')
    // await checkCompatibility(options)
  })

program.parse()
