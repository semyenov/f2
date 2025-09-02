/**
 * Performance Metrics Module
 * 
 * Collects, aggregates, and reports performance metrics for federation operations.
 * 
 * @module performance/metrics
 */

import * as Effect from 'effect/Effect'
import * as Metric from 'effect/Metric'
import * as Duration from 'effect/Duration'
import * as Option from 'effect/Option'
import * as Chunk from 'effect/Chunk'
import { pipe } from 'effect/Function'

/**
 * Metrics collector interface
 */
export interface MetricsCollector {
  recordExecutionTime: (operation: string, duration: number) => Effect.Effect<void, never>
  recordError: (operation: string, error: Error) => Effect.Effect<void, never>
  recordCacheHit: (cache: string) => Effect.Effect<void, never>
  recordCacheMiss: (cache: string) => Effect.Effect<void, never>
  recordSubgraphCall: (call: SubgraphCall) => Effect.Effect<void, never>
  getMetrics: () => Effect.Effect<PerformanceMetrics, never>
  reset: () => Effect.Effect<void, never>
  flush: () => Effect.Effect<void, never>
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDuration: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
  maxDuration: number
  minDuration: number
}

/**
 * Subgraph call information
 */
export interface SubgraphCall {
  service: string
  operation: string
  duration: number
  success: boolean
  errorType?: string
}

/**
 * Cache operation metrics
 */
export interface CacheOperation {
  type: 'get' | 'set' | 'invalidate' | 'clear'
  cache: string
  hit?: boolean
  duration: number
}

/**
 * Aggregated performance metrics
 */
export interface PerformanceMetrics {
  executionMetrics: ExecutionMetrics
  cacheMetrics: {
    totalOperations: number
    hits: number
    misses: number
    hitRate: number
  }
  subgraphMetrics: {
    totalCalls: number
    averageLatency: number
    errorRate: number
    serviceBreakdown: Record<string, {
      calls: number
      averageLatency: number
      errors: number
    }>
  }
  errorMetrics: {
    totalErrors: number
    errorsByType: Record<string, number>
    errorRate: number
  }
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  enabled?: boolean
  flushInterval?: Duration.Duration
  maxBufferSize?: number
  collectExecutionMetrics?: boolean
  collectCacheMetrics?: boolean
  collectSubgraphMetrics?: boolean
  collectErrorMetrics?: boolean
  percentiles?: ReadonlyArray<number>
}

/**
 * Create a metrics collector
 */
export const createMetricsCollector = (
  config: MetricsConfig = {}
): Effect.Effect<MetricsCollector, never, never> =>
  Effect.gen(function* () {
    const {
      enabled = true,
      maxBufferSize = 10000,
      collectExecutionMetrics = true,
      collectCacheMetrics = true,
      collectSubgraphMetrics = true,
      collectErrorMetrics = true,
      percentiles = [0.5, 0.95, 0.99],
    } = config

    // Metrics storage
    const executionTimes: number[] = []
    const errors: Array<{ operation: string; error: Error; timestamp: Date }> = []
    const cacheOperations: CacheOperation[] = []
    const subgraphCalls: SubgraphCall[] = []
    
    let totalExecutions = 0
    let successfulExecutions = 0
    let cacheHits = 0
    let cacheMisses = 0

    // Buffer management
    const trimBuffer = <T>(buffer: T[], maxSize: number): T[] => {
      if (buffer.length > maxSize) {
        return buffer.slice(-maxSize)
      }
      return buffer
    }

    // Calculate percentile
    const calculatePercentile = (values: number[], percentile: number): number => {
      if (values.length === 0) return 0
      
      const sorted = [...values].sort((a, b) => a - b)
      const index = Math.ceil(sorted.length * percentile) - 1
      return sorted[Math.max(0, index)] || 0
    }

    return {
      recordExecutionTime: (operation: string, duration: number) =>
        Effect.sync(() => {
          if (!enabled || !collectExecutionMetrics) return

          executionTimes.push(duration)
          totalExecutions++
          successfulExecutions++
          
          // Trim buffer if needed
          if (executionTimes.length > maxBufferSize) {
            executionTimes.shift()
          }
        }),

      recordError: (operation: string, error: Error) =>
        Effect.sync(() => {
          if (!enabled || !collectErrorMetrics) return

          errors.push({
            operation,
            error,
            timestamp: new Date(),
          })
          
          // Trim buffer
          if (errors.length > maxBufferSize) {
            errors.shift()
          }
        }),

      recordCacheHit: (cache: string) =>
        Effect.sync(() => {
          if (!enabled || !collectCacheMetrics) return
          
          cacheHits++
          cacheOperations.push({
            type: 'get',
            cache,
            hit: true,
            duration: 0,
          })
          
          // Trim buffer
          if (cacheOperations.length > maxBufferSize) {
            cacheOperations.shift()
          }
        }),

      recordCacheMiss: (cache: string) =>
        Effect.sync(() => {
          if (!enabled || !collectCacheMetrics) return
          
          cacheMisses++
          cacheOperations.push({
            type: 'get',
            cache,
            hit: false,
            duration: 0,
          })
          
          // Trim buffer
          if (cacheOperations.length > maxBufferSize) {
            cacheOperations.shift()
          }
        }),

      recordSubgraphCall: (call: SubgraphCall) =>
        Effect.sync(() => {
          if (!enabled || !collectSubgraphMetrics) return
          
          subgraphCalls.push(call)
          
          // Trim buffer
          if (subgraphCalls.length > maxBufferSize) {
            subgraphCalls.shift()
          }
        }),

      getMetrics: () =>
        Effect.sync(() => {
          // Calculate execution metrics
          const executionMetrics: ExecutionMetrics = {
            totalExecutions,
            successfulExecutions,
            failedExecutions: totalExecutions - successfulExecutions,
            averageDuration: executionTimes.length > 0
              ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
              : 0,
            p50Duration: calculatePercentile(executionTimes, 0.5),
            p95Duration: calculatePercentile(executionTimes, 0.95),
            p99Duration: calculatePercentile(executionTimes, 0.99),
            maxDuration: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
            minDuration: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
          }

          // Calculate cache metrics
          const cacheMetrics = {
            totalOperations: cacheHits + cacheMisses,
            hits: cacheHits,
            misses: cacheMisses,
            hitRate: (cacheHits + cacheMisses) > 0
              ? cacheHits / (cacheHits + cacheMisses)
              : 0,
          }

          // Calculate subgraph metrics
          const serviceBreakdown: Record<string, {
            calls: number
            averageLatency: number
            errors: number
          }> = {}

          subgraphCalls.forEach(call => {
            if (!serviceBreakdown[call.service]) {
              serviceBreakdown[call.service] = {
                calls: 0,
                averageLatency: 0,
                errors: 0,
              }
            }
            
            const service = serviceBreakdown[call.service]
            service.calls++
            service.averageLatency = 
              (service.averageLatency * (service.calls - 1) + call.duration) / service.calls
            
            if (!call.success) {
              service.errors++
            }
          })

          const totalSubgraphCalls = subgraphCalls.length
          const subgraphErrors = subgraphCalls.filter(c => !c.success).length
          
          const subgraphMetrics = {
            totalCalls: totalSubgraphCalls,
            averageLatency: totalSubgraphCalls > 0
              ? subgraphCalls.reduce((sum, c) => sum + c.duration, 0) / totalSubgraphCalls
              : 0,
            errorRate: totalSubgraphCalls > 0
              ? subgraphErrors / totalSubgraphCalls
              : 0,
            serviceBreakdown,
          }

          // Calculate error metrics
          const errorsByType: Record<string, number> = {}
          errors.forEach(({ error }) => {
            const type = error.constructor.name
            errorsByType[type] = (errorsByType[type] || 0) + 1
          })

          const errorMetrics = {
            totalErrors: errors.length,
            errorsByType,
            errorRate: totalExecutions > 0
              ? errors.length / totalExecutions
              : 0,
          }

          return {
            executionMetrics,
            cacheMetrics,
            subgraphMetrics,
            errorMetrics,
          }
        }),

      reset: () =>
        Effect.sync(() => {
          executionTimes.length = 0
          errors.length = 0
          cacheOperations.length = 0
          subgraphCalls.length = 0
          totalExecutions = 0
          successfulExecutions = 0
          cacheHits = 0
          cacheMisses = 0
        }),

      flush: () =>
        Effect.sync(() => {
          // In a real implementation, this would send metrics to a monitoring service
          console.log(`📊 Flushing ${executionTimes.length} metrics entries`)
          
          // Keep only recent data after flush
          const recentExecutions = executionTimes.slice(-100)
          const recentErrors = errors.slice(-100)
          const recentCacheOps = cacheOperations.slice(-100)
          const recentSubgraphCalls = subgraphCalls.slice(-100)
          
          executionTimes.length = 0
          executionTimes.push(...recentExecutions)
          
          errors.length = 0
          errors.push(...recentErrors)
          
          cacheOperations.length = 0
          cacheOperations.push(...recentCacheOps)
          
          subgraphCalls.length = 0
          subgraphCalls.push(...recentSubgraphCalls)
        }),
    }
  })

/**
 * Create a timer for measuring operation duration
 */
export const createTimer = () => {
  const start = Date.now()
  return {
    stop: () => Date.now() - start,
  }
}

/**
 * Measure an Effect's execution time
 */
export const measureEffect = <R, E, A>(
  effect: Effect.Effect<A, E, R>,
  operation: string,
  collector: MetricsCollector
): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    const timer = createTimer()
    
    try {
      const result = yield* effect
      const duration = timer.stop()
      yield* collector.recordExecutionTime(operation, duration)
      return result
    } catch (error) {
      const duration = timer.stop()
      yield* collector.recordError(operation, error as Error)
      throw error
    }
  })

/**
 * Create a metrics reporter that logs periodically
 */
export const createMetricsReporter = (
  collector: MetricsCollector,
  interval: Duration.Duration = Duration.seconds(60)
): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const report = () =>
      Effect.gen(function* () {
        const metrics = yield* collector.getMetrics()
        
        console.log('📊 Performance Metrics Report')
        console.log('============================')
        console.log(`Executions: ${metrics.executionMetrics.totalExecutions}`)
        console.log(`Average Duration: ${metrics.executionMetrics.averageDuration.toFixed(2)}ms`)
        console.log(`P95 Duration: ${metrics.executionMetrics.p95Duration.toFixed(2)}ms`)
        console.log(`Cache Hit Rate: ${(metrics.cacheMetrics.hitRate * 100).toFixed(2)}%`)
        console.log(`Error Rate: ${(metrics.errorMetrics.errorRate * 100).toFixed(2)}%`)
        console.log(`Subgraph Calls: ${metrics.subgraphMetrics.totalCalls}`)
        console.log(`Average Subgraph Latency: ${metrics.subgraphMetrics.averageLatency.toFixed(2)}ms`)
        
        yield* collector.flush()
      })

    // Schedule periodic reporting
    const intervalMs = Duration.toMillis(interval)
    setInterval(() => {
      Effect.runPromise(report()).catch(console.error)
    }, intervalMs)
  })