# Error Handling Guide

This guide covers comprehensive error handling patterns in the Federation Framework v2, built on Effect-TS for functional error composition and pattern matching.

## Table of Contents

- [Error Types](#error-types)
- [Pattern Matching](#pattern-matching)
- [Error Creation](#error-creation)
- [Circuit Breakers](#circuit-breakers)
- [Error Boundaries](#error-boundaries)
- [Best Practices](#best-practices)

## Error Types

The framework provides a comprehensive error system with discriminated unions and rich metadata:

```typescript
import { ErrorFactory, ErrorMatching, type DomainError } from '@cqrs/federation-v2/core'

// All errors extend BaseDomainError with metadata
interface CoreError {
  readonly _tag: string
  readonly message: string
  readonly code: string
  readonly timestamp: Date
  readonly context?: Record<string, unknown>
  readonly cause?: unknown
}
```

### Domain Error Categories

#### Validation Errors
```typescript
// Schema validation with violation details
const schemaError = ErrorFactory.schemaValidation(
  "User", 
  "Validation failed",
  [
    { path: "email", message: "Invalid format", value: "not-an-email" },
    { path: "age", message: "Must be positive", value: -5 }
  ]
)

// Field validation
const fieldError = ErrorFactory.validation(
  "Email is required", 
  "email", 
  undefined, 
  "REQUIRED_FIELD"
)
```

#### Federation Errors
```typescript
// Entity resolution failures
const entityError = ErrorFactory.entityResolution(
  "User not found",
  "User",
  "user-123"
)

// Subgraph communication failures
const federationError = ErrorFactory.federation(
  "Subgraph unavailable",
  "users-service",
  "query"
)
```

#### Resilience Errors
```typescript
// Circuit breaker protection
const circuitError = ErrorFactory.circuitBreaker(
  "Service unavailable",
  "open"
)

// Request timeouts
const timeoutError = ErrorFactory.timeout(
  "Request exceeded timeout",
  "10s"
)
```

## Pattern Matching

The framework uses Effect's `Match` module for exhaustive error handling:

### Basic Pattern Matching
```typescript
import * as Match from "effect/Match"

const handleError = (error: DomainError): string =>
  Match.value(error).pipe(
    Match.tag("ValidationError", (err) =>
      `Invalid ${err.field || "field"}: ${err.message}`
    ),
    Match.tag("EntityResolutionError", (err) =>
      `Could not find ${err.entityType}: ${err.message}`
    ),
    Match.tag("FederationError", (err) =>
      `Federation error: ${err.message}`
    ),
    Match.tag("CircuitBreakerError", () =>
      "Service temporarily unavailable"
    ),
    Match.exhaustive // Ensures all cases are handled
  )
```

### Advanced Pattern Matching with Context
```typescript
const processError = (error: DomainError, context: ErrorContext) =>
  Match.value(error).pipe(
    Match.when(
      (err): err is ValidationError => err._tag === "ValidationError",
      (err) => {
        logValidationError(err, context)
        return createUserFriendlyMessage(err)
      }
    ),
    Match.when(
      (err) => err.severity === "high",
      (err) => {
        alertOnCall(err, context)
        return escalateError(err)
      }
    ),
    Match.orElse((err) => handleGenericError(err, context))
  )
```

### Error Classification
```typescript
// Check if error is retryable
const canRetry = ErrorMatching.isRetryable(error) // boolean

// Get error severity
const severity = ErrorMatching.getSeverity(error) // "low" | "medium" | "high"

// Transform to user message
const userMessage = pipe(
  Effect.fail(error),
  ErrorMatching.toUserMessage,
  Effect.runSync
)
```

## Error Creation

### Factory Functions
```typescript
// Use factory functions for consistent error creation
const errors = {
  // Common validation errors
  requiredField: ErrorFactory.CommonErrors.required("email"),
  invalidValue: ErrorFactory.CommonErrors.invalid("age", -5),
  
  // Federation errors
  subgraphDown: ErrorFactory.CommonErrors.subgraphUnavailable("users-service"),
  entityNotFound: ErrorFactory.CommonErrors.entityNotFound("User", "123"),
  
  // Circuit breaker errors
  circuitOpen: ErrorFactory.CommonErrors.circuitOpen("users-service"),
  requestTimeout: ErrorFactory.CommonErrors.requestTimeout("10s"),
  
  // Schema composition errors
  compositionFailed: ErrorFactory.CommonErrors.schemaCompositionFailed("Invalid directive"),
  unsupportedType: ErrorFactory.CommonErrors.unsupportedAstType("CustomScalar")
}
```

### Custom Error Creation
```typescript
// Create domain-specific errors
class UserServiceError extends BaseDomainError {
  readonly _tag = "UserServiceError" as const
  readonly severity = "high" as const
  readonly category = "business" as const
  readonly retryable = false

  constructor(
    message: string,
    readonly userId?: string,
    context: Record<string, unknown> = {}
  ) {
    super("UserServiceError", message, "USER_SERVICE_ERROR", {
      userId,
      ...context
    })
  }
}
```

## Circuit Breakers

Circuit breakers provide automatic fault tolerance for subgraph communications:

### Basic Circuit Breaker Setup
```typescript
import { FederationErrorBoundaries } from '@cqrs/federation-v2/federation/error-boundaries'
import { Duration } from 'effect'
import * as Effect from 'effect/Effect'

const circuitBreakerConfig = {
  failureThreshold: 5,        // Open after 5 failures
  resetTimeout: Duration.seconds(30), // Try reset after 30s
  halfOpenMaxCalls: 3         // Allow 3 calls in half-open state (optimized)
}

// Modern Effect.gen pattern for circuit breaker creation
const createCircuitBreaker = Effect.gen(function* () {
  return yield* FederationErrorBoundaries.withCircuitBreaker(
    "users-service", 
    circuitBreakerConfig
  )
})
```

### Using Circuit Breaker Protection
```typescript
const protectedQuery = (userId: string) =>
  Effect.gen(function* () {
    const circuitBreaker = yield* createCircuitBreaker
    
    // Apply circuit breaker protection with Effect.gen
    const result = yield* Effect.tryPromise({
      try: () => fetchUser(userId),
      catch: (error) => ErrorFactory.federation(
        "Failed to fetch user",
        "users-service",
        "query",
        error
      )
    }).pipe(
      circuitBreaker.protect, // Apply circuit breaker protection
      Effect.timeout(Duration.seconds(5)),
      Effect.catchTag("TimeoutException", () =>
        ErrorFactory.timeout("User query timed out", "5s")
      )
    )
    
    return result
  })

// Check circuit breaker state with modern patterns
const checkCircuitBreakerHealth = Effect.gen(function* () {
  const circuitBreaker = yield* createCircuitBreaker
  const state = yield* circuitBreaker.getState() // "closed" | "open" | "half-open"
  const metrics = yield* circuitBreaker.getMetrics() // Enhanced metrics with pre-calculated timeouts
  
  return { state, metrics }
})
```

## Error Boundaries

Error boundaries provide comprehensive fault tolerance at the federation level:

### Enhanced Error Boundary
```typescript
const createErrorBoundary = Effect.gen(function* () {
  return yield* FederationErrorBoundaries.createBoundary({
    subgraphTimeouts: {
      "users-service": Duration.seconds(5),
      "orders-service": Duration.seconds(10)
    },
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeout: Duration.seconds(30),
      halfOpenMaxCalls: 3 // Optimized half-open state
    },
    partialFailureHandling: {
      allowPartialFailure: true,
      criticalSubgraphs: ["users-service"], // These must succeed
      fallbackValues: {
        "orders-service": { orders: [] }, // Fallback if orders fail
        "recommendations-service": { recommendations: [] }
      },
      maxFailurePercentage: 50 // Allow up to 50% of non-critical services to fail
    },
    errorTransformation: {
      sanitizeErrors: true,
      includeStackTrace: false,
      enableStructuredLogging: true // Enhanced logging support
    },
    // New performance features
    performanceMonitoring: {
      collectMetrics: true,
      alertThresholds: {
        errorRateAbove: 5,
        latencyAbove: Duration.millis(100)
      }
    }
  })
})
```

### Wrapping Resolvers with Error Boundaries
```typescript
const createBoundedResolver = Effect.gen(function* () {
  const errorBoundary = yield* createErrorBoundary
  
  return errorBoundary.wrapResolver(
    "users-service",
    (parent, args, context, info) =>
      Effect.gen(function* () {
        const user = yield* Effect.tryPromise(() => fetchUser(args.id))
        return user
      })
  )
})

// The resolver is now protected with:
// - Circuit breaker protection with optimized half-open state
// - Timeout handling with pre-calculated timeouts
// - Error transformation and sanitization
// - Performance metrics collection
// - Structured logging integration
```

### Partial Failure Handling
```typescript
const results = {
  "users-service": { subgraphId: "users-service", success: true, data: { user: { id: "123" } } },
  "orders-service": { subgraphId: "orders-service", success: false, error: new Error("Service down") }
}

const processed = pipe(
  errorBoundary.handlePartialFailure(results),
  Effect.match({
    onSuccess: (result) => ({
      data: result.data, // Contains user data + fallback orders: []
      errors: result.errors // Non-critical errors
    }),
    onFailure: (error) => {
      // Critical subgraph failure - propagate error
      throw error
    }
  }),
  Effect.runSync
)
```

## Best Practices

### 1. Use Pattern Matching for Exhaustive Error Handling
```typescript
// ✅ Good: Exhaustive matching ensures all errors are handled
const handleError = (error: DomainError) =>
  Match.value(error).pipe(
    Match.tag("ValidationError", handleValidation),
    Match.tag("FederationError", handleFederation),
    Match.tag("CircuitBreakerError", handleCircuitBreaker),
    // ... handle all error types
    Match.exhaustive // TypeScript will error if cases are missing
  )

// ❌ Bad: Generic error handling loses type safety
const handleError = (error: DomainError) => {
  console.log(error.message) // Loses error-specific context
}
```

### 2. Provide Rich Error Context
```typescript
// ✅ Good: Rich context for debugging
const error = ErrorFactory.entityResolution(
  "Failed to resolve user entity",
  "User",
  userId,
  {
    query: queryString,
    subgraphId: "users-service",
    requestId: context.requestId,
    timestamp: new Date().toISOString()
  },
  originalError
)

// ❌ Bad: Minimal context
const error = new Error("User not found")
```

### 3. Layer Error Boundaries Appropriately
```typescript
// ✅ Good: Layered error handling
const userResolver = pipe(
  // Business logic layer
  validateUserInput(input),
  Effect.flatMap(fetchUser),
  Effect.mapError(err => ErrorFactory.entityResolution(
    "User resolution failed",
    "User",
    input.id,
    {},
    err
  )),
  // Infrastructure layer (circuit breaker, timeout)
  circuitBreaker.protect,
  Effect.timeout(Duration.seconds(5))
)
```

### 4. Use Error Factories for Consistency
```typescript
// ✅ Good: Consistent error creation
const createUserValidationError = (field: string, value: unknown) =>
  ErrorFactory.validation(
    `User ${field} validation failed`,
    field,
    value,
    "USER_VALIDATION_ERROR"
  )

// ❌ Bad: Inconsistent error creation
const error1 = new ValidationError("Email invalid", "email", email)
const error2 = new Error("Invalid age") // Different error type
```

### 5. Handle Partial Failures Gracefully
```typescript
// ✅ Good: Graceful degradation
const errorBoundary = FederationErrorBoundaries.createResilientBoundary(
  ["users-service", "orders-service"],
  ["users-service"] // Only users-service is critical
)

// Non-critical services can fail without breaking the entire query
```

### 6. Transform Errors for Different Audiences
```typescript
// For development
const devError = {
  message: error.message,
  code: error.code,
  stack: error.cause?.stack,
  context: error.context,
  timestamp: error.timestamp
}

// For production users
const userError = ErrorMatching.toUserMessage(Effect.fail(error))

// For monitoring
const monitoringError = {
  severity: ErrorMatching.getSeverity(error),
  retryable: ErrorMatching.isRetryable(error),
  category: error.category,
  service: error.context?.subgraphId
}
```

### 7. Test Error Scenarios
```typescript
// Test all error paths
describe("UserResolver", () => {
  it("handles validation errors", () => {
    const result = pipe(
      resolveUser({ id: "" }),
      Effect.flip, // Convert success to failure for testing
      Effect.match({
        onSuccess: (error) => {
          expect(error._tag).toBe("ValidationError")
          expect(error.field).toBe("id")
        },
        onFailure: () => fail("Expected validation error")
      }),
      Effect.runSync
    )
  })

  it("handles circuit breaker", async () => {
    // Simulate failures to trigger circuit breaker
    for (let i = 0; i < 6; i++) {
      await Effect.runPromise(resolveUser({ id: "fail" }).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      ))
    }

    const state = circuitBreaker.getState()
    expect(state).toBe("open")
  })
})
```

## Summary

The Federation Framework v2 error handling system provides:

- **Type-safe error handling** with discriminated unions
- **Pattern matching** for exhaustive error processing  
- **Circuit breakers** for automatic fault tolerance
- **Error boundaries** for comprehensive protection
- **Rich error context** for debugging and monitoring
- **Factory functions** for consistent error creation

Use these patterns to build resilient federation services that gracefully handle failures and provide excellent observability for debugging and monitoring.