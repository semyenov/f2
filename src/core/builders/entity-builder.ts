import { Effect, pipe } from 'effect'
import * as Schema from '@effect/schema/Schema'
import type { GraphQLResolveInfo } from 'graphql'
import type {
  FederationEntity,
  FederationDirective,
  FederationDirectiveMap,
  EntityReferenceResolver,
  FieldResolver,
  FieldResolverMap,
  EntityResolutionError,
  ValidationError,
} from '../types.js'
import { ErrorFactory } from '../errors.js'

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
export class FederationEntityBuilder<
  TSource extends Record<string, unknown> = Record<string, unknown>,
  TContext = Record<string, unknown>,
  TResult extends Partial<TSource> = Partial<TSource>,
  TReference extends Partial<TSource> = Partial<TSource>,
> {
  constructor(
    private readonly typename: string,
    private readonly schema: Schema.Schema<TSource, TSource>,
    private readonly keyFields: ReadonlyArray<keyof TSource>,
    private readonly directiveMap: FederationDirectiveMap = {},
    private readonly fieldResolvers: FieldResolverMap<TSource, TContext> = {},
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
   * Federation 2.x directive support
   * Marks field as @shareable - Field can be resolved by multiple subgraphs
   */
  withShareableField<K extends keyof TSource>(
    field: K,
    resolver?: FieldResolver<TSource, TContext, TSource[K]>
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
   * Marks field as @inaccessible - Field hidden from public schema but available for federation
   */
  withInaccessibleField<K extends keyof TSource>(
    field: K,
    resolver?: FieldResolver<TSource, TContext, TSource[K]>
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
   */
  withTaggedField<K extends keyof TSource>(
    field: K,
    tags: ReadonlyArray<string>,
    resolver?: FieldResolver<TSource, TContext, TSource[K]>
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
   * @override - Overrides field resolution from another subgraph
   */
  withOverrideField<K extends keyof TSource>(
    field: K,
    fromSubgraph: string,
    resolver: FieldResolver<TSource, TContext, TSource[K]>
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
   * Marks field as @external - Field is defined in another subgraph
   */
  withExternalField<K extends keyof TSource>(
    field: K
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return this.addDirective(field as string, {
      type: '@external',
    })
  }

  /**
   * Marks field with @requires - Field requires specific fields from base type
   */
  withRequiredFields<K extends keyof TSource>(
    field: K,
    requiredFields: string,
    resolver?: FieldResolver<TSource, TContext, TSource[K]>
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
  withProvidedFields<K extends keyof TSource>(
    field: K,
    providedFields: string,
    resolver?: FieldResolver<TSource, TContext, TSource[K]>
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
  withField<K extends keyof TSource>(
    field: K,
    resolver: FieldResolver<TSource, TContext, TSource[K]>
  ): FederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return new FederationEntityBuilder(
      this.typename,
      this.schema,
      this.keyFields,
      this.directiveMap,
      {
        ...this.fieldResolvers,
        [field]: resolver,
      } as FieldResolverMap<TSource, TContext>,
      this.referenceResolver,
      this.extensions
    )
  }

  /**
   * Set the reference resolver for entity resolution
   */
  withReferenceResolver(
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
    return new FederationEntityBuilder(
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
  private addDirective<K extends keyof TSource>(
    field: string,
    directive: FederationDirective,
    resolver?: FieldResolver<TSource, TContext, TSource[K]>
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
        } as FieldResolverMap<TSource, TContext>)
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
  build(): Effect.Effect<
    FederationEntity<TSource, TContext, TResult, TReference>,
    ValidationError
  > {
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
      if (hasOverride && !this.fieldResolvers[field as keyof TSource]) {
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
    FederationEntity<TSource, TContext, TResult, TReference>,
    never
  > {
    const entity: FederationEntity<TSource, TContext, TResult, TReference> = {
      typename: this.typename,
      key: this.keyFields as string | ReadonlyArray<string>,
      schema: this.schema as unknown as Schema.Schema<TSource, TContext>,
      resolveReference: this.referenceResolver!,
      fields: this.fieldResolvers as unknown as FieldResolverMap<TResult, TContext>,
      directives: this.directiveMap,
      extensions: this.extensions,
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
            key in reference && reference[key as keyof TReference] !== undefined
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
>(
  typename: string,
  schema: Schema.Schema<TSource, TSource>,
  keyFields: ReadonlyArray<keyof TSource>
): FederationEntityBuilder<TSource, TContext, TSource, Partial<TSource>> => {
  return new FederationEntityBuilder<TSource, TContext, TSource, Partial<TSource>>(
    typename,
    schema,
    keyFields
  )
}
