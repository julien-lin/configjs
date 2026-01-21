#!/usr/bin/env node

import { Command } from 'commander'
import { version } from '../package.json'
import { initializeCLILogging, cliLogger } from './utils/logger-provider.js'

// Enable CLI logging at startup
initializeCLILogging()

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
        const { ReactCommand } = await import('./cli/commands/react-command.js')
        const command = new ReactCommand()
        await command.execute(options)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        cliLogger.error(`❌ React configuration failed: ${errorMessage}`)
        process.exit(1)
      }
    }
  )

program
  .command('nextjs')
  .description('Configure a Next.js project')
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
        const { NextjsCommand } =
          await import('./cli/commands/nextjs-command.js')
        const command = new NextjsCommand()
        await command.execute(options)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        cliLogger.error(`❌ Next.js configuration failed: ${errorMessage}`)
        process.exit(1)
      }
    }
  )

program
  .command('vue')
  .description('Configure a Vue.js project')
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
        const { VueCommand } = await import('./cli/commands/vue-command.js')
        const command = new VueCommand()
        await command.execute(options)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        cliLogger.error(`❌ Vue configuration failed: ${errorMessage}`)
        process.exit(1)
      }
    }
  )

program
  .command('svelte')
  .description('Configure a Svelte project')
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
        const { SvelteCommand } =
          await import('./cli/commands/svelte-command.js')
        const command = new SvelteCommand()
        await command.execute(options)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        cliLogger.error(`❌ Svelte configuration failed: ${errorMessage}`)
        process.exit(1)
      }
    }
  )

program
  .command('angular')
  .description('Configure an Angular project')
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
        const { AngularCommand } =
          await import('./cli/commands/angular-command.js')
        const command = new AngularCommand()
        await command.execute(options)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        cliLogger.error(`❌ Angular configuration failed: ${errorMessage}`)
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
      listLibraries(options)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      cliLogger.error(`❌ Failed to list libraries: ${errorMessage}`)
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
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      cliLogger.error(`❌ Compatibility check failed: ${errorMessage}`)
      process.exit(1)
    }
  })

program
  .command('installed')
  .description('List installed plugins')
  .action(async () => {
    try {
      const { installedCommand } = await import('./cli/commands/installed.js')
      await installedCommand()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      cliLogger.error(`❌ Failed to list installed plugins: ${errorMessage}`)
      process.exit(1)
    }
  })

program
  .command('remove <plugin>')
  .description('Remove an installed plugin')
  .action(async (plugin: string) => {
    try {
      const { removeCommand } = await import('./cli/commands/remove.js')
      await removeCommand(plugin)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      cliLogger.error(`❌ Failed to remove plugin '${plugin}': ${errorMessage}`)
      process.exit(1)
    }
  })

program.parse(process.argv)
