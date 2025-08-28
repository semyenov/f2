/**
 * # Performance Profiler
 * 
 * Advanced performance profiling and monitoring for federation services,
 * with real-time metrics, bottleneck detection, and optimization recommendations.
 * 
 * @example Basic profiling
 * ```typescript
 * import { Profiler } from '@cqrs/federation/devtools'
 * 
 * const profiler = new Profiler()
 * 
 * // Profile a query execution
 * const span = profiler.startSpan('query.execution')
 * const result = await executeQuery(query)
 * span.end()
 * 
 * // Get performance report
 * const report = profiler.generateReport()
 * console.log(report.summary)
 * ```
 * 
 * @module DevTools
 * @since 2.1.0
 */

import * as Duration from 'effect/Duration'
// import * as Metric from 'effect/Metric'
// import * as MetricBoundaries from 'effect/MetricBoundaries'

/**
 * Performance span
 */
export interface PerformanceSpan {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
  children: PerformanceSpan[]
  tags?: string[]
  status?: 'success' | 'error' | 'cancelled'
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  requestCount: number
  errorCount: number
  averageLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  maxLatency: number
  minLatency: number
  throughput: number
  errorRate: number
  activeRequests: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
}

/**
 * Performance bottleneck
 */
export interface Bottleneck {
  type: 'query' | 'resolver' | 'dataloader' | 'network' | 'database'
  location: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  averageTime: number
  callCount: number
  recommendation: string
}

/**
 * Performance report
 */
export interface PerformanceReport {
  summary: {
    totalRequests: number
    averageLatency: number
    errorRate: number
    throughput: number
    uptime: number
  }
  metrics: PerformanceMetrics
  bottlenecks: Bottleneck[]
  recommendations: string[]
  traces: PerformanceSpan[]
}

/**
 * Profiler configuration
 */
export interface ProfilerConfig {
  /**
   * Enable tracing
   */
  enableTracing?: boolean
  
  /**
   * Sample rate (0-1)
   */
  sampleRate?: number
  
  /**
   * Max spans to keep
   */
  maxSpans?: number
  
  /**
   * Metrics interval
   */
  metricsInterval?: Duration.Duration
  
  /**
   * Enable auto-profiling
   */
  autoProfiling?: boolean
  
  /**
   * Thresholds for alerts
   */
  thresholds?: {
    maxLatency?: number
    errorRate?: number
    memoryUsage?: number
  }
}

/**
 * Main Profiler class
 */
export class Profiler {
  private readonly spans: Map<string, PerformanceSpan> = new Map()
  private metrics: PerformanceMetrics
  private startTime: number = Date.now()
  private requestLatencies: number[] = []
  private readonly activeSpans = new Set<string>()
  
  // Effect metrics (kept for future use)
  // private readonly requestCounter = Metric.counter('requests', {
  //   description: 'Total number of requests',
  // })
  
  // private readonly errorCounter = Metric.counter('errors', {
  //   description: 'Total number of errors',
  // })
  
  // private readonly latencyHistogram = Metric.histogram(
  //   'latency',
  //   MetricBoundaries.linear({ start: 0, width: 10, count: 10 })
  // )
  
  constructor(private readonly config: ProfilerConfig = {}) {
    this.config = {
      enableTracing: true,
      sampleRate: 1.0,
      maxSpans: 1000,
      metricsInterval: Duration.seconds(60),
      autoProfiling: false,
      ...config,
    }
    
    this.metrics = this.initializeMetrics()
    
    if (this.config.autoProfiling) {
      this.startAutoProfiling()
    }
  }
  
  /**
   * Start a new performance span
   */
  startSpan(name: string, metadata?: Record<string, unknown>): PerformanceSpan & { end: (status?: 'success' | 'error' | 'cancelled') => void } {
    const span: PerformanceSpan = {
      id: this.generateSpanId(),
      name,
      startTime: performance.now(),
      ...(metadata && { metadata }),
      children: [],
      tags: [],
      status: 'success',
    }
    
    this.spans.set(span.id, span)
    this.activeSpans.add(span.id)
    
    // Return span with end method
    return {
      ...span,
      end: (status?: 'success' | 'error' | 'cancelled') => this.endSpan(span.id, status),
    }
  }
  
  /**
   * End a performance span
   */
  endSpan(spanId: string, status: 'success' | 'error' | 'cancelled' = 'success'): void {
    const span = this.spans.get(spanId)
    if (!span || span.endTime) return
    
    span.endTime = performance.now()
    span.duration = span.endTime - span.startTime
    span.status = status
    
    this.activeSpans.delete(spanId)
    this.requestLatencies.push(span.duration)
    
    // Update metrics
    this.metrics.requestCount++
    if (status === 'error') {
      this.metrics.errorCount++
    }
    
    // Clean up old spans if needed
    if (this.spans.size > (this.config.maxSpans ?? 1000)) {
      const oldestSpans = Array.from(this.spans.entries())
        .sort((a, b) => a[1].startTime - b[1].startTime)
        .slice(0, 100)
      
      oldestSpans.forEach(([id]) => this.spans.delete(id))
    }
  }
  
  /**
   * Create a child span
   */
  createChildSpan(parentId: string, name: string): PerformanceSpan & { end: () => void } {
    const parent = this.spans.get(parentId)
    if (!parent) {
      return this.startSpan(name)
    }
    
    const childSpan = this.startSpan(name)
    parent.children.push(childSpan)
    
    return childSpan
  }
  
  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number): void {
    // Store custom metrics
    this.customMetrics ??= new Map();
    
    if (!this.customMetrics.has(name)) {
      this.customMetrics.set(name, [])
    }
    
    this.customMetrics.get(name)!.push(value)
  }
  
  private customMetrics?: Map<string, number[]>
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }
  
  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    this.updateMetrics()
    
    const uptime = (Date.now() - this.startTime) / 1000
    const throughput = this.metrics.requestCount / uptime
    
    const bottlenecks = this.detectBottlenecks()
    const recommendations = this.generateRecommendations(bottlenecks)
    
    return {
      summary: {
        totalRequests: this.metrics.requestCount,
        averageLatency: this.metrics.averageLatency,
        errorRate: this.metrics.errorRate,
        throughput,
        uptime,
      },
      metrics: this.metrics,
      bottlenecks,
      recommendations,
      traces: Array.from(this.spans.values()).slice(-100), // Last 100 traces
    }
  }
  
  /**
   * Detect performance bottlenecks
   */
  detectBottlenecks(): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []
    
    // Analyze spans by name
    const spanStats = new Map<string, { total: number; count: number; max: number }>()
    
    this.spans.forEach(span => {
      if (!span.duration) return
      
      const stats = spanStats.get(span.name) || { total: 0, count: 0, max: 0 }
      stats.total += span.duration
      stats.count++
      stats.max = Math.max(stats.max, span.duration)
      spanStats.set(span.name, stats)
    })
    
    // Identify bottlenecks
    spanStats.forEach((stats, name) => {
      const avgTime = stats.total / stats.count
      
      // Determine bottleneck type
      let type: Bottleneck['type'] = 'query'
      if (name.includes('resolver')) type = 'resolver'
      else if (name.includes('dataloader')) type = 'dataloader'
      else if (name.includes('network')) type = 'network'
      else if (name.includes('database')) type = 'database'
      
      // Determine impact
      let impact: Bottleneck['impact'] = 'low'
      if (avgTime > 1000) impact = 'critical'
      else if (avgTime > 500) impact = 'high'
      else if (avgTime > 200) impact = 'medium'
      
      if (impact !== 'low' || stats.count > 100) {
        bottlenecks.push({
          type,
          location: name,
          impact,
          averageTime: avgTime,
          callCount: stats.count,
          recommendation: this.getBottleneckRecommendation(type, avgTime),
        })
      }
    })
    
    return bottlenecks.sort((a, b) => {
      const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return impactOrder[a.impact] - impactOrder[b.impact]
    })
  }
  
  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(bottlenecks: Bottleneck[]): string[] {
    const recommendations: string[] = []
    
    // High error rate
    if (this.metrics.errorRate > 0.05) {
      recommendations.push('High error rate detected. Review error logs and add retry logic.')
    }
    
    // High latency
    if (this.metrics.p95Latency > 1000) {
      recommendations.push('P95 latency exceeds 1 second. Consider implementing caching.')
    }
    
    // Memory usage
    const memUsage = this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal
    if (memUsage > 0.9) {
      recommendations.push('High memory usage detected. Review for memory leaks.')
    }
    
    // Bottleneck-specific recommendations
    const criticalBottlenecks = bottlenecks.filter(b => b.impact === 'critical')
    if (criticalBottlenecks.length > 0) {
      recommendations.push(
        `Critical bottleneck in ${criticalBottlenecks[0]?.location || 'unknown'}. ` +
        (criticalBottlenecks[0]?.recommendation || '')
      )
    }
    
    // DataLoader optimization
    const dataloaderBottlenecks = bottlenecks.filter(b => b.type === 'dataloader')
    if (dataloaderBottlenecks.length > 2) {
      recommendations.push('Multiple DataLoader bottlenecks. Consider batch size optimization.')
    }
    
    // Query complexity
    const complexQueries = bottlenecks.filter(b => b.type === 'query' && b.averageTime > 500)
    if (complexQueries.length > 0) {
      recommendations.push('Complex queries detected. Implement query complexity limits.')
    }
    
    return recommendations
  }
  
  /**
   * Get bottleneck-specific recommendation
   */
  private getBottleneckRecommendation(type: Bottleneck['type'], avgTime: number): string {
    switch (type) {
      case 'query':
        return avgTime > 1000
          ? 'Implement query result caching and consider pagination'
          : 'Review query complexity and add field-level caching'
      
      case 'resolver':
        return 'Optimize resolver logic and consider parallel execution'
      
      case 'dataloader':
        return 'Adjust batch size and implement caching strategy'
      
      case 'network':
        return 'Reduce payload size and implement response compression'
      
      case 'database':
        return 'Add database indexes and optimize queries'
      
      default:
        return 'Review implementation for optimization opportunities'
    }
  }
  
  /**
   * Initialize metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      requestCount: 0,
      errorCount: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: 0,
      throughput: 0,
      errorRate: 0,
      activeRequests: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    }
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(): void {
    if (this.requestLatencies.length === 0) return
    
    const sorted = [...this.requestLatencies].sort((a, b) => a - b)
    
    this.metrics.averageLatency = 
      sorted.reduce((a, b) => a + b, 0) / sorted.length
    
    this.metrics.p50Latency = sorted[Math.floor(sorted.length * 0.5)] ?? 0
    this.metrics.p95Latency = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    this.metrics.p99Latency = sorted[Math.floor(sorted.length * 0.99)] ?? 0
    this.metrics.maxLatency = sorted[sorted.length - 1] ?? 0
    this.metrics.minLatency = sorted[0] ?? 0
    
    this.metrics.errorRate = 
      this.metrics.requestCount > 0
        ? this.metrics.errorCount / this.metrics.requestCount
        : 0
    
    this.metrics.activeRequests = this.activeSpans.size
    this.metrics.memoryUsage = process.memoryUsage()
    this.metrics.cpuUsage = process.cpuUsage()
  }
  
  /**
   * Start auto-profiling
   */
  private startAutoProfiling(): void {
    // Collect metrics periodically
    setInterval(() => {
      this.updateMetrics()
      
      // Check thresholds
      if (this.config.thresholds) {
        if (this.config.thresholds.maxLatency && 
            this.metrics.maxLatency > this.config.thresholds.maxLatency) {
          console.warn(`⚠️ Latency threshold exceeded: ${this.metrics.maxLatency}ms`)
        }
        
        if (this.config.thresholds.errorRate && 
            this.metrics.errorRate > this.config.thresholds.errorRate) {
          console.warn(`⚠️ Error rate threshold exceeded: ${(this.metrics.errorRate * 100).toFixed(2)}%`)
        }
        
        if (this.config.thresholds.memoryUsage) {
          const memUsageMB = this.metrics.memoryUsage.heapUsed / 1024 / 1024
          if (memUsageMB > this.config.thresholds.memoryUsage) {
            console.warn(`⚠️ Memory usage threshold exceeded: ${memUsageMB.toFixed(2)}MB`)
          }
        }
      }
    }, 10000) // Every 10 seconds
  }
  
  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
  
  /**
   * Export traces in OpenTelemetry format
   */
  exportTraces(): any[] {
    return Array.from(this.spans.values()).map(span => ({
      traceId: span.id,
      spanId: span.id,
      operationName: span.name,
      startTime: span.startTime,
      duration: span.duration,
      tags: span.tags,
      logs: [],
      process: {
        serviceName: 'federation',
        tags: span.metadata,
      },
    }))
  }
  
  /**
   * Clear all data
   */
  reset(): void {
    this.spans.clear()
    this.requestLatencies = []
    this.activeSpans.clear()
    this.metrics = this.initializeMetrics()
    this.startTime = Date.now()
  }
}

/**
 * Profiler middleware for federation
 */
export const ProfilerMiddleware = {
  /**
   * Create Express middleware
   */
  express: (profiler: Profiler) => {
    return (req: any, res: any, next: any) => {
      const span = profiler.startSpan(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        headers: req.headers,
      })
      
      // Track response
      const originalEnd = res.end
      res.end = function(...args: any[]) {
        span.end((res.statusCode || 200) >= 400 ? 'error' : 'success')
        originalEnd.apply(res, args)
      }
      
      next()
    }
  },
  
  /**
   * Create GraphQL plugin
   */
  graphql: (profiler: Profiler) => ({
    requestDidStart() {
      const requestSpan = profiler.startSpan('graphql.request')
      
      return {
        willSendResponse() {
          requestSpan.end('success')
        },
        
        didResolveOperation(context: any) {
          profiler.createChildSpan(requestSpan.id, `graphql.operation.${context.operationName}`)
        },
        
        executionDidStart() {
          return {
            willResolveField({ info }: any) {
              const fieldSpan = profiler.startSpan(`resolver.${info.parentType.name}.${info.fieldName}`)
              
              return () => {
                fieldSpan.end('success')
              }
            },
          }
        },
        
        didEncounterErrors() {
          requestSpan.end('error')
        },
      }
    },
  }),
}

/**
 * Performance monitoring presets
 */
export const ProfilerPresets = {
  /**
   * Development preset with detailed tracing
   */
  development: (): ProfilerConfig => ({
    enableTracing: true,
    sampleRate: 1.0,
    maxSpans: 10000,
    autoProfiling: true,
    thresholds: {
      maxLatency: 2000,
      errorRate: 0.1,
      memoryUsage: 500,
    },
  }),
  
  /**
   * Production preset with sampling
   */
  production: (): ProfilerConfig => ({
    enableTracing: true,
    sampleRate: 0.1,
    maxSpans: 1000,
    autoProfiling: true,
    thresholds: {
      maxLatency: 1000,
      errorRate: 0.05,
      memoryUsage: 1000,
    },
  }),
  
  /**
   * Minimal preset for testing
   */
  testing: (): ProfilerConfig => ({
    enableTracing: false,
    sampleRate: 0,
    maxSpans: 100,
    autoProfiling: false,
  }),
}