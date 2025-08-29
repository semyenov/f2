import { CompositionError, ServiceDefinition, SubgraphRegistry } from "./types-CIKLW6fG.cjs";
import { Duration, Effect } from "effect";

//#region src/federation/subgraphs/subgraph.d.ts

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
 */
interface RegistryConfig {
  readonly discoveryMode: 'static' | 'dynamic';
  readonly staticServices: ReadonlyArray<ServiceDefinition>;
  readonly discoveryEndpoints: ReadonlyArray<string>;
  readonly healthCheckInterval: Duration.Duration;
  readonly healthCheckTimeout: Duration.Duration;
  readonly retryPolicy: {
    readonly maxAttempts: number;
    readonly initialDelay: Duration.Duration;
  };
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
 * import { SubgraphManagement } from '@cqrs/federation'
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
 */
declare namespace SubgraphManagement {
  /**
   * Create a subgraph registry with comprehensive service management
   */
  const createRegistry: (config: RegistryConfig) => Effect.Effect<SubgraphRegistry, CompositionError>;
  /**
   * Registry with auto-discovery polling
   */
  const withAutoDiscovery: (registry: SubgraphRegistry, interval?: Duration.Duration) => Effect.Effect<SubgraphRegistry, never>;
  /**
   * Registry with health monitoring
   */
  const withHealthMonitoring: (registry: SubgraphRegistry, interval?: Duration.Duration) => Effect.Effect<SubgraphRegistry, never>;
  /**
   * Create a default registry configuration
   */
  const defaultConfig: (services: ReadonlyArray<ServiceDefinition>) => RegistryConfig;
  /**
   * Create a dynamic registry configuration
   */
  const dynamicConfig: (discoveryEndpoints: ReadonlyArray<string>) => RegistryConfig;
}
/**
 * Factory functions for common registry setups
 */
declare const createStaticRegistry: (services: ReadonlyArray<ServiceDefinition>) => Effect.Effect<SubgraphRegistry, CompositionError, never>;
declare const createDynamicRegistry: (discoveryEndpoints: ReadonlyArray<string>) => Effect.Effect<SubgraphRegistry, CompositionError, never>;
declare const createMonitoredRegistry: (services: ReadonlyArray<ServiceDefinition>, options?: {
  readonly discoveryInterval?: Duration.Duration;
  readonly healthCheckInterval?: Duration.Duration;
}) => Effect.Effect<SubgraphRegistry, CompositionError, never>;
//#endregion
export { RegistryConfig, SubgraphManagement, createDynamicRegistry, createMonitoredRegistry, createStaticRegistry };
//# sourceMappingURL=subgraph-C5txPK7-.d.cts.map