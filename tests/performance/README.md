# Profiling & Benchmarking Suite Documentation

## Overview

Comprehensive performance profiling and benchmarking suite for the orchestrateur framework, providing automated performance testing, regression detection, and continuous monitoring capabilities.

## Components

### 1. BenchmarkingEngine (`benchmarking-suite.ts`)

Core framework for measuring and analyzing performance metrics.

#### Features
- **Execution Time Measurement**: Precise timing with warmup runs
- **Memory Usage Tracking**: Peak and delta measurement
- **CPU Utilization Analysis**: User and system time tracking
- **Statistical Analysis**: Mean, median, std dev, percentiles (95th, 99th)
- **Regression Detection**: Automatic baseline comparison
- **Report Generation**: JSON, CSV, HTML formats

#### Usage

```typescript
import { BenchmarkingEngine, quickBenchmark } from './benchmarking-suite'

// Create engine
const engine = new BenchmarkingEngine({
  iterations: 10,
  warmupRuns: 2,
  timeout: 30000,
  regressionThreshold: 5, // %
})

// Measure execution time
const result = await engine.measureExecutionTime(
  'framework-install',
  async () => {
    // Your code here
  }
)

console.log(`Mean: ${result.stats.mean}ms`)
console.log(`P95: ${result.stats.percentile95}ms`)

// Quick benchmark
const quick = await quickBenchmark('test', () => { /* code */ }, 5)

// Detect regressions
engine.saveBaseline('framework-install')
const withRegression = engine.detectRegression(currentResult)
if (withRegression.regression?.detected) {
  console.warn('Performance regression detected!')
}

// Generate report
const report = engine.generateReport('html')
```

### 2. Key Metrics (`key-metrics.test.ts`)

Comprehensive test suite measuring critical performance indicators.

#### Metrics Tracked

**Installation Time**
- Framework installation performance
- Plugin loading time
- Installation time variation tracking

**Memory Usage**
- Peak memory consumption
- Memory during framework initialization
- Memory growth patterns
- Memory consistency across iterations

**CPU Utilization**
- CPU time for computations
- I/O vs CPU-bound work differentiation
- CPU time per operation

**I/O Operations**
- File system operation counting
- I/O latency measurement

#### Running Metrics Tests

```bash
# Run all metrics tests
npm test -- tests/performance/key-metrics.test.ts

# Run specific metric test
npm test -- tests/performance/key-metrics.test.ts -t "Installation Time"

# Run with coverage
npm test -- --coverage tests/performance/key-metrics.test.ts
```

### 3. Continuous Monitoring (`continuous-monitoring.ts`)

CI/CD integration with automated regression detection and alerting.

#### Features
- **Regression Detection**: Configurable thresholds
- **Alert Management**: Multiple severity levels
- **Trend Analysis**: Identifying performance trends
- **Baseline Management**: Save/load/compare baselines
- **CI/CD Reports**: GitHub Actions, Slack integration

#### Usage

```typescript
import { PerformanceMonitor, CICDPerformanceIntegration } from './continuous-monitoring'

// Monitor performance
const monitor = new PerformanceMonitor({
  alertThreshold: 5, // %
  trendWindow: 10,
  emailOnAlert: true,
  slackWebhook: 'https://hooks.slack.com/...',
})

// Check for regressions
const alert = monitor.checkRegression('install-time', 150, 100)
if (alert) {
  console.warn(`⚠️ ${alert.message}`)
}

// Analyze trends
const trend = monitor.analyzeTrend('performance', measurements)
console.log(`Trend: ${trend.trend} (${trend.trendPercentage.toFixed(2)}%)`)

// CI/CD Integration
const cicd = new CICDPerformanceIntegration(monitor)
const result = await cicd.runCICDChecks({
  'install-time': 95,
  'memory-usage': 48,
})

console.log(result.report)
process.exit(result.exitCode)
```

### 4. Benchmark Tools (`benchmark-tools.ts`)

Integration with professional benchmarking tools.

#### Supported Tools

**Hyperfine** - CLI benchmarking
```typescript
const hyperfine = new HyperfineWrapper()
const results = await hyperfine.benchmark({
  name: 'build',
  command: 'npm run build',
  runs: 10,
})

const comparison = await hyperfine.compare(
  'npm run build:old',
  'npm run build:new'
)
```

**Node Profiler** - Built-in profiling
```typescript
const profiler = new NodeProfiler()

// CPU profiling
const cpuProfile = await profiler.profileCPU('app.js')

// Memory profiling
const memProfile = await profiler.profileMemory('app.js')

// Heap snapshot
const heapSnapshot = await profiler.heapSnapshot()
```

**Clinic.js** - Comprehensive diagnostics
```typescript
const clinic = new ClinicjsWrapper()

// Doctor diagnosis
const doctor = await clinic.runDoctor('app.js')

// Flame graphs
const flame = await clinic.runFlame('app.js')

// Timeline analysis
const bubble = await clinic.runBubbleprof('app.js')
```

**Composite Benchmark**
```typescript
const benchmark = new CompositeBenchmark()
const diagnostic = await benchmark.fullDiagnostic('app.js')
const summary = benchmark.generateSummary(diagnostic)
console.log(summary)
```

## Configuration

### BenchmarkingEngine

```typescript
interface BenchmarkConfig {
  iterations: number           // Default: 10
  warmupRuns: number          // Default: 2
  timeout: number             // Default: 30000ms
  memoryThreshold: number     // Default: 512MB
  regressionThreshold: number // Default: 5%
  dataDir: string             // Results directory
  resultFormat: 'json'|'csv'|'html' // Default: 'json'
}
```

### PerformanceMonitor

```typescript
interface ContinuousMonitoringConfig {
  alertsDir: string           // Alert storage
  trendsDir: string           // Trend data
  baselinesDir: string        // Baseline storage
  alertThreshold: number      // Default: 5%
  trendWindow: number         // Default: 10 measurements
  emailOnAlert: boolean       // Default: false
  slackWebhook?: string       // Optional Slack integration
  jiraProject?: string        // Optional Jira integration
}
```

## Example Reports

### HTML Report
Generates interactive HTML report with all metrics visualized.

```html
Performance Benchmark Report
- Framework Install: 95.3ms ± 2.1ms
- Plugin Load: 12.5ms ± 0.8ms
- Memory Peak: 124.5MB
```

### CSV Report
```csv
Name,Mean(ms),Median(ms),StdDev,Min,Max,P95,P99
install-time,95.3,95.1,2.1,93.2,101.5,99.2,100.8
memory-peak,124.5,124.3,3.2,118.0,132.1,129.8,131.5
```

### JSON Report
```json
{
  "name": "install-time",
  "stats": {
    "mean": 95.3,
    "median": 95.1,
    "stdDev": 2.1,
    "min": 93.2,
    "max": 101.5,
    "percentile95": 99.2,
    "percentile99": 100.8
  },
  "regression": {
    "detected": false,
    "percentChange": -2.1,
    "threshold": 5
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Performance Tests
  run: npm test -- tests/performance/

- name: Check Regressions
  run: node scripts/check-performance.js
```

### Slack Notifications

```typescript
const monitor = new PerformanceMonitor({
  slackWebhook: process.env.SLACK_WEBHOOK,
})

// Alerts automatically sent to Slack on regressions
```

## Best Practices

### 1. Baseline Management
```typescript
// Set baseline after optimization
engine.saveBaseline('install-time')

// Compare against baseline
const withRegression = engine.detectRegression(currentResult)
```

### 2. Statistical Significance
- Use at least 10 iterations for reliable results
- Consider percentile 95th for safety margins
- Watch for high standard deviation (>10% of mean)

### 3. Trend Analysis
- Monitor 10+ measurements for trend analysis
- Set alert threshold appropriately (5-10% typical)
- Review trends regularly for patterns

### 4. Report Distribution
```typescript
// Generate and distribute reports
const report = engine.generateReport('html')
fs.writeFileSync('perf-report.html', report)

// Share in CI/CD
console.log(cicdReport.report)
```

## Troubleshooting

### High Variance in Measurements
- Increase warmup runs
- Close unnecessary applications
- Increase iteration count
- Check for background processes

### False Positive Regressions
- Increase regression threshold
- Review baseline validity
- Check for environmental factors
- Use trend analysis for context

### Tool Integration Issues

**Hyperfine not found**
```bash
# Install hyperfine
brew install hyperfine  # macOS
apt-get install hyperfine  # Linux
choco install hyperfine  # Windows
```

**Clinic.js not found**
```bash
npm install -g clinic
```

## Performance Targets

### Framework Operations
| Operation | Target | P95 Target |
|-----------|--------|-----------|
| Framework Install | <100ms | <110ms |
| Plugin Load | <20ms | <25ms |
| Config Validation | <10ms | <12ms |
| Memory Usage | <150MB | - |

### Regression Thresholds
| Metric | Threshold | Action |
|--------|-----------|--------|
| Minor (1-5%) | Warning | Monitor |
| Moderate (5-20%) | Error | Investigate |
| Severe (>20%) | Critical | Block merge |

## Files Structure

```
tests/performance/
├── benchmarking-suite.ts          # Core framework
├── benchmarking-suite.test.ts     # Framework tests
├── key-metrics.test.ts             # Metrics tests
├── continuous-monitoring.ts        # Monitoring system
├── continuous-monitoring.test.ts  # Monitoring tests
├── benchmark-tools.ts              # Tool wrappers
├── benchmark-tools.test.ts        # Tool tests
└── README.md                       # This file
```

## Contributing

When adding new performance tests:

1. Use `BenchmarkingEngine` for consistent measurement
2. Include warmup runs and multiple iterations
3. Document expected performance targets
4. Add to continuous monitoring if critical
5. Update this documentation

## References

- [Vitest Documentation](https://vitest.dev/)
- [Hyperfine](https://github.com/sharkdp/hyperfine)
- [Clinic.js](https://clinicjs.org/)
- [Node.js Profiling](https://nodejs.org/en/docs/guides/simple-profiling/)
