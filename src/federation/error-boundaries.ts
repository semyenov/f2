import { Effect, pipe, Duration } from "effect"
import type { GraphQLResolveInfo } from "graphql"
import type {
  ErrorBoundaryConfig,
  CircuitBreakerConfig,
  PartialFailureConfig,
  ErrorTransformationConfig,
  CircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerMetrics,
  FederationError,
  CircuitBreakerError,
} from "../core/types.js"
import { CompositionError } from "../core/errors.js"
import { ErrorFactory } from "../core/errors.js"

/**
 * GraphQL resolver function type
 */
type GraphQLResolver = (parent: unknown, args: unknown, context: unknown, info: GraphQLResolveInfo) => Promise<unknown>

/**
 * Bounded resolver with error handling
 */
type BoundedResolver = GraphQLResolver

/**
 * Error boundary instance
 */
export interface ErrorBoundary {
  readonly wrapResolver: (subgraphId: string, resolver: GraphQLResolver) => BoundedResolver
  readonly handlePartialFailure: (results: SubgraphResults) => Effect.Effect<ProcessedResults, FederationError>
  readonly transformError: (error: FederationError, context: ErrorContext) => TransformedError
}

/**
 * Subgraph execution results
 */
interface SubgraphResults {
  readonly [subgraphId: string]: SubgraphResult
}

interface SubgraphResult {
  readonly subgraphId: string
  readonly success: boolean
  readonly data?: unknown
  readonly error?: unknown
}

/**
 * Processed results after partial failure handling
 */
interface ProcessedResults {
  readonly data: unknown
  readonly errors: ReadonlyArray<unknown>
}

/**
 * Error context for transformation
 */
interface ErrorContext {
  readonly subgraphId: string
  readonly fieldPath: ReadonlyArray<string>
  readonly operationType: "query" | "mutation" | "subscription"
  readonly timestamp: Date
}

/**
 * Transformed error for client consumption
 */
interface TransformedError {
  readonly message: string
  readonly code: string
  readonly path?: ReadonlyArray<string>
  readonly extensions?: Record<string, any>
}

/**
 * FederationErrorBoundaries - Federation-aware error handling and circuit breakers
 * 
 * Features:
 * - Circuit breakers per subgraph with state management
 * - Partial failure handling with fallback strategies
 * - Timeout management with configurable durations
 * - Error transformation and sanitization
 * - Metrics collection for monitoring
 */
export namespace FederationErrorBoundaries {
  /**
   * Create an error boundary with comprehensive fault tolerance
   */
  export const createBoundary = (config: ErrorBoundaryConfig): ErrorBoundary =>
    pipe(
      Effect.succeed(config),
      Effect.map(conf => ({
        wrapResolver: (subgraphId: string, resolver: GraphQLResolver) =>
          createBoundedResolver(subgraphId, resolver, conf),
        
        handlePartialFailure: (results: SubgraphResults) =>
          processPartialResults(results, conf.partialFailureHandling),
          
        transformError: (error: FederationError, context: ErrorContext) =>
          transformFederationError(error, context, conf.errorTransformation)
      }))
    ).pipe(Effect.runSync)

  /**
   * Create a circuit breaker for a specific subgraph
   */
  export const withCircuitBreaker = (
    subgraphId: string,
    config: CircuitBreakerConfig
  ): Effect.Effect<CircuitBreaker, CompositionError> =>
    pipe(
      Effect.succeed(config),
      Effect.flatMap(validateCircuitBreakerConfig),
      Effect.map(validConfig => createCircuitBreakerInstance(subgraphId, validConfig))
    )

  // === Internal Implementation ===

  /**
   * Create a bounded resolver with comprehensive error handling
   */
  const createBoundedResolver = (
    subgraphId: string,
    resolver: GraphQLResolver,
    config: ErrorBoundaryConfig
  ): BoundedResolver => {
    const circuitBreaker = createCircuitBreakerInstance(subgraphId, config.circuitBreakerConfig)
    const timeout = config.subgraphTimeouts[subgraphId] ?? Duration.seconds(10)

    return (parent, args, context, info) => {
      const startTime = Date.now()
      
      return pipe(
        Effect.tryPromise({
          try: () => resolver(parent, args, context, info),
          catch: (error) => ErrorFactory.federation(
            "Resolver execution failed", 
            subgraphId,
            "execution",
            error
          )
        }),
        Effect.timeout(timeout),
        Effect.catchTag("TimeoutException", () => 
          Effect.fail(ErrorFactory.timeout(`Subgraph ${subgraphId} timed out`, timeout.toString()))
        ),
        circuitBreaker.protect,
        Effect.tap(_result => 
          Effect.sync(() => {
            const duration = Date.now() - startTime
            recordMetrics(subgraphId, { duration, success: true })
          })
        ),
        Effect.catchAll(error => {
          const duration = Date.now() - startTime
          recordMetrics(subgraphId, { duration, success: false, error })
          
          if (config.partialFailureHandling.allowPartialFailure) {
            // Return null for failed field in partial failure mode
            return Effect.succeed(null)
          } else {
            return Effect.fail(error)
          }
        }),
        Effect.runPromise
      )
    }
  }

  /**
   * Process partial failure results with fallback strategies
   */
  const processPartialResults = (
    results: SubgraphResults,
    config: PartialFailureConfig
  ): Effect.Effect<ProcessedResults, FederationError> => {
    const { successful, failed } = partitionResults(results)
    
    if (failed.length === 0) {
      return Effect.succeed({ 
        data: mergeSuccessfulResults(successful), 
        errors: [] 
      })
    }

    if (!config.allowPartialFailure) {
      return Effect.fail(ErrorFactory.federation(
        "Subgraph failures not allowed",
        undefined,
        "partial_failure",
        { failedSubgraphs: failed.map(f => f.subgraphId) }
      ))
    }

    // Check for critical subgraph failures
    const criticalFailures = failed.filter(f => 
      config.criticalSubgraphs?.includes(f.subgraphId)
    )

    if (criticalFailures.length > 0) {
      return Effect.fail(ErrorFactory.federation(
        "Critical subgraph failure",
        undefined,
        "critical_failure", 
        { failedSubgraphs: criticalFailures.map(f => f.subgraphId) }
      ))
    }

    // Apply fallback values for failed subgraphs
    const dataWithFallbacks = applyFallbackValues(successful, failed, config)

    return Effect.succeed({
      data: dataWithFallbacks,
      errors: failed.map(f => transformSubgraphError(f.error))
    })
  }

  /**
   * Partition results into successful and failed - optimized for performance
   */
  const partitionResults = (results: SubgraphResults): {
    readonly successful: readonly SubgraphResult[]
    readonly failed: readonly SubgraphResult[]
  } => {
    const successful: SubgraphResult[] = []
    const failed: SubgraphResult[] = []
    
    // Use for...of for better performance than Object.values().forEach
    for (const result of Object.values(results)) {
      if (result.success) {
        successful.push(result)
      } else {
        failed.push(result)
      }
    }
    
    return { successful, failed }
  }

  /**
   * Merge successful results into a single data object
   */
  const mergeSuccessfulResults = (results: readonly SubgraphResult[]): unknown => {
    return results.reduce((merged, result) => ({
      ...merged,
      ...(typeof result.data === 'object' && result.data !== null ? result.data : {})
    }), {})
  }

  /**
   * Apply fallback values for failed subgraphs
   */
  const applyFallbackValues = (
    successful: readonly SubgraphResult[],
    failed: readonly SubgraphResult[],
    config: PartialFailureConfig
  ): unknown => {
    let data = mergeSuccessfulResults(successful)
    
    if (config.fallbackValues) {
      failed.forEach(failedResult => {
        const fallback = config.fallbackValues?.[failedResult.subgraphId]
        if (fallback) {
          data = { ...(typeof data === 'object' && data !== null ? data : {}), ...fallback }
        }
      })
    }
    
    return data
  }

  /**
   * Transform subgraph error for client consumption
   */
  const transformSubgraphError = (error: unknown): unknown => {
    const errorObj = error as { message?: string; code?: string; extensions?: Record<string, unknown> }
    return {
      message: errorObj.message || "Subgraph execution failed",
      extensions: {
        code: errorObj.code || "SUBGRAPH_ERROR",
        timestamp: new Date().toISOString(),
        ...errorObj.extensions
      }
    }
  }

  /**
   * Create circuit breaker instance with state management and performance optimizations
   */
  const createCircuitBreakerInstance = (
    subgraphId: string,
    config: CircuitBreakerConfig
  ): CircuitBreaker => {
    let state: CircuitBreakerState = "closed"
    let failureCount = 0
    let lastFailureTime: number | null = null
    let successCount = 0
    let lastStateChange = Date.now()
    
    // Pre-calculate timeout values for better performance
    const resetTimeoutMs = Duration.toMillis(config.resetTimeout)
    const halfOpenMaxCalls = config.halfOpenMaxCalls ?? 3

    return {
      protect: <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, CircuitBreakerError | E> =>
        pipe(
          Effect.succeed(state),
          Effect.flatMap((currentState): Effect.Effect<A, CircuitBreakerError | E> => {
            switch (currentState) {
              case "open": {
                // Use pre-calculated timeout for better performance
                const canReset = lastFailureTime && (Date.now() - lastFailureTime) >= resetTimeoutMs
                return canReset
                  ? pipe(
                      Effect.sync(() => {
                        state = "half-open"
                        successCount = 0
                        lastStateChange = Date.now()
                        console.log(`🔄 Circuit breaker attempting reset for ${subgraphId}`)
                      }),
                      Effect.flatMap((): Effect.Effect<A, CircuitBreakerError | E> => effect)
                    )
                  : Effect.fail(ErrorFactory.circuitBreaker(
                      `Circuit breaker open for ${subgraphId}`,
                      "open"
                    ))
              }
              
              case "half-open":
                return pipe(
                  effect,
                  Effect.tap(() => Effect.sync(() => {
                    successCount++
                    if (successCount >= halfOpenMaxCalls) {
                      state = "closed"
                      failureCount = 0
                      successCount = 0
                      lastStateChange = Date.now()
                      console.log(`🔋 Circuit breaker closed for ${subgraphId}`)
                    }
                  })),
                  Effect.catchAll(error => {
                    state = "open"
                    lastFailureTime = Date.now()
                    lastStateChange = Date.now()
                    successCount = 0
                    console.log(`⚡ Circuit breaker opened for ${subgraphId}`)
                    return Effect.fail(error)
                  })
                )
              
              case "closed":
                return pipe(
                  effect,
                  Effect.tap(() => Effect.sync(() => {
                    // Reset failure count on success - only if needed
                    if (failureCount > 0) {
                      failureCount = 0
                    }
                  })),
                  Effect.catchAll(error => {
                    failureCount++
                    if (failureCount >= config.failureThreshold) {
                      state = "open"
                      lastFailureTime = Date.now()
                      lastStateChange = Date.now()
                      console.log(`🚨 Circuit breaker opened for ${subgraphId} (${failureCount} failures)`)
                    }
                    return Effect.fail(error)
                  })
                )
            }
          })
        ),
      
      getState: () => state,
      getMetrics: (): CircuitBreakerMetrics => ({ 
        failureCount, 
        lastFailureTime, 
        state,
        lastStateChange,
        successCount,
        resetTimeoutMs
      })
    }
  }

  /**
   * Optimized metrics recording with batching to reduce I/O overhead
   */
  let metricsBuffer: Array<{ subgraphId: string; metrics: unknown }> = []
  let metricsFlushTimer: NodeJS.Timeout | null = null
  
  const flushMetrics = () => {
    if (metricsBuffer.length === 0) return
    
    // Batch process metrics
    const batch = [...metricsBuffer]
    metricsBuffer = []
    
    // In production, this would batch write to monitoring system
    console.log(`📊 Flushing ${batch.length} metrics entries`)
    
    metricsFlushTimer = null
  }
  
  const scheduleMetricsFlush = () => {
    if (metricsFlushTimer) return
    
    metricsFlushTimer = setTimeout(flushMetrics, 1000) // 1 second batch window
  }

  /**
   * Validate circuit breaker configuration
   */
  const validateCircuitBreakerConfig = (
    config: CircuitBreakerConfig
  ): Effect.Effect<CircuitBreakerConfig, CompositionError> =>
    pipe(
      Effect.succeed(config),
      Effect.filterOrFail(
        conf => conf.failureThreshold > 0,
        () => ErrorFactory.composition("Failure threshold must be greater than 0")
      ),
      Effect.filterOrFail(
        conf => Duration.toMillis(conf.resetTimeout) > 0,
        () => ErrorFactory.composition("Reset timeout must be greater than 0")
      )
    )

  /**
   * Transform federation error for client consumption
   */
  const transformFederationError = (
    error: FederationError,
    context: ErrorContext,
    config?: ErrorTransformationConfig
  ): TransformedError => {
    const baseError: TransformedError = {
      message: config?.sanitizeErrors ? "Internal server error" : error.message,
      code: error._tag || "FEDERATION_ERROR",
      path: context.fieldPath,
      extensions: {
        subgraphId: context.subgraphId,
        operationType: context.operationType,
        timestamp: context.timestamp.toISOString(),
        ...(config?.includeStackTrace && error.cause ? { 
          stack: String(error.cause) 
        } : {})
      }
    }

    if (config?.customTransformer) {
      const transformedError = new Error(baseError.message)
      transformedError.name = 'FederationError'
      
      const result = config.customTransformer(transformedError)
      return {
        ...result,
        message: result.message,
        code: 'code' in result && typeof result.code === 'string' ? result.code : 'UNKNOWN_ERROR'
      }
    }
    
    return baseError
  }

  /**
   * Record metrics for monitoring with batching optimization
   */
  const recordMetrics = (
    subgraphId: string,
    metrics: { 
      readonly duration: number
      readonly success: boolean
      readonly error?: any
    }
  ): void => {
    // Buffer metrics for batch processing to reduce I/O overhead
    metricsBuffer.push({
      subgraphId,
      metrics: {
        duration: metrics.duration,
        success: metrics.success,
        timestamp: Date.now(),
        ...(metrics.error && { errorType: metrics.error.constructor.name })
      }
    })
    
    scheduleMetricsFlush()
    
    // For immediate debugging, still log individual critical failures
    if (!metrics.success && metrics.duration > 1000) {
      console.warn(`⚠️ Slow failure for ${subgraphId}: ${metrics.duration}ms`)
    }
  }

  /**
   * Default error boundary configuration
   */
  export const defaultConfig: ErrorBoundaryConfig = {
    subgraphTimeouts: {},
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeout: Duration.seconds(30),
      halfOpenMaxCalls: 3
    },
    partialFailureHandling: {
      allowPartialFailure: true,
      criticalSubgraphs: []
    },
    errorTransformation: {
      sanitizeErrors: false,
      includeStackTrace: false
    }
  }

  /**
   * Create error boundary with timeout configuration
   */
  export const withTimeouts = (
    config: ErrorBoundaryConfig,
    timeouts: Record<string, Duration.Duration>
  ): ErrorBoundaryConfig => ({
    ...config,
    subgraphTimeouts: { ...config.subgraphTimeouts, ...timeouts }
  })

  /**
   * Create error boundary with circuit breaker configuration
   */
  export const withCircuitBreakers = (
    config: ErrorBoundaryConfig,
    circuitBreakerConfig: CircuitBreakerConfig
  ): ErrorBoundaryConfig => ({
    ...config,
    circuitBreakerConfig
  })

  /**
   * Create error boundary with partial failure handling
   */
  export const withPartialFailureHandling = (
    config: ErrorBoundaryConfig,
    partialFailureConfig: PartialFailureConfig
  ): ErrorBoundaryConfig => ({
    ...config,
    partialFailureHandling: partialFailureConfig
  })
}

/**
 * Factory functions for common error boundary setups
 */
export const createStrictBoundary = (subgraphIds: ReadonlyArray<string>) =>
  FederationErrorBoundaries.createBoundary(
    FederationErrorBoundaries.withPartialFailureHandling(
      FederationErrorBoundaries.defaultConfig,
      {
        allowPartialFailure: false,
        criticalSubgraphs: [...subgraphIds]
      }
    )
  )

export const createResilientBoundary = (
  subgraphIds: ReadonlyArray<string>,
  criticalSubgraphs: ReadonlyArray<string> = []
) =>
  FederationErrorBoundaries.createBoundary(
    FederationErrorBoundaries.withPartialFailureHandling(
      FederationErrorBoundaries.defaultConfig,
      {
        allowPartialFailure: true,
        criticalSubgraphs: [...criticalSubgraphs],
        fallbackValues: Object.fromEntries(
          subgraphIds.map(id => [id, {}])
        )
      }
    )
  )

export const createProductionBoundary = (
  subgraphTimeouts: Record<string, Duration.Duration>,
  criticalSubgraphs: ReadonlyArray<string> = []
) =>
  FederationErrorBoundaries.createBoundary(
    pipe(
      FederationErrorBoundaries.defaultConfig,
      config => FederationErrorBoundaries.withTimeouts(config, subgraphTimeouts),
      config => FederationErrorBoundaries.withPartialFailureHandling(config, {
        allowPartialFailure: true,
        criticalSubgraphs: [...criticalSubgraphs]
      }),
      config => ({
        ...config,
        errorTransformation: {
          sanitizeErrors: true,
          includeStackTrace: false
        }
      })
    )
  )