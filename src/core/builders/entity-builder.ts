import { Effect, pipe } from 'effect'
import type * as Schema from 'effect/Schema'
import type { GraphQLOutputType, GraphQLResolveInfo } from 'graphql'
import type {
  EntityDirective,
  EntityKey,
  EntityMetadata,
  ValidatedEntity,
} from '../../experimental/strict.js'
import { ErrorFactory } from '../errors.js'
import type {
  EntityReferenceResolver,
  EntityResolutionError,
  FederationDirective,
  FederationDirectiveMap,
  FederationEntity,
  FieldResolutionError,
  FieldResolver,
  FieldResolverMap,
  ValidationError,
} from '../types.js'

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
export class FederationEntityBuilder<
  TSource extends Record<string, unknown> = Record<string, unknown>,
  TContext = Record<string, unknown>,
  TResult = TSource,
  TReference = TSource,
  TExtensions = Record<string, unknown>,
> {
  constructor(
    private readonly typename: string,
    // Schema types require flexibility for proper type inference
    private readonly schema: Schema.Schema<TSource, TSource, never>,
    private readonly keyFields: ReadonlyArray<keyof TSource>,
    private readonly directiveMap: FederationDirectiveMap = {},
    private readonly fieldResolvers: FieldResolverMap<TResult, TContext> = {},
    private readonly referenceResolver?: EntityReferenceResolver<TResult, TContext, TReference>,
    private readonly extensions?: Record<string, unknown>
  ) {
    this.validateConstructorArgs()
  }

  private validateConstructorArgs(): void {
    if (!this.typename?.trim()) {
      throw new Error('Typename cannot be empty')
    }
    if (!this.keyFields?.length) {
      throw new Error('Key fields cannot be empty')
    }
  }

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
  withShareableField<K extends keyof TResult>(
    field: K,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return this.addDirective(
      field as string,
      {
        type: '@shareable',
      },
      resolver
    )
  }

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
  withInaccessibleField<K extends keyof TResult>(
    field: K,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return this.addDirective(
      field as string,
      {
        type: '@inaccessible',
      },
      resolver
    )
  }

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
  withTaggedField<K extends keyof TResult>(
    field: K,
    tags: ReadonlyArray<string>,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!tags.length) {
      throw new Error('Tags array cannot be empty')
    }

    return this.addDirective(
      field as string,
      {
        type: '@tag',
        args: { names: tags },
      },
      resolver
    )
  }

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
  withOverrideField<K extends keyof TResult>(
    field: K,
    fromSubgraph: string,
    resolver: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!fromSubgraph?.trim()) {
      throw new Error('fromSubgraph cannot be empty')
    }

    return this.addDirective(
      field as string,
      {
        type: '@override',
        args: { from: fromSubgraph },
      },
      resolver
    )
  }

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
  withExternalField<K extends keyof TResult>(
    field: K
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return this.addDirective(field as string, {
      type: '@external',
    })
  }

  /**
   * Marks field with @requires - Field requires specific fields from base type
   */
  withRequiredFields<K extends keyof TResult>(
    field: K,
    requiredFields: string,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!requiredFields?.trim()) {
      throw new Error('Required fields specification cannot be empty')
    }

    return this.addDirective(
      field as string,
      {
        type: '@requires',
        args: { fields: requiredFields },
      },
      resolver
    )
  }

  /**
   * Marks field with @provides - Field provides specific fields to base type
   */
  withProvidedFields<K extends keyof TResult>(
    field: K,
    providedFields: string,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!providedFields?.trim()) {
      throw new Error('Provided fields specification cannot be empty')
    }

    return this.addDirective(
      field as string,
      {
        type: '@provides',
        args: { fields: providedFields },
      },
      resolver
    )
  }

  /**
   * Add a custom field resolver without directives
   */
  withField<K extends keyof TResult>(
    field: K,
    resolver: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return new FederationEntityBuilder(
      this.typename,
      this.schema,
      this.keyFields,
      this.directiveMap,
      {
        ...this.fieldResolvers,
        [field]: resolver,
      } as FieldResolverMap<TResult, TContext>,
      this.referenceResolver,
      this.extensions
    )
  }

  /**
   * Set the reference resolver for entity resolution
   */
  withReferenceResolver<TReference>(
    resolver: EntityReferenceResolver<TResult, TContext, TReference>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return new FederationEntityBuilder(
      this.typename,
      this.schema,
      this.keyFields,
      this.directiveMap,
      this.fieldResolvers,
      resolver,
      this.extensions
    )
  }

  /**
   * Add extension metadata to the entity
   */
  withExtensions(
    extensions: Record<string, unknown>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return new FederationEntityBuilder<TSource, TContext, TResult, TReference, TExtensions>(
      this.typename,
      this.schema,
      this.keyFields,
      this.directiveMap,
      this.fieldResolvers,
      this.referenceResolver,
      { ...this.extensions, ...extensions }
    )
  }

  /**
   * Internal method to add directives with validation
   */
  private addDirective<K extends keyof TResult>(
    field: string,
    directive: FederationDirective,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    // Validate directive conflicts
    this.validateDirectiveConflicts(field, directive)

    const existingDirectives = this.directiveMap[field] ?? []
    const newDirectiveMap = {
      ...this.directiveMap,
      [field]: [...existingDirectives, directive],
    }

    const newFieldResolvers = resolver
      ? ({
          ...this.fieldResolvers,
          [field]: resolver,
        } as FieldResolverMap<TResult, TContext>)
      : this.fieldResolvers

    return new FederationEntityBuilder(
      this.typename,
      this.schema,
      this.keyFields,
      newDirectiveMap,
      newFieldResolvers,
      this.referenceResolver,
      this.extensions
    )
  }

  /**
   * Validate directive conflicts and usage rules
   */
  private validateDirectiveConflicts(field: string, newDirective: FederationDirective): void {
    const existingDirectives = this.directiveMap[field] ?? []

    // Check for conflicting directives
    const conflicts = [
      ['@shareable', '@override'],
      ['@inaccessible', '@shareable'],
      ['@external', '@override'],
    ]

    for (const [dir1, dir2] of conflicts) {
      const hasFirst = existingDirectives.some(d => d.type === dir1) || newDirective.type === dir1
      const hasSecond = existingDirectives.some(d => d.type === dir2) || newDirective.type === dir2

      if (hasFirst && hasSecond) {
        throw new Error(
          `Conflicting directives: ${dir1} and ${dir2} cannot be used together on field ${field}`
        )
      }
    }

    // Prevent duplicate directives
    if (existingDirectives.some(d => d.type === newDirective.type)) {
      throw new Error(`Directive ${newDirective.type} is already applied to field ${field}`)
    }
  }

  /**
   * Build the complete federation entity with Effect-based resolution
   */
  build(): Effect.Effect<ValidatedEntity<TSource, TContext, TResult>, ValidationError> {
    return pipe(
      this.validateBuildRequirements(),
      Effect.flatMap(() => this.createFederationEntity())
    )
  }

  /**
   * Validate that all required components are present for building
   */
  private validateBuildRequirements(): Effect.Effect<void, ValidationError> {
    // Reference resolver is only required if the entity has federation directives
    const hasFederationDirectives = Object.values(this.directiveMap).some(directives =>
      directives.some(d => ['@key', '@requires', '@provides', '@external'].includes(d.type))
    )

    if (hasFederationDirectives && !this.referenceResolver) {
      return Effect.fail(
        ErrorFactory.validation(
          'Reference resolver is required for entities with federation directives',
          'referenceResolver'
        )
      )
    }

    // Validate that override fields have resolvers
    for (const [field, directives] of Object.entries(this.directiveMap)) {
      const hasOverride = directives.some(d => d.type === '@override')
      if (hasOverride && !this.fieldResolvers[field as keyof TResult]) {
        return Effect.fail(
          ErrorFactory.validation(
            `Override field '${field}' requires a resolver`,
            'fieldResolver',
            field
          )
        )
      }
    }

    return Effect.succeed(undefined)
  }

  /**
   * Create the federation entity instance
   */
  private createFederationEntity(): Effect.Effect<
    ValidatedEntity<TSource, TContext, TResult>,
    never
  > {
    // Convert FederationDirectiveMap to EntityDirective[]
    const directives: EntityDirective[] = Object.entries(this.directiveMap).flatMap(
      ([fieldName, fieldDirectives]) =>
        fieldDirectives.map(directive => ({
          name: directive.type.replace('@', ''),
          args: directive.args ?? {},
          applicableFields: [fieldName],
        }))
    )

    // Convert key fields to EntityKey[]
    const keys: EntityKey[] = this.keyFields.map(field => ({
      field: String(field),
      type: {} as GraphQLOutputType, // GraphQL type - would need proper type mapping
      isComposite: this.keyFields.length > 1,
    }))

    // Create metadata
    const metadata: EntityMetadata = {
      typename: this.typename,
      version: '2.0.0',
      createdAt: new Date(),
      validationLevel: 'strict',
      dependencies: [],
    }

    // Convert field resolvers to GraphQL resolvers
    const resolvers: Record<
      string,
      (
        source: TSource,
        args: unknown,
        context: TContext,
        info: GraphQLResolveInfo
      ) => Effect.Effect<TResult, FieldResolutionError, never>
    > = {}
    for (const [fieldName, resolver] of Object.entries(this.fieldResolvers) as [
      string,
      FieldResolver<TResult, TContext, TResult[keyof TResult]> | undefined,
    ][]) {
      if (typeof resolver === 'function') {
        resolvers[fieldName] = (
          source: TSource,
          args: unknown,
          context: TContext,
          info: GraphQLResolveInfo
        ) =>
          Effect.gen(function* () {
            const result = yield* Effect.try({
              try: () =>
                resolver(
                  source as unknown as TResult,
                  args as unknown as Record<string, unknown>,
                  context,
                  info
                ),
              catch: error =>
                ErrorFactory.fieldResolution(
                  `Field resolution failed for ${fieldName}: ${String(error)}`
                ),
            })
            return result as TResult
          })
      }
    }

    const entity: ValidatedEntity<TSource, TContext, TResult> & {
      key: string[]
    } = {
      typename: this.typename,
      schema: this.schema as unknown as Schema.Schema<TSource, TContext, TResult>,
      keys,
      directives,
      resolvers,
      metadata,
      // Add compatible key property for tests
      key: keys.map(k => k.field),
    }

    return Effect.succeed(entity)
  }

  /**
   * Validate entity reference using key fields
   */
  private validateReference(reference: TReference): Effect.Effect<TReference, ValidationError> {
    return pipe(
      Effect.succeed(this.keyFields),
      Effect.flatMap(keys =>
        Effect.all(
          keys.map(key =>
            typeof reference === 'object' &&
            reference !== null &&
            key in reference &&
            reference[key as keyof TReference] !== undefined
              ? Effect.succeed(reference[key as keyof TReference])
              : Effect.fail(
                  ErrorFactory.validation(`Missing key field: ${String(key)}`, String(key))
                )
          )
        )
      ),
      Effect.map(() => reference)
    )
  }

  /**
   * Create a default reference resolver that validates key fields
   */
  createDefaultReferenceResolver(): EntityReferenceResolver<TResult, TContext, TReference> {
    return (reference: TReference, context: TContext, info: GraphQLResolveInfo) =>
      pipe(
        this.validateReference(reference),
        Effect.flatMap(validRef => this.resolveEntityFromReference(validRef, context, info)),
        Effect.catchAll(error =>
          Effect.fail(
            ErrorFactory.entityResolution(
              `Failed to resolve ${this.typename} entity`,
              this.typename,
              String(reference),
              error
            )
          )
        )
      ) as Effect.Effect<TResult, EntityResolutionError>
  }

  /**
   * Template method for entity resolution - can be overridden by subclasses
   */
  protected resolveEntityFromReference(
    reference: TReference,
    _context: TContext,
    _info: GraphQLResolveInfo
  ): Effect.Effect<TResult, EntityResolutionError> {
    // Default implementation returns the reference as-is
    // Subclasses should override this method for actual data fetching
    return Effect.succeed(reference as unknown as TResult)
  }
}

/**
 * Factory function for creating entity builders with proper type inference
 */
export const createEntityBuilder = <
  TSource extends Record<string, unknown> = Record<string, unknown>,
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TResult = TSource,
  // Using a type assertion for TReference to maintain GraphQL compatibility
  TReference extends Record<string, unknown> = Record<string, unknown>,
>(
  typename: string,
  // Schema types require flexibility for proper type inference
  schema: Schema.Schema<TSource, TSource, never>,
  keyFields: ReadonlyArray<keyof TSource>
): FederationEntityBuilder<TSource, TContext, TResult, TReference> => {
  return new FederationEntityBuilder<TSource, TContext, TResult, TReference>(
    typename,
    schema,
    keyFields
  )
}

/**
 * Convert ValidatedEntity to FederationEntity for compatibility
 */
export const toFederationEntity = <
  TSource = Record<string, unknown>,
  TContext = Record<string, unknown>,
  TResult = TSource,
  TReference = Record<string, unknown>,
>(
  validatedEntity: ValidatedEntity<TSource, TContext, TResult> & {
    key: string[]
  },
  referenceResolver?: EntityReferenceResolver<TResult, TContext, TReference>
): FederationEntity<TSource, TContext, TResult, TReference> => {
  // Build directives map
  const directivesMap: Record<string, FederationDirective[]> = {}

  for (const directive of validatedEntity.directives) {
    if (directive.applicableFields) {
      for (const field of directive.applicableFields) {
        const directiveType = `@${directive.name}` as FederationDirective['type']
        directivesMap[field] = [
          ...(directivesMap[field] ?? ([] as FederationDirective[])),
          {
            type: directiveType,
            args: directive.args,
          },
        ]
      }
    }
  }

  // Convert to readonly FederationDirectiveMap
  const directives: FederationDirectiveMap =
    Object.keys(directivesMap).length > 0
      ? Object.fromEntries(
          Object.entries(directivesMap).map(([key, value]) => [
            key,
            value as ReadonlyArray<FederationDirective>,
          ])
        )
      : {}

  return {
    typename: validatedEntity.typename,
    key: validatedEntity.key,
    schema: validatedEntity.schema as unknown as Schema.Schema<TSource, TResult>,
    resolveReference: referenceResolver ?? (() => Effect.succeed({} as TResult)),
    fields: undefined,
    directives: Object.keys(directives).length > 0 ? directives : undefined,
    extensions: undefined,
  }
}
