import { describe, it, expect } from 'bun:test'
import * as Effect from 'effect/Effect'
import {
  ValidationError,
  EntityResolutionError,
  FederationError,
  ErrorMatching,
  ErrorFactory,
} from '../../../src/core/errors.js'

describe('Error System', () => {
  describe('ValidationError', () => {
    it('should create validation error with field and value', () => {
      const error = new ValidationError('Invalid email format', 'email', 'invalid-email')
      
      expect(error._tag).toBe('ValidationError')
      expect(error.message).toBe('Invalid email format')
      expect(error.field).toBe('email')
      expect(error.value).toBe('invalid-email')
      expect(error.severity).toBe('medium')
      expect(error.retryable).toBe(false)
    })

    it('should have proper timestamp', () => {
      const error = new ValidationError('Test error')
      expect(error.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('EntityResolutionError', () => {
    it('should create entity resolution error with entity details', () => {
      const error = new EntityResolutionError(
        'User not found',
        'User',
        '123'
      )
      
      expect(error._tag).toBe('EntityResolutionError')
      expect(error.message).toBe('User not found')
      expect(error.entityType).toBe('User')
      expect(error.entityId).toBe('123')
      expect(error.severity).toBe('high')
      expect(error.retryable).toBe(true)
    })
  })

  describe('FederationError', () => {
    it('should create federation error with subgraph details', () => {
      const error = new FederationError(
        'Subgraph unavailable',
        'users-service',
        'query'
      )
      
      expect(error._tag).toBe('FederationError')
      expect(error.message).toBe('Subgraph unavailable')
      expect(error.subgraphId).toBe('users-service')
      expect(error.operationType).toBe('query')
      expect(error.severity).toBe('high')
      expect(error.retryable).toBe(false)
    })
  })

  describe('ErrorMatching', () => {
    it('should determine if error is retryable', () => {
      const validationError = new ValidationError('Invalid input')
      const entityError = new EntityResolutionError('Not found')
      const federationError = new FederationError('Service down')

      expect(ErrorMatching.isRetryable(validationError)).toBe(false)
      expect(ErrorMatching.isRetryable(entityError)).toBe(true)
      expect(ErrorMatching.isRetryable(federationError)).toBe(false)
    })

    it('should extract error severity', () => {
      const validationError = new ValidationError('Invalid input')
      const entityError = new EntityResolutionError('Not found')
      const federationError = new FederationError('Service down')

      expect(ErrorMatching.getSeverity(validationError)).toBe('medium')
      expect(ErrorMatching.getSeverity(entityError)).toBe('high')
      expect(ErrorMatching.getSeverity(federationError)).toBe('high')
    })

    it('should convert errors to user messages', async () => {
      const validationError = new ValidationError('Invalid email', 'email')
      const errorEffect = Effect.fail(validationError)
      
      const userMessage = await Effect.runPromise(
        ErrorMatching.toUserMessage(errorEffect)
      )
      
      expect(userMessage).toContain('Invalid email')
    })
  })

  describe('ErrorFactory', () => {
    it('should create validation errors', () => {
      const error = ErrorFactory.validation('Required field', 'name')
      
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toBe('Required field')
      expect(error.field).toBe('name')
    })

    it('should create entity resolution errors', () => {
      const error = ErrorFactory.entityResolution('Not found', 'User', '123')
      
      expect(error).toBeInstanceOf(EntityResolutionError)
      expect(error.message).toBe('Not found')
      expect(error.entityType).toBe('User')
      expect(error.entityId).toBe('123')
    })

    it('should create federation errors', () => {
      const error = ErrorFactory.federation('Service down', 'users')
      
      expect(error).toBeInstanceOf(FederationError)
      expect(error.message).toBe('Service down')
      expect(error.subgraphId).toBe('users')
    })

    describe('CommonErrors', () => {
      it('should create required field error', () => {
        const error = ErrorFactory.CommonErrors.required('name')
        
        expect(error.message).toBe('name is required')
        expect(error.field).toBe('name')
      })

      it('should create invalid value error', () => {
        const error = ErrorFactory.CommonErrors.invalid('age', -1)
        
        expect(error.message).toBe('age has invalid value')
        expect(error.field).toBe('age')
        expect(error.value).toBe(-1)
      })

      it('should create entity not found error', () => {
        const error = ErrorFactory.CommonErrors.entityNotFound('User', '123')
        
        expect(error).toBeInstanceOf(EntityResolutionError)
        expect(error.message).toBe('User with id 123 not found')
        expect(error.entityType).toBe('User')
        expect(error.entityId).toBe('123')
      })
    })
  })
})