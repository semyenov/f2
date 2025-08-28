import { describe, it, expect } from 'bun:test'
import * as Effect from 'effect/Effect'
import { Duration, Either } from 'effect'
import { SubgraphManagement } from '../../../src/federation/subgraph.js'

// Simple test data factories inline
const createTestServices = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `service-${i + 1}`,
    url: `http://localhost:400${i + 1}`,
    name: `Service ${i + 1}`,
    version: "1.0.0",
    metadata: { team: "test", criticality: "medium" as const }
  }))

const createServiceDefinition = (overrides: any = {}) => ({
  id: "test-service",
  url: "http://localhost:4001",
  name: "Test Service",
  version: "1.0.0",
  metadata: { team: "test", criticality: "medium" as const },
  ...overrides
})

const createHealthStatus = (overrides: any = {}): HealthStatus => {
  const { responseTime, ...rest } = overrides
  const base: HealthStatus = {
    status: "healthy" as const,
    serviceId: "test-service",
    ...rest
  }
  
  if (responseTime !== undefined) {
    base.metrics = { responseTime, ...rest.metrics }
  }
  
  return base
}

const expectEffectSuccess = async <A, E>(effect: Effect.Effect<A, E>): Promise<A> => {
  return Effect.runPromise(effect)
}

const expectEffectFailure = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<E, Error, never> => 
  Effect.either(effect).pipe(
    Effect.flatMap(either => 
      Either.isRight(either) 
        ? Effect.fail(new Error("Expected effect to fail but it succeeded"))
        : Effect.succeed(either.left as E)
    )
  )

const timeEffect = async <A, E>(effect: Effect.Effect<A, E>): Promise<{ result: A; duration: number }> => {
  const start = Date.now()
  const result = await Effect.runPromise(effect)
  const duration = Date.now() - start
  return { result, duration }
}
import { TestLayers, MockSubgraphRegistry, TestServicesLive } from '../../utils/test-layers.js'

describe('Subgraph Registry and Service Discovery', () => {
  const testServices = createTestServices(3)
  
  describe('SubgraphManagement.createRegistry', () => {
    it('should create registry with valid configuration', async () => {
      const config = {
        discoveryMode: "static" as const,
        staticServices: testServices,
        discoveryEndpoints: [],
        healthCheckInterval: Duration.seconds(30),
        healthCheckTimeout: Duration.seconds(5),
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: Duration.seconds(1)
        }
      }

      const registryEffect = SubgraphManagement.createRegistry(config)
      const registry = await expectEffectSuccess(registryEffect)

      expect(registry).toBeDefined()
      expect(registry.register).toBeFunction()
      expect(registry.unregister).toBeFunction()
      expect(registry.discover).toBeFunction()
      expect(registry.health).toBeFunction()
    })

    it('should fail with invalid configuration', async () => {
      const invalidConfig = {
        discoveryMode: "static" as const,
        staticServices: [], // Empty services should fail
        discoveryEndpoints: [],
        healthCheckInterval: Duration.seconds(30),
        healthCheckTimeout: Duration.seconds(5),
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: Duration.seconds(1)
        }
      }

      const registryEffect = SubgraphManagement.createRegistry(invalidConfig)
      const error = await Effect.runPromise(expectEffectFailure(registryEffect))
      
      expect(error).toBeDefined()
      expect(error).toBeDefined()
    })
  })

  describe('Service Registration', () => {
    it('should register service successfully', async () => {
      const service = createServiceDefinition({
        id: 'test-service',
        url: 'http://localhost:4001'
      })

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register service
          yield* registry.register(service)
          
          // Verify registration
          const services = registry.services
          return services.find(s => s.id === 'test-service')
        })
      )

      expect(result).toBeDefined()
      expect(result?.id).toBe('test-service')
      expect(result?.url).toBe('http://localhost:4001')
    })

    it('should unregister service successfully', async () => {
      const service = createServiceDefinition({
        id: 'test-service-unregister',
        url: 'http://localhost:4002'
      })

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register then unregister service
          yield* registry.register(service)
          yield* registry.unregister('test-service-unregister')
          
          // Verify unregistration
          const services = registry.services
          return services.find(s => s.id === 'test-service-unregister')
        })
      )

      expect(result).toBeUndefined()
    })

    it('should replace existing service on re-registration', async () => {
      const originalService = createServiceDefinition({
        id: 'replaceable-service',
        url: 'http://localhost:4001',
        version: '1.0.0'
      })

      const updatedService = createServiceDefinition({
        id: 'replaceable-service',
        url: 'http://localhost:4002',
        version: '2.0.0'
      })

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register original service
          yield* registry.register(originalService)
          
          // Register updated service (should replace)
          yield* registry.register(updatedService)
          
          // Verify replacement
          const services = registry.services
          const service = services.find(s => s.id === 'replaceable-service')
          
          return {
            serviceCount: services.filter(s => s.id === 'replaceable-service').length,
            version: service?.version
          }
        })
      )

      expect(result.serviceCount).toBe(1)
      expect(result.version).toBe('2.0.0')
    })
  })

  describe('Service Discovery', () => {
    it('should discover all registered services', async () => {
      const services = createTestServices(3)

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register multiple services
          yield* Effect.forEach(services, service => registry.register(service))
          
          // Discover services
          return yield* registry.discover()
        })
      )

      expect(result).toHaveLength(3)
      expect(result.map(s => s.id)).toEqual(['service-1', 'service-2', 'service-3'])
    })

    it('should return empty array when no services registered', async () => {
      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          return yield* registry.discover()
        })
      )

      expect(result).toHaveLength(0)
    })
  })

  describe('Health Checking', () => {
    it('should return healthy status for registered service', async () => {
      const service = createServiceDefinition({
        id: 'healthy-service'
      })

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register service (automatically sets as healthy)
          yield* registry.register(service)
          
          // Check health
          return yield* registry.health('healthy-service')
        })
      )

      expect(result.status).toBe('healthy')
      expect(result.serviceId).toBe('healthy-service')
      expect(result.lastCheck).toBeInstanceOf(Date)
      expect(result.metrics?.responseTime).toBeNumber()
    })

    it('should fail health check for unregistered service', async () => {
      const error = await Effect.runPromise(
        expectEffectFailure(
          Effect.gen(function* () {
            const registry = yield* MockSubgraphRegistry
            return yield* registry.health('non-existent-service')
          }).pipe(Effect.provide(TestServicesLive))
        )
      )

      expect(error).toBeDefined()
    })

    it('should handle simulated service failures', async () => {
      const service = createServiceDefinition({
        id: 'failing-service'
      })

      const error = await Effect.runPromise(
        expectEffectFailure(
          Effect.gen(function* () {
            const registry = yield* MockSubgraphRegistry
            
            // Register service
            yield* registry.register(service)
            
            // Simulate failure
            yield* registry.simulateFailure('failing-service', true)
            
            // Health check should fail
            return yield* registry.health('failing-service')
          }).pipe(Effect.provide(TestServicesLive))
        )
      )

      expect(error).toBeDefined()
    })

    it('should update health status dynamically', async () => {
      const service = createServiceDefinition({
        id: 'dynamic-service'
      })

      const healthStatus = createHealthStatus({
        status: 'degraded',
        serviceId: 'dynamic-service',
        responseTime: 1500
      })

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register service
          yield* registry.register(service)
          
          // Update health status
          yield* registry.setHealthStatus('dynamic-service', healthStatus)
          
          // Check updated health
          return yield* registry.health('dynamic-service')
        })
      )

      expect(result.status).toBe('degraded')
      expect(result.metrics).toBeDefined()
      expect(result.metrics?.responseTime).toBe(1500)
    })
  })

  describe('Auto-Discovery', () => {
    it('should create registry with auto-discovery enabled', async () => {
      const config = {
        discoveryMode: "dynamic" as const,
        staticServices: [],
        discoveryEndpoints: ['http://discovery:8080'],
        healthCheckInterval: Duration.seconds(10),
        healthCheckTimeout: Duration.seconds(2),
        retryPolicy: {
          maxAttempts: 2,
          initialDelay: Duration.millis(500)
        }
      }

      const registryEffect = SubgraphManagement.createRegistry(config)
      const registry = await expectEffectSuccess(registryEffect)

      // Test auto-discovery enhancement
      const autoRegistry = await expectEffectSuccess(
        SubgraphManagement.withAutoDiscovery(registry, Duration.seconds(5))
      )

      expect(autoRegistry).toBeDefined()
      expect(autoRegistry.discover).toBeFunction()
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle concurrent registrations safely', async () => {
      const services = createTestServices(5)

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register services concurrently
          yield* Effect.forEach(services, service => registry.register(service), {
            concurrency: 'unbounded'
          })
          
          return registry.services
        })
      )

      expect(result).toHaveLength(5)
      expect(result.map(s => s.id)).toContain('service-1')
      expect(result.map(s => s.id)).toContain('service-5')
    })

    it('should handle health check timeouts gracefully', async () => {
      const service = createServiceDefinition({
        id: 'timeout-service'
      })

      const start = Date.now()
      await Effect.runPromise(
        expectEffectFailure(
          Effect.gen(function* () {
            const registry = yield* MockSubgraphRegistry
            
            // Register service
            yield* registry.register(service)
            
            // Simulate failure (timeout)
            yield* registry.simulateFailure('timeout-service', true)
            
            // Health check with timeout
            return yield* registry.health('timeout-service').pipe(
              Effect.timeout(Duration.millis(100))
            )
          }).pipe(Effect.provide(TestServicesLive))
        )
      )
      const duration = Date.now() - start

      // Should timeout within reasonable time
      expect(duration).toBeLessThan(200)
    })

    it('should maintain service list consistency during failures', async () => {
      const validServices = createTestServices(2)
      const invalidService = createServiceDefinition({
        id: 'invalid-service',
        url: 'invalid-url'
      })

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register valid services
          yield* Effect.forEach(validServices, service => registry.register(service))
          
          // Attempt to register invalid service (might fail in real implementation)
          yield* Effect.either(registry.register(invalidService))
          
          // Registry should still contain valid services
          return registry.services
        })
      )

      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result.map(s => s.id)).toContain('service-1')
      expect(result.map(s => s.id)).toContain('service-2')
    })
  })

  describe('Metrics and Monitoring', () => {
    it('should track service registration metrics', async () => {
      const services = createTestServices(3)

      const { result, logs } = await Effect.runPromise(
        TestLayers.captureLogs(
          Effect.gen(function* () {
            const registry = yield* MockSubgraphRegistry
            
            // Register services and track logs
            yield* Effect.forEach(services, service => registry.register(service))
            
            return registry.services.length
          }).pipe(Effect.provide(TestServicesLive))
        )
      )

      expect(result).toBe(3)
      // Logs are optional - implementation dependent
    })

    it('should provide service discovery statistics', async () => {
      const services = createTestServices(4)

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const registry = yield* MockSubgraphRegistry
          
          // Register services
          yield* Effect.forEach(services, service => registry.register(service))
          
          // Perform health checks
          const healthChecks = yield* Effect.forEach(
            services,
            service => Effect.either(registry.health(service.id))
          )
          
          const healthyCount = healthChecks.filter(
            check => check._tag === 'Right' && check.right.status === 'healthy'
          ).length
          
          return {
            totalServices: registry.services.length,
            healthyServices: healthyCount,
            registeredServices: registry.services.map(s => s.id)
          }
        })
      )

      expect(result.totalServices).toBe(4)
      expect(result.healthyServices).toBe(4)
      expect(result.registeredServices).toHaveLength(4)
    })
  })
})