import { Effect, pipe } from "effect"
import * as Schema from "@effect/schema/Schema"
import type { GraphQLResolveInfo } from "graphql"
import type {
  FederationEntity,
  FederationDirective,
  FederationDirectiveMap,
  EntityReferenceResolver,
  FieldResolver,
  FieldResolverMap,
  EntityResolutionError,
  ValidationError
} from "../types.js"
import { ErrorFactory } from "../errors.js"

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
export class ModernFederationEntityBuilder<
  TSource extends Record<string, any> = Record<string, any>,
  TContext = Record<string, unknown>,
  TResult extends Partial<TSource> = Partial<TSource>,
  TReference extends Partial<TSource> = Partial<TSource>
> {
  constructor(
    private readonly typename: string,
    private readonly schema: Schema.Schema.Any,
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
      throw new Error("Typename cannot be empty")
    }
    if (!this.keyFields?.length) {
      throw new Error("Key fields cannot be empty")
    }
  }

  /**
   * Federation 2.x directive support
   * @shareable - Field can be resolved by multiple subgraphs
   */
  withShareableField<K extends keyof TResult>(
    field: K,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return this.addDirective(field as string, {
      type: "@shareable"
    }, resolver)
  }

  /**
   * @inaccessible - Field hidden from public schema but available for federation
   */
  withInaccessibleField<K extends keyof TResult>(
    field: K,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return this.addDirective(field as string, {
      type: "@inaccessible"
    }, resolver)
  }

  /**
   * @tag - Metadata tags for schema organization and tooling
   */
  withTaggedField<K extends keyof TResult>(
    field: K,
    tags: ReadonlyArray<string>,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!tags.length) {
      throw new Error("Tags array cannot be empty")
    }
    
    return this.addDirective(field as string, {
      type: "@tag",
      args: { names: tags }
    }, resolver)
  }

  /**
   * @override - Overrides field resolution from another subgraph
   */
  withOverrideField<K extends keyof TResult>(
    field: K,
    fromSubgraph: string,
    resolver: FieldResolver<TResult, TContext, TResult[K]>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!fromSubgraph?.trim()) {
      throw new Error("fromSubgraph cannot be empty")
    }
    if (!resolver) {
      throw new Error("Resolver is required for override fields")
    }
    
    return this.addDirective(field as string, {
      type: "@override",
      args: { from: fromSubgraph }
    }, resolver)
  }

  /**
   * @external - Field is defined in another subgraph
   */
  withExternalField<K extends keyof TResult>(
    field: K
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return this.addDirective(field as string, {
      type: "@external"
    })
  }

  /**
   * @requires - Field requires specific fields from base type
   */
  withRequiredFields<K extends keyof TResult>(
    field: K,
    requiredFields: string,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!requiredFields?.trim()) {
      throw new Error("Required fields specification cannot be empty")
    }
    
    return this.addDirective(field as string, {
      type: "@requires",
      args: { fields: requiredFields }
    }, resolver)
  }

  /**
   * @provides - Field provides specific fields to base type
   */
  withProvidedFields<K extends keyof TResult>(
    field: K,
    providedFields: string,
    resolver?: FieldResolver<TResult, TContext, TResult[K]>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!providedFields?.trim()) {
      throw new Error("Provided fields specification cannot be empty")
    }
    
    return this.addDirective(field as string, {
      type: "@provides",
      args: { fields: providedFields }
    }, resolver)
  }

  /**
   * Add a custom field resolver without directives
   */
  withField<K extends keyof TResult>(
    field: K,
    resolver: FieldResolver<TResult, TContext, TResult[K]>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!resolver) {
      throw new Error("Field resolver cannot be null")
    }

    return new ModernFederationEntityBuilder(
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
  withReferenceResolver(
    resolver: EntityReferenceResolver<TResult, TContext, TReference>
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    if (!resolver) {
      throw new Error("Reference resolver cannot be null")
    }

    return new ModernFederationEntityBuilder(
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
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    return new ModernFederationEntityBuilder(
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
  ): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> {
    // Validate directive conflicts
    this.validateDirectiveConflicts(field, directive)
    
    const existingDirectives = this.directiveMap[field] || []
    const newDirectiveMap = {
      ...this.directiveMap,
      [field]: [...existingDirectives, directive]
    }

    const newFieldResolvers = resolver ? {
      ...this.fieldResolvers,
      [field]: resolver
    } as FieldResolverMap<TResult, TContext> : this.fieldResolvers

    return new ModernFederationEntityBuilder(
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
    const existingDirectives = this.directiveMap[field] || []
    
    // Check for conflicting directives
    const conflicts = [
      ["@shareable", "@override"],
      ["@inaccessible", "@shareable"],
      ["@external", "@override"]
    ]
    
    for (const [dir1, dir2] of conflicts) {
      const hasFirst = existingDirectives.some(d => d.type === dir1) || newDirective.type === dir1
      const hasSecond = existingDirectives.some(d => d.type === dir2) || newDirective.type === dir2
      
      if (hasFirst && hasSecond) {
        throw new Error(`Conflicting directives: ${dir1} and ${dir2} cannot be used together on field ${field}`)
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
  build(): Effect.Effect<FederationEntity<TSource, TContext, TResult, TReference>, ValidationError> {
    return pipe(
      this.validateBuildRequirements(),
      Effect.flatMap(() => this.createFederationEntity())
    )
  }

  /**
   * Validate that all required components are present for building
   */
  private validateBuildRequirements(): Effect.Effect<void, ValidationError> {
    const self = this
    return Effect.gen(function* () {
      // Validate reference resolver is present
      if (!self.referenceResolver) {
        yield* Effect.fail(ErrorFactory.validation(
          "Reference resolver is required",
          "referenceResolver"
        ))
      }

      // Validate that override fields have resolvers
      for (const [field, directives] of Object.entries(self.directiveMap)) {
        const hasOverride = directives.some(d => d.type === "@override")
        if (hasOverride && !self.fieldResolvers[field as keyof TResult]) {
          yield* Effect.fail(ErrorFactory.validation(
            `Override field '${field}' requires a resolver`,
            "fieldResolver",
            field
          ))
        }
      }
    }.bind(this))
  }

  /**
   * Create the federation entity instance
   */
  private createFederationEntity(): Effect.Effect<FederationEntity<TSource, TContext, TResult, TReference>, never> {
    const entity: FederationEntity<TSource, TContext, TResult, TReference> = {
      typename: this.typename,
      key: this.keyFields as string | ReadonlyArray<string>,
      schema: this.schema as Schema.Schema<TSource, TContext>,
      resolveReference: this.referenceResolver!,
      fields: this.fieldResolvers,
      directives: this.directiveMap,
      extensions: this.extensions
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
        Effect.all(keys.map(key => 
          key in reference && reference[key as keyof TReference] !== undefined
            ? Effect.succeed(reference[key as keyof TReference])
            : Effect.fail(ErrorFactory.validation(`Missing key field: ${String(key)}`, String(key)))
        ))
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
          Effect.fail(ErrorFactory.entityResolution(
            `Failed to resolve ${this.typename} entity`,
            this.typename,
            String(reference),
            error
          ))
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
 * Factory function for creating entity builders with type inference
 */
export const createEntityBuilder = <
  TSource extends Record<string, any>,
  TContext = Record<string, unknown>,
  TResult extends Partial<TSource> = Partial<TSource>,
  TReference extends Partial<TSource> = Partial<TSource>
>(
  typename: string,
  schema: Schema.Schema.Any,
  keyFields: ReadonlyArray<keyof TSource>
): ModernFederationEntityBuilder<TSource, TContext, TResult, TReference> => {
  return new ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>(
    typename,
    schema,
    keyFields
  )
}

/**
 * Utility function to create entity with fluent API
 */
export const defineEntity = <
  TSource extends Record<string, any>,
  TContext = Record<string, unknown>,
  TResult extends Partial<TSource> = Partial<TSource>,
  TReference extends Partial<TSource> = Partial<TSource>
>(
  config: {
    readonly typename: string
    readonly schema: Schema.Schema.Any
    readonly keyFields: ReadonlyArray<keyof TSource>
  },
  builder: (
    entityBuilder: ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>
  ) => ModernFederationEntityBuilder<TSource, TContext, TResult, TReference>
): Effect.Effect<FederationEntity<TSource, TContext, TResult, TReference>, ValidationError> => {
  const initialBuilder = createEntityBuilder<TSource, TContext, TResult, TReference>(
    config.typename,
    config.schema,
    config.keyFields
  )
  
  return builder(initialBuilder).build()
}