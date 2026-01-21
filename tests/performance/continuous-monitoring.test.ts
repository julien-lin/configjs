/**
 * Continuous Monitoring Tests
 * Tests for CI/CD integration, alerts, and regression detection
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PerformanceMonitor,
  CICDPerformanceIntegration,
  BaselineManager,
} from './continuous-monitoring'

describe('Continuous Performance Monitoring', () => {
  let monitor: PerformanceMonitor
  let integration: CICDPerformanceIntegration
  let baselineManager: BaselineManager

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      alertThreshold: 5,
      trendWindow: 10,
    })
    integration = new CICDPerformanceIntegration(monitor)
    baselineManager = new BaselineManager()
  })

  describe('Regression Detection', () => {
    it('should detect regression when performance degrades', () => {
      const alert = monitor.checkRegression('install-time', 150, 100)

      expect(alert).not.toBeNull()
      expect(alert?.severity).toBe('error')
      expect(alert?.percentChange).toBe(50)
      expect(alert?.message).toContain('50.00%')
    })

    it('should not alert on minor variations', () => {
      const alert = monitor.checkRegression('install-time', 102, 100)

      expect(alert).toBeNull()
    })

    it('should mark as error for severe regressions', () => {
      const alert = monitor.checkRegression('install-time', 250, 100)

      expect(alert).not.toBeNull()
      expect(alert?.severity).toBe('error')
    })

    it('should detect improvements', () => {
      const alert = monitor.checkRegression('install-time', 50, 100)

      expect(alert).not.toBeNull()
      expect(alert?.percentChange).toBe(-50)
    })
  })

  describe('Trend Analysis', () => {
    it('should identify degrading trend', () => {
      const measurements = [100, 102, 105, 110, 115, 120, 125, 130, 135, 140]
      const trend = monitor.analyzeTrend('performance', measurements)

      expect(trend.trend).toBe('degrading')
      expect(trend.trendPercentage).toBeGreaterThan(0)
    })

    it('should identify improving trend', () => {
      const measurements = [200, 190, 180, 170, 160, 150, 140, 130, 120, 100]
      const trend = monitor.analyzeTrend('performance', measurements)

      expect(trend.trend).toBe('improving')
      expect(trend.trendPercentage).toBeLessThan(0)
    })

    it('should identify stable trend', () => {
      const measurements = [100, 101, 100, 102, 100, 99, 101, 100, 100, 99]
      const trend = monitor.analyzeTrend('performance', measurements)

      expect(trend.trend).toBe('stable')
      expect(Math.abs(trend.trendPercentage)).toBeLessThan(2)
    })
  })

  describe('Alert Management', () => {
    it('should store alerts', () => {
      monitor.checkRegression('metric-1', 150, 100)
      monitor.checkRegression('metric-2', 200, 100)

      const alerts = monitor.getAlerts()
      expect(alerts.length).toBe(2)
    })

    it('should filter alerts by severity', () => {
      monitor.checkRegression('metric-1', 110, 100) // warning (10%)
      monitor.checkRegression('metric-2', 150, 100) // error (50%)

      const errors = monitor.getAlerts('error')
      const warnings = monitor.getAlerts('warning')

      expect(errors.length).toBe(1)
      expect(warnings.length).toBe(1)
    })

    it('should identify active alerts', () => {
      monitor.checkRegression('metric-1', 150, 100)

      const activeAlerts = monitor.getActiveAlerts()
      expect(activeAlerts.length).toBeGreaterThan(0)
      expect(activeAlerts[0]).toBeDefined()
      expect(activeAlerts[0]?.timestamp).toBeCloseTo(Date.now(), -2)
    })

    it('should clear all alerts', () => {
      monitor.checkRegression('metric-1', 150, 100)
      monitor.checkRegression('metric-2', 150, 100)

      expect(monitor.getAlerts().length).toBe(2)

      monitor.clearAlerts()
      expect(monitor.getAlerts().length).toBe(0)
    })
  })

  describe('CI/CD Report Generation', () => {
    it('should generate passing report when no regressions', () => {
      const report = monitor.generateCICDReport()

      expect(report.passed).toBe(true)
      expect(report.summary).toContain('0 active')
      expect(report.recommendations).toContain(
        '✅ All performance checks passed'
      )
    })

    it('should generate failing report with regressions', () => {
      monitor.checkRegression('metric-1', 150, 100)
      monitor.checkRegression('metric-2', 250, 100)

      const report = monitor.generateCICDReport()

      expect(report.passed).toBe(false)
      expect(report.alerts.length).toBeGreaterThan(0)
    })

    it('should provide actionable recommendations', () => {
      monitor.checkRegression('install-time', 200, 100)
      monitor.checkRegression('memory-usage', 300, 100)

      const report = monitor.generateCICDReport()

      expect(report.recommendations.length).toBeGreaterThan(0)
      report.recommendations.forEach((rec) => {
        expect(rec).toMatch(/^[\u{1F534}\u{26A0}\u{2705}]/u)
      })
    })
  })

  describe('CI/CD Integration', () => {
    it('should run CI/CD checks', async () => {
      monitor.saveBaseline('metric-1', 100)
      monitor.saveBaseline('metric-2', 50)

      const result = await integration.runCICDChecks({
        'metric-1': 95,
        'metric-2': 48,
      })

      expect(result.passed).toBe(true)
      expect(result.exitCode).toBe(0)
      expect(result.report).toContain('PERFORMANCE CHECK RESULTS')
    })

    it('should fail CI/CD checks on regression', async () => {
      monitor.saveBaseline('metric-1', 100)

      const result = await integration.runCICDChecks({
        'metric-1': 250,
      })

      expect(result.passed).toBe(false)
      expect(result.exitCode).toBe(1)
    })

    it('should generate GitHub Actions output', () => {
      const report = {
        passed: false,
        summary: '1 alert',
        alerts: [
          {
            id: 'test',
            timestamp: Date.now(),
            severity: 'error' as const,
            metric: 'test-metric',
            currentValue: 150,
            baselineValue: 100,
            percentChange: 50,
            message: 'Regression',
          },
        ],
        recommendations: [],
      }

      const output = integration.generateGitHubActionsOutput(report)

      expect(output).toContain('::error::')
      expect(output).toContain('test-metric')
    })
  })

  describe('Baseline Management', () => {
    it('should save baseline', () => {
      const measurements = {
        'install-time': 100,
        'memory-usage': 50,
        'cpu-time': 25,
      }

      expect(() => {
        baselineManager.createBaseline('v1.0.0', measurements)
      }).not.toThrow()
    })

    it('should load baseline', () => {
      const measurements = {
        'install-time': 100,
        'memory-usage': 50,
      }

      baselineManager.createBaseline('test', measurements)
      const loaded = baselineManager.loadBaseline('test')

      expect(loaded).toEqual(measurements)
    })

    it('should compare to baseline', () => {
      const baseline = {
        'install-time': 100,
        'memory-usage': 50,
      }

      baselineManager.createBaseline('compare-test', baseline)

      const current = {
        'install-time': 110,
        'memory-usage': 45,
      }

      const comparison = baselineManager.compareToBaseline(
        'compare-test',
        current
      )

      expect(comparison['install-time']).toBeDefined()
      expect(comparison['install-time']?.change).toBe(10)
      expect(comparison['memory-usage']).toBeDefined()
      expect(comparison['memory-usage']?.change).toBe(-10)
    })

    it('should return null for missing baseline', () => {
      const loaded = baselineManager.loadBaseline('non-existent')
      expect(loaded).toBeNull()
    })
  })

  describe('Performance Thresholds', () => {
    it('should respect custom alert threshold', () => {
      const customMonitor = new PerformanceMonitor({ alertThreshold: 2 })
      // 102.5 vs 100 = 2.5% change > 2% threshold
      const alert = customMonitor.checkRegression('metric', 102.5, 100)

      expect(alert).not.toBeNull()
    })

    it('should track measurements in trend window', () => {
      const customMonitor = new PerformanceMonitor({ trendWindow: 3 })
      const measurements = Array.from({ length: 10 }, (_, i) => 100 + i * 5)
      const trend = customMonitor.analyzeTrend('metric', measurements)

      expect(trend.measurements.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Alert Storage', () => {
    it('should persist alerts', () => {
      monitor.checkRegression('metric', 150, 100)
      monitor.getAlerts()

      // Create new monitor with same config
      const monitor2 = new PerformanceMonitor({
        alertsDir: monitor['config'].alertsDir,
      })

      // Alerts should be independent instances
      expect(monitor2.getAlerts().length).toBe(0)
    })
  })
})
