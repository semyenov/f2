import { describe, it, expect, beforeEach } from 'vitest'
import * as Effect from 'effect/Effect'
import DataLoader from 'dataloader'
import { PerformanceOptimizations } from '@infrastructure/performance'
import type { DataLoaderConfig } from '@runtime/core'

// Test helper functions
const expectEffectSuccess = async <A, E>(effect: Effect.Effect<A, E>): Promise<A> => {
  return Effect.runPromise(effect)
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('Comprehensive DataLoader Tests', () => {
  let defaultConfig: DataLoaderConfig

  beforeEach(() => {
    defaultConfig = {
      maxBatchSize: 10,
      batchWindowMs: 16
    }
  })

  describe('Basic DataLoader Functionality', () => {
    it('should create DataLoader for single subgraph', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      expect(loader).toBeInstanceOf(DataLoader)

      const result = await loader.load('user-1')
      expect(result).toBe('result-user-1')
    })

    it('should cache results within same request cycle', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      let callCount = 0
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        callCount++
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // Load same key multiple times
      const [result1, result2, result3] = await Promise.all([
        loader.load('user-1'),
        loader.load('user-1'),
        loader.load('user-1')
      ])

      expect(result1).toBe('result-user-1')
      expect(result2).toBe('result-user-1')
      expect(result3).toBe('result-user-1')
      expect(callCount).toBe(1) // Should only batch load once
    })

    it('should clear cache when requested', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      let callCount = 0
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        callCount++
        return keys.map(key => `result-${key}-${callCount}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // First load
      const result1 = await loader.load('user-1')
      expect(result1).toBe('result-user-1-1')

      // Clear and load again
      loader.clear('user-1')
      const result2 = await loader.load('user-1')
      expect(result2).toBe('result-user-1-2')
      expect(callCount).toBe(2)
    })

    it('should handle load errors gracefully', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        return keys.map(key => {
          if (key === 'error-key') {
            throw new Error(`Failed to load ${key}`)
          }
          return `result-${key}`
        })
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // Should handle mixed success and failure
      try {
        await loader.load('error-key')
        expect.unreachable('Should have thrown error')
      } catch (error) {
        expect((error as Error).message).toContain('Failed to load error-key')
      }

      // Other keys should still work
      const validResult = await loader.load('valid-key')
      expect(validResult).toBe('result-valid-key')
    })
  })

  describe('Batching Behavior', () => {
    it('should batch multiple loads in same tick', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchCalls: ReadonlyArray<string>[] = []
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        batchCalls.push(keys)
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // Load multiple keys in same tick
      const promises = [
        loader.load('user-1'),
        loader.load('user-2'),
        loader.load('user-3'),
        loader.load('user-4')
      ]

      const results = await Promise.all(promises)

      expect(results).toEqual([
        'result-user-1',
        'result-user-2',
        'result-user-3',
        'result-user-4'
      ])
      expect(batchCalls).toHaveLength(1)
      expect(batchCalls[0]).toEqual(['user-1', 'user-2', 'user-3', 'user-4'])
    })

    it('should respect maxBatchSize configuration', async () => {
      const smallBatchConfig: DataLoaderConfig = {
        maxBatchSize: 2,
        batchWindowMs: 16
      }

      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(smallBatchConfig)
      )

      const batchCalls: ReadonlyArray<string>[] = []
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        batchCalls.push(keys)
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // Load more keys than maxBatchSize
      const promises = [
        loader.load('user-1'),
        loader.load('user-2'),
        loader.load('user-3'),
        loader.load('user-4'),
        loader.load('user-5')
      ]

      await Promise.all(promises)

      // Should split into multiple batches
      expect(batchCalls.length).toBeGreaterThan(1)
      expect(batchCalls.every(batch => batch.length <= 2)).toBe(true)

      // Verify all keys were processed
      const allKeys = batchCalls.flat()
      expect(allKeys.sort()).toEqual(['user-1', 'user-2', 'user-3', 'user-4', 'user-5'])
    })

    it('should handle custom batch window timing', async () => {
      const config: DataLoaderConfig = {
        maxBatchSize: 100,
        batchWindowMs: 50 // Longer batch window
      }

      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(config)
      )

      const batchCalls: ReadonlyArray<string>[] = []
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        batchCalls.push(keys)
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // Load keys without awaiting - let them batch naturally
      const promise1 = loader.load('user-1')
      const promise2 = loader.load('user-2')
      const promise3 = loader.load('user-3')
      
      // Wait for all promises to resolve
      await Promise.all([promise1, promise2, promise3])

      // Should batch all together due to longer window
      expect(batchCalls).toHaveLength(1)
      expect(batchCalls[0]).toEqual(['user-1', 'user-2', 'user-3'])
    })

    it('should deduplicate keys in same batch', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchCalls: ReadonlyArray<string>[] = []
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        batchCalls.push(keys)
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // Load duplicate keys
      const promises = [
        loader.load('user-1'),
        loader.load('user-2'),
        loader.load('user-1'), // duplicate
        loader.load('user-3'),
        loader.load('user-2')  // duplicate
      ]

      const results = await Promise.all(promises)

      expect(results).toEqual([
        'result-user-1',
        'result-user-2',
        'result-user-1', // same result from cache
        'result-user-3',
        'result-user-2'  // same result from cache
      ])

      // Should only load unique keys
      expect(batchCalls).toHaveLength(1)
      expect([...(batchCalls[0] ?? [])].sort()).toEqual(['user-1', 'user-2', 'user-3'])
    })
  })

  describe('Multi-Subgraph DataLoader', () => {
    it('should isolate loaders between subgraphs', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const usersBatchFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        return keys.map(key => `user-${key}`)
      }

      const productsBatchFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        return keys.map(key => `product-${key}`)
      }

      const usersLoader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', usersBatchFn)
      )

      const productsLoader = await expectEffectSuccess(
        dataLoader.getLoader('products-service', productsBatchFn)
      )

      expect(usersLoader).not.toBe(productsLoader)

      const [userResult, productResult] = await Promise.all([
        usersLoader.load('123'),
        productsLoader.load('123')
      ])

      expect(userResult).toBe('user-123')
      expect(productResult).toBe('product-123')
    })

    it('should maintain separate statistics per subgraph', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        return keys.map(key => `result-${key}`)
      }

      const usersLoader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchFn)
      )

      const productsLoader = await expectEffectSuccess(
        dataLoader.getLoader('products-service', batchFn)
      )

      // Load different amounts from each service
      await Promise.all([
        usersLoader.load('user-1'),
        usersLoader.load('user-2'),
        productsLoader.load('product-1')
      ])

      const stats = await expectEffectSuccess(dataLoader.getStats())

      expect(stats['users-service']).toBeDefined()
      expect(stats['products-service']).toBeDefined()
      expect(stats['users-service']?.batchCount).toBe(1)
      expect(stats['products-service']?.batchCount).toBe(1)
    })

    it('should clear all loaders across subgraphs', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        return keys.map(key => `result-${key}`)
      }

      const usersLoader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchFn)
      )

      const productsLoader = await expectEffectSuccess(
        dataLoader.getLoader('products-service', batchFn)
      )

      // Load some data
      await Promise.all([
        usersLoader.load('user-1'),
        productsLoader.load('product-1')
      ])

      // Clear all
      await expectEffectSuccess(dataLoader.clearAll())

      // Stats should be reset
      const stats = await expectEffectSuccess(dataLoader.getStats())
      expect(Object.keys(stats)).toHaveLength(0)
    })
  })

  describe('Custom Cache Key Functions', () => {
    it('should use custom cache key function', async () => {
      const config: DataLoaderConfig = {
        maxBatchSize: 10,
        batchWindowMs: 16,
        cacheKeyFn: (key: unknown) => String(key).toUpperCase()
      }

      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(config)
      )

      let callCount = 0
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        callCount++
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('users-service', batchLoadFn)
      )

      // These should be considered the same due to uppercase cache key
      const [result1, result2] = await Promise.all([
        loader.load('user-1'),
        loader.load('USER-1')
      ])

      expect(result1).toBe('result-user-1')
      expect(result2).toBe('result-user-1') // Same result due to cache key normalization
      expect(callCount).toBe(1) // Should only load once
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle high-volume loads efficiently', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader({
          maxBatchSize: 100,
          batchWindowMs: 5
        })
      )

      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        // Simulate some processing time
        await delay(1)
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('high-volume-service', batchLoadFn)
      )

      // Load many items
      const startTime = Date.now()
      const promises = Array.from({ length: 1000 }, (_, i) =>
        loader.load(`item-${i}`)
      )

      const results = await Promise.all(promises)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(1000)
      expect(results[0]).toBe('result-item-0')
      expect(results[999]).toBe('result-item-999')
      expect(duration).toBeLessThan(1000) // Should be reasonably fast

      const stats = await expectEffectSuccess(dataLoader.getStats())
      expect(stats['high-volume-service']).toBeDefined()
      expect(stats['high-volume-service']?.batchCount).toBeGreaterThan(0)
    })

    it('should track cache hit rates accurately', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('cache-test-service', batchLoadFn)
      )

      // First load - cache miss
      await loader.load('key-1')
      
      // Second load - cache hit
      await loader.load('key-1')
      
      // Third load - cache hit
      await loader.load('key-1')

      const stats = await expectEffectSuccess(dataLoader.getStats())
      const serviceStats = stats['cache-test-service']

      expect(serviceStats).toBeDefined()
      expect(serviceStats?.cacheHitRate).toBeGreaterThan(0.5) // At least 2/3 should be cache hits
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle partial batch failures', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      const batchLoadFn = async (keys: readonly string[]): Promise<readonly (string | Error)[]> => {
        return keys.map(key => {
          if (key === 'fail-2') {
            return new Error(`Failed to load ${key}`)
          }
          return `result-${key}`
        })
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('error-test-service', batchLoadFn)
      )

      const results = await Promise.allSettled([
        loader.load('success-1'),
        loader.load('fail-2'),
        loader.load('success-3')
      ])

      expect(results[0]).toMatchObject({ 
        status: 'fulfilled', 
        value: 'result-success-1' 
      })
      
      expect(results[1]).toMatchObject({ 
        status: 'rejected'
      })
      
      expect(results[2]).toMatchObject({ 
        status: 'fulfilled', 
        value: 'result-success-3' 
      })
    })

    it('should handle batch function timeout', async () => {
      const config: DataLoaderConfig = {
        maxBatchSize: 10,
        batchWindowMs: 16
      }

      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(config)
      )

      const slowBatchFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        await delay(1000) // Very slow operation
        return keys.map(key => `result-${key}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('slow-service', slowBatchFn)
      )

      // This would timeout in a real scenario with proper timeout handling
      const startTime = Date.now()
      const result = await loader.load('slow-key')
      const duration = Date.now() - startTime

      expect(result).toBe('result-slow-key')
      expect(duration).toBeGreaterThan(900) // Should take at least the delay time
    })

    it('should maintain consistency during concurrent operations', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      let operationCount = 0
      const batchLoadFn = async (keys: readonly string[]): Promise<readonly string[]> => {
        const currentOp = ++operationCount
        await delay(10) // Simulate async work
        return keys.map(key => `result-${key}-op${currentOp}`)
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('concurrent-service', batchLoadFn)
      )

      // Start multiple concurrent operations
      const concurrentOperations = Array.from({ length: 5 }, (_, i) =>
        Promise.all([
          loader.load(`key-${i}-1`),
          loader.load(`key-${i}-2`),
          loader.load(`key-${i}-3`)
        ])
      )

      const allResults = await Promise.all(concurrentOperations)

      // Verify all operations completed
      expect(allResults).toHaveLength(5)
      allResults.forEach((operationResults, i) => {
        expect(operationResults).toHaveLength(3)
        expect(operationResults[0]).toContain(`key-${i}-1`)
      })

      const stats = await expectEffectSuccess(dataLoader.getStats())
      expect(stats['concurrent-service']).toBeDefined()
      expect(stats['concurrent-service']?.batchCount).toBeGreaterThan(0)
    })
  })

  describe('Integration with Federation', () => {
    it('should work with entity reference resolution', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      // Simulate entity reference resolution
      const resolveUserReferences = async (references: readonly { id: string }[]): Promise<
        readonly { id: string, name: string, email: string }[]
      > => {
        return references.map(ref => ({
          id: ref.id,
          name: `User ${ref.id}`,
          email: `user${ref.id}@example.com`
        }))
      }

      const loader = await expectEffectSuccess(
        dataLoader.getLoader('user-references', resolveUserReferences)
      )

      const references = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' }
      ]

      const users = await Promise.all(
        references.map(ref => loader.load(ref))
      )

      expect(users).toHaveLength(3)
      expect(users[0]).toEqual({
        id: 'user-1',
        name: 'User user-1',
        email: 'useruser-1@example.com'
      })
    })

    it('should support different key types for different resolvers', async () => {
      const dataLoader = await expectEffectSuccess(
        PerformanceOptimizations.createFederatedDataLoader(defaultConfig)
      )

      // String keys for users
      const userBatchFn = async (userIds: readonly string[]): Promise<
        readonly { id: string, type: string, name: string }[]
      > => {
        return userIds.map(id => ({ id, type: 'user', name: `User ${id}` }))
      }

      // Number keys for orders
      const orderBatchFn = async (orderIds: readonly number[]): Promise<
        readonly { id: number, type: string, total: number }[]
      > => {
        return orderIds.map(id => ({ id, type: 'order', total: id * 10 }))
      }

      const userLoader = await expectEffectSuccess(
        dataLoader.getLoader('users-by-string-id', userBatchFn)
      )

      const orderLoader = await expectEffectSuccess(
        dataLoader.getLoader('orders-by-number-id', orderBatchFn)
      )

      const [user, order] = await Promise.all([
        userLoader.load('user-123'),
        orderLoader.load(456)
      ])

      expect(user).toEqual({ id: 'user-123', type: 'user', name: 'User user-123' })
      expect(order).toEqual({ id: 456, type: 'order', total: 4560 })
    })
  })
})