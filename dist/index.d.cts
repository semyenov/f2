import { Duration, Effect } from "effect";
import * as Schema from "@effect/schema/Schema";
import { DocumentNode, ExecutionResult, GraphQLFieldResolver, GraphQLInputType, GraphQLOutputType, GraphQLResolveInfo, GraphQLScalarType, GraphQLSchema, GraphQLType } from "graphql";
import * as Data from "effect/Data";
import * as Effect$1 from "effect/Effect";
import * as effect_Unify0 from "effect/Unify";
import * as effect_Types0 from "effect/Types";
import * as effect_Cause0 from "effect/Cause";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as _effect_schema_ParseResult5 from "@effect/schema/ParseResult";
import * as effect_ConfigError5 from "effect/ConfigError";
import DataLoader from "dataloader";

//#region rolldown:runtime
//#endregion
//#region src/core/errors.d.ts
/**
 * Core error data structure with comprehensive metadata
 */
interface CoreError {
  readonly _tag: string;
  readonly message: string;
  readonly code: string;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}
/**
 * Base domain error using Effect's Data.Error
 * Provides comprehensive metadata and composition capabilities
 */
declare abstract class BaseDomainError extends Data.Error<CoreError> {
  readonly message: string;
  readonly code: string;
  readonly context: Record<string, unknown>;
  readonly cause?: unknown | undefined;
  abstract readonly _tag: string;
  readonly timestamp: Date;
  constructor(_tag: string, message: string, code?: string, context?: Record<string, unknown>, cause?: unknown | undefined);
}
/**
 * Validation error for schema and data validation failures
 */
declare class ValidationError extends BaseDomainError implements ValidationError {
  readonly field: string | undefined;
  readonly value: unknown | undefined;
  readonly _tag: "ValidationError";
  readonly severity: "medium";
  readonly category: "validation";
  readonly retryable = false;
  constructor(message: string, field?: string | undefined, value?: unknown | undefined, code?: string, context?: Record<string, unknown>);
}
/**
 * Schema validation error with violation details
 */
declare class SchemaValidationError extends BaseDomainError {
  readonly schemaName: string;
  readonly violations: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
    readonly value?: unknown;
  }>;
  readonly _tag: "SchemaValidationError";
  readonly severity: "medium";
  readonly category: "validation";
  readonly retryable = false;
  constructor(schemaName: string, message: string, violations: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
    readonly value?: unknown;
  }>, context?: Record<string, unknown>);
}
/**
 * Entity resolution error for federation entity lookup failures
 */
declare class EntityResolutionError extends BaseDomainError implements EntityResolutionError {
  readonly entityType: string | undefined;
  readonly entityId: string | undefined;
  readonly _tag: "EntityResolutionError";
  readonly severity: "high";
  readonly category: "federation";
  readonly retryable = true;
  constructor(message: string, entityType?: string | undefined, entityId?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Field resolution error for GraphQL field resolver failures
 */
declare class FieldResolutionError extends BaseDomainError implements FieldResolutionError {
  readonly fieldName?: string | undefined;
  readonly parentType?: string | undefined;
  readonly _tag: "FieldResolutionError";
  readonly severity: "medium";
  readonly category: "resolution";
  readonly retryable = true;
  constructor(message: string, fieldName?: string | undefined, parentType?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Federation error for cross-service communication failures
 */
declare class FederationError extends BaseDomainError implements FederationError {
  readonly subgraphId?: string | undefined;
  readonly operationType?: string | undefined;
  readonly _tag: "FederationError";
  readonly severity: "high";
  readonly category: "federation";
  readonly retryable = false;
  constructor(message: string, subgraphId?: string | undefined, operationType?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Circuit breaker error for service protection
 */
declare class CircuitBreakerError extends BaseDomainError implements CircuitBreakerError {
  readonly state?: "open" | "closed" | "half-open" | undefined;
  readonly _tag: "CircuitBreakerError";
  readonly severity: "high";
  readonly category: "resilience";
  readonly retryable = true;
  constructor(message: string, state?: "open" | "closed" | "half-open" | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Timeout error for operation timeouts
 */
declare class TimeoutError extends BaseDomainError implements TimeoutError {
  readonly timeout?: string | undefined;
  readonly _tag: "TimeoutError";
  readonly severity: "medium";
  readonly category: "performance";
  readonly retryable = true;
  constructor(message: string, timeout?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Composition error for schema composition failures
 */
declare class CompositionError extends BaseDomainError implements CompositionError {
  readonly subgraphId?: string | undefined;
  readonly _tag: "CompositionError";
  readonly severity: "high";
  readonly category: "composition";
  readonly retryable = false;
  constructor(message: string, subgraphId?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Type conversion error for AST to GraphQL type conversion
 */
declare class TypeConversionError extends BaseDomainError implements TypeConversionError {
  readonly astType?: string | undefined;
  readonly field?: string | undefined;
  readonly _tag: "TypeConversionError";
  readonly severity: "medium";
  readonly category: "conversion";
  readonly retryable = false;
  constructor(message: string, astType?: string | undefined, field?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Health check error for service health monitoring failures
 */
declare class HealthCheckError extends BaseDomainError {
  readonly serviceId?: string | undefined;
  readonly _tag: "HealthCheckError";
  readonly severity: "medium";
  readonly category: "monitoring";
  readonly retryable = true;
  constructor(message: string, serviceId?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Registration error for service registration failures
 */
declare class RegistrationError extends BaseDomainError {
  readonly serviceId: string;
  readonly _tag: "RegistrationError";
  readonly severity: "high";
  readonly category: "registration";
  readonly retryable = true;
  constructor(message: string, serviceId: string, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Discovery error for service discovery failures
 */
declare class DiscoveryError extends BaseDomainError {
  readonly endpoint?: string | undefined;
  readonly _tag: "DiscoveryError";
  readonly severity: "high";
  readonly category: "discovery";
  readonly retryable = true;
  constructor(message: string, endpoint?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
}
/**
 * Pattern matching for error handling with Effect.match
 */
declare namespace ErrorMatching {
  /**
   * Transform errors to user-friendly messages using Effect.match
   */
  const toUserMessage: (errorEffect: Effect$1.Effect<never, DomainError>) => Effect$1.Effect<string, never>;
  /**
   * Determine if an error is retryable using pattern matching
   */
  const isRetryable: (error: DomainError) => boolean;
  /**
   * Extract error severity using pattern matching
   */
  const getSeverity: (error: DomainError) => "low" | "medium" | "high";
}
/**
 * Error factory functions for consistent error creation
 */
declare namespace ErrorFactory {
  const validation: (message: string, field?: string, value?: unknown, code?: string) => ValidationError;
  const schemaValidation: (schemaName: string, message: string, violations: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
    readonly value?: unknown;
  }>) => SchemaValidationError;
  const entityResolution: (message: string, entityType?: string, entityId?: string, cause?: unknown) => EntityResolutionError;
  const fieldResolution: (message: string, fieldName?: string, parentType?: string, cause?: unknown) => FieldResolutionError;
  const federation: (message: string, subgraphId?: string, operationType?: string, cause?: unknown) => FederationError;
  const circuitBreaker: (message: string, state?: "open" | "closed" | "half-open", cause?: unknown) => CircuitBreakerError;
  const timeout: (message: string, timeout?: string, cause?: unknown) => TimeoutError;
  const composition: (message: string, subgraphId?: string, cause?: unknown) => CompositionError;
  const typeConversion: (message: string, astType?: string, field?: string, cause?: unknown) => TypeConversionError;
  const healthCheck: (message: string, serviceId?: string, cause?: unknown) => HealthCheckError;
  const registration: (message: string, serviceId: string, cause?: unknown) => RegistrationError;
  const discovery: (message: string, endpoint?: string, cause?: unknown) => DiscoveryError;
  const CommonErrors: {
    required: (field: string) => ValidationError;
    invalid: (field: string, value: unknown) => ValidationError;
    subgraphUnavailable: (subgraphId: string) => FederationError;
    entityNotFound: (entityType: string, entityId: string) => EntityResolutionError;
    fieldNotResolvable: (fieldName: string, parentType: string) => FieldResolutionError;
    circuitOpen: (serviceId: string) => CircuitBreakerError;
    requestTimeout: (timeoutValue: string) => TimeoutError;
    registrationError: (message: string, serviceId: string, cause?: unknown) => RegistrationError;
    discoveryError: (message: string, endpoint?: string, cause?: unknown) => DiscoveryError;
    schemaCompositionFailed: (reason: string) => CompositionError;
    unsupportedAstType: (astType: string) => TypeConversionError;
    typeConversion: (message: string, astType?: string) => TypeConversionError;
  };
}
/**
 * Union type of all concrete error classes
 */
type FederationDomainError = ValidationError | SchemaValidationError | EntityResolutionError | FieldResolutionError | FederationError | CircuitBreakerError | TimeoutError | CompositionError | TypeConversionError | HealthCheckError | RegistrationError | DiscoveryError;
//#endregion
//#region src/core/types.d.ts
/**
 * Core federation entity definition with full Apollo Federation 2.x support
 *
 * Represents a GraphQL entity that can be federated across multiple subgraphs.
 * Entities are types that can be resolved from references and extended by other subgraphs.
 *
 * @template TSource - The source data type (e.g., from database or API)
 * @template TContext - The GraphQL execution context type (user, services, etc.)
 * @template TResult - The resolved entity type returned to clients
 * @template TReference - The reference type containing key fields for entity lookup
 *
 * @example
 * ```typescript
 * const userEntity: FederationEntity<DatabaseUser, AppContext, User, UserRef> = {
 *   typename: 'User',
 *   key: ['id'],
 *   schema: UserSchema,
 *   resolveReference: resolveUserFromReference,
 *   fields: {
 *     displayName: resolveUserDisplayName,
 *     avatar: resolveUserAvatar
 *   },
 *   directives: {
 *     email: [{ type: '@inaccessible' }]
 *   }
 * }
 * ```
 */
interface FederationEntity<TSource = Record<string, unknown>, TContext = Record<string, unknown>, TResult = Partial<TSource>, TReference = Partial<TSource>> {
  /** GraphQL type name - must match the type name in your schema */
  readonly typename: string;
  /** Key field(s) that uniquely identify this entity across subgraphs */
  readonly key: string | ReadonlyArray<string>;
  /** Effect Schema for runtime validation and type safety */
  readonly schema: Schema.Schema<TSource, TResult>;
  /** Resolver function called when this entity is referenced by other subgraphs */
  readonly resolveReference: EntityReferenceResolver<TResult, TContext, TReference>;
  /** Optional field resolvers for computed or federated fields */
  readonly fields: FieldResolverMap<TResult, TContext> | undefined;
  /** Federation directives (@shareable, @inaccessible, @override, etc.) */
  readonly directives: FederationDirectiveMap | undefined;
  /** Additional metadata for tooling and extensions */
  readonly extensions: Record<string, unknown> | undefined;
}
/**
 * Federation directive configuration
 */
interface FederationDirectiveMap {
  readonly [fieldName: string]: ReadonlyArray<FederationDirective>;
}
interface FederationDirective {
  readonly type: '@shareable' | '@inaccessible' | '@tag' | '@override' | '@external' | '@provides' | '@requires';
  readonly args?: Record<string, unknown>;
}
/**
 * Entity reference resolver with Effect-based error handling
 *
 * Called when Apollo Federation needs to resolve an entity from a reference.
 * The reference contains the key fields that identify the entity uniquely.
 *
 * @template TResult - The complete entity type to be returned
 * @template TContext - The GraphQL execution context type
 * @template TReference - The reference type containing key fields
 *
 * @param reference - Object containing key fields to identify the entity
 * @param context - GraphQL execution context with services, user info, etc.
 * @param info - GraphQL execution info with field selection and metadata
 *
 * @returns Effect resolving to the entity or EntityResolutionError
 *
 * @example
 * ```typescript
 * const resolveUser: EntityReferenceResolver<User, AppContext, UserRef> =
 *   (ref, ctx, info) => pipe(
 *     ctx.userService.findById(ref.id),
 *     Effect.mapError(err =>
 *       ErrorFactory.entityResolution(
 *         `User ${ref.id} not found`, 'User', ref.id, err
 *       )
 *     )
 *   )
 * ```
 */
interface EntityReferenceResolver<TResult, TContext, TReference> {
  (reference: TReference, context: TContext, info: GraphQLResolveInfo): Effect.Effect<TResult, EntityResolutionError>;
}
/**
 * Field resolver map for federation entities
 */
type FieldResolverMap<TResult, TContext> = { readonly [K in keyof TResult]?: FieldResolver<TResult, TContext, TResult[K]> };
/**
 * GraphQL field resolver with Effect-based error handling
 *
 * Resolves a specific field on a GraphQL type, with proper error handling
 * and context propagation using the Effect system.
 *
 * @template TSource - The parent object type containing this field
 * @template TContext - The GraphQL execution context type
 * @template TReturn - The return type of this field
 * @template TArgs - The arguments passed to this field
 *
 * @param parent - The parent object being resolved
 * @param args - Arguments passed to the GraphQL field
 * @param context - Execution context with services and user info
 * @param info - GraphQL execution info with field selection
 *
 * @returns Effect resolving to field value or FieldResolutionError
 *
 * @example
 * ```typescript
 * const resolveUserEmail: FieldResolver<User, AppContext, string> =
 *   (user, args, ctx, info) => pipe(
 *     ctx.authService.checkAccess(ctx.user, 'read:email'),
 *     Effect.flatMap(() => Effect.succeed(user.email)),
 *     Effect.mapError(err =>
 *       ErrorFactory.fieldResolution(
 *         'Insufficient permissions for email field', 'email', 'User', err
 *       )
 *     )
 *   )
 * ```
 */
interface FieldResolver<TSource, TContext, TReturn, TArgs = Record<string, unknown>> {
  (parent: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): Effect.Effect<TReturn, FieldResolutionError>;
}
/**
 * Service definition for federation composition
 */
interface ServiceDefinition {
  readonly id: string;
  readonly url: string;
  readonly name?: string;
  readonly version?: string;
  readonly metadata?: Record<string, unknown>;
}
/**
 * Federation composition configuration
 */
interface FederationCompositionConfig {
  readonly entities: ReadonlyArray<FederationEntity<unknown, unknown, unknown, unknown>>;
  readonly services: ReadonlyArray<ServiceDefinition>;
  readonly errorBoundaries: ErrorBoundaryConfig;
  readonly performance: PerformanceConfig;
}
declare const asUntypedEntity: <TSource, TContext, TResult, TReference>(entity: FederationEntity<TSource, TContext, TResult, TReference>) => FederationEntity<unknown, unknown, unknown, unknown>;
/**
 * Error boundary configuration for circuit breakers and fault tolerance
 */
interface ErrorBoundaryConfig {
  readonly subgraphTimeouts: Record<string, Duration.Duration>;
  readonly circuitBreakerConfig: CircuitBreakerConfig;
  readonly partialFailureHandling: PartialFailureConfig;
  readonly errorTransformation?: ErrorTransformationConfig;
}
interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly resetTimeout: Duration.Duration;
  readonly halfOpenMaxCalls?: number;
}
interface PartialFailureConfig {
  readonly allowPartialFailure: boolean;
  readonly criticalSubgraphs?: ReadonlyArray<string>;
  readonly fallbackValues?: Record<string, unknown>;
}
interface ErrorTransformationConfig {
  readonly sanitizeErrors?: boolean;
  readonly includeStackTrace?: boolean;
  readonly customTransformer?: (error: Error) => Error;
}
/**
 * Performance optimization configuration
 */
interface PerformanceConfig {
  readonly queryPlanCache: QueryPlanCacheConfig;
  readonly dataLoaderConfig: DataLoaderConfig;
  readonly metricsCollection: MetricsConfig;
}
interface QueryPlanCacheConfig {
  readonly maxSize: number;
  readonly ttl?: Duration.Duration;
}
interface DataLoaderConfig {
  readonly maxBatchSize: number;
  readonly batchWindowMs?: number;
  readonly cacheKeyFn?: (key: unknown) => string;
  readonly enableBatchLogging?: boolean;
  readonly maxCacheOperations?: number;
  readonly maxExecutionMetrics?: number;
}
interface MetricsConfig {
  readonly enabled: boolean;
  readonly collectExecutionMetrics?: boolean;
  readonly collectCacheMetrics?: boolean;
  readonly maxExecutionMetrics?: number;
  readonly maxCacheOperations?: number;
}
/**
 * Schema composition result
 */
interface FederatedSchema {
  readonly schema: GraphQLSchema;
  readonly entities: ReadonlyArray<FederationEntity<unknown, unknown, unknown, unknown>>;
  readonly services: ReadonlyArray<ServiceDefinition>;
  readonly version: string;
  readonly metadata: SchemaMetadata;
}
interface SchemaMetadata {
  readonly createdAt: Date;
  readonly composedAt: Date;
  readonly federationVersion: string;
  readonly subgraphCount: number;
  readonly entityCount: number;
}
/**
 * Hot reloadable schema for development
 */
interface HotReloadableSchema {
  readonly schema: FederatedSchema;
  readonly watcher: SchemaWatcher;
  readonly reload: () => Effect.Effect<FederatedSchema, CompositionError>;
}
interface SchemaWatcher {
  readonly on: (event: 'schemaChanged' | 'error', handler: (data: unknown) => void) => void;
  readonly off: (event: string, handler?: (data: unknown) => void) => void;
  readonly close: () => Effect.Effect<void, never>;
}
/**
 * Subgraph registry for service discovery
 */
interface SubgraphRegistry {
  readonly register: (definition: ServiceDefinition) => Effect.Effect<void, RegistrationError>;
  readonly unregister: (serviceId: string) => Effect.Effect<void, RegistrationError>;
  readonly discover: () => Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError>;
  readonly health: (serviceId: string) => Effect.Effect<HealthStatus, HealthCheckError>;
}
/**
 * Health status of a federated subgraph service
 *
 * Represents the current operational status of a subgraph:
 * - `healthy`: Service responding normally with good performance
 * - `degraded`: Service responding but with poor performance or warnings
 * - `unhealthy`: Service not responding or returning errors
 *
 * @example
 * ```typescript
 * const health: HealthStatus = {
 *   status: 'healthy',
 *   serviceId: 'user-service',
 *   lastCheck: new Date(),
 *   metrics: {
 *     responseTimeMs: 42,
 *     statusCode: 200,
 *     memoryUsageMB: 256
 *   }
 * }
 * ```
 */
interface HealthStatus {
  /** Current health status of the service */
  readonly status: 'healthy' | 'unhealthy' | 'degraded';
  /** Unique identifier of the service */
  readonly serviceId: string;
  /** Timestamp when health check was last performed */
  readonly lastCheck?: Date;
  /** Optional metrics collected during health check */
  readonly metrics?: Record<string, number>;
}
/**
 * Circuit breaker state and operations
 *
 * Circuit breaker pattern implementation for fault tolerance:
 * - `closed`: Normal operation, all requests pass through
 * - `open`: Circuit is open, requests fail immediately (fail-fast)
 * - `half-open`: Testing phase, limited requests allowed to test recovery
 *
 * State transitions:
 * closed -> open: When failure threshold is exceeded
 * open -> half-open: After reset timeout expires
 * half-open -> closed: When test requests succeed
 * half-open -> open: When test requests fail
 *
 * @see {@link https://martinfowler.com/bliki/CircuitBreaker.html}
 */
type CircuitBreakerState = 'closed' | 'open' | 'half-open';
interface CircuitBreaker {
  readonly protect: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<A, E | CircuitBreakerError>;
  readonly getState: () => CircuitBreakerState;
  readonly getMetrics: () => CircuitBreakerMetrics;
}
interface CircuitBreakerMetrics {
  readonly failureCount: number;
  readonly lastFailureTime: number | null;
  readonly state: CircuitBreakerState;
  readonly lastStateChange?: number;
  readonly successCount?: number;
  readonly resetTimeoutMs?: number;
}
/**
 * Error types for comprehensive error handling
 */
/**
 * Schema first development types
 */
interface SchemaImportResult {
  readonly schema: Schema.Schema<unknown>;
  readonly directives: FederationDirectiveMap;
  readonly metadata: SchemaMetadata;
}
interface SyncResult {
  readonly changes: ReadonlyArray<SchemaChange>;
  readonly conflicts: ReadonlyArray<SchemaConflict>;
  readonly success: boolean;
}
interface SchemaChange {
  readonly type: 'add' | 'modify' | 'remove';
  readonly path: string;
  readonly description: string;
}
interface SchemaConflict {
  readonly path: string;
  readonly local: unknown;
  readonly remote: unknown;
  readonly resolution?: 'local' | 'remote' | 'merge';
}
/**
 * Union type for all domain errors with exhaustive matching support
 *
 * This discriminated union enables exhaustive pattern matching in error handlers,
 * ensuring all error cases are handled at compile time.
 *
 * @example
 * ```typescript
 * const handleError = (error: DomainError): string =>
 *   Match.value(error).pipe(
 *     Match.tag('ValidationError', err => `Validation failed: ${err.message}`),
 *     Match.tag('FederationError', err => `Federation error: ${err.message}`),
 *     Match.tag('EntityResolutionError', err => `Entity not found: ${err.message}`),
 *     // ... handle all error types
 *     Match.exhaustive // Compile error if any error type is missing
 *   )
 * ```
 */
type DomainError = EntityResolutionError | FieldResolutionError | ValidationError | SchemaValidationError | CompositionError | RegistrationError | DiscoveryError | HealthCheckError | CircuitBreakerError | TimeoutError | FederationError | TypeConversionError;
/**
 * Type-safe branded types for domain concepts
 *
 * Branded types prevent accidental mixing of semantically different strings,
 * providing compile-time safety for domain-specific identifiers.
 *
 * @example
 * ```typescript
 * const serviceId: ServiceId = 'user-service' as ServiceId
 * const typeName: EntityTypename = 'User' as EntityTypename
 *
 * // This would cause a compile error:
 * // const wrong: ServiceId = typeName  // Type error!
 * ```
 */
type ServiceId = string & {
  readonly __brand: 'ServiceId';
};
type EntityTypename = string & {
  readonly __brand: 'EntityTypename';
};
type FieldName = string & {
  readonly __brand: 'FieldName';
};
type QueryHash = string & {
  readonly __brand: 'QueryHash';
};
/**
 * Utility types for advanced type-level programming
 *
 * These utility types provide enhanced type safety and better developer
 * experience when working with complex federation configurations.
 */
/**
 * Prettify type - flattens intersection types for better IDE display
 *
 * @example
 * ```typescript
 * type Complex = { a: string } & { b: number }  // Shows as intersection
 * type Clean = Prettify<Complex>                // Shows as { a: string; b: number }
 * ```
 */
type Prettify<T> = { readonly [K in keyof T]: T[K] } & {};
/**
 * Non-empty array type - ensures array has at least one element
 *
 * @example
 * ```typescript
 * const keys: NonEmptyArray<string> = ['id']           // ✓ Valid
 * const empty: NonEmptyArray<string> = []              // ✗ Type error
 * ```
 */
type NonEmptyArray<T> = readonly [T, ...(readonly T[])];
/**
 * Require at least one property from a set of optional properties
 *
 * @example
 * ```typescript
 * type Config = {
 *   name?: string
 *   url?: string
 *   port?: number
 * }
 *
 * type ValidConfig = RequireAtLeastOne<Config, 'url' | 'port'>
 * // Must have at least url or port, name is still optional
 * ```
 */
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & { readonly [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];
/**
 * Extract resolver function type from a field
 *
 * @example
 * ```typescript
 * type UserResolver = ExtractResolver<User, AppContext, 'displayName'>
 * // Results in: (parent: User, args: any, context: AppContext, info: GraphQLResolveInfo) => ...
 * ```
 */
type ExtractResolver<TSource, TContext, TField extends keyof TSource> = FieldResolver<TSource, TContext, TSource[TField]>;
/**
 * Create a type-safe resolver map from an entity type
 *
 * @example
 * ```typescript
 * type UserResolvers = SafeResolverMap<User, AppContext>
 * // Only allows resolvers for actual User fields with correct types
 * ```
 */
type SafeResolverMap<TSource, TContext> = { readonly [K in keyof TSource]?: ExtractResolver<TSource, TContext, K> };
/**
 * Extract only the required keys from a type
 *
 * @example
 * ```typescript
 * type Required = RequiredKeys<{ id: string; name?: string; age?: number }>
 * // Results in: 'id'
 * ```
 */
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
/**
 * Extract only the optional keys from a type
 *
 * @example
 * ```typescript
 * type Optional = OptionalKeys<{ id: string; name?: string; age?: number }>
 * // Results in: 'name' | 'age'
 * ```
 */
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
/**
 * Make specific properties required while keeping others as-is
 *
 * @example
 * ```typescript
 * type User = { id?: string; name?: string; email?: string }
 * type UserWithId = MakeRequired<User, 'id'>  // { id: string; name?: string; email?: string }
 * ```
 */
type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
/**
 * Deep readonly type that makes all nested properties readonly
 *
 * @example
 * ```typescript
 * type Config = { db: { host: string; port: number } }
 * type ReadonlyConfig = DeepReadonly<Config>  // { readonly db: { readonly host: string; readonly port: number } }
 * ```
 */
type DeepReadonly<T> = { readonly [P in keyof T]: T[P] extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> : T[P] extends object ? DeepReadonly<T[P]> : T[P] };
//#endregion
//#region src/experimental/ultra-strict-entity-builder.d.ts
/**
 * Phantom type markers for compile-time validation states
 *
 * These phantom types ensure that the builder methods can only be called
 * in the correct order, providing compile-time guarantees about builder state.
 *
 * State transition flow:
 * Unvalidated -> HasSchema -> HasKeys -> HasDirectives -> Complete
 *
 * @example
 * ```typescript
 * const builder = UltraStrictEntityBuilder.create('User')  // Unvalidated
 *   .pipe(withSchema(UserSchema))                          // HasSchema
 *   .pipe(withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID)]))    // HasKeys
 *   .pipe(withDirectives([]))                              // HasDirectives
 *   .pipe(withResolvers({}))                               // Complete
 * ```
 */
declare namespace PhantomStates {
  /** Initial state - no configuration applied yet */
  interface Unvalidated {
    readonly _tag: 'Unvalidated';
  }
  /** Schema has been defined and validated */
  interface HasSchema {
    readonly _tag: 'HasSchema';
  }
  /** Entity keys have been defined and validated */
  interface HasKeys {
    readonly _tag: 'HasKeys';
  }
  /** Federation directives have been applied */
  interface HasDirectives {
    readonly _tag: 'HasDirectives';
  }
  /** Builder is complete and ready for validation */
  interface Complete {
    readonly _tag: 'Complete';
  }
}
/**
 * Entity validation result discriminated union
 */
type EntityValidationResult<A, I, R> = Data.TaggedEnum<{
  readonly Valid: {
    readonly entity: ValidatedEntity<A, I, R>;
    readonly metadata: EntityMetadata;
  };
  readonly InvalidSchema: {
    readonly errors: readonly SchemaValidationError$1[];
    readonly partialEntity?: Partial<ValidatedEntity<A, I, R>>;
  };
  readonly InvalidKeys: {
    readonly errors: readonly KeyValidationError[];
    readonly schema: Schema.Schema<A, I, R>;
  };
  readonly InvalidDirectives: {
    readonly errors: readonly DirectiveValidationError[];
    readonly schema: Schema.Schema<A, I, R>;
    readonly keys: readonly EntityKey[];
  };
  readonly CircularDependency: {
    readonly cycle: readonly string[];
    readonly involvedEntities: readonly string[];
  };
  readonly IncompatibleVersion: {
    readonly requiredVersion: string;
    readonly currentVersion: string;
    readonly entity: string;
  };
}>;
declare const EntityValidationResult: {
  readonly Valid: Data.Case.Constructor<{
    readonly _tag: "Valid";
    readonly entity: ValidatedEntity<any, any, any>;
    readonly metadata: EntityMetadata;
  }, "_tag">;
  readonly InvalidSchema: Data.Case.Constructor<{
    readonly _tag: "InvalidSchema";
    readonly errors: readonly SchemaValidationError$1[];
    readonly partialEntity?: Partial<ValidatedEntity<any, any, any>>;
  }, "_tag">;
  readonly InvalidKeys: Data.Case.Constructor<{
    readonly _tag: "InvalidKeys";
    readonly errors: readonly KeyValidationError[];
    readonly schema: Schema.Schema<any, any, any>;
  }, "_tag">;
  readonly InvalidDirectives: Data.Case.Constructor<{
    readonly _tag: "InvalidDirectives";
    readonly errors: readonly DirectiveValidationError[];
    readonly schema: Schema.Schema<any, any, any>;
    readonly keys: readonly EntityKey[];
  }, "_tag">;
  readonly CircularDependency: Data.Case.Constructor<{
    readonly _tag: "CircularDependency";
    readonly cycle: readonly string[];
    readonly involvedEntities: readonly string[];
  }, "_tag">;
  readonly IncompatibleVersion: Data.Case.Constructor<{
    readonly _tag: "IncompatibleVersion";
    readonly requiredVersion: string;
    readonly currentVersion: string;
    readonly entity: string;
  }, "_tag">;
  readonly $is: <Tag extends "Valid" | "InvalidSchema" | "InvalidKeys" | "InvalidDirectives" | "CircularDependency" | "IncompatibleVersion">(tag: Tag) => (u: unknown) => u is Extract<{
    readonly _tag: "Valid";
    readonly entity: ValidatedEntity<any, any, any>;
    readonly metadata: EntityMetadata;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "InvalidSchema";
    readonly errors: readonly SchemaValidationError$1[];
    readonly partialEntity?: Partial<ValidatedEntity<any, any, any>>;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "InvalidKeys";
    readonly errors: readonly KeyValidationError[];
    readonly schema: Schema.Schema<any, any, any>;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "InvalidDirectives";
    readonly errors: readonly DirectiveValidationError[];
    readonly schema: Schema.Schema<any, any, any>;
    readonly keys: readonly EntityKey[];
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "CircularDependency";
    readonly cycle: readonly string[];
    readonly involvedEntities: readonly string[];
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "IncompatibleVersion";
    readonly requiredVersion: string;
    readonly currentVersion: string;
    readonly entity: string;
  }, {
    readonly _tag: Tag;
  }>;
  readonly $match: {
    <const Cases extends {
      readonly Valid: (args: {
        readonly _tag: "Valid";
        readonly entity: ValidatedEntity<any, any, any>;
        readonly metadata: EntityMetadata;
      }) => any;
      readonly InvalidSchema: (args: {
        readonly _tag: "InvalidSchema";
        readonly errors: readonly SchemaValidationError$1[];
        readonly partialEntity?: Partial<ValidatedEntity<any, any, any>>;
      }) => any;
      readonly InvalidKeys: (args: {
        readonly _tag: "InvalidKeys";
        readonly errors: readonly KeyValidationError[];
        readonly schema: Schema.Schema<any, any, any>;
      }) => any;
      readonly InvalidDirectives: (args: {
        readonly _tag: "InvalidDirectives";
        readonly errors: readonly DirectiveValidationError[];
        readonly schema: Schema.Schema<any, any, any>;
        readonly keys: readonly EntityKey[];
      }) => any;
      readonly CircularDependency: (args: {
        readonly _tag: "CircularDependency";
        readonly cycle: readonly string[];
        readonly involvedEntities: readonly string[];
      }) => any;
      readonly IncompatibleVersion: (args: {
        readonly _tag: "IncompatibleVersion";
        readonly requiredVersion: string;
        readonly currentVersion: string;
        readonly entity: string;
      }) => any;
    }>(cases: Cases & { [K in Exclude<keyof Cases, "Valid" | "InvalidSchema" | "InvalidKeys" | "InvalidDirectives" | "CircularDependency" | "IncompatibleVersion">]: never }): (value: {
      readonly _tag: "Valid";
      readonly entity: ValidatedEntity<any, any, any>;
      readonly metadata: EntityMetadata;
    } | {
      readonly _tag: "InvalidSchema";
      readonly errors: readonly SchemaValidationError$1[];
      readonly partialEntity?: Partial<ValidatedEntity<any, any, any>>;
    } | {
      readonly _tag: "InvalidKeys";
      readonly errors: readonly KeyValidationError[];
      readonly schema: Schema.Schema<any, any, any>;
    } | {
      readonly _tag: "InvalidDirectives";
      readonly errors: readonly DirectiveValidationError[];
      readonly schema: Schema.Schema<any, any, any>;
      readonly keys: readonly EntityKey[];
    } | {
      readonly _tag: "CircularDependency";
      readonly cycle: readonly string[];
      readonly involvedEntities: readonly string[];
    } | {
      readonly _tag: "IncompatibleVersion";
      readonly requiredVersion: string;
      readonly currentVersion: string;
      readonly entity: string;
    }) => effect_Unify0.Unify<ReturnType<Cases["Valid" | "InvalidSchema" | "InvalidKeys" | "InvalidDirectives" | "CircularDependency" | "IncompatibleVersion"]>>;
    <const Cases extends {
      readonly Valid: (args: {
        readonly _tag: "Valid";
        readonly entity: ValidatedEntity<any, any, any>;
        readonly metadata: EntityMetadata;
      }) => any;
      readonly InvalidSchema: (args: {
        readonly _tag: "InvalidSchema";
        readonly errors: readonly SchemaValidationError$1[];
        readonly partialEntity?: Partial<ValidatedEntity<any, any, any>>;
      }) => any;
      readonly InvalidKeys: (args: {
        readonly _tag: "InvalidKeys";
        readonly errors: readonly KeyValidationError[];
        readonly schema: Schema.Schema<any, any, any>;
      }) => any;
      readonly InvalidDirectives: (args: {
        readonly _tag: "InvalidDirectives";
        readonly errors: readonly DirectiveValidationError[];
        readonly schema: Schema.Schema<any, any, any>;
        readonly keys: readonly EntityKey[];
      }) => any;
      readonly CircularDependency: (args: {
        readonly _tag: "CircularDependency";
        readonly cycle: readonly string[];
        readonly involvedEntities: readonly string[];
      }) => any;
      readonly IncompatibleVersion: (args: {
        readonly _tag: "IncompatibleVersion";
        readonly requiredVersion: string;
        readonly currentVersion: string;
        readonly entity: string;
      }) => any;
    }>(value: {
      readonly _tag: "Valid";
      readonly entity: ValidatedEntity<any, any, any>;
      readonly metadata: EntityMetadata;
    } | {
      readonly _tag: "InvalidSchema";
      readonly errors: readonly SchemaValidationError$1[];
      readonly partialEntity?: Partial<ValidatedEntity<any, any, any>>;
    } | {
      readonly _tag: "InvalidKeys";
      readonly errors: readonly KeyValidationError[];
      readonly schema: Schema.Schema<any, any, any>;
    } | {
      readonly _tag: "InvalidDirectives";
      readonly errors: readonly DirectiveValidationError[];
      readonly schema: Schema.Schema<any, any, any>;
      readonly keys: readonly EntityKey[];
    } | {
      readonly _tag: "CircularDependency";
      readonly cycle: readonly string[];
      readonly involvedEntities: readonly string[];
    } | {
      readonly _tag: "IncompatibleVersion";
      readonly requiredVersion: string;
      readonly currentVersion: string;
      readonly entity: string;
    }, cases: Cases & { [K in Exclude<keyof Cases, "Valid" | "InvalidSchema" | "InvalidKeys" | "InvalidDirectives" | "CircularDependency" | "IncompatibleVersion">]: never }): effect_Unify0.Unify<ReturnType<Cases["Valid" | "InvalidSchema" | "InvalidKeys" | "InvalidDirectives" | "CircularDependency" | "IncompatibleVersion"]>>;
  };
};
declare const SchemaValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "SchemaValidationError";
} & Readonly<A>;
/**
 * Schema validation error for ultra-strict entity builder
 * @category Experimental
 */
declare class SchemaValidationError$1 extends SchemaValidationError_base<{
  readonly message: string;
  readonly schemaPath: readonly string[];
  readonly suggestion?: string;
}> {}
declare const KeyValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "KeyValidationError";
} & Readonly<A>;
/**
 * Key validation error for ultra-strict entity builder
 * @category Experimental
 */
declare class KeyValidationError extends KeyValidationError_base<{
  readonly message: string;
  readonly keyField: string;
  readonly entityType: string;
  readonly suggestion?: string;
}> {}
declare const DirectiveValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "DirectiveValidationError";
} & Readonly<A>;
/**
 * Directive validation error for ultra-strict entity builder
 * @category Experimental
 */
declare class DirectiveValidationError extends DirectiveValidationError_base<{
  readonly message: string;
  readonly directive: string;
  readonly field?: string;
  readonly suggestion?: string;
}> {}
declare const EntityBuilderError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "EntityBuilderError";
} & Readonly<A>;
/**
 * Entity builder error for ultra-strict entity builder
 * @category Experimental
 */
declare class EntityBuilderError extends EntityBuilderError_base<{
  readonly message: string;
  readonly builderState: string;
  readonly suggestion?: string;
}> {}
/**
 * Entity key definition for ultra-strict entity builder
 * @category Experimental
 */
interface EntityKey {
  readonly field: string;
  readonly type: GraphQLOutputType;
  readonly isComposite: boolean;
}
/**
 * Entity directive definition for ultra-strict entity builder
 * @category Experimental
 */
interface EntityDirective {
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly applicableFields?: readonly string[] | undefined;
}
/**
 * Entity metadata for ultra-strict entity builder
 * @category Experimental
 */
interface EntityMetadata {
  readonly typename: string;
  readonly version: string;
  readonly createdAt: Date;
  readonly validationLevel: 'strict' | 'ultra-strict';
  readonly dependencies: readonly string[];
}
/**
 * Validated entity for ultra-strict entity builder
 * @category Experimental
 */
interface ValidatedEntity<A, I, R> {
  readonly typename: string;
  readonly schema: Schema.Schema<A, I, R>;
  readonly keys: readonly EntityKey[];
  readonly directives: readonly EntityDirective[];
  readonly resolvers: Record<string, GraphQLFieldResolver<A, I, R>>;
  readonly metadata: EntityMetadata;
}
interface UltraStrictEntityBuilder<TState extends PhantomStates.Unvalidated | PhantomStates.HasSchema | PhantomStates.HasKeys | PhantomStates.HasDirectives | PhantomStates.Complete, A = unknown, I = unknown, R = never> {
  readonly _phantomState: TState;
  readonly typename: string;
  readonly schema?: Schema.Schema<A, I, R>;
  readonly keys?: readonly EntityKey[];
  readonly directives?: readonly EntityDirective[];
  readonly resolvers?: Record<string, GraphQLFieldResolver<A, I, R>>;
}
/**
 * Creates a new UltraStrictEntityBuilder with compile-time state tracking
 *
 * The builder uses phantom types to enforce correct usage order at compile time.
 * This prevents runtime errors by catching configuration mistakes during development.
 *
 * @param typename - The GraphQL type name for this entity
 * @returns Builder in Unvalidated state, requiring schema definition next
 *
 * @example
 * ```typescript
 * const userBuilder = createUltraStrictEntityBuilder('User')
 * // Next step must be withSchema - compiler enforces this
 * ```
 */
declare const createUltraStrictEntityBuilder: (typename: string) => UltraStrictEntityBuilder<PhantomStates.Unvalidated>;
/**
 * Type-safe schema attachment (only valid in Unvalidated state)
 *
 * Attaches an Effect Schema to the entity for runtime validation.
 * The phantom type system ensures this can only be called on an unvalidated builder.
 *
 * @template A - The schema type being attached
 * @param schema - Effect Schema instance for validation
 * @returns Function that takes Unvalidated builder and returns HasSchema builder
 *
 * @example
 * ```typescript
 * const UserSchema = Schema.Struct({
 *   id: Schema.String,
 *   name: Schema.String,
 *   email: Schema.String
 * })
 *
 * const builderWithSchema = createUltraStrictEntityBuilder('User')
 *   .pipe(withSchema(UserSchema))
 * ```
 */
declare const withSchema: <A, I, R>(schema?: Schema.Schema<A, I, R>) => (builder: UltraStrictEntityBuilder<PhantomStates.Unvalidated, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R>;
/**
 * Type-safe key definition (only valid in HasSchema state)
 *
 * Defines the key fields that uniquely identify this entity across subgraphs.
 * The phantom type system ensures schema is attached before keys can be defined.
 *
 * @param keys - Array of EntityKey objects defining the unique identifier(s)
 * @returns Function that takes HasSchema builder and returns HasKeys builder
 *
 * @example
 * ```typescript
 * const keys = [
 *   UltraStrictEntityBuilder.Key.create('id', GraphQLID, false),
 *   UltraStrictEntityBuilder.Key.create('organizationId', GraphQLID, false) // Composite key
 * ]
 *
 * const builderWithKeys = builderWithSchema
 *   .pipe(withKeys(keys))
 * ```
 */
declare const withKeys: <A, I, R>(keys?: readonly EntityKey[]) => (builder: UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.HasKeys, A, I, R>;
/**
 * Type-safe directive application (only valid in HasKeys state)
 *
 * Applies Federation directives to the entity. The phantom type system ensures
 * both schema and keys are defined before directives can be applied.
 *
 * @param directives - Array of Federation directives (@shareable, @inaccessible, etc.)
 * @returns Function that takes HasKeys builder and returns HasDirectives builder
 *
 * @example
 * ```typescript
 * const directives = [
 *   UltraStrictEntityBuilder.Directive.shareable(),
 *   UltraStrictEntityBuilder.Directive.tag('public'),
 *   UltraStrictEntityBuilder.Directive.provides('email')
 * ]
 *
 * const builderWithDirectives = builderWithKeys
 *   .pipe(withDirectives(directives))
 * ```
 */
declare const withDirectives: <A, I, R>(directives?: readonly EntityDirective[]) => (builder: UltraStrictEntityBuilder<PhantomStates.HasKeys, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.HasDirectives, A, I, R>;
/**
 * Type-safe resolver attachment (only valid in HasDirectives state)
 *
 * Attaches field resolvers to the entity. The phantom type system ensures
 * all previous configuration steps are complete before resolvers can be attached.
 *
 * @param resolvers - Record of field name to resolver function mappings
 * @returns Function that takes HasDirectives builder and returns Complete builder
 *
 * @example
 * ```typescript
 * const resolvers = {
 *   displayName: (user) => `${user.firstName} ${user.lastName}`,
 *   avatar: (user, args, ctx) => ctx.imageService.getAvatar(user.id),
 *   posts: (user, args, ctx) => ctx.postService.findByUserId(user.id)
 * }
 *
 * const completeBuilder = builderWithDirectives
 *   .pipe(withResolvers(resolvers))
 * ```
 */
declare const withResolvers: <A, I, R>(resolvers?: Record<string, GraphQLFieldResolver<A, I, R>>) => (builder: UltraStrictEntityBuilder<PhantomStates.HasDirectives, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>;
/**
 * Validates a complete entity builder using exhaustive pattern matching
 */
declare const validateEntityBuilder: <A, I, R>(builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>) => Effect$1.Effect<EntityValidationResult<A, I, R>, EntityBuilderError>;
/**
 * Exhaustive pattern matching over entity validation results
 */
declare const matchEntityValidationResult: <A, I, R>(handlers: {
  readonly Valid: (data: {
    readonly entity: ValidatedEntity<A, I, R>;
    readonly metadata: EntityMetadata;
  }) => A;
  readonly InvalidSchema: (data: {
    readonly errors: readonly SchemaValidationError$1[];
    readonly partialEntity?: Partial<ValidatedEntity<A, I, R>>;
  }) => A;
  readonly InvalidKeys: (data: {
    readonly errors: readonly KeyValidationError[];
    readonly schema: Schema.Schema<A, I, R>;
  }) => A;
  readonly InvalidDirectives: (data: {
    readonly errors: readonly DirectiveValidationError[];
    readonly schema: Schema.Schema<A, I, R>;
    readonly keys: readonly EntityKey[];
  }) => A;
  readonly CircularDependency: (data: {
    readonly cycle: readonly string[];
    readonly involvedEntities: readonly string[];
  }) => A;
  readonly IncompatibleVersion: (data: {
    readonly requiredVersion: string;
    readonly currentVersion: string;
    readonly entity: string;
  }) => A;
}) => (result: EntityValidationResult<A, I, R>) => A;
/**
 * UltraStrictEntityBuilder namespace with static utilities
 *
 * This provides the expected API surface that tests and examples use
 */
declare namespace UltraStrictEntityBuilder {
  /**
   * Directive utilities namespace for creating federation directives
   */
  namespace Directive {
    const shareable: () => EntityDirective;
    const inaccessible: () => EntityDirective;
    const tag: (name: string) => EntityDirective;
    const override: (from: string) => EntityDirective;
    const external: () => EntityDirective;
    const provides: (fields: string) => EntityDirective;
    const requires: (fields: string) => EntityDirective;
  }
  /**
   * Key utilities namespace for creating entity keys
   */
  namespace Key {
    const create: (field: string, type: GraphQLOutputType, isComposite?: boolean) => EntityKey;
  }
}
//#endregion
//#region src/core/builders/entity-builder.d.ts
/**
 * Modern Federation Entity Builder with full Apollo Federation 2.x directive support
 *
 * A fluent builder for creating federated GraphQL entities with comprehensive directive support,
 * Effect-based error handling, and type-safe field resolution.
 *
 * ## Features
 * - 🏗️ **Fluent Builder Pattern**: Chainable methods for entity configuration
 * - 🌐 **Full Federation 2.x Support**: All directives (@shareable, @inaccessible, @tag, @override, @external, @requires, @provides)
 * - ⚡ **Effect-Based Operations**: Type-safe error handling with Effect.Effect
 * - 🔒 **Type Safety**: Generic constraints ensure compile-time validation
 * - 🛡️ **Directive Validation**: Automatic conflict detection and validation
 * - 🎯 **Reference Resolution**: Seamless entity resolution across subgraphs
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { createEntityBuilder } from '@cqrs/federation-v2'
 * import { Effect } from 'effect'
 * import * as Schema from '@effect/schema/Schema'
 *
 * // Define entity schema
 * const UserSchema = Schema.Struct({
 *   id: Schema.String,
 *   email: Schema.String,
 *   name: Schema.String,
 *   avatar: Schema.String
 * })
 *
 * // Build federated entity
 * const userEntity = createEntityBuilder('User', UserSchema, ['id'])
 *   .withShareableField('name')
 *   .withInaccessibleField('email')
 *   .withTaggedField('avatar', ['public', 'cdn'])
 *   .withReferenceResolver(resolveUserFromReference)
 *   .build()
 * ```
 *
 * ## Advanced Directive Usage
 *
 * ```typescript
 * // Override field from another subgraph
 * const productEntity = createEntityBuilder('Product', ProductSchema, ['id'])
 *   .withOverrideField('price', 'inventory-service', resolvePriceFromInventory)
 *   .withRequiredFields('availability', 'id sku', resolveAvailability)
 *   .withProvidedFields('summary', 'name description', resolveSummary)
 *   .build()
 * ```
 *
 * ## Type Parameters
 * @template TSource - Source data type (e.g., from database or API)
 * @template TContext - GraphQL execution context type containing services, user info, etc.
 * @template TResult - Resolved entity type returned to GraphQL clients
 * @template TReference - Reference type containing key fields for entity resolution
 *
 * @category Entity Builders
 * @see {@link createEntityBuilder} - Factory function for creating entity builders
 * @see {@link https://www.apollographql.com/docs/federation/entities/ | Apollo Federation Entities}
 * @see {@link https://effect.website/docs/essentials/effect-type | Effect Documentation}
 */
declare class FederationEntityBuilder<TSource extends Record<string, unknown> = Record<string, unknown>, TContext = Record<string, unknown>, TResult = TSource, TReference extends Record<string, any> = Record<string, any>> {
  private readonly typename;
  private readonly schema;
  private readonly keyFields;
  private readonly directiveMap;
  private readonly fieldResolvers;
  private readonly referenceResolver?;
  private readonly extensions?;
  constructor(typename: string, schema: Schema.Schema<TSource, any, any>, keyFields: ReadonlyArray<keyof TSource>, directiveMap?: FederationDirectiveMap, fieldResolvers?: FieldResolverMap<TResult, TContext>, referenceResolver?: EntityReferenceResolver<TResult, TContext, TReference> | undefined, extensions?: Record<string, unknown> | undefined);
  private validateConstructorArgs;
  /**
   * Marks a field as @shareable, indicating it can be resolved by multiple subgraphs
   *
   * The @shareable directive allows multiple subgraphs to define and resolve the same field.
   * This is useful for common fields that can be computed by different services.
   *
   * @example Basic shareable field
   * ```typescript
   * const entity = createEntityBuilder('Product', ProductSchema, ['id'])
   *   .withShareableField('name') // Multiple subgraphs can resolve 'name'
   *   .build()
   * ```
   *
   * @example Shareable field with custom resolver
   * ```typescript
   * const entity = createEntityBuilder('User', UserSchema, ['id'])
   *   .withShareableField('displayName', (user, args, context) =>
   *     Effect.succeed(`${user.firstName} ${user.lastName}`)
   *   )
   *   .build()
   * ```
   *
   * @param field - Field name to mark as shareable
   * @param resolver - Optional custom resolver for this field
   * @returns New builder instance with the shareable directive applied
   * @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#shareable | @shareable Directive}
   */
  withShareableField<K extends keyof TResult>(field: K, resolver?: FieldResolver<TResult, TContext, TResult[K]>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Marks a field as @inaccessible, hiding it from the public schema while keeping it available for federation
   *
   * The @inaccessible directive prevents a field from appearing in the supergraph schema
   * but allows it to be used internally for federation operations like @requires and @provides.
   *
   * @example Hide sensitive internal field
   * ```typescript
   * const entity = createEntityBuilder('User', UserSchema, ['id'])
   *   .withInaccessibleField('internalId') // Hidden from public API
   *   .withInaccessibleField('auditLog')   // Internal tracking field
   *   .build()
   * ```
   *
   * @example Use inaccessible field in other directives
   * ```typescript
   * const entity = createEntityBuilder('Order', OrderSchema, ['id'])
   *   .withInaccessibleField('userId')  // Hidden but available for federation
   *   .withRequiredFields('total', 'userId', calculateTotal) // Can reference userId
   *   .build()
   * ```
   *
   * @param field - Field name to mark as inaccessible
   * @param resolver - Optional custom resolver for this field
   * @returns New builder instance with the inaccessible directive applied
   * @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#inaccessible | @inaccessible Directive}
   */
  withInaccessibleField<K extends keyof TResult>(field: K, resolver?: FieldResolver<TResult, TContext, TResult[K]>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Marks field with @tag - Metadata tags for schema organization and tooling
   *
   * The @tag directive allows you to apply arbitrary string metadata to schema elements.
   * This is useful for schema organization, filtering, and tooling integration.
   *
   * @example Basic field tagging
   * ```typescript
   * const entity = createEntityBuilder('User', UserSchema, ['id'])
   *   .withTaggedField('avatar', ['public', 'cdn'])     // Mark as public CDN field
   *   .withTaggedField('preferences', ['internal'])      // Internal-only field
   *   .build()
   * ```
   *
   * @example Multi-environment tagging
   * ```typescript
   * const entity = createEntityBuilder('Product', ProductSchema, ['id'])
   *   .withTaggedField('betaFeatures', ['beta', 'experimental'])
   *   .withTaggedField('adminOnly', ['admin', 'restricted'])
   *   .build()
   * ```
   *
   * @param field - Field name to tag
   * @param tags - Array of tag strings (cannot be empty)
   * @param resolver - Optional custom resolver for this field
   * @returns New builder instance with the tag directive applied
   * @throws Error if tags array is empty
   * @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#tag | @tag Directive}
   */
  withTaggedField<K extends keyof TResult>(field: K, tags: ReadonlyArray<string>, resolver?: FieldResolver<TResult, TContext, TResult[K]>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Marks field with @override - Overrides field resolution from another subgraph
   *
   * The @override directive indicates that the current subgraph is taking over
   * responsibility for resolving a particular field from the specified subgraph.
   * This allows for gradual migration of field ownership between services.
   *
   * @example Basic field override
   * ```typescript
   * const entity = createEntityBuilder('Product', ProductSchema, ['id'])
   *   .withOverrideField('price', 'legacy-service',
   *     (product, args, context) =>
   *       context.pricingService.getPrice(product.id)
   *   )
   *   .build()
   * ```
   *
   * @example Service migration scenario
   * ```typescript
   * // Taking over user profile management from auth service
   * const userEntity = createEntityBuilder('User', UserSchema, ['id'])
   *   .withOverrideField('profile', 'auth-service', resolveUserProfile)
   *   .withOverrideField('preferences', 'auth-service', resolveUserPreferences)
   *   .build()
   * ```
   *
   * @param field - Field name to override
   * @param fromSubgraph - Name of the subgraph being overridden (cannot be empty)
   * @param resolver - Custom resolver implementing the override logic (required)
   * @returns New builder instance with the override directive applied
   * @throws Error if fromSubgraph is empty
   * @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#override | @override Directive}
   */
  withOverrideField<K extends keyof TResult>(field: K, fromSubgraph: string, resolver: FieldResolver<TResult, TContext, TResult[K]>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Marks field as @external - Field is defined in another subgraph but needed locally
   *
   * The @external directive indicates that a field is not resolved by the current subgraph
   * but is defined elsewhere and needed for federation operations like @requires and @provides.
   * External fields are typically used as dependencies for computed fields.
   *
   * @example Using external field as dependency
   * ```typescript
   * const entity = createEntityBuilder('Order', OrderSchema, ['id'])
   *   .withExternalField('userId')      // Defined in user service
   *   .withExternalField('productId')   // Defined in product service
   *   .withRequiredFields('total', 'userId productId', calculateOrderTotal)
   *   .build()
   * ```
   *
   * @example Complex federation with external dependencies
   * ```typescript
   * const entity = createEntityBuilder('Review', ReviewSchema, ['id'])
   *   .withExternalField('productName')     // From product service
   *   .withExternalField('userName')        // From user service
   *   .withProvidedFields('summary', 'productName userName', generateSummary)
   *   .build()
   * ```
   *
   * @param field - Field name to mark as external (must exist in schema)
   * @returns New builder instance with the external directive applied
   * @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#external | @external Directive}
   */
  withExternalField<K extends keyof TResult>(field: K): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Marks field with @requires - Field requires specific fields from base type
   */
  withRequiredFields<K extends keyof TResult>(field: K, requiredFields: string, resolver?: FieldResolver<TResult, TContext, TResult[K]>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Marks field with @provides - Field provides specific fields to base type
   */
  withProvidedFields<K extends keyof TResult>(field: K, providedFields: string, resolver?: FieldResolver<TResult, TContext, TResult[K]>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Add a custom field resolver without directives
   */
  withField<K extends keyof TResult>(field: K, resolver: FieldResolver<TResult, TContext, TResult[K]>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Set the reference resolver for entity resolution
   */
  withReferenceResolver(resolver: EntityReferenceResolver<TResult, TContext, TReference>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Add extension metadata to the entity
   */
  withExtensions(extensions: Record<string, unknown>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Internal method to add directives with validation
   */
  private addDirective;
  /**
   * Validate directive conflicts and usage rules
   */
  private validateDirectiveConflicts;
  /**
   * Build the complete federation entity with Effect-based resolution
   */
  build(): Effect.Effect<ValidatedEntity<TSource, TContext, TResult>, ValidationError>;
  /**
   * Validate that all required components are present for building
   */
  private validateBuildRequirements;
  /**
   * Create the federation entity instance
   */
  private createFederationEntity;
  /**
   * Validate entity reference using key fields
   */
  private validateReference;
  /**
   * Create a default reference resolver that validates key fields
   */
  createDefaultReferenceResolver(): EntityReferenceResolver<TResult, TContext, TReference>;
  /**
   * Template method for entity resolution - can be overridden by subclasses
   */
  protected resolveEntityFromReference(reference: TReference, _context: TContext, _info: GraphQLResolveInfo): Effect.Effect<TResult, EntityResolutionError>;
}
/**
 * Factory function for creating entity builders with proper type inference
 */
declare const createEntityBuilder: <TSource extends Record<string, unknown> = Record<string, unknown>, TContext extends Record<string, unknown> = Record<string, unknown>, TResult = TSource, TReference extends Record<string, any> = Record<string, any>>(typename: string, schema: Schema.Schema<TSource, any, any>, keyFields: ReadonlyArray<keyof TSource>) => FederationEntityBuilder<TSource, TContext, TResult, TReference>;
//#endregion
//#region src/core/schema-first-patterns.d.ts
/**
 * Schema development lifecycle states
 */
type SchemaLifecycleState = Data.TaggedEnum<{
  readonly Draft: {
    readonly schema: DocumentNode;
    readonly version: string;
  };
  readonly Validated: {
    readonly schema: DocumentNode;
    readonly entities: readonly ValidatedEntity<any, any, any>[];
    readonly version: string;
  };
  readonly Composed: {
    readonly federatedSchema: GraphQLSchema;
    readonly subgraphs: readonly string[];
    readonly version: string;
  };
  readonly Deployed: {
    readonly federatedSchema: GraphQLSchema;
    readonly deploymentId: string;
    readonly version: string;
  };
  readonly Deprecated: {
    readonly schema: DocumentNode;
    readonly replacedBy: string;
    readonly version: string;
  };
}>;
declare const SchemaLifecycleState: {
  readonly Draft: Data.Case.Constructor<{
    readonly _tag: "Draft";
    readonly schema: DocumentNode;
    readonly version: string;
  }, "_tag">;
  readonly Validated: Data.Case.Constructor<{
    readonly _tag: "Validated";
    readonly schema: DocumentNode;
    readonly entities: readonly ValidatedEntity<any, any, any>[];
    readonly version: string;
  }, "_tag">;
  readonly Composed: Data.Case.Constructor<{
    readonly _tag: "Composed";
    readonly federatedSchema: GraphQLSchema;
    readonly subgraphs: readonly string[];
    readonly version: string;
  }, "_tag">;
  readonly Deployed: Data.Case.Constructor<{
    readonly _tag: "Deployed";
    readonly federatedSchema: GraphQLSchema;
    readonly deploymentId: string;
    readonly version: string;
  }, "_tag">;
  readonly Deprecated: Data.Case.Constructor<{
    readonly _tag: "Deprecated";
    readonly schema: DocumentNode;
    readonly replacedBy: string;
    readonly version: string;
  }, "_tag">;
  readonly $is: <Tag extends "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">(tag: Tag) => (u: unknown) => u is Extract<{
    readonly _tag: "Draft";
    readonly schema: DocumentNode;
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Validated";
    readonly schema: DocumentNode;
    readonly entities: readonly ValidatedEntity<any, any, any>[];
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Composed";
    readonly federatedSchema: GraphQLSchema;
    readonly subgraphs: readonly string[];
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Deployed";
    readonly federatedSchema: GraphQLSchema;
    readonly deploymentId: string;
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Deprecated";
    readonly schema: DocumentNode;
    readonly replacedBy: string;
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }>;
  readonly $match: {
    <const Cases extends {
      readonly Draft: (args: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      }) => any;
      readonly Validated: (args: {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<any, any, any>[];
        readonly version: string;
      }) => any;
      readonly Composed: (args: {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      }) => any;
      readonly Deployed: (args: {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      }) => any;
      readonly Deprecated: (args: {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }) => any;
    }>(cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): (value: {
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    } | {
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<any, any, any>[];
      readonly version: string;
    } | {
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    } | {
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    } | {
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }) => effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
    <const Cases extends {
      readonly Draft: (args: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      }) => any;
      readonly Validated: (args: {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<any, any, any>[];
        readonly version: string;
      }) => any;
      readonly Composed: (args: {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      }) => any;
      readonly Deployed: (args: {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      }) => any;
      readonly Deprecated: (args: {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }) => any;
    }>(value: {
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    } | {
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<any, any, any>[];
      readonly version: string;
    } | {
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    } | {
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    } | {
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }, cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
  };
};
/**
 * Schema evolution operations
 */
type SchemaEvolution = Data.TaggedEnum<{
  readonly AddField: {
    readonly entityType: string;
    readonly fieldName: string;
    readonly fieldType: string;
    readonly isBreaking: boolean;
  };
  readonly RemoveField: {
    readonly entityType: string;
    readonly fieldName: string;
    readonly isBreaking: boolean;
  };
  readonly ChangeFieldType: {
    readonly entityType: string;
    readonly fieldName: string;
    readonly oldType: string;
    readonly newType: string;
    readonly isBreaking: boolean;
  };
  readonly AddDirective: {
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  };
  readonly RemoveDirective: {
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  };
  readonly AddEntity: {
    readonly entityType: string;
    readonly isBreaking: boolean;
  };
  readonly RemoveEntity: {
    readonly entityType: string;
    readonly isBreaking: boolean;
  };
}>;
declare const SchemaEvolution: {
  readonly AddField: Data.Case.Constructor<{
    readonly _tag: "AddField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly fieldType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly RemoveField: Data.Case.Constructor<{
    readonly _tag: "RemoveField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly ChangeFieldType: Data.Case.Constructor<{
    readonly _tag: "ChangeFieldType";
    readonly entityType: string;
    readonly fieldName: string;
    readonly oldType: string;
    readonly newType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly AddDirective: Data.Case.Constructor<{
    readonly _tag: "AddDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly RemoveDirective: Data.Case.Constructor<{
    readonly _tag: "RemoveDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly AddEntity: Data.Case.Constructor<{
    readonly _tag: "AddEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly RemoveEntity: Data.Case.Constructor<{
    readonly _tag: "RemoveEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly $is: <Tag extends "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">(tag: Tag) => (u: unknown) => u is Extract<{
    readonly _tag: "AddField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly fieldType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "RemoveField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "ChangeFieldType";
    readonly entityType: string;
    readonly fieldName: string;
    readonly oldType: string;
    readonly newType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "AddDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "RemoveDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "AddEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "RemoveEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }>;
  readonly $match: {
    <const Cases extends {
      readonly AddField: (args: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveField: (args: {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly ChangeFieldType: (args: {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddDirective: (args: {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveDirective: (args: {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddEntity: (args: {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveEntity: (args: {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
    }>(cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): (value: {
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }) => effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
    <const Cases extends {
      readonly AddField: (args: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveField: (args: {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly ChangeFieldType: (args: {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddDirective: (args: {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveDirective: (args: {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddEntity: (args: {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveEntity: (args: {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
    }>(value: {
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
  };
};
declare const SchemaFirstError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "SchemaFirstError";
} & Readonly<A>;
declare class SchemaFirstError extends SchemaFirstError_base<{
  readonly message: string;
  readonly schemaPath?: readonly string[];
  readonly suggestion?: string;
}> {}
declare const SchemaEvolutionError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "SchemaEvolutionError";
} & Readonly<A>;
declare class SchemaEvolutionError extends SchemaEvolutionError_base<{
  readonly message: string;
  readonly evolution: SchemaEvolution;
  readonly conflictingChanges?: readonly SchemaEvolution[];
}> {}
declare const CodeGenerationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "CodeGenerationError";
} & Readonly<A>;
declare class CodeGenerationError extends CodeGenerationError_base<{
  readonly message: string;
  readonly targetLanguage: string;
  readonly entityType: string;
}> {}
interface SchemaFirstService {
  readonly parseSchemaDefinition: (schemaSource: string) => Effect$1.Effect<DocumentNode, SchemaFirstError>;
  readonly extractEntitiesFromSchema: (schema: DocumentNode) => Effect$1.Effect<readonly string[], SchemaFirstError>;
  readonly validateSchemaEvolution: (currentSchema: DocumentNode, proposedSchema: DocumentNode) => Effect$1.Effect<readonly SchemaEvolution[], SchemaEvolutionError>;
  readonly generateResolverStubs: <A, I, R>(entities: readonly ValidatedEntity<A, I, R>[]) => Effect$1.Effect<string, CodeGenerationError, never>;
  readonly generateTypeDefinitions: <A, I, R>(entities: readonly ValidatedEntity<A, I, R>[], language: 'typescript' | 'go' | 'java' | 'python') => Effect$1.Effect<string, CodeGenerationError, never>;
}
declare const SchemaFirstService: Context.Tag<SchemaFirstService, SchemaFirstService>;
declare const createSchemaFirstService: () => SchemaFirstService;
interface SchemaFirstWorkflow {
  readonly developSchema: (schemaSource: string) => Effect$1.Effect<SchemaLifecycleState, SchemaFirstError>;
  readonly evolveSchema: (currentState: SchemaLifecycleState, proposedSchema: string) => Effect$1.Effect<SchemaLifecycleState, SchemaEvolutionError>;
  readonly generateCode: (state: SchemaLifecycleState, targets: readonly ('resolvers' | 'types')[]) => Effect$1.Effect<Record<string, string>, CodeGenerationError>;
}
declare const createSchemaFirstWorkflow: (schemaFirstService: SchemaFirstService) => SchemaFirstWorkflow;
declare namespace SchemaFirst {
  const Service: {
    create: () => SchemaFirstService;
    Tag: Context.Tag<SchemaFirstService, SchemaFirstService>;
  };
  const Workflow: {
    create: (schemaFirstService: SchemaFirstService) => SchemaFirstWorkflow;
  };
  const State: {
    readonly Draft: Data.Case.Constructor<{
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    }, "_tag">;
    readonly Validated: Data.Case.Constructor<{
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<any, any, any>[];
      readonly version: string;
    }, "_tag">;
    readonly Composed: Data.Case.Constructor<{
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    }, "_tag">;
    readonly Deployed: Data.Case.Constructor<{
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    }, "_tag">;
    readonly Deprecated: Data.Case.Constructor<{
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }, "_tag">;
    readonly $is: <Tag extends "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">(tag: Tag) => (u: unknown) => u is Extract<{
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<any, any, any>[];
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }>;
    readonly $match: {
      <const Cases extends {
        readonly Draft: (args: {
          readonly _tag: "Draft";
          readonly schema: DocumentNode;
          readonly version: string;
        }) => any;
        readonly Validated: (args: {
          readonly _tag: "Validated";
          readonly schema: DocumentNode;
          readonly entities: readonly ValidatedEntity<any, any, any>[];
          readonly version: string;
        }) => any;
        readonly Composed: (args: {
          readonly _tag: "Composed";
          readonly federatedSchema: GraphQLSchema;
          readonly subgraphs: readonly string[];
          readonly version: string;
        }) => any;
        readonly Deployed: (args: {
          readonly _tag: "Deployed";
          readonly federatedSchema: GraphQLSchema;
          readonly deploymentId: string;
          readonly version: string;
        }) => any;
        readonly Deprecated: (args: {
          readonly _tag: "Deprecated";
          readonly schema: DocumentNode;
          readonly replacedBy: string;
          readonly version: string;
        }) => any;
      }>(cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): (value: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      } | {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<any, any, any>[];
        readonly version: string;
      } | {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      } | {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      } | {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }) => effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
      <const Cases extends {
        readonly Draft: (args: {
          readonly _tag: "Draft";
          readonly schema: DocumentNode;
          readonly version: string;
        }) => any;
        readonly Validated: (args: {
          readonly _tag: "Validated";
          readonly schema: DocumentNode;
          readonly entities: readonly ValidatedEntity<any, any, any>[];
          readonly version: string;
        }) => any;
        readonly Composed: (args: {
          readonly _tag: "Composed";
          readonly federatedSchema: GraphQLSchema;
          readonly subgraphs: readonly string[];
          readonly version: string;
        }) => any;
        readonly Deployed: (args: {
          readonly _tag: "Deployed";
          readonly federatedSchema: GraphQLSchema;
          readonly deploymentId: string;
          readonly version: string;
        }) => any;
        readonly Deprecated: (args: {
          readonly _tag: "Deprecated";
          readonly schema: DocumentNode;
          readonly replacedBy: string;
          readonly version: string;
        }) => any;
      }>(value: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      } | {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<any, any, any>[];
        readonly version: string;
      } | {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      } | {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      } | {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }, cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
    };
  };
  const Evolution: {
    readonly AddField: Data.Case.Constructor<{
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly RemoveField: Data.Case.Constructor<{
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly ChangeFieldType: Data.Case.Constructor<{
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly AddDirective: Data.Case.Constructor<{
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly RemoveDirective: Data.Case.Constructor<{
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly AddEntity: Data.Case.Constructor<{
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly RemoveEntity: Data.Case.Constructor<{
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly $is: <Tag extends "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">(tag: Tag) => (u: unknown) => u is Extract<{
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }>;
    readonly $match: {
      <const Cases extends {
        readonly AddField: (args: {
          readonly _tag: "AddField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly fieldType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveField: (args: {
          readonly _tag: "RemoveField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly ChangeFieldType: (args: {
          readonly _tag: "ChangeFieldType";
          readonly entityType: string;
          readonly fieldName: string;
          readonly oldType: string;
          readonly newType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddDirective: (args: {
          readonly _tag: "AddDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveDirective: (args: {
          readonly _tag: "RemoveDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddEntity: (args: {
          readonly _tag: "AddEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveEntity: (args: {
          readonly _tag: "RemoveEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
      }>(cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): (value: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
      <const Cases extends {
        readonly AddField: (args: {
          readonly _tag: "AddField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly fieldType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveField: (args: {
          readonly _tag: "RemoveField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly ChangeFieldType: (args: {
          readonly _tag: "ChangeFieldType";
          readonly entityType: string;
          readonly fieldName: string;
          readonly oldType: string;
          readonly newType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddDirective: (args: {
          readonly _tag: "AddDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveDirective: (args: {
          readonly _tag: "RemoveDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddEntity: (args: {
          readonly _tag: "AddEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveEntity: (args: {
          readonly _tag: "RemoveEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
      }>(value: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }, cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
    };
  };
}
//#endregion
//#region src/core/services/logger.d.ts
declare const FederationLogger_base: Context.TagClass<FederationLogger, "FederationLogger", {
  readonly trace: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly debug: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly info: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly warn: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly error: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly withSpan: <A, E, R>(name: string, effect: Effect$1.Effect<A, E, R>) => Effect$1.Effect<A, E, R>;
}>;
declare class FederationLogger extends FederationLogger_base {}
declare const FederationLoggerLive: Layer.Layer<FederationLogger, never, never>;
declare const trace: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger>;
declare const debug: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger>;
declare const info: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger>;
declare const warn: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger>;
declare const error: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger>;
declare const withSpan: <A, E, R>(name: string, effect: Effect$1.Effect<A, E, R>) => Effect$1.Effect<A, E, FederationLogger | R>;
declare const developmentLogger: Layer.Layer<FederationLogger, never, never>;
declare const productionLogger: Layer.Layer<FederationLogger, never, never>;
declare const testLogger: Layer.Layer<FederationLogger, never, never>;
//#endregion
//#region src/core/services/config.d.ts
/**
 * Federation Framework v2 configuration schema with comprehensive validation
 *
 * Defines the complete configuration structure for federated GraphQL services,
 * including server settings, database connections, caching, resilience patterns,
 * and observability features.
 *
 * @example Minimal configuration
 * ```typescript
 * const minimalConfig = {
 *   server: { port: 4000, host: 'localhost', cors: { enabled: false, origins: [] } },
 *   federation: { introspection: true, playground: true, subscriptions: false, tracing: false },
 *   database: { url: 'postgresql://localhost:5432/test', maxConnections: 5, connectionTimeout: '10s' },
 *   cache: { redis: { url: 'redis://localhost:6379', keyPrefix: 'test:', defaultTtl: '5m' } },
 *   resilience: { circuitBreaker: { failureThreshold: 3, resetTimeout: '10s', halfOpenMaxCalls: 1 } },
 *   observability: {
 *     metrics: { enabled: false, port: 9090 },
 *     tracing: { enabled: false, serviceName: 'test', endpoint: 'http://localhost:14268/api/traces' }
 *   }
 * }
 * ```
 *
 * @category Core Services
 */
declare const FederationConfigSchema: Schema.Struct<{
  server: Schema.Struct<{
    port: Schema.filter<Schema.Schema<number, number, never>>;
    host: typeof Schema.String;
    cors: Schema.Struct<{
      enabled: typeof Schema.Boolean;
      origins: Schema.Array$<typeof Schema.String>;
    }>;
  }>;
  federation: Schema.Struct<{
    introspection: typeof Schema.Boolean;
    playground: typeof Schema.Boolean;
    subscriptions: typeof Schema.Boolean;
    tracing: typeof Schema.Boolean;
  }>;
  database: Schema.Struct<{
    url: typeof Schema.String;
    maxConnections: Schema.filter<Schema.Schema<number, number, never>>;
    connectionTimeout: typeof Schema.String;
  }>;
  cache: Schema.Struct<{
    redis: Schema.Struct<{
      url: typeof Schema.String;
      keyPrefix: typeof Schema.String;
      defaultTtl: typeof Schema.String;
    }>;
  }>;
  resilience: Schema.Struct<{
    circuitBreaker: Schema.Struct<{
      failureThreshold: Schema.filter<Schema.Schema<number, number, never>>;
      resetTimeout: typeof Schema.String;
      halfOpenMaxCalls: Schema.filter<Schema.Schema<number, number, never>>;
    }>;
  }>;
  observability: Schema.Struct<{
    metrics: Schema.Struct<{
      enabled: typeof Schema.Boolean;
      port: Schema.filter<Schema.Schema<number, number, never>>;
    }>;
    tracing: Schema.Struct<{
      enabled: typeof Schema.Boolean;
      serviceName: typeof Schema.String;
      endpoint: typeof Schema.String;
    }>;
  }>;
}>;
type FederationServiceConfig = Schema.Schema.Type<typeof FederationConfigSchema>;
declare const FederationConfigService_base: Context.TagClass<FederationConfigService, "FederationConfigService", {
  readonly federation: {
    readonly introspection: boolean;
    readonly playground: boolean;
    readonly subscriptions: boolean;
    readonly tracing: boolean;
  };
  readonly resilience: {
    readonly circuitBreaker: {
      readonly failureThreshold: number;
      readonly resetTimeout: string;
      readonly halfOpenMaxCalls: number;
    };
  };
  readonly server: {
    readonly port: number;
    readonly host: string;
    readonly cors: {
      readonly enabled: boolean;
      readonly origins: readonly string[];
    };
  };
  readonly database: {
    readonly url: string;
    readonly maxConnections: number;
    readonly connectionTimeout: string;
  };
  readonly cache: {
    readonly redis: {
      readonly url: string;
      readonly keyPrefix: string;
      readonly defaultTtl: string;
    };
  };
  readonly observability: {
    readonly tracing: {
      readonly enabled: boolean;
      readonly serviceName: string;
      readonly endpoint: string;
    };
    readonly metrics: {
      readonly port: number;
      readonly enabled: boolean;
    };
  };
}>;
declare class FederationConfigService extends FederationConfigService_base {}
declare const FederationConfigLive: Layer.Layer<FederationConfigService, _effect_schema_ParseResult5.ParseError | effect_ConfigError5.ConfigError, never>;
declare const getServerConfig: Effect$1.Effect<{
  readonly port: number;
  readonly host: string;
  readonly cors: {
    readonly enabled: boolean;
    readonly origins: readonly string[];
  };
}, never, FederationConfigService>;
declare const getFederationConfig: Effect$1.Effect<{
  readonly introspection: boolean;
  readonly playground: boolean;
  readonly subscriptions: boolean;
  readonly tracing: boolean;
}, never, FederationConfigService>;
declare const getDatabaseConfig: Effect$1.Effect<{
  readonly url: string;
  readonly maxConnections: number;
  readonly connectionTimeout: string;
}, never, FederationConfigService>;
declare const getCacheConfig: Effect$1.Effect<{
  readonly redis: {
    readonly url: string;
    readonly keyPrefix: string;
    readonly defaultTtl: string;
  };
}, never, FederationConfigService>;
declare const getResilienceConfig: Effect$1.Effect<{
  readonly circuitBreaker: {
    readonly failureThreshold: number;
    readonly resetTimeout: string;
    readonly halfOpenMaxCalls: number;
  };
}, never, FederationConfigService>;
declare const getObservabilityConfig: Effect$1.Effect<{
  readonly tracing: {
    readonly enabled: boolean;
    readonly serviceName: string;
    readonly endpoint: string;
  };
  readonly metrics: {
    readonly port: number;
    readonly enabled: boolean;
  };
}, never, FederationConfigService>;
//#endregion
//#region src/core/services/layers.d.ts
declare const CoreServicesLive: Layer.Layer<FederationConfigService | FederationLogger, _effect_schema_ParseResult5.ParseError | effect_ConfigError5.ConfigError, never>;
declare const DevelopmentLayerLive: Layer.Layer<FederationConfigService | FederationLogger, _effect_schema_ParseResult5.ParseError | effect_ConfigError5.ConfigError, never>;
declare const ProductionLayerLive: Layer.Layer<FederationConfigService | FederationLogger, _effect_schema_ParseResult5.ParseError | effect_ConfigError5.ConfigError, never>;
declare const TestLayerLive: Layer.Layer<FederationConfigService | FederationLogger, _effect_schema_ParseResult5.ParseError | effect_ConfigError5.ConfigError, never>;
declare const MinimalLayerLive: Layer.Layer<FederationConfigService, _effect_schema_ParseResult5.ParseError | effect_ConfigError5.ConfigError, never>;
/**
 * Helper function to create environment-specific layers
 */
declare const createEnvironmentLayer: (environment?: string) => Layer.Layer<FederationConfigService | FederationLogger, _effect_schema_ParseResult5.ParseError | effect_ConfigError5.ConfigError, never>;
//#endregion
//#region src/federation/composer.d.ts
declare const ModernFederationComposer_base: Context.TagClass<ModernFederationComposer, "ModernFederationComposer", {
  readonly compose: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError>;
  readonly validate: (config: FederationCompositionConfig) => Effect$1.Effect<FederationCompositionConfig, ValidationError>;
  readonly buildSchema: (composedConfig: ComposedConfiguration) => Effect$1.Effect<GraphQLSchema, CompositionError>;
}>;
declare class ModernFederationComposer extends ModernFederationComposer_base {}
interface ComposedConfiguration {
  readonly config: FederationCompositionConfig;
  readonly subgraphSchemas: ReadonlyArray<SubgraphSchemaInfo>;
  readonly metadata: SchemaMetadata;
}
interface SubgraphSchemaInfo {
  readonly service: ServiceDefinition;
  readonly sdl: string;
  readonly entities: ReadonlyArray<string>;
  readonly directives: ReadonlyArray<string>;
}
declare const ModernFederationComposerLive: Layer.Layer<ModernFederationComposer, never, never>;
declare const compose: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError, never>;
declare const validateConfig: (config: FederationCompositionConfig) => Effect$1.Effect<FederationCompositionConfig, ValidationError, ModernFederationComposer>;
declare const handleCompositionError: (error: CompositionError) => string;
declare const createFederatedSchema: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError, never>;
//#endregion
//#region src/federation/subgraph.d.ts
/**
 * Registry configuration for subgraph management and service discovery
 *
 * Defines how the subgraph registry operates, including discovery modes,
 * health checking parameters, and retry policies for resilient operation.
 *
 * @example Static service configuration
 * ```typescript
 * const config: RegistryConfig = {
 *   discoveryMode: 'static',
 *   staticServices: [
 *     { id: 'users', url: 'http://user-service:4001/graphql' },
 *     { id: 'products', url: 'http://product-service:4002/graphql' }
 *   ],
 *   discoveryEndpoints: [],
 *   healthCheckInterval: Duration.seconds(30),
 *   healthCheckTimeout: Duration.seconds(5),
 *   retryPolicy: {
 *     maxAttempts: 3,
 *     initialDelay: Duration.seconds(1)
 *   }
 * }
 * ```
 *
 * @example Dynamic discovery configuration
 * ```typescript
 * const config: RegistryConfig = {
 *   discoveryMode: 'dynamic',
 *   staticServices: [],
 *   discoveryEndpoints: [
 *     'http://consul:8500/v1/health/service/graphql',
 *     'http://eureka:8761/eureka/apps'
 *   ],
 *   healthCheckInterval: Duration.seconds(15),
 *   healthCheckTimeout: Duration.seconds(3),
 *   retryPolicy: {
 *     maxAttempts: 5,
 *     initialDelay: Duration.millis(500)
 *   }
 * }
 * ```
 *
 * @category Federation Components
 */
interface RegistryConfig {
  readonly discoveryMode: 'static' | 'dynamic';
  readonly staticServices: ReadonlyArray<ServiceDefinition>;
  readonly discoveryEndpoints: ReadonlyArray<string>;
  readonly healthCheckInterval: Duration.Duration;
  readonly healthCheckTimeout: Duration.Duration;
  readonly retryPolicy: {
    readonly maxAttempts: number;
    readonly initialDelay: Duration.Duration;
  };
}
/**
 * SubgraphManagement - Advanced subgraph discovery and management
 *
 * Comprehensive namespace providing subgraph registry creation, service discovery,
 * health monitoring, and lifecycle management for Apollo Federation deployments.
 *
 * ## Features
 * - **Service Registry**: Centralized subgraph service registration and discovery
 * - **Health Monitoring**: Continuous health checking with configurable intervals
 * - **Auto-Discovery**: Scheduled polling for dynamic service discovery
 * - **Circuit Breaker Integration**: Fault tolerance for service communication
 * - **Service Lifecycle**: Complete service registration and deregistration
 *
 * @example Basic registry setup
 * ```typescript
 * import { SubgraphManagement } from '@cqrs/federation-v2'
 * import { Duration } from 'effect'
 *
 * const registry = yield* SubgraphManagement.createRegistry({
 *   discoveryMode: 'static',
 *   staticServices: [
 *     { id: 'users', url: 'http://user-service:4001/graphql' },
 *     { id: 'products', url: 'http://product-service:4002/graphql' }
 *   ],
 *   healthCheckInterval: Duration.seconds(30),
 *   healthCheckTimeout: Duration.seconds(5),
 *   retryPolicy: {
 *     maxAttempts: 3,
 *     initialDelay: Duration.seconds(1)
 *   }
 * })
 * ```
 *
 * @example Registry with monitoring
 * ```typescript
 * const monitoredRegistry = yield* pipe(
 *   SubgraphManagement.createRegistry(config),
 *   Effect.flatMap(registry =>
 *     SubgraphManagement.withHealthMonitoring(registry, Duration.seconds(10))
 *   ),
 *   Effect.flatMap(registry =>
 *     SubgraphManagement.withAutoDiscovery(registry, Duration.seconds(30))
 *   )
 * )
 * ```
 *
 * @namespace SubgraphManagement
 * @category Federation Components
 */
declare namespace SubgraphManagement {
  /**
   * Create a subgraph registry with comprehensive service management
   */
  const createRegistry: (config: RegistryConfig) => Effect.Effect<SubgraphRegistry, CompositionError>;
  /**
   * Registry with auto-discovery polling
   */
  const withAutoDiscovery: (registry: SubgraphRegistry, interval?: Duration.Duration) => Effect.Effect<SubgraphRegistry, never>;
  /**
   * Registry with health monitoring
   */
  const withHealthMonitoring: (registry: SubgraphRegistry, interval?: Duration.Duration) => Effect.Effect<SubgraphRegistry, never>;
  /**
   * Create a default registry configuration
   */
  const defaultConfig: (services: ReadonlyArray<ServiceDefinition>) => RegistryConfig;
  /**
   * Create a dynamic registry configuration
   */
  const dynamicConfig: (discoveryEndpoints: ReadonlyArray<string>) => RegistryConfig;
}
/**
 * Factory functions for common registry setups
 */
declare const createStaticRegistry: (services: ReadonlyArray<ServiceDefinition>) => Effect.Effect<SubgraphRegistry, CompositionError, never>;
declare const createDynamicRegistry: (discoveryEndpoints: ReadonlyArray<string>) => Effect.Effect<SubgraphRegistry, CompositionError, never>;
declare const createMonitoredRegistry: (services: ReadonlyArray<ServiceDefinition>, options?: {
  readonly discoveryInterval?: Duration.Duration;
  readonly healthCheckInterval?: Duration.Duration;
}) => Effect.Effect<SubgraphRegistry, CompositionError, never>;
//#endregion
//#region src/federation/error-boundaries.d.ts
/**
 * GraphQL resolver function type
 * @category Error Handling
 */
type GraphQLResolver = (parent: unknown, args: unknown, context: unknown, info: GraphQLResolveInfo) => Promise<unknown>;
/**
 * Bounded resolver with error handling
 */
type BoundedResolver = GraphQLResolver;
/**
 * Error boundary instance
 */
interface ErrorBoundary {
  readonly wrapResolver: (subgraphId: string, resolver: GraphQLResolver) => BoundedResolver;
  readonly handlePartialFailure: (results: SubgraphResults) => Effect.Effect<ProcessedResults, FederationError>;
  readonly transformError: (error: FederationError, context: ErrorContext) => TransformedError;
}
/**
 * Subgraph execution results
 * @category Error Handling
 */
interface SubgraphResults {
  readonly [subgraphId: string]: SubgraphResult;
}
/**
 * Single subgraph execution result
 * @category Error Handling
 */
interface SubgraphResult {
  readonly subgraphId: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: unknown;
}
/**
 * Processed results after partial failure handling
 * @category Error Handling
 */
interface ProcessedResults {
  readonly data: unknown;
  readonly errors: ReadonlyArray<unknown>;
}
/**
 * Error context for transformation
 * @category Error Handling
 */
interface ErrorContext {
  readonly subgraphId: string;
  readonly fieldPath: ReadonlyArray<string>;
  readonly operationType: 'query' | 'mutation' | 'subscription';
  readonly timestamp: Date;
}
/**
 * Transformed error for client consumption
 * @category Error Handling
 */
interface TransformedError {
  readonly message: string;
  readonly code: string;
  readonly path?: ReadonlyArray<string>;
  readonly extensions?: Record<string, unknown>;
}
/**
 * FederationErrorBoundaries - Federation-aware error handling and circuit breakers
 *
 * Features:
 * - Circuit breakers per subgraph with state management
 * - Partial failure handling with fallback strategies
 * - Timeout management with configurable durations
 * - Error transformation and sanitization
 * - Metrics collection for monitoring
 */
declare namespace FederationErrorBoundaries {
  /**
   * Create an error boundary with comprehensive fault tolerance
   */
  const createBoundary: (config: ErrorBoundaryConfig) => ErrorBoundary;
  /**
   * Create a circuit breaker for a specific subgraph
   */
  const withCircuitBreaker: (subgraphId: string, config: CircuitBreakerConfig) => Effect.Effect<CircuitBreaker, CompositionError>;
  /**
   * Default error boundary configuration
   */
  const defaultConfig: ErrorBoundaryConfig;
  /**
   * Create error boundary with timeout configuration
   */
  const withTimeouts: (config: ErrorBoundaryConfig, timeouts: Record<string, Duration.Duration>) => ErrorBoundaryConfig;
  /**
   * Create error boundary with circuit breaker configuration
   */
  const withCircuitBreakers: (config: ErrorBoundaryConfig, circuitBreakerConfig: CircuitBreakerConfig) => ErrorBoundaryConfig;
  /**
   * Create error boundary with partial failure handling
   */
  const withPartialFailureHandling: (config: ErrorBoundaryConfig, partialFailureConfig: PartialFailureConfig) => ErrorBoundaryConfig;
}
/**
 * Factory functions for common error boundary setups
 */
declare const createStrictBoundary: (subgraphIds: ReadonlyArray<string>) => ErrorBoundary;
declare const createResilientBoundary: (subgraphIds: ReadonlyArray<string>, criticalSubgraphs?: ReadonlyArray<string>) => ErrorBoundary;
declare const createProductionBoundary: (subgraphTimeouts: Record<string, Duration.Duration>, criticalSubgraphs?: ReadonlyArray<string>) => ErrorBoundary;
//#endregion
//#region src/federation/performance.d.ts
/**
 * Query plan representation for federation query execution
 *
 * Represents a complete execution plan for a federated GraphQL query,
 * including the sequence of operations across subgraphs and associated
 * performance metadata for optimization decisions.
 *
 * @example Query plan structure
 * ```typescript
 * const plan: QueryPlan = {
 *   id: 'query-hash-abc123',
 *   steps: [
 *     {
 *       subgraphId: 'users',
 *       operation: 'query Users($ids: [ID!]!) { users(ids: $ids) { id name email } }',
 *       dependencies: []
 *     },
 *     {
 *       subgraphId: 'orders',
 *       operation: 'query Orders($userIds: [ID!]!) { orders(userIds: $userIds) { id total } }',
 *       dependencies: ['users']
 *     }
 *   ],
 *   complexity: 25,
 *   estimatedCost: 150
 * }
 * ```
 *
 * @category Performance & Caching
 */
interface QueryPlan {
  readonly id: string;
  readonly steps: ReadonlyArray<QueryStep>;
  readonly complexity: number;
  readonly estimatedCost: number;
}
/**
 * Query step representation
 * @category Performance Optimizations
 */
interface QueryStep {
  readonly subgraphId: string;
  readonly operation: string;
  readonly dependencies: ReadonlyArray<string>;
}
/**
 * Cached query plan with metadata
 * @category Performance Optimizations
 */
interface CachedQueryPlan {
  readonly plan: QueryPlan;
  readonly createdAt: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
}
/**
 * Query plan cache interface with intelligent caching strategies
 *
 * High-performance cache implementation for federated query plans with LRU eviction,
 * pattern-based invalidation, and comprehensive statistics tracking.
 *
 * @example Basic cache usage
 * ```typescript
 * import { PerformanceOptimizations } from '@cqrs/federation-v2'
 *
 * const cache = yield* PerformanceOptimizations.createQueryPlanCache({
 *   maxSize: 1000,
 *   ttl: Duration.hours(1)
 * })
 *
 * // Check cache for existing plan
 * const cachedPlan = yield* cache.get('query-hash-abc123')
 * if (Option.isSome(cachedPlan)) {
 *   return cachedPlan.value.plan
 * }
 *
 * // Store new plan
 * yield* cache.set('query-hash-abc123', queryPlan)
 * ```
 *
 * @example Pattern-based invalidation
 * ```typescript
 * // Invalidate all plans involving specific subgraph
 * yield* cache.invalidate('users-*')
 *
 * // Invalidate all cached plans
 * yield* cache.invalidate()
 * ```
 *
 * @category Performance & Caching
 */
interface QueryPlanCache {
  readonly get: (queryHash: string) => Effect.Effect<CachedQueryPlan | undefined, never>;
  readonly set: (queryHash: string, plan: QueryPlan) => Effect.Effect<void, never>;
  readonly invalidate: (pattern?: string) => Effect.Effect<void, never>;
  readonly getStats: () => Effect.Effect<CacheStats, never>;
}
/**
 * Cache statistics
 * @category Performance Optimizations
 */
interface CacheStats {
  readonly size: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly evictionCount: number;
}
/**
 * Federated DataLoader interface for efficient batch loading across subgraphs
 *
 * Provides intelligent batching and caching capabilities for data fetching
 * across multiple federated subgraphs, with per-subgraph DataLoader instances
 * and comprehensive performance monitoring.
 *
 * @example Basic DataLoader usage
 * ```typescript
 * import { PerformanceOptimizations } from '@cqrs/federation-v2'
 *
 * const dataLoader = yield* PerformanceOptimizations.createFederatedDataLoader({
 *   maxBatchSize: 100,
 *   batchWindowMs: 10,
 *   enableBatchLogging: true
 * })
 *
 * // Get loader for specific subgraph
 * const userLoader = yield* dataLoader.getLoader('users', async (userIds) => {
 *   return await fetchUsersByIds(userIds)
 * })
 *
 * // Load data with automatic batching
 * const user = yield* Effect.fromPromise(() => userLoader.load('user-123'))
 * ```
 *
 * @example Advanced batching with custom key function
 * ```typescript
 * const productLoader = yield* dataLoader.getLoader(
 *   'products',
 *   async (keys) => fetchProductsByKeys(keys),
 *   {
 *     cacheKeyFn: (key) => `product:${key.id}:${key.version}`,
 *     maxBatchSize: 50
 *   }
 * )
 * ```
 *
 * @category Performance & Caching
 */
interface FederatedDataLoader {
  readonly getLoader: <K, V>(subgraphId: string, batchLoadFn: (keys: readonly K[]) => Promise<readonly V[]>) => Effect.Effect<DataLoader<K, V>, never>;
  readonly clearAll: () => Effect.Effect<void, never>;
  readonly getStats: () => Effect.Effect<DataLoaderStats, never>;
}
/**
 * DataLoader statistics
 * @category Performance Optimizations
 */
interface DataLoaderStats {
  readonly [subgraphId: string]: {
    readonly loadCount: number;
    readonly batchCount: number;
    readonly averageBatchSize: number;
    readonly cacheHitRate: number;
  };
}
/**
 * Metrics collector interface
 * @category Performance Optimizations
 */
interface MetricsCollector {
  readonly recordExecution: (metrics: ExecutionMetrics) => Effect.Effect<void, never>;
  readonly recordCacheOperation: (operation: CacheOperation) => Effect.Effect<void, never>;
  readonly getMetrics: () => Effect.Effect<PerformanceMetrics, never>;
}
/**
 * Execution metrics
 * @category Performance Optimizations
 */
interface ExecutionMetrics {
  readonly queryHash: string;
  readonly duration: number;
  readonly success: boolean;
  readonly subgraphCalls: ReadonlyArray<SubgraphCall>;
  readonly cacheHit?: boolean;
}
/**
 * Subgraph call metrics
 * @category Performance Optimizations
 */
interface SubgraphCall {
  readonly subgraphId: string;
  readonly duration: number;
  readonly success: boolean;
  readonly batchSize?: number;
}
/**
 * Cache operation metrics
 * @category Performance Optimizations
 */
interface CacheOperation {
  readonly type: 'hit' | 'miss' | 'set' | 'evict';
  readonly key: string;
  readonly duration?: number;
}
/**
 * Performance metrics summary
 * @category Performance Optimizations
 */
interface PerformanceMetrics {
  readonly executionMetrics: {
    readonly totalExecutions: number;
    readonly averageDuration: number;
    readonly successRate: number;
  };
  readonly cacheMetrics: CacheStats;
  readonly dataLoaderMetrics: DataLoaderStats;
}
/**
 * Optimized executor interface
 */
interface OptimizedExecutor {
  readonly execute: (query: string, variables: Record<string, unknown>, context: ExecutionContext) => Effect.Effect<ExecutionResult, ExecutionError>;
}
/**
 * Execution context
 * @category Performance Optimizations
 */
interface ExecutionContext {
  readonly [key: string]: unknown;
  readonly dataLoader?: FederatedDataLoader;
}
/**
 * Execution error
 * @category Error Handling
 */
interface ExecutionError extends Error {
  readonly _tag: 'ExecutionError';
  readonly name: 'ExecutionError';
  readonly message: string;
  readonly cause?: unknown;
}
/**
 * # PerformanceOptimizations
 *
 * Comprehensive performance optimization suite for Apollo Federation 2.x with Effect-TS,
 * featuring intelligent query plan caching, DataLoader batching, and real-time performance monitoring.
 *
 * ## 🚀 Key Features
 * - **⚡ Query Plan Caching**: LRU cache with intelligent eviction strategies
 * - **📦 DataLoader Batching**: Automatic request batching per subgraph
 * - **📊 Performance Metrics**: Real-time monitoring and analytics
 * - **🔥 Cache Warming**: Preload frequently accessed queries
 * - **⚙️ Execution Optimization**: Parallel execution with circuit breakers
 * - **🎯 Smart Eviction**: Context-aware cache invalidation
 *
 * ## 📚 Usage Examples
 *
 * ### Basic Performance Setup
 * ```typescript
 * import { PerformanceOptimizations } from '@cqrs/federation-v2'
 * import { Effect } from 'effect'
 *
 * // Create optimized executor
 * const executor = yield* PerformanceOptimizations.createOptimizedExecutor(
 *   schema,
 *   {
 *     queryPlanCache: {
 *       maxSize: 1000,
 *       ttl: Duration.minutes(15),
 *       evictionStrategy: 'lru-with-priority'
 *     },
 *     dataLoader: {
 *       batchSize: 50,
 *       maxBatchDelay: Duration.milliseconds(10),
 *       cacheKeyFn: (key) => `subgraph:${key.subgraphId}:${key.id}`
 *     },
 *     metrics: {
 *       enabled: true,
 *       bufferSize: 1000,
 *       flushInterval: Duration.seconds(10)
 *     }
 *   }
 * )
 * ```
 *
 * ### Advanced Caching Configuration
 * ```typescript
 * const queryCache = yield* PerformanceOptimizations.createQueryPlanCache({
 *   maxSize: 5000,
 *   ttl: Duration.minutes(30),
 *   evictionStrategy: 'lru-with-priority',
 *   warmupQueries: [
 *     'query GetPopularProducts { ... }',
 *     'query GetUserProfile { ... }'
 *   ],
 *   priorityFn: (query) => query.includes('popular') ? 10 : 1
 * })
 *
 * // Warm the cache
 * yield* queryCache.warmup()
 * ```
 *
 * ### DataLoader with Custom Batching
 * ```typescript
 * const dataLoader = yield* PerformanceOptimizations.createFederatedDataLoader({
 *   batchSize: 100,
 *   maxBatchDelay: Duration.milliseconds(5),
 *   cacheKeyFn: (key) => `${key.type}:${key.id}`,
 *   batchScheduleFn: 'immediate' // or 'nextTick' | 'timeout'
 * })
 *
 * // Use with subgraph-specific loaders
 * const userLoader = yield* dataLoader.getLoader(
 *   'users-service',
 *   (userIds) => fetchUsersBatch(userIds)
 * )
 *
 * const user = yield* userLoader.load('user-123')
 * ```
 *
 * ## 📈 Performance Monitoring
 *
 * ```typescript
 * const metrics = yield* PerformanceOptimizations.createMetricsCollector({
 *   bufferSize: 1000,
 *   flushInterval: Duration.seconds(5),
 *   aggregationWindow: Duration.minutes(1)
 * })
 *
 * // Monitor execution metrics
 * yield* metrics.recordExecution({
 *   queryHash: 'abc123',
 *   duration: 45,
 *   success: true,
 *   subgraphCalls: [
 *     { subgraphId: 'users', duration: 20, success: true, batchSize: 5 },
 *     { subgraphId: 'orders', duration: 25, success: true, batchSize: 3 }
 *   ],
 *   cacheHit: true
 * })
 *
 * // Get performance insights
 * const performanceData = yield* metrics.getMetrics()
 * console.log(`Cache hit rate: ${performanceData.cacheMetrics.hitRate * 100}%`)
 * console.log(`Avg response time: ${performanceData.executionMetrics.averageDuration}ms`)
 * ```
 *
 * @namespace PerformanceOptimizations
 * @category Performance & Caching
 * @see {@link https://www.apollographql.com/docs/federation/performance/ | Federation Performance Guide}
 * @see {@link https://github.com/graphql/dataloader | DataLoader Documentation}
 */
declare namespace PerformanceOptimizations {
  /**
   * Create an optimized executor with comprehensive performance enhancements
   */
  const createOptimizedExecutor: (schema: FederatedSchema, config: PerformanceConfig) => Effect.Effect<OptimizedExecutor, CompositionError>;
  /**
   * Create query plan cache with LRU eviction
   */
  const createQueryPlanCache: (config: QueryPlanCacheConfig) => Effect.Effect<QueryPlanCache, ValidationError>;
  /**
   * Create federated DataLoader with per-subgraph batching
   */
  const createFederatedDataLoader: (config: DataLoaderConfig) => Effect.Effect<FederatedDataLoader, ValidationError>;
  /**
   * Create metrics collector for performance monitoring
   */
  const createMetricsCollector: (config: MetricsConfig) => Effect.Effect<MetricsCollector, ValidationError>;
  /**
   * Default performance configuration
   */
  const defaultConfig: PerformanceConfig;
  /**
   * High-performance configuration for production
   */
  const productionConfig: PerformanceConfig;
  /**
   * Development configuration with detailed logging
   */
  const developmentConfig: PerformanceConfig;
}
/**
 * Factory functions for common performance setups
 */
declare const createBasicOptimizedExecutor: (schema: FederatedSchema) => Effect.Effect<OptimizedExecutor, CompositionError, never>;
declare const createProductionOptimizedExecutor: (schema: FederatedSchema) => Effect.Effect<OptimizedExecutor, CompositionError, never>;
declare const createDevelopmentOptimizedExecutor: (schema: FederatedSchema) => Effect.Effect<OptimizedExecutor, CompositionError, never>;
//#endregion
//#region src/schema/ast-conversion.d.ts
/**
 * Type conversion context with caching and configuration
 *
 * Context object that manages the conversion of Effect Schema AST nodes to GraphQL types,
 * providing caching for performance, custom scalar handling, and safety features like
 * recursion depth limiting.
 *
 * @example Basic usage
 * ```typescript
 * const context = createConversionContext(false, {
 *   DateTime: new GraphQLScalarType({ name: 'DateTime' }),
 *   JSON: GraphQLJSON
 * })
 *
 * const graphqlType = yield* convertSchemaToGraphQL(
 *   Schema.Struct({ id: Schema.String, createdAt: Schema.Date }),
 *   context
 * )
 * ```
 *
 * @example Input type conversion
 * ```typescript
 * const inputContext = createConversionContext(true, {}, {
 *   strictMode: true,
 *   maxDepth: 5
 * })
 *
 * const inputType = yield* convertSchemaToGraphQL(CreateUserSchema, inputContext)
 * ```
 *
 * @category Schema Processing
 */
interface TypeConversionContext {
  readonly cache: Map<string, GraphQLType>;
  readonly isInput: boolean;
  readonly scalars: Record<string, GraphQLScalarType>;
  readonly depth: number;
  readonly maxDepth: number;
  readonly strictMode: boolean;
}
/**
 * Create a new type conversion context with specified configuration
 *
 * Factory function for creating a TypeConversionContext with appropriate defaults
 * and customization options for different conversion scenarios.
 *
 * @param isInput - Whether to create context for GraphQL input types (default: false)
 * @param scalars - Custom scalar type mappings for conversion
 * @param options - Additional configuration options
 * @param options.maxDepth - Maximum recursion depth to prevent infinite loops (default: 10)
 * @param options.strictMode - Enable strict type validation during conversion (default: false)
 * @returns Configured conversion context ready for use
 *
 * @example Creating output type context
 * ```typescript
 * const outputContext = createConversionContext(false, {
 *   UUID: UUIDScalarType,
 *   DateTime: DateTimeScalarType
 * })
 * ```
 *
 * @example Creating input type context with strict mode
 * ```typescript
 * const inputContext = createConversionContext(true, {}, {
 *   maxDepth: 8,
 *   strictMode: true
 * })
 * ```
 *
 * @category Schema Processing
 */
declare const createConversionContext: (isInput?: boolean, scalars?: Record<string, GraphQLScalarType>, options?: {
  readonly maxDepth?: number;
  readonly strictMode?: boolean;
}) => TypeConversionContext;
/**
 * Schema to GraphQL Type Conversion Pipeline
 *
 * Advanced AST-based transformation with comprehensive type support and pattern matching.
 *
 * Features:
 * - Exhaustive pattern matching over AST nodes
 * - Recursive type conversion with cycle detection
 * - Branded type mapping to GraphQL types
 * - Custom scalar type support
 * - Input/Output type distinction
 * - Comprehensive error handling
 */
declare namespace ASTConversion {
  /**
   * Convert Effect Schema to GraphQL type with comprehensive error handling
   */
  const schemaToGraphQLType: (schema: Schema.Schema<unknown>, context?: TypeConversionContext) => Effect$1.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError>;
  /**
   * Convert multiple schemas to GraphQL types concurrently
   */
  const convertSchemasParallel: (schemas: ReadonlyArray<{
    readonly name: string;
    readonly schema: Schema.Schema<unknown>;
  }>, context?: TypeConversionContext) => Effect$1.Effect<Record<string, GraphQLOutputType | GraphQLInputType>, TypeConversionError>;
  /**
   * Create GraphQL schema from Effect Schema registry
   */
  const createGraphQLSchema: (entities: Record<string, Schema.Schema<unknown>>, queries?: Record<string, Schema.Schema<unknown>>, mutations?: Record<string, Schema.Schema<unknown>>) => Effect$1.Effect<{
    readonly types: Record<string, GraphQLOutputType>;
    readonly queries: Record<string, GraphQLOutputType>;
    readonly mutations: Record<string, GraphQLOutputType>;
  }, TypeConversionError>;
}
declare namespace index_d_exports {
  export { DirectiveValidationError, EntityBuilderError, EntityDirective, EntityKey, EntityMetadata, EntityValidationResult, KeyValidationError, PhantomStates, SchemaValidationError$1 as SchemaValidationError, UltraStrictEntityBuilder, ValidatedEntity, createUltraStrictEntityBuilder, matchEntityValidationResult, validateEntityBuilder, withDirectives, withKeys, withResolvers, withSchema };
}
//#endregion
//#region src/index.d.ts
/**
 * Framework version
 */
declare const VERSION: "2.0.0";
/**
 * Framework metadata
 */
declare const FRAMEWORK_INFO: {
  readonly name: "@cqrs/federation-v2";
  readonly version: "2.0.0";
  readonly description: "Apollo Federation 2.x with Effect-TS";
  readonly features: readonly ["Effect-First Architecture", "Apollo Federation 2.x Support", "Ultra-Strict TypeScript", "Algebraic Error System", "Performance Optimizations", "Schema-First Development", "Circuit Breakers", "Hot Reload", "Layer-based Dependency Injection", "Effect.gen Patterns", "Structured Logging", "Type-safe Configuration", "Pattern Matching Error Handling", "Modern Test Infrastructure"];
};
//#endregion
export { ASTConversion, BaseDomainError, CacheOperation, CacheStats, CachedQueryPlan, CircuitBreaker, CircuitBreakerConfig, type CircuitBreakerError, CircuitBreakerMetrics, CircuitBreakerState, CodeGenerationError, type CompositionError, CoreServicesLive, DataLoaderConfig, DataLoaderStats, DeepReadonly, DevelopmentLayerLive, type DiscoveryError, DomainError, EntityReferenceResolver, type EntityResolutionError, EntityTypename, ErrorBoundary, ErrorBoundaryConfig, ErrorContext, ErrorFactory, ErrorMatching, ErrorTransformationConfig, ExecutionContext, ExecutionError, ExecutionMetrics, index_d_exports as Experimental, ExtractResolver, FRAMEWORK_INFO, FederatedDataLoader, FederatedSchema, FederationCompositionConfig, FederationConfigLive, FederationConfigSchema, FederationConfigService, FederationDirective, FederationDirectiveMap, FederationDomainError, FederationEntity, FederationEntityBuilder, type FederationError, FederationErrorBoundaries, FederationLogger, FederationLoggerLive, FederationServiceConfig, FieldName, type FieldResolutionError, FieldResolver, FieldResolverMap, GraphQLResolver, type HealthCheckError, HealthStatus, HotReloadableSchema, MakeRequired, MetricsCollector, MetricsConfig, MinimalLayerLive, ModernFederationComposer, ModernFederationComposerLive, NonEmptyArray, OptimizedExecutor, OptionalKeys, PartialFailureConfig, PerformanceConfig, PerformanceMetrics, PerformanceOptimizations, Prettify, ProcessedResults, ProductionLayerLive, QueryHash, QueryPlan, QueryPlanCache, QueryPlanCacheConfig, QueryStep, type RegistrationError, RegistryConfig, RequireAtLeastOne, RequiredKeys, SafeResolverMap, SchemaChange, SchemaConflict, SchemaEvolution, SchemaEvolutionError, SchemaFirst, SchemaFirstError, SchemaFirstService, SchemaFirstWorkflow, SchemaImportResult, SchemaLifecycleState, SchemaMetadata, type SchemaValidationError, SchemaWatcher, ServiceDefinition, ServiceId, SubgraphCall, SubgraphManagement, SubgraphRegistry, SubgraphResult, SubgraphResults, SyncResult, TestLayerLive, type TimeoutError, TransformedError, TypeConversionContext, type TypeConversionError, VERSION, type ValidationError, asUntypedEntity, compose, createBasicOptimizedExecutor, createConversionContext, createDevelopmentOptimizedExecutor, createDynamicRegistry, createEntityBuilder, createEnvironmentLayer, createFederatedSchema, createMonitoredRegistry, createProductionBoundary, createProductionOptimizedExecutor, createResilientBoundary, createSchemaFirstService, createSchemaFirstWorkflow, createStaticRegistry, createStrictBoundary, debug, developmentLogger, error, getCacheConfig, getDatabaseConfig, getFederationConfig, getObservabilityConfig, getResilienceConfig, getServerConfig, handleCompositionError, info, productionLogger, testLogger, trace, validateConfig, warn, withSpan };
//# sourceMappingURL=index.d.cts.map