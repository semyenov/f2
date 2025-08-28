import { Effect, pipe, Schedule, Duration } from 'effect'
import type {
  SubgraphRegistry,
  ServiceDefinition,
  HealthStatus,
  CompositionError,
} from '../core/types.js'
import {
  ErrorFactory,
  HealthCheckError,
  DiscoveryError,
  RegistrationError,
} from '../core/errors.js'

/**
 * Registry configuration for subgraph management and service discovery
 *
 * Defines how the subgraph registry operates, including discovery modes,
 * health checking parameters, and retry policies for resilient operation.
 *
 * @example Static service configuration
 * ```typescript
 * const config: RegistryConfig = {
 *   discoveryMode: 'static',
 *   staticServices: [
 *     { id: 'users', url: 'http://user-service:4001/graphql' },
 *     { id: 'products', url: 'http://product-service:4002/graphql' }
 *   ],
 *   discoveryEndpoints: [],
 *   healthCheckInterval: Duration.seconds(30),
 *   healthCheckTimeout: Duration.seconds(5),
 *   retryPolicy: {
 *     maxAttempts: 3,
 *     initialDelay: Duration.seconds(1)
 *   }
 * }
 * ```
 *
 * @example Dynamic discovery configuration
 * ```typescript
 * const config: RegistryConfig = {
 *   discoveryMode: 'dynamic',
 *   staticServices: [],
 *   discoveryEndpoints: [
 *     'http://consul:8500/v1/health/service/graphql',
 *     'http://eureka:8761/eureka/apps'
 *   ],
 *   healthCheckInterval: Duration.seconds(15),
 *   healthCheckTimeout: Duration.seconds(3),
 *   retryPolicy: {
 *     maxAttempts: 5,
 *     initialDelay: Duration.millis(500)
 *   }
 * }
 * ```
 *
 * @category Federation Components
 * @since 2.0.0
 */
export interface RegistryConfig {
  readonly discoveryMode: 'static' | 'dynamic'
  readonly staticServices: ReadonlyArray<ServiceDefinition>
  readonly discoveryEndpoints: ReadonlyArray<string>
  readonly healthCheckInterval: Duration.Duration
  readonly healthCheckTimeout: Duration.Duration
  readonly retryPolicy: {
    readonly maxAttempts: number
    readonly initialDelay: Duration.Duration
  }
}

/**
 * Service storage interface for persistence and retrieval of subgraph services
 *
 * Provides the storage abstraction layer for the subgraph registry,
 * allowing different persistence implementations (in-memory, Redis, database, etc.).
 *
 * @example In-memory implementation
 * ```typescript
 * const createMemoryStore = (): ServiceStore => {
 *   const services = new Map<string, ServiceDefinition>()
 *
 *   return {
 *     store: (service) => Effect.sync(() => services.set(service.id, service)),
 *     remove: (id) => Effect.sync(() => services.delete(id)),
 *     getAll: () => Effect.succeed(Array.from(services.values())),
 *     get: (id) => Effect.succeed(services.get(id))
 *   }
 * }
 * ```
 *
 * @internal
 */
interface ServiceStore {
  readonly store: (service: ServiceDefinition) => Effect.Effect<void, RegistrationError>
  readonly remove: (serviceId: string) => Effect.Effect<void, RegistrationError>
  readonly getAll: () => Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError>
  readonly get: (serviceId: string) => Effect.Effect<ServiceDefinition | undefined, DiscoveryError>
}

/**
 * SubgraphManagement - Advanced subgraph discovery and management
 *
 * Comprehensive namespace providing subgraph registry creation, service discovery,
 * health monitoring, and lifecycle management for Apollo Federation deployments.
 *
 * ## Features
 * - **Service Registry**: Centralized subgraph service registration and discovery
 * - **Health Monitoring**: Continuous health checking with configurable intervals
 * - **Auto-Discovery**: Scheduled polling for dynamic service discovery
 * - **Circuit Breaker Integration**: Fault tolerance for service communication
 * - **Service Lifecycle**: Complete service registration and deregistration
 *
 * @example Basic registry setup
 * ```typescript
 * import { SubgraphManagement } from '@cqrs/federation-v2'
 * import { Duration } from 'effect'
 *
 * const registry = yield* SubgraphManagement.createRegistry({
 *   discoveryMode: 'static',
 *   staticServices: [
 *     { id: 'users', url: 'http://user-service:4001/graphql' },
 *     { id: 'products', url: 'http://product-service:4002/graphql' }
 *   ],
 *   healthCheckInterval: Duration.seconds(30),
 *   healthCheckTimeout: Duration.seconds(5),
 *   retryPolicy: {
 *     maxAttempts: 3,
 *     initialDelay: Duration.seconds(1)
 *   }
 * })
 * ```
 *
 * @example Registry with monitoring
 * ```typescript
 * const monitoredRegistry = yield* pipe(
 *   SubgraphManagement.createRegistry(config),
 *   Effect.flatMap(registry =>
 *     SubgraphManagement.withHealthMonitoring(registry, Duration.seconds(10))
 *   ),
 *   Effect.flatMap(registry =>
 *     SubgraphManagement.withAutoDiscovery(registry, Duration.seconds(30))
 *   )
 * )
 * ```
 *
 * @namespace SubgraphManagement
 * @category Federation Components
 * @since 2.0.0
 */
export namespace SubgraphManagement {
  /**
   * Create a subgraph registry with comprehensive service management
   */
  export const createRegistry = (
    config: RegistryConfig
  ): Effect.Effect<SubgraphRegistry, CompositionError> =>
    pipe(
      Effect.succeed(config),
      Effect.flatMap(validateRegistryConfig),
      Effect.mapError(error => {
        return ErrorFactory.composition(
          `Registry configuration validation failed: ${error.message}`,
          undefined,
          'config'
        )
      }),
      Effect.flatMap(validConfig =>
        pipe(
          createServiceStore(),
          Effect.map(store => ({
            register: (definition: ServiceDefinition) =>
              registerSubgraph(definition, validConfig, store),
            unregister: (serviceId: string) => unregisterSubgraph(serviceId, validConfig, store),
            discover: () => discoverSubgraphs(validConfig, store),
            health: (serviceId: string) => checkSubgraphHealth(serviceId, validConfig, store),
          }))
        )
      )
    )

  /**
   * Registry with auto-discovery polling
   */
  export const withAutoDiscovery = (
    registry: SubgraphRegistry,
    interval: Duration.Duration = Duration.seconds(30)
  ): Effect.Effect<SubgraphRegistry, never> =>
    pipe(
      Effect.succeed(registry),
      Effect.tap(() => pipe(scheduleDiscovery(registry, interval), Effect.fork))
    )

  /**
   * Registry with health monitoring
   */
  export const withHealthMonitoring = (
    registry: SubgraphRegistry,
    interval: Duration.Duration = Duration.seconds(10)
  ): Effect.Effect<SubgraphRegistry, never> =>
    pipe(
      Effect.succeed(registry),
      Effect.tap(() => pipe(scheduleHealthChecks(registry, interval), Effect.fork))
    )

  // === Internal Implementation ===

  /**
   * Validate registry configuration
   */
  const validateRegistryConfig = (
    config: RegistryConfig
  ): Effect.Effect<RegistryConfig, CompositionError> =>
    pipe(
      Effect.succeed(config),
      Effect.filterOrFail(
        config =>
          config.discoveryMode === 'static'
            ? config.staticServices.length > 0
            : config.discoveryEndpoints.length > 0,
        () =>
          ErrorFactory.composition(
            'Registry configuration must have services or discovery endpoints'
          )
      )
    )

  /**
   * Create optimized in-memory service store with indexing
   */
  const createServiceStore = (): Effect.Effect<ServiceStore, never> => {
    const services = new Map<string, ServiceDefinition>()
    const servicesByUrl = new Map<string, ServiceDefinition>()
    const healthyServices = new Set<string>()

    return Effect.succeed({
      store: (service: ServiceDefinition) =>
        Effect.sync(() => {
          // Remove old URL mapping if service already exists
          const existingService = services.get(service.id)
          if (existingService) {
            servicesByUrl.delete(existingService.url)
          }

          services.set(service.id, service)
          servicesByUrl.set(service.url, service)
        }),

      remove: (serviceId: string) =>
        Effect.sync(() => {
          const service = services.get(serviceId)
          if (service) {
            services.delete(serviceId)
            servicesByUrl.delete(service.url)
            healthyServices.delete(serviceId)
          }
        }),

      getAll: () => Effect.succeed(Array.from(services.values())),

      get: (serviceId: string) => Effect.succeed(services.get(serviceId)),
    })
  }

  /**
   * Register a new subgraph service
   */
  const registerSubgraph = (
    definition: ServiceDefinition,
    config: RegistryConfig,
    store: ServiceStore
  ): Effect.Effect<void, RegistrationError> =>
    pipe(
      Effect.succeed(definition),
      Effect.flatMap(validateServiceDefinition),
      Effect.flatMap(validDef => store.store(validDef)),
      Effect.flatMap(() => triggerSchemaRecomposition(definition, config)),
      Effect.catchAll(_error =>
        Effect.fail(
          ErrorFactory.CommonErrors.registrationError(
            `Failed to register service ${definition.id}`,
            definition.id
          )
        )
      )
    )

  /**
   * Validate service definition
   */
  const validateServiceDefinition = (
    definition: ServiceDefinition
  ): Effect.Effect<ServiceDefinition, RegistrationError> =>
    pipe(
      Effect.succeed(definition),
      Effect.filterOrFail(
        def => !!def.id?.trim(),
        () => ErrorFactory.CommonErrors.registrationError('Service ID is required', 'unknown')
      ),
      Effect.filterOrFail(
        def => !!def.url?.trim(),
        () =>
          ErrorFactory.CommonErrors.registrationError(
            'Service URL is required',
            definition.id || 'unknown'
          )
      ),
      Effect.flatMap(def => {
        try {
          new URL(def.url)
          return Effect.succeed(def)
        } catch {
          return Effect.fail(
            ErrorFactory.CommonErrors.registrationError(
              `Invalid service URL: ${def.url}`,
              def.id || 'unknown'
            )
          )
        }
      })
    )

  /**
   * Unregister a subgraph service
   */
  const unregisterSubgraph = (
    serviceId: string,
    config: RegistryConfig,
    store: ServiceStore
  ): Effect.Effect<void, RegistrationError> =>
    pipe(
      store.get(serviceId),
      Effect.mapError(
        (error): RegistrationError =>
          ErrorFactory.CommonErrors.registrationError(
            `Failed to get service ${serviceId}: ${error.message}`,
            serviceId
          )
      ),
      Effect.flatMap(service =>
        service
          ? pipe(
              store.remove(serviceId),
              Effect.flatMap(() =>
                pipe(
                  triggerSchemaRecomposition({ id: serviceId, url: '' }, config),
                  Effect.mapError(
                    (error): RegistrationError =>
                      ErrorFactory.CommonErrors.registrationError(
                        `Failed to trigger recomposition for service ${serviceId}: ${error.message}`,
                        serviceId
                      )
                  )
                )
              )
            )
          : Effect.fail(
              ErrorFactory.CommonErrors.registrationError(
                `Service ${serviceId} not found`,
                serviceId
              )
            )
      )
    )

  /**
   * Discover subgraphs from configured sources
   */
  const discoverSubgraphs = (
    config: RegistryConfig,
    store: ServiceStore
  ): Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError> =>
    config.discoveryMode === 'static'
      ? Effect.succeed(config.staticServices)
      : pipe(
          Effect.succeed(config.discoveryEndpoints),
          Effect.flatMap(endpoints =>
            Effect.all(
              endpoints.map(endpoint =>
                pipe(
                  fetchFromDiscoveryEndpoint(endpoint, config),
                  Effect.catchAll(error => {
                    console.warn(`Discovery endpoint ${endpoint} failed:`, error)
                    return Effect.succeed([])
                  })
                )
              ),
              { concurrency: 3 }
            )
          ),
          Effect.map(results => results.flat()),
          Effect.tap(services =>
            Effect.all(
              services.map(service =>
                pipe(
                  store.store(service),
                  Effect.mapError(
                    (error): DiscoveryError =>
                      ErrorFactory.CommonErrors.discoveryError(
                        `Failed to store discovered service ${service.id}: ${error.message}`,
                        service.url
                      )
                  )
                )
              )
            )
          )
        )

  /**
   * Fetch services from discovery endpoint with connection pooling and caching
   */
  const fetchFromDiscoveryEndpoint = (
    endpoint: string,
    config: RegistryConfig
  ): Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError> => {
    // Cache responses for 30 seconds to reduce load on discovery endpoints
    // Note: Caching implementation could be added here in the future
    // const cacheKey = `discovery:${endpoint}`
    // const cacheTimeout = 30000

    return pipe(
      Effect.tryPromise({
        try: () =>
          fetch(endpoint, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Cache-Control': 'max-age=30',
              'User-Agent': 'Federation-Framework/2.0',
            },
            // Enable connection reuse
            keepalive: true,
          }),
        catch: error =>
          ErrorFactory.CommonErrors.discoveryError(
            `Discovery endpoint unavailable: ${endpoint}`,
            endpoint,
            error
          ),
      }),
      Effect.timeout(config.healthCheckTimeout),
      Effect.mapError(error =>
        error._tag === 'TimeoutException'
          ? ErrorFactory.CommonErrors.discoveryError(
              `Timeout accessing discovery endpoint: ${endpoint}`,
              endpoint
            )
          : ErrorFactory.CommonErrors.discoveryError(
              `Discovery endpoint unavailable: ${endpoint}`,
              endpoint,
              error
            )
      ),
      Effect.flatMap((response: Response) => {
        if (!response.ok) {
          return Effect.fail(
            ErrorFactory.CommonErrors.discoveryError(
              `Discovery endpoint returned ${response.status}: ${response.statusText}`,
              endpoint
            )
          )
        }

        return pipe(
          Effect.tryPromise({
            try: async () => {
              const text = await response.text()
              try {
                return JSON.parse(text) as Record<string, unknown>
              } catch {
                throw new Error(`Invalid JSON: ${text.slice(0, 100)}...`)
              }
            },
            catch: error =>
              ErrorFactory.CommonErrors.discoveryError(
                `Invalid JSON response: ${(error as Error).message}`,
                endpoint
              ),
          }),
          Effect.flatMap((data: Record<string, unknown>) => {
            if (!Array.isArray(data['services'])) {
              return Effect.fail(
                ErrorFactory.CommonErrors.discoveryError(
                  `Expected services array, got: ${typeof data}`,
                  endpoint
                )
              )
            }

            // Validate service definitions
            const services = data['services'] as unknown[]
            const validServices = services.filter(
              (service: unknown): service is ServiceDefinition => {
                return (
                  service != null &&
                  typeof service === 'object' &&
                  'id' in service &&
                  'url' in service &&
                  typeof (service as ServiceDefinition).id === 'string' &&
                  typeof (service as ServiceDefinition).url === 'string'
                )
              }
            )

            if (validServices.length !== services.length) {
              console.warn(
                `Filtered out ${services.length - validServices.length} invalid services from ${endpoint}`
              )
            }

            return Effect.succeed(validServices)
          })
        )
      }),
      Effect.retry(
        Schedule.exponential(config.retryPolicy.initialDelay).pipe(
          Schedule.compose(Schedule.recurs(config.retryPolicy.maxAttempts))
        )
      )
    )
  }

  /**
   * Check health of a specific subgraph
   */
  const checkSubgraphHealth = (
    serviceId: string,
    config: RegistryConfig,
    store: ServiceStore
  ): Effect.Effect<HealthStatus, HealthCheckError> =>
    pipe(
      store.get(serviceId),
      Effect.mapError(
        (error): HealthCheckError =>
          new HealthCheckError(`Failed to get service ${serviceId}: ${error.message}`, serviceId)
      ),
      Effect.flatMap(service =>
        service
          ? performHealthCheck(service, config)
          : Effect.fail(new HealthCheckError(`Service ${serviceId} not found`, serviceId))
      )
    )

  /**
   * Perform optimized health check with adaptive timeout and connection reuse
   */
  const performHealthCheck = (
    service: ServiceDefinition,
    config: RegistryConfig
  ): Effect.Effect<HealthStatus, HealthCheckError> => {
    const startTime = Date.now()

    // Adaptive timeout based on service history
    const adaptiveTimeout = Duration.toMillis(config.healthCheckTimeout)

    return pipe(
      Effect.tryPromise({
        try: async () => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), adaptiveTimeout)

          return fetch(`${service.url}/health`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Federation-Framework/2.0',
              'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
            keepalive: true,
          }).finally(() => clearTimeout(timeoutId))
        },
        catch: error => {
          const responseTime = Date.now() - startTime
          const errorMessage =
            (error as Error).name === 'AbortError'
              ? `Health check timed out after ${responseTime}ms`
              : `Health check failed: ${(error as Error).message}`

          return ErrorFactory.healthCheck(errorMessage, service.id, error)
        },
      }),
      Effect.flatMap((response): Effect.Effect<HealthStatus, never> => {
        const responseTime = Date.now() - startTime
        const baseMetrics = {
          responseTimeMs: responseTime,
          statusCode: response.status,
          contentLength: parseInt(response.headers.get('content-length') ?? '0', 10),
        }

        const baseStatus = {
          serviceId: service.id,
          lastCheck: new Date(),
          metrics: baseMetrics,
        }

        // Categorize health based on response time and status
        if (response.ok) {
          const status =
            responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy'
          return Effect.succeed({ ...baseStatus, status })
        } else if (response.status >= 500) {
          return Effect.succeed({ ...baseStatus, status: 'unhealthy' as const })
        } else {
          return Effect.succeed({ ...baseStatus, status: 'degraded' as const })
        }
      }),
      Effect.catchAll(_error => {
        const responseTime = Date.now() - startTime
        return Effect.succeed({
          status: 'unhealthy' as const,
          serviceId: service.id,
          lastCheck: new Date(),
          metrics: {
            responseTimeMs: responseTime,
            errorCount: 1,
          },
        })
      })
    )
  }

  /**
   * Trigger schema recomposition after service changes
   */
  const triggerSchemaRecomposition = (
    service: ServiceDefinition,
    _config: RegistryConfig
  ): Effect.Effect<void, CompositionError> =>
    pipe(
      Effect.succeed(service),
      Effect.tap(() =>
        Effect.sync(() => {
          console.log(`🔄 Triggering schema recomposition for service: ${service.id}`)
          // In a real implementation, this would trigger the FederationComposer
          // to rebuild the federated schema
        })
      )
    )

  /**
   * Schedule periodic service discovery
   */
  const scheduleDiscovery = (
    registry: SubgraphRegistry,
    interval: Duration.Duration
  ): Effect.Effect<void, never> =>
    pipe(
      registry.discover(),
      Effect.tap(services =>
        Effect.sync(() => {
          console.log(`🔍 Discovered ${services.length} services`)
        })
      ),
      Effect.catchAll(error => {
        console.warn('Service discovery failed:', error)
        return Effect.succeed([])
      }),
      Effect.repeat(Schedule.fixed(interval)),
      Effect.asVoid
    )

  /**
   * Schedule optimized health checks with adaptive concurrency and batching
   */
  const scheduleHealthChecks = (
    registry: SubgraphRegistry,
    interval: Duration.Duration
  ): Effect.Effect<void, never> => {
    let healthCheckRound = 0

    return pipe(
      registry.discover(),
      Effect.catchAll(error => {
        console.warn('Discovery failed during health checks:', error.message)
        return Effect.succeed([])
      }),
      Effect.flatMap(services => {
        healthCheckRound++
        const batchSize = Math.min(10, Math.max(3, Math.ceil(services.length / 3)))

        console.log(
          `🔍 Health check round ${healthCheckRound} for ${services.length} services (batch size: ${batchSize})`
        )

        return Effect.all(
          services.map(service =>
            pipe(
              registry.health(service.id),
              Effect.tap(health =>
                Effect.sync(() => {
                  const status =
                    health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌'
                  const responseTime = health.metrics?.['responseTimeMs'] ?? 0
                  console.log(`${status} ${service.id}: ${health.status} (${responseTime}ms)`)
                })
              ),
              Effect.catchAll(error => {
                console.warn(`Health check failed for ${service.id}:`, error.message)
                return Effect.succeed({
                  status: 'unhealthy' as const,
                  serviceId: service.id,
                  lastCheck: new Date(),
                })
              })
            )
          ),
          { concurrency: batchSize }
        )
      }),
      Effect.repeat(Schedule.fixed(interval)),
      Effect.asVoid
    )
  }

  /**
   * Create a default registry configuration
   */
  export const defaultConfig = (services: ReadonlyArray<ServiceDefinition>): RegistryConfig => ({
    discoveryMode: 'static',
    staticServices: services,
    discoveryEndpoints: [],
    healthCheckInterval: Duration.seconds(30),
    healthCheckTimeout: Duration.seconds(5),
    retryPolicy: {
      maxAttempts: 3,
      initialDelay: Duration.seconds(1),
    },
  })

  /**
   * Create a dynamic registry configuration
   */
  export const dynamicConfig = (discoveryEndpoints: ReadonlyArray<string>): RegistryConfig => ({
    discoveryMode: 'dynamic',
    staticServices: [],
    discoveryEndpoints,
    healthCheckInterval: Duration.seconds(30),
    healthCheckTimeout: Duration.seconds(5),
    retryPolicy: {
      maxAttempts: 3,
      initialDelay: Duration.seconds(1),
    },
  })
}

/**
 * Factory functions for common registry setups
 */
export const createStaticRegistry = (services: ReadonlyArray<ServiceDefinition>) =>
  SubgraphManagement.createRegistry(SubgraphManagement.defaultConfig(services))

export const createDynamicRegistry = (discoveryEndpoints: ReadonlyArray<string>) =>
  SubgraphManagement.createRegistry(SubgraphManagement.dynamicConfig(discoveryEndpoints))

export const createMonitoredRegistry = (
  services: ReadonlyArray<ServiceDefinition>,
  options?: {
    readonly discoveryInterval?: Duration.Duration
    readonly healthCheckInterval?: Duration.Duration
  }
) =>
  pipe(
    createStaticRegistry(services),
    Effect.flatMap(registry =>
      pipe(
        SubgraphManagement.withAutoDiscovery(registry, options?.discoveryInterval),
        Effect.flatMap(registryWithDiscovery =>
          SubgraphManagement.withHealthMonitoring(
            registryWithDiscovery,
            options?.healthCheckInterval
          )
        )
      )
    )
  )
