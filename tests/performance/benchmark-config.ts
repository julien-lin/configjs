/**
 * Benchmark Tools Configuration
 * Default settings for hyperfine, node profiler, and clinic.js
 */

export const HYPERFINE_CONFIG = {
  defaultRuns: 10,
  defaultWarmup: 2,
  minBenchmarkingTime: 5, // seconds
  maxBenchmarkingTime: 60, // seconds
  showOutput: false,
  style: 'colorful',
}

export const NODE_PROFILER_CONFIG = {
  gcInterval: 1000, // Force GC every N ms
  heapSizeLimit: 2048, // MB
  trackAllocations: true,
  captureMemory: true,
  outputDir: '/tmp/node-profiles',
}

export const CLINIC_CONFIG = {
  doctor: {
    collectDelay: 0,
    sampleInterval: 10,
    maxSamples: 1000,
  },
  flame: {
    collectDelay: 0,
    sampleInterval: 10,
  },
  bubbleprof: {
    // Bubbleprof specific config
  },
}

export const PERFORMANCE_TARGETS = {
  // Installation & Loading
  'framework-install': {
    mean: 100,
    p95: 110,
    p99: 120,
    maxRegressionPercent: 10,
  },
  'plugin-load': {
    mean: 20,
    p95: 25,
    p99: 30,
    maxRegressionPercent: 15,
  },
  'config-validation': {
    mean: 10,
    p95: 12,
    p99: 15,
    maxRegressionPercent: 10,
  },

  // Memory
  'memory-peak': {
    mean: 150,
    p95: 180,
    p99: 200,
    maxRegressionPercent: 20,
  },
  'memory-baseline': {
    mean: 50,
    p95: 60,
    p99: 70,
    maxRegressionPercent: 25,
  },

  // CPU
  'cpu-utilization': {
    mean: 50,
    p95: 60,
    p99: 70,
    maxRegressionPercent: 15,
  },

  // I/O
  'io-operations': {
    mean: 30,
    p95: 40,
    p99: 50,
    maxRegressionPercent: 20,
  },
}

export const ALERT_CONFIG = {
  thresholds: {
    warning: 5, // percent
    error: 15, // percent
    critical: 30, // percent
  },
  channels: {
    email: true,
    slack: true,
    github: true,
    jira: false,
  },
  notification: {
    onWarning: true,
    onError: true,
    onCritical: true,
  },
}

export const TREND_CONFIG = {
  window: 10, // measurements for trend analysis
  changeThreshold: 2, // percent to consider trend
  measurementRetention: 100, // keep last N measurements
}

export const REPORT_CONFIG = {
  formats: ['json', 'csv', 'html'],
  defaultFormat: 'html',
  includeHistoricalData: true,
  includeTrends: true,
  includeRecommendations: true,
  uploadToCloud: false,
}

export const CI_CD_CONFIG = {
  platforms: {
    github: true,
    gitlab: false,
    jenkins: false,
    azure: false,
  },
  integrations: {
    failOnRegression: true,
    autoComment: true,
    autoCommitBaseline: true,
    blockOnCritical: true,
  },
  slack: {
    channel: '#performance',
    mentionOnCritical: true,
    threadReplies: true,
  },
}

export const PROFILING_CONFIG = {
  enableCPUProfiling: true,
  enableMemoryProfiling: true,
  enableHeapSnapshots: true,
  enableFlameGraphs: true,
  enableTimelines: true,

  // Sampling
  cpuSampleInterval: 1, // every N ms
  memorySampleInterval: 100, // every N ms

  // Output
  outputFormats: ['json', 'html', 'flamegraph'],
  retentionDays: 30,
}

export default {
  hyperfine: HYPERFINE_CONFIG,
  profiler: NODE_PROFILER_CONFIG,
  clinic: CLINIC_CONFIG,
  targets: PERFORMANCE_TARGETS,
  alerts: ALERT_CONFIG,
  trends: TREND_CONFIG,
  reports: REPORT_CONFIG,
  cicd: CI_CD_CONFIG,
  profiling: PROFILING_CONFIG,
}
