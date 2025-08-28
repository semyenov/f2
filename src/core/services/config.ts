/**
 * Effect-based configuration service for Federation Framework v2
 * 
 * Provides type-safe configuration loading with validation
 */

import * as Effect from 'effect/Effect'
import * as Context from 'effect/Context'
import * as Layer from 'effect/Layer'
import * as Config from 'effect/Config'
import * as Schema from '@effect/schema/Schema'

// Configuration schema using Effect Schema for validation
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
      serviceName: 'federation-v2',
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
      host: yield* Config.string('SERVER_HOST').pipe(
        Config.withDefault(defaultConfig.server.host)
      ),
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
export const getObservabilityConfig = Effect.map(FederationConfigService, config => config.observability)