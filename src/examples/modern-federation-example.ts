/**
 * Modern Federation v2 Example showcasing updated patterns
 * 
 * This example demonstrates:
 * - Effect.gen patterns for readable async code
 * - Layer-based dependency injection
 * - Modern service integration with logging and config
 * - Proper error handling with pattern matching
 * - Type-safe configuration loading
 */

import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from '@effect/schema/Schema'
import { Duration } from 'effect'

// Import modern services
import { DevelopmentLayerLive } from '../core/services/layers.js'
import { info, error, withSpan } from '../core/services/logger.js'
import { FederationConfigService } from '../core/services/config.js'
import {
  ModernFederationComposerLive,
  createFederatedSchema,
} from '../federation/composer.js'

// Import traditional components
import { ModernFederationEntityBuilder } from '../core/builders/entity-builder.js'

// Define schemas using Effect Schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
  role: Schema.Literal('admin', 'user', 'guest'),
  createdAt: Schema.Date,
})

const ProductSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  category: Schema.String,
  ownerId: Schema.String,
})

// Type exports for the schemas (used in resolvers)
type User = Schema.Schema.Type<typeof UserSchema>
type Product = Schema.Schema.Type<typeof ProductSchema>

// Type exports are used in field resolvers, preventing unused type warning
export type { User, Product }

// Modern entity creation with Effect.gen
const createUserEntity = Effect.gen(function* () {
  yield* info('Creating User entity with modern patterns')

  const entity = new ModernFederationEntityBuilder('User', UserSchema, ['id'])
    .withShareableField('email')
    .withTaggedField('name', ['pii'])
    .withField('email', (parent) =>
      Effect.succeed(parent.email || '')
    )
    .withReferenceResolver((reference, _context, _info) =>
      Effect.succeed({
        id: reference.id as string,
        email: `user${reference.id}@example.com`,
        name: `User ${reference.id}`,
        role: 'user' as const,
        createdAt: new Date(),
      })
    )
    .build()

  yield* info('User entity created successfully')
  return entity
})

const createProductEntity = Effect.gen(function* () {
  yield* info('Creating Product entity')

  const entity = new ModernFederationEntityBuilder('Product', ProductSchema, ['id'])
    .withShareableField('name')
    .withOverrideField('price', 'inventory-service', (parent) =>
      Effect.succeed((parent.price || 0) * 1.1)
    )
    .withField('ownerId', (parent) =>
      Effect.succeed(parent.ownerId || '')
    )
    .withReferenceResolver((reference, _context, _info) =>
      Effect.succeed({
        id: reference.id as string,
        name: `Product ${reference.id}`,
        price: 99.99,
        category: 'electronics',
        ownerId: 'user-123',
      })
    )
    .build()

  return entity
})

// Modern federation setup with proper layering
const setupModernFederation = Effect.gen(function* () {
  const config = yield* FederationConfigService

  yield* info('Setting up modern federation with Effect patterns')

  // Create entities using the modern patterns
  const userEntity = yield* createUserEntity
  const productEntity = yield* createProductEntity

  // Create federation configuration
  const federationConfig = {
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
        failureThreshold: config.resilience.circuitBreaker.failureThreshold,
        resetTimeout: config.resilience.circuitBreaker.resetTimeout,
        halfOpenMaxCalls: config.resilience.circuitBreaker.halfOpenMaxCalls,
      },
      partialFailureHandling: {
        allowPartialFailure: true,
        criticalSubgraphs: ['users'],
      },
    },
    performance: {
      queryPlanCache: { maxSize: 1000 },
      dataLoaderConfig: { maxBatchSize: 100 },
      metricsCollection: { enabled: true },
    },
  }

  yield* info('Federation configuration created', {
    entityCount: federationConfig.entities.length,
    serviceCount: federationConfig.services.length,
  })

  // Compose the federation using modern patterns
  const federatedSchema = yield* createFederatedSchema(federationConfig)

  yield* info('Modern federation setup completed successfully')

  return federatedSchema
})

// Error handling with pattern matching
const handleSetupError = (err: unknown) =>
  Effect.gen(function* () {
    yield* error('Federation setup failed', { error: err })

    // Pattern match on error types for better error handling
    if (err instanceof Error) {
      if (err.name === 'ValidationError') {
        yield* error('Configuration validation failed - check your entity definitions')
      } else if (err.name === 'CompositionError') {
        yield* error('Schema composition failed', { error: err })
      } else {
        yield* error('Unknown setup error occurred', { errorName: err.name })
      }
    }

    return err
  })

// Main program with proper layering and error handling
const program = Effect.gen(function* () {
  yield* info('Starting Modern Federation v2 Example')

  const result = yield* withSpan('federation-setup', setupModernFederation).pipe(
    Effect.catchAll(handleSetupError),
    Effect.timeout(Duration.seconds(60))
  )

  yield* info('Example completed successfully')
  return result
})

// Application layer composition
const ApplicationLive = Layer.mergeAll(
  DevelopmentLayerLive,
  ModernFederationComposerLive
)

// Run the program with proper layering
const runExample = program.pipe(
  Effect.provide(ApplicationLive),
  Effect.catchAll(err => {
    console.error('❌ Example failed:', err)
    return Effect.fail(err)
  })
) as Effect.Effect<unknown, never, never>

// Export for usage
export { runExample as modernFederationExample }

// Run if this file is executed directly
if (import.meta.main) {
  Effect.runPromise(runExample)
    .then(() => {
      console.log('🎉 Modern Federation Example completed!')
    })
    .catch(error => {
      console.error('💥 Example failed:', error)
      process.exit(1)
    })
}