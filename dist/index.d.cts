import { Duration, Effect } from "effect";
import * as Schema from "@effect/schema/Schema";
import { DocumentNode, ExecutionResult, GraphQLFieldResolver, GraphQLOutputType, GraphQLResolveInfo, GraphQLSchema } from "graphql";
import * as Data from "effect/Data";
import * as Effect$1 from "effect/Effect";
import * as effect_Unify0 from "effect/Unify";
import * as effect_Types0 from "effect/Types";
import * as effect_Cause0 from "effect/Cause";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as _effect_schema_ParseResult4 from "@effect/schema/ParseResult";
import * as effect_ConfigError4 from "effect/ConfigError";
import DataLoader from "dataloader";

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
  readonly violations: Array<{
    path: string;
    message: string;
    value?: unknown;
  }>;
  readonly _tag: "SchemaValidationError";
  readonly severity: "medium";
  readonly category: "validation";
  readonly retryable = false;
  constructor(schemaName: string, message: string, violations: Array<{
    path: string;
    message: string;
    value?: unknown;
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
  readonly serviceId?: string | undefined;
  readonly _tag: "RegistrationError";
  readonly severity: "high";
  readonly category: "registration";
  readonly retryable = true;
  constructor(message: string, serviceId?: string | undefined, context?: Record<string, unknown>, cause?: unknown);
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
  const schemaValidation: (schemaName: string, message: string, violations: Array<{
    path: string;
    message: string;
    value?: unknown;
  }>) => SchemaValidationError;
  const entityResolution: (message: string, entityType?: string, entityId?: string, cause?: unknown) => EntityResolutionError;
  const fieldResolution: (message: string, fieldName?: string, parentType?: string, cause?: unknown) => FieldResolutionError;
  const federation: (message: string, subgraphId?: string, operationType?: string, cause?: unknown) => FederationError;
  const circuitBreaker: (message: string, state?: "open" | "closed" | "half-open", cause?: unknown) => CircuitBreakerError;
  const timeout: (message: string, timeout?: string, cause?: unknown) => TimeoutError;
  const composition: (message: string, subgraphId?: string, cause?: unknown) => CompositionError;
  const typeConversion: (message: string, astType?: string, field?: string, cause?: unknown) => TypeConversionError;
  const healthCheck: (message: string, serviceId?: string, cause?: unknown) => HealthCheckError;
  const registration: (message: string, serviceId?: string, cause?: unknown) => RegistrationError;
  const discovery: (message: string, endpoint?: string, cause?: unknown) => DiscoveryError;
  const CommonErrors: {
    required: (field: string) => ValidationError;
    invalid: (field: string, value: unknown) => ValidationError;
    subgraphUnavailable: (subgraphId: string) => FederationError;
    entityNotFound: (entityType: string, entityId: string) => EntityResolutionError;
    fieldNotResolvable: (fieldName: string, parentType: string) => FieldResolutionError;
    circuitOpen: (serviceId: string) => CircuitBreakerError;
    requestTimeout: (timeoutValue: string) => TimeoutError;
    registrationError: (message: string, serviceId?: string, cause?: unknown) => RegistrationError;
    discoveryError: (message: string, endpoint?: string, cause?: unknown) => DiscoveryError;
    schemaCompositionFailed: (reason: string) => CompositionError;
    unsupportedAstType: (astType: string) => TypeConversionError;
  };
}
/**
 * Union type of all concrete error classes
 */
type FederationDomainError = ValidationError | SchemaValidationError | EntityResolutionError | FieldResolutionError | FederationError | CircuitBreakerError | TimeoutError | CompositionError | TypeConversionError | HealthCheckError | RegistrationError | DiscoveryError;
//#endregion
//#region src/core/types.d.ts
/**
 * Additional error types used in federation configuration
 */
interface RegistrationError$1 {
  readonly _tag: "RegistrationError";
  readonly message: string;
  readonly serviceId?: string;
  readonly cause?: unknown;
}
interface DiscoveryError$1 {
  readonly _tag: "DiscoveryError";
  readonly message: string;
  readonly endpoint?: string;
  readonly cause?: unknown;
}
interface HealthCheckError$1 {
  readonly _tag: "HealthCheckError";
  readonly message: string;
  readonly serviceId?: string;
  readonly cause?: unknown;
}
/**
 * Core federation entity definition with full Apollo Federation 2.x support
 */
interface FederationEntity<TSource = Record<string, unknown>, TContext = Record<string, unknown>, TResult = Partial<TSource>, TReference = Partial<TSource>> {
  readonly typename: string;
  readonly key: string | ReadonlyArray<string>;
  readonly schema: Schema.Schema<TSource, TContext>;
  readonly resolveReference: EntityReferenceResolver<TResult, TContext, TReference>;
  readonly fields: FieldResolverMap<TResult, TContext> | undefined;
  readonly directives: FederationDirectiveMap | undefined;
  readonly extensions: Record<string, unknown> | undefined;
}
/**
 * Federation directive configuration
 */
interface FederationDirectiveMap {
  readonly [fieldName: string]: ReadonlyArray<FederationDirective>;
}
interface FederationDirective {
  readonly type: "@shareable" | "@inaccessible" | "@tag" | "@override" | "@external" | "@provides" | "@requires";
  readonly args?: Record<string, unknown>;
}
/**
 * Entity reference resolver with Effect-based error handling
 */
interface EntityReferenceResolver<TResult, TContext, TReference> {
  (reference: TReference, context: TContext, info: GraphQLResolveInfo): Effect.Effect<TResult, EntityResolutionError>;
}
/**
 * Field resolver map for federation entities
 */
type FieldResolverMap<TResult, TContext> = { readonly [K in keyof TResult]?: FieldResolver<TResult, TContext, TResult[K]> };
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
  readonly entities: ReadonlyArray<FederationEntity<any, any, any, any>>;
  readonly services: ReadonlyArray<ServiceDefinition>;
  readonly errorBoundaries: ErrorBoundaryConfig;
  readonly performance: PerformanceConfig;
}
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
}
interface MetricsConfig {
  readonly enabled: boolean;
  readonly collectExecutionMetrics?: boolean;
  readonly collectCacheMetrics?: boolean;
}
/**
 * Schema composition result
 */
interface FederatedSchema {
  readonly schema: GraphQLSchema;
  readonly entities: ReadonlyArray<FederationEntity<any, any, any, any>>;
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
  readonly on: (event: "schemaChanged" | "error", handler: (data: unknown) => void) => void;
  readonly off: (event: string, handler?: (data: unknown) => void) => void;
  readonly close: () => Effect.Effect<void, never>;
}
/**
 * Subgraph registry for service discovery
 */
interface SubgraphRegistry {
  readonly register: (definition: ServiceDefinition) => Effect.Effect<void, RegistrationError$1>;
  readonly unregister: (serviceId: string) => Effect.Effect<void, RegistrationError$1>;
  readonly discover: () => Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError$1>;
  readonly health: (serviceId: string) => Effect.Effect<HealthStatus, HealthCheckError$1>;
}
interface HealthStatus {
  readonly status: "healthy" | "unhealthy" | "degraded";
  readonly serviceId: string;
  readonly lastCheck?: Date;
  readonly metrics?: Record<string, number>;
}
/**
 * Circuit breaker state and operations
 */
type CircuitBreakerState = "closed" | "open" | "half-open";
interface CircuitBreaker {
  readonly protect: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<A, E | CircuitBreakerError>;
  readonly getState: () => CircuitBreakerState;
  readonly getMetrics: () => CircuitBreakerMetrics;
}
interface CircuitBreakerMetrics {
  readonly failureCount: number;
  readonly lastFailureTime: number | null;
  readonly state: CircuitBreakerState;
}
/**
 * Error types for comprehensive error handling
 */
/**
 * Schema first development types
 */
interface SchemaImportResult {
  readonly schema: Schema.Schema<any>;
  readonly directives: FederationDirectiveMap;
  readonly metadata: SchemaMetadata;
}
interface SyncResult {
  readonly changes: ReadonlyArray<SchemaChange>;
  readonly conflicts: ReadonlyArray<SchemaConflict>;
  readonly success: boolean;
}
interface SchemaChange {
  readonly type: "add" | "modify" | "remove";
  readonly path: string;
  readonly description: string;
}
interface SchemaConflict {
  readonly path: string;
  readonly local: unknown;
  readonly remote: unknown;
  readonly resolution?: "local" | "remote" | "merge";
}
/**
 * Union type for all domain errors
 */
type DomainError = EntityResolutionError | FieldResolutionError | ValidationError | SchemaValidationError | CompositionError | RegistrationError$1 | DiscoveryError$1 | HealthCheckError$1 | CircuitBreakerError | TimeoutError | FederationError | TypeConversionError;
/**
 * Type-safe branded types for domain concepts
 */
type ServiceId = string & {
  readonly __brand: "ServiceId";
};
type EntityTypename = string & {
  readonly __brand: "EntityTypename";
};
type FieldName = string & {
  readonly __brand: "FieldName";
};
type QueryHash = string & {
  readonly __brand: "QueryHash";
};
/**
 * Utility types for type-level programming
 */
type Prettify<T> = { [K in keyof T]: T[K] } & {};
type NonEmptyArray<T> = [T, ...T[]];
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];
//#endregion
//#region src/core/builders/entity-builder.d.ts
/**
 * Modern Federation Entity Builder with full Apollo Federation 2.x directive support
 *
 * Features:
 * - Fluent builder pattern for entity configuration
 * - Full support for @shareable, @inaccessible, @tag, @override directives
 * - Effect-based reference resolution with comprehensive error handling
 * - Type-safe field resolver binding
 * - Directive validation and conflict detection
 */
declare class ModernFederationEntityBuilder<TSource extends Record<string, any> = Record<string, any>, TContext = Record<string, unknown>, TResult extends Partial<TSource> = Partial<TSource>, TReference extends Partial<TSource> = Partial<TSource>> {
  private readonly typename;
  private readonly schema;
  private readonly keyFields;
  private readonly directiveMap;
  private readonly fieldResolvers;
  private readonly referenceResolver?;
  private readonly extensions?;
  constructor(typename: string, schema: Schema.Schema.Any, keyFields: ReadonlyArray<keyof TSource>, directiveMap?: FederationDirectiveMap, fieldResolvers?: FieldResolverMap<TResult, TContext>, referenceResolver?: EntityReferenceResolver<TResult, TContext, TReference> | undefined, extensions?: Record<string, unknown> | undefined);
  private validateConstructorArgs;
  /**
   * Federation 2.x directive support
   * @shareable - Field can be resolved by multiple subgraphs
   */
  withShareableField<K extends keyof TResult>(field: K, resolver?: FieldResolver<TResult, TContext, TResult[K]>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * @inaccessible - Field hidden from public schema but available for federation
   */
  withInaccessibleField<K extends keyof TResult>(field: K, resolver?: FieldResolver<TResult, TContext, TResult[K]>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * @tag - Metadata tags for schema organization and tooling
   */
  withTaggedField<K extends keyof TResult>(field: K, tags: ReadonlyArray<string>, resolver?: FieldResolver<TResult, TContext, TResult[K]>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * @override - Overrides field resolution from another subgraph
   */
  withOverrideField<K extends keyof TResult>(field: K, fromSubgraph: string, resolver: FieldResolver<TResult, TContext, TResult[K]>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * @external - Field is defined in another subgraph
   */
  withExternalField<K extends keyof TResult>(field: K): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * @requires - Field requires specific fields from base type
   */
  withRequiredFields<K extends keyof TResult>(field: K, requiredFields: string, resolver?: FieldResolver<TResult, TContext, TResult[K]>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * @provides - Field provides specific fields to base type
   */
  withProvidedFields<K extends keyof TResult>(field: K, providedFields: string, resolver?: FieldResolver<TResult, TContext, TResult[K]>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Add a custom field resolver without directives
   */
  withField<K extends keyof TResult>(field: K, resolver: FieldResolver<TResult, TContext, TResult[K]>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Set the reference resolver for entity resolution
   */
  withReferenceResolver(resolver: EntityReferenceResolver<TResult, TContext, TReference>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
  /**
   * Add extension metadata to the entity
   */
  withExtensions(extensions: Record<string, unknown>): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
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
  build(): Effect.Effect<FederationEntity<TSource, TContext, TResult, TReference>, ValidationError>;
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
 * Factory function for creating entity builders with type inference
 */
declare const createEntityBuilder: <TSource extends Record<string, any>, TContext = Record<string, unknown>, TResult extends Partial<TSource> = Partial<TSource>, TReference extends Partial<TSource> = Partial<TSource>>(typename: string, schema: Schema.Schema.Any, keyFields: ReadonlyArray<keyof TSource>) => ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>;
/**
 * Utility function to create entity with fluent API
 */
declare const defineEntity: <TSource extends Record<string, any>, TContext = Record<string, unknown>, TResult extends Partial<TSource> = Partial<TSource>, TReference extends Partial<TSource> = Partial<TSource>>(config: {
  typename: string;
  schema: Schema.Schema.Any;
  keyFields: ReadonlyArray<keyof TSource>;
}, builder: (entityBuilder: ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>) => ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>) => Effect.Effect<FederationEntity<TSource, TContext, TResult, TReference>, ValidationError>;
//#endregion
//#region src/core/ultra-strict-entity-builder.d.ts
/**
 * Phantom type markers for compile-time validation states
 */
declare namespace PhantomStates {
  interface Unvalidated {
    readonly _tag: "Unvalidated";
  }
  interface HasSchema {
    readonly _tag: "HasSchema";
  }
  interface HasKeys {
    readonly _tag: "HasKeys";
  }
  interface HasDirectives {
    readonly _tag: "HasDirectives";
  }
  interface Complete {
    readonly _tag: "Complete";
  }
}
/**
 * Entity validation result discriminated union
 */
type EntityValidationResult = Data.TaggedEnum<{
  Valid: {
    entity: ValidatedEntity;
    metadata: EntityMetadata;
  };
  InvalidSchema: {
    errors: readonly SchemaValidationError$1[];
    partialEntity?: Partial<ValidatedEntity>;
  };
  InvalidKeys: {
    errors: readonly KeyValidationError[];
    schema: Schema.Schema<any>;
  };
  InvalidDirectives: {
    errors: readonly DirectiveValidationError[];
    schema: Schema.Schema<any>;
    keys: readonly EntityKey[];
  };
  CircularDependency: {
    cycle: readonly string[];
    involvedEntities: readonly string[];
  };
  IncompatibleVersion: {
    requiredVersion: string;
    currentVersion: string;
    entity: string;
  };
}>;
declare const EntityValidationResult: {
  readonly Valid: Data.Case.Constructor<{
    readonly _tag: "Valid";
    readonly entity: ValidatedEntity;
    readonly metadata: EntityMetadata;
  }, "_tag">;
  readonly InvalidSchema: Data.Case.Constructor<{
    readonly _tag: "InvalidSchema";
    readonly errors: readonly SchemaValidationError$1[];
    readonly partialEntity?: Partial<ValidatedEntity>;
  }, "_tag">;
  readonly InvalidKeys: Data.Case.Constructor<{
    readonly _tag: "InvalidKeys";
    readonly errors: readonly KeyValidationError[];
    readonly schema: Schema.Schema<any>;
  }, "_tag">;
  readonly InvalidDirectives: Data.Case.Constructor<{
    readonly _tag: "InvalidDirectives";
    readonly errors: readonly DirectiveValidationError[];
    readonly schema: Schema.Schema<any>;
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
    readonly entity: ValidatedEntity;
    readonly metadata: EntityMetadata;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "InvalidSchema";
    readonly errors: readonly SchemaValidationError$1[];
    readonly partialEntity?: Partial<ValidatedEntity>;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "InvalidKeys";
    readonly errors: readonly KeyValidationError[];
    readonly schema: Schema.Schema<any>;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "InvalidDirectives";
    readonly errors: readonly DirectiveValidationError[];
    readonly schema: Schema.Schema<any>;
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
        readonly entity: ValidatedEntity;
        readonly metadata: EntityMetadata;
      }) => any;
      readonly InvalidSchema: (args: {
        readonly _tag: "InvalidSchema";
        readonly errors: readonly SchemaValidationError$1[];
        readonly partialEntity?: Partial<ValidatedEntity>;
      }) => any;
      readonly InvalidKeys: (args: {
        readonly _tag: "InvalidKeys";
        readonly errors: readonly KeyValidationError[];
        readonly schema: Schema.Schema<any>;
      }) => any;
      readonly InvalidDirectives: (args: {
        readonly _tag: "InvalidDirectives";
        readonly errors: readonly DirectiveValidationError[];
        readonly schema: Schema.Schema<any>;
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
      readonly entity: ValidatedEntity;
      readonly metadata: EntityMetadata;
    } | {
      readonly _tag: "InvalidSchema";
      readonly errors: readonly SchemaValidationError$1[];
      readonly partialEntity?: Partial<ValidatedEntity>;
    } | {
      readonly _tag: "InvalidKeys";
      readonly errors: readonly KeyValidationError[];
      readonly schema: Schema.Schema<any>;
    } | {
      readonly _tag: "InvalidDirectives";
      readonly errors: readonly DirectiveValidationError[];
      readonly schema: Schema.Schema<any>;
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
        readonly entity: ValidatedEntity;
        readonly metadata: EntityMetadata;
      }) => any;
      readonly InvalidSchema: (args: {
        readonly _tag: "InvalidSchema";
        readonly errors: readonly SchemaValidationError$1[];
        readonly partialEntity?: Partial<ValidatedEntity>;
      }) => any;
      readonly InvalidKeys: (args: {
        readonly _tag: "InvalidKeys";
        readonly errors: readonly KeyValidationError[];
        readonly schema: Schema.Schema<any>;
      }) => any;
      readonly InvalidDirectives: (args: {
        readonly _tag: "InvalidDirectives";
        readonly errors: readonly DirectiveValidationError[];
        readonly schema: Schema.Schema<any>;
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
      readonly entity: ValidatedEntity;
      readonly metadata: EntityMetadata;
    } | {
      readonly _tag: "InvalidSchema";
      readonly errors: readonly SchemaValidationError$1[];
      readonly partialEntity?: Partial<ValidatedEntity>;
    } | {
      readonly _tag: "InvalidKeys";
      readonly errors: readonly KeyValidationError[];
      readonly schema: Schema.Schema<any>;
    } | {
      readonly _tag: "InvalidDirectives";
      readonly errors: readonly DirectiveValidationError[];
      readonly schema: Schema.Schema<any>;
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
declare class SchemaValidationError$1 extends SchemaValidationError_base<{
  readonly message: string;
  readonly schemaPath: readonly string[];
  readonly suggestion?: string;
}> {}
declare const KeyValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "KeyValidationError";
} & Readonly<A>;
declare class KeyValidationError extends KeyValidationError_base<{
  readonly message: string;
  readonly keyField: string;
  readonly entityType: string;
  readonly suggestion?: string;
}> {}
declare const DirectiveValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "DirectiveValidationError";
} & Readonly<A>;
declare class DirectiveValidationError extends DirectiveValidationError_base<{
  readonly message: string;
  readonly directive: string;
  readonly field?: string;
  readonly suggestion?: string;
}> {}
declare const EntityBuilderError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause0.YieldableError & {
  readonly _tag: "EntityBuilderError";
} & Readonly<A>;
declare class EntityBuilderError extends EntityBuilderError_base<{
  readonly message: string;
  readonly builderState: string;
  readonly suggestion?: string;
}> {}
interface EntityKey {
  readonly field: string;
  readonly type: GraphQLOutputType;
  readonly isComposite: boolean;
}
interface EntityDirective {
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly applicableFields?: readonly string[] | undefined;
}
interface EntityMetadata {
  readonly typename: string;
  readonly version: string;
  readonly createdAt: Date;
  readonly validationLevel: "strict" | "ultra-strict";
  readonly dependencies: readonly string[];
}
interface ValidatedEntity {
  readonly typename: string;
  readonly schema: Schema.Schema<any>;
  readonly keys: readonly EntityKey[];
  readonly directives: readonly EntityDirective[];
  readonly resolvers: Record<string, GraphQLFieldResolver<any, any>>;
  readonly metadata: EntityMetadata;
}
interface UltraStrictEntityBuilder<TState extends PhantomStates.Unvalidated | PhantomStates.HasSchema | PhantomStates.HasKeys | PhantomStates.HasDirectives | PhantomStates.Complete> {
  readonly _phantomState: TState;
  readonly typename: string;
  readonly schema?: Schema.Schema<any>;
  readonly keys?: readonly EntityKey[];
  readonly directives?: readonly EntityDirective[];
  readonly resolvers?: Record<string, GraphQLFieldResolver<any, any>>;
}
/**
 * Creates a new UltraStrictEntityBuilder with compile-time state tracking
 */
declare const createUltraStrictEntityBuilder: (typename: string) => UltraStrictEntityBuilder<PhantomStates.Unvalidated>;
/**
 * Type-safe schema attachment (only valid in Unvalidated state)
 */
declare const withSchema: <A>(schema: Schema.Schema<A>) => (builder: UltraStrictEntityBuilder<PhantomStates.Unvalidated>) => UltraStrictEntityBuilder<PhantomStates.HasSchema>;
/**
 * Type-safe key definition (only valid in HasSchema state)
 */
declare const withKeys: (keys: readonly EntityKey[]) => (builder: UltraStrictEntityBuilder<PhantomStates.HasSchema>) => UltraStrictEntityBuilder<PhantomStates.HasKeys>;
/**
 * Type-safe directive application (only valid in HasKeys state)
 */
declare const withDirectives: (directives: readonly EntityDirective[]) => (builder: UltraStrictEntityBuilder<PhantomStates.HasKeys>) => UltraStrictEntityBuilder<PhantomStates.HasDirectives>;
/**
 * Type-safe resolver attachment (only valid in HasDirectives state)
 */
declare const withResolvers: (resolvers: Record<string, GraphQLFieldResolver<any, any>>) => (builder: UltraStrictEntityBuilder<PhantomStates.HasDirectives>) => UltraStrictEntityBuilder<PhantomStates.Complete>;
/**
 * Validates a complete entity builder using exhaustive pattern matching
 */
declare const validateEntityBuilder: (builder: UltraStrictEntityBuilder<PhantomStates.Complete>) => Effect$1.Effect<EntityValidationResult, EntityBuilderError>;
/**
 * Exhaustive pattern matching over entity validation results
 */
declare const matchEntityValidationResult: <A>(handlers: {
  Valid: (data: {
    entity: ValidatedEntity;
    metadata: EntityMetadata;
  }) => A;
  InvalidSchema: (data: {
    errors: readonly SchemaValidationError$1[];
    partialEntity?: Partial<ValidatedEntity>;
  }) => A;
  InvalidKeys: (data: {
    errors: readonly KeyValidationError[];
    schema: Schema.Schema<any>;
  }) => A;
  InvalidDirectives: (data: {
    errors: readonly DirectiveValidationError[];
    schema: Schema.Schema<any>;
    keys: readonly EntityKey[];
  }) => A;
  CircularDependency: (data: {
    cycle: readonly string[];
    involvedEntities: readonly string[];
  }) => A;
  IncompatibleVersion: (data: {
    requiredVersion: string;
    currentVersion: string;
    entity: string;
  }) => A;
}) => (result: EntityValidationResult) => A;
/**
 * Factory function for common entity key patterns
 */
declare const createEntityKey: (field: string, type: GraphQLOutputType, isComposite?: boolean) => EntityKey;
/**
 * Factory function for Federation directives
 */
declare const createDirective: (name: string, args?: Record<string, unknown>, applicableFields?: readonly string[]) => EntityDirective;
declare namespace UltraStrictEntityBuilder {
  const create: (typename: string) => UltraStrictEntityBuilder<PhantomStates.Unvalidated>;
  const validate: (builder: UltraStrictEntityBuilder<PhantomStates.Complete>) => Effect$1.Effect<EntityValidationResult, EntityBuilderError>;
  const match: <A>(handlers: {
    Valid: (data: {
      entity: ValidatedEntity;
      metadata: EntityMetadata;
    }) => A;
    InvalidSchema: (data: {
      errors: readonly SchemaValidationError$1[];
      partialEntity?: Partial<ValidatedEntity>;
    }) => A;
    InvalidKeys: (data: {
      errors: readonly KeyValidationError[];
      schema: Schema.Schema<any>;
    }) => A;
    InvalidDirectives: (data: {
      errors: readonly DirectiveValidationError[];
      schema: Schema.Schema<any>;
      keys: readonly EntityKey[];
    }) => A;
    CircularDependency: (data: {
      cycle: readonly string[];
      involvedEntities: readonly string[];
    }) => A;
    IncompatibleVersion: (data: {
      requiredVersion: string;
      currentVersion: string;
      entity: string;
    }) => A;
  }) => (result: EntityValidationResult) => A;
  const Key: {
    create: (field: string, type: GraphQLOutputType, isComposite?: boolean) => EntityKey;
  };
  const Directive: {
    create: (name: string, args?: Record<string, unknown>, applicableFields?: readonly string[]) => EntityDirective;
    shareable: () => EntityDirective;
    inaccessible: () => EntityDirective;
    tag: (name: string) => EntityDirective;
    override: (from: string) => EntityDirective;
    external: () => EntityDirective;
    provides: (fields: string) => EntityDirective;
    requires: (fields: string) => EntityDirective;
  };
}
//#endregion
//#region src/core/schema-first-patterns.d.ts
/**
 * Schema development lifecycle states
 */
type SchemaLifecycleState = Data.TaggedEnum<{
  Draft: {
    schema: DocumentNode;
    version: string;
  };
  Validated: {
    schema: DocumentNode;
    entities: readonly ValidatedEntity[];
    version: string;
  };
  Composed: {
    federatedSchema: GraphQLSchema;
    subgraphs: readonly string[];
    version: string;
  };
  Deployed: {
    federatedSchema: GraphQLSchema;
    deploymentId: string;
    version: string;
  };
  Deprecated: {
    schema: DocumentNode;
    replacedBy: string;
    version: string;
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
    readonly entities: readonly ValidatedEntity[];
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
    readonly entities: readonly ValidatedEntity[];
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
        readonly entities: readonly ValidatedEntity[];
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
      readonly entities: readonly ValidatedEntity[];
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
        readonly entities: readonly ValidatedEntity[];
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
      readonly entities: readonly ValidatedEntity[];
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
  AddField: {
    entityType: string;
    fieldName: string;
    fieldType: string;
    isBreaking: boolean;
  };
  RemoveField: {
    entityType: string;
    fieldName: string;
    isBreaking: boolean;
  };
  ChangeFieldType: {
    entityType: string;
    fieldName: string;
    oldType: string;
    newType: string;
    isBreaking: boolean;
  };
  AddDirective: {
    entityType: string;
    fieldName: string | undefined;
    directive: string;
    isBreaking: boolean;
  };
  RemoveDirective: {
    entityType: string;
    fieldName: string | undefined;
    directive: string;
    isBreaking: boolean;
  };
  AddEntity: {
    entityType: string;
    isBreaking: boolean;
  };
  RemoveEntity: {
    entityType: string;
    isBreaking: boolean;
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
  readonly generateEntityBuilders: (schema: DocumentNode) => Effect$1.Effect<readonly ValidatedEntity[], SchemaFirstError>;
  readonly validateSchemaEvolution: (currentSchema: DocumentNode, proposedSchema: DocumentNode) => Effect$1.Effect<readonly SchemaEvolution[], SchemaEvolutionError>;
  readonly generateResolverStubs: (entities: readonly ValidatedEntity[]) => Effect$1.Effect<string, CodeGenerationError>;
  readonly generateTypeDefinitions: (entities: readonly ValidatedEntity[], language: "typescript" | "go" | "java" | "python") => Effect$1.Effect<string, CodeGenerationError>;
}
declare const SchemaFirstService: Context.Tag<SchemaFirstService, SchemaFirstService>;
declare const createSchemaFirstService: () => SchemaFirstService;
interface SchemaFirstWorkflow {
  readonly developSchema: (schemaSource: string) => Effect$1.Effect<SchemaLifecycleState, SchemaFirstError>;
  readonly evolveSchema: (currentState: SchemaLifecycleState, proposedSchema: string) => Effect$1.Effect<SchemaLifecycleState, SchemaEvolutionError>;
  readonly generateCode: (state: SchemaLifecycleState, targets: readonly ("resolvers" | "types")[]) => Effect$1.Effect<Record<string, string>, CodeGenerationError>;
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
      readonly entities: readonly ValidatedEntity[];
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
      readonly entities: readonly ValidatedEntity[];
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
          readonly entities: readonly ValidatedEntity[];
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
        readonly entities: readonly ValidatedEntity[];
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
          readonly entities: readonly ValidatedEntity[];
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
        readonly entities: readonly ValidatedEntity[];
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
declare const FederationLogger_base: Context.TagClass<FederationLogger$1, "FederationLogger", {
  readonly trace: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly debug: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly info: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly warn: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly error: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void>;
  readonly withSpan: <A, E, R>(name: string, effect: Effect$1.Effect<A, E, R>) => Effect$1.Effect<A, E, R>;
}>;
declare class FederationLogger$1 extends FederationLogger_base {}
declare const FederationLoggerLive: Layer.Layer<FederationLogger$1, never, never>;
declare const trace: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger$1>;
declare const debug: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger$1>;
declare const info: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger$1>;
declare const warn: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger$1>;
declare const error: (message: string, meta?: Record<string, unknown>) => Effect$1.Effect<void, never, FederationLogger$1>;
declare const withSpan: <A, E, R>(name: string, effect: Effect$1.Effect<A, E, R>) => Effect$1.Effect<A, E, FederationLogger$1 | R>;
declare const developmentLogger: Layer.Layer<FederationLogger$1, never, never>;
declare const productionLogger: Layer.Layer<FederationLogger$1, never, never>;
declare const testLogger: Layer.Layer<FederationLogger$1, never, never>;
//#endregion
//#region src/core/services/config.d.ts
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
type FederationConfig = Schema.Schema.Type<typeof FederationConfigSchema>;
declare const FederationConfigService_base: Context.TagClass<FederationConfigService$1, "FederationConfigService", {
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
declare class FederationConfigService$1 extends FederationConfigService_base {}
declare const FederationConfigLive: Layer.Layer<FederationConfigService$1, _effect_schema_ParseResult4.ParseError | effect_ConfigError4.ConfigError, never>;
declare const getServerConfig: Effect$1.Effect<{
  readonly port: number;
  readonly host: string;
  readonly cors: {
    readonly enabled: boolean;
    readonly origins: readonly string[];
  };
}, never, FederationConfigService$1>;
declare const getFederationConfig: Effect$1.Effect<{
  readonly introspection: boolean;
  readonly playground: boolean;
  readonly subscriptions: boolean;
  readonly tracing: boolean;
}, never, FederationConfigService$1>;
declare const getDatabaseConfig: Effect$1.Effect<{
  readonly url: string;
  readonly maxConnections: number;
  readonly connectionTimeout: string;
}, never, FederationConfigService$1>;
declare const getCacheConfig: Effect$1.Effect<{
  readonly redis: {
    readonly url: string;
    readonly keyPrefix: string;
    readonly defaultTtl: string;
  };
}, never, FederationConfigService$1>;
declare const getResilienceConfig: Effect$1.Effect<{
  readonly circuitBreaker: {
    readonly failureThreshold: number;
    readonly resetTimeout: string;
    readonly halfOpenMaxCalls: number;
  };
}, never, FederationConfigService$1>;
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
}, never, FederationConfigService$1>;
//#endregion
//#region src/core/services/layers.d.ts
declare const CoreServicesLive: Layer.Layer<FederationLogger$1 | FederationConfigService$1, _effect_schema_ParseResult4.ParseError | effect_ConfigError4.ConfigError, never>;
declare const DevelopmentLayerLive: Layer.Layer<FederationLogger$1 | FederationConfigService$1, _effect_schema_ParseResult4.ParseError | effect_ConfigError4.ConfigError, never>;
declare const ProductionLayerLive: Layer.Layer<FederationLogger$1 | FederationConfigService$1, _effect_schema_ParseResult4.ParseError | effect_ConfigError4.ConfigError, never>;
declare const TestLayerLive: Layer.Layer<FederationLogger$1 | FederationConfigService$1, _effect_schema_ParseResult4.ParseError | effect_ConfigError4.ConfigError, never>;
declare const MinimalLayerLive: Layer.Layer<FederationConfigService$1, _effect_schema_ParseResult4.ParseError | effect_ConfigError4.ConfigError, never>;
/**
 * Helper function to create environment-specific layers
 */
declare const createEnvironmentLayer: (environment?: string) => Layer.Layer<FederationLogger | FederationConfigService, never, never>;
//#endregion
//#region src/federation/composer.d.ts
declare const ModernFederationComposer_base: Context.TagClass<ModernFederationComposer, "ModernFederationComposer", {
  readonly compose: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError, FederationLogger$1>;
  readonly validate: (config: FederationCompositionConfig) => Effect$1.Effect<FederationCompositionConfig, ValidationError, FederationLogger$1>;
  readonly buildSchema: (composedConfig: ComposedConfiguration) => Effect$1.Effect<GraphQLSchema, CompositionError, FederationLogger$1>;
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
declare const ModernFederationComposerLive: Layer.Layer<ModernFederationComposer, never, FederationLogger$1>;
declare const compose: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError, ModernFederationComposer | FederationLogger$1>;
declare const validateConfig: (config: FederationCompositionConfig) => Effect$1.Effect<FederationCompositionConfig, ValidationError, ModernFederationComposer | FederationLogger$1>;
declare const handleCompositionError: (error: CompositionError) => string;
declare const createFederatedSchema: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError, ModernFederationComposer | FederationLogger$1>;
//#endregion
//#region src/federation/subgraph.d.ts
/**
 * Registry configuration for subgraph management
 */
interface RegistryConfig {
  readonly discoveryMode: "static" | "dynamic";
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
 * Features:
 * - Service registry with discovery
 * - Health checking and monitoring
 * - Auto-discovery with scheduled polling
 * - Circuit breaker integration
 * - Service lifecycle management
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
  discoveryInterval?: Duration.Duration;
  healthCheckInterval?: Duration.Duration;
}) => Effect.Effect<SubgraphRegistry, CompositionError, never>;
//#endregion
//#region src/federation/error-boundaries.d.ts
/**
 * GraphQL resolver function type
 */
type GraphQLResolver = (parent: any, args: any, context: any, info: GraphQLResolveInfo) => Promise<any>;
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
 */
interface SubgraphResults {
  readonly [subgraphId: string]: SubgraphResult;
}
interface SubgraphResult {
  readonly subgraphId: string;
  readonly success: boolean;
  readonly data?: any;
  readonly error?: any;
}
/**
 * Processed results after partial failure handling
 */
interface ProcessedResults {
  readonly data: any;
  readonly errors: ReadonlyArray<any>;
}
/**
 * Error context for transformation
 */
interface ErrorContext {
  readonly subgraphId: string;
  readonly fieldPath: ReadonlyArray<string>;
  readonly operationType: "query" | "mutation" | "subscription";
  readonly timestamp: Date;
}
/**
 * Transformed error for client consumption
 */
interface TransformedError {
  readonly message: string;
  readonly code: string;
  readonly path?: ReadonlyArray<string>;
  readonly extensions?: Record<string, any>;
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
 * Query plan representation
 */
interface QueryPlan {
  readonly id: string;
  readonly steps: ReadonlyArray<QueryStep>;
  readonly complexity: number;
  readonly estimatedCost: number;
}
interface QueryStep {
  readonly subgraphId: string;
  readonly operation: string;
  readonly dependencies: ReadonlyArray<string>;
}
/**
 * Cached query plan with metadata
 */
interface CachedQueryPlan {
  readonly plan: QueryPlan;
  readonly createdAt: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
}
/**
 * Query plan cache interface
 */
interface QueryPlanCache {
  readonly get: (queryHash: string) => Effect.Effect<CachedQueryPlan | undefined, never>;
  readonly set: (queryHash: string, plan: QueryPlan) => Effect.Effect<void, never>;
  readonly invalidate: (pattern?: string) => Effect.Effect<void, never>;
  readonly getStats: () => Effect.Effect<CacheStats, never>;
}
/**
 * Cache statistics
 */
interface CacheStats {
  readonly size: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly evictionCount: number;
}
/**
 * Federated DataLoader interface
 */
interface FederatedDataLoader {
  readonly getLoader: <K, V>(subgraphId: string, batchLoadFn: (keys: readonly K[]) => Promise<V[]>) => Effect.Effect<DataLoader<K, V>, never>;
  readonly clearAll: () => Effect.Effect<void, never>;
  readonly getStats: () => Effect.Effect<DataLoaderStats, never>;
}
/**
 * DataLoader statistics
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
 */
interface MetricsCollector {
  readonly recordExecution: (metrics: ExecutionMetrics) => Effect.Effect<void, never>;
  readonly recordCacheOperation: (operation: CacheOperation) => Effect.Effect<void, never>;
  readonly getMetrics: () => Effect.Effect<PerformanceMetrics, never>;
}
/**
 * Execution metrics
 */
interface ExecutionMetrics {
  readonly queryHash: string;
  readonly duration: number;
  readonly success: boolean;
  readonly subgraphCalls: ReadonlyArray<SubgraphCall>;
  readonly cacheHit?: boolean;
}
interface SubgraphCall {
  readonly subgraphId: string;
  readonly duration: number;
  readonly success: boolean;
  readonly batchSize?: number;
}
/**
 * Cache operation metrics
 */
interface CacheOperation {
  readonly type: "hit" | "miss" | "set" | "evict";
  readonly key: string;
  readonly duration?: number;
}
/**
 * Performance metrics summary
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
  readonly execute: (query: string, variables: Record<string, any>, context: ExecutionContext) => Effect.Effect<ExecutionResult, ExecutionError>;
}
/**
 * Execution context
 */
interface ExecutionContext {
  readonly [key: string]: any;
  readonly dataLoader?: FederatedDataLoader;
}
/**
 * Execution error
 */
interface ExecutionError {
  readonly _tag: "ExecutionError";
  readonly message: string;
  readonly cause?: unknown;
}
/**
 * PerformanceOptimizations - Query planning cache, DataLoader batching, and performance monitoring
 *
 * Features:
 * - Query plan caching with LRU eviction
 * - DataLoader batching integration per subgraph
 * - Performance metrics collection and monitoring
 * - Cache warming and preloading strategies
 * - Execution optimization with parallelization
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
//#region src/schema/index.d.ts
declare const SCHEMA_MODULE_VERSION = "2.0.0";
//#endregion
//#region src/patterns/index.d.ts
declare const PATTERNS_MODULE_VERSION = "2.0.0";
//#endregion
//#region src/examples/basic-entity.d.ts
interface FederationContext {
  readonly userId?: string;
  readonly permissions: ReadonlyArray<string>;
}
declare const example: Effect$1.Effect<FederatedSchema | null, never, ModernFederationComposer | FederationLogger$1>;
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
export { BaseDomainError, CircuitBreaker, CircuitBreakerConfig, type CircuitBreakerError, CircuitBreakerMetrics, CircuitBreakerState, CodeGenerationError, type CompositionError, CoreServicesLive, DataLoaderConfig, DevelopmentLayerLive, DirectiveValidationError, DiscoveryError, DomainError, EntityBuilderError, EntityDirective, EntityKey, EntityMetadata, EntityReferenceResolver, type EntityResolutionError, EntityTypename, EntityValidationResult, ErrorBoundaryConfig, ErrorFactory, ErrorMatching, ErrorTransformationConfig, FRAMEWORK_INFO, FederatedSchema, ModernFederationComposer as FederationComposer, FederationCompositionConfig, FederationConfig, FederationConfigLive, FederationConfigSchema, FederationConfigService$1 as FederationConfigService, FederationContext, FederationDirective, FederationDirectiveMap, FederationDomainError, FederationEntity, type FederationError, FederationErrorBoundaries, FederationLogger$1 as FederationLogger, FederationLoggerLive, FieldName, type FieldResolutionError, FieldResolver, FieldResolverMap, HealthCheckError, HealthStatus, HotReloadableSchema, KeyValidationError, MetricsConfig, MinimalLayerLive, ModernFederationComposer, ModernFederationComposerLive, ModernFederationEntityBuilder, NonEmptyArray, PATTERNS_MODULE_VERSION, PartialFailureConfig, PerformanceConfig, PerformanceOptimizations, PhantomStates, Prettify, ProductionLayerLive, QueryHash, QueryPlanCacheConfig, RegistrationError, RequireAtLeastOne, SCHEMA_MODULE_VERSION, SchemaChange, SchemaConflict, SchemaEvolution, SchemaEvolutionError, SchemaFirst, SchemaFirstError, SchemaFirstService, SchemaFirstWorkflow, SchemaImportResult, SchemaLifecycleState, SchemaMetadata, type SchemaValidationError, SchemaWatcher, ServiceDefinition, ServiceId, SubgraphManagement, SubgraphRegistry, SyncResult, TestLayerLive, type TimeoutError, type TypeConversionError, UltraStrictEntityBuilder, VERSION, ValidatedEntity, type ValidationError, example as basicEntityExample, compose, createBasicOptimizedExecutor, createDevelopmentOptimizedExecutor, createDirective, createDynamicRegistry, createEntityBuilder, createEntityKey, createEnvironmentLayer, createFederatedSchema, createMonitoredRegistry, createProductionBoundary, createProductionOptimizedExecutor, createResilientBoundary, createSchemaFirstService, createSchemaFirstWorkflow, createStaticRegistry, createStrictBoundary, createUltraStrictEntityBuilder, debug, defineEntity, developmentLogger, error, getCacheConfig, getDatabaseConfig, getFederationConfig, getObservabilityConfig, getResilienceConfig, getServerConfig, handleCompositionError, info, matchEntityValidationResult, productionLogger, testLogger, trace, validateConfig, validateEntityBuilder, warn, withDirectives, withKeys, withResolvers, withSchema, withSpan };
//# sourceMappingURL=index.d.cts.map