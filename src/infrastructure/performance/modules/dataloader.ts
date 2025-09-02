/**
 * DataLoader Integration Module
 * 
 * Provides optimized data fetching with batching, caching, and instrumentation
 * for federation resolvers.
 * 
 * @module performance/dataloader
 */

import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Duration from 'effect/Duration'
import { pipe } from 'effect/Function'
import DataLoader from 'dataloader'

/**
 * Federated DataLoader with Effect integration
 */
export interface FederatedDataLoader<K = unknown, V = unknown> {
  load: (key: K) => Effect.Effect<V, Error>
  loadMany: (keys: ReadonlyArray<K>) => Effect.Effect<ReadonlyArray<V | Error>, Error>
  clear: (key: K) => Effect.Effect<void, never>
  clearAll: () => Effect.Effect<void, never>
  prime: (key: K, value: V) => Effect.Effect<void, never>
  getStats: () => DataLoaderStats
}

/**
 * DataLoader statistics
 */
export interface DataLoaderStats {
  batchCount: number
  loadCount: number
  cacheHits: number
  cacheMisses: number
  averageBatchSize: number
  averageLoadTime: number
  errors: number
}

/**
 * DataLoader configuration
 */
export interface DataLoaderConfig<K = unknown, V = unknown> {
  /** Batch function for loading multiple keys */
  batchFn: (keys: ReadonlyArray<K>) => Promise<ReadonlyArray<V | Error>>
  /** Maximum batch size */
  maxBatchSize?: number
  /** Batch scheduling delay */
  batchScheduleFn?: (callback: () => void) => void
  /** Cache key function */
  cacheKeyFn?: (key: K) => string
  /** Enable caching */
  cache?: boolean
  /** Cache map implementation */
  cacheMap?: DataLoader.CacheMap<K, V>
  /** Name for debugging */
  name?: string
}

/**
 * Create an instrumented DataLoader
 */
export const createFederatedDataLoader = <K = unknown, V = unknown>(
  config: DataLoaderConfig<K, V>
): Effect.Effect<FederatedDataLoader<K, V>, never, never> =>
  Effect.gen(function* () {
    const {
      batchFn,
      maxBatchSize = 100,
      cache = true,
      name = 'unnamed',
    } = config

    // Statistics tracking
    const stats: DataLoaderStats = {
      batchCount: 0,
      loadCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageBatchSize: 0,
      averageLoadTime: 0,
      errors: 0,
    }

    let totalBatchSize = 0
    let totalLoadTime = 0

    // Instrumented batch function
    const instrumentedBatchFn = async (keys: ReadonlyArray<K>) => {
      const start = Date.now()
      stats.batchCount++
      totalBatchSize += keys.length

      console.log(`🔄 DataLoader batch for ${name}: ${keys.length} keys`)

      try {
        const results = await batchFn(keys)
        const duration = Date.now() - start
        totalLoadTime += duration
        
        // Update statistics
        stats.loadCount += keys.length
        stats.averageBatchSize = totalBatchSize / stats.batchCount
        stats.averageLoadTime = totalLoadTime / stats.batchCount

        // Count errors
        results.forEach(result => {
          if (result instanceof Error) {
            stats.errors++
          }
        })

        console.log(`✅ DataLoader batch completed for ${name} in ${duration}ms`)
        return results
      } catch (error) {
        const duration = Date.now() - start
        console.error(`❌ DataLoader batch failed for ${name} after ${duration}ms`)
        stats.errors += keys.length
        throw error
      }
    }

    // Create the DataLoader instance
    const loader = new DataLoader(instrumentedBatchFn, {
      maxBatchSize,
      cache,
      ...config,
    })

    return {
      load: (key: K) =>
        Effect.tryPromise({
          try: async () => {
            const result = await loader.load(key)
            if (result instanceof Error) {
              throw result
            }
            return result
          },
          catch: (error) => error as Error,
        }),

      loadMany: (keys: ReadonlyArray<K>) =>
        Effect.tryPromise({
          try: () => loader.loadMany(Array.from(keys)),
          catch: (error) => error as Error,
        }),

      clear: (key: K) =>
        Effect.sync(() => {
          loader.clear(key)
        }),

      clearAll: () =>
        Effect.sync(() => {
          loader.clearAll()
        }),

      prime: (key: K, value: V) =>
        Effect.sync(() => {
          loader.prime(key, value)
        }),

      getStats: () => stats,
    }
  })

/**
 * Create a DataLoader factory for different entity types
 */
export const createDataLoaderFactory = () => {
  const loaders = new Map<string, FederatedDataLoader>()

  return {
    /**
     * Get or create a DataLoader for a specific entity type
     */
    getLoader: <K = unknown, V = unknown>(
      entityType: string,
      config: DataLoaderConfig<K, V>
    ): Effect.Effect<FederatedDataLoader<K, V>, never, never> =>
      Effect.gen(function* () {
        const existing = loaders.get(entityType)
        if (existing) {
          return existing as FederatedDataLoader<K, V>
        }

        const loader = yield* createFederatedDataLoader({
          ...config,
          name: entityType,
        })
        
        loaders.set(entityType, loader as FederatedDataLoader)
        return loader
      }),

    /**
     * Clear all DataLoaders
     */
    clearAll: () =>
      Effect.gen(function* () {
        for (const loader of loaders.values()) {
          yield* loader.clearAll()
        }
      }),

    /**
     * Get aggregated statistics
     */
    getStats: () => {
      const aggregated: DataLoaderStats = {
        batchCount: 0,
        loadCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageBatchSize: 0,
        averageLoadTime: 0,
        errors: 0,
      }

      for (const loader of loaders.values()) {
        const stats = loader.getStats()
        aggregated.batchCount += stats.batchCount
        aggregated.loadCount += stats.loadCount
        aggregated.cacheHits += stats.cacheHits
        aggregated.cacheMisses += stats.cacheMisses
        aggregated.errors += stats.errors
      }

      if (aggregated.batchCount > 0) {
        // Calculate weighted averages
        let totalBatchSize = 0
        let totalLoadTime = 0
        
        for (const loader of loaders.values()) {
          const stats = loader.getStats()
          totalBatchSize += stats.averageBatchSize * stats.batchCount
          totalLoadTime += stats.averageLoadTime * stats.batchCount
        }
        
        aggregated.averageBatchSize = totalBatchSize / aggregated.batchCount
        aggregated.averageLoadTime = totalLoadTime / aggregated.batchCount
      }

      return aggregated
    },
  }
}

/**
 * Create a DataLoader for reference resolution
 */
export const createReferenceLoader = <T extends { id: string | number }>(
  serviceName: string,
  fetchFn: (ids: ReadonlyArray<string | number>) => Promise<ReadonlyArray<T | null>>
): Effect.Effect<FederatedDataLoader<string | number, T>, never, never> =>
  createFederatedDataLoader({
    name: `${serviceName}-references`,
    batchFn: async (keys) => {
      try {
        const results = await fetchFn(keys)
        return results.map(r => r || new Error('Not found'))
      } catch (error) {
        return keys.map(() => error as Error)
      }
    },
    cacheKeyFn: (key) => String(key),
  })

/**
 * Create a DataLoader with TTL caching
 */
export const createTTLDataLoader = <K = unknown, V = unknown>(
  config: DataLoaderConfig<K, V> & { ttl: Duration.Duration }
): Effect.Effect<FederatedDataLoader<K, V>, never, never> => {
  // Custom cache map with TTL
  class TTLCacheMap<K, V> implements DataLoader.CacheMap<K, Promise<V>> {
    private cache = new Map<K, { value: Promise<V>; expiry: number }>()
    private ttlMs: number

    constructor(ttl: Duration.Duration) {
      this.ttlMs = Duration.toMillis(ttl)
    }

    get(key: K): Promise<V> | undefined {
      const entry = this.cache.get(key)
      if (!entry) return undefined
      
      if (Date.now() > entry.expiry) {
        this.cache.delete(key)
        return undefined
      }
      
      return entry.value
    }

    set(key: K, value: Promise<V>): this {
      this.cache.set(key, {
        value,
        expiry: Date.now() + this.ttlMs,
      })
      return this
    }

    delete(key: K): boolean {
      return this.cache.delete(key)
    }

    clear(): void {
      this.cache.clear()
    }
  }

  return createFederatedDataLoader({
    ...config,
    cacheMap: new TTLCacheMap(config.ttl),
  })
}

/**
 * Batch multiple DataLoader operations
 */
export const batchLoaderOperations = <K, V>(
  loader: FederatedDataLoader<K, V>,
  operations: ReadonlyArray<{ type: 'load' | 'prime'; key: K; value?: V }>
): Effect.Effect<ReadonlyArray<V | Error>, Error> =>
  Effect.gen(function* () {
    const results: Array<V | Error> = []
    
    for (const op of operations) {
      if (op.type === 'load') {
        try {
          const value = yield* loader.load(op.key)
          results.push(value)
        } catch (error) {
          results.push(error as Error)
        }
      } else if (op.type === 'prime' && op.value !== undefined) {
        yield* loader.prime(op.key, op.value)
      }
    }
    
    return results
  })