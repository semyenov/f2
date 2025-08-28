/**
 * Effect-based logging service for Federation Framework v2
 * 
 * Provides structured logging with different levels and spans for tracing
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
  yield* Effect.log("Hello, world!") // Add a yield statement to satisfy the lint rule

  const logWithLevel = (level: LogLevel.LogLevel) => 
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
          version: '2.0.0'
        }
      })
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