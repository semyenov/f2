import type { Effect } from "effect"
import type * as Schema from "@effect/schema/Schema"
import type { GraphQLResolveInfo, GraphQLSchema } from "graphql"
import type { Duration } from "effect"
import type { 
  EntityResolutionError,
  FieldResolutionError,
  ValidationError,
  SchemaValidationError,
  CompositionError,
  CircuitBreakerError,
  TimeoutError,
  FederationError,
  TypeConversionError
} from "./errors.js"

export type { 
  EntityResolutionError,
  FieldResolutionError,
  ValidationError,
  SchemaValidationError,
  CompositionError,
  CircuitBreakerError,
  TimeoutError,
  FederationError,
  TypeConversionError
}

/**
 * Additional error types used in federation configuration
 */
export interface RegistrationError {
  readonly _tag: "RegistrationError"
  readonly message: string
  readonly serviceId?: string
  readonly cause?: unknown
}

export interface DiscoveryError {
  readonly _tag: "DiscoveryError"
  readonly message: string
  readonly endpoint?: string
  readonly cause?: unknown
}

export interface HealthCheckError {
  readonly _tag: "HealthCheckError"
  readonly message: string
  readonly serviceId?: string
  readonly cause?: unknown
}

/**
 * Core federation entity definition with full Apollo Federation 2.x support
 */
export interface FederationEntity<TSource = Record<string, unknown>, TContext = Record<string, unknown>, TResult = Partial<TSource>, TReference = Partial<TSource>> {
  readonly typename: string
  readonly key: string | ReadonlyArray<string>
  readonly schema: Schema.Schema<TSource, TContext>
  readonly resolveReference: EntityReferenceResolver<TResult, TContext, TReference>
  readonly fields: FieldResolverMap<TResult, TContext> | undefined
  readonly directives: FederationDirectiveMap | undefined
  readonly extensions: Record<string, unknown> | undefined
}

/**
 * Federation directive configuration
 */
export interface FederationDirectiveMap {
  readonly [fieldName: string]: ReadonlyArray<FederationDirective>
}

export interface FederationDirective {
  readonly type: "@shareable" | "@inaccessible" | "@tag" | "@override" | "@external" | "@provides" | "@requires"
  readonly args?: Record<string, unknown>
}

/**
 * Entity reference resolver with Effect-based error handling
 */
export interface EntityReferenceResolver<TResult, TContext, TReference> {
  (reference: TReference, context: TContext, info: GraphQLResolveInfo): Effect.Effect<TResult, EntityResolutionError>
}

/**
 * Field resolver map for federation entities
 */
export type FieldResolverMap<TResult, TContext> = {
  readonly [K in keyof TResult]?: FieldResolver<TResult, TContext, TResult[K]>
}

export interface FieldResolver<TSource, TContext, TReturn, TArgs = Record<string, unknown>> {
  (parent: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): Effect.Effect<TReturn, FieldResolutionError>
}

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
  readonly entities: ReadonlyArray<FederationEntity<any, any, any, any>>
  readonly services: ReadonlyArray<ServiceDefinition>
  readonly errorBoundaries: ErrorBoundaryConfig
  readonly performance: PerformanceConfig
}


/**
 * Error boundary configuration for circuit breakers and fault tolerance
 */
export interface ErrorBoundaryConfig {
  readonly subgraphTimeouts: Record<string, Duration.Duration>
  readonly circuitBreakerConfig: CircuitBreakerConfig
  readonly partialFailureHandling: PartialFailureConfig
  readonly errorTransformation?: ErrorTransformationConfig
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
  readonly customTransformer?: (error: Error) => Error
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
}

export interface MetricsConfig {
  readonly enabled: boolean
  readonly collectExecutionMetrics?: boolean
  readonly collectCacheMetrics?: boolean
}

/**
 * Schema composition result
 */
export interface FederatedSchema {
  readonly schema: GraphQLSchema
  readonly entities: ReadonlyArray<FederationEntity<any, any, any, any>>
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
  readonly on: (event: "schemaChanged" | "error", handler: (data: unknown) => void) => void
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

export interface HealthStatus {
  readonly status: "healthy" | "unhealthy" | "degraded"
  readonly serviceId: string
  readonly lastCheck?: Date
  readonly metrics?: Record<string, number>
}

/**
 * Circuit breaker state and operations
 */
export type CircuitBreakerState = "closed" | "open" | "half-open"

export interface CircuitBreaker {
  readonly protect: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<A, E | CircuitBreakerError>
  readonly getState: () => CircuitBreakerState
  readonly getMetrics: () => CircuitBreakerMetrics
}

export interface CircuitBreakerMetrics {
  readonly failureCount: number
  readonly lastFailureTime: number | null
  readonly state: CircuitBreakerState
}

/**
 * Error types for comprehensive error handling
 */



/**
 * Schema first development types
 */
export interface SchemaImportResult {
  readonly schema: Schema.Schema<any>
  readonly directives: FederationDirectiveMap
  readonly metadata: SchemaMetadata
}

export interface SyncResult {
  readonly changes: ReadonlyArray<SchemaChange>
  readonly conflicts: ReadonlyArray<SchemaConflict>
  readonly success: boolean
}

export interface SchemaChange {
  readonly type: "add" | "modify" | "remove"
  readonly path: string
  readonly description: string
}

export interface SchemaConflict {
  readonly path: string
  readonly local: unknown
  readonly remote: unknown
  readonly resolution?: "local" | "remote" | "merge"
}

/**
 * Union type for all domain errors
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
 */
export type ServiceId = string & { readonly __brand: "ServiceId" }
export type EntityTypename = string & { readonly __brand: "EntityTypename" }
export type FieldName = string & { readonly __brand: "FieldName" }
export type QueryHash = string & { readonly __brand: "QueryHash" }

/**
 * Utility types for type-level programming
 */
export type Prettify<T> = { readonly
  [K in keyof T]: T[K]
} & {}

export type NonEmptyArray<T> = readonly [T, ...readonly T[]]

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> 
  & { readonly
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]