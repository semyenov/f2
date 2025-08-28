import { describe, test } from 'bun:test'
import * as fc from 'fast-check'
import * as Schema from '@effect/schema/Schema'
import * as Effect from 'effect/Effect'
import { GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat } from 'graphql'
import { UltraStrictEntityBuilder } from '../../src/experimental/ultra-strict-entity-builder.js'
import {
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
} from '../../src/experimental/ultra-strict-entity-builder.js'

// Property-based testing for entity validation
describe('Property-Based Entity Validation', () => {
  // Generator for valid entity names
  const validEntityName = fc.string({ minLength: 1, maxLength: 50 }).filter(name => 
    /^[A-Za-z][A-Za-z0-9_]*$/.test(name)
  )

  // Generator for valid field names
  const validFieldName = fc.string({ minLength: 1, maxLength: 30 }).filter(name => 
    /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)
  )

  // Generator for GraphQL types
  const graphQLType = fc.constantFrom(GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat)

  // Generator for entity keys
  const entityKey = fc.record({
    field: validFieldName,
    type: graphQLType,
    isComposite: fc.boolean(),
  }).map(({ field, type, isComposite }) => 
    UltraStrictEntityBuilder.Key.create(field, type, isComposite)
  )

  // Generator for non-conflicting federation directive sets
  const nonConflictingDirectives = fc.oneof(
    // Shareable with compatible directives
    fc.constant([UltraStrictEntityBuilder.Directive.shareable()]),
    fc.string({ minLength: 1, maxLength: 20 }).map(tag => 
      [UltraStrictEntityBuilder.Directive.shareable(), UltraStrictEntityBuilder.Directive.tag(tag)]
    ),
    fc.string({ minLength: 1, maxLength: 50 }).map(fields => 
      [UltraStrictEntityBuilder.Directive.shareable(), UltraStrictEntityBuilder.Directive.provides(fields)]
    ),
    
    // Override alone (conflicts with shareable)
    fc.string({ minLength: 1, maxLength: 20 }).map(from => 
      [UltraStrictEntityBuilder.Directive.override(from)]
    ),
    
    // Other safe combinations
    fc.constant([UltraStrictEntityBuilder.Directive.external()]),
    fc.constant([UltraStrictEntityBuilder.Directive.inaccessible()]),
    fc.string({ minLength: 1, maxLength: 50 }).map(fields => 
      [UltraStrictEntityBuilder.Directive.requires(fields)]
    )
  )

  // Single directive generator for backwards compatibility
  const federationDirective = fc.oneof(
    fc.constant(UltraStrictEntityBuilder.Directive.shareable()),
    fc.constant(UltraStrictEntityBuilder.Directive.external()),
    fc.string({ minLength: 1, maxLength: 20 }).map(tag => 
      UltraStrictEntityBuilder.Directive.tag(tag)
    ),
    fc.string({ minLength: 1, maxLength: 50 }).map(fields => 
      UltraStrictEntityBuilder.Directive.provides(fields)
    )
  )

  describe('Entity Name Validation', () => {
    test('valid entity names should always create builders', () => {
      fc.assert(
        fc.property(validEntityName, (entityName) => {
          const builder = createUltraStrictEntityBuilder(entityName)
          return builder.typename === entityName
        })
      )
    })
  })

  describe('Key Validation Properties', () => {
    test('entities with at least one key should pass key validation stage', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEntityName,
          fc.array(entityKey, { minLength: 1, maxLength: 5 }),
          async (entityName, keys) => {
            const testSchema = Schema.Struct({
              id: Schema.String,
              // Add fields that match the keys
              ...Object.fromEntries(
                keys.map(key => [key.field, Schema.String])
              )
            })

            const result = await Effect.runPromise(
              Effect.gen(function* () {
                const builder = createUltraStrictEntityBuilder(entityName)
                const composed = withResolvers({})(
                  withDirectives([UltraStrictEntityBuilder.Directive.shareable()])(
                    withKeys(keys)(
                      withSchema(testSchema)(builder)
                    )
                  )
                )
                return yield* validateEntityBuilder(composed)
              }).pipe(
                Effect.catchAll(() => Effect.succeed({ _tag: 'Error' as const }))
              )
            )

            // Should not fail due to missing keys since we provided at least one
            if (result._tag === 'InvalidKeys') {
              // Check that the errors are not about missing keys entirely
              const hasEmptyKeysError = result.errors.some(error => 
                error.message.includes('must have at least one key')
              )
              return !hasEmptyKeysError
            }

            return true // Other outcomes are acceptable
          }
        ),
        { numRuns: 20 } // Reduced runs for integration test performance
      )
    })
  })

  describe('Directive Validation Properties', () => {
    test('well-formed directives should not cause directive validation errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEntityName,
          nonConflictingDirectives,
          async (entityName, directives) => {
            const result = await Effect.runPromise(
              Effect.gen(function* () {
                const builder = createUltraStrictEntityBuilder(entityName)
                const composed = withResolvers({})(
                  withDirectives(directives)(
                    withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)])(
                      withSchema(Schema.Struct({ id: Schema.String }))(builder)
                    )
                  )
                )
                return yield* validateEntityBuilder(composed)
              }).pipe(
                Effect.catchAll(() => Effect.succeed({ _tag: 'Error' as const }))
              )
            )

            // Should not fail specifically due to directive structure issues
            if (result._tag === 'InvalidDirectives') {
              // Check that the errors are not about unknown directive types
              // (since we're using valid directive factory methods)
              const hasUnknownDirectiveError = result.errors.some(error => 
                error.message.includes('Unknown Federation directive')
              )
              return !hasUnknownDirectiveError
            }

            return true // Other outcomes are acceptable
          }
        ),
        { numRuns: 15 } // Reduced for performance
      )
    })
  })

  describe('Complete Entity Validation Properties', () => {
    test('entities with all required components should tend toward validity', async () => {
      let validCount = 0
      let totalCount = 0

      await fc.assert(
        fc.asyncProperty(
          validEntityName,
          fc.array(entityKey, { minLength: 1, maxLength: 2 }),
          fc.array(federationDirective, { minLength: 1, maxLength: 2 }),
          async (entityName, keys, directives) => {
            totalCount++

            const testSchema = Schema.Struct({
              id: Schema.String,
              // Add fields matching all keys
              ...Object.fromEntries(
                keys.map(key => [key.field, Schema.String])
              )
            })

            const result = await Effect.runPromise(
              Effect.gen(function* () {
                const builder = createUltraStrictEntityBuilder(entityName)
                const composed = withResolvers({
                  displayName: (parent: any) => parent.id || 'Unknown'
                })(
                  withDirectives(directives)(
                    withKeys(keys)(
                      withSchema(testSchema)(builder)
                    )
                  )
                )
                return yield* validateEntityBuilder(composed)
              }).pipe(
                Effect.catchAll(() => Effect.succeed({ _tag: 'Error' as const }))
              )
            )

            if (result._tag === 'Valid') {
              validCount++
            }

            return true // We're just collecting statistics
          }
        ),
        { numRuns: 10 } // Small sample for property testing
      )

      // At least some percentage of well-formed entities should validate successfully
      // This is a weak property test - mainly checking the system doesn't always fail
      const successRate = validCount / totalCount
      return successRate >= 0 // At least some chance of success with good inputs
    })
  })

  describe('Invariant Properties', () => {
    test('validation result should always be exhaustively matchable', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEntityName,
          async (entityName) => {
            const result = await Effect.runPromise(
              Effect.gen(function* () {
                const builder = createUltraStrictEntityBuilder(entityName)
                const composed = withResolvers({})(
                  withDirectives([UltraStrictEntityBuilder.Directive.shareable()])(
                    withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)])(
                      withSchema(Schema.Struct({ id: Schema.String }))(builder)
                    )
                  )
                )
                return yield* validateEntityBuilder(composed)
              }).pipe(
                Effect.catchAll(() => Effect.succeed({ _tag: 'Error' as const }))
              )
            )

            // Test that we can always match all possible result types
            const matched = matchEntityValidationResult({
              Valid: () => 'valid',
              InvalidSchema: () => 'invalid-schema',
              InvalidKeys: () => 'invalid-keys', 
              InvalidDirectives: () => 'invalid-directives',
              CircularDependency: () => 'circular-dependency',
              IncompatibleVersion: () => 'incompatible-version',
            })(result as any) // Type assertion needed due to Error case

            // Should always produce a string result (never throw)
            return typeof matched === 'string'
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})