import { describe, test, expect } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Schema from '@effect/schema/Schema'
import { GraphQLID } from 'graphql'
import {
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  UltraStrictEntityBuilder,
} from '../../../src/experimental/ultra-strict-entity-builder.js'

describe('Federation Composition Integration', () => {
  describe('Multi-Entity Federation', () => {
    test('should compose multiple entities into federated schema', async () => {
      // Create User entity
      const UserSchema = Schema.Struct({
        id: Schema.String,
        email: Schema.String,
        name: Schema.optional(Schema.String),
      })

      const userEntity = await Effect.runPromise(
        Effect.gen(function* () {
          const builder = createUltraStrictEntityBuilder('User')
          const composed = yield* Effect.succeed(
            withResolvers({
              fullName: (parent: unknown) => `${(parent as {name?: string}).name || 'Anonymous'}`,
            })(
              withDirectives([
                UltraStrictEntityBuilder.Directive.shareable(),
                UltraStrictEntityBuilder.Directive.tag('user-management'),
              ])(
                withKeys([
                  UltraStrictEntityBuilder.Key.create('id', GraphQLID, false),
                ])(withSchema(UserSchema)(builder))
              )
            )
          )
          return yield* validateEntityBuilder(composed)
        })
      )

      // Create Product entity
      const ProductSchema = Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        price: Schema.Number,
        ownerId: Schema.String, // Reference to User
      })

      const productEntity = await Effect.runPromise(
        Effect.gen(function* () {
          const builder = createUltraStrictEntityBuilder('Product')
          const composed = yield* Effect.succeed(
            withResolvers({
              formattedPrice: (parent: unknown) => `$${(parent as {price: number}).price.toFixed(2)}`,
            })(
              withDirectives([
                UltraStrictEntityBuilder.Directive.tag('inventory'),
                UltraStrictEntityBuilder.Directive.requires('ownerId'),
              ])(
                withKeys([
                  UltraStrictEntityBuilder.Key.create('id', GraphQLID, false),
                ])(withSchema(ProductSchema)(builder))
              )
            )
          )
          return yield* validateEntityBuilder(composed)
        })
      )

      // Verify both entities are valid
      expect(userEntity._tag).toBe('Valid')
      expect(productEntity._tag).toBe('Valid')

      if (userEntity._tag === 'Valid' && productEntity._tag === 'Valid') {
        // Verify entity properties
        expect(userEntity.entity.typename).toBe('User')
        expect(userEntity.entity.keys).toHaveLength(1)
        expect(userEntity.entity.directives).toHaveLength(2)

        expect(productEntity.entity.typename).toBe('Product')
        expect(productEntity.entity.keys).toHaveLength(1)
        expect(productEntity.entity.directives).toHaveLength(2)

        // Verify federation-specific directives
        const userShareableDirective = userEntity.entity.directives.find(
          d => d.name === 'shareable'
        )
        expect(userShareableDirective).toBeDefined()

        const productRequiresDirective = productEntity.entity.directives.find(
          d => d.name === 'requires'
        )
        expect(productRequiresDirective).toBeDefined()
        expect(productRequiresDirective?.args['fields']).toBe('ownerId')
      }
    })
  })

  describe('Cross-Entity Relationships', () => {
    test('should validate entity relationships and dependencies', async () => {
      // Create entities with relationships
      const entities = await Effect.runPromise(
        Effect.all([
          // User entity (base)
          Effect.gen(function* () {
            const builder = createUltraStrictEntityBuilder('User')
            return yield* validateEntityBuilder(
              withResolvers({})(
                withDirectives([UltraStrictEntityBuilder.Directive.shareable()])(
                  withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)])(
                    withSchema(
                      Schema.Struct({
                        id: Schema.String,
                        username: Schema.String,
                      })
                    )(builder)
                  )
                )
              )
            )
          }),
          
          // Order entity (depends on User)
          Effect.gen(function* () {
            const builder = createUltraStrictEntityBuilder('Order')
            return yield* validateEntityBuilder(
              withResolvers({
                totalFormatted: (parent: unknown) => `$${(parent as {total: number}).total}`,
              })(
                withDirectives([
                  UltraStrictEntityBuilder.Directive.requires('userId'),
                  UltraStrictEntityBuilder.Directive.tag('orders'),
                ])(
                  withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)])(
                    withSchema(
                      Schema.Struct({
                        id: Schema.String,
                        userId: Schema.String,
                        total: Schema.Number,
                      })
                    )(builder)
                  )
                )
              )
            )
          }),
        ])
      )

      // Verify all entities are valid
      entities.forEach((entity, index) => {
        expect(entity._tag).toBe('Valid')
        if (entity._tag === 'Valid') {
          expect(entity.entity.typename).toBe(index === 0 ? 'User' : 'Order')
        }
      })
    })
  })

  describe('Directive Validation in Federation Context', () => {
    test('should validate @override directive with from parameter', async () => {
      const entityWithOverride = await Effect.runPromise(
        Effect.gen(function* () {
          const builder = createUltraStrictEntityBuilder('User')
          return yield* validateEntityBuilder(
            withResolvers({})(
              withDirectives([
                UltraStrictEntityBuilder.Directive.override('LegacyUserService'),
              ])(
                withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)])(
                  withSchema(
                    Schema.Struct({
                      id: Schema.String,
                      email: Schema.String,
                    })
                  )(builder)
                )
              )
            )
          )
        })
      )

      expect(entityWithOverride._tag).toBe('Valid')
      
      if (entityWithOverride._tag === 'Valid') {
        const overrideDirective = entityWithOverride.entity.directives.find(
          d => d.name === 'override'
        )
        expect(overrideDirective).toBeDefined()
        expect(overrideDirective?.args['from']).toBe('LegacyUserService')
      }
    })

    test('should validate @provides and @requires directives', async () => {
      const entityWithFieldDirectives = await Effect.runPromise(
        Effect.gen(function* () {
          const builder = createUltraStrictEntityBuilder('Product')
          return yield* validateEntityBuilder(
            withResolvers({
              category: (parent: unknown) => (parent as {categoryName: string}).categoryName,
            })(
              withDirectives([
                UltraStrictEntityBuilder.Directive.provides('category'),
                UltraStrictEntityBuilder.Directive.requires('categoryId'),
              ])(
                withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)])(
                  withSchema(
                    Schema.Struct({
                      id: Schema.String,
                      name: Schema.String,
                      categoryId: Schema.String,
                    })
                  )(builder)
                )
              )
            )
          )
        })
      )

      expect(entityWithFieldDirectives._tag).toBe('Valid')
      
      if (entityWithFieldDirectives._tag === 'Valid') {
        const providesDirective = entityWithFieldDirectives.entity.directives.find(
          d => d.name === 'provides'
        )
        const requiresDirective = entityWithFieldDirectives.entity.directives.find(
          d => d.name === 'requires'
        )
        
        expect(providesDirective).toBeDefined()
        expect(providesDirective?.args['fields']).toBe('category')
        
        expect(requiresDirective).toBeDefined()
        expect(requiresDirective?.args['fields']).toBe('categoryId')
      }
    })
  })
})