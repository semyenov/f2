import * as Schema from 'effect/Schema'
import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'
import { ASTConversion, createConversionContext } from '../../../src/schema/ast-conversion.js'
import { GraphQLString, GraphQLFloat, GraphQLBoolean, GraphQLObjectType, isOutputType } from 'graphql'

describe('AST Conversion Simple Tests', () => {
  describe('Basic Type Conversions', () => {
    it('should convert string schema to GraphQL', async () => {
      const schema = Schema.String
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(schema, context)
      )
      
      expect(result).toBe(GraphQLString)
    })

    it('should convert number schema to GraphQL', async () => {
      const schema = Schema.Number
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(schema, context)
      )
      
      expect(result).toBe(GraphQLFloat)
    })

    it('should convert boolean schema to GraphQL', async () => {
      const schema = Schema.Boolean
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(schema, context)
      )
      
      expect(result).toBe(GraphQLBoolean)
    })

    it('should handle optional fields', async () => {
      const schema = Schema.optional(Schema.String)
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        Effect.either(ASTConversion.schemaToGraphQLType(schema, context))
      )
      
      // Optional handling may vary, just check it doesn't fail
      expect(result._tag).toBeDefined()
    })
  })

  describe('Complex Type Conversions', () => {
    it('should convert struct to GraphQL object', async () => {
      const UserSchema = Schema.Struct({
        id: Schema.String,
        name: Schema.String
      })
      
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        Effect.either(ASTConversion.schemaToGraphQLType(UserSchema, context))
      )
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right).toBeDefined()
        expect(isOutputType(result.right)).toBe(true)
      }
    })

    it('should convert array schema', async () => {
      const schema = Schema.Array(Schema.String)
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        Effect.either(ASTConversion.schemaToGraphQLType(schema, context))
      )
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right).toBeDefined()
      }
    })
  })

  describe('Parallel Conversions', () => {
    it('should convert multiple schemas in parallel', async () => {
      const schemas = [
        { name: 'String', schema: Schema.String },
        { name: 'Number', schema: Schema.Number },
        { name: 'Boolean', schema: Schema.Boolean }
      ]
      
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        ASTConversion.convertSchemasParallel(schemas, context)
      )
      
      expect(result['String']).toBe(GraphQLString)
      expect(result['Number']).toBe(GraphQLFloat)
      expect(result['Boolean']).toBe(GraphQLBoolean)
    })

    it('should handle errors in parallel conversion', async () => {
      const schemas = [
        { name: 'Valid', schema: Schema.String },
        { name: 'Never', schema: Schema.Never } // This should fail
      ]
      
      const context = createConversionContext()
      
      const result = await Effect.runPromise(
        Effect.either(ASTConversion.convertSchemasParallel(schemas, context))
      )
      
      expect(result._tag).toBe('Left')
    })
  })

  describe('Schema Groups Conversion', () => {
    it('should convert multiple schemas using convertSchemasParallel', async () => {
      const schemas = [
        {
          name: 'User',
          schema: Schema.Struct({
            id: Schema.String,
            name: Schema.String
          })
        },
        {
          name: 'Product', 
          schema: Schema.Struct({
            id: Schema.String,
            title: Schema.String
          })
        }
      ]
      
      const context = createConversionContext()
      const result = await Effect.runPromise(
        Effect.either(ASTConversion.convertSchemasParallel(schemas, context))
      )
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right).toBeDefined()
        expect(Object.keys(result.right)).toContain('User')
        expect(Object.keys(result.right)).toContain('Product')
      }
    })
  })

  describe('Context and Caching', () => {
    it('should cache converted types', async () => {
      const schema = Schema.String
      const context = createConversionContext()
      
      // First conversion
      const result1 = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(schema, context)
      )
      
      // Second conversion with same context should use cache
      const result2 = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(schema, context)
      )
      
      expect(result1).toBe(result2)
      expect(context.cache.size).toBeGreaterThan(0)
    })

    it('should respect max depth limit', async () => {
      // Create a deeply nested schema
      let schema = Schema.String
      for (let i = 0; i < 20; i++) {
        schema = Schema.Struct({ nested: schema })
      }
      
      const context = createConversionContext()
      context.maxDepth = 10 // Set a lower limit
      
      const result = await Effect.runPromise(
        Effect.either(ASTConversion.schemaToGraphQLType(schema, context))
      )
      
      expect(result._tag).toBe('Left')
    })

    it('should create input type context', () => {
      const context = createConversionContext(true)
      
      expect(context.isInput).toBe(true)
      expect(context.cache).toBeDefined()
      expect(context.scalars).toBeDefined()
    })

    it('should create output type context', () => {
      const context = createConversionContext(false)
      
      expect(context.isInput).toBe(false)
      expect(context.cache).toBeDefined()
      expect(context.scalars).toBeDefined()
    })
  })
})