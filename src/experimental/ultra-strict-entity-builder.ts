/**
 * Ultra-Strict Entity Builder with Pattern Matching
 *
 * This module implements the UltraStrictEntityBuilder that provides:
 * - Discriminated union for entity validation results
 * - Exhaustive pattern matching over validation scenarios
 * - Type-safe fluent interface with compile-time validation
 * - Zero-cost abstractions through phantom types
 */

import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Schema from 'effect/Schema'
import type { GraphQLFieldResolver, GraphQLOutputType } from 'graphql'

// ============================================================================
// Core Types and Phantom Type System
// ============================================================================

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
export namespace PhantomStates {
  /** Initial state - no configuration applied yet */
  export interface Unvalidated {
    readonly _tag: 'Unvalidated'
  }

  /** Schema has been defined and validated */
  export interface HasSchema {
    readonly _tag: 'HasSchema'
  }

  /** Entity keys have been defined and validated */
  export interface HasKeys {
    readonly _tag: 'HasKeys'
  }

  /** Federation directives have been applied */
  export interface HasDirectives {
    readonly _tag: 'HasDirectives'
  }

  /** Builder is complete and ready for validation */
  export interface Complete {
    readonly _tag: 'Complete'
  }
}

/**
 * Entity validation result discriminated union
 */
export type EntityValidationResult<A, I, R> = Data.TaggedEnum<{
  readonly Valid: {
    readonly entity: ValidatedEntity<A, I, R>
    readonly metadata: EntityMetadata
  }
  readonly InvalidSchema: {
    readonly errors: readonly SchemaValidationError[]
    readonly partialEntity?: Partial<ValidatedEntity<A, I, R>>
  }
  readonly InvalidKeys: {
    readonly errors: readonly KeyValidationError[]
    readonly schema: Schema.Schema<A, I, R>
  }
  readonly InvalidDirectives: {
    readonly errors: readonly DirectiveValidationError[]
    readonly schema: Schema.Schema<A, I, R>
    readonly keys: readonly EntityKey[]
  }
  readonly CircularDependency: {
    readonly cycle: readonly string[]
    readonly involvedEntities: readonly string[]
  }
  readonly IncompatibleVersion: {
    readonly requiredVersion: string
    readonly currentVersion: string
    readonly entity: string
  }
}>

// Create a base result type for unknown generics to avoid using any
type BaseEntityValidationResult = EntityValidationResult<unknown, unknown, unknown>

// Create the tagged enum constructor with proper typing
export const EntityValidationResult = Data.taggedEnum<BaseEntityValidationResult>() as {
  readonly Valid: <A, I, R>(args: {
    readonly entity: ValidatedEntity<A, I, R>
    readonly metadata: EntityMetadata
  }) => EntityValidationResult<A, I, R>
  readonly InvalidSchema: <A, I, R>(args: {
    readonly errors: readonly SchemaValidationError[]
    readonly partialEntity?: Partial<ValidatedEntity<A, I, R>>
  }) => EntityValidationResult<A, I, R>
  readonly InvalidKeys: <A, I, R>(args: {
    readonly errors: readonly KeyValidationError[]
    readonly schema: Schema.Schema<A, I, R>
  }) => EntityValidationResult<A, I, R>
  readonly InvalidDirectives: <A, I, R>(args: {
    readonly errors: readonly DirectiveValidationError[]
    readonly schema: Schema.Schema<A, I, R>
    readonly keys: readonly EntityKey[]
  }) => EntityValidationResult<A, I, R>
  readonly CircularDependency: <A, I, R>(args: {
    readonly cycle: readonly string[]
    readonly involvedEntities: readonly string[]
  }) => EntityValidationResult<A, I, R>
  readonly IncompatibleVersion: <A, I, R>(args: {
    readonly requiredVersion: string
    readonly currentVersion: string
    readonly entity: string
  }) => EntityValidationResult<A, I, R>
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Schema validation error for ultra-strict entity builder
 * @category Experimental
 */
export class SchemaValidationError extends Data.TaggedError('SchemaValidationError')<{
  readonly message: string
  readonly schemaPath: readonly string[]
  readonly suggestion?: string
}> {}

/**
 * Key validation error for ultra-strict entity builder
 * @category Experimental
 */
export class KeyValidationError extends Data.TaggedError('KeyValidationError')<{
  readonly message: string
  readonly keyField: string
  readonly entityType: string
  readonly suggestion?: string
}> {}

/**
 * Directive validation error for ultra-strict entity builder
 * @category Experimental
 */
export class DirectiveValidationError extends Data.TaggedError('DirectiveValidationError')<{
  readonly message: string
  readonly directive: string
  readonly field?: string
  readonly suggestion?: string
}> {}

/**
 * Entity builder error for ultra-strict entity builder
 * @category Experimental
 */
export class EntityBuilderError extends Data.TaggedError('EntityBuilderError')<{
  readonly message: string
  readonly builderState: string
  readonly suggestion?: string
}> {}

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Entity key definition for ultra-strict entity builder
 * @category Experimental
 */
export interface EntityKey {
  readonly field: string
  readonly type: GraphQLOutputType
  readonly isComposite: boolean
}

/**
 * Entity directive definition for ultra-strict entity builder
 * @category Experimental
 */
export interface EntityDirective {
  readonly name: string
  readonly args: Record<string, unknown>
  readonly applicableFields?: readonly string[] | undefined
}

/**
 * Entity metadata for ultra-strict entity builder
 * @category Experimental
 */
export interface EntityMetadata {
  readonly typename: string
  readonly version: string
  readonly createdAt: Date
  readonly validationLevel: 'strict' | 'ultra-strict'
  readonly dependencies: readonly string[]
}

/**
 * Validated entity for ultra-strict entity builder
 * @category Experimental
 */
export interface ValidatedEntity<A, I, R> {
  readonly typename: string
  readonly schema: Schema.Schema<A, I, R>
  readonly keys: readonly EntityKey[]
  readonly directives: readonly EntityDirective[]
  readonly resolvers: Record<string, GraphQLFieldResolver<A, I, R>>
  readonly metadata: EntityMetadata
}

// ============================================================================
// Ultra-Strict Entity Builder with Phantom Types
// ============================================================================

export interface UltraStrictEntityBuilder<
  TState extends
    | PhantomStates.Unvalidated
    | PhantomStates.HasSchema
    | PhantomStates.HasKeys
    | PhantomStates.HasDirectives
    | PhantomStates.Complete,
  A = unknown,
  I = A,
  R = never,
> {
  readonly _phantomState: TState
  readonly typename: string
  readonly schema: Schema.Schema<A, I, R>
  readonly keys?: readonly EntityKey[]
  readonly directives?: readonly EntityDirective[]
  readonly resolvers?: Record<string, GraphQLFieldResolver<A, I, R>>
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
export const createUltraStrictEntityBuilder = <A = unknown, I = A, R = never>(
  typename: string,
  schema: Schema.Schema<A, I, R>
): UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R> => {
  if (!typename?.trim()) {
    throw new Error('Entity typename cannot be empty')
  }

  return {
    _phantomState: Data.struct({ _tag: 'HasSchema' as const }),
    typename,
    schema,
  }
}

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
export const withSchema =
  <A = unknown, I = A, R = never>(schema?: Schema.Schema<A, I, R>) =>
  (
    builder: UltraStrictEntityBuilder<PhantomStates.Unvalidated, A, I, R>
  ): UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R> => {
    if (!schema) {
      throw new Error('Schema cannot be null or undefined')
    }

    return {
      ...builder,
      _phantomState: Data.struct({ _tag: 'HasSchema' as const }),
      schema,
    }
  }

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
export const withKeys =
  <A = unknown, I = A, R = never>(keys?: readonly EntityKey[]) =>
  (
    builder: UltraStrictEntityBuilder<PhantomStates.HasSchema, A, I, R>
  ): UltraStrictEntityBuilder<PhantomStates.HasKeys, A, I, R> => {
    // Allow empty keys to be set, validation will catch this later
    const actualKeys = keys ?? []

    // Validate key field names (only if keys exist)
    if (actualKeys.length > 0) {
      const duplicateKeys = actualKeys
        .map(k => k.field)
        .filter((field, index, arr) => arr.indexOf(field) !== index)

      if (duplicateKeys.length > 0) {
        throw new Error(`Duplicate key fields found: ${duplicateKeys.join(', ')}`)
      }
    }

    return {
      ...builder,
      _phantomState: Data.struct({ _tag: 'HasKeys' as const }),
      keys: actualKeys,
    }
  }

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
export const withDirectives =
  <A = unknown, I = A, R = never>(directives?: readonly EntityDirective[]) =>
  (
    builder: UltraStrictEntityBuilder<PhantomStates.HasKeys, A, I, R>
  ): UltraStrictEntityBuilder<PhantomStates.HasDirectives, A, I, R> => {
    // Validate directive conflicts at compile time
    const directiveNames = directives?.map(d => d.name) ?? []
    const conflictingPairs = [
      ['shareable', 'override'],
      ['inaccessible', 'shareable'],
      ['external', 'override'],
    ] as const

    const hasConflict = conflictingPairs.some(
      ([dir1, dir2]) => directiveNames.includes(dir1) && directiveNames.includes(dir2)
    )

    if (hasConflict) {
      const conflict = conflictingPairs.find(
        ([dir1, dir2]) => directiveNames.includes(dir1) && directiveNames.includes(dir2)
      )
      throw new Error(
        `Conflicting directives: @${conflict![0]} and @${conflict![1]} cannot be used together`
      )
    }

    return {
      ...builder,
      _phantomState: Data.struct({ _tag: 'HasDirectives' as const }),
      directives: directives ?? [],
    }
  }

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
export const withResolvers =
  <A, I = A, R = never>(resolvers?: Record<string, GraphQLFieldResolver<A, I, R>>) =>
  (
    builder: UltraStrictEntityBuilder<PhantomStates.HasDirectives, A, I, R>
  ): UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R> => {
    if (!resolvers) {
      throw new Error('Resolvers cannot be null or undefined')
    }

    // Validate resolver functions
    const invalidResolvers = Object.entries(resolvers)
      .filter(([, resolver]) => typeof resolver !== 'function')
      .map(([fieldName]) => fieldName)

    if (invalidResolvers.length > 0) {
      throw new Error(`Resolvers for fields '${invalidResolvers.join(', ')}' must be functions`)
    }

    return {
      ...builder,
      _phantomState: Data.struct({ _tag: 'Complete' as const }),
      resolvers,
    }
  }

// ============================================================================
// Pattern Matching Validation Engine
// ============================================================================

/**
 * Validates a complete entity builder using exhaustive pattern matching
 */
export const validateEntityBuilder = <A, I, R>(
  builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>
): Effect.Effect<EntityValidationResult<A, I, R>, EntityBuilderError> =>
  pipe(
    Effect.succeed(builder),
    Effect.flatMap(validateSchema),
    Effect.flatMap(validateKeys),
    Effect.flatMap(validateDirectives),
    Effect.flatMap(validateCircularDependencies),
    Effect.flatMap(validateCompatibility),
    Effect.map(createValidResult),
    Effect.catchAll(handleValidationErrors)
  ) as Effect.Effect<EntityValidationResult<A, I, R>, EntityBuilderError>

const validateSchema = <A, I, R>(
  builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>
): Effect.Effect<
  UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>,
  readonly SchemaValidationError[]
> =>
  pipe(
    Effect.succeed(builder.schema),
    Effect.flatMap(schema => {
      // Just verify the schema exists and is well-formed
      // We don't try to decode actual data, just validate the schema structure
      if (schema === undefined) {
        return Effect.fail([
          new SchemaValidationError({
            message: `Schema is required`,
            schemaPath: ['schema'],
            suggestion: 'Ensure a valid schema is provided',
          }),
        ])
      }
      return Effect.succeed(builder)
    })
  )

const validateKeys = <A, I, R>(
  builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>
): Effect.Effect<
  UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>,
  readonly KeyValidationError[]
> =>
  pipe(
    Effect.succeed(builder.keys ?? []),
    Effect.flatMap(keys => {
      let errors: KeyValidationError[] = []

      if (keys.length === 0) {
        errors.push(
          new KeyValidationError({
            message: 'Entity must have at least one key field',
            keyField: '<missing>',
            entityType: builder.typename,
            suggestion: "Add a primary key field like 'id' or composite keys",
          })
        )
      }

      // Validate key fields exist in schema
      const schemaFields = builder.schema ? getSchemaFields(builder.schema) : []
      const missingKeyErrors = keys
        .filter(key => !schemaFields.includes(key.field))
        .map(
          key =>
            new KeyValidationError({
              message: `Key field '${key.field}' not found in schema`,
              keyField: key.field,
              entityType: builder.typename,
              suggestion: `Add field '${key.field}' to the schema or remove from keys`,
            })
        )

      errors = [...errors, ...missingKeyErrors]

      return errors.length > 0
        ? Effect.fail(errors as readonly KeyValidationError[])
        : Effect.succeed(builder)
    })
  )

const validateDirectives = <A, I, R>(
  builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>
): Effect.Effect<
  UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>,
  readonly DirectiveValidationError[]
> =>
  pipe(
    Effect.succeed(builder.directives!),
    Effect.flatMap(directives => {
      const validDirectives = [
        'shareable',
        'inaccessible',
        'tag',
        'override',
        'external',
        'provides',
        'requires',
      ]

      const directiveErrors = directives.flatMap(directive => {
        const errors: DirectiveValidationError[] = []

        if (!validDirectives.includes(directive.name)) {
          errors.push(
            new DirectiveValidationError({
              message: `Unknown Federation directive: @${directive.name}`,
              directive: directive.name,
              suggestion: `Use one of: ${validDirectives.map(d => `@${d}`).join(', ')}`,
            })
          )
        }

        // Validate directive-specific rules
        if (directive.name === 'override' && directive.args?.['from'] === undefined) {
          errors.push(
            new DirectiveValidationError({
              message: "@override directive requires 'from' argument",
              directive: directive.name,
              suggestion: 'Add \'from: "SubgraphName"\' to @override directive',
            })
          )
        }

        return errors
      })

      const allErrors = directiveErrors.flat()

      return allErrors.length > 0
        ? Effect.fail(allErrors as readonly DirectiveValidationError[])
        : Effect.succeed(builder)
    })
  )

const validateCircularDependencies = <A, I, R>(
  builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>
): Effect.Effect<UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>, never> =>
  Effect.succeed(builder) // Simplified for now - would implement cycle detection

const validateCompatibility = <A, I, R>(
  builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>
): Effect.Effect<UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>, never> =>
  Effect.succeed(builder) // Simplified for now - would validate Federation version compatibility

const createValidResult = <A, I, R>(
  builder: UltraStrictEntityBuilder<PhantomStates.Complete, A, I, R>
): EntityValidationResult<A, I, R> => {
  const result = EntityValidationResult.Valid({
    entity: {
      typename: builder.typename,
      schema: builder.schema!,
      keys: builder.keys!,
      directives: builder.directives!,
      resolvers: builder.resolvers!,
      metadata: {
        typename: builder.typename,
        version: '2.0.0',
        createdAt: new Date(),
        validationLevel: 'ultra-strict',
        dependencies: [],
      },
    },
    metadata: {
      typename: builder.typename,
      version: '2.0.0',
      createdAt: new Date(),
      validationLevel: 'ultra-strict',
      dependencies: [],
    },
  })
  return result as EntityValidationResult<A, I, R>
}

const handleValidationErrors = <A, I, R>(
  errors:
    | readonly SchemaValidationError[]
    | readonly KeyValidationError[]
    | readonly DirectiveValidationError[]
): Effect.Effect<EntityValidationResult<A, I, R>, never> =>
  pipe(
    Match.value(errors),
    Match.when(
      (
        errs: readonly (SchemaValidationError | KeyValidationError | DirectiveValidationError)[]
      ): errs is readonly SchemaValidationError[] =>
        errs.length > 0 && errs[0] instanceof SchemaValidationError,
      (errs: readonly SchemaValidationError[]) => {
        const result = EntityValidationResult.InvalidSchema({ errors: errs })
        return Effect.succeed(result as EntityValidationResult<A, I, R>)
      }
    ),
    Match.when(
      (
        errs: readonly (SchemaValidationError | KeyValidationError | DirectiveValidationError)[]
      ): errs is readonly KeyValidationError[] =>
        errs.length > 0 && errs[0] instanceof KeyValidationError,
      (errs: readonly KeyValidationError[]) => {
        const result = EntityValidationResult.InvalidKeys({
          errors: errs,
          schema: Schema.Struct({}) as unknown as Schema.Schema<A, I, R>,
        })
        return Effect.succeed(result as EntityValidationResult<A, I, R>)
      }
    ),
    Match.when(
      (
        errs: readonly (SchemaValidationError | KeyValidationError | DirectiveValidationError)[]
      ): errs is readonly DirectiveValidationError[] =>
        errs.length > 0 && errs[0] instanceof DirectiveValidationError,
      (errs: readonly DirectiveValidationError[]) => {
        const result = EntityValidationResult.InvalidDirectives({
          errors: errs,
          schema: Schema.Struct({}) as unknown as Schema.Schema<A, I, R>,
          keys: [],
        })
        return Effect.succeed(result as EntityValidationResult<A, I, R>)
      }
    ),
    Match.exhaustive
  )

// ============================================================================
// Pattern Matching Result Handler
// ============================================================================

/**
 * Exhaustive pattern matching over entity validation results
 */
export const matchEntityValidationResult =
  <A, I, R>(handlers: {
    readonly Valid: (data: {
      readonly entity: ValidatedEntity<A, I, R>
      readonly metadata: EntityMetadata
    }) => A
    readonly InvalidSchema: (data: {
      readonly errors: readonly SchemaValidationError[]
      readonly partialEntity?: Partial<ValidatedEntity<A, I, R>>
    }) => A
    readonly InvalidKeys: (data: {
      readonly errors: readonly KeyValidationError[]
      readonly schema: Schema.Schema<A, I, R>
    }) => A
    readonly InvalidDirectives: (data: {
      readonly errors: readonly DirectiveValidationError[]
      readonly schema: Schema.Schema<A, I, R>
      readonly keys: readonly EntityKey[]
    }) => A
    readonly CircularDependency: (data: {
      readonly cycle: readonly string[]
      readonly involvedEntities: readonly string[]
    }) => A
    readonly IncompatibleVersion: (data: {
      readonly requiredVersion: string
      readonly currentVersion: string
      readonly entity: string
    }) => A
  }) =>
  (result: EntityValidationResult<A, I, R>): A =>
    Match.value(result).pipe(
      Match.tag('Valid', handlers.Valid),
      Match.tag('InvalidSchema', handlers.InvalidSchema),
      Match.tag('InvalidKeys', handlers.InvalidKeys),
      Match.tag('InvalidDirectives', handlers.InvalidDirectives),
      Match.tag('CircularDependency', handlers.CircularDependency),
      Match.tag('IncompatibleVersion', handlers.IncompatibleVersion),
      Match.exhaustive
    ) as A

// ============================================================================
// Utility Functions
// ============================================================================

const getSchemaFields = <A, I, R>(schema: Schema.Schema<A, I, R>): readonly string[] => {
  const ast = schema.ast

  // Handle struct schemas which are the most common for entities
  if (ast._tag === 'TypeLiteral') {
    return ast.propertySignatures.map(prop => {
      if (typeof prop.name === 'string') {
        return prop.name
      }
      // Handle symbol keys by converting to string
      return String(prop.name)
    })
  }

  // For other schema types, we can't extract fields
  // This is fine as the validation will catch it
  return []
}

// ============================================================================
// Entity Key and Directive Utilities
// ============================================================================

/**
 * Creates an entity key for federation (internal implementation)
 */
const createEntityKey = (
  field: string,
  type: GraphQLOutputType,
  isComposite = false
): EntityKey => ({
  field,
  type,
  isComposite,
})

/**
 * UltraStrictEntityBuilder namespace with static utilities
 *
 * This provides the expected API surface that tests and examples use
 */
export namespace UltraStrictEntityBuilder {
  /**
   * Directive utilities namespace for creating federation directives
   */
  export namespace Directive {
    export const shareable = (): EntityDirective => ({
      name: 'shareable',
      args: {},
    })

    export const inaccessible = (): EntityDirective => ({
      name: 'inaccessible',
      args: {},
    })

    export const tag = (name: string): EntityDirective => ({
      name: 'tag',
      args: { name },
    })

    export const override = (from: string): EntityDirective => ({
      name: 'override',
      args: { from },
    })

    export const external = (): EntityDirective => ({
      name: 'external',
      args: {},
    })

    export const provides = (fields: string): EntityDirective => ({
      name: 'provides',
      args: { fields },
    })

    export const requires = (fields: string): EntityDirective => ({
      name: 'requires',
      args: { fields },
    })
  }

  /**
   * Key utilities namespace for creating entity keys
   */
  export namespace Key {
    export const create = createEntityKey
  }
}
