import { describe, it, expect } from 'vitest'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Match from 'effect/Match'

import {
  BaseDomainError,
  ValidationError,
  SchemaValidationError,
  EntityResolutionError,
  FieldResolutionError,
  FederationError,
  CircuitBreakerError,
  TimeoutError,
  CompositionError,
  TypeConversionError,
  ErrorFactory
} from '../../../src/core/errors.js'
import type { DomainError } from '../../../src/core/types.js'

describe('Core Error System', () => {
  describe('BaseDomainError', () => {
    it('should create error with all metadata', () => {
      class TestError extends BaseDomainError {
        readonly _tag = 'TestError' as const
        
        constructor(message: string) {
          super('TestError', message, 'TEST_CODE', { extra: 'data' }, new Error('cause'))
        }
      }

      const error = new TestError('Test message')

      expect(error._tag).toBe('TestError')
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.context).toEqual({ extra: 'data' })
      expect(error.cause).toBeInstanceOf(Error)
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should create error with minimal parameters', () => {
      class MinimalError extends BaseDomainError {
        readonly _tag = 'MinimalError' as const
        
        constructor(message: string) {
          super('MinimalError', message)
        }
      }

      const error = new MinimalError('Minimal message')

      expect(error._tag).toBe('MinimalError')
      expect(error.message).toBe('Minimal message')
      expect(error.code).toBe('UNKNOWN_CODE')
      expect(error.context).toEqual({})
      expect(error.cause).toBeUndefined()
    })
  })

  describe('ValidationError', () => {
    it('should create validation error with field and value', () => {
      const error = new ValidationError(
        'Invalid email format',
        'email',
        'invalid-email',
        'EMAIL_VALIDATION_ERROR',
        { pattern: '^[^@]+@[^@]+$' }
      )

      expect(error._tag).toBe('ValidationError')
      expect(error.message).toBe('Invalid email format')
      expect(error.field).toBe('email')
      expect(error.value).toBe('invalid-email')
      expect(error.code).toBe('EMAIL_VALIDATION_ERROR')
      expect(error.severity).toBe('medium')
      expect(error.category).toBe('validation')
      expect(error.retryable).toBe(false)
      expect(error.context['pattern']).toBe('^[^@]+@[^@]+$')
    })

    it('should create validation error with minimal parameters', () => {
      const error = new ValidationError('Simple validation error')

      expect(error._tag).toBe('ValidationError')
      expect(error.message).toBe('Simple validation error')
      expect(error.field).toBeUndefined()
      expect(error.value).toBeUndefined()
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('SchemaValidationError', () => {
    it('should create schema validation error with violations', () => {
      const violations = [
        { path: 'user.email', message: 'Required field missing' },
        { path: 'user.age', message: 'Must be positive number', value: -5 }
      ]

      const error = new SchemaValidationError(
        'UserSchema',
        'Multiple validation failures',
        violations,
        { source: 'client' }
      )

      expect(error._tag).toBe('SchemaValidationError')
      expect(error.message).toBe('Schema validation failed for UserSchema: Multiple validation failures')
      expect(error.schemaName).toBe('UserSchema')
      expect(error.violations).toEqual(violations)
      expect(error.severity).toBe('medium')
      expect(error.category).toBe('validation')
      expect(error.retryable).toBe(false)
    })
  })

  describe('EntityResolutionError', () => {
    it('should create entity resolution error', () => {
      const error = new EntityResolutionError(
        'User entity not found',
        'User',
        'user-123',
        { subgraphId: 'users-service' },
        new Error('Database connection failed')
      )

      expect(error._tag).toBe('EntityResolutionError')
      expect(error.message).toBe('User entity not found')
      expect(error.entityType).toBe('User')
      expect(error.entityId).toBe('user-123')
      expect(error.severity).toBe('high')
      expect(error.category).toBe('federation')
      expect(error.retryable).toBe(true)
      expect(error.context['subgraphId']).toBe('users-service')
    })
  })

  describe('FieldResolutionError', () => {
    it('should create field resolution error', () => {
      const error = new FieldResolutionError(
        'Failed to resolve profile field',
        'profile',
        'User',
        { resolver: 'profileResolver' },
        new Error('Network timeout')
      )

      expect(error._tag).toBe('FieldResolutionError')
      expect(error.message).toBe('Failed to resolve profile field')
      expect(error.fieldName).toBe('profile')
      expect(error.parentType).toBe('User')
      expect(error.severity).toBe('medium')
      expect(error.category).toBe('resolution')
      expect(error.retryable).toBe(true)
    })
  })

  describe('FederationError', () => {
    it('should create federation error', () => {
      const error = new FederationError(
        'Subgraph communication failed',
        'users-service',
        'query',
        { operation: 'getUser' },
        new Error('HTTP 500')
      )

      expect(error._tag).toBe('FederationError')
      expect(error.message).toBe('Subgraph communication failed')
      expect(error.subgraphId).toBe('users-service')
      expect(error.operationType).toBe('query')
      expect(error.severity).toBe('high')
      expect(error.category).toBe('federation')
      expect(error.retryable).toBe(false)
    })
  })

  describe('CircuitBreakerError', () => {
    it('should create circuit breaker error', () => {
      const error = new CircuitBreakerError(
        'Circuit breaker is open',
        'open',
        { failureCount: 5 },
        new Error('Too many failures')
      )

      expect(error._tag).toBe('CircuitBreakerError')
      expect(error.message).toBe('Circuit breaker is open')
      expect(error.state).toBe('open')
      expect(error.severity).toBe('high')
      expect(error.category).toBe('resilience')
      expect(error.retryable).toBe(true)
    })
  })

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError(
        'Operation timed out',
        '5000ms',
        { operation: 'getUserProfile' }
      )

      expect(error._tag).toBe('TimeoutError')
      expect(error.message).toBe('Operation timed out')
      expect(error.timeout).toBe('5000ms')
      expect(error.severity).toBe('medium')
      expect(error.category).toBe('performance')
      expect(error.retryable).toBe(true)
    })
  })

  describe('CompositionError', () => {
    it('should create composition error', () => {
      const error = new CompositionError(
        'Schema composition failed',
        'users-service',
        { directive: '@key', errorType: 'directive_conflict' }
      )

      expect(error._tag).toBe('CompositionError')
      expect(error.message).toBe('Schema composition failed')
      expect(error.subgraphId).toBe('users-service')
      expect(error.context['errorType']).toBe('directive_conflict')
      expect(error.severity).toBe('high')
      expect(error.category).toBe('composition')
      expect(error.retryable).toBe(false)
    })
  })

  describe('TypeConversionError', () => {
    it('should create type conversion error', () => {
      const error = new TypeConversionError(
        'Cannot convert string to number',
        'String',
        'user-age',
        { value: 'not-a-number', targetType: 'Number' }
      )

      expect(error._tag).toBe('TypeConversionError')
      expect(error.message).toBe('Cannot convert string to number')
      expect(error.astType).toBe('String')
      expect(error.context['targetType']).toBe('Number')
      expect(error.field).toBe('user-age')
      expect(error.severity).toBe('medium')
      expect(error.category).toBe('conversion')
      expect(error.retryable).toBe(false)
    })
  })

  describe('ErrorFactory', () => {
    it('should create validation error via factory', () => {
      const error = ErrorFactory.validation('Invalid input', 'email')

      expect(error).toBeInstanceOf(ValidationError)
      expect(error._tag).toBe('ValidationError')
      expect(error.message).toBe('Invalid input')
      expect(error.field).toBe('email')
    })

    it('should create entity resolution error via factory', () => {
      const error = ErrorFactory.entityResolution('Entity not found', 'User', 'user-123')

      expect(error).toBeInstanceOf(EntityResolutionError)
      expect(error._tag).toBe('EntityResolutionError')
      expect(error.entityType).toBe('User')
      expect(error.entityId).toBe('user-123')
    })

    it('should create federation error via factory', () => {
      const error = ErrorFactory.federation('Service unavailable', 'users-service', 'query')

      expect(error).toBeInstanceOf(FederationError)
      expect(error._tag).toBe('FederationError')
      expect(error.subgraphId).toBe('users-service')
      expect(error.operationType).toBe('query')
    })

    it('should create circuit breaker error via factory', () => {
      const error = ErrorFactory.circuitBreaker('Circuit open', 'open')

      expect(error).toBeInstanceOf(CircuitBreakerError)
      expect(error._tag).toBe('CircuitBreakerError')
      expect(error.state).toBe('open')
    })

    it('should create timeout error via factory', () => {
      const error = ErrorFactory.timeout('Request timeout', '5000ms')

      expect(error).toBeInstanceOf(TimeoutError)
      expect(error._tag).toBe('TimeoutError')
      expect(error.timeout).toBe('5000ms')
    })

    it('should create composition error via factory', () => {
      const error = ErrorFactory.composition('Invalid schema', 'users-service')

      expect(error).toBeInstanceOf(CompositionError)
      expect(error._tag).toBe('CompositionError')
      expect(error.subgraphId).toBe('users-service')
      expect(error.message).toBe('Invalid schema')
    })
  })

  describe('Error Pattern Matching', () => {
    const createTestErrors = (): DomainError[] => [
      new ValidationError('Validation failed', 'email'),
      new EntityResolutionError('Entity not found', 'User', '123'),
      new FederationError('Federation failed', 'service-1'),
      new CircuitBreakerError('Circuit open', 'open'),
      new TimeoutError('Timeout occurred', '5000ms'),
      new CompositionError('Composition failed', 'service-1', { errorType: 'schema_error' })
    ]

    it('should match validation errors', () => {
      const errors = createTestErrors()
      
      const validationErrors = errors.filter(error => 
        Match.value(error).pipe(
          Match.tag('ValidationError', () => true),
          Match.orElse(() => false)
        )
      )

      expect(validationErrors).toHaveLength(1)
      expect(validationErrors[0]?._tag).toBe('ValidationError')
    })

    it('should match federation-related errors', () => {
      const errors = createTestErrors()
      
      const federationErrors = errors.filter(error => 
        Match.value(error).pipe(
          Match.tag('EntityResolutionError', () => true),
          Match.tag('FederationError', () => true),
          Match.orElse(() => false)
        )
      )

      expect(federationErrors).toHaveLength(2)
      expect(federationErrors.map(e => e._tag)).toEqual(['EntityResolutionError', 'FederationError'])
    })

    it('should match retryable errors', () => {
      const errors = createTestErrors()
      
      const retryableErrors = errors.filter(error => 
        Match.value(error).pipe(
          Match.tag('EntityResolutionError', () => true),
          Match.tag('FieldResolutionError', () => true),
          Match.tag('CircuitBreakerError', () => true),
          Match.tag('TimeoutError', () => true),
          Match.orElse(() => false)
        )
      )

      expect(retryableErrors.length).toBeGreaterThan(0)
      expect(retryableErrors.every(e => 'retryable' in e && e.retryable)).toBe(true)
    })

    it('should handle exhaustive pattern matching', () => {
      const error: DomainError = new ValidationError('Test error')
      
      const handleError = (err: DomainError): string =>
        Match.value(err as DomainError).pipe(
          Match.tag('ValidationError', e => `Validation: ${e.message}`),
          Match.tag('SchemaValidationError', e => `Schema: ${e.message}`),
          Match.tag('EntityResolutionError', e => `Entity: ${e.message}`),
          Match.tag('FieldResolutionError', e => `Field: ${e.message}`),
          Match.tag('FederationError', e => `Federation: ${e.message}`),
          Match.tag('CircuitBreakerError', e => `Circuit: ${e.message}`),
          Match.tag('TimeoutError', e => `Timeout: ${e.message}`),
          Match.tag('CompositionError', e => `Composition: ${e.message}`),
          Match.tag('TypeConversionError', e => `Conversion: ${e.message}`),
          Match.tag('DiscoveryError', e => `Discovery: ${e.message}`),
          Match.tag('RegistrationError', e => `Registration: ${e.message}`),
          Match.tag('HealthCheckError', e => `Health: ${e.message}`),
          Match.exhaustive
        )

      const result = handleError(error)
      expect(result).toBe('Validation: Test error')
    })
  })

  describe('Error Effect Integration', () => {
    it('should work with Effect.fail', async () => {
      const failingEffect = Effect.fail(new ValidationError('Invalid data', 'email'))
      
      const result = await Effect.runPromise(Effect.either(failingEffect))
      
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        const errorOption = Either.getLeft(result)
        if (errorOption._tag === 'Some') {
          const error = errorOption.value
          expect(error).toBeInstanceOf(ValidationError)
          expect(error._tag).toBe('ValidationError')
          expect(error.field).toBe('email')
        }
      }
    })

    it('should work with Effect.tryPromise error handling', async () => {
      const failingPromise = Promise.reject(new Error('Network error'))
      
      const effect = Effect.tryPromise({
        try: () => failingPromise,
        catch: error => new FederationError(
          'Network request failed',
          'api-service',
          'query',
          { originalError: error }
        )
      })

      const result = await Effect.runPromise(Effect.either(effect))
      
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        const errorOption = Either.getLeft(result)
        if (errorOption._tag === 'Some') {
          const error = errorOption.value
          expect(error).toBeInstanceOf(FederationError)
          expect(error._tag).toBe('FederationError')
          expect(error.subgraphId).toBe('api-service')
        }
      }
    })

    it('should work with Effect.catchTag', async () => {
      const effect = Effect.gen(function* () {
        yield* Effect.fail(new TimeoutError('Operation timeout', '5000ms'))
        return 'success'
      }).pipe(
        Effect.catchTag('TimeoutError', error => 
          Effect.succeed(`Handled timeout: ${error.message}`)
        )
      )

      const result = await Effect.runPromise(effect)
      expect(result).toBe('Handled timeout: Operation timeout')
    })

    it('should work with Effect.catchAll for generic error handling', async () => {
      const effect = Effect.gen(function* () {
        yield* Effect.fail(new ValidationError('Invalid input'))
        return 'success'
      }).pipe(
        Effect.catchAll(error => 
          Effect.succeed(`Generic error handler: ${error.message}`)
        )
      )

      const result = await Effect.runPromise(effect)
      expect(result).toBe('Generic error handler: Invalid input')
    })
  })

  describe('Error Serialization and Logging', () => {
    it('should serialize error data properly', () => {
      const error = new FederationError(
        'Service communication failed',
        'users-service',
        'mutation',
        { 
          requestId: 'req-123',
          userId: 'user-456' 
        },
        new Error('HTTP 503')
      )

      const serialized = {
        tag: error._tag,
        message: error.message,
        code: error.code,
        timestamp: error.timestamp,
        context: error.context,
        severity: error.severity,
        category: error.category,
        retryable: error.retryable
      }

      expect(serialized.tag).toBe('FederationError')
      expect(serialized.message).toBe('Service communication failed')
      expect(serialized.code).toBe('FEDERATION_ERROR')
      expect(serialized.context).toEqual({
        subgraphId: 'users-service',
        operationType: 'mutation',
        requestId: 'req-123',
        userId: 'user-456'
      })
      expect(serialized.severity).toBe('high')
      expect(serialized.category).toBe('federation')
      expect(serialized.retryable).toBe(false)
    })

    it('should provide useful error messages for debugging', () => {
      const errors = [
        new ValidationError('Email format invalid', 'email', 'not-an-email'),
        new EntityResolutionError('User not found', 'User', 'user-404'),
        new CircuitBreakerError('Too many failures', 'open'),
        new TimeoutError('Request timeout after 30s', '30000ms')
      ]

      errors.forEach(error => {
        expect(error.message).toBeTruthy()
        expect(error.message.length).toBeGreaterThan(0)
        expect(error._tag).toBeTruthy()
        expect(error.code).toBeTruthy()
      })
    })
  })
})