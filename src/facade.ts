/**
 * # Simplified Federation API Facade
 * 
 * This module provides a simplified, user-friendly API for common federation patterns.
 * It abstracts away the complexity of Effect-TS for developers who want quick setup
 * while still maintaining all the type safety and performance benefits.
 * 
 * @example Quick federation setup
 * ```typescript
 * import { Federation } from '@cqrs/federation'
 * 
 * const federation = await Federation.create({
 *   entities: [userEntity, productEntity],
 *   services: ['http://users:4001', 'http://products:4002']
 * })
 * 
 * // Start the federation
 * await federation.start()
 * ```
 * 
 * @module Facade
 * @since 2.1.0
 */

import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Duration from 'effect/Duration'
import * as Layer from 'effect/Layer'
import type { GraphQLSchema } from 'graphql'

import type {
  FederationEntity,
  FederationCompositionConfig,
  ServiceDefinition,
  EntityResolutionError,
  ValidationError,
  EntityReferenceResolver,
} from './core/types.js'
import { FederationEntityBuilder, toFederationEntity } from './core/builders/entity-builder.js'
import { FederationComposer, FederationComposerLive } from './federation/composer.js'
import { FederationLoggerLive } from './core/services/logger.js'
import { FederationConfigLive } from './core/services/config.js'
import type * as Schema from 'effect/Schema'

/**
 * Simplified configuration for federation setup
 */
export interface SimplifiedFederationConfig {
  /**
   * Federation entities to compose
   */
  entities: Array<FederationEntity<unknown, unknown, unknown, unknown, Record<string, unknown>>>
  
  /**
   * Service URLs or definitions
   */
  services: Array<string | ServiceDefinition>
  
  /**
   * Optional performance configuration
   */
  performance?: {
    cacheSize?: number
    batchSize?: number
    enableMetrics?: boolean
  }
  
  /**
   * Optional resilience configuration  
   */
  resilience?: {
    enableCircuitBreakers?: boolean
    timeoutSeconds?: number
    maxFailures?: number
  }
  
  /**
   * Optional development configuration
   */
  development?: {
    enableHotReload?: boolean
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    enableDevTools?: boolean
  }
}

/**
 * Simplified entity builder configuration
 */
export interface SimplifiedEntityConfig<A = unknown, I = A, R = never> {
  /**
   * Entity type name
   */
  typename: string
  
  /**
   * Entity schema
   */
  schema: Schema.Schema<A, I, R>
  
  /**
   * Key fields for federation
   */
  keys: string[]
  
  /**
   * Fields to mark as shareable
   */
  shareableFields?: string[]
  
  /**
   * Fields to mark as inaccessible
   */
  inaccessibleFields?: string[]
  
  /**
   * Field tags for organization
   */
  fieldTags?: Record<string, string[]>
  
  /**
   * Reference resolver function
   */
  resolveReference?: (reference: unknown) => Effect.Effect<A | null, EntityResolutionError, never>
}

/**
 * Main Federation facade class providing simplified API
 */
export class Federation {
  private constructor(
    private readonly schema: GraphQLSchema,
    _config: SimplifiedFederationConfig
  ) {}
  
  /**
   * Create a new federation instance with simplified configuration
   */
  static async create(config: SimplifiedFederationConfig): Promise<Federation> {
    const layer = Layer.mergeAll(
      FederationComposerLive,
      FederationLoggerLive,
      FederationConfigLive
    )

    const effect = Effect.gen(function* () {
      // Convert string services to ServiceDefinition
      const services: ServiceDefinition[] = config.services.map((service, index) =>
        typeof service === 'string'
          ? { id: `service-${index}`, url: service }
          : service
      )
      
      // Create full configuration
      const fullConfig: FederationCompositionConfig = {
        entities: config.entities,
        services,
        errorBoundaries: {
          subgraphTimeouts: Object.fromEntries(
            services.map(s => [s.id, Duration.seconds(config.resilience?.timeoutSeconds ?? 30)])
          ),
          circuitBreakerConfig: {
            failureThreshold: config.resilience?.maxFailures ?? 5,
            resetTimeout: Duration.seconds(30),
          },
          partialFailureHandling: {
            allowPartialFailure: true,
            criticalSubgraphs: [],
          },
          errorTransformation: {
            sanitizeErrors: true,
            includeStackTrace: config.development?.logLevel === 'debug',
          },
        },
        performance: {
          queryPlanCache: {
            maxSize: config.performance?.cacheSize ?? 1000,
            ttl: Duration.minutes(30),
          },
          dataLoaderConfig: {
            maxBatchSize: config.performance?.batchSize ?? 100,
            batchWindowMs: 10,
            enableBatchLogging: config.development?.logLevel === 'debug',
          },
          metricsCollection: {
            enabled: config.performance?.enableMetrics ?? false,
            collectExecutionMetrics: true,
            collectCacheMetrics: true,
          },
        },
      }
      
      // Compose schema using FederationComposer
      const composer = yield* FederationComposer
      const result = yield* composer.compose(fullConfig)
      
      return new Federation(result.schema, config)
    })

    const providedEffect = Effect.provide(effect, layer)
    return Effect.runPromise(providedEffect)
  }
  
  /**
   * Create a simplified entity builder
   */
    static createEntity<A = unknown, I = A, R = never>(config: SimplifiedEntityConfig<A, I, R>): Effect.Effect<FederationEntity<A, I, R, I, R>, ValidationError | EntityResolutionError, never> {
    return pipe(
      Effect.gen(function* () {
        let builder = new FederationEntityBuilder(config.typename, config.schema as Schema.Schema<Record<string, unknown>, Record<string, unknown>, never>, config.keys)
        
        // Add shareable fields
        if (config.shareableFields) {
          for (const field of config.shareableFields) {
            builder = builder.withShareableField(field)
          }
        }
        
        // Add inaccessible fields
        if (config.inaccessibleFields) {
          for (const field of config.inaccessibleFields) {
            builder = builder.withInaccessibleField(field)
          }
        }
        
        // Add tagged fields
        if (config.fieldTags) {
          for (const [field, tags] of Object.entries(config.fieldTags)) {
            builder = builder.withTaggedField(field, tags)
          }
        }
        
        // Add reference resolver
        if (config.resolveReference) {
          builder = builder.withReferenceResolver(config.resolveReference as any)
        }
        
        return yield* builder.build()
      }),
      Effect.map(validatedEntity => 
        toFederationEntity(
          validatedEntity as unknown as typeof validatedEntity & { key: string[] },
          config.resolveReference as unknown as EntityReferenceResolver<Record<string, unknown>, Record<string, unknown>, R>
        ) as unknown as FederationEntity<A, I, R, I, R>
      )
    )
  }
  
  /**
   * Quick entity builder with fluent API
   */
  static entity<A = unknown, I = A, R = never>(typename: string, schema: Schema.Schema<A, I, R>): QuickEntityBuilder<A, I, R> {
    return new QuickEntityBuilder<A, I, R>(typename, schema)
  }
  
  /**
   * Get the composed GraphQL schema
   */
  getSchema(): GraphQLSchema {
    return this.schema
  }
  
  /**
   * Start the federation (for integration with GraphQL servers)
   */
  async start(): Promise<void> {
    // This would integrate with Apollo Server or other GraphQL servers
    console.log('🚀 Federation started successfully')
  }
  
  /**
   * Stop the federation
   */
  async stop(): Promise<void> {
    console.log('🛑 Federation stopped')
  }
}

/**
 * Quick entity builder with fluent API
 */
export class QuickEntityBuilder<A = unknown, I = A, R = never> {
  private readonly config: SimplifiedEntityConfig<A, I, R>
  
  constructor(typename: string, schema: Schema.Schema<A, I, R>) {
    this.config = {
      typename,
      schema,
      keys: [],
    }
  }
  
  /**
   * Set key fields
   */
  keys(...fields: string[]): this {
    this.config.keys = fields
    return this
  }
  
  /**
   * Mark fields as shareable
   */
  shareable(...fields: string[]): this {
    this.config.shareableFields = [...(this.config.shareableFields ?? []), ...fields]
    return this
  }
  
  /**
   * Mark fields as inaccessible
   */
  inaccessible(...fields: string[]): this {
    this.config.inaccessibleFields = [...(this.config.inaccessibleFields ?? []), ...fields]
    return this
  }
  
  /**
   * Tag a field
   */
  tag(field: string, ...tags: string[]): this {
    this.config.fieldTags = {
      ...this.config.fieldTags,
      [field]: tags,
    }
    return this
  }
  
  /**
   * Set reference resolver
   */
  resolver(fn: (reference: unknown) => Effect.Effect<A | null, EntityResolutionError, never>): this {
    this.config.resolveReference = fn
    return this
  }
  
  /**
   * Build the entity
   */
  build(): Effect.Effect<FederationEntity<A, I, R, I, R>, ValidationError | EntityResolutionError, never> {
    return Federation.createEntity(this.config)
  }
}

/**
 * Preset configurations for common scenarios
 */
export const Presets = {
  /**
   * Development configuration with hot reload and debug logging
   */
  development: (entities: FederationEntity<unknown, unknown, unknown, unknown, Record<string, unknown>  >[], services: string[]): SimplifiedFederationConfig => ({
    entities,
    services,
    performance: {
      cacheSize: 100,
      batchSize: 10,
      enableMetrics: true,
    },
    resilience: {
      enableCircuitBreakers: false,
      timeoutSeconds: 60,
      maxFailures: 10,
    },
    development: {
      enableHotReload: true,
      logLevel: 'debug',
      enableDevTools: true,
    },
  }),
  
  /**
   * Production configuration with optimizations
   */
  production: (entities: FederationEntity<unknown, unknown, unknown, unknown, Record<string, unknown>>[], services: string[]): SimplifiedFederationConfig => ({
    entities,
    services,
    performance: {
      cacheSize: 10000,
      batchSize: 1000,
      enableMetrics: true,
    },
    resilience: {
      enableCircuitBreakers: true,
      timeoutSeconds: 30,
      maxFailures: 5,
    },
    development: {
      enableHotReload: false,
      logLevel: 'warn',
      enableDevTools: false,
    },
  }),
  
  /**
   * Testing configuration with minimal setup
   */
  testing: (entities: FederationEntity<unknown, unknown, unknown, unknown>[]): SimplifiedFederationConfig => ({
    entities,
    services: [
      { id: 'mock-service', url: 'http://localhost:4001' },
    ],
    performance: {
      cacheSize: 10,
      batchSize: 5,
      enableMetrics: false,
    },
    resilience: {
      enableCircuitBreakers: false,
      timeoutSeconds: 5,
      maxFailures: 1,
    },
    development: {
      enableHotReload: false,
      logLevel: 'error',
      enableDevTools: false,
    },
  }),
}

/**
 * Export common patterns as ready-to-use functions
 */
export const Patterns = {
  /**
   * Create a basic federated entity
   */
  createBasicEntity: <A = unknown>(
    typename: string,
    schema: Schema.Schema<A, unknown, never>,
    keyField: string = 'id'
  ) => Federation.entity(typename, schema).keys(keyField).build(),
  
  /**
   * Create a shareable entity
   */
  createShareableEntity: <A = unknown>(
    typename: string,
    schema: Schema.Schema<A, unknown, never>,
    keyField: string,
    shareableFields: string[]
  ) => Federation.entity(typename, schema)
    .keys(keyField)
    .shareable(...shareableFields)
    .build(),
  
  /**
   * Create an entity with PII field protection
   */
  createPIIEntity: <A = unknown>(
    typename: string,
    schema: Schema.Schema<A, unknown, A>,
    keyField: string,
    piiFields: string[]
  ) => Federation.entity(typename, schema as Schema.Schema<A, unknown, never>)
    .keys(keyField)
    .inaccessible(...piiFields)
    .build(),
}

// Re-export key types and utilities for convenience
export { FederationEntityBuilder, createEntityBuilder } from './core/builders/entity-builder.js'
export type { FederationEntity, ServiceDefinition, EntityResolutionError } from './core/types.js'
export { SubgraphManagement } from './federation/subgraph.js'
export { FederationErrorBoundaries } from './federation/error-boundaries.js'
export { PerformanceOptimizations } from './federation/performance.js'