/**
 * Circuit Breaker Module
 * 
 * Implements circuit breaker pattern for fault tolerance in distributed systems.
 * Prevents cascading failures by monitoring and controlling service calls.
 * 
 * @module resilience/circuit-breaker
 */

import * as Effect from 'effect/Effect'
import * as Duration from 'effect/Duration'
import * as Option from 'effect/Option'
import * as Ref from 'effect/Ref'
import { pipe } from 'effect/Function'

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold before opening */
  failureThreshold: number
  /** Success threshold to close from half-open */
  successThreshold: number
  /** Timeout duration when open */
  timeout: Duration.Duration
  /** Reset timeout for half-open state */
  resetTimeout: Duration.Duration
  /** Monitoring window for failures */
  monitoringWindow: Duration.Duration
  /** Callback when state changes */
  onStateChange?: (oldState: CircuitBreakerState, newState: CircuitBreakerState) => void
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failures: number
  successes: number
  lastFailureTime?: Date | undefined
  lastSuccessTime?: Date | undefined
  totalCalls: number
  rejectedCalls: number
  timeInCurrentState: number
}

/**
 * Circuit breaker interface
 */
export interface CircuitBreaker {
  execute: <A>(effect: Effect.Effect<A, Error>) => Effect.Effect<A, Error>
  getState: () => Effect.Effect<CircuitBreakerState, never>
  getMetrics: () => Effect.Effect<CircuitBreakerMetrics, never>
  reset: () => Effect.Effect<void, never>
  forceOpen: () => Effect.Effect<void, never>
  forceClose: () => Effect.Effect<void, never>
}

/**
 * Create a circuit breaker
 */
export const createCircuitBreaker = (
  name: string,
  config: CircuitBreakerConfig
): Effect.Effect<CircuitBreaker, never, never> =>
  Effect.gen(function* () {
    const {
      failureThreshold,
      successThreshold,
      timeout,
      onStateChange,
    } = config

    // State management
    const state = yield* Ref.make<CircuitBreakerState>('closed')
    const failures = yield* Ref.make(0)
    const successes = yield* Ref.make(0)
    const lastFailureTime = yield* Ref.make<Option.Option<Date>>(Option.none())
    const lastSuccessTime = yield* Ref.make<Option.Option<Date>>(Option.none())
    const totalCalls = yield* Ref.make(0)
    const rejectedCalls = yield* Ref.make(0)
    const stateChangeTime = yield* Ref.make(Date.now())

    // Helper to change state
    const changeState = (newState: CircuitBreakerState) =>
      Effect.gen(function* () {
        const oldState = yield* Ref.get(state)
        if (oldState !== newState) {
          yield* Ref.set(state, newState)
          yield* Ref.set(stateChangeTime, Date.now())
          
          if (onStateChange) {
            onStateChange(oldState, newState)
          }
          
          console.log(`🔄 Circuit breaker ${name} state changed: ${oldState} -> ${newState}`)
        }
      })

    // Check if should transition from open to half-open
    const checkOpenTimeout = () =>
      Effect.gen(function* () {
        const currentState = yield* Ref.get(state)
        if (currentState === 'open') {
          const changeTime = yield* Ref.get(stateChangeTime)
          const elapsed = Date.now() - changeTime
          
          if (elapsed >= Duration.toMillis(timeout)) {
            yield* changeState('half-open')
            yield* Ref.set(failures, 0)
            yield* Ref.set(successes, 0)
          }
        }
      })

    // Handle success
    const handleSuccess = () =>
      Effect.gen(function* () {
        yield* Ref.update(totalCalls, n => n + 1)
        yield* Ref.update(successes, n => n + 1)
        yield* Ref.set(lastSuccessTime, Option.some(new Date()))
        
        const currentState = yield* Ref.get(state)
        const successCount = yield* Ref.get(successes)
        
        if (currentState === 'half-open' && successCount >= successThreshold) {
          yield* changeState('closed')
          yield* Ref.set(failures, 0)
        }
      })

    // Handle failure
    const handleFailure = () =>
      Effect.gen(function* () {
        yield* Ref.update(totalCalls, n => n + 1)
        yield* Ref.update(failures, n => n + 1)
        yield* Ref.set(lastFailureTime, Option.some(new Date()))
        
        const currentState = yield* Ref.get(state)
        const failureCount = yield* Ref.get(failures)
        
        if (currentState === 'closed' && failureCount >= failureThreshold) {
          yield* changeState('open')
          console.log(`🚨 Circuit breaker opened for ${name} (${failureCount} failures)`)
        } else if (currentState === 'half-open') {
          yield* changeState('open')
          console.log(`🚨 Circuit breaker re-opened for ${name}`)
        }
      })

    return {
      execute: <A>(effect: Effect.Effect<A, Error>) =>
        Effect.gen(function* () {
          // Check timeout for transition to half-open
          yield* checkOpenTimeout()
          
          const currentState = yield* Ref.get(state)
          
          if (currentState === 'open') {
            yield* Ref.update(rejectedCalls, n => n + 1)
            return yield* Effect.fail(
              new Error(`Circuit breaker is open for ${name}`)
            )
          }
          
          try {
            const result = yield* effect
            yield* handleSuccess()
            return result
          } catch (error) {
            yield* handleFailure()
            throw error
          }
        }),

      getState: () => Ref.get(state),

      getMetrics: () =>
        Effect.gen(function* () {
          const currentState = yield* Ref.get(state)
          const failureCount = yield* Ref.get(failures)
          const successCount = yield* Ref.get(successes)
          const lastFailure = yield* Ref.get(lastFailureTime)
          const lastSuccess = yield* Ref.get(lastSuccessTime)
          const total = yield* Ref.get(totalCalls)
          const rejected = yield* Ref.get(rejectedCalls)
          const changeTime = yield* Ref.get(stateChangeTime)
          
          return {
            state: currentState,
            failures: failureCount,
            successes: successCount,
            lastFailureTime: Option.getOrUndefined(lastFailure),
            lastSuccessTime: Option.getOrUndefined(lastSuccess),
            totalCalls: total,
            rejectedCalls: rejected,
            timeInCurrentState: Date.now() - changeTime,
          }
        }),

      reset: () =>
        Effect.gen(function* () {
          yield* changeState('closed')
          yield* Ref.set(failures, 0)
          yield* Ref.set(successes, 0)
          yield* Ref.set(lastFailureTime, Option.none())
          yield* Ref.set(lastSuccessTime, Option.none())
          console.log(`🔄 Circuit breaker ${name} reset`)
        }),

      forceOpen: () =>
        Effect.gen(function* () {
          yield* changeState('open')
          console.log(`⚠️ Circuit breaker ${name} forced open`)
        }),

      forceClose: () =>
        Effect.gen(function* () {
          yield* changeState('closed')
          yield* Ref.set(failures, 0)
          yield* Ref.set(successes, 0)
          console.log(`✅ Circuit breaker ${name} forced closed`)
        }),
    }
  })

/**
 * Create a circuit breaker manager for multiple services
 */
export const createCircuitBreakerManager = () => {
  const breakers = new Map<string, CircuitBreaker>()

  return {
    /**
     * Get or create a circuit breaker for a service
     */
    getBreaker: (
      serviceName: string,
      config?: Partial<CircuitBreakerConfig>
    ): Effect.Effect<CircuitBreaker, never, never> =>
      Effect.gen(function* () {
        const existing = breakers.get(serviceName)
        if (existing) return existing

        const defaultConfig: CircuitBreakerConfig = {
          failureThreshold: 5,
          successThreshold: 3,
          timeout: Duration.seconds(60),
          resetTimeout: Duration.seconds(30),
          monitoringWindow: Duration.minutes(1),
          ...config,
        }

        const breaker = yield* createCircuitBreaker(serviceName, defaultConfig)
        breakers.set(serviceName, breaker)
        return breaker
      }),

    /**
     * Get all circuit breakers
     */
    getAllBreakers: () => Array.from(breakers.entries()),

    /**
     * Reset all circuit breakers
     */
    resetAll: () =>
      Effect.gen(function* () {
        for (const [_, breaker] of breakers) {
          yield* breaker.reset()
        }
      }),

    /**
     * Get aggregated metrics
     */
    getAggregatedMetrics: () =>
      Effect.gen(function* () {
        const metrics: Record<string, CircuitBreakerMetrics> = {}
        
        for (const [name, breaker] of breakers) {
          metrics[name] = yield* breaker.getMetrics()
        }
        
        return metrics
      }),
  }
}

/**
 * Circuit breaker with retry logic
 */
export const withRetry = <A>(
  breaker: CircuitBreaker,
  effect: Effect.Effect<A, Error>,
  maxRetries: number = 3,
  delay: Duration.Duration = Duration.seconds(1)
): Effect.Effect<A, Error> =>
  Effect.gen(function* () {
    let lastError: Error | undefined

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return yield* breaker.execute(effect)
      } catch (error) {
        lastError = error as Error
        
        if (i < maxRetries) {
          console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${Duration.toMillis(delay)}ms`)
          yield* Effect.sleep(delay)
        }
      }
    }

    throw lastError || new Error('Max retries exceeded')
  })

/**
 * Circuit breaker with fallback
 */
export const withFallback = <A>(
  breaker: CircuitBreaker,
  primary: Effect.Effect<A, Error>,
  fallback: Effect.Effect<A, Error>
): Effect.Effect<A, Error> =>
  Effect.gen(function* () {
    try {
      return yield* breaker.execute(primary)
    } catch (primaryError) {
      console.log(`⚠️ Primary failed, using fallback: ${primaryError}`)
      
      try {
        return yield* fallback
      } catch (fallbackError) {
        throw new Error(
          `Both primary and fallback failed: ${primaryError}, ${fallbackError}`
        )
      }
    }
  })