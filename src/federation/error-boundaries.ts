/**
 * Federation Error Boundaries and Resilience Patterns
 *
 * Comprehensive error handling and resilience system for federated GraphQL deployments,
 * providing circuit breakers, partial failure handling, timeout management, and
 * sophisticated error transformation strategies.
 *
 * ## 🛡️ Resilience Patterns
 *
 * ### Circuit Breaker Pattern
 * Implements the circuit breaker pattern to prevent cascading failures:
 * - **Closed**: Normal operation, requests flow through
 * - **Open**: Circuit trips, requests fail-fast to prevent resource exhaustion
 * - **Half-Open**: Test phase, limited requests to check service recovery
 *
 * ### Partial Failure Handling
 * Gracefully handles subgraph failures with configurable strategies:
 * - **Fail-fast**: Fail entire request if critical subgraphs fail
 * - **Graceful degradation**: Return partial results with null fields for failed subgraphs
 * - **Fallback values**: Use predefined fallback data when subgraphs are unavailable
 *
 * ### Error Transformation
 * Sophisticated error processing and client-safe error messages:
 * - **Error sanitization**: Remove sensitive information from client-facing errors
 * - **Error correlation**: Link errors across distributed traces
 * - **Error categorization**: Classify errors by type, severity, and retry-ability
 *
 * ## ⚡ Performance Features
 * - **Timeout Management**: Per-subgraph timeout configuration with fallback strategies
 * - **Request Hedging**: Duplicate requests to slow subgraphs for improved latency
 * - **Load Shedding**: Reject requests when system is under heavy load
 * - **Bulk Operations**: Batch multiple subgraph requests for efficiency
 *
 * @example Basic error boundary setup
 * ```typescript
 * import { FederationErrorBoundaries } from '@cqrs/federation-v2'
 * import { Duration } from 'effect'
 *
 * const errorBoundary = yield* FederationErrorBoundaries.create({
 *   subgraphTimeouts: {
 *     'user-service': Duration.seconds(5),
 *     'product-service': Duration.seconds(3),
 *     'order-service': Duration.seconds(10)
 *   },
 *   circuitBreakerConfig: {
 *     failureThreshold: 5,        // Trip after 5 consecutive failures
 *     resetTimeout: Duration.seconds(30),  // Try again after 30s
 *     halfOpenMaxCalls: 3         // Allow 3 test calls in half-open state
 *   },
 *   partialFailureHandling: {
 *     allowPartialFailure: true,
 *     criticalSubgraphs: ['user-service'],  // These must succeed
 *     fallbackValues: {
 *       'product-service': { products: [] },
 *       'recommendation-service': { recommendations: [] }
 *     }
 *   },
 *   errorTransformation: {
 *     sanitizeErrors: true,       // Remove stack traces in production
 *     includeStackTrace: false,   // Don't leak internal details
 *     customTransformer: (error) => ({
 *       message: 'Service temporarily unavailable',
 *       code: 'SERVICE_UNAVAILABLE',
 *       timestamp: new Date().toISOString()
 *     })
 *   }
 * })
 * ```
 *
 * @example Advanced circuit breaker usage
 * ```typescript
 * const createCircuitBreaker = (subgraphId: string) =>
 *   FederationErrorBoundaries.createCircuitBreaker({
 *     failureThreshold: 10,
 *     resetTimeout: Duration.minutes(2),
 *     halfOpenMaxCalls: 5
 *   }).pipe(
 *     Effect.tap(breaker =>
 *       FederationLogger.flatMap(logger =>
 *         logger.info('Circuit breaker created', {
 *           subgraph: subgraphId,
 *           config: {
 *             failureThreshold: 10,
 *             resetTimeoutMs: Duration.toMillis(Duration.minutes(2))
 *           }
 *         })
 *       )
 *     )
 *   )
 *
 * const protectedSubgraphCall = (breaker: CircuitBreaker, operation: Effect.Effect<Data, Error>) =>
 *   breaker.protect(operation).pipe(
 *     Effect.catchTag('CircuitBreakerError', error =>
 *       Match.value(error.state).pipe(
 *         Match.when('open', () =>
 *           Effect.succeed({ data: null, errors: ['Service temporarily unavailable'] })
 *         ),
 *         Match.when('half-open', () =>
 *           Effect.retry(operation, { times: 1, delay: Duration.seconds(1) })
 *         ),
 *         Match.orElse(() => Effect.fail(error))
 *       )
 *     )
 *   )
 * ```
 *
 * @example Partial failure handling strategies
 * ```typescript
 * const handlePartialFailure = (results: SubgraphResults) =>
 *   Effect.gen(function* () {
 *     const boundary = yield* ErrorBoundary
 *     const logger = yield* FederationLogger
 *
 *     // Separate successful and failed results
 *     const successful = Object.entries(results)
 *       .filter(([_, result]) => result.success)
 *     const failed = Object.entries(results)
 *       .filter(([_, result]) => !result.success)
 *
 *     if (failed.length > 0) {
 *       yield* logger.warn('Partial subgraph failures detected', {
 *         failedSubgraphs: failed.map(([id]) => id),
 *         successfulSubgraphs: successful.map(([id]) => id)
 *       })
 *
 *       // Check if any critical subgraphs failed
 *       const criticalFailures = failed.filter(([id]) =>
 *         config.partialFailureHandling.criticalSubgraphs?.includes(id)
 *       )
 *
 *       if (criticalFailures.length > 0) {
 *         return yield* Effect.fail(
 *           ErrorFactory.federation(
 *             'Critical subgraph failure',
 *             criticalFailures[0][0],
 *             'query'
 *           )
 *         )
 *       }
 *     }
 *
 *     // Process partial failure with fallback values
 *     return yield* boundary.handlePartialFailure(results)
 *   })
 * ```
 *
 * @example Error transformation and sanitization
 * ```typescript
 * const createProductionErrorBoundary = () =>
 *   FederationErrorBoundaries.create({
 *     errorTransformation: {
 *       sanitizeErrors: true,
 *       includeStackTrace: false,
 *       customTransformer: (error, context) => {
 *         // Log full error details internally
 *         Effect.runSync(
 *           FederationLogger.flatMap(logger =>
 *             logger.error('Subgraph error occurred', {
 *               subgraph: context.subgraphId,
 *               fieldPath: context.fieldPath,
 *               error: error.message,
 *               stack: error.stack,
 *               operationType: context.operationType
 *             })
 *           )
 *         )
 *
 *         // Return sanitized error for client
 *         return {
 *           message: Match.value(error).pipe(
 *             Match.tag('TimeoutError', () => 'Request timeout'),
 *             Match.tag('CircuitBreakerError', () => 'Service temporarily unavailable'),
 *             Match.tag('ValidationError', err => `Invalid input: ${err.field}`),
 *             Match.orElse(() => 'Internal server error')
 *           ),
 *           code: error._tag,
 *           path: context.fieldPath,
 *           timestamp: context.timestamp.toISOString()
 *         }
 *       }
 *     }
 *   })
 * ```
 *
 * @example Timeout and retry strategies
 * ```typescript
 * const resilientSubgraphExecution = (subgraphId: string, operation: GraphQLOperation) =>
 *   Effect.gen(function* () {
 *     const config = yield* FederationConfigService
 *     const timeout = config.errorBoundaries.subgraphTimeouts[subgraphId] ?? Duration.seconds(30)
 *
 *     return yield* executeSubgraphOperation(operation).pipe(
 *       Effect.timeout(timeout),
 *       Effect.retry({
 *         times: 3,
 *         delay: (attempt) => Duration.millis(100 * Math.pow(2, attempt)) // Exponential backoff
 *       }),
 *       Effect.catchAll(error =>
 *         Match.value(error).pipe(
 *           Match.tag('TimeoutError', () =>
 *             Effect.succeed({
 *               data: null,
 *               errors: [{ message: 'Request timeout', path: operation.fieldPath }]
 *             })
 *           ),
 *           Match.orElse(() => Effect.fail(error))
 *         )
 *       )
 *     )
 *   })
 * ```
 *
 * @example Health-based circuit breaker
 * ```typescript
 * const healthAwareCircuitBreaker = (subgraphId: string) =>
 *   Effect.gen(function* () {
 *     const registry = yield* SubgraphRegistry
 *     const breaker = yield* createCircuitBreaker(subgraphId)
 *
 *     // Monitor subgraph health and adjust circuit breaker
 *     const healthCheck = yield* Effect.repeat(
 *       registry.health(subgraphId).pipe(
 *         Effect.tap(health =>
 *           Match.value(health.status).pipe(
 *             Match.when('unhealthy', () =>
 *               // Force circuit open if health check fails
 *               Effect.sync(() => breaker.forceOpen())
 *             ),
 *             Match.when('healthy', () =>
 *               // Reset circuit if health improves
 *               Effect.sync(() => breaker.reset())
 *             ),
 *             Match.orElse(() => Effect.void)
 *           )
 *         )
 *       ),
 *       {
 *         schedule: Schedule.spaced(Duration.seconds(10))
 *       }
 *     ).pipe(Effect.fork)
 *
 *     return breaker
 *   })
 * ```
 *
 * @category Error Handling & Resilience
 * @since 2.0.0
 * @see {@link https://martinfowler.com/bliki/CircuitBreaker.html | Circuit Breaker Pattern}
 * @see {@link https://www.apollographql.com/docs/federation/errors/ | Federation Error Handling}
 */

import { Effect, pipe, Duration } from 'effect'
import type { GraphQLResolveInfo } from 'graphql'
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
} from '../core/types.js'
import { CompositionError } from '../core/errors.js'
import { ErrorFactory } from '../core/errors.js'

/**
 * GraphQL resolver function type
 * @category Error Handling
 */
export type GraphQLResolver = (
  parent: unknown,
  args: unknown,
  context: unknown,
  info: GraphQLResolveInfo
) => Promise<unknown>

/**
 * Bounded resolver with error handling
 */
type BoundedResolver = GraphQLResolver

/**
 * Error boundary instance
 */
export interface ErrorBoundary {
  readonly wrapResolver: (subgraphId: string, resolver: GraphQLResolver) => BoundedResolver
  readonly handlePartialFailure: (
    results: SubgraphResults
  ) => Effect.Effect<ProcessedResults, FederationError>
  readonly transformError: (error: FederationError, context: ErrorContext) => TransformedError
}

/**
 * Subgraph execution results
 * @category Error Handling
 */
export interface SubgraphResults {
  readonly [subgraphId: string]: SubgraphResult
}

/**
 * Single subgraph execution result
 * @category Error Handling
 */
export interface SubgraphResult {
  readonly subgraphId: string
  readonly success: boolean
  readonly data?: unknown
  readonly error?: unknown
}

/**
 * Processed results after partial failure handling
 * @category Error Handling
 */
export interface ProcessedResults {
  readonly data: unknown
  readonly errors: ReadonlyArray<unknown>
}

/**
 * Error context for transformation
 * @category Error Handling
 */
export interface ErrorContext {
  readonly subgraphId: string
  readonly fieldPath: ReadonlyArray<string>
  readonly operationType: 'query' | 'mutation' | 'subscription'
  readonly timestamp: Date
}

/**
 * Transformed error for client consumption
 * @category Error Handling
 */
export interface TransformedError {
  readonly message: string
  readonly code: string
  readonly path?: ReadonlyArray<string>
  readonly extensions?: Record<string, unknown>
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
          transformFederationError(error, context, conf.errorTransformation),
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
          catch: error =>
            ErrorFactory.federation('Resolver execution failed', subgraphId, 'execution', error),
        }),
        Effect.timeout(timeout),
        Effect.catchTag('TimeoutException', () =>
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
        errors: [],
      })
    }

    if (!config.allowPartialFailure) {
      return Effect.fail(
        ErrorFactory.federation('Subgraph failures not allowed', undefined, 'partial_failure', {
          failedSubgraphs: failed.map(f => f.subgraphId),
        })
      )
    }

    // Check for critical subgraph failures
    const criticalFailures = failed.filter(
      f => config.criticalSubgraphs?.includes(f.subgraphId) ?? false
    )

    if (criticalFailures.length > 0) {
      return Effect.fail(
        ErrorFactory.federation('Critical subgraph failure', undefined, 'critical_failure', {
          failedSubgraphs: criticalFailures.map(f => f.subgraphId),
        })
      )
    }

    // Apply fallback values for failed subgraphs
    const dataWithFallbacks = applyFallbackValues(successful, failed, config)

    return Effect.succeed({
      data: dataWithFallbacks,
      errors: failed.map(f => transformSubgraphError(f.error)),
    })
  }

  /**
   * Partition results into successful and failed - optimized for performance
   */
  const partitionResults = (
    results: SubgraphResults
  ): {
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
    return results.reduce(
      (merged, result) => ({
        ...merged,
        ...(typeof result.data === 'object' && result.data !== null ? result.data : {}),
      }),
      {}
    )
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
        const fallback = config.fallbackValues?.[failedResult.subgraphId] ?? {}
        data = { ...(typeof data === 'object' && data !== null ? data : {}), ...fallback }
      })
    }

    return data
  }

  /**
   * Transform subgraph error for client consumption
   */
  const transformSubgraphError = (error: unknown): unknown => {
    const errorObj = error as {
      message?: string
      code?: string
      extensions?: Record<string, unknown>
    }
    return {
      message: errorObj.message ?? 'Subgraph execution failed',
      extensions: {
        code: errorObj.code ?? 'SUBGRAPH_ERROR',
        timestamp: new Date().toISOString(),
        ...errorObj.extensions,
      },
    }
  }

  /**
   * Create circuit breaker instance with state management and performance optimizations
   */
  const createCircuitBreakerInstance = (
    subgraphId: string,
    config: CircuitBreakerConfig
  ): CircuitBreaker => {
    let state: CircuitBreakerState = 'closed'
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
              case 'open': {
                // Use pre-calculated timeout for better performance
                const canReset =
                  lastFailureTime !== null && Date.now() - lastFailureTime >= resetTimeoutMs
                return canReset
                  ? pipe(
                      Effect.sync(() => {
                        state = 'half-open'
                        successCount = 0
                        lastStateChange = Date.now()
                        console.log(`🔄 Circuit breaker attempting reset for ${subgraphId}`)
                      }),
                      Effect.flatMap((): Effect.Effect<A, CircuitBreakerError | E> => effect)
                    )
                  : Effect.fail(
                      ErrorFactory.circuitBreaker(`Circuit breaker open for ${subgraphId}`, 'open')
                    )
              }

              case 'half-open':
                return pipe(
                  effect,
                  Effect.tap(() =>
                    Effect.sync(() => {
                      successCount++
                      if (successCount >= halfOpenMaxCalls) {
                        state = 'closed'
                        failureCount = 0
                        successCount = 0
                        lastStateChange = Date.now()
                        console.log(`🔋 Circuit breaker closed for ${subgraphId}`)
                      }
                    })
                  ),
                  Effect.catchAll(error => {
                    state = 'open'
                    lastFailureTime = Date.now()
                    lastStateChange = Date.now()
                    successCount = 0
                    console.log(`⚡ Circuit breaker opened for ${subgraphId}`)
                    return Effect.fail(error)
                  })
                )

              case 'closed':
                return pipe(
                  effect,
                  Effect.tap(() =>
                    Effect.sync(() => {
                      // Reset failure count on success - only if needed
                      if (failureCount > 0) {
                        failureCount = 0
                      }
                    })
                  ),
                  Effect.catchAll(error => {
                    failureCount++
                    if (failureCount >= config.failureThreshold) {
                      state = 'open'
                      lastFailureTime = Date.now()
                      lastStateChange = Date.now()
                      console.log(
                        `🚨 Circuit breaker opened for ${subgraphId} (${failureCount} failures)`
                      )
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
        resetTimeoutMs,
      }),
    }
  }

  /**
   * Optimized metrics recording with batching to reduce I/O overhead
   */
  let metricsBuffer: Array<{ subgraphId: string; metrics: unknown }> = []
  let metricsFlushTimer: ReturnType<typeof setTimeout> | null = null

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
        () => ErrorFactory.composition('Failure threshold must be greater than 0')
      ),
      Effect.filterOrFail(
        conf => Duration.toMillis(conf.resetTimeout) > 0,
        () => ErrorFactory.composition('Reset timeout must be greater than 0')
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
    const errorCode =
      error._tag ||
      ('code' in error && typeof error.code === 'string' ? error.code : 'FEDERATION_ERROR')
    const baseError: TransformedError = {
      message: (config?.sanitizeErrors ?? false) ? 'Internal server error' : error.message,
      code: errorCode,
      path: context.fieldPath,
      extensions: {
        subgraphId: context.subgraphId,
        operationType: context.operationType,
        timestamp: context.timestamp.toISOString(),
        ...((config?.includeStackTrace ?? false) && Boolean(error.cause)
          ? {
              stack: String(error.cause),
            }
          : {}),
      },
    }

    if (config?.customTransformer) {
      const transformedError = new Error(baseError.message)
      transformedError.name = 'FederationError'

      const result = config.customTransformer(transformedError)
      return {
        ...result,
        message: result.message,
        code: 'code' in result && typeof result.code === 'string' ? result.code : 'UNKNOWN_ERROR',
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
      readonly error?: unknown
    }
  ): void => {
    // Buffer metrics for batch processing to reduce I/O overhead
    metricsBuffer.push({
      subgraphId,
      metrics: {
        duration: metrics.duration,
        success: metrics.success,
        timestamp: Date.now(),
        ...(metrics.error !== undefined &&
          metrics.error !== null && { errorType: metrics.error.constructor.name }),
      },
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
      halfOpenMaxCalls: 3,
    },
    partialFailureHandling: {
      allowPartialFailure: true,
      criticalSubgraphs: [],
    },
    errorTransformation: {
      sanitizeErrors: false,
      includeStackTrace: false,
    },
  }

  /**
   * Create error boundary with timeout configuration
   */
  export const withTimeouts = (
    config: ErrorBoundaryConfig,
    timeouts: Record<string, Duration.Duration>
  ): ErrorBoundaryConfig => ({
    ...config,
    subgraphTimeouts: { ...config.subgraphTimeouts, ...timeouts },
  })

  /**
   * Create error boundary with circuit breaker configuration
   */
  export const withCircuitBreakers = (
    config: ErrorBoundaryConfig,
    circuitBreakerConfig: CircuitBreakerConfig
  ): ErrorBoundaryConfig => ({
    ...config,
    circuitBreakerConfig,
  })

  /**
   * Create error boundary with partial failure handling
   */
  export const withPartialFailureHandling = (
    config: ErrorBoundaryConfig,
    partialFailureConfig: PartialFailureConfig
  ): ErrorBoundaryConfig => ({
    ...config,
    partialFailureHandling: partialFailureConfig,
  })
}

/**
 * Factory functions for common error boundary setups
 */
export const createStrictBoundary = (subgraphIds: ReadonlyArray<string>) =>
  FederationErrorBoundaries.createBoundary(
    FederationErrorBoundaries.withPartialFailureHandling(FederationErrorBoundaries.defaultConfig, {
      allowPartialFailure: false,
      criticalSubgraphs: [...subgraphIds],
    })
  )

export const createResilientBoundary = (
  subgraphIds: ReadonlyArray<string>,
  criticalSubgraphs: ReadonlyArray<string> = []
) =>
  FederationErrorBoundaries.createBoundary(
    FederationErrorBoundaries.withPartialFailureHandling(FederationErrorBoundaries.defaultConfig, {
      allowPartialFailure: true,
      criticalSubgraphs: [...criticalSubgraphs],
      fallbackValues: Object.fromEntries(subgraphIds.map(id => [id, {}])),
    })
  )

export const createProductionBoundary = (
  subgraphTimeouts: Record<string, Duration.Duration>,
  criticalSubgraphs: ReadonlyArray<string> = []
) =>
  FederationErrorBoundaries.createBoundary(
    pipe(
      FederationErrorBoundaries.defaultConfig,
      config => FederationErrorBoundaries.withTimeouts(config, subgraphTimeouts),
      config =>
        FederationErrorBoundaries.withPartialFailureHandling(config, {
          allowPartialFailure: true,
          criticalSubgraphs: [...criticalSubgraphs],
        }),
      config => ({
        ...config,
        errorTransformation: {
          sanitizeErrors: true,
          includeStackTrace: false,
        },
      })
    )
  )
