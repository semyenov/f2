/**
 * Resilience Modules Barrel Export
 * 
 * Re-exports all resilience pattern modules for convenient access.
 * 
 * @module resilience/modules
 */

// Circuit Breaker module
export {
  type CircuitBreakerState,
  type CircuitBreakerConfig,
  type CircuitBreakerMetrics,
  type CircuitBreaker,
  createCircuitBreaker,
  createCircuitBreakerManager,
  withRetry,
  withFallback,
} from './circuit-breaker.js'