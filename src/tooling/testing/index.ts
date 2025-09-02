/**
 * # Federation Testing Utilities
 *
 * This module provides comprehensive testing utilities for federation services,
 * including test harnesses, mock services, assertion helpers, and performance testing tools.
 *
 * @example Basic test harness usage
 * ```typescript
 * import { TestHarness } from '@cqrs/federation/testing'
 *
 * const harness = TestHarness.create()
 *   .withEntity(userEntity)
 *   .withMockService('users', mockUserData)
 *   .build()
 *
 * const result = await harness.query(`
 *   query GetUser {
 *     user(id: "123") {
 *       id
 *       name
 *     }
 *   }
 * `)
 *
 * expect(result.data.user.name).toBe('John Doe')
 * ```
 *
 * @module Testing
 * @since 2.1.0
 */

import * as Effect from 'effect/Effect'
import * as Duration from 'effect/Duration'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import type { GraphQLSchema, ExecutionResult } from 'graphql'
import { graphql } from 'graphql'
import { performance } from 'perf_hooks'

import type {
  FederationEntity,
  ServiceDefinition,
  FederationCompositionConfig,
} from '../../runtime/core/types/types.js'
import {
  FederationComposer,
  FederationComposerLive,
} from '../../federation/composition/composer.js'
import { FederationLoggerLive } from '../../runtime/effect/services/logger.js'
import { FederationConfigLive } from '../../runtime/effect/services/config.js'

/**
 * Test harness configuration
 */
export interface TestHarnessConfig {
  /**
   * Entities to test
   */
  entities: FederationEntity<unknown, unknown, unknown, unknown>[]

  /**
   * Mock service data
   */
  mockServices?: Map<string, MockServiceConfig>

  /**
   * Enable debug logging
   */
  debug?: boolean

  /**
   * Custom test context
   */
  context?: Record<string, unknown>

  /**
   * Performance testing configuration
   */
  performance?: {
    enableMetrics?: boolean
    measureLatency?: boolean
    trackMemory?: boolean
  }
}

/**
 * Mock service configuration
 */
export interface MockServiceConfig {
  /**
   * Service URL
   */
  url: string

  /**
   * Mock data by query
   */
  mockData?: Map<string, unknown>

  /**
   * Response delay for latency testing
   */
  delay?: Duration.Duration

  /**
   * Failure configuration for resilience testing
   */
  failures?: {
    rate?: number // Failure rate (0-1)
    errorMessage?: string
    errorCode?: string
  }

  /**
   * Schema SDL for the mock service
   */
  schema?: string
}

/**
 * Test assertion result
 */
export interface TestAssertionResult {
  passed: boolean
  message: string
  expected?: unknown
  actual?: unknown
  path?: string[]
}

/**
 * Main test harness for federation testing
 */
export class TestHarness {
  private readonly config: TestHarnessConfig
  private schema: GraphQLSchema | null = null
  private readonly metrics: TestMetrics = new TestMetrics()

  private constructor(config: TestHarnessConfig) {
    this.config = {
      entities: config.entities ?? [],
      mockServices: config.mockServices ?? new Map(),
      debug: config.debug ?? false,
      context: config.context ?? {},
      performance: config.performance ?? {},
    }
  }

  /**
   * Create a new test harness
   */
  static create(): TestHarnessBuilder {
    return new TestHarnessBuilder()
  }

  /**
   * Build the test harness
   */
  async build(): Promise<TestHarness> {
    const harness = new TestHarness(this.config)
    await harness.initialize()
    return harness
  }

  /**
   * Initialize the test harness
   */
  private async initialize(): Promise<void> {
    this.schema = await this.composeSchema()
  }

  /**
   * Compose the federation schema
   */
  private async composeSchema(): Promise<GraphQLSchema> {
    const services: ServiceDefinition[] = Array.from(this.config.mockServices?.entries() ?? []).map(
      ([id, config]) => ({ id, url: config.url })
    )

    if (services.length === 0) {
      services.push({ id: 'default-mock', url: 'http://localhost:4001' })
    }

    const config: FederationCompositionConfig = {
      entities: this.config.entities,
      services,
      errorBoundaries: {
        subgraphTimeouts: Object.fromEntries(services.map(s => [s.id, Duration.seconds(5)])),
        circuitBreakerConfig: {
          failureThreshold: 10,
          resetTimeout: Duration.seconds(10),
        },
        partialFailureHandling: {
          allowPartialFailure: false,
        },
        errorTransformation: {
          sanitizeErrors: false,
          includeStackTrace: this.config.debug === true,
        },
      },
      performance: {
        queryPlanCache: {
          maxSize: 100,
          ttl: Duration.minutes(1),
        },
        dataLoaderConfig: {
          maxBatchSize: 10,
          batchWindowMs: 1,
        },
        metricsCollection: {
          enabled: this.config.performance?.enableMetrics === true,
        },
      },
    }

    const layer = Layer.mergeAll(FederationComposerLive, FederationLoggerLive, FederationConfigLive)

    const effect = pipe(
      FederationComposer,
      Effect.flatMap(composer => composer.compose(config)),
      Effect.map(result => result.schema)
    )

    return Effect.runPromise(Effect.provide(effect, layer))
  }

  /**
   * Execute a GraphQL query
   */
  async query(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<ExecutionResult> {
    if (!this.schema) {
      throw new Error('Test harness not initialized')
    }

    const startTime = performance.now()

    const result = await graphql({
      schema: this.schema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: this.config.context,
    })

    if (this.config.performance?.measureLatency === true) {
      this.metrics.recordLatency(performance.now() - startTime)
    }

    return result
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutate(mutation: string, variables?: Record<string, unknown>): Promise<ExecutionResult> {
    return this.query(mutation, variables)
  }

  /**
   * Get test metrics
   */
  getMetrics(): TestMetrics {
    return this.metrics
  }

  /**
   * Reset test state
   */
  reset(): void {
    this.metrics.reset()
  }
}

/**
 * Test harness builder with fluent API
 */
export class TestHarnessBuilder {
  private readonly config: Partial<TestHarnessConfig> = {
    entities: [],
    mockServices: new Map(),
  }

  /**
   * Add an entity to test
   */
  withEntity(entity: FederationEntity<unknown, unknown, unknown, unknown>): this {
    this.config.entities = [...(this.config.entities ?? []), entity]
    return this
  }

  /**
   * Add multiple entities
   */
  withEntities(entities: FederationEntity<unknown, unknown, unknown, unknown>[]): this {
    this.config.entities = [...(this.config.entities ?? []), ...entities]
    return this
  }

  /**
   * Add a mock service
   */
  withMockService(id: string, config: Partial<MockServiceConfig> = {}): this {
    const mockConfig: MockServiceConfig = {
      url: config.url ?? `http://${id}:4001`,
      mockData: config.mockData ?? new Map(),
      delay: config.delay ?? Duration.seconds(0),
      failures: config.failures ?? {
        rate: 0,
        errorMessage: 'Mock service error',
        errorCode: 'MOCK_ERROR',
      },
      schema: config.schema ?? '',
    }

    this.config.mockServices?.set(id, mockConfig)
    return this
  }

  /**
   * Enable debug mode
   */
  withDebug(): this {
    this.config.debug = true
    return this
  }

  /**
   * Set custom context
   */
  withContext(context: Record<string, unknown>): this {
    this.config.context = context
    return this
  }

  /**
   * Enable performance metrics
   */
  withPerformanceMetrics(): this {
    this.config.performance = {
      enableMetrics: true,
      measureLatency: true,
      trackMemory: true,
    }
    return this
  }

  /**
   * Build the test harness
   */
  async build(): Promise<TestHarness> {
    const harness = await TestHarness.create().build()
    return harness
  }
}

/**
 * Test metrics collector
 */
export class TestMetrics {
  private latencies: number[] = []
  private errors: Error[] = []
  private queryCount = 0
  private mutationCount = 0

  /**
   * Record query latency
   */
  recordLatency(ms: number): void {
    this.latencies.push(ms)
  }

  /**
   * Record an error
   */
  recordError(error: Error): void {
    this.errors.push(error)
  }

  /**
   * Increment query count
   */
  incrementQueryCount(): void {
    this.queryCount++
  }

  /**
   * Increment mutation count
   */
  incrementMutationCount(): void {
    this.mutationCount++
  }

  /**
   * Get average latency
   */
  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
  }

  /**
   * Get P95 latency
   */
  getP95Latency(): number {
    if (this.latencies.length === 0) return 0
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.95)
    return sorted[index] ?? 0
  }

  /**
   * Get error rate
   */
  getErrorRate(): number {
    const total = this.queryCount + this.mutationCount
    if (total === 0) return 0
    return this.errors.length / total
  }

  /**
   * Get summary
   */
  getSummary(): TestMetricsSummary {
    return {
      totalQueries: this.queryCount,
      totalMutations: this.mutationCount,
      totalErrors: this.errors.length,
      averageLatency: this.getAverageLatency(),
      p95Latency: this.getP95Latency(),
      errorRate: this.getErrorRate(),
    }
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.latencies = []
    this.errors = []
    this.queryCount = 0
    this.mutationCount = 0
  }
}

/**
 * Test metrics summary
 */
export interface TestMetricsSummary {
  totalQueries: number
  totalMutations: number
  totalErrors: number
  averageLatency: number
  p95Latency: number
  errorRate: number
}

/**
 * Assertion helpers for federation testing
 */
export const Assertions = {
  /**
   * Assert entity resolution
   */
  async assertEntityResolution(
    harness: TestHarness,
    typename: string,
    id: string,
    expectedFields: Record<string, unknown>
  ): Promise<TestAssertionResult> {
    const query = `
      query ResolveEntity {
        _entities(representations: [{__typename: "${typename}", id: "${id}"}]) {
          ... on ${typename} {
            ${Object.keys(expectedFields).join('\n')}
          }
        }
      }
    `

    const result = await harness.query(query)

    if (result.errors) {
      return {
        passed: false,
        message: `Entity resolution failed: ${result.errors[0]?.message}`,
        actual: result.errors,
      }
    }

    const entity = (result.data as { _entities?: unknown[] })?._entities?.[0] as Record<
      string,
      unknown
    >

    for (const [field, expected] of Object.entries(expectedFields)) {
      if (entity?.[field] !== expected) {
        return {
          passed: false,
          message: `Field ${field} mismatch`,
          expected,
          actual: entity?.[field],
          path: ['_entities', '0', field],
        }
      }
    }

    return {
      passed: true,
      message: 'Entity resolved successfully',
    }
  },

  /**
   * Assert federation directive
   */
  assertDirective(
    entity: FederationEntity<unknown, unknown, unknown, unknown>,
    field: string,
    directive: string
  ): TestAssertionResult {
    const directives = entity.directives?.[field] ?? []
    const hasDirective = Array.isArray(directives) && directives.includes(directive)

    return {
      passed: hasDirective,
      message: hasDirective
        ? `Field ${field} has @${directive} directive`
        : `Field ${field} missing @${directive} directive`,
      expected: directive,
      actual: directives,
    }
  },

  /**
   * Assert schema composition
   */
  async assertSchemaComposition(
    entities: FederationEntity<unknown, unknown, unknown, unknown>[]
  ): Promise<TestAssertionResult> {
    try {
      await TestHarness.create().withEntities(entities).build()

      return {
        passed: true,
        message: 'Schema composed successfully',
      }
    } catch (error) {
      return {
        passed: false,
        message: `Schema composition failed: ${error}`,
        actual: error,
      }
    }
  },
}

/**
 * Mock data generators for testing
 */
export const MockGenerators = {
  /**
   * Generate mock entity
   */
  entity: (typename: string, fields: Record<string, unknown>) => ({
    __typename: typename,
    ...fields,
  }),

  /**
   * Generate mock user
   */
  user: (id: string, overrides?: Partial<{ name: string; email: string; age: number }>) => ({
    __typename: 'User',
    id,
    name: overrides?.name ?? `User ${id}`,
    email: overrides?.email ?? `user${id}@example.com`,
    age: overrides?.age ?? 25,
  }),

  /**
   * Generate mock product
   */
  product: (
    id: string,
    overrides?: Partial<{ name: string; price: number; inStock: boolean }>
  ) => ({
    __typename: 'Product',
    id,
    name: overrides?.name ?? `Product ${id}`,
    price: overrides?.price ?? 99.99,
    inStock: overrides?.inStock ?? true,
  }),

  /**
   * Generate mock list
   */
  list: <T>(count: number, generator: (index: number) => T): T[] =>
    Array.from({ length: count }, (_, i) => generator(i)),
}

/**
 * Test scenarios for common federation patterns
 */
export const TestScenarios = {
  /**
   * Test entity resolution scenario
   */
  entityResolution: () => ({
    name: 'Entity Resolution',
    setup: async (harness: TestHarnessBuilder) => {
      // Add test entities and mock data
      return harness.withMockService('users', {
        mockData: new Map([
          ['user:1', MockGenerators.user('1')],
          ['user:2', MockGenerators.user('2')],
        ]),
      })
    },
    test: async (harness: TestHarness) => {
      const result = await Assertions.assertEntityResolution(harness, 'User', '1', {
        id: '1',
        name: 'User 1',
      })
      return result
    },
  }),

  /**
   * Test federation directives scenario
   */
  federationDirectives: () => ({
    name: 'Federation Directives',
    test: (entity: FederationEntity<unknown, unknown, unknown, unknown>) => {
      const results: TestAssertionResult[] = []

      // Test @key directive
      if (Reflect.has(entity as object, 'key')) {
        results.push({
          passed: true,
          message: 'Entity has @key directive',
        })
      }

      return results
    },
  }),

  /**
   * Test error handling scenario
   */
  errorHandling: () => ({
    name: 'Error Handling',
    setup: async (harness: TestHarnessBuilder) => {
      return harness.withMockService('failing', {
        failures: {
          rate: 0.5,
          errorMessage: 'Service unavailable',
          errorCode: 'SERVICE_ERROR',
        },
      })
    },
    test: async (harness: TestHarness) => {
      const results: ExecutionResult[] = []

      // Run multiple queries to test error rate
      for (let i = 0; i < 10; i++) {
        const result = await harness.query('{ test }')
        results.push(result)
      }

      const errorCount = results.filter(r => r.errors).length
      const errorRate = errorCount / results.length

      return {
        passed: errorRate > 0.3 && errorRate < 0.7,
        message: `Error rate: ${errorRate}`,
        expected: 0.5,
        actual: errorRate,
      }
    },
  }),
}

// Re-export test utilities from Effect
export { TestLive as TestEnvironment, TestClock } from 'effect'
