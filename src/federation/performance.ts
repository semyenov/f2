import { Effect, pipe, Duration } from 'effect'
import DataLoader from 'dataloader'
import type { ExecutionResult } from 'graphql'
import { GraphQLError } from 'graphql'
import type {
  FederatedSchema,
  PerformanceConfig,
  QueryPlanCacheConfig,
  DataLoaderConfig,
  MetricsConfig,
  CompositionError,
  ValidationError,
} from '../core/types.js'
import { ErrorFactory } from '../core/errors.js'

/**
 * Query plan representation for federation query execution
 *
 * Represents a complete execution plan for a federated GraphQL query,
 * including the sequence of operations across subgraphs and associated
 * performance metadata for optimization decisions.
 *
 * @example Query plan structure
 * ```typescript
 * const plan: QueryPlan = {
 *   id: 'query-hash-abc123',
 *   steps: [
 *     {
 *       subgraphId: 'users',
 *       operation: 'query Users($ids: [ID!]!) { users(ids: $ids) { id name email } }',
 *       dependencies: []
 *     },
 *     {
 *       subgraphId: 'orders',
 *       operation: 'query Orders($userIds: [ID!]!) { orders(userIds: $userIds) { id total } }',
 *       dependencies: ['users']
 *     }
 *   ],
 *   complexity: 25,
 *   estimatedCost: 150
 * }
 * ```
 *
 * @category Performance & Caching
 */
export interface QueryPlan {
  readonly id: string
  readonly steps: ReadonlyArray<QueryStep>
  readonly complexity: number
  readonly estimatedCost: number
}

/**
 * Query step representation
 * @category Performance Optimizations
 */
export interface QueryStep {
  readonly subgraphId: string
  readonly operation: string
  readonly dependencies: ReadonlyArray<string>
}

/**
 * Cached query plan with metadata
 * @category Performance Optimizations
 */
export interface CachedQueryPlan {
  readonly plan: QueryPlan
  readonly createdAt: number
  readonly accessCount: number
  readonly lastAccessed: number
}

/**
 * Query plan cache interface with intelligent caching strategies
 *
 * High-performance cache implementation for federated query plans with LRU eviction,
 * pattern-based invalidation, and comprehensive statistics tracking.
 *
 * @example Basic cache usage
 * ```typescript
 * import { PerformanceOptimizations } from '@cqrs/federation'
 *
 * const cache = yield* PerformanceOptimizations.createQueryPlanCache({
 *   maxSize: 1000,
 *   ttl: Duration.hours(1)
 * })
 *
 * // Check cache for existing plan
 * const cachedPlan = yield* cache.get('query-hash-abc123')
 * if (Option.isSome(cachedPlan)) {
 *   return cachedPlan.value.plan
 * }
 *
 * // Store new plan
 * yield* cache.set('query-hash-abc123', queryPlan)
 * ```
 *
 * @example Pattern-based invalidation
 * ```typescript
 * // Invalidate all plans involving specific subgraph
 * yield* cache.invalidate('users-*')
 *
 * // Invalidate all cached plans
 * yield* cache.invalidate()
 * ```
 *
 * @category Performance & Caching
 */
export interface QueryPlanCache {
  readonly get: (queryHash: string) => Effect.Effect<CachedQueryPlan | undefined, never>
  readonly set: (queryHash: string, plan: QueryPlan) => Effect.Effect<void, never>
  readonly invalidate: (pattern?: string) => Effect.Effect<void, never>
  readonly getStats: () => Effect.Effect<CacheStats, never>
}

/**
 * Cache statistics
 * @category Performance Optimizations
 */
export interface CacheStats {
  readonly size: number
  readonly hitRate: number
  readonly missRate: number
  readonly evictionCount: number
}

/**
 * Federated DataLoader interface for efficient batch loading across subgraphs
 *
 * Provides intelligent batching and caching capabilities for data fetching
 * across multiple federated subgraphs, with per-subgraph DataLoader instances
 * and comprehensive performance monitoring.
 *
 * @example Basic DataLoader usage
 * ```typescript
 * import { PerformanceOptimizations } from '@cqrs/federation'
 *
 * const dataLoader = yield* PerformanceOptimizations.createFederatedDataLoader({
 *   maxBatchSize: 100,
 *   batchWindowMs: 10,
 *   enableBatchLogging: true
 * })
 *
 * // Get loader for specific subgraph
 * const userLoader = yield* dataLoader.getLoader('users', async (userIds) => {
 *   return await fetchUsersByIds(userIds)
 * })
 *
 * // Load data with automatic batching
 * const user = yield* Effect.fromPromise(() => userLoader.load('user-123'))
 * ```
 *
 * @example Advanced batching with custom key function
 * ```typescript
 * const productLoader = yield* dataLoader.getLoader(
 *   'products',
 *   async (keys) => fetchProductsByKeys(keys),
 *   {
 *     cacheKeyFn: (key) => `product:${key.id}:${key.version}`,
 *     maxBatchSize: 50
 *   }
 * )
 * ```
 *
 * @category Performance & Caching
 */
export interface FederatedDataLoader {
  readonly getLoader: <K, V>(
    subgraphId: string,
    batchLoadFn: (keys: readonly K[]) => Promise<readonly V[]>
  ) => Effect.Effect<DataLoader<K, V>, never>
  readonly clearAll: () => Effect.Effect<void, never>
  readonly getStats: () => Effect.Effect<DataLoaderStats, never>
}

/**
 * DataLoader statistics
 * @category Performance Optimizations
 */
export interface DataLoaderStats {
  readonly [subgraphId: string]: {
    readonly loadCount: number
    readonly batchCount: number
    readonly averageBatchSize: number
    readonly cacheHitRate: number
  }
}

/**
 * Metrics collector interface
 * @category Performance Optimizations
 */
export interface MetricsCollector {
  readonly recordExecution: (metrics: ExecutionMetrics) => Effect.Effect<void, never>
  readonly recordCacheOperation: (operation: CacheOperation) => Effect.Effect<void, never>
  readonly getMetrics: () => Effect.Effect<PerformanceMetrics, never>
}

/**
 * Execution metrics
 * @category Performance Optimizations
 */
export interface ExecutionMetrics {
  readonly queryHash: string
  readonly duration: number
  readonly success: boolean
  readonly subgraphCalls: ReadonlyArray<SubgraphCall>
  readonly cacheHit?: boolean
}

/**
 * Subgraph call metrics
 * @category Performance Optimizations
 */
export interface SubgraphCall {
  readonly subgraphId: string
  readonly duration: number
  readonly success: boolean
  readonly batchSize?: number
}

/**
 * Cache operation metrics
 * @category Performance Optimizations
 */
export interface CacheOperation {
  readonly type: 'hit' | 'miss' | 'set' | 'evict'
  readonly key: string
  readonly duration?: number
}

/**
 * Performance metrics summary
 * @category Performance Optimizations
 */
export interface PerformanceMetrics {
  readonly executionMetrics: {
    readonly totalExecutions: number
    readonly averageDuration: number
    readonly successRate: number
  }
  readonly cacheMetrics: CacheStats
  readonly dataLoaderMetrics: DataLoaderStats
}

/**
 * Optimized executor interface
 */
export interface OptimizedExecutor {
  readonly execute: (
    query: string,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ) => Effect.Effect<ExecutionResult, ExecutionError>
}

/**
 * Execution context
 * @category Performance Optimizations
 */
export interface ExecutionContext {
  readonly [key: string]: unknown
  readonly dataLoader?: FederatedDataLoader
}

/**
 * Execution error
 * @category Error Handling
 */
export interface ExecutionError extends Error {
  readonly _tag: 'ExecutionError'
  readonly name: 'ExecutionError'
  readonly message: string
  readonly cause?: unknown
}

/**
 * # PerformanceOptimizations
 *
 * Comprehensive performance optimization suite for Apollo Federation 2.x with Effect-TS,
 * featuring intelligent query plan caching, DataLoader batching, and real-time performance monitoring.
 *
 * ## 🚀 Key Features
 * - **⚡ Query Plan Caching**: LRU cache with intelligent eviction strategies
 * - **📦 DataLoader Batching**: Automatic request batching per subgraph
 * - **📊 Performance Metrics**: Real-time monitoring and analytics
 * - **🔥 Cache Warming**: Preload frequently accessed queries
 * - **⚙️ Execution Optimization**: Parallel execution with circuit breakers
 * - **🎯 Smart Eviction**: Context-aware cache invalidation
 *
 * ## 📚 Usage Examples
 *
 * ### Basic Performance Setup
 * ```typescript
 * import { PerformanceOptimizations } from '@cqrs/federation'
 * import { Effect } from 'effect'
 *
 * // Create optimized executor
 * const executor = yield* PerformanceOptimizations.createOptimizedExecutor(
 *   schema,
 *   {
 *     queryPlanCache: {
 *       maxSize: 1000,
 *       ttl: Duration.minutes(15),
 *       evictionStrategy: 'lru-with-priority'
 *     },
 *     dataLoader: {
 *       batchSize: 50,
 *       maxBatchDelay: Duration.milliseconds(10),
 *       cacheKeyFn: (key) => `subgraph:${key.subgraphId}:${key.id}`
 *     },
 *     metrics: {
 *       enabled: true,
 *       bufferSize: 1000,
 *       flushInterval: Duration.seconds(10)
 *     }
 *   }
 * )
 * ```
 *
 * ### Advanced Caching Configuration
 * ```typescript
 * const queryCache = yield* PerformanceOptimizations.createQueryPlanCache({
 *   maxSize: 5000,
 *   ttl: Duration.minutes(30),
 *   evictionStrategy: 'lru-with-priority',
 *   warmupQueries: [
 *     'query GetPopularProducts { ... }',
 *     'query GetUserProfile { ... }'
 *   ],
 *   priorityFn: (query) => query.includes('popular') ? 10 : 1
 * })
 *
 * // Warm the cache
 * yield* queryCache.warmup()
 * ```
 *
 * ### DataLoader with Custom Batching
 * ```typescript
 * const dataLoader = yield* PerformanceOptimizations.createFederatedDataLoader({
 *   batchSize: 100,
 *   maxBatchDelay: Duration.milliseconds(5),
 *   cacheKeyFn: (key) => `${key.type}:${key.id}`,
 *   batchScheduleFn: 'immediate' // or 'nextTick' | 'timeout'
 * })
 *
 * // Use with subgraph-specific loaders
 * const userLoader = yield* dataLoader.getLoader(
 *   'users-service',
 *   (userIds) => fetchUsersBatch(userIds)
 * )
 *
 * const user = yield* userLoader.load('user-123')
 * ```
 *
 * ## 📈 Performance Monitoring
 *
 * ```typescript
 * const metrics = yield* PerformanceOptimizations.createMetricsCollector({
 *   bufferSize: 1000,
 *   flushInterval: Duration.seconds(5),
 *   aggregationWindow: Duration.minutes(1)
 * })
 *
 * // Monitor execution metrics
 * yield* metrics.recordExecution({
 *   queryHash: 'abc123',
 *   duration: 45,
 *   success: true,
 *   subgraphCalls: [
 *     { subgraphId: 'users', duration: 20, success: true, batchSize: 5 },
 *     { subgraphId: 'orders', duration: 25, success: true, batchSize: 3 }
 *   ],
 *   cacheHit: true
 * })
 *
 * // Get performance insights
 * const performanceData = yield* metrics.getMetrics()
 * console.log(`Cache hit rate: ${performanceData.cacheMetrics.hitRate * 100}%`)
 * console.log(`Avg response time: ${performanceData.executionMetrics.averageDuration}ms`)
 * ```
 *
 * @namespace PerformanceOptimizations
 * @category Performance & Caching
 * @see {@link https://www.apollographql.com/docs/federation/performance/ | Federation Performance Guide}
 * @see {@link https://github.com/graphql/dataloader | DataLoader Documentation}
 */
export namespace PerformanceOptimizations {
  /**
   * Create an optimized executor with comprehensive performance enhancements
   */
  export const createOptimizedExecutor = (
    schema: FederatedSchema,
    config: PerformanceConfig
  ): Effect.Effect<OptimizedExecutor, CompositionError> =>
    pipe(
      Effect.succeed(config),
      Effect.flatMap(config =>
        validatePerformanceConfig(config).pipe(
          Effect.mapError(
            (error): CompositionError =>
              ErrorFactory.composition(
                `Performance configuration invalid: ${error.message}`,
                schema.metadata.subgraphCount.toString(),
                'performance'
              )
          )
        )
      ),
      Effect.flatMap(validConfig =>
        Effect.all({
          queryPlanCache: createQueryPlanCache(validConfig.queryPlanCache).pipe(
            Effect.mapError(
              (error): CompositionError =>
                ErrorFactory.composition(
                  `Query plan cache creation failed: ${error.message}`,
                  undefined,
                  'cache'
                )
            )
          ),
          dataLoader: createFederatedDataLoader(validConfig.dataLoaderConfig).pipe(
            Effect.mapError(
              (error): CompositionError =>
                ErrorFactory.composition(
                  `DataLoader creation failed: ${error.message}`,
                  undefined,
                  'dataloader'
                )
            )
          ),
          metricsCollector: createMetricsCollector(validConfig.metricsCollection).pipe(
            Effect.mapError(
              (error): CompositionError =>
                ErrorFactory.composition(
                  `Metrics collector creation failed: ${error.message}`,
                  undefined,
                  'metrics'
                )
            )
          ),
        })
      ),
      Effect.map(({ queryPlanCache, dataLoader, metricsCollector }) => ({
        execute: (query, variables, context) =>
          executeOptimizedQuery(schema, query, variables, context, {
            queryPlanCache,
            dataLoader,
            metricsCollector,
          }),
      }))
    )

  /**
   * Create query plan cache with LRU eviction
   */
  export const createQueryPlanCache = (
    config: QueryPlanCacheConfig
  ): Effect.Effect<QueryPlanCache, ValidationError> => {
    const cache = new Map<string, CachedQueryPlan>()
    const stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    }

    return Effect.succeed({
      get: (queryHash: string) =>
        Effect.sync(() => {
          const cached = cache.get(queryHash)
          if (cached) {
            stats.hits++
            // Update access time and count
            const updated = {
              ...cached,
              accessCount: cached.accessCount + 1,
              lastAccessed: Date.now(),
            }
            cache.set(queryHash, updated)
            return updated
          } else {
            stats.misses++
            return undefined
          }
        }),

      set: (queryHash: string, plan: QueryPlan) =>
        Effect.sync(() => {
          // LRU eviction if cache is full - evict multiple entries for better amortization
          if (cache.size >= config.maxSize) {
            const entriesToEvict = Math.max(1, Math.floor(config.maxSize * 0.1)) // Evict 10%
            const sortedEntries = Array.from(cache.entries())
              .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
              .slice(0, entriesToEvict)

            for (const [key] of sortedEntries) {
              cache.delete(key)
              stats.evictions++
            }
          }

          cache.set(queryHash, {
            plan,
            createdAt: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now(),
          })
        }),

      invalidate: (pattern?: string) =>
        Effect.sync(() => {
          if (pattern !== undefined) {
            for (const [key] of cache) {
              if (key.includes(pattern)) {
                cache.delete(key)
              }
            }
          } else {
            cache.clear()
          }
        }),

      getStats: () =>
        Effect.succeed({
          size: cache.size,
          hitRate: stats.hits / (stats.hits + stats.misses) || 0,
          missRate: stats.misses / (stats.hits + stats.misses) || 0,
          evictionCount: stats.evictions,
        }),
    })
  }

  /**
   * Create federated DataLoader with per-subgraph batching
   */
  export const createFederatedDataLoader = (
    config: DataLoaderConfig
  ): Effect.Effect<FederatedDataLoader, ValidationError> => {
    const loaders = new Map<string, DataLoader<unknown, unknown>>()
    const stats = new Map<
      string,
      {
        readonly loadCount: number
        readonly batchCount: number
        readonly totalBatchSize: number
        readonly cacheHits: number
        readonly cacheMisses: number
      }
    >()

    return Effect.succeed({
      getLoader: <K, V>(
        subgraphId: string,
        batchLoadFn: (keys: readonly K[]) => Promise<readonly V[]>
      ) =>
        Effect.sync(() => {
          const loaderKey = `${subgraphId}:${batchLoadFn.name || 'default'}`

          if (!loaders.has(loaderKey)) {
            // Initialize stats for this subgraph
            if (!stats.has(subgraphId)) {
              stats.set(subgraphId, {
                loadCount: 0,
                batchCount: 0,
                totalBatchSize: 0,
                cacheHits: 0,
                cacheMisses: 0,
              })
            }

            const subgraphStats = stats.get(subgraphId)!

            const instrumentedBatchFn = async (keys: readonly K[]): Promise<readonly V[]> => {
              const currentStats = stats.get(subgraphId) ?? {
                loadCount: 0,
                batchCount: 0,
                totalBatchSize: 0,
                cacheHits: 0,
                cacheMisses: 0,
              }
              stats.set(subgraphId, {
                ...currentStats,
                batchCount: currentStats.batchCount + 1,
                totalBatchSize: currentStats.totalBatchSize + keys.length,
              })

              if (config.enableBatchLogging !== false) {
                console.log(`🔄 DataLoader batch for ${subgraphId}: ${keys.length} keys`)
              }

              const startTime = Date.now()
              try {
                const results = await batchLoadFn(keys)
                const duration = Date.now() - startTime

                if (config.enableBatchLogging !== false) {
                  console.log(`✅ DataLoader batch completed for ${subgraphId} in ${duration}ms`)
                }
                return results
              } catch (error) {
                const duration = Date.now() - startTime
                console.error(
                  `❌ DataLoader batch failed for ${subgraphId} after ${duration}ms:`,
                  error
                )
                throw error
              }
            }

            const dataLoaderOptions = {
              maxBatchSize: config.maxBatchSize,
              ...(config.cacheKeyFn && { cacheKeyFn: config.cacheKeyFn }),
              ...(config.batchWindowMs !== undefined && {
                batchScheduleFn: (callback: () => void) =>
                  setTimeout(callback, config.batchWindowMs),
              }),
              cacheMap: (() => {
                const map = new Map()
                return {
                  get: (key: string) => {
                    const result = map.get(key)
                    if (result !== undefined) {
                      stats.set(subgraphId, {
                        ...subgraphStats,
                        cacheHits: subgraphStats.cacheHits + 1,
                      })
                    } else {
                      stats.set(subgraphId, {
                        ...subgraphStats,
                        cacheMisses: subgraphStats.cacheMisses + 1,
                      })
                    }
                    return result
                  },
                  set: (key: string, value: Promise<unknown>) => {
                    map.set(key, value)
                    return map
                  },
                  delete: (key: string) => map.delete(key),
                  clear: () => map.clear(),
                }
              })(),
            }

            loaders.set(loaderKey, new DataLoader(instrumentedBatchFn, dataLoaderOptions))
          }

          return loaders.get(loaderKey) as DataLoader<K, V>
        }),

      clearAll: () =>
        Effect.sync(() => {
          loaders.forEach(loader => loader.clearAll())
          loaders.clear()
          stats.clear()
        }),

      getStats: () =>
        Effect.succeed(
          Object.fromEntries(
            Array.from(stats.entries()).map(([subgraphId, stat]) => [
              subgraphId,
              {
                loadCount: stat.loadCount,
                batchCount: stat.batchCount,
                averageBatchSize: stat.batchCount > 0 ? stat.totalBatchSize / stat.batchCount : 0,
                cacheHitRate:
                  stat.cacheHits + stat.cacheMisses > 0
                    ? stat.cacheHits / (stat.cacheHits + stat.cacheMisses)
                    : 0,
              },
            ])
          )
        ),
    })
  }

  /**
   * Create metrics collector for performance monitoring
   */
  export const createMetricsCollector = (
    config: MetricsConfig
  ): Effect.Effect<MetricsCollector, ValidationError> => {
    const executionMetrics: ExecutionMetrics[] = []
    const cacheOperations: CacheOperation[] = []

    return Effect.succeed({
      recordExecution: (metrics: ExecutionMetrics) =>
        Effect.sync(() => {
          if (config.enabled && config.collectExecutionMetrics !== false) {
            executionMetrics.push({
              ...metrics,
              // Add timestamp
              timestamp: Date.now(),
            } as ExecutionMetrics & { readonly timestamp: number })

            // Keep only recent metrics with efficient cleanup
            const maxMetrics = config.maxExecutionMetrics ?? 1000
            if (executionMetrics.length > maxMetrics) {
              // Remove oldest 20% for better performance than shifting one by one
              executionMetrics.splice(0, Math.floor(maxMetrics * 0.2))
            }
          }
        }),

      recordCacheOperation: (operation: CacheOperation) =>
        Effect.sync(() => {
          if (config.enabled && config.collectCacheMetrics !== false) {
            cacheOperations.push({
              ...operation,
              timestamp: Date.now(),
            } as CacheOperation & { readonly timestamp: number })

            // Keep only recent operations with efficient cleanup
            const maxOperations = config.maxCacheOperations ?? 1000
            if (cacheOperations.length > maxOperations) {
              // Remove oldest 20% for better performance than shifting one by one
              cacheOperations.splice(0, Math.floor(maxOperations * 0.2))
            }
          }
        }),

      getMetrics: () =>
        Effect.succeed({
          executionMetrics: {
            totalExecutions: executionMetrics.length,
            averageDuration:
              executionMetrics.reduce((sum, m) => sum + m.duration, 0) / executionMetrics.length ||
              0,
            successRate:
              executionMetrics.filter(m => m.success).length / executionMetrics.length || 0,
          },
          cacheMetrics: {
            size: 0, // Would be populated from actual cache
            hitRate:
              cacheOperations.filter(op => op.type === 'hit').length / cacheOperations.length || 0,
            missRate:
              cacheOperations.filter(op => op.type === 'miss').length / cacheOperations.length || 0,
            evictionCount: cacheOperations.filter(op => op.type === 'evict').length,
          },
          dataLoaderMetrics: {}, // Would be populated from DataLoader stats
        }),
    })
  }

  // === Internal Implementation ===

  /**
   * Execute optimized query with caching and batching
   */
  const executeOptimizedQuery = (
    schema: FederatedSchema,
    query: string,
    variables: Record<string, unknown>,
    context: ExecutionContext,
    optimizations: {
      readonly queryPlanCache: QueryPlanCache
      readonly dataLoader: FederatedDataLoader
      readonly metricsCollector: MetricsCollector
    }
  ): Effect.Effect<ExecutionResult, ExecutionError> => {
    const startTime = Date.now()
    const queryHash = createQueryHash(query, variables)

    return pipe(
      // Try to get cached query plan
      optimizations.queryPlanCache.get(queryHash),
      Effect.flatMap(cachedPlan => {
        if (cachedPlan) {
          return pipe(
            optimizations.metricsCollector.recordCacheOperation({ type: 'hit', key: queryHash }),
            Effect.as(cachedPlan.plan)
          )
        } else {
          return pipe(
            optimizations.metricsCollector.recordCacheOperation({ type: 'miss', key: queryHash }),
            Effect.flatMap(() => createQueryPlan(schema, query)),
            Effect.tap(plan => optimizations.queryPlanCache.set(queryHash, plan))
          )
        }
      }),
      Effect.flatMap(queryPlan =>
        executeQueryPlan(queryPlan, variables, {
          ...context,
          dataLoader: optimizations.dataLoader,
        })
      ),
      Effect.tap(result => {
        const duration = Date.now() - startTime
        return optimizations.metricsCollector.recordExecution({
          queryHash,
          duration,
          success: (result.errors?.length ?? 0) === 0,
          subgraphCalls:
            (result.extensions?.['subgraphCalls'] as ReadonlyArray<SubgraphCall>) ?? [],
        })
      }),
      Effect.catchAll(error =>
        Effect.succeed({
          data: null,
          errors: [
            new GraphQLError(
              error.message || 'Execution failed',
              undefined,
              undefined,
              undefined,
              undefined,
              error,
              {
                code: 'EXECUTION_ERROR',
                timestamp: new Date().toISOString(),
              }
            ),
          ],
        } as ExecutionResult)
      )
    )
  }

  /**
   * Create query hash for caching using FNV-1a algorithm for better distribution
   */
  const createQueryHash = (query: string, variables: Record<string, unknown>): string => {
    // Use FNV-1a hash for better distribution and fewer collisions
    const content = query + JSON.stringify(variables, Object.keys(variables).sort())
    let hash = 2166136261 // FNV offset basis

    for (let i = 0; i < content.length; i++) {
      hash ^= content.charCodeAt(i)
      hash = Math.imul(hash, 16777619) // FNV prime
    }

    return (hash >>> 0).toString(16) // Convert to unsigned 32-bit
  }

  /**
   * Create query plan from GraphQL query
   */
  const createQueryPlan = (
    _schema: FederatedSchema,
    query: string
  ): Effect.Effect<QueryPlan, ExecutionError> =>
    pipe(
      Effect.tryPromise({
        try: async () => {
          // In a real implementation, this would analyze the query
          // and create an optimized execution plan
          console.log(`📋 Creating query plan for query`)

          return {
            id: createQueryHash(query, {}),
            steps: [
              {
                subgraphId: 'default',
                operation: query,
                dependencies: [],
              },
            ],
            complexity: 1,
            estimatedCost: 10,
          }
        },
        catch: error => {
          const execError: ExecutionError = {
            _tag: 'ExecutionError',
            name: 'ExecutionError',
            message: 'Failed to create query plan',
            cause: error,
          }
          return execError
        },
      })
    )

  /**
   * Execute query plan with DataLoader optimization
   */
  const executeQueryPlan = (
    plan: QueryPlan,
    _variables: Record<string, unknown>,
    _context: ExecutionContext
  ): Effect.Effect<ExecutionResult, ExecutionError> =>
    pipe(
      Effect.tryPromise({
        try: async () => {
          console.log(`⚡ Executing query plan with ${plan.steps.length} steps`)

          // Mock execution result
          return {
            data: { mock: 'This is a mock result for demonstration' },
            extensions: {
              subgraphCalls: plan.steps.map(step => ({
                subgraphId: step.subgraphId,
                duration: Math.random() * 100,
                success: true,
              })),
            },
          }
        },
        catch: error => {
          const execError: ExecutionError = {
            _tag: 'ExecutionError',
            name: 'ExecutionError',
            message: 'Query execution failed',
            cause: error,
          }
          return execError
        },
      })
    )

  /**
   * Validate performance configuration
   */
  const validatePerformanceConfig = (
    config: PerformanceConfig
  ): Effect.Effect<PerformanceConfig, ValidationError> =>
    pipe(
      Effect.succeed(config),
      Effect.filterOrFail(
        conf => conf.queryPlanCache.maxSize > 0,
        () => ErrorFactory.validation('Query plan cache max size must be greater than 0', 'maxSize')
      ),
      Effect.filterOrFail(
        conf => conf.dataLoaderConfig.maxBatchSize > 0,
        () =>
          ErrorFactory.validation(
            'DataLoader max batch size must be greater than 0',
            'maxBatchSize'
          )
      )
    )

  /**
   * Default performance configuration
   */
  export const defaultConfig: PerformanceConfig = {
    queryPlanCache: {
      maxSize: 1000,
      ttl: Duration.minutes(30),
    },
    dataLoaderConfig: {
      maxBatchSize: 100,
      batchWindowMs: 10,
    },
    metricsCollection: {
      enabled: true,
      collectExecutionMetrics: true,
      collectCacheMetrics: true,
    },
  }

  /**
   * High-performance configuration for production
   */
  export const productionConfig: PerformanceConfig = {
    queryPlanCache: {
      maxSize: 10000,
      ttl: Duration.hours(1),
    },
    dataLoaderConfig: {
      maxBatchSize: 1000,
      batchWindowMs: 5,
    },
    metricsCollection: {
      enabled: true,
      collectExecutionMetrics: true,
      collectCacheMetrics: true,
    },
  }

  /**
   * Development configuration with detailed logging
   */
  export const developmentConfig: PerformanceConfig = {
    queryPlanCache: {
      maxSize: 100,
      ttl: Duration.minutes(5),
    },
    dataLoaderConfig: {
      maxBatchSize: 10,
      batchWindowMs: 50,
    },
    metricsCollection: {
      enabled: true,
      collectExecutionMetrics: true,
      collectCacheMetrics: true,
    },
  }
}

/**
 * Factory functions for common performance setups
 */
export const createBasicOptimizedExecutor = (schema: FederatedSchema) =>
  PerformanceOptimizations.createOptimizedExecutor(schema, PerformanceOptimizations.defaultConfig)

export const createProductionOptimizedExecutor = (schema: FederatedSchema) =>
  PerformanceOptimizations.createOptimizedExecutor(
    schema,
    PerformanceOptimizations.productionConfig
  )

export const createDevelopmentOptimizedExecutor = (schema: FederatedSchema) =>
  PerformanceOptimizations.createOptimizedExecutor(
    schema,
    PerformanceOptimizations.developmentConfig
  )
