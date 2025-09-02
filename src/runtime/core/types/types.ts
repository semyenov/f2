import type * as Schema from 'effect/Schema'
import type { Duration, Effect } from 'effect'
import type { GraphQLResolveInfo, GraphQLSchema } from 'graphql'
import type {
  BaseDomainError,
  CircuitBreakerError,
  CompositionError,
  DiscoveryError,
  EntityResolutionError,
  FederationError,
  FieldResolutionError,
  HealthCheckError,
  RegistrationError,
  SchemaValidationError,
  TimeoutError,
  TypeConversionError,
  ValidationError,
} from '../errors/errors.js'

export type {
  CircuitBreakerError,
  CompositionError,
  DiscoveryError,
  EntityResolutionError,
  FederationError,
  FieldResolutionError,
  HealthCheckError,
  RegistrationError,
  SchemaValidationError,
  TimeoutError,
  TypeConversionError,
  ValidationError,
}

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
export interface FederationEntity<
  TSource = unknown,
  TContext = unknown,
  TResult = TSource,
  TReference = Partial<TSource>,
  TExtensions = unknown,
> {
  /** GraphQL type name - must match the type name in your schema */
  readonly typename: string

  /** Key field(s) that uniquely identify this entity across subgraphs */
  readonly key: string | ReadonlyArray<string>

  /** Effect Schema for runtime validation and type safety */
  readonly schema: Schema.Schema<TSource, TResult>

  /** Resolver function called when this entity is referenced by other subgraphs */
  readonly resolveReference: EntityReferenceResolver<TResult, TContext, TReference>

  /** Optional field resolvers for computed or federated fields */
  readonly fields: FieldResolverMap<TResult, TContext> | undefined

  /** Federation directives (@shareable, @inaccessible, @override, etc.) */
  readonly directives: FederationDirectiveMap | undefined

  /** Additional metadata for tooling and extensions */
  readonly extensions: TExtensions | undefined
}

/**
 * Federation directive configuration
 */
export interface FederationDirectiveMap {
  readonly [fieldName: string]: ReadonlyArray<FederationDirective>
}

export interface FederationDirective {
  readonly type:
    | '@shareable'
    | '@inaccessible'
    | '@tag'
    | '@override'
    | '@external'
    | '@provides'
    | '@requires'
  readonly args?: Record<string, unknown>
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
export type EntityReferenceResolver<TResult, TContext, TReference> = (
  reference: TReference,
  context: TContext,
  info: GraphQLResolveInfo
) => Effect.Effect<TResult, EntityResolutionError>

/**
 * Field resolver map for federation entities
 */
export type FieldResolverMap<TResult, TContext> = {
  readonly [K in keyof TResult]?: FieldResolver<TResult, TContext, TResult[K]>
}

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
export type FieldResolver<TSource, TContext, TReturn, TArgs = Record<string, unknown>> = (
  parent: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Effect.Effect<TReturn, FieldResolutionError>

/**
 * Service definition for federation composition
 */
export interface ServiceDefinition {
  readonly id: string
  readonly url: string
  readonly name?: string
  readonly version?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Federation composition configuration
 */
export interface FederationCompositionConfig {
  readonly entities: ReadonlyArray<FederationEntity<unknown, unknown, unknown, unknown>>
  readonly services: ReadonlyArray<ServiceDefinition>
  readonly errorBoundaries: ErrorBoundaryConfig
  readonly performance: PerformanceConfig
}

// Type helper to convert strongly typed entities to the config format
export const asUntypedEntity = <TSource, TContext, TResult, TReference>(
  entity: FederationEntity<TSource, TContext, TResult, TReference>
): FederationEntity<unknown, unknown, unknown, unknown> =>
  entity as unknown as FederationEntity<unknown, unknown, unknown, unknown>

/**
 * Error boundary configuration for circuit breakers and fault tolerance
 */
export interface ErrorBoundaryConfig {
  readonly subgraphTimeouts: Record<string, Duration.Duration>
  readonly circuitBreakerConfig: CircuitBreakerConfig
  readonly partialFailureHandling: PartialFailureConfig
  readonly errorTransformation: ErrorTransformationConfig
}

export interface CircuitBreakerConfig {
  readonly failureThreshold: number
  readonly resetTimeout: Duration.Duration
  readonly halfOpenMaxCalls?: number
}

export interface PartialFailureConfig {
  readonly allowPartialFailure: boolean
  readonly criticalSubgraphs?: ReadonlyArray<string>
  readonly fallbackValues?: Record<string, unknown>
}

export interface ErrorTransformationConfig {
  readonly sanitizeErrors?: boolean
  readonly includeStackTrace?: boolean
  readonly customTransformer?: <E extends Error>(error: E) => BaseDomainError
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  readonly queryPlanCache: QueryPlanCacheConfig
  readonly dataLoaderConfig: DataLoaderConfig
  readonly metricsCollection: MetricsConfig
}

export interface QueryPlanCacheConfig {
  readonly maxSize: number
  readonly ttl?: Duration.Duration
}

export interface DataLoaderConfig {
  readonly maxBatchSize: number
  readonly batchWindowMs?: number
  readonly cacheKeyFn?: (key: unknown) => string
  readonly enableBatchLogging?: boolean
  readonly maxCacheOperations?: number
  readonly maxExecutionMetrics?: number
}

export interface MetricsConfig {
  readonly enabled: boolean
  readonly collectExecutionMetrics?: boolean
  readonly collectCacheMetrics?: boolean
  readonly maxExecutionMetrics?: number
  readonly maxCacheOperations?: number
}

/**
 * Schema composition result
 */
export interface FederatedSchema {
  readonly schema: GraphQLSchema
  readonly entities: ReadonlyArray<FederationEntity<unknown, unknown, unknown, unknown>>
  readonly services: ReadonlyArray<ServiceDefinition>
  readonly version: string
  readonly metadata: SchemaMetadata
}

export interface SchemaMetadata {
  readonly createdAt: Date
  readonly composedAt: Date
  readonly federationVersion: string
  readonly subgraphCount: number
  readonly entityCount: number
}

/**
 * Hot reloadable schema for development
 */
export interface HotReloadableSchema {
  readonly schema: FederatedSchema
  readonly watcher: SchemaWatcher
  readonly reload: () => Effect.Effect<FederatedSchema, CompositionError>
}

export interface SchemaWatcher {
  readonly on: (event: 'schemaChanged' | 'error', handler: (data: unknown) => void) => void
  readonly off: (event: string, handler?: (data: unknown) => void) => void
  readonly close: () => Effect.Effect<void, never>
}

/**
 * Subgraph registry for service discovery
 */
export interface SubgraphRegistry {
  readonly register: (definition: ServiceDefinition) => Effect.Effect<void, RegistrationError>
  readonly unregister: (serviceId: string) => Effect.Effect<void, RegistrationError>
  readonly discover: () => Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError>
  readonly health: (serviceId: string) => Effect.Effect<HealthStatus, HealthCheckError>
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
export interface HealthStatus {
  /** Current health status of the service */
  readonly status: 'healthy' | 'unhealthy' | 'degraded'

  /** Unique identifier of the service */
  readonly serviceId: string

  /** Timestamp when health check was last performed */
  readonly lastCheck?: Date

  /** Optional metrics collected during health check */
  readonly metrics?: Record<string, number>
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
export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

export interface CircuitBreaker {
  readonly protect: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<A, E | CircuitBreakerError>
  readonly getState: () => CircuitBreakerState
  readonly getMetrics: () => CircuitBreakerMetrics
}

export interface CircuitBreakerMetrics {
  readonly failureCount: number
  readonly lastFailureTime: number | null
  readonly state: CircuitBreakerState
  readonly lastStateChange?: number
  readonly successCount?: number
  readonly resetTimeoutMs?: number
}

/**
 * Error types for comprehensive error handling
 */

/**
 * Schema first development types
 */
export interface SchemaImportResult {
  readonly schema: Schema.Schema<unknown>
  readonly directives: FederationDirectiveMap
  readonly metadata: SchemaMetadata
}

export interface SyncResult {
  readonly changes: ReadonlyArray<SchemaChange>
  readonly conflicts: ReadonlyArray<SchemaConflict>
  readonly success: boolean
}

export interface SchemaChange {
  readonly type: 'add' | 'modify' | 'remove'
  readonly path: string
  readonly description: string
}

export interface SchemaConflict {
  readonly path: string
  readonly local: unknown
  readonly remote: unknown
  readonly resolution?: 'local' | 'remote' | 'merge'
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
export type DomainError =
  | EntityResolutionError
  | FieldResolutionError
  | ValidationError
  | SchemaValidationError
  | CompositionError
  | RegistrationError
  | DiscoveryError
  | HealthCheckError
  | CircuitBreakerError
  | TimeoutError
  | FederationError
  | TypeConversionError

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
export type ServiceId = string & { readonly __brand: 'ServiceId' }
export type EntityTypename = string & { readonly __brand: 'EntityTypename' }
export type FieldName = string & { readonly __brand: 'FieldName' }
export type QueryHash = string & { readonly __brand: 'QueryHash' }

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
export type Prettify<T> = { readonly [K in keyof T]: T[K] } & {}

/**
 * Non-empty array type - ensures array has at least one element
 *
 * @example
 * ```typescript
 * const keys: NonEmptyArray<string> = ['id']           // ✓ Valid
 * const empty: NonEmptyArray<string> = []              // ✗ Type error
 * ```
 */
export type NonEmptyArray<T> = readonly [T, ...(readonly T[])]

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
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    readonly [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

/**
 * Extract resolver function type from a field
 *
 * @example
 * ```typescript
 * type UserResolver = ExtractResolver<User, AppContext, 'displayName'>
 * // Results in: (parent: User, args: any, context: AppContext, info: GraphQLResolveInfo) => ...
 * ```
 */
export type ExtractResolver<TSource, TContext, TField extends keyof TSource> = FieldResolver<
  TSource,
  TContext,
  TSource[TField]
>

/**
 * Create a type-safe resolver map from an entity type
 *
 * @example
 * ```typescript
 * type UserResolvers = SafeResolverMap<User, AppContext>
 * // Only allows resolvers for actual User fields with correct types
 * ```
 */
export type SafeResolverMap<TSource, TContext> = {
  readonly [K in keyof TSource]?: ExtractResolver<TSource, TContext, K>
}

/**
 * Extract only the required keys from a type
 *
 * @example
 * ```typescript
 * type Required = RequiredKeys<{ id: string; name?: string; age?: number }>
 * // Results in: 'id'
 * ```
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

/**
 * Extract only the optional keys from a type
 *
 * @example
 * ```typescript
 * type Optional = OptionalKeys<{ id: string; name?: string; age?: number }>
 * // Results in: 'name' | 'age'
 * ```
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

/**
 * Make specific properties required while keeping others as-is
 *
 * @example
 * ```typescript
 * type User = { id?: string; name?: string; email?: string }
 * type UserWithId = MakeRequired<User, 'id'>  // { id: string; name?: string; email?: string }
 * ```
 */
export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Deep readonly type that makes all nested properties readonly
 *
 * @example
 * ```typescript
 * type Config = { db: { host: string; port: number } }
 * type ReadonlyConfig = DeepReadonly<Config>  // { readonly db: { readonly host: string; readonly port: number } }
 * ```
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends object
      ? DeepReadonly<T[P]>
      : T[P]
}
