import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Context from "effect/Context"
import * as Logger from "effect/Logger"
import type {
  ServiceDefinition,
  HealthStatus
} from "../../src/core/types.js"

/**
 * Test layer compositions and service mocks for testing
 */

// Mock Logger Service
export class MockLogger extends Context.Tag("MockLogger")<
  MockLogger,
  {
    readonly logs: ReadonlyArray<{ level: string; message: string; meta?: any }>
    readonly trace: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly debug: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly info: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly warn: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly error: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly withSpan: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    readonly clearLogs: () => Effect.Effect<void>
  }
>() {}

// Mock logger implementation
const makeMockLogger = Effect.gen(function* () {
  let logs: Array<{ level: string; message: string; meta?: any }> = []

  const log = (level: string) => (message: string, meta?: Record<string, unknown>) =>
    Effect.sync(() => {
      logs.push({ level, message, meta })
    })

  return {
    logs: logs as ReadonlyArray<{ level: string; message: string; meta?: any }>,
    trace: log("trace"),
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    withSpan: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) =>
      Effect.gen(function* () {
        yield* Effect.sync(() => logs.push({ level: "span", message: `Starting span: ${name}` }))
        const result = yield* effect
        yield* Effect.sync(() => logs.push({ level: "span", message: `Ending span: ${name}` }))
        return result
      }),
    clearLogs: () => Effect.sync(() => { logs = [] })
  }
})

export const MockLoggerLive = Layer.effect(MockLogger, makeMockLogger)

// Mock Config Service
export class MockConfig extends Context.Tag("MockConfig")<
  MockConfig,
  {
    readonly get: <T>(key: string, defaultValue?: T) => T
    readonly set: <T>(key: string, value: T) => Effect.Effect<void>
    readonly environment: string
  }
>() {}

const makeMockConfig = Effect.gen(function* () {
  const config = new Map<string, any>()
  
  // Set default test values
  config.set("environment", "test")
  config.set("logLevel", "debug")
  config.set("enableMetrics", true)

  return {
    get: <T>(key: string, defaultValue?: T): T => {
      return config.get(key) ?? defaultValue
    },
    set: <T>(key: string, value: T) => Effect.sync(() => {
      config.set(key, value)
    }),
    environment: "test"
  }
})

export const MockConfigLive = Layer.effect(MockConfig, makeMockConfig)

// Mock Subgraph Registry
export class MockSubgraphRegistry extends Context.Tag("MockSubgraphRegistry")<
  MockSubgraphRegistry,
  {
    readonly services: ReadonlyArray<ServiceDefinition>
    readonly register: (definition: ServiceDefinition) => Effect.Effect<void>
    readonly unregister: (serviceId: string) => Effect.Effect<void>
    readonly discover: () => Effect.Effect<ReadonlyArray<ServiceDefinition>>
    readonly health: (serviceId: string) => Effect.Effect<HealthStatus>
    readonly setHealthStatus: (serviceId: string, status: HealthStatus) => Effect.Effect<void>
    readonly simulateFailure: (serviceId: string, shouldFail: boolean) => Effect.Effect<void>
  }
>() {}

const makeMockSubgraphRegistry = Effect.gen(function* () {
  let services: ServiceDefinition[] = []
  let healthStatuses = new Map<string, HealthStatus>()
  let failureSimulations = new Map<string, boolean>()

  return {
    services: services as ReadonlyArray<ServiceDefinition>,
    register: (definition: ServiceDefinition) =>
      Effect.sync(() => {
        services = [...services.filter(s => s.id !== definition.id), definition]
        healthStatuses.set(definition.id, {
          status: "healthy",
          serviceId: definition.id,
          timestamp: new Date(),
          responseTime: 50
        })
      }),
    unregister: (serviceId: string) =>
      Effect.sync(() => {
        services = services.filter(s => s.id !== serviceId)
        healthStatuses.delete(serviceId)
        failureSimulations.delete(serviceId)
      }),
    discover: () => Effect.succeed(services as ReadonlyArray<ServiceDefinition>),
    health: (serviceId: string) =>
      Effect.gen(function* () {
        const shouldFail = failureSimulations.get(serviceId)
        if (shouldFail) {
          return yield* Effect.fail(new Error(`Health check failed for ${serviceId}`))
        }
        
        const status = healthStatuses.get(serviceId)
        if (!status) {
          return yield* Effect.fail(new Error(`Service ${serviceId} not found`))
        }
        
        return status
      }),
    setHealthStatus: (serviceId: string, status: HealthStatus) =>
      Effect.sync(() => {
        healthStatuses.set(serviceId, status)
      }),
    simulateFailure: (serviceId: string, shouldFail: boolean) =>
      Effect.sync(() => {
        failureSimulations.set(serviceId, shouldFail)
      })
  }
})

export const MockSubgraphRegistryLive = Layer.effect(MockSubgraphRegistry, makeMockSubgraphRegistry)

// Mock Circuit Breaker
export class MockCircuitBreaker extends Context.Tag("MockCircuitBreaker")<
  MockCircuitBreaker,
  {
    readonly state: "open" | "closed" | "half-open"
    readonly failureCount: number
    readonly execute: <A>(operation: Effect.Effect<A>) => Effect.Effect<A>
    readonly setState: (state: "open" | "closed" | "half-open") => Effect.Effect<void>
    readonly getMetrics: () => Effect.Effect<{ failureCount: number; successCount: number; state: string }>
    readonly reset: () => Effect.Effect<void>
  }
>() {}

const makeMockCircuitBreaker = Effect.gen(function* () {
  let state: "open" | "closed" | "half-open" = "closed"
  let failureCount = 0
  let successCount = 0

  return {
    state,
    failureCount,
    execute: <A>(operation: Effect.Effect<A>) =>
      Effect.gen(function* () {
        if (state === "open") {
          return yield* Effect.fail(new Error("Circuit breaker is open"))
        }

        try {
          const result = yield* operation
          successCount++
          if (state === "half-open") {
            state = "closed"
            failureCount = 0
          }
          return result
        } catch (error) {
          failureCount++
          if (failureCount >= 3) {
            state = "open"
          }
          return yield* Effect.fail(error)
        }
      }),
    setState: (newState: "open" | "closed" | "half-open") =>
      Effect.sync(() => {
        state = newState
      }),
    getMetrics: () => Effect.succeed({ failureCount, successCount, state }),
    reset: () =>
      Effect.sync(() => {
        state = "closed"
        failureCount = 0
        successCount = 0
      })
  }
})

export const MockCircuitBreakerLive = Layer.effect(MockCircuitBreaker, makeMockCircuitBreaker)

// Test layer compositions
export const TestServicesLive = Layer.mergeAll(
  MockLoggerLive,
  MockConfigLive,
  MockSubgraphRegistryLive,
  MockCircuitBreakerLive
)

// Minimal test layer
export const MinimalTestLive = Layer.mergeAll(
  MockLoggerLive,
  MockConfigLive
)

// Federation test layer (includes real services with mocked dependencies)  
export const FederationTestLive = Layer.mergeAll(
  TestServicesLive,
  Logger.none // Disable actual logging in tests
)

// Test utilities for layer management
export namespace TestLayers {
  export const withMockLogger = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Effect.provide(MockLoggerLive))

  export const withTestServices = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Effect.provide(TestServicesLive))

  export const withFederationTest = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Effect.provide(FederationTestLive))

  // Helper to run effect with automatic cleanup
  export const runWithCleanup = async <A, E>(
    effect: Effect.Effect<A, E>,
    layer: Layer.Layer<any> = TestServicesLive
  ): Promise<A> => {
    return Effect.runPromise(effect.pipe(Effect.provide(layer)))
  }

  // Helper to capture logs during test execution
  export const captureLogs = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const logger = yield* MockLogger
      yield* logger.clearLogs()
      const result = yield* effect
      const logs = logger.logs
      return { result, logs }
    }).pipe(Effect.provide(MockLoggerLive))

  // Helper to simulate service failures
  export const simulateServiceFailure = (serviceId: string, shouldFail: boolean = true) =>
    Effect.gen(function* () {
      const registry = yield* MockSubgraphRegistry
      yield* registry.simulateFailure(serviceId, shouldFail)
    })

  // Helper to verify service registration
  export const verifyServiceRegistered = (serviceId: string) =>
    Effect.gen(function* () {
      const registry = yield* MockSubgraphRegistry
      const services = registry.services
      return services.some(s => s.id === serviceId)
    })
}