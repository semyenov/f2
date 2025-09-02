/**
 * Query Plan Caching Module
 * 
 * Provides efficient caching for GraphQL query plans with LRU eviction,
 * batch operations, and performance metrics.
 * 
 * @module performance/cache
 */

import * as Effect from 'effect/Effect'
import * as Duration from 'effect/Duration'
import * as HashMap from 'effect/HashMap'
import * as Option from 'effect/Option'
import type { FederatedSchema } from '@runtime/core'

/**
 * Query plan structure for cached execution
 */
export interface QueryPlan {
  steps: ReadonlyArray<QueryStep>
  parallel: boolean
  estimatedComplexity: number
  cacheable: boolean
}

/**
 * Individual step in a query plan
 */
export interface QueryStep {
  service: string
  operation: string
  dependencies: ReadonlyArray<string>
  variables: Record<string, unknown>
}

/**
 * Cached query plan with metadata
 */
export interface CachedQueryPlan {
  plan: QueryPlan
  hash: string
  timestamp: Date
  hits: number
  lastAccessTime: Date
  averageExecutionTime?: number
}

/**
 * Query plan cache interface
 */
export interface QueryPlanCache {
  get: (query: string) => Effect.Effect<Option.Option<QueryPlan>, Error>
  set: (query: string, plan: QueryPlan) => Effect.Effect<void, Error>
  invalidate: (pattern?: string) => Effect.Effect<number, Error>
  getStats: () => Effect.Effect<CacheStats, never>
  clear: () => Effect.Effect<void, never>
  preload: (plans: ReadonlyArray<[string, QueryPlan]>) => Effect.Effect<void, Error>
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
  evictions: number
  averageAccessTime: number
  memoryUsage: number
}

/**
 * Cache operation tracking
 */
export interface CacheOperation {
  type: 'get' | 'set' | 'invalidate' | 'clear'
  key?: string
  timestamp: Date
  duration: number
  success: boolean
}

/**
 * Configuration for query plan cache
 */
export interface QueryPlanCacheConfig {
  maxSize?: number
  ttl?: Duration.Duration
  evictionStrategy?: 'lru' | 'lfu' | 'fifo'
  batchEviction?: boolean
  batchEvictionSize?: number
  preloadPlans?: ReadonlyArray<[string, QueryPlan]>
  enableMetrics?: boolean
}

/**
 * Create a query plan cache with LRU eviction
 */
export const createQueryPlanCache = (
  config: QueryPlanCacheConfig = {}
): Effect.Effect<QueryPlanCache, never, never> =>
  Effect.gen(function* () {
    const {
      maxSize = 1000,
      ttl = Duration.minutes(5),
      evictionStrategy = 'lru',
      batchEviction = true,
      batchEvictionSize = 100,
      enableMetrics = true,
    } = config

    // Statistics tracking
    let stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalAccessTime: 0,
      accessCount: 0,
    }

    // Create the cache
    const cache = yield* Cache.make({
      capacity: maxSize,
      timeToLive: ttl,
      lookup: (key: string) =>
        Effect.succeed(Option.none<CachedQueryPlan>()),
    })

    // Track operations if metrics enabled
    const operations: CacheOperation[] = []
    const trackOperation = (op: CacheOperation) => {
      if (enableMetrics && operations.length < 10000) {
        operations.push(op)
      }
    }

    // Batch eviction logic
    const performBatchEviction = (
      cacheMap: HashMap.HashMap<string, CachedQueryPlan>
    ): HashMap.HashMap<string, CachedQueryPlan> => {
      if (!batchEviction) return cacheMap

      const size = HashMap.size(cacheMap)
      if (size <= maxSize) return cacheMap

      const toEvict = Math.max(batchEvictionSize, Math.floor(size * 0.1))
      const entries = Array.from(HashMap.entries(cacheMap))

      // Sort based on eviction strategy
      const sorted = entries.sort((a, b) => {
        switch (evictionStrategy) {
          case 'lru':
            return a[1].lastAccessTime.getTime() - b[1].lastAccessTime.getTime()
          case 'lfu':
            return a[1].hits - b[1].hits
          case 'fifo':
            return a[1].timestamp.getTime() - b[1].timestamp.getTime()
          default:
            return 0
        }
      })

      // Remove oldest entries
      const retained = sorted.slice(toEvict)
      stats.evictions += toEvict

      return HashMap.fromIterable(retained)
    }

    // Internal storage
    let planCache = HashMap.empty<string, CachedQueryPlan>()

    return {
      get: (query: string) =>
        Effect.gen(function* () {
          const start = Date.now()
          const cached = HashMap.get(planCache, hashQuery(query))

          if (Option.isSome(cached)) {
            stats.hits++
            const plan = cached.value
            
            // Update access metadata
            planCache = HashMap.modify(
              planCache,
              hashQuery(query),
              p => ({
                ...p,
                hits: p.hits + 1,
                lastAccessTime: new Date(),
              })
            )

            trackOperation({
              type: 'get',
              key: query,
              timestamp: new Date(),
              duration: Date.now() - start,
              success: true,
            })

            return Option.some(plan.plan)
          } else {
            stats.misses++
            
            trackOperation({
              type: 'get',
              key: query,
              timestamp: new Date(),
              duration: Date.now() - start,
              success: false,
            })

            return Option.none()
          }
        }),

      set: (query: string, plan: QueryPlan) =>
        Effect.gen(function* () {
          const start = Date.now()
          const hash = hashQuery(query)
          
          const cachedPlan: CachedQueryPlan = {
            plan,
            hash,
            timestamp: new Date(),
            hits: 0,
            lastAccessTime: new Date(),
          }

          planCache = performBatchEviction(
            HashMap.set(planCache, hash, cachedPlan)
          )

          trackOperation({
            type: 'set',
            key: query,
            timestamp: new Date(),
            duration: Date.now() - start,
            success: true,
          })
        }),

      invalidate: (pattern?: string) =>
        Effect.gen(function* () {
          const start = Date.now()
          let invalidated = 0

          if (pattern) {
            const regex = new RegExp(pattern)
            const toRemove: string[] = []

            HashMap.forEach(planCache, (value, key) => {
              if (regex.test(key)) {
                toRemove.push(key)
                invalidated++
              }
            })

            toRemove.forEach(key => {
              planCache = HashMap.remove(planCache, key)
            })
          } else {
            invalidated = HashMap.size(planCache)
            planCache = HashMap.empty()
          }

          trackOperation({
            type: 'invalidate',
            key: pattern,
            timestamp: new Date(),
            duration: Date.now() - start,
            success: true,
          })

          return invalidated
        }),

      getStats: () =>
        Effect.succeed({
          size: HashMap.size(planCache),
          hits: stats.hits,
          misses: stats.misses,
          hitRate: stats.hits / Math.max(1, stats.hits + stats.misses),
          evictions: stats.evictions,
          averageAccessTime: stats.accessCount > 0
            ? stats.totalAccessTime / stats.accessCount
            : 0,
          memoryUsage: estimateMemoryUsage(planCache),
        }),

      clear: () =>
        Effect.gen(function* () {
          const start = Date.now()
          planCache = HashMap.empty()
          stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalAccessTime: 0,
            accessCount: 0,
          }

          trackOperation({
            type: 'clear',
            timestamp: new Date(),
            duration: Date.now() - start,
            success: true,
          })
        }),

      preload: (plans: ReadonlyArray<[string, QueryPlan]>) =>
        Effect.gen(function* () {
          for (const [query, plan] of plans) {
            const hash = hashQuery(query)
            planCache = HashMap.set(planCache, hash, {
              plan,
              hash,
              timestamp: new Date(),
              hits: 0,
              lastAccessTime: new Date(),
            })
          }
        }),
    }
  })

/**
 * Hash a query string for cache key
 */
const hashQuery = (query: string): string => {
  let hash = 0
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Estimate memory usage of cache
 */
const estimateMemoryUsage = (
  cache: HashMap.HashMap<string, CachedQueryPlan>
): number => {
  // Rough estimation: 1KB per entry average
  return HashMap.size(cache) * 1024
}

/**
 * Create a cache warmup effect
 */
export const warmupCache = (
  cache: QueryPlanCache,
  schema: FederatedSchema,
  commonQueries: ReadonlyArray<string>
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const plans: [string, QueryPlan][] = []

    for (const query of commonQueries) {
      // Generate a simple plan for warmup
      const plan: QueryPlan = {
        steps: [{
          service: 'gateway',
          operation: 'query',
          dependencies: [],
          variables: {},
        }],
        parallel: false,
        estimatedComplexity: 1,
        cacheable: true,
      }
      plans.push([query, plan])
    }

    yield* cache.preload(plans)
  })