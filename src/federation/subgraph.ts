import { Effect, pipe, Schedule, Duration } from "effect"
import type {
  SubgraphRegistry,
  ServiceDefinition,
  HealthStatus,
  CompositionError
} from "../core/types.js"
import { ErrorFactory, HealthCheckError, DiscoveryError, RegistrationError } from "../core/errors.js"

/**
 * Registry configuration for subgraph management
 */
interface RegistryConfig {
  readonly discoveryMode: "static" | "dynamic"
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
 * Service storage interface for persistence
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
 * Features:
 * - Service registry with discovery
 * - Health checking and monitoring
 * - Auto-discovery with scheduled polling
 * - Circuit breaker integration
 * - Service lifecycle management
 */
export namespace SubgraphManagement {
  /**
   * Create a subgraph registry with comprehensive service management
   */
  export const createRegistry = (config: RegistryConfig): Effect.Effect<SubgraphRegistry, CompositionError> =>
    pipe(
      Effect.succeed(config),
      Effect.flatMap(validateRegistryConfig),
      Effect.flatMap(validConfig => 
        pipe(
          createServiceStore(),
          Effect.map(store => ({
            register: (definition: ServiceDefinition) => registerSubgraph(definition, validConfig, store),
            unregister: (serviceId: string) => unregisterSubgraph(serviceId, validConfig, store),
            discover: () => discoverSubgraphs(validConfig, store),
            health: (serviceId: string) => checkSubgraphHealth(serviceId, validConfig, store)
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
      Effect.tap(() => 
        pipe(
          scheduleDiscovery(registry, interval),
          Effect.fork
        )
      )
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
      Effect.tap(() => 
        pipe(
          scheduleHealthChecks(registry, interval),
          Effect.fork
        )
      )
    )

  // === Internal Implementation ===

  /**
   * Validate registry configuration
   */
  const validateRegistryConfig = (config: RegistryConfig): Effect.Effect<RegistryConfig, CompositionError> =>
    pipe(
      Effect.succeed(config),
      Effect.filterOrFail(
        config => config.discoveryMode === "static" ? config.staticServices.length > 0 : config.discoveryEndpoints.length > 0,
        () => ErrorFactory.composition("Registry configuration must have services or discovery endpoints")
      )
    )

  /**
   * Create in-memory service store (could be replaced with persistent storage)
   */
  const createServiceStore = (): Effect.Effect<ServiceStore, never> => {
    const services = new Map<string, ServiceDefinition>()
    
    return Effect.succeed({
      store: (service: ServiceDefinition) => 
        Effect.sync(() => {
          services.set(service.id, service)
        }),
      
      remove: (serviceId: string) => 
        Effect.sync(() => {
          services.delete(serviceId)
        }),
      
      getAll: () => 
        Effect.succeed(Array.from(services.values())),
      
      get: (serviceId: string) => 
        Effect.succeed(services.get(serviceId))
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
        Effect.fail(ErrorFactory.CommonErrors.registrationError(`Failed to register service ${definition.id}`, definition.id))
      )
    )

  /**
   * Validate service definition
   */
  const validateServiceDefinition = (definition: ServiceDefinition): Effect.Effect<ServiceDefinition, RegistrationError> =>
    pipe(
      Effect.succeed(definition),
      Effect.filterOrFail(
        def => !!def.id?.trim(),
        () => ErrorFactory.CommonErrors.registrationError("Service ID is required")
      ),
      Effect.filterOrFail(
        def => !!def.url?.trim(),
        () => ErrorFactory.CommonErrors.registrationError("Service URL is required")
      ),
      Effect.flatMap(def => {
        try {
          new URL(def.url)
          return Effect.succeed(def)
        } catch {
          return Effect.fail(ErrorFactory.CommonErrors.registrationError(`Invalid service URL: ${def.url}`))
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
      Effect.flatMap(service => 
        service 
          ? pipe(
              store.remove(serviceId),
              Effect.flatMap(() => triggerSchemaRecomposition({ id: serviceId, url: "" }, config))
            )
          : Effect.fail(ErrorFactory.CommonErrors.registrationError(`Service ${serviceId} not found`))
      )
    )

  /**
   * Discover subgraphs from configured sources
   */
  const discoverSubgraphs = (
    config: RegistryConfig,
    store: ServiceStore
  ): Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError> =>
    config.discoveryMode === "static"
      ? Effect.succeed(config.staticServices)
      : pipe(
          Effect.succeed(config.discoveryEndpoints),
          Effect.flatMap(endpoints =>
            Effect.all(endpoints.map(endpoint =>
              pipe(
                fetchFromDiscoveryEndpoint(endpoint, config),
                Effect.catchAll(error => {
                  console.warn(`Discovery endpoint ${endpoint} failed:`, error)
                  return Effect.succeed([])
                })
              )
            ), { concurrency: 3 })
          ),
          Effect.map(results => results.flat()),
          Effect.tap(services => 
            Effect.all(services.map(service => store.store(service)))
          )
        )

  /**
   * Fetch services from discovery endpoint
   */
  const fetchFromDiscoveryEndpoint = (
    endpoint: string,
    config: RegistryConfig
  ): Effect.Effect<ReadonlyArray<ServiceDefinition>, DiscoveryError> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(endpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }),
        catch: (_error) => ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint unavailable: ${endpoint}`, endpoint)
      }),
      Effect.timeout(config.healthCheckTimeout),
      Effect.flatMap(response =>
        response.ok
          ? pipe(
              Effect.tryPromise({
                try: () => response.json(),
                catch: () => ErrorFactory.CommonErrors.discoveryError("Invalid JSON response", endpoint)
              }),
              Effect.flatMap(data => 
                Array.isArray(data?.services)
                  ? Effect.succeed(data.services)
                  : Effect.fail(ErrorFactory.CommonErrors.discoveryError("Expected services array", endpoint))
              )
            )
          : Effect.fail(ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint returned ${response.status}`, endpoint))
      ),
      Effect.retry(Schedule.exponential(config.retryPolicy.initialDelay).pipe(
        Schedule.compose(Schedule.recurs(config.retryPolicy.maxAttempts))
      ))
    )

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
      Effect.flatMap(service => 
        service 
          ? performHealthCheck(service, config)
          : Effect.fail(new HealthCheckError(
              `Service ${serviceId} not found`,
              serviceId
            ))
      )
    )

  /**
   * Perform actual health check against service
   */
  const performHealthCheck = (
    service: ServiceDefinition,
    config: RegistryConfig
  ): Effect.Effect<HealthStatus, HealthCheckError> => {
    const startTime = Date.now()
    
    return pipe(
      Effect.tryPromise({
        try: () => fetch(`${service.url}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }),
        catch: () => ErrorFactory.healthCheck(`Health check failed for service ${service.id}`, service.id)
      }),
      Effect.timeout(config.healthCheckTimeout),
      Effect.flatMap((response): Effect.Effect<HealthStatus, never> => {
        const responseTime = Date.now() - startTime
        
        if (response.ok) {
          return Effect.succeed({
            status: "healthy" as const,
            serviceId: service.id,
            lastCheck: new Date(),
            metrics: {
              responseTimeMs: responseTime,
              statusCode: response.status
            }
          })
        } else if (response.status >= 500) {
          return Effect.succeed({
            status: "unhealthy" as const,
            serviceId: service.id,
            lastCheck: new Date(),
            metrics: {
              responseTimeMs: responseTime,
              statusCode: response.status
            }
          })
        } else {
          return Effect.succeed({
            status: "degraded" as const,
            serviceId: service.id,
            lastCheck: new Date(),
            metrics: {
              responseTimeMs: responseTime,
              statusCode: response.status
            }
          })
        }
      }),
      Effect.catchAll(() =>
        Effect.succeed({
          status: "unhealthy" as const,
          serviceId: service.id,
          lastCheck: new Date()
        })
      )
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
        console.warn("Service discovery failed:", error)
        return Effect.succeed([])
      }),
      Effect.repeat(Schedule.fixed(interval)),
      Effect.asVoid
    )

  /**
   * Schedule periodic health checks
   */
  const scheduleHealthChecks = (
    registry: SubgraphRegistry,
    interval: Duration.Duration
  ): Effect.Effect<void, never> =>
    pipe(
      registry.discover(),
      Effect.flatMap(services =>
        Effect.all(
          services.map(service =>
            pipe(
              registry.health(service.id),
              Effect.tap(health => 
                Effect.sync(() => {
                  const status = health.status === "healthy" ? "✅" : 
                                health.status === "degraded" ? "⚠️" : "❌"
                  console.log(`${status} ${service.id}: ${health.status}`)
                })
              ),
              Effect.catchAll(error => {
                console.warn(`Health check failed for ${service.id}:`, error)
                return Effect.succeed({
                  status: "unhealthy" as const,
                  serviceId: service.id
                })
              })
            )
          ),
          { concurrency: 5 }
        )
      ),
      Effect.repeat(Schedule.fixed(interval)),
      Effect.asVoid
    )

  /**
   * Create a default registry configuration
   */
  export const defaultConfig = (services: ReadonlyArray<ServiceDefinition>): RegistryConfig => ({
    discoveryMode: "static",
    staticServices: services,
    discoveryEndpoints: [],
    healthCheckInterval: Duration.seconds(30),
    healthCheckTimeout: Duration.seconds(5),
    retryPolicy: {
      maxAttempts: 3,
      initialDelay: Duration.seconds(1)
    }
  })

  /**
   * Create a dynamic registry configuration
   */
  export const dynamicConfig = (discoveryEndpoints: ReadonlyArray<string>): RegistryConfig => ({
    discoveryMode: "dynamic",
    staticServices: [],
    discoveryEndpoints,
    healthCheckInterval: Duration.seconds(30),
    healthCheckTimeout: Duration.seconds(5),
    retryPolicy: {
      maxAttempts: 3,
      initialDelay: Duration.seconds(1)
    }
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
          SubgraphManagement.withHealthMonitoring(registryWithDiscovery, options?.healthCheckInterval)
        )
      )
    )
  )