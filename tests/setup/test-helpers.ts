import * as Effect from 'effect/Effect'
import * as Schema from '@effect/schema/Schema'
import { GraphQLString, GraphQLID } from 'graphql'
import {
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  UltraStrictEntityBuilder,
  type ValidatedEntity,
  type EntityValidationResult,
} from '../../src/core/ultra-strict-entity-builder.js'

/**
 * Test helper for creating valid entities quickly in tests
 */
export const createTestEntity = async (
  typename: string,
  schemaFields: Record<string, Schema.Schema<any>>,
  options: {
    keys?: string[]
    directives?: Array<ReturnType<typeof UltraStrictEntityBuilder.Directive[keyof typeof UltraStrictEntityBuilder.Directive]>>
    resolvers?: Record<string, (parent: any) => any>
  } = {}
): Promise<EntityValidationResult> => {
  const {
    keys = ['id'],
    directives = [UltraStrictEntityBuilder.Directive.shareable()],
    resolvers = {}
  } = options

  const testSchema = Schema.Struct(schemaFields)

  return Effect.runPromise(
    Effect.gen(function* () {
      const builder = createUltraStrictEntityBuilder(typename)
      const composed = withResolvers(resolvers)(
        withDirectives(directives)(
          withKeys(
            keys.map(key => UltraStrictEntityBuilder.Key.create(key, GraphQLID, false))
          )(
            withSchema(testSchema)(builder)
          )
        )
      )
      return yield* validateEntityBuilder(composed)
    })
  )
}

/**
 * Extract valid entity from validation result, throwing if invalid
 */
export const expectValidEntity = (result: EntityValidationResult): ValidatedEntity => {
  if (result._tag !== 'Valid') {
    throw new Error(`Expected valid entity, got: ${result._tag}`)
  }
  return result.entity
}

/**
 * Common test schemas for reuse across tests
 */
export const TestSchemas = {
  User: Schema.Struct({
    id: Schema.String,
    email: Schema.String,
    name: Schema.optional(Schema.String),
    createdAt: Schema.optional(Schema.String),
  }),

  Product: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    price: Schema.Number,
    categoryId: Schema.String,
    inStock: Schema.Boolean,
  }),

  Order: Schema.Struct({
    id: Schema.String,
    userId: Schema.String,
    items: Schema.Array(Schema.String),
    total: Schema.Number,
    status: Schema.Literal('pending', 'processing', 'completed', 'cancelled'),
  }),

  Category: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    parentId: Schema.optional(Schema.String),
  })
}

/**
 * Common directive sets for testing
 */
export const TestDirectives = {
  shareable: [UltraStrictEntityBuilder.Directive.shareable()],
  
  tagged: (tag: string) => [
    UltraStrictEntityBuilder.Directive.shareable(),
    UltraStrictEntityBuilder.Directive.tag(tag)
  ],
  
  withOverride: (from: string) => [
    UltraStrictEntityBuilder.Directive.override(from),
    UltraStrictEntityBuilder.Directive.shareable()
  ],
  
  federated: (requires?: string, provides?: string) => {
    const directives = [UltraStrictEntityBuilder.Directive.shareable()]
    if (requires) {
      directives.push(UltraStrictEntityBuilder.Directive.requires(requires))
    }
    if (provides) {
      directives.push(UltraStrictEntityBuilder.Directive.provides(provides))
    }
    return directives
  }
}

/**
 * Common resolvers for testing
 */
export const TestResolvers = {
  user: {
    fullName: (parent: any) => `${parent.name || 'Anonymous'}`,
    isActive: (parent: any) => Boolean(parent.createdAt),
  },

  product: {
    formattedPrice: (parent: any) => `$${parent.price?.toFixed(2) || '0.00'}`,
    displayName: (parent: any) => parent.name || 'Unnamed Product',
  },

  order: {
    itemCount: (parent: any) => parent.items?.length || 0,
    isCompleted: (parent: any) => parent.status === 'completed',
    formattedTotal: (parent: any) => `$${parent.total?.toFixed(2) || '0.00'}`,
  }
}

/**
 * Async test wrapper that handles Effect execution
 */
export const runEffectTest = <A, E, R = never>(
  effect: Effect.Effect<A, E, R>
): Promise<A> => {
  return Effect.runPromise(
    effect.pipe(
      Effect.catchAll((error: E) => 
        Effect.sync(() => {
          console.error('Effect test error:', error)
          throw error
        })
      )
    )
  )
}

/**
 * Mock context for testing conversion functions
 */
export const createMockConversionContext = (isInput = false) => ({
  cache: new Map(),
  isInput,
  scalars: {
    DateTime: GraphQLString,
    JSON: GraphQLString,
  },
  depth: 0,
  maxDepth: 10,
  strictMode: true,
})

/**
 * Performance testing utilities
 */
export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await operation()
  const end = performance.now()
  const duration = end - start
  
  console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`)
  return { result, duration }
}

/**
 * Generate test data for stress testing
 */
export const generateTestEntities = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `Entity${i}`,
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      value: Schema.Number,
      index: Schema.Literal(i),
    })
  }))
}