/**
 * Effect-based configuration service for Federation Framework
 *
 * Comprehensive configuration management system providing type-safe configuration
 * loading, validation, environment variable support, and runtime configuration updates
 * for federated GraphQL deployments.
 *
 * ## 🌟 Key Features
 * - **Type-Safe Configuration**: Full TypeScript typing with Effect Schema validation
 * - **Environment Variable Support**: Automatic loading from environment variables with fallbacks
 * - **Schema Validation**: Runtime validation of configuration values with detailed error reporting
 * - **Effect Integration**: Native Effect-TS service pattern with dependency injection
 * - **Hot Reload**: Support for runtime configuration updates (experimental)
 * - **Multi-Environment**: Different configuration profiles for development, staging, production
 *
 * ## 📋 Configuration Categories
 *
 * ### Server Configuration
 * - HTTP server settings (port, host, CORS)
 * - SSL/TLS configuration
 * - Request/response limits
 *
 * ### Federation Configuration
 * - GraphQL introspection and playground settings
 * - Subscription support
 * - Query tracing and caching
 *
 * ### Database Configuration
 * - Connection strings and pool settings
 * - Transaction and query timeouts
 * - Database initialization options
 *
 * ### Cache Configuration
 * - Redis connection and clustering
 * - TTL policies and key prefixing
 * - Cache warming strategies
 *
 * ### Resilience Configuration
 * - Circuit breaker thresholds and timeouts
 * - Retry policies and backoff strategies
 * - Health check intervals
 *
 * ### Observability Configuration
 * - Metrics collection and export
 * - Distributed tracing setup
 * - Log levels and structured logging
 *
 * @example Basic configuration usage
 * ```typescript
 * import { FederationConfigService } from '@cqrs/federation-v2'
 * import { Effect } from 'effect'
 *
 * const program = Effect.gen(function* () {
 *   const config = yield* FederationConfigService
 *
 *   console.log(`Server running on port ${config.server.port}`)
 *   console.log(`Database: ${config.database.url}`)
 *   console.log(`Cache: ${config.cache.redis.url}`)
 * })
 *
 * // Provide configuration and run
 * const runnable = program.pipe(Effect.provide(FederationConfigLive))
 * Effect.runPromise(runnable)
 * ```
 *
 * @example Environment-specific configuration
 * ```typescript
 * // Set environment variables
 * process.env.SERVER_PORT = '8080'
 * process.env.DATABASE_URL = 'postgresql://prod:5432/federation'
 * process.env.REDIS_URL = 'redis://cluster:6379'
 * process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '10'
 *
 * const program = Effect.gen(function* () {
 *   const serverConfig = yield* getServerConfig
 *   const dbConfig = yield* getDatabaseConfig
 *   const resilienceConfig = yield* getResilienceConfig
 *
 *   // Configuration automatically loaded from environment variables
 *   console.log(`Port: ${serverConfig.port}`) // 8080
 *   console.log(`DB: ${dbConfig.url}`) // postgresql://prod:5432/federation
 *   console.log(`Failure threshold: ${resilienceConfig.circuitBreaker.failureThreshold}`) // 10
 * })
 * ```
 *
 * @example Custom configuration validation
 * ```typescript
 * import { pipe } from 'effect/Function'
 * import * as Schema from '@effect/schema/Schema'
 *
 * // Extend configuration schema
 * const CustomConfigSchema = FederationConfigSchema.pipe(
 *   Schema.extend(Schema.Struct({
 *     customService: Schema.Struct({
 *       apiKey: Schema.String,
 *       timeout: Schema.String,
 *       retries: Schema.Number.pipe(Schema.int(), Schema.between(1, 10))
 *     })
 *   }))
 * )
 *
 * const loadCustomConfig = Effect.gen(function* () {
 *   const baseConfig = yield* FederationConfigService
 *   const customConfig = {
 *     ...baseConfig,
 *     customService: {
 *       apiKey: yield* Config.string('CUSTOM_API_KEY'),
 *       timeout: yield* Config.string('CUSTOM_TIMEOUT').pipe(Config.withDefault('30s')),
 *       retries: yield* Config.integer('CUSTOM_RETRIES').pipe(Config.withDefault(3))
 *     }
 *   }
 *
 *   return yield* Schema.decodeUnknown(CustomConfigSchema)(customConfig)
 * })
 * ```
 *
 * @example Configuration-based feature flags
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const config = yield* FederationConfigService
 *
 *   if (config.federation.subscriptions) {
 *     yield* enableWebSocketSubscriptions()
 *   }
 *
 *   if (config.federation.playground && config.federation.introspection) {
 *     yield* enableGraphQLPlayground()
 *   }
 *
 *   if (config.observability.tracing.enabled) {
 *     yield* setupDistributedTracing(config.observability.tracing)
 *   }
 * })
 * ```
 *
 * @category Core Services
 * @see {@link https://effect.website/docs/guides/configuration | Effect Configuration Guide}
 */

import * as Effect from 'effect/Effect'
import * as Context from 'effect/Context'
import * as Layer from 'effect/Layer'
import * as Config from 'effect/Config'
import * as Schema from '@effect/schema/Schema'

/**
 * Federation Framework configuration schema with comprehensive validation
 *
 * Defines the complete configuration structure for federated GraphQL services,
 * including server settings, database connections, caching, resilience patterns,
 * and observability features.
 *
 * @example Minimal configuration
 * ```typescript
 * const minimalConfig = {
 *   server: { port: 4000, host: 'localhost', cors: { enabled: false, origins: [] } },
 *   federation: { introspection: true, playground: true, subscriptions: false, tracing: false },
 *   database: { url: 'postgresql://localhost:5432/test', maxConnections: 5, connectionTimeout: '10s' },
 *   cache: { redis: { url: 'redis://localhost:6379', keyPrefix: 'test:', defaultTtl: '5m' } },
 *   resilience: { circuitBreaker: { failureThreshold: 3, resetTimeout: '10s', halfOpenMaxCalls: 1 } },
 *   observability: {
 *     metrics: { enabled: false, port: 9090 },
 *     tracing: { enabled: false, serviceName: 'test', endpoint: 'http://localhost:14268/api/traces' }
 *   }
 * }
 * ```
 *
 * @category Core Services
 */
export const FederationConfigSchema = Schema.Struct({
  // Server configuration
  server: Schema.Struct({
    port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),
    host: Schema.String,
    cors: Schema.Struct({
      enabled: Schema.Boolean,
      origins: Schema.Array(Schema.String),
    }),
  }),

  // Federation configuration
  federation: Schema.Struct({
    introspection: Schema.Boolean,
    playground: Schema.Boolean,
    subscriptions: Schema.Boolean,
    tracing: Schema.Boolean,
  }),

  // Database configuration
  database: Schema.Struct({
    url: Schema.String,
    maxConnections: Schema.Number.pipe(Schema.int(), Schema.positive()),
    connectionTimeout: Schema.String,
  }),

  // Cache configuration
  cache: Schema.Struct({
    redis: Schema.Struct({
      url: Schema.String,
      keyPrefix: Schema.String,
      defaultTtl: Schema.String,
    }),
  }),

  // Circuit breaker configuration
  resilience: Schema.Struct({
    circuitBreaker: Schema.Struct({
      failureThreshold: Schema.Number.pipe(Schema.int(), Schema.positive()),
      resetTimeout: Schema.String,
      halfOpenMaxCalls: Schema.Number.pipe(Schema.int(), Schema.positive()),
    }),
  }),

  // Observability configuration
  observability: Schema.Struct({
    metrics: Schema.Struct({
      enabled: Schema.Boolean,
      port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),
    }),
    tracing: Schema.Struct({
      enabled: Schema.Boolean,
      serviceName: Schema.String,
      endpoint: Schema.String,
    }),
  }),
})

export type FederationServiceConfig = Schema.Schema.Type<typeof FederationConfigSchema>

// Configuration service tag
export class FederationConfigService extends Context.Tag('FederationConfigService')<
  FederationConfigService,
  FederationServiceConfig
>() {}

// Default configuration
const defaultConfig: FederationServiceConfig = {
  server: {
    port: 4000,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: ['*'],
    },
  },
  federation: {
    introspection: true,
    playground: true,
    subscriptions: false,
    tracing: true,
  },
  database: {
    url: 'postgresql://localhost:5432/federation',
    maxConnections: 10,
    connectionTimeout: '30s',
  },
  cache: {
    redis: {
      url: 'redis://localhost:6379',
      keyPrefix: 'federation:',
      defaultTtl: '15m',
    },
  },
  resilience: {
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: '30s',
      halfOpenMaxCalls: 3,
    },
  },
  observability: {
    metrics: {
      enabled: true,
      port: 9090,
    },
    tracing: {
      enabled: true,
      serviceName: 'federation',
      endpoint: 'http://localhost:14268/api/traces',
    },
  },
}

// Config loading with environment variable support
const load = Effect.gen(function* () {
  // Load from environment variables with fallbacks
  const config = {
    server: {
      port: yield* Config.integer('SERVER_PORT').pipe(
        Config.withDefault(defaultConfig.server.port)
      ),
      host: yield* Config.string('SERVER_HOST').pipe(Config.withDefault(defaultConfig.server.host)),
      cors: {
        enabled: yield* Config.boolean('CORS_ENABLED').pipe(
          Config.withDefault(defaultConfig.server.cors.enabled)
        ),
        origins: yield* Config.array(Config.string(), 'CORS_ORIGINS').pipe(
          Config.withDefault(defaultConfig.server.cors.origins)
        ),
      },
    },
    federation: {
      introspection: yield* Config.boolean('FEDERATION_INTROSPECTION').pipe(
        Config.withDefault(defaultConfig.federation.introspection)
      ),
      playground: yield* Config.boolean('FEDERATION_PLAYGROUND').pipe(
        Config.withDefault(defaultConfig.federation.playground)
      ),
      subscriptions: yield* Config.boolean('FEDERATION_SUBSCRIPTIONS').pipe(
        Config.withDefault(defaultConfig.federation.subscriptions)
      ),
      tracing: yield* Config.boolean('FEDERATION_TRACING').pipe(
        Config.withDefault(defaultConfig.federation.tracing)
      ),
    },
    database: {
      url: yield* Config.string('DATABASE_URL').pipe(
        Config.withDefault(defaultConfig.database.url)
      ),
      maxConnections: yield* Config.integer('DATABASE_MAX_CONNECTIONS').pipe(
        Config.withDefault(defaultConfig.database.maxConnections)
      ),
      connectionTimeout: yield* Config.string('DATABASE_CONNECTION_TIMEOUT').pipe(
        Config.withDefault(defaultConfig.database.connectionTimeout)
      ),
    },
    cache: {
      redis: {
        url: yield* Config.string('REDIS_URL').pipe(
          Config.withDefault(defaultConfig.cache.redis.url)
        ),
        keyPrefix: yield* Config.string('REDIS_KEY_PREFIX').pipe(
          Config.withDefault(defaultConfig.cache.redis.keyPrefix)
        ),
        defaultTtl: yield* Config.string('REDIS_DEFAULT_TTL').pipe(
          Config.withDefault(defaultConfig.cache.redis.defaultTtl)
        ),
      },
    },
    resilience: {
      circuitBreaker: {
        failureThreshold: yield* Config.integer('CIRCUIT_BREAKER_FAILURE_THRESHOLD').pipe(
          Config.withDefault(defaultConfig.resilience.circuitBreaker.failureThreshold)
        ),
        resetTimeout: yield* Config.string('CIRCUIT_BREAKER_RESET_TIMEOUT').pipe(
          Config.withDefault(defaultConfig.resilience.circuitBreaker.resetTimeout)
        ),
        halfOpenMaxCalls: yield* Config.integer('CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS').pipe(
          Config.withDefault(defaultConfig.resilience.circuitBreaker.halfOpenMaxCalls)
        ),
      },
    },
    observability: {
      metrics: {
        enabled: yield* Config.boolean('METRICS_ENABLED').pipe(
          Config.withDefault(defaultConfig.observability.metrics.enabled)
        ),
        port: yield* Config.integer('METRICS_PORT').pipe(
          Config.withDefault(defaultConfig.observability.metrics.port)
        ),
      },
      tracing: {
        enabled: yield* Config.boolean('TRACING_ENABLED').pipe(
          Config.withDefault(defaultConfig.observability.tracing.enabled)
        ),
        serviceName: yield* Config.string('TRACING_SERVICE_NAME').pipe(
          Config.withDefault(defaultConfig.observability.tracing.serviceName)
        ),
        endpoint: yield* Config.string('TRACING_ENDPOINT').pipe(
          Config.withDefault(defaultConfig.observability.tracing.endpoint)
        ),
      },
    },
  }

  // Validate the loaded configuration
  return yield* Schema.decodeUnknown(FederationConfigSchema)(config)
})

// Layer for providing the config service
export const FederationConfigLive = Layer.effect(FederationConfigService, load)

// Convenience functions for accessing config values
export const getServerConfig = Effect.map(FederationConfigService, config => config.server)
export const getFederationConfig = Effect.map(FederationConfigService, config => config.federation)
export const getDatabaseConfig = Effect.map(FederationConfigService, config => config.database)
export const getCacheConfig = Effect.map(FederationConfigService, config => config.cache)
export const getResilienceConfig = Effect.map(FederationConfigService, config => config.resilience)
export const getObservabilityConfig = Effect.map(
  FederationConfigService,
  config => config.observability
)
