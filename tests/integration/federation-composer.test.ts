import { describe, it, expect } from 'vitest'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { Duration, Layer } from 'effect'
import { createEntityBuilder, toFederationEntity, asUntypedEntity } from '@runtime/core'
import { createFederatedSchema, FederationComposerLive } from '@federation'
import { TestServicesLive } from '../utils/test-layers.js'
import type { FederationCompositionConfig, FederationEntity } from '@runtime/core'

describe('Federation Composer Integration', () => {
  // Ensure all required services are explicitly provided with correct dependency order
  const testLayers = TestServicesLive.pipe(
    Layer.provide(FederationComposerLive)
  )

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
    const userReferenceResolver = (ref: { id: string }) =>
      Effect.succeed({
        id: ref.id as string,
        email: `user${ref.id}@example.com`,
        name: `User ${ref.id}`,
      })

    const productReferenceResolver = (ref: { id: string }) =>
      Effect.succeed({
        id: ref.id,
        name: `Product ${ref.id}`,
        price: 99.99,
      })

    const userEntityEffect = createEntityBuilder('User', UserSchema, ['id'])
      .withShareableField('email')
      .withReferenceResolver(userReferenceResolver)
      .build()

    const productEntityEffect = createEntityBuilder('Product', ProductSchema, ['id'])
      .withShareableField('name')
      .withReferenceResolver(productReferenceResolver)
      .build()

    const [userValidated, productValidated] = await Effect.runPromise(Effect.all([userEntityEffect, productEntityEffect]))

    const config: FederationCompositionConfig = {
      entities: [
        asUntypedEntity(toFederationEntity(userValidated as unknown as (typeof userValidated & { key: string[] }), userReferenceResolver)),
        asUntypedEntity(toFederationEntity(productValidated as unknown as (typeof productValidated & { key: string[] }), productReferenceResolver)),
      ],
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
        errorTransformation: {
          includeStackTrace: false,
          sanitizeErrors: false,
        },
      },
      performance: {
        queryPlanCache: { maxSize: 100 },
        dataLoaderConfig: { maxBatchSize: 50 },
        metricsCollection: { enabled: true },
      },
    }

    const result = await Effect.runPromise(
      createFederatedSchema(config).pipe(
        Effect.provide(testLayers)
      )
    )

    expect(result).toBeDefined()
    expect(result.schema).toBeDefined()
    expect(result.entities).toHaveLength(2)
    expect(result.services).toHaveLength(2)
    expect(result.metadata).toBeDefined()
    expect(result.metadata.entityCount).toBe(2)
    expect(result.metadata.subgraphCount).toBe(2)
  })

  it('should handle composition with error boundaries', async () => {
    const userReferenceResolver = (ref: unknown) => {
      const { id } = ref as { id: string }
      return Effect.succeed({
        id,
        email: `user${id}@example.com`,
        name: `User ${id}`,
      })
    }

    const userEntityEffect = createEntityBuilder('User', UserSchema, ['id'])
      .withReferenceResolver(userReferenceResolver)
      .build()

    const [userValidated] = await Effect.runPromise(Effect.all([userEntityEffect]))

    const config: FederationCompositionConfig = {
      entities: [asUntypedEntity(toFederationEntity(userValidated as unknown as (typeof userValidated & { key: string[] }), userReferenceResolver))],
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
        errorTransformation: {
          includeStackTrace: false,
          sanitizeErrors: false,
        },
      },
      performance: {
        queryPlanCache: { maxSize: 10 },
        dataLoaderConfig: { maxBatchSize: 5 },
        metricsCollection: { enabled: false },
      },
    }

    const result = await Effect.runPromise(
      createFederatedSchema(config).pipe(
        Effect.provide(testLayers)
      )
    )

    expect(result).toBeDefined()
    expect(result.entities).toHaveLength(1)
    expect(result.services).toHaveLength(1)
  })

  it('should validate entity configuration during composition', async () => {
    const invalidEntity = {
      typename: '', // Invalid empty typename
      key: ['id'],
      schema: UserSchema as unknown as Schema.Schema<Record<string, unknown>, Partial<Record<string, unknown>>>,
      resolveReference: () => Effect.succeed({}),
      fields: undefined,
      directives: undefined,
      extensions: undefined,
    } as FederationEntity

    const config: FederationCompositionConfig = {
      entities: [asUntypedEntity(invalidEntity)],
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
        errorTransformation: {
          includeStackTrace: false,
          sanitizeErrors: false,
        },
      },
      performance: {
        queryPlanCache: { maxSize: 100 },
        dataLoaderConfig: { maxBatchSize: 50 },
        metricsCollection: { enabled: true },
      },
    }

    await expect(
      Effect.runPromise(
        createFederatedSchema(config).pipe(
          Effect.provide(testLayers),
          Effect.scoped
        )
      )
    ).rejects.toThrow()
  })
})