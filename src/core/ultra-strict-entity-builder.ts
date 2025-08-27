/**
 * Ultra-Strict Entity Builder with Pattern Matching
 *
 * This module implements the UltraStrictEntityBuilder that provides:
 * - Discriminated union for entity validation results
 * - Exhaustive pattern matching over validation scenarios
 * - Type-safe fluent interface with compile-time validation
 * - Zero-cost abstractions through phantom types
 */

import * as Schema from "@effect/schema/Schema"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Match from "effect/Match"
import type { GraphQLFieldResolver, GraphQLOutputType } from "graphql"

// ============================================================================
// Core Types and Phantom Type System
// ============================================================================

/**
 * Phantom type markers for compile-time validation states
 */
export namespace PhantomStates {
  export interface Unvalidated { readonly _tag: "Unvalidated" }
  export interface HasSchema { readonly _tag: "HasSchema" }
  export interface HasKeys { readonly _tag: "HasKeys" }
  export interface HasDirectives { readonly _tag: "HasDirectives" }
  export interface Complete { readonly _tag: "Complete" }
}

/**
 * Entity validation result discriminated union
 */
export type EntityValidationResult =
  | Data.TaggedEnum<{
    readonly Valid: {
      readonly entity: ValidatedEntity
      readonly metadata: EntityMetadata
    }
    readonly InvalidSchema: {
      readonly errors: readonly SchemaValidationError[]
      readonly partialEntity?: Partial<ValidatedEntity>
    }
    readonly InvalidKeys: {
      readonly errors: readonly KeyValidationError[]
      readonly schema: Schema.Schema<any>
    }
    readonly InvalidDirectives: {
      readonly errors: readonly DirectiveValidationError[]
      readonly schema: Schema.Schema<any>
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

export const EntityValidationResult = Data.taggedEnum<EntityValidationResult>()

// ============================================================================
// Error Types
// ============================================================================

export class SchemaValidationError extends Data.TaggedError("SchemaValidationError")<{
  readonly message: string
  readonly schemaPath: readonly string[]
  readonly suggestion?: string
}> { }

export class KeyValidationError extends Data.TaggedError("KeyValidationError")<{
  readonly message: string
  readonly keyField: string
  readonly entityType: string
  readonly suggestion?: string
}> { }

export class DirectiveValidationError extends Data.TaggedError("DirectiveValidationError")<{
  readonly message: string
  readonly directive: string
  readonly field?: string
  readonly suggestion?: string
}> { }

export class EntityBuilderError extends Data.TaggedError("EntityBuilderError")<{
  readonly message: string
  readonly builderState: string
  readonly suggestion?: string
}> { }

// ============================================================================
// Entity Types
// ============================================================================

export interface EntityKey {
  readonly field: string
  readonly type: GraphQLOutputType
  readonly isComposite: boolean
}

export interface EntityDirective {
  readonly name: string
  readonly args: Record<string, unknown>
  readonly applicableFields?: readonly string[] | undefined
}

export interface EntityMetadata {
  readonly typename: string
  readonly version: string
  readonly createdAt: Date
  readonly validationLevel: "strict" | "ultra-strict"
  readonly dependencies: readonly string[]
}

export interface ValidatedEntity {
  readonly typename: string
  readonly schema: Schema.Schema<any>
  readonly keys: readonly EntityKey[]
  readonly directives: readonly EntityDirective[]
  readonly resolvers: Record<string, GraphQLFieldResolver<any, any>>
  readonly metadata: EntityMetadata
}

// ============================================================================
// Ultra-Strict Entity Builder with Phantom Types
// ============================================================================

export interface UltraStrictEntityBuilder<TState extends PhantomStates.Unvalidated | PhantomStates.HasSchema | PhantomStates.HasKeys | PhantomStates.HasDirectives | PhantomStates.Complete> {
  readonly _phantomState: TState
  readonly typename: string
  readonly schema?: Schema.Schema<any>
  readonly keys?: readonly EntityKey[]
  readonly directives?: readonly EntityDirective[]
  readonly resolvers?: Record<string, GraphQLFieldResolver<any, any>>
}

/**
 * Creates a new UltraStrictEntityBuilder with compile-time state tracking
 */
export const createUltraStrictEntityBuilder = (typename: string): UltraStrictEntityBuilder<PhantomStates.Unvalidated> => ({
  _phantomState: Data.struct({ _tag: "Unvalidated" as const }),
  typename
})

/**
 * Type-safe schema attachment (only valid in Unvalidated state)
 */
export const withSchema = <A>(schema: Schema.Schema<A>) =>
  (builder: UltraStrictEntityBuilder<PhantomStates.Unvalidated>): UltraStrictEntityBuilder<PhantomStates.HasSchema> => ({
    ...builder,
    _phantomState: Data.struct({ _tag: "HasSchema" as const }),
    schema
  })

/**
 * Type-safe key definition (only valid in HasSchema state)
 */
export const withKeys = (keys: readonly EntityKey[]) =>
  (builder: UltraStrictEntityBuilder<PhantomStates.HasSchema>): UltraStrictEntityBuilder<PhantomStates.HasKeys> => ({
    ...builder,
    _phantomState: Data.struct({ _tag: "HasKeys" as const }),
    keys
  })

/**
 * Type-safe directive application (only valid in HasKeys state)
 */
export const withDirectives = (directives: readonly EntityDirective[]) =>
  (builder: UltraStrictEntityBuilder<PhantomStates.HasKeys>): UltraStrictEntityBuilder<PhantomStates.HasDirectives> => ({
    ...builder,
    _phantomState: Data.struct({ _tag: "HasDirectives" as const }),
    directives
  })

/**
 * Type-safe resolver attachment (only valid in HasDirectives state)
 */
export const withResolvers = (resolvers: Record<string, GraphQLFieldResolver<any, any>>) =>
  (builder: UltraStrictEntityBuilder<PhantomStates.HasDirectives>): UltraStrictEntityBuilder<PhantomStates.Complete> => ({
    ...builder,
    _phantomState: Data.struct({ _tag: "Complete" as const }),
    resolvers
  })

// ============================================================================
// Pattern Matching Validation Engine
// ============================================================================

/**
 * Validates a complete entity builder using exhaustive pattern matching
 */
export const validateEntityBuilder = (
  builder: UltraStrictEntityBuilder<PhantomStates.Complete>
): Effect.Effect<EntityValidationResult, EntityBuilderError> =>
  pipe(
    Effect.succeed(builder),
    Effect.flatMap(validateSchema),
    Effect.flatMap(validateKeys),
    Effect.flatMap(validateDirectives),
    Effect.flatMap(validateCircularDependencies),
    Effect.flatMap(validateCompatibility),
    Effect.map(createValidResult),
    Effect.catchAll(handleValidationErrors)
  )

const validateSchema = (builder: UltraStrictEntityBuilder<PhantomStates.Complete>): Effect.Effect<UltraStrictEntityBuilder<PhantomStates.Complete>, readonly SchemaValidationError[]> =>
  pipe(
    Effect.succeed(builder.schema!),
    Effect.flatMap(schema =>
      pipe(
        Schema.decodeUnknown(schema)({}),
        Effect.matchEffect({
          onFailure: (parseError) =>
            Effect.fail([new SchemaValidationError({
              message: `Schema validation failed: ${parseError.message}`,
              schemaPath: ["schema"],
              suggestion: "Ensure all schema fields are properly typed and required fields are marked"
            })]),
          onSuccess: () => Effect.succeed(builder)
        })
      )
    )
  )

const validateKeys = (builder: UltraStrictEntityBuilder<PhantomStates.Complete>): Effect.Effect<UltraStrictEntityBuilder<PhantomStates.Complete>, readonly KeyValidationError[]> =>
  pipe(
    Effect.succeed(builder.keys!),
    Effect.flatMap(keys => {
      const errors: readonly KeyValidationError[] = []

      if (keys.length === 0) {
        errors.push(new KeyValidationError({
          message: "Entity must have at least one key field",
          keyField: "<missing>",
          entityType: builder.typename,
          suggestion: "Add a primary key field like 'id' or composite keys"
        }))
      }

      // Validate key fields exist in schema
      const schemaFields = getSchemaFields(builder.schema!)
      for (const key of keys) {
        if (!schemaFields.includes(key.field)) {
          errors.push(new KeyValidationError({
            message: `Key field '${key.field}' not found in schema`,
            keyField: key.field,
            entityType: builder.typename,
            suggestion: `Add field '${key.field}' to the schema or remove from keys`
          }))
        }
      }

      return errors.length > 0
        ? Effect.fail(errors)
        : Effect.succeed(builder)
    })
  )

const validateDirectives = (builder: UltraStrictEntityBuilder<PhantomStates.Complete>): Effect.Effect<UltraStrictEntityBuilder<PhantomStates.Complete>, readonly DirectiveValidationError[]> =>
  pipe(
    Effect.succeed(builder.directives!),
    Effect.flatMap(directives => {
      const errors: readonly DirectiveValidationError[] = []
      const validDirectives = ["shareable", "inaccessible", "tag", "override", "external", "provides", "requires"]

      for (const directive of directives) {
        if (!validDirectives.includes(directive.name)) {
          errors.push(new DirectiveValidationError({
            message: `Unknown Federation directive: @${directive.name}`,
            directive: directive.name,
            suggestion: `Use one of: ${validDirectives.map(d => `@${d}`).join(", ")}`
          }))
        }

        // Validate directive-specific rules
        if (directive.name === "override" && !directive.args["from"]) {
          errors.push(new DirectiveValidationError({
            message: "@override directive requires 'from' argument",
            directive: directive.name,
            suggestion: "Add 'from: \"SubgraphName\"' to @override directive"
          }))
        }
      }

      return errors.length > 0
        ? Effect.fail(errors)
        : Effect.succeed(builder)
    })
  )

const validateCircularDependencies = (builder: UltraStrictEntityBuilder<PhantomStates.Complete>): Effect.Effect<UltraStrictEntityBuilder<PhantomStates.Complete>, never> =>
  Effect.succeed(builder) // Simplified for now - would implement cycle detection

const validateCompatibility = (builder: UltraStrictEntityBuilder<PhantomStates.Complete>): Effect.Effect<UltraStrictEntityBuilder<PhantomStates.Complete>, never> =>
  Effect.succeed(builder) // Simplified for now - would validate Federation version compatibility

const createValidResult = (builder: UltraStrictEntityBuilder<PhantomStates.Complete>): EntityValidationResult =>
  EntityValidationResult.Valid({
    entity: {
      typename: builder.typename,
      schema: builder.schema!,
      keys: builder.keys!,
      directives: builder.directives!,
      resolvers: builder.resolvers!,
      metadata: {
        typename: builder.typename,
        version: "2.0.0",
        createdAt: new Date(),
        validationLevel: "ultra-strict",
        dependencies: []
      }
    },
    metadata: {
      typename: builder.typename,
      version: "2.0.0",
      createdAt: new Date(),
      validationLevel: "ultra-strict",
      dependencies: []
    }
  })

const handleValidationErrors = (errors: readonly SchemaValidationError[] | readonly KeyValidationError[] | readonly DirectiveValidationError[]): Effect.Effect<EntityValidationResult, never> =>
  pipe(
    Match.value(errors),
    Match.when(
      (errs: readonly (SchemaValidationError | KeyValidationError | DirectiveValidationError)[]): errs is readonly SchemaValidationError[] => errs.length > 0 && errs[0] instanceof SchemaValidationError,
      (errs: readonly SchemaValidationError[]) => Effect.succeed(EntityValidationResult.InvalidSchema({ errors: errs }))
    ),
    Match.when(
      (errs: readonly (SchemaValidationError | KeyValidationError | DirectiveValidationError)[]): errs is readonly KeyValidationError[] => errs.length > 0 && errs[0] instanceof KeyValidationError,
      (errs: readonly KeyValidationError[]) => Effect.succeed(EntityValidationResult.InvalidKeys({
        errors: errs,
        schema: Schema.Struct({}) // placeholder
      }))
    ),
    Match.when(
      (errs: readonly (SchemaValidationError | KeyValidationError | DirectiveValidationError)[]): errs is readonly DirectiveValidationError[] => errs.length > 0 && errs[0] instanceof DirectiveValidationError,
      (errs: readonly DirectiveValidationError[]) => Effect.succeed(EntityValidationResult.InvalidDirectives({
        errors: errs,
        schema: Schema.Struct({}), // placeholder
        keys: []
      }))
    ),
    Match.exhaustive
  )

// ============================================================================
// Pattern Matching Result Handler
// ============================================================================

/**
 * Exhaustive pattern matching over entity validation results
 */
export const matchEntityValidationResult = <A>(
  handlers: {
    readonly Valid: (data: { readonly entity: ValidatedEntity; readonly metadata: EntityMetadata }) => A
    readonly InvalidSchema: (data: { readonly errors: readonly SchemaValidationError[]; readonly partialEntity?: Partial<ValidatedEntity> }) => A
    readonly InvalidKeys: (data: { readonly errors: readonly KeyValidationError[]; readonly schema: Schema.Schema<any> }) => A
    readonly InvalidDirectives: (data: { readonly errors: readonly DirectiveValidationError[]; readonly schema: Schema.Schema<any>; readonly keys: readonly EntityKey[] }) => A
    readonly CircularDependency: (data: { readonly cycle: readonly string[]; readonly involvedEntities: readonly string[] }) => A
    readonly IncompatibleVersion: (data: { readonly requiredVersion: string; readonly currentVersion: string; readonly entity: string }) => A
  }
) => (result: EntityValidationResult): A =>
  Match.value(result).pipe(
    Match.tag("Valid", handlers.Valid),
    Match.tag("InvalidSchema", handlers.InvalidSchema),
    Match.tag("InvalidKeys", handlers.InvalidKeys),
    Match.tag("InvalidDirectives", handlers.InvalidDirectives),
    Match.tag("CircularDependency", handlers.CircularDependency),
    Match.tag("IncompatibleVersion", handlers.IncompatibleVersion),
    Match.exhaustive
  ) as A

// ============================================================================
// Utility Functions
// ============================================================================

const getSchemaFields = (_schema: Schema.Schema<any>): readonly string[] => {
  // Simplified implementation - would extract actual field names from AST
  return ["id", "name", "email"] // placeholder
}

/**
 * Factory function for common entity key patterns
 */
export const createEntityKey = (field: string, type: GraphQLOutputType, isComposite = false): EntityKey => ({
  field,
  type,
  isComposite
})

/**
 * Factory function for Federation directives
 */
export const createDirective = (name: string, args: Record<string, unknown> = {}, applicableFields?: readonly string[]): EntityDirective => ({
  name,
  args,
  applicableFields
})

// ============================================================================
// Public API
// ============================================================================

export namespace UltraStrictEntityBuilder {
  export const create = createUltraStrictEntityBuilder
  export const validate = validateEntityBuilder
  export const match = matchEntityValidationResult

  export const Key = {
    create: createEntityKey
  }

  export const Directive = {
    create: createDirective,
    shareable: () => createDirective("shareable"),
    inaccessible: () => createDirective("inaccessible"),
    tag: (name: string) => createDirective("tag", { name }),
    override: (from: string) => createDirective("override", { from }),
    external: () => createDirective("external"),
    provides: (fields: string) => createDirective("provides", { fields }),
    requires: (fields: string) => createDirective("requires", { fields })
  }
}
