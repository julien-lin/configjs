/**
 * Continuous Performance Monitoring
 * CI/CD integration for automated performance tracking
 *
 * Features:
 * - Automatic regression detection
 * - Performance alerts
 * - Historical trend analysis
 * - Baseline management
 * - Report generation
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { tmpdir } from 'os'

export interface PerformanceAlert {
  id: string
  timestamp: number
  severity: 'info' | 'warning' | 'error'
  metric: string
  currentValue: number
  baselineValue: number
  percentChange: number
  message: string
}

export interface PerformanceTrend {
  metric: string
  measurements: Array<{
    timestamp: number
    value: number
  }>
  trend: 'improving' | 'degrading' | 'stable'
  trendPercentage: number
}

export interface ContinuousMonitoringConfig {
  alertsDir: string
  trendsDir: string
  baselinesDir: string
  alertThreshold: number // percentage
  trendWindow: number // number of measurements
  emailOnAlert: boolean
  slackWebhook?: string
  jiraProject?: string
}

/**
 * Performance Monitoring & Alert System
 */
export class PerformanceMonitor {
  private config: ContinuousMonitoringConfig
  private alerts: PerformanceAlert[] = []

  constructor(config: Partial<ContinuousMonitoringConfig> = {}) {
    this.config = {
      alertsDir: resolve(join(tmpdir(), 'performance-alerts')),
      trendsDir: resolve(join(tmpdir(), 'performance-trends')),
      baselinesDir: resolve(join(tmpdir(), 'performance-baselines')),
      alertThreshold: 5, // 5%
      trendWindow: 10,
      emailOnAlert: false,
      ...config,
    }
    // Ensure directories exist
    if (!existsSync(this.config.alertsDir)) {
      mkdirSync(this.config.alertsDir, { recursive: true })
    }
    if (!existsSync(this.config.trendsDir)) {
      mkdirSync(this.config.trendsDir, { recursive: true })
    }
    if (!existsSync(this.config.baselinesDir)) {
      mkdirSync(this.config.baselinesDir, { recursive: true })
    }
  }

  /**
   * Detect regression and create alert if needed
   */
  checkRegression(
    metric: string,
    currentValue: number,
    baselineValue: number
  ): PerformanceAlert | null {
    const percentChange = ((currentValue - baselineValue) / baselineValue) * 100

    if (Math.abs(percentChange) > this.config.alertThreshold) {
      const alert: PerformanceAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        severity: Math.abs(percentChange) > 20 ? 'error' : 'warning',
        metric,
        currentValue,
        baselineValue,
        percentChange,
        message: `Performance regression detected: ${metric} degraded by ${Math.abs(percentChange).toFixed(2)}%`,
      }

      this.alerts.push(alert)
      this.saveAlert(alert)

      if (this.config.emailOnAlert) {
        this.sendEmailAlert(alert)
      }

      if (this.config.slackWebhook) {
        void this.sendSlackAlert(alert)
      }

      return alert
    }

    return null
  }

  /**
   * Analyze performance trend
   */
  analyzeTrend(metric: string, measurements: number[]): PerformanceTrend {
    if (measurements.length < 2) {
      return {
        metric,
        measurements: measurements.map((v) => ({
          timestamp: Date.now(),
          value: v,
        })),
        trend: 'stable',
        trendPercentage: 0,
      }
    }

    const recentSize = Math.min(
      this.config.trendWindow,
      Math.floor(measurements.length / 2)
    )
    const recent = measurements.slice(-recentSize)
    const older = measurements.slice(0, measurements.length - recentSize)

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg =
      older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : 0

    const trendPercentage =
      olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    const trend =
      trendPercentage > 2
        ? 'degrading'
        : trendPercentage < -2
          ? 'improving'
          : 'stable'

    return {
      metric,
      measurements: recent.map((v) => ({
        timestamp: Date.now(),
        value: v,
      })),
      trend,
      trendPercentage,
    }
  }

  /**
   * Save alert to file
   */
  private saveAlert(alert: PerformanceAlert): void {
    const alertFile = resolve(join(this.config.alertsDir, `${alert.id}.json`))
    writeFileSync(alertFile, JSON.stringify(alert, null, 2))
  }

  /**
   * Get all alerts
   */
  getAlerts(severity?: 'info' | 'warning' | 'error'): PerformanceAlert[] {
    return severity
      ? this.alerts.filter((a) => a.severity === severity)
      : this.alerts
  }

  /**
   * Get active alerts (from last 24 hours)
   */
  getActiveAlerts(): PerformanceAlert[] {
    const oneDay = 24 * 60 * 60 * 1000
    return this.alerts.filter((a) => Date.now() - a.timestamp < oneDay)
  }

  /**
   * Send email alert (mock implementation)
   */
  private sendEmailAlert(alert: PerformanceAlert): void {
    console.log(`📧 Email Alert: ${alert.message}`)
    // In production: integrate with email service
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: PerformanceAlert): Promise<void> {
    if (!this.config.slackWebhook) return

    try {
      const payload = {
        text: '⚠️ Performance Alert',
        attachments: [
          {
            color: alert.severity === 'error' ? 'danger' : 'warning',
            fields: [
              {
                title: 'Metric',
                value: alert.metric,
                short: true,
              },
              {
                title: 'Change',
                value: `${alert.percentChange > 0 ? '+' : ''}${alert.percentChange.toFixed(2)}%`,
                short: true,
              },
              {
                title: 'Current',
                value: `${alert.currentValue.toFixed(2)}`,
                short: true,
              },
              {
                title: 'Baseline',
                value: `${alert.baselineValue.toFixed(2)}`,
                short: true,
              },
              {
                title: 'Message',
                value: alert.message,
              },
            ],
            timestamp: alert.timestamp,
          },
        ],
      }

      // In production: actually post to Slack
      console.log(`💬 Slack Alert:`, payload)
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }

  /**
   * Generate CI/CD report
   */
  generateCICDReport(): {
    passed: boolean
    summary: string
    alerts: PerformanceAlert[]
    recommendations: string[]
  } {
    const activeAlerts = this.getActiveAlerts()
    const errors = activeAlerts.filter((a) => a.severity === 'error')
    const warnings = activeAlerts.filter((a) => a.severity === 'warning')

    const recommendations: string[] = []

    if (errors.length > 0) {
      recommendations.push(
        `🔴 ${errors.length} critical performance regression(s) detected - must be fixed before merge`
      )
    }

    if (warnings.length > 0) {
      recommendations.push(
        `⚠️ ${warnings.length} performance regression warning(s) - consider investigation`
      )
    }

    if (activeAlerts.length === 0) {
      recommendations.push('✅ All performance checks passed')
    }

    return {
      passed: errors.length === 0,
      summary: `${activeAlerts.length} active alert(s): ${errors.length} error(s), ${warnings.length} warning(s)`,
      alerts: activeAlerts,
      recommendations,
    }
  }

  /**
   * Save baseline for metric
   */
  saveBaseline(metric: string, value: number): void {
    const baselineFile = resolve(
      join(this.config.baselinesDir, `${metric}-baseline.json`)
    )
    writeFileSync(
      baselineFile,
      JSON.stringify(
        {
          metric,
          value,
          timestamp: Date.now(),
        },
        null,
        2
      )
    )
  }

  /**
   * Load baseline for metric
   */
  loadBaseline(metric: string): number | null {
    const baselineFile = resolve(
      join(this.config.baselinesDir, `${metric}-baseline.json`)
    )

    if (!existsSync(baselineFile)) {
      return null
    }

    try {
      const data = JSON.parse(readFileSync(baselineFile, 'utf-8'))
      return data.value
    } catch {
      return null
    }
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }
}

/**
 * CI/CD Integration Helper
 */
export class CICDPerformanceIntegration {
  private monitor: PerformanceMonitor

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor
  }

  /**
   * Run performance checks for CI/CD
   */
  async runCICDChecks(metrics: Record<string, number>): Promise<{
    passed: boolean
    report: string
    exitCode: number
  }> {
    for (const [metric, currentValue] of Object.entries(metrics)) {
      const baseline = this.monitor.loadBaseline(metric)

      if (baseline) {
        this.monitor.checkRegression(metric, currentValue, baseline)
      } else {
        // No baseline, save current as baseline
        this.monitor.saveBaseline(metric, currentValue)
      }
    }

    const report = this.monitor.generateCICDReport()

    return {
      passed: report.passed,
      report: this.formatReport(report),
      exitCode: report.passed ? 0 : 1,
    }
  }

  /**
   * Format report for CI/CD output
   */
  private formatReport(report: {
    passed: boolean
    summary: string
    alerts: PerformanceAlert[]
    recommendations: string[]
  }): string {
    let output = `\n${'='.repeat(60)}\n`
    output += '📊 PERFORMANCE CHECK RESULTS\n'
    output += `${'='.repeat(60)}\n\n`

    output += `Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n`
    output += `Summary: ${report.summary}\n\n`

    if (report.alerts.length > 0) {
      output += 'Alerts:\n'
      report.alerts.forEach((alert) => {
        output += `  ${alert.severity === 'error' ? '🔴' : '⚠️'} ${alert.metric}: ${alert.percentChange > 0 ? '+' : ''}${alert.percentChange.toFixed(2)}%\n`
      })
      output += '\n'
    }

    output += 'Recommendations:\n'
    report.recommendations.forEach((rec) => {
      output += `  ${rec}\n`
    })

    output += `\n${'='.repeat(60)}\n`

    return output
  }

  /**
   * Generate GitHub Actions output
   */
  generateGitHubActionsOutput(report: {
    passed: boolean
    summary: string
    alerts: PerformanceAlert[]
    recommendations: string[]
  }): string {
    let output = ''

    if (!report.passed) {
      output += '::error::Performance regression detected\n'
    }

    report.alerts.forEach((alert) => {
      const level = alert.severity === 'error' ? 'error' : 'warning'
      output += `::${level}::${alert.metric} changed by ${alert.percentChange > 0 ? '+' : ''}${alert.percentChange.toFixed(2)}%\n`
    })

    return output
  }
}

/**
 * Baseline Management
 */
export class BaselineManager {
  private baselineDir: string

  constructor(baselineDir: string = resolve(join(tmpdir(), 'baselines'))) {
    this.baselineDir = baselineDir
    // Ensure directory exists
    if (!existsSync(this.baselineDir)) {
      mkdirSync(this.baselineDir, { recursive: true })
    }
  }

  /**
   * Create baseline from current measurements
   */
  createBaseline(
    name: string,
    measurements: Record<string, number>,
    description?: string
  ): void {
    const baseline = {
      name,
      description,
      timestamp: Date.now(),
      measurements,
    }

    const filename = resolve(join(this.baselineDir, `${name}-baseline.json`))
    writeFileSync(filename, JSON.stringify(baseline, null, 2))
  }

  /**
   * Load baseline
   */
  loadBaseline(name: string): Record<string, number> | null {
    const filename = resolve(join(this.baselineDir, `${name}-baseline.json`))

    if (!existsSync(filename)) {
      return null
    }

    try {
      const data = JSON.parse(readFileSync(filename, 'utf-8'))
      return data.measurements
    } catch {
      return null
    }
  }

  /**
   * Compare against baseline
   */
  compareToBaseline(
    name: string,
    current: Record<string, number>
  ): Record<string, { baseline: number; current: number; change: number }> {
    const baseline = this.loadBaseline(name)

    if (!baseline) {
      throw new Error(`Baseline not found: ${name}`)
    }

    const comparison: Record<
      string,
      { baseline: number; current: number; change: number }
    > = {}

    for (const [metric, currentValue] of Object.entries(current)) {
      const baselineValue = baseline[metric]

      if (baselineValue) {
        const change = ((currentValue - baselineValue) / baselineValue) * 100
        comparison[metric] = {
          baseline: baselineValue,
          current: currentValue,
          change,
        }
      }
    }

    return comparison
  }
}
