import { CircuitBreaker, CircuitBreakerConfig, CompositionError, DataLoaderConfig, ErrorBoundaryConfig, FederatedSchema, FederationError, MetricsConfig, PartialFailureConfig, PerformanceConfig, QueryPlanCacheConfig, ValidationError } from "./types-iFJStALn.js";
import { Duration, Effect } from "effect";
import { ExecutionResult, GraphQLResolveInfo } from "graphql";
import DataLoader from "dataloader";

//#region src/infrastructure/resilience/error-boundaries.d.ts

/**
 * GraphQL resolver function type
 * @category Error Handling
 */
type GraphQLResolver = (parent: unknown, args: unknown, context: unknown, info: GraphQLResolveInfo) => Promise<unknown>;
/**
 * Bounded resolver with error handling
 */
type BoundedResolver = GraphQLResolver;
/**
 * Error boundary instance
 */
interface ErrorBoundary {
  readonly wrapResolver: (subgraphId: string, resolver: GraphQLResolver) => BoundedResolver;
  readonly handlePartialFailure: (results: SubgraphResults) => Effect.Effect<ProcessedResults, FederationError>;
  readonly transformError: (error: FederationError, context: ErrorContext) => TransformedError;
}
/**
 * Subgraph execution results
 * @category Error Handling
 */
interface SubgraphResults {
  readonly [subgraphId: string]: SubgraphResult;
}
/**
 * Single subgraph execution result
 * @category Error Handling
 */
interface SubgraphResult {
  readonly subgraphId: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: unknown;
}
/**
 * Processed results after partial failure handling
 * @category Error Handling
 */
interface ProcessedResults {
  readonly data: unknown;
  readonly errors: ReadonlyArray<unknown>;
}
/**
 * Error context for transformation
 * @category Error Handling
 */
interface ErrorContext {
  readonly subgraphId: string;
  readonly fieldPath: ReadonlyArray<string>;
  readonly operationType: 'query' | 'mutation' | 'subscription';
  readonly timestamp: Date;
}
/**
 * Transformed error for client consumption
 * @category Error Handling
 */
interface TransformedError {
  readonly message: string;
  readonly code: string;
  readonly path?: ReadonlyArray<string>;
  readonly extensions?: Record<string, unknown>;
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
declare namespace FederationErrorBoundaries {
  /**
   * Create an error boundary with comprehensive fault tolerance
   */
  const createBoundary: (config: ErrorBoundaryConfig) => ErrorBoundary;
  /**
   * Create a circuit breaker for a specific subgraph
   */
  const withCircuitBreaker: (subgraphId: string, config: CircuitBreakerConfig) => Effect.Effect<CircuitBreaker, CompositionError>;
  /**
   * Default error boundary configuration
   */
  const defaultConfig: ErrorBoundaryConfig;
  /**
   * Create error boundary with timeout configuration
   */
  const withTimeouts: (config: ErrorBoundaryConfig, timeouts: Record<string, Duration.Duration>) => ErrorBoundaryConfig;
  /**
   * Create error boundary with circuit breaker configuration
   */
  const withCircuitBreakers: (config: ErrorBoundaryConfig, circuitBreakerConfig: CircuitBreakerConfig) => ErrorBoundaryConfig;
  /**
   * Create error boundary with partial failure handling
   */
  const withPartialFailureHandling: (config: ErrorBoundaryConfig, partialFailureConfig: PartialFailureConfig) => ErrorBoundaryConfig;
}
/**
 * Factory functions for common error boundary setups
 */
declare const createStrictBoundary: (subgraphIds: ReadonlyArray<string>) => ErrorBoundary;
declare const createResilientBoundary: (subgraphIds: ReadonlyArray<string>, criticalSubgraphs?: ReadonlyArray<string>) => ErrorBoundary;
declare const createProductionBoundary: (subgraphTimeouts: Record<string, Duration.Duration>, criticalSubgraphs?: ReadonlyArray<string>) => ErrorBoundary;
//#endregion
//#region src/infrastructure/performance/performance.d.ts
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
interface QueryPlan {
  readonly id: string;
  readonly steps: ReadonlyArray<QueryStep>;
  readonly complexity: number;
  readonly estimatedCost: number;
}
/**
 * Query step representation
 * @category Performance Optimizations
 */
interface QueryStep {
  readonly subgraphId: string;
  readonly operation: string;
  readonly dependencies: ReadonlyArray<string>;
}
/**
 * Cached query plan with metadata
 * @category Performance Optimizations
 */
interface CachedQueryPlan {
  readonly plan: QueryPlan;
  readonly createdAt: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
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
interface QueryPlanCache {
  readonly get: (queryHash: string) => Effect.Effect<CachedQueryPlan | undefined, never>;
  readonly set: (queryHash: string, plan: QueryPlan) => Effect.Effect<void, never>;
  readonly invalidate: (pattern?: string) => Effect.Effect<void, never>;
  readonly getStats: () => Effect.Effect<CacheStats, never>;
}
/**
 * Cache statistics
 * @category Performance Optimizations
 */
interface CacheStats {
  readonly size: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly evictionCount: number;
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
interface FederatedDataLoader {
  readonly getLoader: <K, V>(subgraphId: string, batchLoadFn: (keys: readonly K[]) => Promise<readonly V[]>) => Effect.Effect<DataLoader<K, V>, never>;
  readonly clearAll: () => Effect.Effect<void, never>;
  readonly getStats: () => Effect.Effect<DataLoaderStats, never>;
}
/**
 * DataLoader statistics
 * @category Performance Optimizations
 */
interface DataLoaderStats {
  readonly [subgraphId: string]: {
    readonly loadCount: number;
    readonly batchCount: number;
    readonly averageBatchSize: number;
    readonly cacheHitRate: number;
  };
}
/**
 * Metrics collector interface
 * @category Performance Optimizations
 */
interface MetricsCollector {
  readonly recordExecution: (metrics: ExecutionMetrics) => Effect.Effect<void, never>;
  readonly recordCacheOperation: (operation: CacheOperation) => Effect.Effect<void, never>;
  readonly getMetrics: () => Effect.Effect<PerformanceMetrics, never>;
}
/**
 * Execution metrics
 * @category Performance Optimizations
 */
interface ExecutionMetrics {
  readonly queryHash: string;
  readonly duration: number;
  readonly success: boolean;
  readonly subgraphCalls: ReadonlyArray<SubgraphCall>;
  readonly cacheHit?: boolean;
}
/**
 * Subgraph call metrics
 * @category Performance Optimizations
 */
interface SubgraphCall {
  readonly subgraphId: string;
  readonly duration: number;
  readonly success: boolean;
  readonly batchSize?: number;
}
/**
 * Cache operation metrics
 * @category Performance Optimizations
 */
interface CacheOperation {
  readonly type: 'hit' | 'miss' | 'set' | 'evict';
  readonly key: string;
  readonly duration?: number;
}
/**
 * Performance metrics summary
 * @category Performance Optimizations
 */
interface PerformanceMetrics {
  readonly executionMetrics: {
    readonly totalExecutions: number;
    readonly averageDuration: number;
    readonly successRate: number;
  };
  readonly cacheMetrics: CacheStats;
  readonly dataLoaderMetrics: DataLoaderStats;
}
/**
 * Optimized executor interface
 */
interface OptimizedExecutor {
  readonly execute: (query: string, variables: Record<string, unknown>, context: ExecutionContext) => Effect.Effect<ExecutionResult, ExecutionError>;
}
/**
 * Execution context
 * @category Performance Optimizations
 */
interface ExecutionContext {
  readonly [key: string]: unknown;
  readonly dataLoader?: FederatedDataLoader;
}
/**
 * Execution error
 * @category Error Handling
 */
interface ExecutionError extends Error {
  readonly _tag: 'ExecutionError';
  readonly name: 'ExecutionError';
  readonly message: string;
  readonly cause?: unknown;
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
declare namespace PerformanceOptimizations {
  /**
   * Create an optimized executor with comprehensive performance enhancements
   */
  const createOptimizedExecutor: (schema: FederatedSchema, config: PerformanceConfig) => Effect.Effect<OptimizedExecutor, CompositionError>;
  /**
   * Create query plan cache with LRU eviction
   */
  const createQueryPlanCache: (config: QueryPlanCacheConfig) => Effect.Effect<QueryPlanCache, ValidationError>;
  /**
   * Create federated DataLoader with per-subgraph batching
   */
  const createFederatedDataLoader: (config: DataLoaderConfig) => Effect.Effect<FederatedDataLoader, ValidationError>;
  /**
   * Create metrics collector for performance monitoring
   */
  const createMetricsCollector: (config: MetricsConfig) => Effect.Effect<MetricsCollector, ValidationError>;
  /**
   * Default performance configuration
   */
  const defaultConfig: PerformanceConfig;
  /**
   * High-performance configuration for production
   */
  const productionConfig: PerformanceConfig;
  /**
   * Development configuration with detailed logging
   */
  const developmentConfig: PerformanceConfig;
}
/**
 * Factory functions for common performance setups
 */
declare const createBasicOptimizedExecutor: (schema: FederatedSchema) => Effect.Effect<OptimizedExecutor, CompositionError, never>;
declare const createProductionOptimizedExecutor: (schema: FederatedSchema) => Effect.Effect<OptimizedExecutor, CompositionError, never>;
declare const createDevelopmentOptimizedExecutor: (schema: FederatedSchema) => Effect.Effect<OptimizedExecutor, CompositionError, never>;
//#endregion
export { CacheOperation, CacheStats, CachedQueryPlan, DataLoaderStats, ErrorBoundary, ErrorContext, ExecutionContext, ExecutionError, ExecutionMetrics, FederatedDataLoader, FederationErrorBoundaries, GraphQLResolver, MetricsCollector, OptimizedExecutor, PerformanceMetrics, PerformanceOptimizations, ProcessedResults, QueryPlan, QueryPlanCache, QueryStep, SubgraphCall, SubgraphResult, SubgraphResults, TransformedError, createBasicOptimizedExecutor, createDevelopmentOptimizedExecutor, createProductionBoundary, createProductionOptimizedExecutor, createResilientBoundary, createStrictBoundary };
//# sourceMappingURL=performance-zrAYPIlq.d.ts.map