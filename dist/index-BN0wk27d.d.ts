import { EntityReferenceResolver, EntityResolutionError, FederationDirectiveMap, FederationEntity, FieldResolver, FieldResolverMap, ValidationError } from "./types-iFJStALn.js";
import { Effect } from "effect";
import * as Data from "effect/Data";
import * as Effect$1 from "effect/Effect";
import { GraphQLFieldResolver, GraphQLOutputType, GraphQLResolveInfo } from "graphql";
import * as Schema from "effect/Schema";
import * as effect_Types0 from "effect/Types";
import * as effect_Cause2 from "effect/Cause";

//#region src/api/advanced/strict.d.ts

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
    readonly errors: readonly SchemaValidationError[];
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
  readonly Valid: <A, I, R>(args: {
    readonly entity: ValidatedEntity<A, I, R>;
    readonly metadata: EntityMetadata;
  }) => EntityValidationResult<A, I, R>;
  readonly InvalidSchema: <A, I, R>(args: {
    readonly errors: readonly SchemaValidationError[];
    readonly partialEntity?: Partial<ValidatedEntity<A, I, R>>;
  }) => EntityValidationResult<A, I, R>;
  readonly InvalidKeys: <A, I, R>(args: {
    readonly errors: readonly KeyValidationError[];
    readonly schema: Schema.Schema<A, I, R>;
  }) => EntityValidationResult<A, I, R>;
  readonly InvalidDirectives: <A, I, R>(args: {
    readonly errors: readonly DirectiveValidationError[];
    readonly schema: Schema.Schema<A, I, R>;
    readonly keys: readonly EntityKey[];
  }) => EntityValidationResult<A, I, R>;
  readonly CircularDependency: <A, I, R>(args: {
    readonly cycle: readonly string[];
    readonly involvedEntities: readonly string[];
  }) => EntityValidationResult<A, I, R>;
  readonly IncompatibleVersion: <A, I, R>(args: {
    readonly requiredVersion: string;
    readonly currentVersion: string;
    readonly entity: string;
  }) => EntityValidationResult<A, I, R>;
};
declare const SchemaValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause2.YieldableError & {
  readonly _tag: "SchemaValidationError";
} & Readonly<A>;
/**
 * Schema validation error for ultra-strict entity builder
 * @category Experimental
 */
declare class SchemaValidationError extends SchemaValidationError_base<{
  readonly message: string;
  readonly schemaPath: readonly string[];
  readonly suggestion?: string;
}> {}
declare const KeyValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause2.YieldableError & {
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
declare const DirectiveValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause2.YieldableError & {
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
declare const EntityBuilderError_base: new <A extends Record<string, any> = {}>(args: effect_Types0.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause2.YieldableError & {
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
interface UltraStrictEntityBuilder<TState extends PhantomStates.Unvalidated | PhantomStates.HasSchema | PhantomStates.HasKeys | PhantomStates.HasDirectives | PhantomStates.Complete, A = unknown, I = A, R = never> {
  readonly _phantomState: TState;
  readonly typename: string;
  readonly schema: Schema.Schema<A, I, R>;
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
declare const createUltraStrictEntityBuilder: <A = unknown, I = A, R = never>(typename: string, schema: Schema.Schema<A, I, R>) => UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R>;
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
declare const withSchema: <A = unknown, I = A, R = never>(schema?: Schema.Schema<A, I, R>) => (builder: UltraStrictEntityBuilder<PhantomStates.Unvalidated, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R>;
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
declare const withKeys: <A = unknown, I = A, R = never>(keys?: readonly EntityKey[]) => (builder: UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.HasKeys, A, I, R>;
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
declare const withDirectives: <A = unknown, I = A, R = never>(directives?: readonly EntityDirective[]) => (builder: UltraStrictEntityBuilder<PhantomStates.HasKeys, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.HasDirectives, A, I, R>;
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
declare const withResolvers: <A = unknown, I = A, R = never>(resolvers?: Record<string, GraphQLFieldResolver<A, I, R>>) => (builder: UltraStrictEntityBuilder<PhantomStates.HasDirectives, A, I, R>) => UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>;
/**
 * Validates a complete entity builder using exhaustive pattern matching
 */
declare const validateEntityBuilder: <A = unknown, I = A, R = never>(builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>) => Effect$1.Effect<EntityValidationResult<A, I, R>, EntityBuilderError>;
/**
 * Exhaustive pattern matching over entity validation results
 */
declare const matchEntityValidationResult: <A, I, R>(handlers: {
  readonly Valid: (data: {
    readonly entity: ValidatedEntity<A, I, R>;
    readonly metadata: EntityMetadata;
  }) => A;
  readonly InvalidSchema: (data: {
    readonly errors: readonly SchemaValidationError[];
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
//#region src/runtime/core/builders/entity-builder.d.ts
/**
 * Federation Entity Builder with full Apollo Federation 2.x directive support
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
 * import { createEntityBuilder } from '@cqrs/federation'
 * import { Effect } from 'effect'
 * import * as Schema from 'effect/Schema'
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
declare class FederationEntityBuilder<TSource extends Record<string, unknown> = Record<string, unknown>, TContext = Record<string, unknown>, TResult = TSource, TReference = TSource, TExtensions = Record<string, unknown>> {
  private readonly typename;
  private readonly schema;
  private readonly keyFields;
  private readonly directiveMap;
  private readonly fieldResolvers;
  private readonly referenceResolver?;
  private readonly extensions?;
  constructor(typename: string, schema: Schema.Schema<TSource, TSource, never>, keyFields: ReadonlyArray<keyof TSource>, directiveMap?: FederationDirectiveMap, fieldResolvers?: FieldResolverMap<TResult, TContext>, referenceResolver?: EntityReferenceResolver<TResult, TContext, TReference> | undefined, extensions?: Record<string, unknown> | undefined);
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
   * This allows for gradual transfer of field ownership between services.
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
   * @example Service ownership transfer
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
  withReferenceResolver<TReference>(resolver: EntityReferenceResolver<TResult, TContext, TReference>): FederationEntityBuilder<TSource, TContext, TResult, TReference>;
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
declare const createEntityBuilder: <TSource extends Record<string, unknown> = Record<string, unknown>, TContext extends Record<string, unknown> = Record<string, unknown>, TResult = TSource, TReference extends Record<string, unknown> = Record<string, unknown>>(typename: string, schema: Schema.Schema<TSource, TSource, never>, keyFields: ReadonlyArray<keyof TSource>) => FederationEntityBuilder<TSource, TContext, TResult, TReference>;
/**
 * Convert ValidatedEntity to FederationEntity for compatibility
 */
declare const toFederationEntity: <TSource = Record<string, unknown>, TContext = Record<string, unknown>, TResult = TSource, TReference = Record<string, unknown>>(validatedEntity: ValidatedEntity<TSource, TContext, TResult> & {
  key: string[];
}, referenceResolver?: EntityReferenceResolver<TResult, TContext, TReference>) => FederationEntity<TSource, TContext, TResult, TReference>;
declare namespace index_d_exports {
  export { DirectiveValidationError, EntityBuilderError, EntityDirective, EntityKey, EntityMetadata, EntityValidationResult, KeyValidationError, PhantomStates, SchemaValidationError, UltraStrictEntityBuilder, ValidatedEntity, createUltraStrictEntityBuilder, matchEntityValidationResult, validateEntityBuilder, withDirectives, withKeys, withResolvers, withSchema };
}
//#endregion
export { FederationEntityBuilder, type ValidatedEntity, createEntityBuilder, index_d_exports, toFederationEntity };
//# sourceMappingURL=index-BN0wk27d.d.ts.map