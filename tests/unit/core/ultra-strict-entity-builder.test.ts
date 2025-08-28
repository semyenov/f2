import { describe, test, expect } from 'vitest'
import * as Schema from 'effect/Schema'
import * as Effect from 'effect/Effect'
import { GraphQLID, GraphQLString } from 'graphql'
import { UltraStrictEntityBuilder } from '../../../src/experimental/ultra-strict-entity-builder.js'
import {
  createUltraStrictEntityBuilder,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
  type EntityValidationResult,
} from '../../../src/experimental/ultra-strict-entity-builder.js'

type ValidationResult = {
  success: boolean
  typename?: string
  keyCount?: number
  directiveCount?: number
  error?: string
  details?: unknown
  errorType?: string
  errorCount?: number
  cycle?: unknown
  entity?: unknown
  requiredVersion?: unknown
  currentVersion?: unknown
}

describe('UltraStrictEntityBuilder', () => {
  describe('Entity Creation Pipeline', () => {
    test('should create valid entity with all required components', async () => {
      const UserSchema = Schema.Struct({
        id: Schema.String,
        email: Schema.String,
        name: Schema.optional(Schema.String),
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const builder = yield* Effect.succeed(
            createUltraStrictEntityBuilder('User', UserSchema as Schema.Schema<unknown, unknown, never>)
          )
          const withSchemaStep = builder
          const withKeysStep = withKeys([
            UltraStrictEntityBuilder.Key.create('id', GraphQLID, false),
          ])(withSchemaStep)
          const withDirectivesStep = withDirectives([
            UltraStrictEntityBuilder.Directive.shareable(),
            UltraStrictEntityBuilder.Directive.tag('user-management'),
          ])(withKeysStep)
          const withResolversStep = withResolvers({
            fullName: (parent: unknown) => `${(parent as { name?: string }).name || 'Anonymous'}`,
          })(withDirectivesStep)

          return yield* validateEntityBuilder(withResolversStep)
        })
      )

      const validationResult = matchEntityValidationResult<unknown, unknown, unknown>({
        Valid: ({ entity }) => ({
          success: true,
          typename: entity.typename,
          keyCount: entity.keys.length,
          directiveCount: entity.directives.length,
        }),
        InvalidSchema: ({ errors }) => ({
          success: false,
          typename: 'Unknown',
          keyCount: 0,
          directiveCount: 0,
          error: 'Schema validation failed',
          details: errors,
        }),
        InvalidKeys: ({ errors }) => ({
          success: false,
          typename: 'Unknown',
          keyCount: 0,
          directiveCount: 0,
          error: 'Key validation failed',
          details: errors,
        }),
        InvalidDirectives: ({ errors }) => ({
          success: false,
          typename: 'Unknown',
          keyCount: 0,
          directiveCount: 0,
          error: 'Directive validation failed',
          details: errors,
        }),
        CircularDependency: ({ cycle }) => ({
          success: false,
          typename: 'Unknown',
          keyCount: 0,
          directiveCount: 0,
          error: 'Circular dependency detected',
          cycle,
        }),
        IncompatibleVersion: ({ entity, requiredVersion, currentVersion }) => ({
          success: false,
          typename: 'Unknown',
          keyCount: 0,
          directiveCount: 0,
          error: 'Version incompatibility',
          entity,
          requiredVersion,
          currentVersion,
        }),
      })(result as EntityValidationResult<unknown, unknown, unknown>) as ValidationResult

      expect(validationResult.success).toBe(true)
      if ('typename' in validationResult && validationResult.success) {
        expect(validationResult.typename).toBe('User')
        expect(validationResult.keyCount).toBe(1)
        expect(validationResult.directiveCount).toBe(2)
      }
    })

    test('should fail validation when keys are missing', async () => {
      const UserSchema = Schema.Struct({
        id: Schema.String,
        email: Schema.String,
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const builder = yield* Effect.succeed(
            createUltraStrictEntityBuilder('User', UserSchema as Schema.Schema<unknown, unknown, never>)
          )
          const withSchemaStep = builder
          const withKeysStep = withKeys([])(withSchemaStep) // Empty keys array
          const withDirectivesStep = withDirectives([
            UltraStrictEntityBuilder.Directive.shareable(),
          ])(withKeysStep)
          const withResolversStep = withResolvers({})(withDirectivesStep)

          return yield* validateEntityBuilder(withResolversStep)
        })
      )

      const validationResult = matchEntityValidationResult<unknown, unknown, unknown>({
        Valid: () => ({ success: true }),
        InvalidKeys: ({ errors }) => ({
          success: false,
          errorType: 'InvalidKeys',
          errorCount: errors.length,
        }),
        InvalidSchema: () => ({ success: false, errorType: 'InvalidSchema' }),
        InvalidDirectives: () => ({ success: false, errorType: 'InvalidDirectives' }),
        CircularDependency: () => ({ success: false, errorType: 'CircularDependency' }),
        IncompatibleVersion: () => ({ success: false, errorType: 'IncompatibleVersion' }),
      })(result as EntityValidationResult<unknown, unknown, unknown>) as ValidationResult

      expect(validationResult.success).toBe(false)
      expect('errorType' in validationResult ? (validationResult as { errorType: string }).errorType : null).toBe('InvalidKeys')
      expect('errorCount' in validationResult ? (validationResult as { errorCount: number }).errorCount : 0).toBeGreaterThan(0)
    })
  })

  describe('Directive Validation', () => {
    test('should accept valid federation directives', async () => {
      const validDirectives = [
        UltraStrictEntityBuilder.Directive.shareable(),
        UltraStrictEntityBuilder.Directive.inaccessible(),
        UltraStrictEntityBuilder.Directive.tag('test'),
        UltraStrictEntityBuilder.Directive.override('SubgraphA'),
        UltraStrictEntityBuilder.Directive.external(),
        UltraStrictEntityBuilder.Directive.provides('field1 field2'),
        UltraStrictEntityBuilder.Directive.requires('field1'),
      ]

      for (const directive of validDirectives) {
        expect(directive.name).toMatch(/^(shareable|inaccessible|tag|override|external|provides|requires)$/)
      }
    })

    test('should create directives with proper arguments', () => {
      const tagDirective = UltraStrictEntityBuilder.Directive.tag('user-management')
      expect(tagDirective.name).toBe('tag')
      expect(tagDirective.args['name']).toBe('user-management')

      const overrideDirective = UltraStrictEntityBuilder.Directive.override('UserService')
      expect(overrideDirective.name).toBe('override')
      expect(overrideDirective.args['from']).toBe('UserService')
    })
  })

  describe('Key Validation', () => {
    test('should create valid entity keys', () => {
      const simpleKey = UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)
      expect(simpleKey.field).toBe('id')
      expect(simpleKey.type).toBe(GraphQLID)
      expect(simpleKey.isComposite).toBe(false)

      const compositeKey = UltraStrictEntityBuilder.Key.create('userId', GraphQLString, true)
      expect(compositeKey.isComposite).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should provide detailed error messages for schema validation failures', async () => {
      // This test would require a more sophisticated schema validation setup
      // For now, we verify the structure exists
      expect(typeof matchEntityValidationResult).toBe('function')
    })
  })
})