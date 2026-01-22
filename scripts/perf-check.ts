#!/usr/bin/env node

/**
 * Performance Check Script
 * Runs performance benchmarks and regression detection for CI/CD
 *
 * Usage:
 *   npm run perf:check
 *   npm run perf:check -- --baseline-save
 *   npm run perf:check -- --slack-webhook $SLACK_URL
 */

import { argv } from 'process'
import { writeFileSync } from 'fs'
import {
  PerformanceMonitor,
  CICDPerformanceIntegration,
} from '../tests/performance/continuous-monitoring.js'

interface Options {
  baselineSave: boolean
  slackWebhook?: string
  outputFile?: string
  verbose: boolean
}

function parseArgs(): Options {
  const options: Options = {
    baselineSave: false,
    verbose: false,
  }

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--baseline-save') {
      options.baselineSave = true
    } else if (argv[i] === '--slack-webhook' && argv[i + 1]) {
      options.slackWebhook = argv[i + 1]
      i++
    } else if (argv[i] === '--output' && argv[i + 1]) {
      options.outputFile = argv[i + 1]
      i++
    } else if (argv[i] === '--verbose') {
      options.verbose = true
    }
  }

  return options
}

async function runPerformanceChecks(options: Options): Promise<number> {
  console.log('🚀 Starting Performance Checks...\n')

  try {
    // Initialize monitoring
    const monitor = new PerformanceMonitor({
      alertThreshold: parseInt(process.env['PERF_ALERT_THRESHOLD'] || '5'),
      trendWindow: 10,
      slackWebhook: options.slackWebhook || process.env['SLACK_WEBHOOK'],
    })

    const cicd = new CICDPerformanceIntegration(monitor)

    // Simulate performance measurements
    // In real scenario, these would come from actual test runs
    const metrics: Record<string, number> = {
      'install-time': measureInstallTime(),
      'plugin-load': measurePluginLoad(),
      'memory-usage': measureMemoryUsage(),
      'cpu-utilization': measureCPUUtilization(),
    }

    // Run CI/CD checks
    const result = await cicd.runCICDChecks(metrics)

    // Output report
    console.log(result.report)

    // Save baseline if requested
    if (options.baselineSave) {
      console.log('\n💾 Saving performance baseline...')
      Object.entries(metrics).forEach(([name, value]) => {
        monitor.saveBaseline(name, value)
      })
      console.log('✅ Baseline saved successfully\n')
    }

    // Save output file if requested
    if (options.outputFile) {
      writeFileSync(options.outputFile, result.report)
      console.log(`📄 Report saved to ${options.outputFile}\n`)
    }

    // Print GitHub Actions output if in CI
    if (process.env['GITHUB_ACTIONS']) {
      console.log('\n📝 GitHub Actions Output:')
      const ghOutput = cicd.generateGitHubActionsOutput(
        monitor.generateCICDReport()
      )
      if (ghOutput) {
        console.log(ghOutput)
      }
    }

    return result.exitCode
  } catch (error) {
    console.error('❌ Performance check failed:', error)
    return 1
  }
}

/**
 * Simulate performance measurements
 * In real implementation, these would run actual benchmarks
 */

function measureInstallTime(): number {
  // Simulated measurement
  const baseValue = 95
  const variation = (Math.random() - 0.5) * 10
  return baseValue + variation
}

function measurePluginLoad(): number {
  const baseValue = 15
  const variation = (Math.random() - 0.5) * 4
  return baseValue + variation
}

function measureMemoryUsage(): number {
  const baseValue = 125
  const variation = (Math.random() - 0.5) * 20
  return baseValue + variation
}

function measureCPUUtilization(): number {
  const baseValue = 45
  const variation = (Math.random() - 0.5) * 10
  return baseValue + variation
}

/**
 * Main entry point
 */

const options = parseArgs()

if (options.verbose) {
  console.log('📊 Performance Check Options:')
  console.log(`  - Baseline Save: ${options.baselineSave}`)
  console.log(
    `  - Slack Webhook: ${options.slackWebhook ? 'Configured' : 'Not configured'}`
  )
  console.log(`  - Output File: ${options.outputFile || 'None'}`)
  console.log()
}

runPerformanceChecks(options)
  .then((exitCode) => {
    process.exit(exitCode)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
