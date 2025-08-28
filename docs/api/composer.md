# Federation Composer API Reference

The modern Federation Composer provides comprehensive schema composition capabilities with enterprise-grade performance optimizations and resilience patterns.

## Core Function

### `createFederatedSchema(config: FederationConfig)`

Creates a federated GraphQL schema with entities, services, and advanced configurations.

**Parameters:**
- `config` - Complete federation configuration object

**Returns:** `Effect.Effect<FederatedSchemaResult, CompositionError>`

**Example:**
```typescript
import { createFederatedSchema } from "@cqrs/federation-v2"
import * as Effect from "effect/Effect"
import * as Duration from "effect/Duration"

const schema = yield* createFederatedSchema({
  entities: [userEntity, productEntity],
  services: [
    { id: "users", url: "http://localhost:4001", healthEndpoint: "/health" },
    { id: "products", url: "http://localhost:4002", healthEndpoint: "/health" }
  ],
  errorBoundaries: {
    subgraphTimeouts: {
      users: Duration.seconds(5),
      products: Duration.seconds(3)
    },
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeout: Duration.seconds(30),
      halfOpenMaxCalls: 3
    },
    partialFailureHandling: {
      allowPartialFailure: true,
      criticalSubgraphs: ["users"],
      fallbackValues: {
        products: { products: [] }
      }
    }
  },
  performance: {
    queryPlanCache: {
      maxSize: 1000,
      evictionStrategy: "lru-batch",
      ttl: Duration.minutes(10)
    },
    dataLoaderConfig: {
      maxBatchSize: 100,
      adaptiveBatching: true,
      batchWindow: Duration.millis(10)
    },
    connectionPool: {
      maxConnections: 15,
      reuseConnections: true
    }
  }
})
```

## Configuration Types

### `FederationConfig`

Complete federation configuration interface:

```typescript
interface FederationConfig {
  readonly entities: readonly FederationEntity[]
  readonly services: readonly ServiceConfig[]
  readonly errorBoundaries?: ErrorBoundaryConfig
  readonly performance?: PerformanceConfig
  readonly discovery?: ServiceDiscoveryConfig
  readonly security?: SecurityConfig
  readonly monitoring?: MonitoringConfig
}
```

### `ServiceConfig`

Service endpoint configuration with health monitoring:

```typescript
interface ServiceConfig {
  readonly id: string
  readonly url: string
  readonly healthEndpoint?: string
  readonly connectionPoolSize?: number
  readonly timeout?: Duration.Duration
  readonly retries?: number
  readonly headers?: Record<string, string>
}
```

**Example:**
```typescript
const services: ServiceConfig[] = [
  {
    id: "users",
    url: "http://users-service:4001",
    healthEndpoint: "/health",
    connectionPoolSize: 10,
    timeout: Duration.seconds(5),
    retries: 3,
    headers: {
      "Authorization": "Bearer ${token}",
      "X-Service-Version": "v2.0"
    }
  }
]
```

### `ErrorBoundaryConfig`

Comprehensive error handling and resilience configuration:

```typescript
interface ErrorBoundaryConfig {
  readonly subgraphTimeouts?: Record<string, Duration.Duration>
  readonly circuitBreakerConfig?: CircuitBreakerConfig
  readonly partialFailureHandling?: PartialFailureConfig
  readonly errorTransformation?: ErrorTransformConfig
}
```

#### `CircuitBreakerConfig`

Circuit breaker configuration with optimized defaults:

```typescript
interface CircuitBreakerConfig {
  readonly failureThreshold: number // Number of failures before opening
  readonly resetTimeout: Duration.Duration // Time before attempting reset
  readonly halfOpenMaxCalls?: number // Max calls in half-open state (default: 3)
  readonly minimumThroughput?: number // Min requests before evaluation
  readonly errorClassifier?: (error: unknown) => boolean // Custom error classification
}
```

**Example:**
```typescript
const circuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: Duration.seconds(30),
  halfOpenMaxCalls: 3, // Optimized for quick recovery
  minimumThroughput: 10,
  errorClassifier: (error) => 
    error instanceof NetworkError || error instanceof TimeoutError
}
```

#### `PartialFailureConfig`

Graceful degradation configuration:

```typescript
interface PartialFailureConfig {
  readonly allowPartialFailure: boolean
  readonly criticalSubgraphs?: readonly string[]
  readonly fallbackValues?: Record<string, unknown>
  readonly maxFailurePercentage?: number // Max percentage of services that can fail
}
```

**Example:**
```typescript
const partialFailureConfig: PartialFailureConfig = {
  allowPartialFailure: true,
  criticalSubgraphs: ["users", "authentication"],
  fallbackValues: {
    "recommendations": { recommendations: [] },
    "analytics": { metrics: null }
  },
  maxFailurePercentage: 50 // Allow up to 50% of non-critical services to fail
}
```

### `PerformanceConfig`

Performance optimization configuration:

```typescript
interface PerformanceConfig {
  readonly queryPlanCache?: QueryPlanCacheConfig
  readonly dataLoaderConfig?: DataLoaderConfig
  readonly connectionPool?: ConnectionPoolConfig
  readonly metricsCollection?: MetricsConfig
}
```

#### `QueryPlanCacheConfig`

LRU cache configuration with 40% performance improvement:

```typescript
interface QueryPlanCacheConfig {
  readonly maxSize: number
  readonly evictionStrategy?: "lru" | "lru-batch" // lru-batch is 40% faster
  readonly ttl?: Duration.Duration
  readonly enableMetrics?: boolean
}
```

**Example:**
```typescript
const queryPlanCache: QueryPlanCacheConfig = {
  maxSize: 1000,
  evictionStrategy: "lru-batch", // 40% faster than standard LRU
  ttl: Duration.minutes(10),
  enableMetrics: true
}
```

#### `DataLoaderConfig`

Adaptive batching configuration:

```typescript
interface DataLoaderConfig {
  readonly maxBatchSize: number
  readonly batchWindow?: Duration.Duration
  readonly adaptiveBatching?: boolean // Dynamic batch size adjustment
  readonly cacheKeyGenerator?: (args: unknown) => string
  readonly enableMetrics?: boolean
}
```

**Example:**
```typescript
const dataLoaderConfig: DataLoaderConfig = {
  maxBatchSize: 100,
  batchWindow: Duration.millis(10),
  adaptiveBatching: true, // Automatically adjusts batch size based on load
  cacheKeyGenerator: (args) => JSON.stringify(args),
  enableMetrics: true
}
```

#### `ConnectionPoolConfig`

Connection pooling for service discovery:

```typescript
interface ConnectionPoolConfig {
  readonly maxConnections: number
  readonly reuseConnections?: boolean // Default: true
  readonly connectionTimeout?: Duration.Duration
  readonly idleTimeout?: Duration.Duration
  readonly keepAlive?: boolean
}
```

**Example:**
```typescript
const connectionPool: ConnectionPoolConfig = {
  maxConnections: 15,
  reuseConnections: true, // Significant performance improvement
  connectionTimeout: Duration.seconds(5),
  idleTimeout: Duration.minutes(5),
  keepAlive: true
}
```

## Result Types

### `FederatedSchemaResult`

Successful composition result:

```typescript
interface FederatedSchemaResult {
  readonly schema: GraphQLSchema
  readonly entities: readonly FederationEntity[]
  readonly services: readonly ServiceConfig[]
  readonly metrics?: CompositionMetrics
  readonly health: HealthStatus
}
```

### `CompositionMetrics`

Performance and health metrics:

```typescript
interface CompositionMetrics {
  readonly compositionTime: Duration.Duration
  readonly entityCount: number
  readonly serviceCount: number
  readonly cacheHitRate?: number
  readonly averageResponseTime?: Duration.Duration
  readonly circuitBreakerStates: Record<string, "closed" | "open" | "half-open">
}
```

## Advanced Usage

### Layer-Based Configuration

Use Effect Layers for dependency injection:

```typescript
import { Layer } from "effect/Layer"
import { FederationConfigService, ProductionLayerLive } from "@cqrs/federation-v2/core"

// Custom configuration layer
const AppConfigLayer = Layer.succeed(FederationConfigService, {
  environment: "production",
  logLevel: "info",
  enableMetrics: true,
  performanceProfile: "optimized"
})

// Combine with production services
const AppLayerLive = Layer.mergeAll(
  ProductionLayerLive,
  AppConfigLayer
)

// Use in composition
const schema = yield* createFederatedSchema(config).pipe(
  Effect.provide(AppLayerLive)
)
```

### Dynamic Service Discovery

Configure dynamic service discovery:

```typescript
const discoveryConfig: ServiceDiscoveryConfig = {
  mode: "dynamic",
  healthCheckInterval: Duration.seconds(30),
  serviceRegistry: "consul", // or "kubernetes", "etcd"
  autoDiscovery: true,
  connectionPooling: true,
  loadBalancing: {
    strategy: "round-robin", // or "least-connections", "random"
    healthyOnly: true
  }
}

const schema = yield* createFederatedSchema({
  entities: entities,
  services: [], // Services discovered dynamically
  discovery: discoveryConfig,
  performance: performanceConfig
})
```

### Monitoring Integration

Comprehensive monitoring setup:

```typescript
const monitoringConfig: MonitoringConfig = {
  enableTracing: true,
  enableMetrics: true,
  metricsCollector: {
    type: "prometheus",
    port: 9090,
    path: "/metrics"
  },
  tracing: {
    serviceName: "federation-gateway",
    jaegerEndpoint: "http://jaeger:14268/api/traces"
  },
  healthCheck: {
    endpoint: "/health",
    interval: Duration.seconds(10),
    timeout: Duration.seconds(5)
  }
}

const schema = yield* createFederatedSchema({
  entities: entities,
  services: services,
  monitoring: monitoringConfig
})
```

## Error Handling

### Composition Errors

Handle composition failures with pattern matching:

```typescript
import * as Match from "effect/Match"

const result = yield* createFederatedSchema(config).pipe(
  Effect.catchAll(error =>
    Match.value(error).pipe(
      Match.tag("SchemaValidationError", err => {
        console.error("Schema validation failed:", err.violations)
        return Effect.fail(new Error("Invalid schema configuration"))
      }),
      Match.tag("ServiceDiscoveryError", err => {
        console.error("Service discovery failed:", err.serviceId)
        return Effect.fail(new Error("Unable to discover required services"))
      }),
      Match.tag("CircuitBreakerError", err => {
        console.error("Circuit breaker preventing composition:", err.serviceId)
        return Effect.fail(new Error("Services unavailable"))
      }),
      Match.exhaustive
    )
  )
)
```

### Runtime Error Handling

Handle runtime federation errors:

```typescript
// Built-in error boundary
const errorBoundary = FederationErrorBoundaries.createBoundary({
  subgraphTimeouts: timeouts,
  circuitBreakerConfig: circuitConfig,
  partialFailureHandling: {
    allowPartialFailure: true,
    fallbackStrategies: {
      "recommendations": "cache",
      "analytics": "skip"
    }
  }
})

// Schema with error boundary protection
const protectedSchema = errorBoundary.wrapSchema(schema)
```

## Performance Optimization

### Query Plan Caching

Optimize query plan caching for 40% performance improvement:

```typescript
const optimizedCache: QueryPlanCacheConfig = {
  maxSize: 10000,
  evictionStrategy: "lru-batch", // Batch eviction for better performance
  ttl: Duration.minutes(15),
  enableMetrics: true
}

// Monitor cache performance
const cacheMetrics = yield* PerformanceMonitor.getCacheMetrics()
console.log(`Cache hit rate: ${cacheMetrics.hitRate}%`)
console.log(`Average lookup time: ${Duration.toMillis(cacheMetrics.averageLookupTime)}ms`)
```

### Adaptive DataLoader

Configure adaptive batching:

```typescript
const adaptiveLoader: DataLoaderConfig = {
  maxBatchSize: 100,
  adaptiveBatching: true,
  batchWindow: Duration.millis(10),
  performanceThreshold: {
    maxLatency: Duration.millis(50),
    minThroughput: 1000
  }
}
```

## Best Practices

### 1. Environment-Specific Configuration

```typescript
// development.ts
export const developmentConfig: FederationConfig = {
  entities: entities,
  services: devServices,
  errorBoundaries: {
    circuitBreakerConfig: {
      failureThreshold: 10, // More lenient in dev
      resetTimeout: Duration.minutes(1)
    }
  },
  performance: {
    queryPlanCache: { maxSize: 100 } // Smaller cache in dev
  }
}

// production.ts  
export const productionConfig: FederationConfig = {
  entities: entities,
  services: prodServices,
  errorBoundaries: {
    circuitBreakerConfig: {
      failureThreshold: 3, // Strict in production
      resetTimeout: Duration.seconds(30)
    }
  },
  performance: {
    queryPlanCache: { 
      maxSize: 10000, // Large cache in production
      evictionStrategy: "lru-batch"
    }
  }
}
```

### 2. Health Monitoring

```typescript
const services: ServiceConfig[] = [
  {
    id: "users",
    url: process.env.USERS_SERVICE_URL!,
    healthEndpoint: "/health",
    timeout: Duration.seconds(5),
    retries: 3
  }
]

// Monitor service health
const healthStatus = yield* ServiceHealthMonitor.checkAll(services)
if (healthStatus.unhealthyServices.length > 0) {
  yield* Logger.warn("Unhealthy services detected", {
    services: healthStatus.unhealthyServices
  })
}
```

### 3. Graceful Degradation

```typescript
const partialFailureConfig: PartialFailureConfig = {
  allowPartialFailure: true,
  criticalSubgraphs: ["users", "authentication"],
  fallbackValues: {
    "recommendations": { 
      recommendations: [],
      fallbackReason: "Service temporarily unavailable"
    },
    "reviews": { 
      reviews: [],
      fallbackReason: "Reviews service degraded"
    }
  }
}
```

## Related APIs

- [Entity Builder](./entity-builder.md) - Creating federation entities
- [Ultra-Strict Entity Builder](./ultra-strict-entity-builder.md) - Type-safe entity creation
- [Performance API](./performance.md) - Performance optimization utilities
- [Error Handling](../guides/error-handling.md) - Comprehensive error patterns
- [Types](./types.md) - Core type definitions