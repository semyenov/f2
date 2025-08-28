/**
 * Layer compositions for Federation Framework
 *
 * Pre-composed Effect layers for different deployment environments and use cases,
 * providing dependency injection patterns, service composition, and environment-specific
 * configurations for federated GraphQL applications.
 *
 * ## 🏗️ Layer Architecture
 *
 * Layers in Effect-TS provide a powerful dependency injection system that allows you to:
 * - **Compose Services**: Combine multiple services into cohesive units
 * - **Environment Isolation**: Different configurations for dev/staging/production
 * - **Testability**: Easy mocking and testing with layer substitution
 * - **Resource Management**: Automatic resource acquisition and cleanup
 * - **Service Dependencies**: Declarative dependency management between services
 *
 * ## 🌍 Environment Layers
 *
 * ### Development Layer
 * - Pretty-printed console logs for easy reading
 * - Debug-level logging for detailed troubleshooting
 * - Local service configurations
 * - Hot-reload friendly settings
 *
 * ### Production Layer
 * - Structured JSON logging for log aggregation
 * - Info-level logging to reduce noise
 * - Production-ready configurations
 * - Performance optimizations enabled
 *
 * ### Testing Layer
 * - Minimal logging to avoid test output noise
 * - Fast configurations for test execution
 * - Mock-friendly service implementations
 * - Deterministic behavior for testing
 *
 * @example Basic layer usage
 * ```typescript
 * import { DevelopmentLayerLive } from '@cqrs/federation-v2'
 * import { Effect } from 'effect'
 *
 * const myProgram = Effect.gen(function* () {
 *   const config = yield* FederationConfigService
 *   const logger = yield* FederationLogger
 *
 *   yield* logger.info('Application starting', {
 *     port: config.server.port,
 *     environment: 'development'
 *   })
 * })
 *
 * // Provide all necessary services for development
 * const runnable = myProgram.pipe(Effect.provide(DevelopmentLayerLive))
 * Effect.runPromise(runnable)
 * ```
 *
 * @example Environment-specific deployment
 * ```typescript
 * import { createEnvironmentLayer } from '@cqrs/federation-v2'
 *
 * const environment = process.env.NODE_ENV || 'development'
 * const layer = createEnvironmentLayer(environment)
 *
 * const startServer = Effect.gen(function* () {
 *   const config = yield* FederationConfigService
 *   const logger = yield* FederationLogger
 *
 *   yield* logger.info('Server starting', {
 *     environment,
 *     port: config.server.port
 *   })
 *
 *   // Start GraphQL server...
 * })
 *
 * const program = startServer.pipe(Effect.provide(layer))
 * ```
 *
 * @example Custom layer composition
 * ```typescript
 * import { Layer } from 'effect'
 * import { CoreServicesLive, FederationLoggerLive } from '@cqrs/federation-v2'
 *
 * // Create custom layer with additional services
 * const CustomDatabaseService = Layer.succeed(DatabaseService, {
 *   query: (sql: string) => Effect.succeed([]),
 *   transaction: <A>(effect: Effect.Effect<A>) => effect
 * })
 *
 * const CustomLayerLive = Layer.mergeAll(
 *   CoreServicesLive,
 *   CustomDatabaseService,
 *   Logger.json // JSON structured logging
 * )
 *
 * const application = myBusinessLogic.pipe(Effect.provide(CustomLayerLive))
 * ```
 *
 * @example Layer testing and mocking
 * ```typescript
 * import { TestLayerLive } from '@cqrs/federation-v2'
 * import { Layer } from 'effect'
 *
 * // Mock external services for testing
 * const MockExternalService = Layer.succeed(ExternalService, {
 *   fetchData: (id: string) => Effect.succeed({ id, data: 'test-data' }),
 *   isHealthy: () => Effect.succeed(true)
 * })
 *
 * const TestEnvironment = Layer.mergeAll(
 *   TestLayerLive,
 *   MockExternalService
 * )
 *
 * // Run tests with mocked dependencies
 * const testProgram = Effect.gen(function* () {
 *   const service = yield* ExternalService
 *   const result = yield* service.fetchData('test-id')
 *
 *   expect(result.data).toBe('test-data')
 * })
 *
 * test('should work with mocked services', async () => {
 *   await Effect.runPromise(testProgram.pipe(Effect.provide(TestEnvironment)))
 * })
 * ```
 *
 * @example Resource management with layers
 * ```typescript
 * import { Effect, Layer } from 'effect'
 *
 * // Layer with resource management
 * const DatabaseConnectionLive = Layer.scoped(
 *   DatabaseConnection,
 *   Effect.gen(function* () {
 *     const config = yield* FederationConfigService
 *
 *     // Acquire database connection
 *     const connection = yield* Effect.acquireRelease(
 *       connectToDatabase(config.database.url),
 *       (conn) => closeConnection(conn)
 *     )
 *
 *     return {
 *       query: (sql: string) => executeQuery(connection, sql),
 *       transaction: <A>(effect: Effect.Effect<A>) =>
 *         withTransaction(connection, effect)
 *     }
 *   })
 * )
 *
 * const AppWithDatabase = Layer.mergeAll(
 *   CoreServicesLive,
 *   DatabaseConnectionLive
 * )
 * ```
 *
 * @example Multi-tenancy with layers
 * ```typescript
 * const createTenantLayer = (tenantId: string) =>
 *   Layer.succeed(TenantContext, { tenantId }).pipe(
 *     Layer.merge(CoreServicesLive)
 *   )
 *
 * const handleTenantRequest = (tenantId: string, request: Request) =>
 *   processRequest(request).pipe(
 *     Effect.provide(createTenantLayer(tenantId))
 *   )
 * ```
 *
 * @category Core Services
 * @see {@link https://effect.website/docs/guides/layers | Effect Layers Guide}
 * @see {@link https://effect.website/docs/guides/dependency-injection | Effect Dependency Injection}
 */

import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import { FederationConfigLive } from './config.js'
import { FederationLoggerLive, developmentLogger, productionLogger, testLogger } from './logger.js'

// Base layer that all applications need
export const CoreServicesLive = Layer.mergeAll(FederationConfigLive, FederationLoggerLive)

// Development environment layer
export const DevelopmentLayerLive = Layer.mergeAll(
  CoreServicesLive,
  developmentLogger,
  Logger.pretty // Pretty-print logs in development
)

// Production environment layer
export const ProductionLayerLive = Layer.mergeAll(
  CoreServicesLive,
  productionLogger,
  Logger.json // JSON logs for production
)

// Testing environment layer
export const TestLayerLive = Layer.mergeAll(CoreServicesLive, testLogger)

// Minimal layer for basic functionality
export const MinimalLayerLive = FederationConfigLive

/**
 * Helper function to create environment-specific layers
 */
export const createEnvironmentLayer = (environment?: string) => {
  switch (environment) {
    case 'production':
      return ProductionLayerLive
    case 'test':
      return TestLayerLive
    case 'development':
    default:
      return DevelopmentLayerLive
  }
}
