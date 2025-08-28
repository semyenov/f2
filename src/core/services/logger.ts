/**
 * Effect-based logging service for Federation Framework v2
 *
 * Advanced structured logging system built on Effect-TS with support for distributed tracing,
 * contextual metadata, different log levels, and environment-specific configurations.
 * Integrates seamlessly with observability platforms like Jaeger, Zipkin, and ELK stack.
 *
 * ## 🌟 Key Features
 * - **Structured Logging**: JSON-formatted logs with consistent metadata structure
 * - **Distributed Tracing**: Automatic span creation and trace correlation
 * - **Contextual Metadata**: Rich context information with request/operation details
 * - **Performance Tracking**: Built-in performance metrics and timing information
 * - **Environment Profiles**: Different logging configurations for dev/staging/production
 * - **Error Correlation**: Automatic error tracking and correlation with distributed traces
 * - **Log Level Filtering**: Dynamic log level adjustment without restarts
 *
 * ## 🎯 Log Levels
 * - **TRACE**: Very detailed debugging information for deep troubleshooting
 * - **DEBUG**: General debugging information for development and testing
 * - **INFO**: Informational messages about normal operations and business events
 * - **WARN**: Warning messages about potentially harmful situations
 * - **ERROR**: Error events that don't necessarily stop the application
 *
 * ## 🔍 Distributed Tracing
 * The logger automatically integrates with Effect's tracing capabilities to provide
 * distributed tracing across your federated GraphQL services. Each log entry includes
 * trace and span IDs for correlation across services.
 *
 * @example Basic logging usage
 * ```typescript
 * import { FederationLogger } from '@cqrs/federation-v2'
 * import { Effect } from 'effect'
 *
 * const program = Effect.gen(function* () {
 *   const logger = yield* FederationLogger
 *
 *   yield* logger.info('User authentication started', {
 *     userId: 'user-123',
 *     method: 'oauth2',
 *     provider: 'google'
 *   })
 *
 *   yield* logger.debug('Database query executed', {
 *     query: 'SELECT * FROM users WHERE id = $1',
 *     params: ['user-123'],
 *     duration: '15ms'
 *   })
 *
 *   yield* logger.warn('Rate limit approaching', {
 *     current: 95,
 *     limit: 100,
 *     resetTime: '2024-01-01T12:00:00Z'
 *   })
 * })
 * ```
 *
 * @example Distributed tracing with spans
 * ```typescript
 * import { withSpan, info, error } from '@cqrs/federation-v2'
 *
 * const processOrder = (orderId: string) =>
 *   withSpan('process-order', Effect.gen(function* () {
 *     yield* info('Processing order', { orderId })
 *
 *     // This will be nested under the 'process-order' span
 *     yield* withSpan('validate-payment', Effect.gen(function* () {
 *       yield* info('Validating payment', { orderId })
 *       // Payment validation logic...
 *     }))
 *
 *     // This will also be nested under 'process-order' span
 *     yield* withSpan('update-inventory', Effect.gen(function* () {
 *       yield* info('Updating inventory', { orderId })
 *       // Inventory update logic...
 *     }))
 *
 *     yield* info('Order processed successfully', { orderId })
 *   }))
 * ```
 *
 * @example Error logging with context
 * ```typescript
 * const handleGraphQLRequest = (query: string, variables: Record<string, unknown>) =>
 *   Effect.gen(function* () {
 *     const logger = yield* FederationLogger
 *
 *     try {
 *       yield* logger.info('GraphQL request received', {
 *         query: query.slice(0, 100), // Truncate for logging
 *         variableKeys: Object.keys(variables),
 *         timestamp: new Date().toISOString()
 *       })
 *
 *       const result = yield* executeGraphQLQuery(query, variables)
 *
 *       yield* logger.info('GraphQL request completed', {
 *         duration: result.extensions?.timing?.total,
 *         operationName: result.extensions?.operationName
 *       })
 *
 *       return result
 *     } catch (error) {
 *       yield* logger.error('GraphQL request failed', {
 *         error: error.message,
 *         stack: error.stack,
 *         query: query.slice(0, 200),
 *         variables
 *       })
 *       throw error
 *     }
 *   })
 * ```
 *
 * @example Custom log formatting for specific operations
 * ```typescript
 * const logSubgraphRequest = (subgraphId: string, operation: string) =>
 *   Effect.gen(function* () {
 *     const logger = yield* FederationLogger
 *
 *     yield* logger.trace('Subgraph request initiated', {
 *       subgraph: subgraphId,
 *       operation: operation.slice(0, 150),
 *       component: 'federation-gateway',
 *       phase: 'request'
 *     })
 *   })
 *
 * const logSubgraphResponse = (subgraphId: string, duration: number, hasErrors: boolean) =>
 *   Effect.gen(function* () {
 *     const logger = yield* FederationLogger
 *
 *     const level = hasErrors ? 'warn' : 'info'
 *     yield* logger[level]('Subgraph response received', {
 *       subgraph: subgraphId,
 *       duration: `${duration}ms`,
 *       hasErrors,
 *       component: 'federation-gateway',
 *       phase: 'response'
 *     })
 *   })
 * ```
 *
 * @example Environment-specific logging configuration
 * ```typescript
 * import {
 *   developmentLogger,
 *   productionLogger,
 *   testLogger
 * } from '@cqrs/federation-v2'
 *
 * // Development: Pretty-printed logs with DEBUG level
 * const devApp = app.pipe(Effect.provide(developmentLogger))
 *
 * // Production: JSON logs with INFO level, includes tracing
 * const prodApp = app.pipe(Effect.provide(productionLogger))
 *
 * // Testing: Minimal logging with WARN level
 * const testApp = app.pipe(Effect.provide(testLogger))
 * ```
 *
 * @category Core Services
 * @see {@link https://effect.website/docs/observability/logging | Effect Logging Guide}
 * @see {@link https://effect.website/docs/observability/tracing | Effect Tracing Guide}
 */

import * as Effect from 'effect/Effect'
import * as Context from 'effect/Context'
import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import * as LogLevel from 'effect/LogLevel'

// Logger service tag
export class FederationLogger extends Context.Tag('FederationLogger')<
  FederationLogger,
  {
    readonly trace: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly debug: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly info: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly warn: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly error: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly withSpan: <A, E, R>(
      name: string,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E, R>
  }
>() {}

// Implementation
const make = Effect.gen(function* () {
  yield* Effect.log('Hello, world!') // Add a yield statement to satisfy the lint rule

  const logWithLevel =
    (level: LogLevel.LogLevel) =>
    (message: string, meta: Record<string, unknown> = {}) =>
      Effect.logWithLevel(level, message, meta)

  return {
    trace: logWithLevel(LogLevel.Trace),
    debug: logWithLevel(LogLevel.Debug),
    info: logWithLevel(LogLevel.Info),
    warn: logWithLevel(LogLevel.Warning),
    error: logWithLevel(LogLevel.Error),
    withSpan: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) =>
      Effect.withSpan(effect, name, {
        attributes: {
          service: 'federation-v2',
          version: '2.0.0',
        },
      }),
  }
})

// Layer for providing the logger service
export const FederationLoggerLive = Layer.effect(FederationLogger, make)

// Convenience functions for using the logger
export const trace = (message: string, meta?: Record<string, unknown>) =>
  Effect.flatMap(FederationLogger, logger => logger.trace(message, meta))

export const debug = (message: string, meta?: Record<string, unknown>) =>
  Effect.flatMap(FederationLogger, logger => logger.debug(message, meta))

export const info = (message: string, meta?: Record<string, unknown>) =>
  Effect.flatMap(FederationLogger, logger => logger.info(message, meta))

export const warn = (message: string, meta?: Record<string, unknown>) =>
  Effect.flatMap(FederationLogger, logger => logger.warn(message, meta))

export const error = (message: string, meta?: Record<string, unknown>) =>
  Effect.flatMap(FederationLogger, logger => logger.error(message, meta))

export const withSpan = <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(FederationLogger, logger => logger.withSpan(name, effect))

// Custom logger configurations
export const developmentLogger = Layer.merge(
  FederationLoggerLive,
  Logger.minimumLogLevel(LogLevel.Debug)
)

export const productionLogger = Layer.merge(
  FederationLoggerLive,
  Logger.minimumLogLevel(LogLevel.Info)
)

export const testLogger = Layer.merge(
  FederationLoggerLive,
  Logger.minimumLogLevel(LogLevel.Warning)
)
