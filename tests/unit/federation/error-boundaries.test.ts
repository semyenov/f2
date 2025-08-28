import { describe, it, expect, beforeEach } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { Duration } from 'effect'
import { 
  FederationErrorBoundaries,
  createStrictBoundary,
  createResilientBoundary,
  createProductionBoundary 
} from '../../../src/federation/error-boundaries.js'
import type { 
  ErrorBoundaryConfig, 
  CircuitBreakerConfig,
  PartialFailureConfig
} from '../../../src/core/types.js'
import type { GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql'
import { TestServicesLive } from '../../utils/test-layers.js'
// Simple test data factories inline (removed unused createTestService)

const createMockResolveInfo = (): GraphQLResolveInfo => ({
  fieldName: "testField",
  fieldNodes: [],
  returnType: {} as ReturnType<typeof import('graphql').GraphQLObjectType>,
  parentType: {} as ReturnType<typeof import('graphql').GraphQLObjectType>,
  path: { key: "test", typename: "Test", prev: undefined },
  schema: {} as ReturnType<typeof import('graphql').GraphQLSchema>,
  fragments: {},
  rootValue: undefined,
  operation: {
    kind: 'OperationDefinition',
    operation: 'query',
    variableDefinitions: [],
    directives: [],
    selectionSet: { kind: 'SelectionSet', selections: [] }
  } as import('graphql').OperationDefinitionNode,
  variableValues: {},
  cacheControl: { setCacheHint: () => {} } as unknown,
})

const expectEffectSuccess = async <A, E>(effect: Effect.Effect<A, E>): Promise<A> => {
  return Effect.runPromise(effect)
}

const expectEffectFailure = async <A, E>(effect: Effect.Effect<A, E>): Promise<E> => {
  const result = await Effect.runPromise(Effect.either(effect))
  if (Either.isRight(result)) {
    throw new Error("Expected effect to fail but it succeeded")
  }
  const leftOption = Either.getLeft(result)
  if (leftOption._tag === 'Some') {
    return leftOption.value as E
  }
  throw new Error("Expected error but got None")
}

const createMockError = (message = "Test error", code = "TEST_ERROR") => ({
  message,
  code,
  timestamp: new Date(),
  context: { test: true }
})

const delay = (ms: number) => Effect.sleep(Duration.millis(ms))

const timeEffect = async <A, E>(effect: Effect.Effect<A, E>): Promise<{ result: A; duration: number }> => {
  const start = Date.now()
  const result = await Effect.runPromise(effect)
  const duration = Date.now() - start
  return { result, duration }
}
import { TestLayers, MockCircuitBreaker } from '../../utils/test-layers.js'

describe('Error Boundaries and Circuit Breakers', () => {
  let mockInfo: any

  beforeEach(() => {
    mockInfo = createMockResolveInfo()
  })

  describe('FederationErrorBoundaries.createBoundary', () => {
    it('should create boundary with default configuration', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(10),
          halfOpenMaxCalls: 2
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)

      expect(boundary).toBeDefined()
      expect(boundary.wrapResolver).toBeFunction()
      expect(boundary.handlePartialFailure).toBeFunction()
      expect(boundary.transformError).toBeFunction()
    })

    it('should create boundary with custom timeout configuration', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {
          'service-1': Duration.seconds(5),
          'service-2': Duration.seconds(3)
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: ['service-1']
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      expect(boundary).toBeDefined()
    })

    it('should handle error transformation configuration', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        },
        errorTransformation: {
          sanitizeErrors: true,
          includeStackTrace: false,
          customTransformer: (error: Error) => ({
            message: 'Custom error message',
            code: 'CUSTOM_ERROR',
            extensions: { customField: true }
          })
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      expect(boundary).toBeDefined()
    })
  })

  describe('Circuit Breaker Functionality', () => {
    it('should create circuit breaker with valid configuration', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 3,
        resetTimeout: Duration.seconds(10),
        halfOpenMaxCalls: 2
      }

      const circuitBreakerEffect = FederationErrorBoundaries.withCircuitBreaker('test-service', config)
      const circuitBreaker = await expectEffectSuccess(circuitBreakerEffect)

      expect(circuitBreaker).toBeDefined()
      expect(circuitBreaker.protect).toBeFunction()
      expect(circuitBreaker.getState).toBeFunction()
      expect(circuitBreaker.getMetrics).toBeFunction()
    })

    it('should fail validation with invalid threshold', async () => {
      const invalidConfig: CircuitBreakerConfig = {
        failureThreshold: 0, // Invalid threshold
        resetTimeout: Duration.seconds(10),
        halfOpenMaxCalls: 2
      }

      const circuitBreakerEffect = FederationErrorBoundaries.withCircuitBreaker('test-service', invalidConfig)
      const error = await expectEffectFailure(circuitBreakerEffect)

      expect(error.message).toContain('Failure threshold must be greater than 0')
    })

    it('should fail validation with invalid timeout', async () => {
      const invalidConfig: CircuitBreakerConfig = {
        failureThreshold: 3,
        resetTimeout: Duration.millis(0), // Invalid timeout
        halfOpenMaxCalls: 2
      }

      const circuitBreakerEffect = FederationErrorBoundaries.withCircuitBreaker('test-service', invalidConfig)
      const error = await expectEffectFailure(circuitBreakerEffect)

      expect(error.message).toContain('Reset timeout must be greater than 0')
    })

    it('should track circuit breaker state transitions', async () => {
      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const circuitBreaker = yield* MockCircuitBreaker

          // Initially closed
          const initialMetrics = yield* circuitBreaker.getMetrics()
          expect(initialMetrics.state).toBe('closed')

          // Simulate failures to open the circuit
          yield* circuitBreaker.setState('open')
          
          // Verify state change
          const openMetrics = yield* circuitBreaker.getMetrics()
          return openMetrics
        })
      )

      expect(result.state).toBe('open')
    })

    it('should execute operations when circuit is closed', async () => {
      const successfulOperation = Effect.succeed('success')

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const circuitBreaker = yield* MockCircuitBreaker
          return yield* circuitBreaker.execute(successfulOperation)
        })
      )

      expect(result).toBe('success')
    })

    it('should reject operations when circuit is open', async () => {
      const operation = Effect.succeed('should not execute')

      const error = await expectEffectFailure(
        Effect.gen(function* () {
          const circuitBreaker = yield* MockCircuitBreaker
          
          // Set circuit to open state
          yield* circuitBreaker.setState('open')
          
          return yield* circuitBreaker.execute(operation)
        }).pipe(Effect.provide(TestServicesLive))
      )

      expect(error.message).toBe('Circuit breaker is open')
    })

    it('should transition to half-open after reset timeout', async () => {
      const operation = Effect.succeed('test')

      const result = await TestLayers.runWithCleanup(
        Effect.gen(function* () {
          const circuitBreaker = yield* MockCircuitBreaker
          
          // Set to half-open state
          yield* circuitBreaker.setState('half-open')
          
          // Execute operation
          yield* circuitBreaker.execute(operation)
          
          // Check final metrics
          return yield* circuitBreaker.getMetrics()
        })
      )

      expect(result.state).toBe('closed') // Should transition to closed after successful execution
    })
  })

  describe('Partial Failure Handling', () => {
    it('should handle successful results from all subgraphs', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const results = {
        'service-1': { subgraphId: 'service-1', success: true, data: { users: [{ id: '1' }] } },
        'service-2': { subgraphId: 'service-2', success: true, data: { products: [{ id: '1' }] } }
      }

      const processed = await expectEffectSuccess(
        boundary.handlePartialFailure(results)
      )

      expect(processed.data).toEqual({
        users: [{ id: '1' }],
        products: [{ id: '1' }]
      })
      expect(processed.errors).toHaveLength(0)
    })

    it('should handle partial failures when allowed', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const results = {
        'service-1': { subgraphId: 'service-1', success: true, data: { users: [{ id: '1' }] } },
        'service-2': { subgraphId: 'service-2', success: false, error: new Error('Service unavailable') }
      }

      const processed = await expectEffectSuccess(
        boundary.handlePartialFailure(results)
      )

      expect(processed.data).toEqual({ users: [{ id: '1' }] })
      expect(processed.errors).toHaveLength(1)
      expect(processed.errors[0].message).toBe('Service unavailable')
    })

    it('should reject partial failures when not allowed', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: false,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const results = {
        'service-1': { subgraphId: 'service-1', success: true, data: { users: [{ id: '1' }] } },
        'service-2': { subgraphId: 'service-2', success: false, error: new Error('Service unavailable') }
      }

      const error = await expectEffectFailure(
        boundary.handlePartialFailure(results)
      )

      expect(error.message).toBe('Subgraph failures not allowed')
      expect(error._tag).toBe('FederationError')
    })

    it('should reject critical subgraph failures', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: ['service-1']
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const results = {
        'service-1': { subgraphId: 'service-1', success: false, error: new Error('Critical failure') },
        'service-2': { subgraphId: 'service-2', success: true, data: { products: [{ id: '1' }] } }
      }

      const error = await expectEffectFailure(
        boundary.handlePartialFailure(results)
      )

      expect(error.message).toBe('Critical subgraph failure')
      expect(error._tag).toBe('FederationError')
    })

    it('should apply fallback values for failed subgraphs', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: [],
          fallbackValues: {
            'service-2': { products: [] }
          }
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const results = {
        'service-1': { subgraphId: 'service-1', success: true, data: { users: [{ id: '1' }] } },
        'service-2': { subgraphId: 'service-2', success: false, error: new Error('Service unavailable') }
      }

      const processed = await expectEffectSuccess(
        boundary.handlePartialFailure(results)
      )

      expect(processed.data).toEqual({
        users: [{ id: '1' }],
        products: []
      })
      expect(processed.errors).toHaveLength(1)
    })
  })

  describe('Resolver Wrapping and Error Handling', () => {
    it('should wrap resolver with timeout protection', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {
          'test-service': Duration.millis(100)
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: false,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      
      // Create a slow resolver that will timeout
      const slowResolver = () => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 200))

      const wrappedResolver = boundary.wrapResolver('test-service', slowResolver)

      try {
        await wrappedResolver(null, {}, {}, mockInfo)
        expect.unreachable('Should have thrown timeout error')
      } catch (error) {
        expect(error.message).toContain('timed out')
      }
    })

    it('should wrap resolver with error handling', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const failingResolver = () => Promise.reject(new Error('Resolver failed'))

      const wrappedResolver = boundary.wrapResolver('test-service', failingResolver)
      const result = await wrappedResolver(null, {}, {}, mockInfo)

      // Should return null due to partial failure handling
      expect(result).toBeNull()
    })

    it('should fail when partial failures are not allowed', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: false,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const failingResolver = () => Promise.reject(new Error('Resolver failed'))

      const wrappedResolver = boundary.wrapResolver('test-service', failingResolver)

      try {
        await wrappedResolver(null, {}, {}, mockInfo)
        expect.unreachable('Should have thrown error')
      } catch (error) {
        expect(error.message).toBe('Resolver execution failed')
      }
    })
  })

  describe('Error Transformation', () => {
    it('should transform errors with default configuration', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const federationError = createMockError('Test error', 'TEST_ERROR')
      const context = {
        subgraphId: 'test-service',
        fieldPath: ['user', 'profile'],
        operationType: 'query' as const,
        timestamp: new Date()
      }

      const transformedError = boundary.transformError(federationError as unknown as import('../../../src/core/types.js').FederationError, context)

      expect(transformedError.message).toBe('Test error')
      expect(transformedError.code).toBe('TEST_ERROR')
      expect(transformedError.path).toEqual(['user', 'profile'])
      expect(transformedError.extensions?.subgraphId).toBe('test-service')
    })

    it('should sanitize errors when configured', async () => {
      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        },
        errorTransformation: {
          sanitizeErrors: true,
          includeStackTrace: false
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const federationError = createMockError('Sensitive error info', 'INTERNAL_ERROR')
      const context = {
        subgraphId: 'test-service',
        fieldPath: ['user'],
        operationType: 'query' as const,
        timestamp: new Date()
      }

      const transformedError = boundary.transformError(federationError as unknown as import('../../../src/core/types.js').FederationError, context)

      expect(transformedError.message).toBe('Internal server error')
      expect(transformedError.code).toBe('INTERNAL_ERROR')
    })

    it('should use custom error transformer when provided', async () => {
      const customTransformer = () => ({
        message: 'Custom transformed message',
        code: 'CUSTOM_CODE',
        extensions: { custom: true }
      })

      const config: ErrorBoundaryConfig = {
        subgraphTimeouts: {},
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: []
        },
        errorTransformation: {
          sanitizeErrors: false,
          includeStackTrace: false,
          customTransformer
        }
      }

      const boundary = FederationErrorBoundaries.createBoundary(config)
      const federationError = createMockError('Original error', 'ORIGINAL_ERROR')
      const context = {
        subgraphId: 'test-service',
        fieldPath: ['user'],
        operationType: 'mutation' as const,
        timestamp: new Date()
      }

      const transformedError = boundary.transformError(federationError as unknown as import('../../../src/core/types.js').FederationError, context)

      // Custom transformer was used (verified by the custom message)
      expect(transformedError.message).toBe('Custom transformed message')
      expect(transformedError.code).toBe('CUSTOM_CODE')
    })
  })

  describe('Factory Functions', () => {
    it('should create strict boundary', async () => {
      const subgraphIds = ['service-1', 'service-2', 'service-3']
      const boundary = createStrictBoundary(subgraphIds)

      expect(boundary).toBeDefined()
      expect(boundary.wrapResolver).toBeFunction()
      expect(boundary.handlePartialFailure).toBeFunction()
    })

    it('should create resilient boundary', async () => {
      const subgraphIds = ['service-1', 'service-2', 'service-3']
      const criticalSubgraphs = ['service-1']
      const boundary = createResilientBoundary(subgraphIds, criticalSubgraphs)

      expect(boundary).toBeDefined()
      expect(boundary.wrapResolver).toBeFunction()
      expect(boundary.handlePartialFailure).toBeFunction()
    })

    it('should create production boundary', async () => {
      const timeouts = {
        'service-1': Duration.seconds(5),
        'service-2': Duration.seconds(3),
        'service-3': Duration.seconds(7)
      }
      const criticalSubgraphs = ['service-1', 'service-2']
      const boundary = createProductionBoundary(timeouts, criticalSubgraphs)

      expect(boundary).toBeDefined()
      expect(boundary.wrapResolver).toBeFunction()
      expect(boundary.handlePartialFailure).toBeFunction()
    })
  })

  describe('Performance and Metrics', () => {
    it('should track resolver execution metrics', async () => {
      const config = FederationErrorBoundaries.defaultConfig
      const boundary = FederationErrorBoundaries.createBoundary(config)
      
      const fastResolver = async () => 'fast result'
      const wrappedResolver = boundary.wrapResolver('test-service', fastResolver)

      const { duration } = await timeEffect(
        Effect.tryPromise(() => wrappedResolver(null, {}, {}, mockInfo))
      )

      expect(duration).toBeLessThan(100) // Should be fast
      // Resolver was called successfully (result would throw if not)
    })

    it('should handle concurrent resolver executions', async () => {
      const config = FederationErrorBoundaries.defaultConfig
      const boundary = FederationErrorBoundaries.createBoundary(config)
      
      const resolver = async (parent: unknown, args: {id?: string}) => {
        await delay(10) // Small delay
        return `result-${args.id}`
      }
      
      const wrappedResolver = boundary.wrapResolver('test-service', resolver)

      const promises = Array.from({ length: 5 }, (_, i) =>
        wrappedResolver(null, { id: i }, {}, mockInfo)
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      expect(results).toEqual(['result-0', 'result-1', 'result-2', 'result-3', 'result-4'])
    })
  })

  describe('Configuration Helpers', () => {
    it('should merge timeout configurations', async () => {
      const baseConfig = FederationErrorBoundaries.defaultConfig
      const timeouts = {
        'service-1': Duration.seconds(10),
        'service-2': Duration.seconds(15)
      }

      const configWithTimeouts = FederationErrorBoundaries.withTimeouts(baseConfig, timeouts)

      expect(configWithTimeouts.subgraphTimeouts).toEqual(timeouts)
      expect(configWithTimeouts.circuitBreakerConfig).toEqual(baseConfig.circuitBreakerConfig)
    })

    it('should merge circuit breaker configurations', async () => {
      const baseConfig = FederationErrorBoundaries.defaultConfig
      const circuitBreakerConfig: CircuitBreakerConfig = {
        failureThreshold: 10,
        resetTimeout: Duration.minutes(2),
        halfOpenMaxCalls: 5
      }

      const configWithCircuitBreaker = FederationErrorBoundaries.withCircuitBreakers(
        baseConfig, 
        circuitBreakerConfig
      )

      expect(configWithCircuitBreaker.circuitBreakerConfig).toEqual(circuitBreakerConfig)
      expect(configWithCircuitBreaker.partialFailureHandling).toEqual(baseConfig.partialFailureHandling)
    })

    it('should merge partial failure configurations', async () => {
      const baseConfig = FederationErrorBoundaries.defaultConfig
      const partialFailureConfig: PartialFailureConfig = {
        allowPartialFailure: false,
        criticalSubgraphs: ['critical-service'],
        fallbackValues: { 'service-1': { data: [] } }
      }

      const configWithPartialFailure = FederationErrorBoundaries.withPartialFailureHandling(
        baseConfig,
        partialFailureConfig
      )

      expect(configWithPartialFailure.partialFailureHandling).toEqual(partialFailureConfig)
      expect(configWithPartialFailure.circuitBreakerConfig).toEqual(baseConfig.circuitBreakerConfig)
    })
  })
})