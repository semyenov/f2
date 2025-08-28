import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import type {
  CircuitBreakerError as CircuitBreakerErrorType,
  CompositionError as CompositionErrorType,
  DomainError,
  EntityResolutionError as EntityResolutionErrorType,
  FederationError as FederationErrorType,
  FieldResolutionError as FieldResolutionErrorType,
  TimeoutError as TimeoutErrorType,
  TypeConversionError as TypeConversionErrorType,
  ValidationError as ValidationErrorType,
} from './types.js'

/**
 * Core error data structure with comprehensive metadata
 */
interface CoreError {
  readonly _tag: string
  readonly message: string
  readonly code: string
  readonly timestamp: Date
  readonly context?: Record<string, unknown>
  readonly cause?: unknown
}

/**
 * Base domain error using Effect's Data.Error
 * Provides comprehensive metadata and composition capabilities
 */
export abstract class BaseDomainError extends Data.Error<CoreError> {
  abstract override readonly _tag: string
  override readonly timestamp = new Date()

  constructor(
    _tag: string,
    override readonly message: string,
    override readonly code: string = 'UNKNOWN_CODE',
    override readonly context: Record<string, unknown> = {},
    override readonly cause?: unknown
  ) {
    const errorData: CoreError = {
      _tag,
      message,
      code,
      timestamp: new Date(),
      ...(context !== undefined && { context }),
      ...(cause !== undefined && { cause }),
    }

    super(errorData)
  }
}

/**
 * Validation error for schema and data validation failures
 */
export class ValidationError extends BaseDomainError implements ValidationErrorType {
  readonly _tag = 'ValidationError' as const
  readonly severity = 'medium' as const
  readonly category = 'validation' as const
  readonly retryable = false

  constructor(
    message: string,
    readonly field: string | undefined = undefined,
    readonly value: unknown | undefined = undefined,
    code = 'VALIDATION_ERROR',
    context: Record<string, unknown> = {}
  ) {
    super('ValidationError', message, code, { field, value, ...context })
  }
}

/**
 * Schema validation error with violation details
 */
export class SchemaValidationError extends BaseDomainError {
  readonly _tag = 'SchemaValidationError' as const
  readonly severity = 'medium' as const
  readonly category = 'validation' as const
  readonly retryable = false

  constructor(
    readonly schemaName: string,
    message: string,
    readonly violations: ReadonlyArray<{
      readonly path: string
      readonly message: string
      readonly value?: unknown
    }>,
    context: Record<string, unknown> = {}
  ) {
    super(
      'SchemaValidationError',
      `Schema validation failed for ${schemaName}: ${message}`,
      'SCHEMA_VALIDATION_ERROR',
      { schemaName, violations, ...context }
    )
  }
}

/**
 * Entity resolution error for federation entity lookup failures
 */
export class EntityResolutionError extends BaseDomainError implements EntityResolutionErrorType {
  readonly _tag = 'EntityResolutionError' as const
  readonly severity = 'high' as const
  readonly category = 'federation' as const
  readonly retryable = true

  constructor(
    message: string,
    readonly entityType: string | undefined = undefined,
    readonly entityId: string | undefined = undefined,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'EntityResolutionError',
      message,
      'ENTITY_RESOLUTION_ERROR',
      {
        entityType,
        entityId,
        ...context,
      },
      cause
    )
  }
}

/**
 * Field resolution error for GraphQL field resolver failures
 */
export class FieldResolutionError extends BaseDomainError implements FieldResolutionErrorType {
  readonly _tag = 'FieldResolutionError' as const
  readonly severity = 'medium' as const
  readonly category = 'resolution' as const
  readonly retryable = true

  constructor(
    message: string,
    readonly fieldName?: string,
    readonly parentType?: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'FieldResolutionError',
      message,
      'FIELD_RESOLUTION_ERROR',
      {
        fieldName,
        parentType,
        ...context,
      },
      cause
    )
  }
}

/**
 * Federation error for cross-service communication failures
 */
export class FederationError extends BaseDomainError implements FederationErrorType {
  readonly _tag = 'FederationError' as const
  readonly severity = 'high' as const
  readonly category = 'federation' as const
  readonly retryable = false

  constructor(
    message: string,
    readonly subgraphId?: string,
    readonly operationType?: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'FederationError',
      message,
      'FEDERATION_ERROR',
      {
        subgraphId,
        operationType,
        ...context,
      },
      cause
    )
  }
}

/**
 * Circuit breaker error for service protection
 */
export class CircuitBreakerError extends BaseDomainError implements CircuitBreakerErrorType {
  readonly _tag = 'CircuitBreakerError' as const
  readonly severity = 'high' as const
  readonly category = 'resilience' as const
  readonly retryable = true

  constructor(
    message: string,
    readonly state?: 'open' | 'closed' | 'half-open',
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'CircuitBreakerError',
      message,
      'CIRCUIT_BREAKER_ERROR',
      {
        state,
        ...context,
      },
      cause
    )
  }
}

/**
 * Timeout error for operation timeouts
 */
export class TimeoutError extends BaseDomainError implements TimeoutErrorType {
  readonly _tag = 'TimeoutError' as const
  readonly severity = 'medium' as const
  readonly category = 'performance' as const
  readonly retryable = true

  constructor(
    message: string,
    readonly timeout?: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'TimeoutError',
      message,
      'TIMEOUT_ERROR',
      {
        timeout,
        ...context,
      },
      cause
    )
  }
}

/**
 * Composition error for schema composition failures
 */
export class CompositionError extends BaseDomainError implements CompositionErrorType {
  readonly _tag = 'CompositionError' as const
  readonly severity = 'high' as const
  readonly category = 'composition' as const
  readonly retryable = false

  constructor(
    message: string,
    readonly subgraphId?: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'CompositionError',
      message,
      'COMPOSITION_ERROR',
      {
        subgraphId,
        ...context,
      },
      cause
    )
  }
}

/**
 * Type conversion error for AST to GraphQL type conversion
 */
export class TypeConversionError extends BaseDomainError implements TypeConversionErrorType {
  readonly _tag = 'TypeConversionError' as const
  readonly severity = 'medium' as const
  readonly category = 'conversion' as const
  readonly retryable = false

  constructor(
    message: string,
    readonly astType?: string,
    readonly field?: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'TypeConversionError',
      message,
      'TYPE_CONVERSION_ERROR',
      {
        astType,
        field,
        ...context,
      },
      cause
    )
  }
}

/**
 * Health check error for service health monitoring failures
 */
export class HealthCheckError extends BaseDomainError {
  readonly _tag = 'HealthCheckError' as const
  readonly severity = 'medium' as const
  readonly category = 'monitoring' as const
  readonly retryable = true

  constructor(
    message: string,
    readonly serviceId?: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'HealthCheckError',
      message,
      'HEALTH_CHECK_ERROR',
      {
        serviceId,
        ...context,
      },
      cause
    )
  }
}

/**
 * Registration error for service registration failures
 */
export class RegistrationError extends BaseDomainError {
  readonly _tag = 'RegistrationError' as const
  readonly severity = 'high' as const
  readonly category = 'registration' as const
  readonly retryable = true

  constructor(
    message: string,
    readonly serviceId: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'RegistrationError',
      message,
      'REGISTRATION_ERROR',
      {
        serviceId,
        ...context,
      },
      cause
    )
  }
}

/**
 * Discovery error for service discovery failures
 */
export class DiscoveryError extends BaseDomainError {
  readonly _tag = 'DiscoveryError' as const
  readonly severity = 'high' as const
  readonly category = 'discovery' as const
  readonly retryable = true

  constructor(
    message: string,
    readonly endpoint?: string,
    context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(
      'DiscoveryError',
      message,
      'DISCOVERY_ERROR',
      {
        endpoint,
        ...context,
      },
      cause
    )
  }
}

/**
 * Pattern matching for error handling with Effect.match
 */
export namespace ErrorMatching {
  /**
   * Transform errors to user-friendly messages using Effect.match
   */
  export const toUserMessage = (
    errorEffect: Effect.Effect<never, DomainError>
  ): Effect.Effect<string, never> =>
    pipe(
      errorEffect,
      Effect.match({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('ValidationError', err => `Invalid ${err.field ?? 'field'}: ${err.message}`),
            Match.tag(
              'SchemaValidationError',
              err =>
                `Data format error: ${err.violations.map((v: { readonly message: string }) => v.message).join(', ')}`
            ),
            Match.tag(
              'EntityResolutionError',
              err => `Could not find ${err.entityType ?? 'entity'}: ${err.message}`
            ),
            Match.tag(
              'FieldResolutionError',
              err => `Field resolution failed for ${err.fieldName ?? 'field'}: ${err.message}`
            ),
            Match.tag('FederationError', err => `Federation error: ${err.message}`),
            Match.tag(
              'CircuitBreakerError',
              () => 'Service temporarily unavailable, please try again'
            ),
            Match.tag('TimeoutError', () => 'Request timed out, please try again'),
            Match.tag('CompositionError', err => `Schema composition failed: ${err.message}`),
            Match.tag('TypeConversionError', err => `Type conversion failed: ${err.message}`),
            Match.tag('RegistrationError', err => `Service registration failed: ${err.message}`),
            Match.tag('DiscoveryError', err => `Service discovery failed: ${err.message}`),
            Match.tag('HealthCheckError', err => `Health check failed: ${err.message}`),
            Match.exhaustive
          ),
        onSuccess: () => 'Operation completed successfully',
      })
    )

  /**
   * Determine if an error is retryable using pattern matching
   */
  export const isRetryable = (error: DomainError): boolean =>
    Match.value(error).pipe(
      Match.tag('ValidationError', () => false),
      Match.tag('SchemaValidationError', () => false),
      Match.tag('EntityResolutionError', () => true),
      Match.tag('FieldResolutionError', () => true),
      Match.tag('FederationError', () => false),
      Match.tag('CircuitBreakerError', () => true),
      Match.tag('TimeoutError', () => true),
      Match.tag('CompositionError', () => false),
      Match.tag('TypeConversionError', () => false),
      Match.tag('RegistrationError', () => true),
      Match.tag('DiscoveryError', () => true),
      Match.tag('HealthCheckError', () => true),
      Match.exhaustive
    )

  /**
   * Extract error severity using pattern matching
   */
  export const getSeverity = (error: DomainError): 'low' | 'medium' | 'high' =>
    Match.value(error).pipe(
      Match.tag('ValidationError', () => 'medium' as const),
      Match.tag('SchemaValidationError', () => 'medium' as const),
      Match.tag('EntityResolutionError', () => 'high' as const),
      Match.tag('FieldResolutionError', () => 'medium' as const),
      Match.tag('FederationError', () => 'high' as const),
      Match.tag('CircuitBreakerError', () => 'high' as const),
      Match.tag('TimeoutError', () => 'medium' as const),
      Match.tag('CompositionError', () => 'high' as const),
      Match.tag('TypeConversionError', () => 'medium' as const),
      Match.tag('RegistrationError', () => 'high' as const),
      Match.tag('DiscoveryError', () => 'high' as const),
      Match.tag('HealthCheckError', () => 'medium' as const),
      Match.exhaustive
    )
}

/**
 * Error factory functions for consistent error creation
 */
export namespace ErrorFactory {
  export const validation = (
    message: string,
    field?: string,
    value?: unknown,
    code?: string
  ): ValidationError => new ValidationError(message, field, value, code)

  export const schemaValidation = (
    schemaName: string,
    message: string,
    violations: ReadonlyArray<{
      readonly path: string
      readonly message: string
      readonly value?: unknown
    }>
  ): SchemaValidationError => new SchemaValidationError(schemaName, message, violations)

  export const entityResolution = (
    message: string,
    entityType?: string,
    entityId?: string,
    cause?: unknown
  ): EntityResolutionError => new EntityResolutionError(message, entityType, entityId, {}, cause)

  export const fieldResolution = (
    message: string,
    fieldName?: string,
    parentType?: string,
    cause?: unknown
  ): FieldResolutionError => new FieldResolutionError(message, fieldName, parentType, {}, cause)

  export const federation = (
    message: string,
    subgraphId?: string,
    operationType?: string,
    cause?: unknown
  ): FederationError => new FederationError(message, subgraphId, operationType, {}, cause)

  export const circuitBreaker = (
    message: string,
    state?: 'open' | 'closed' | 'half-open',
    cause?: unknown
  ): CircuitBreakerError => new CircuitBreakerError(message, state, {}, cause)

  export const timeout = (message: string, timeout?: string, cause?: unknown): TimeoutError =>
    new TimeoutError(message, timeout, {}, cause)

  export const composition = (
    message: string,
    subgraphId?: string,
    cause?: unknown
  ): CompositionError => new CompositionError(message, subgraphId, {}, cause)

  export const typeConversion = (
    message: string,
    astType?: string,
    field?: string,
    cause?: unknown
  ): TypeConversionError => new TypeConversionError(message, astType, field, {}, cause)

  export const healthCheck = (
    message: string,
    serviceId?: string,
    cause?: unknown
  ): HealthCheckError => new HealthCheckError(message, serviceId, {}, cause)

  export const registration = (
    message: string,
    serviceId: string,
    cause?: unknown
  ): RegistrationError => new RegistrationError(message, serviceId, {}, cause)

  export const discovery = (message: string, endpoint?: string, cause?: unknown): DiscoveryError =>
    new DiscoveryError(message, endpoint, {}, cause)

  // Common error instances
  export const CommonErrors = {
    required: (field: string) => validation(`${field} is required`, field),
    invalid: (field: string, value: unknown) =>
      validation(`${field} has invalid value`, field, value),
    subgraphUnavailable: (subgraphId: string) =>
      federation(`Subgraph ${subgraphId} is unavailable`, subgraphId),
    entityNotFound: (entityType: string, entityId: string) =>
      entityResolution(`${entityType} with id ${entityId} not found`, entityType, entityId),
    fieldNotResolvable: (fieldName: string, parentType: string) =>
      fieldResolution(
        `Field ${fieldName} on ${parentType} could not be resolved`,
        fieldName,
        parentType
      ),
    circuitOpen: (serviceId: string) =>
      circuitBreaker(`Circuit breaker open for service ${serviceId}`, 'open'),
    requestTimeout: (timeoutValue: string) =>
      timeout(`Request timed out after ${timeoutValue}`, timeoutValue),
    registrationError: (message: string, serviceId: string, cause?: unknown) =>
      registration(message, serviceId, cause),
    discoveryError: (message: string, endpoint?: string, cause?: unknown) =>
      discovery(message, endpoint, cause),
    schemaCompositionFailed: (reason: string) =>
      composition(`Schema composition failed: ${reason}`),
    unsupportedAstType: (astType: string) =>
      typeConversion(`Unsupported AST type: ${astType}`, astType),
    typeConversion: (message: string, astType?: string) => typeConversion(message, astType),
  }
}

/**
 * Union type of all concrete error classes
 */
export type FederationDomainError =
  | ValidationError
  | SchemaValidationError
  | EntityResolutionError
  | FieldResolutionError
  | FederationError
  | CircuitBreakerError
  | TimeoutError
  | CompositionError
  | TypeConversionError
  | HealthCheckError
  | RegistrationError
  | DiscoveryError
