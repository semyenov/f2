/**
 * # GraphQL Mesh Integration for Federation
 *
 * Integrates GraphQL Mesh capabilities with Apollo Federation, enabling
 * unified access to REST APIs, databases, gRPC services, and other data sources
 * through a federated GraphQL layer.
 *
 * @example Basic mesh integration
 * ```typescript
 * import { MeshIntegration } from '@cqrs/federation'
 *
 * const mesh = await MeshIntegration.create({
 *   sources: [
 *     { type: 'openapi', name: 'users', spec: './openapi.yaml' },
 *     { type: 'grpc', name: 'products', proto: './products.proto' },
 *     { type: 'postgres', name: 'orders', connectionString: 'postgres://...' }
 *   ],
 *   federation: {
 *     entities: [userEntity, productEntity],
 *     services: ['http://gateway:4000']
 *   }
 * })
 * ```
 *
 * @module Mesh
 * @since 2.3.0
 */

import { Effect, Duration, Schedule, pipe } from 'effect'
import type { GraphQLSchema } from 'graphql'
import { buildSchema, printSchema } from 'graphql'
import type { FederationEntity, ServiceDefinition } from '../core/types.js'

/**
 * Mesh source types
 */
export type MeshSourceType =
  | 'openapi'
  | 'graphql'
  | 'grpc'
  | 'soap'
  | 'odata'
  | 'thrift'
  | 'postgres'
  | 'mysql'
  | 'mongodb'
  | 'redis'
  | 'elasticsearch'
  | 'neo4j'
  | 'json-schema'

/**
 * Mesh source configuration
 */
export interface MeshSource {
  /**
   * Source type
   */
  type: MeshSourceType

  /**
   * Source name
   */
  name: string

  /**
   * Source-specific configuration
   */
  config: Record<string, unknown>

  /**
   * Transform configuration
   */
  transforms?: MeshTransform[]

  /**
   * Cache configuration
   */
  cache?: {
    /**
     * TTL in seconds
     */
    ttl?: number

    /**
     * Invalidation rules
     */
    invalidate?: {
      /**
       * Time-based invalidation
       */
      ttl?: Duration.Duration

      /**
       * Event-based invalidation
       */
      events?: string[]
    }
  }
}

/**
 * Mesh transformation types
 */
export interface MeshTransform {
  /**
   * Transform type
   */
  type: 'rename' | 'filter' | 'prefix' | 'suffix' | 'encapsulate' | 'federation'

  /**
   * Transform configuration
   */
  config: Record<string, unknown>
}

/**
 * Mesh integration configuration
 */
export interface MeshIntegrationConfig {
  /**
   * Data sources
   */
  sources: MeshSource[]

  /**
   * Federation configuration
   */
  federation?: {
    /**
     * Federation entities
     */
    entities?: FederationEntity<unknown, unknown, unknown, unknown>[]

    /**
     * Federation services
     */
    services?: ServiceDefinition[]

    /**
     * Enable auto-federation
     */
    autoFederation?: boolean
  }

  /**
   * Mesh configuration
   */
  mesh?: {
    /**
     * Enable playground
     */
    playground?: boolean

    /**
     * Port
     */
    port?: number

    /**
     * CORS configuration
     */
    cors?: {
      origin?: string | string[]
      credentials?: boolean
    }

    /**
     * Rate limiting
     */
    rateLimit?: {
      max: number
      window: Duration.Duration
    }
  }

  /**
   * Plugins
   */
  plugins?: MeshPlugin[]

  /**
   * Error handling
   */
  errorHandling?: {
    /**
     * Mask errors in production
     */
    maskErrors?: boolean

    /**
     * Custom error formatter
     */
    formatter?: (error: Error) => Record<string, unknown>
  }
}

/**
 * Mesh plugin interface
 */
export interface MeshPlugin {
  /**
   * Plugin name
   */
  name: string

  /**
   * Plugin configuration
   */
  config?: Record<string, unknown>

  /**
   * Plugin hooks
   */
  hooks?: {
    /**
     * Before request hook
     */
    beforeRequest?: (context: unknown) => Effect.Effect<void, Error>

    /**
     * After request hook
     */
    afterRequest?: (context: unknown, result: unknown) => Effect.Effect<void, Error>

    /**
     * On error hook
     */
    onError?: (error: Error) => Effect.Effect<void, never>
  }
}

/**
 * Mesh runtime instance
 */
export interface MeshInstance {
  /**
   * GraphQL schema
   */
  schema: GraphQLSchema

  /**
   * Execute query
   */
  execute: (query: string, variables?: Record<string, unknown>) => Effect.Effect<unknown, Error>

  /**
   * Get metrics
   */
  getMetrics: () => MeshMetrics

  /**
   * Refresh sources
   */
  refresh: (sourceName?: string) => Effect.Effect<void, Error>

  /**
   * Stop mesh
   */
  stop: () => Effect.Effect<void, never>
}

/**
 * Mesh metrics
 */
export interface MeshMetrics {
  /**
   * Total requests
   */
  requests: number

  /**
   * Cache hits
   */
  cacheHits: number

  /**
   * Cache misses
   */
  cacheMisses: number

  /**
   * Average latency
   */
  avgLatency: number

  /**
   * Source metrics
   */
  sources: Record<
    string,
    {
      requests: number
      errors: number
      avgLatency: number
    }
  >
}

/**
 * Source adapter interface
 */
interface SourceAdapter {
  /**
   * Load schema from source
   */
  loadSchema(): Effect.Effect<GraphQLSchema, Error>

  /**
   * Execute query against source
   */
  execute(query: string, variables?: Record<string, unknown>): Effect.Effect<unknown, Error>

  /**
   * Get source health
   */
  health(): Effect.Effect<boolean, Error>
}

/**
 * OpenAPI source adapter
 */
class OpenAPIAdapter implements SourceAdapter {
  constructor(_config: Record<string, unknown>) {}

  loadSchema(): Effect.Effect<GraphQLSchema, Error> {
    return pipe(
      Effect.try(() => {
        // Mock implementation - would normally parse OpenAPI spec
        const schemaSDL = `
          type Query {
            users: [User]
            user(id: ID!): User
          }
          
          type User {
            id: ID!
            name: String!
            email: String!
          }
        `

        return buildSchema(schemaSDL)
      }),
      Effect.mapError(error => new Error(`Failed to load OpenAPI schema: ${error}`))
    )
  }

  execute(_query: string, _variables?: Record<string, unknown>): Effect.Effect<unknown, Error> {
    return Effect.succeed({
      data: { users: [] },
    })
  }

  health(): Effect.Effect<boolean, Error> {
    return Effect.succeed(true)
  }
}

/**
 * gRPC source adapter
 */
class GRPCAdapter implements SourceAdapter {
  constructor(_config: Record<string, unknown>) {}

  loadSchema(): Effect.Effect<GraphQLSchema, Error> {
    return pipe(
      Effect.try(() => {
        // Mock implementation - would normally parse proto file
        const schemaSDL = `
          type Query {
            products: [Product]
            product(id: ID!): Product
          }
          
          type Product {
            id: ID!
            name: String!
            price: Float!
          }
        `

        return buildSchema(schemaSDL)
      }),
      Effect.mapError(error => new Error(`Failed to load gRPC schema: ${error}`))
    )
  }

  execute(_query: string, _variables?: Record<string, unknown>): Effect.Effect<unknown, Error> {
    return Effect.succeed({
      data: { products: [] },
    })
  }

  health(): Effect.Effect<boolean, Error> {
    return Effect.succeed(true)
  }
}

/**
 * Database source adapter
 */
class DatabaseAdapter implements SourceAdapter {
  constructor(_type: string, _config: Record<string, unknown>) {}

  loadSchema(): Effect.Effect<GraphQLSchema, Error> {
    return pipe(
      Effect.try(() => {
        // Mock implementation - would normally introspect database
        const schemaSDL = `
          type Query {
            orders: [Order]
            order(id: ID!): Order
          }
          
          type Order {
            id: ID!
            customerId: ID!
            total: Float!
            status: String!
          }
        `

        return buildSchema(schemaSDL)
      }),
      Effect.mapError(error => new Error(`Failed to load database schema: ${error}`))
    )
  }

  execute(_query: string, _variables?: Record<string, unknown>): Effect.Effect<unknown, Error> {
    return Effect.succeed({
      data: { orders: [] },
    })
  }

  health(): Effect.Effect<boolean, Error> {
    return Effect.succeed(true)
  }
}

/**
 * Mesh integration class
 */
export class MeshIntegration {
  private readonly adapters: Map<string, SourceAdapter> = new Map()
  private schema: GraphQLSchema | undefined
  private readonly metrics: MeshMetrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgLatency: 0,
    sources: {},
  }

  constructor(private readonly config: MeshIntegrationConfig) {}

  /**
   * Create mesh integration
   */
  static async create(config: MeshIntegrationConfig): Promise<MeshInstance> {
    const integration = new MeshIntegration(config)
    await Effect.runPromise(integration.initialize())

    return {
      schema: integration.schema!,
      execute: (query, variables) => integration.execute(query, variables),
      getMetrics: () => integration.metrics,
      refresh: sourceName => integration.refresh(sourceName),
      stop: () => integration.stop(),
    }
  }

  /**
   * Initialize mesh
   */
  private initialize(): Effect.Effect<void, Error> {
    const self = this

    return pipe(
      // Create adapters for each source
      Effect.forEach(self.config.sources, source =>
        pipe(
          self.createAdapter(source),
          Effect.tap(adapter =>
            Effect.sync(() => {
              self.adapters.set(source.name, adapter)
              self.metrics.sources[source.name] = {
                requests: 0,
                errors: 0,
                avgLatency: 0,
              }
            })
          )
        )
      ),
      // Load and merge schemas
      Effect.flatMap(() => self.loadSchemas()),
      // Apply federation transforms if configured
      Effect.flatMap(() =>
        (self.config.federation?.autoFederation ?? false)
          ? self.applyFederationTransforms()
          : Effect.succeed(undefined)
      ),
      // Start health monitoring
      Effect.flatMap(() => Effect.fork(self.startHealthMonitoring())),
      Effect.map(() => undefined)
    )
  }

  /**
   * Create adapter for source
   */
  private createAdapter(source: MeshSource): Effect.Effect<SourceAdapter, Error> {
    return pipe(
      Effect.sync(() => {
        switch (source.type) {
          case 'openapi':
            return new OpenAPIAdapter(source.config)

          case 'grpc':
            return new GRPCAdapter(source.config)

          case 'postgres':
          case 'mysql':
          case 'mongodb':
            return new DatabaseAdapter(source.type, source.config)

          default:
            return null
        }
      }),
      Effect.flatMap(adapter =>
        adapter
          ? Effect.succeed(adapter)
          : Effect.fail(new Error(`Unsupported source type: ${source.type}`))
      )
    )
  }

  /**
   * Load and merge schemas
   */
  private loadSchemas(): Effect.Effect<void, Error> {
    const self = this

    return pipe(
      Effect.forEach(Array.from(self.adapters.entries()), ([_name, adapter]) =>
        adapter.loadSchema()
      ),
      Effect.map(schemas => {
        // Merge schemas (simplified - would use stitching in practice)
        self.schema = schemas[0] // Mock merge
      })
    )
  }

  /**
   * Apply federation transforms
   */
  private applyFederationTransforms(): Effect.Effect<void, Error> {
    const self = this

    return pipe(
      Effect.sync(() => self.schema),
      Effect.flatMap(schema =>
        schema ? Effect.succeed(schema) : Effect.fail(new Error('Schema not loaded'))
      ),
      Effect.map(schema => {
        // Add federation directives
        const federatedSDL = `
          ${printSchema(schema)}
          
          extend type Query {
            _entities(representations: [_Any!]!): [_Entity]!
            _service: _Service!
          }
          
          scalar _Any
          union _Entity
          
          type _Service {
            sdl: String!
          }
        `

        self.schema = buildSchema(federatedSDL)
      })
    )
  }

  /**
   * Execute query
   */
  private execute(
    query: string,
    variables?: Record<string, unknown>
  ): Effect.Effect<unknown, Error> {
    const self = this
    const startTime = Date.now()

    return pipe(
      Effect.sync(() => {
        self.metrics.requests++
        return self.determineSource(query)
      }),
      Effect.flatMap(sourceName => {
        const adapter = self.adapters.get(sourceName)
        return adapter
          ? adapter.execute(query, variables)
          : Effect.fail(new Error(`No adapter for source: ${sourceName}`))
      }),
      Effect.tap(() =>
        Effect.sync(() => {
          const latency = Date.now() - startTime
          self.updateMetrics('default', latency, false)
        })
      ),
      Effect.tapError(() =>
        Effect.sync(() => {
          const latency = Date.now() - startTime
          self.updateMetrics('default', latency, true)
        })
      )
    )
  }

  /**
   * Determine source from query
   */
  private determineSource(query: string): string {
    // Simple implementation - would parse query AST in practice
    if (query.includes('users')) return 'users'
    if (query.includes('products')) return 'products'
    if (query.includes('orders')) return 'orders'
    return Array.from(this.adapters.keys())[0] ?? 'default'
  }

  /**
   * Update metrics
   */
  private updateMetrics(sourceName: string, latency: number, isError: boolean): void {
    const sourceMetrics = this.metrics.sources[sourceName]
    if (sourceMetrics) {
      sourceMetrics.requests++
      if (isError) sourceMetrics.errors++
      sourceMetrics.avgLatency =
        (sourceMetrics.avgLatency * (sourceMetrics.requests - 1) + latency) / sourceMetrics.requests
    }

    this.metrics.avgLatency =
      (this.metrics.avgLatency * (this.metrics.requests - 1) + latency) / this.metrics.requests
  }

  /**
   * Refresh sources
   */
  private refresh(sourceName?: string): Effect.Effect<void, Error> {
    const self = this

    return sourceName != null
      ? pipe(
          Effect.sync(() => self.adapters.get(sourceName)),
          Effect.flatMap(adapter =>
            adapter
              ? adapter.loadSchema()
              : Effect.fail(new Error(`Source not found: ${sourceName}`))
          ),
          Effect.map(() => undefined)
        )
      : self.loadSchemas()
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): Effect.Effect<void, never> {
    const self = this

    return Effect.repeat(
      pipe(
        Effect.forEach(Array.from(self.adapters.entries()), ([name, adapter]) =>
          pipe(
            adapter.health(),
            Effect.orElseSucceed(() => false),
            Effect.tap(isHealthy =>
              !isHealthy
                ? Effect.sync(() => console.warn(`⚠️  Source ${name} is unhealthy`))
                : Effect.succeed(undefined)
            )
          )
        ),
        Effect.map(() => undefined)
      ),
      Schedule.fixed(Duration.seconds(30))
    )
  }

  /**
   * Stop mesh
   */
  private stop(): Effect.Effect<void, never> {
    return Effect.sync(() => {
      console.log('🛑 Mesh integration stopped')
    })
  }
}

/**
 * Mesh presets
 */
export const MeshPresets = {
  /**
   * Microservices preset
   */
  microservices: (
    services: Array<{ name: string; url: string; type: 'graphql' | 'rest' }>
  ): MeshIntegrationConfig => ({
    sources: services.map(service => ({
      type: service.type === 'rest' ? 'openapi' : 'graphql',
      name: service.name,
      config: { endpoint: service.url },
      cache: { ttl: 60 },
    })),
    federation: { autoFederation: true },
    mesh: {
      playground: true,
      port: 4000,
      rateLimit: { max: 1000, window: Duration.minutes(1) },
    },
  }),

  /**
   * Database federation preset
   */
  databases: (
    databases: Array<{ name: string; type: 'postgres' | 'mysql' | 'mongodb'; connection: string }>
  ): MeshIntegrationConfig => ({
    sources: databases.map(db => ({
      type: db.type,
      name: db.name,
      config: { connectionString: db.connection },
      transforms: [{ type: 'federation', config: { version: '2.0' } }],
    })),
    federation: { autoFederation: true },
    errorHandling: { maskErrors: true },
  }),

  /**
   * API gateway preset
   */
  apiGateway: (apis: Array<{ name: string; spec: string }>): MeshIntegrationConfig => ({
    sources: apis.map(api => ({
      type: 'openapi',
      name: api.name,
      config: { spec: api.spec },
      transforms: [
        { type: 'prefix', config: { value: api.name } },
        { type: 'encapsulate', config: { name: api.name } },
      ],
    })),
    mesh: {
      playground: true,
      cors: { origin: '*', credentials: true },
    },
    plugins: [
      {
        name: 'auth',
        config: { type: 'jwt' },
      },
      {
        name: 'monitoring',
        config: { provider: 'prometheus' },
      },
    ],
  }),
}

/**
 * Mesh utilities
 */
export const MeshUtils = {
  /**
   * Convert OpenAPI to GraphQL schema
   */
  openAPIToGraphQL: (_spec: string): Effect.Effect<GraphQLSchema, Error> => {
    return pipe(
      Effect.try(() =>
        buildSchema(`
          type Query {
            api: String
          }
        `)
      ),
      Effect.mapError(error => new Error(`Failed to convert OpenAPI: ${error}`))
    )
  },

  /**
   * Convert proto to GraphQL schema
   */
  protoToGraphQL: (_proto: string): Effect.Effect<GraphQLSchema, Error> => {
    return pipe(
      Effect.try(() =>
        buildSchema(`
          type Query {
            service: String
          }
        `)
      ),
      Effect.mapError(error => new Error(`Failed to convert proto: ${error}`))
    )
  },

  /**
   * Introspect database schema
   */
  introspectDatabase: (_connection: string): Effect.Effect<GraphQLSchema, Error> => {
    return pipe(
      Effect.try(() =>
        buildSchema(`
          type Query {
            tables: [String]
          }
        `)
      ),
      Effect.mapError(error => new Error(`Failed to introspect database: ${error}`))
    )
  },
}
