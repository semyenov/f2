/**
 * Modern Federation Composer using Effect.gen patterns
 * 
 * This is an example of how to modernize the existing composer with:
 * - Effect.gen for readable async operations
 * - Proper layer-based dependency injection
 * - Modern error handling patterns
 * - Service integration with logging and config
 */

import * as Effect from 'effect/Effect'
import * as Context from 'effect/Context'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import { Duration } from 'effect'
import type { GraphQLSchema } from 'graphql'
import { buildSchema as buildGraphQLSchema } from 'graphql'
import { FederationLogger } from '../core/services/logger.js'
import type {
  FederationCompositionConfig as FederationConfig,
  FederatedSchema,
  ServiceDefinition,
  SchemaMetadata,
} from '../core/types.js'
import {
  ValidationError,
  CompositionError,
  ErrorFactory,
} from '../core/errors.js'

// Modern Composer Service using Context.Tag
export class ModernFederationComposer extends Context.Tag('ModernFederationComposer')<
  ModernFederationComposer,
  {
    readonly compose: (config: FederationConfig) => Effect.Effect<FederatedSchema, CompositionError, FederationLogger>
    readonly validate: (config: FederationConfig) => Effect.Effect<FederationConfig, ValidationError, FederationLogger>
    readonly buildSchema: (composedConfig: ComposedConfiguration) => Effect.Effect<GraphQLSchema, CompositionError, FederationLogger>
  }
>() {}

interface ComposedConfiguration {
  readonly config: FederationConfig
  readonly subgraphSchemas: ReadonlyArray<SubgraphSchemaInfo>
  readonly metadata: SchemaMetadata
}

interface SubgraphSchemaInfo {
  readonly service: ServiceDefinition
  readonly sdl: string
  readonly entities: ReadonlyArray<string>
  readonly directives: ReadonlyArray<string>
}

// Implementation using Effect.gen
const makeComposer = Effect.gen(function* () {
  const logger = yield* FederationLogger

  const compose = (federationConfig: FederationConfig): Effect.Effect<FederatedSchema, CompositionError, FederationLogger> =>
    Effect.gen(function* () {
      yield* logger.info('Starting federation composition', {
        entityCount: federationConfig.entities.length,
        serviceCount: federationConfig.services.length,
      })

      // Step 1: Validate configuration
      const validatedConfig = yield* validate(federationConfig).pipe(
        Effect.mapError(error => new CompositionError(
          `Configuration validation failed: ${error.message}`,
          undefined,
          { field: error.field },
          error
        ))
      )

      // Step 2: Fetch subgraph schemas
      const subgraphSchemas = yield* fetchSubgraphSchemas(validatedConfig.services)

      // Step 3: Compose the configuration
      const composedConfig: ComposedConfiguration = {
        config: validatedConfig,
        subgraphSchemas,
        metadata: createMetadata(validatedConfig, subgraphSchemas),
      }

      // Step 4: Build the executable schema
      const schema = yield* buildSchema(composedConfig)

      // Step 5: Create the final federated schema
      const federatedSchema: FederatedSchema = {
        schema,
        entities: validatedConfig.entities,
        services: validatedConfig.services,
        version: '2.0.0',
        metadata: composedConfig.metadata,
      }

      yield* logger.info('Federation composition completed successfully', {
        entityCount: federatedSchema.entities.length,
        serviceCount: federatedSchema.services.length,
        version: federatedSchema.version,
      })

      return federatedSchema
    })

  const validate = (federationConfig: FederationConfig): Effect.Effect<FederationConfig, ValidationError, FederationLogger> =>
    Effect.gen(function* () {
      yield* logger.trace('Validating federation configuration')

      // Validate entities
      if (federationConfig.entities.length === 0) {
        yield* logger.error('No entities provided in configuration')
        return yield* Effect.fail(
          ErrorFactory.validation('At least one entity is required', 'entities')
        )
      }

      // Validate services
      if (federationConfig.services.length === 0) {
        yield* logger.error('No services provided in configuration')
        return yield* Effect.fail(
          ErrorFactory.validation('At least one service is required', 'services')
        )
      }

      // Validate service URLs
      yield* Effect.forEach(federationConfig.services, validateServiceUrl, {
        concurrency: 3,
      })

      // Validate entity keys
      yield* validateEntityKeys(federationConfig.entities)

      yield* logger.trace('Configuration validation completed')
      return federationConfig
    })

  const buildSchema = (composedConfig: ComposedConfiguration): Effect.Effect<GraphQLSchema, CompositionError, FederationLogger> =>
    Effect.gen(function* () {
      const currentLogger = yield* FederationLogger
      yield* currentLogger.trace('Building executable GraphQL schema')

      // Create basic schema from SDL
      const combinedSDL = composedConfig.subgraphSchemas
        .map(schema => schema.sdl)
        .join('\n\n')

      try {
        const schema = buildGraphQLSchema(combinedSDL)
        yield* currentLogger.info('GraphQL schema built successfully')
        return schema
      } catch (err) {
        yield* currentLogger.error('Failed to build GraphQL schema', { error: err })
        return yield* Effect.fail(
          new CompositionError(
            `Failed to build schema: ${err}`,
            undefined,
            {},
            err
          )
        )
      }
    })

  return {
    compose,
    validate,
    buildSchema,
  }
})

// Helper functions using Effect.gen
const validateServiceUrl = (service: ServiceDefinition) =>
  Effect.gen(function* () {
    const logger = yield* FederationLogger

    yield* logger.trace(`Validating service URL: ${service.url}`)

    try {
      new URL(service.url)
      yield* logger.trace(`Service URL is valid: ${service.url}`)
    } catch (err) {
      yield* logger.error(`Invalid service URL: ${service.url}`, { error: err })
      return yield* Effect.fail(
        ErrorFactory.validation(
          `Invalid service URL: ${service.url}`,
          'url',
          service.url
        )
      )
    }
  })

const validateEntityKeys = (entities: FederationConfig['entities']): Effect.Effect<void, ValidationError, FederationLogger> =>
  Effect.gen(function* () {
    const logger = yield* FederationLogger

    yield* logger.trace(`Validating entity keys for ${entities.length} entities`)

    for (const entity of entities) {
      if (!entity.key || (Array.isArray(entity.key) && entity.key.length === 0)) {
        yield* logger.error(`Entity ${entity.typename} has no key fields`)
        return yield* Effect.fail(
          ErrorFactory.validation(
            `Entity ${entity.typename} must have at least one key field`,
            'key',
            entity.key
          )
        )
      }
    }

    yield* logger.trace('Entity key validation completed')
  })

const fetchSubgraphSchemas = (services: ReadonlyArray<ServiceDefinition>) =>
  Effect.gen(function* () {
    const logger = yield* FederationLogger

    yield* logger.info(`Fetching schemas from ${services.length} subgraphs`)

    // In a real implementation, this would fetch SDL from each service
    // For now, we'll create mock schema information
    const schemas = services.map(service => ({
      service,
      sdl: `
        type Query {
          _service: _Service!
        }
        
        type _Service {
          sdl: String!
        }
      `,
      entities: [],
      directives: [],
    }))

    yield* logger.info('Subgraph schemas fetched successfully')
    return schemas
  })

const createMetadata = (
  config: FederationConfig,
  subgraphs: ReadonlyArray<SubgraphSchemaInfo>
): SchemaMetadata => {
  const now = new Date()
  return {
    createdAt: now,
    composedAt: now,
    federationVersion: '2.0.0',
    subgraphCount: subgraphs.length,
    entityCount: config.entities.length,
  }
}

// Layer for the composer service
export const ModernFederationComposerLive = Layer.effect(
  ModernFederationComposer,
  makeComposer
)

// Convenience functions
export const compose = (config: FederationConfig) =>
  Effect.flatMap(ModernFederationComposer, composer => composer.compose(config))

export const validateConfig = (config: FederationConfig) =>
  Effect.flatMap(ModernFederationComposer, composer => composer.validate(config))

// Pattern matching for composition errors
export const handleCompositionError = (error: CompositionError) =>
  Match.value(error).pipe(
    Match.when(
      error => error.message.includes('URL'),
      () => 'Invalid service configuration - check your URLs'
    ),
    Match.when(
      error => error.message.includes('schema'),
      () => 'Schema composition failed - check your GraphQL definitions'
    ),
    Match.orElse(() => `Composition error: ${error.message}`)
  )

// Example usage with proper error handling
export const createFederatedSchema = (config: FederationConfig) =>
  Effect.gen(function* () {
    const logger = yield* FederationLogger

    yield* logger.info('Creating federated schema')

    const result = yield* compose(config).pipe(
      Effect.catchTag('CompositionError', error => 
        Effect.gen(function* () {
          const userMessage = handleCompositionError(error)
          yield* logger.error('Composition failed', { error, userMessage })
          return yield* Effect.fail(error)
        })
      ),
      Effect.timeout(Duration.seconds(30)),
      Effect.catchTag('TimeoutException', () => 
        Effect.gen(function* () {
          yield* logger.error('Schema composition timed out')
          return yield* Effect.fail(
            new CompositionError('Schema composition timed out after 30 seconds')
          )
        })
      )
    )

    yield* logger.info('Federated schema created successfully')
    return result
  })

// Legacy compatibility export
export { ModernFederationComposer as FederationComposer }