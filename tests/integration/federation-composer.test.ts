import { describe, it, expect } from 'bun:test'
import * as Effect from 'effect/Effect'
import * as Schema from '@effect/schema/Schema'
import { Duration } from 'effect'
import { ModernFederationEntityBuilder } from '../../src/core/builders/entity-builder.js'
import { FederationComposer } from '../../src/federation/composer.js'

describe('Federation Composer Integration', () => {
  const UserSchema = Schema.Struct({
    id: Schema.String,
    email: Schema.String,
    name: Schema.optional(Schema.String),
  })

  const ProductSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    price: Schema.Number,
  })

  it('should compose federation with multiple entities', async () => {
    const userEntity = new ModernFederationEntityBuilder('User', UserSchema, ['id'])
      .withShareableField('email')
      .withReferenceResolver((ref) =>
        Effect.succeed({
          id: ref.id as string,
          email: `user${ref.id}@example.com`,
          name: `User ${ref.id}`,
        })
      )
      .build()

    const productEntity = new ModernFederationEntityBuilder('Product', ProductSchema, ['id'])
      .withShareableField('name')
      .withReferenceResolver((ref) =>
        Effect.succeed({
          id: ref.id as string,
          name: `Product ${ref.id}`,
          price: 99.99,
        })
      )
      .build()

    const config = {
      entities: [userEntity, productEntity],
      services: [
        { id: 'users', url: 'http://localhost:4001' },
        { id: 'products', url: 'http://localhost:4002' },
      ],
      errorBoundaries: {
        subgraphTimeouts: {
          users: Duration.seconds(5),
          products: Duration.seconds(3),
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
        },
        partialFailureHandling: {
          allowPartialFailure: true,
        },
      },
      performance: {
        queryPlanCache: { maxSize: 100 },
        dataLoaderConfig: { maxBatchSize: 50 },
        metricsCollection: { enabled: true },
      },
    }

    const result = await Effect.runPromise(FederationComposer.create(config))

    expect(result).toBeDefined()
    expect(result.schema).toBeDefined()
    expect(result.entities).toHaveLength(2)
    expect(result.services).toHaveLength(2)
    expect(result.metadata).toBeDefined()
    expect(result.metadata.entityCount).toBe(2)
    expect(result.metadata.subgraphCount).toBe(2)
  })

  it('should handle composition with error boundaries', async () => {
    const userEntity = new ModernFederationEntityBuilder('User', UserSchema, ['id'])
      .withReferenceResolver((ref) =>
        Effect.succeed({
          id: ref.id as string,
          email: `user${ref.id}@example.com`,
          name: `User ${ref.id}`,
        })
      )
      .build()

    const config = {
      entities: [userEntity],
      services: [{ id: 'users', url: 'http://localhost:4001' }],
      errorBoundaries: {
        subgraphTimeouts: {
          users: Duration.seconds(1), // Very short timeout for testing
        },
        circuitBreakerConfig: {
          failureThreshold: 1,
          resetTimeout: Duration.seconds(10),
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: ['users'],
        },
      },
      performance: {
        queryPlanCache: { maxSize: 10 },
        dataLoaderConfig: { maxBatchSize: 5 },
        metricsCollection: { enabled: false },
      },
    }

    const result = await Effect.runPromise(FederationComposer.create(config))

    expect(result).toBeDefined()
    expect(result.entities).toHaveLength(1)
    expect(result.services).toHaveLength(1)
  })

  it('should validate entity configuration during composition', async () => {
    const invalidEntity = {
      typename: '', // Invalid empty typename
      key: ['id'],
      schema: UserSchema,
      resolveReference: () => Effect.succeed({}),
      fields: undefined,
      directives: undefined,
      extensions: undefined,
    }

    const config = {
      entities: [invalidEntity as any],
      services: [{ id: 'users', url: 'http://localhost:4001' }],
      errorBoundaries: {
        subgraphTimeouts: {
          users: Duration.seconds(5),
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
        },
        partialFailureHandling: {
          allowPartialFailure: true,
        },
      },
      performance: {
        queryPlanCache: { maxSize: 100 },
        dataLoaderConfig: { maxBatchSize: 50 },
        metricsCollection: { enabled: true },
      },
    }

    await expect(Effect.runPromise(FederationComposer.create(config))).rejects.toThrow()
  })
})