/**
 * ## Federation Components
 *
 * This module provides the core federation components for composing, managing,
 * and optimizing Apollo Federation 2.x services. It includes schema composition,
 * subgraph management, error boundaries, and performance optimizations.
 *
 * ### ⚡ Federation Features
 *
 * - **Schema Composition**: Automated federated schema composition with hot reloading
 * - **Subgraph Management**: Service discovery, health monitoring, and lifecycle management
 * - **Error Boundaries**: Circuit breakers, timeout handling, and fault tolerance
 * - **Performance**: Query plan caching, DataLoader batching, and execution optimization
 *
 * @example Complete federation setup
 * ```typescript
 * import {
 *   FederationComposer,
 *   SubgraphManagement,
 *   FederationErrorBoundaries,
 *   PerformanceOptimizations
 * } from '@cqrs/federation'
 * import { Effect, Duration } from 'effect'
 *
 * const setupFederation = Effect.gen(function* () {
 *   // Registry with health monitoring
 *   const registry = yield* SubgraphManagement.createRegistry({
 *     services: [
 *       { id: 'users', url: 'http://user-service:4001' },
 *       { id: 'products', url: 'http://product-service:4002' }
 *     ],
 *     healthCheckInterval: Duration.seconds(30)
 *   })
 *
 *   // Error boundaries with circuit breakers
 *   const errorBoundary = yield* FederationErrorBoundaries.createBoundary({
 *     circuitBreakerConfig: {
 *       failureThreshold: 5,
 *       resetTimeout: Duration.seconds(30)
 *     }
 *   })
 *
 *   // Performance optimizations
 *   const performance = yield* PerformanceOptimizations.createOptimizedExecutor({
 *     queryPlanCache: { maxSize: 1000 },
 *     dataLoaderConfig: { maxBatchSize: 100 }
 *   })
 *
 *   // Compose federated schema
 *   return yield* FederationComposer.create({
 *     entities: [userEntity, productEntity],
 *     registry,
 *     errorBoundary,
 *     performance
 *   })
 * })
 * ```
 *
 * @since 2.0.0
 * @category Federation Components
 */
export * from './composer.js'
export * from './subgraph.js'
export * from './error-boundaries.js'
export * from './performance.js'
