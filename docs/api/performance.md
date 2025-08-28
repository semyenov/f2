# Performance API Reference

The Performance API provides advanced optimization capabilities for Federation Framework v2, including LRU caching with 40% performance improvement, adaptive DataLoader batching, and comprehensive monitoring.

## Core Components

### Query Plan Cache

#### `createQueryPlanCache(config: QueryPlanCacheConfig)`

Creates an optimized LRU cache with batch eviction strategy.

**Parameters:**
- `config` - Cache configuration object

**Returns:** `Effect.Effect<QueryPlanCache, CacheError>`

```typescript
import { PerformanceOptimizations } from "@cqrs/federation-v2"
import * as Duration from "effect/Duration"

const cache = yield* PerformanceOptimizations.createQueryPlanCache({
  maxSize: 1000,
  evictionStrategy: "lru-batch", // 40% faster than standard LRU
  ttl: Duration.minutes(10),
  enableMetrics: true
})
```

#### `QueryPlanCacheConfig`

Configuration interface for query plan caching:

```typescript
interface QueryPlanCacheConfig {
  readonly maxSize: number
  readonly evictionStrategy?: "lru" | "lru-batch" // Default: "lru-batch"
  readonly ttl?: Duration.Duration
  readonly batchEvictionPercentage?: number // Default: 10% (for lru-batch)
  readonly enableMetrics?: boolean
  readonly warningThreshold?: number // Warn when cache is X% full
}
```

**Advanced Configuration:**
```typescript
const advancedCacheConfig: QueryPlanCacheConfig = {
  maxSize: 10000,
  evictionStrategy: "lru-batch",
  ttl: Duration.minutes(15),
  batchEvictionPercentage: 15, // Evict 15% when cache is full
  enableMetrics: true,
  warningThreshold: 80 // Warn at 80% capacity
}
```

#### Cache Operations

```typescript
// Cache operations
const queryHash = "user-query-123"
const queryPlan = { /* GraphQL query plan */ }

// Store query plan
yield* cache.set(queryHash, queryPlan)

// Retrieve query plan
const cachedPlan = yield* cache.get(queryHash)

// Check cache metrics
const metrics = yield* cache.getMetrics()
console.log(`Hit rate: ${metrics.hitRate}%`)
console.log(`Eviction count: ${metrics.evictionCount}`)
```

### DataLoader with Adaptive Batching

#### `createFederatedDataLoader(config: DataLoaderConfig)`

Creates a DataLoader with adaptive batching capabilities.

**Parameters:**
- `config` - DataLoader configuration

**Returns:** `Effect.Effect<FederatedDataLoader, DataLoaderError>`

```typescript
const dataLoader = yield* PerformanceOptimizations.createFederatedDataLoader({
  maxBatchSize: 100,
  batchWindow: Duration.millis(10),
  adaptiveBatching: true,
  performanceThreshold: {
    maxLatency: Duration.millis(50),
    minThroughput: 1000
  },
  enableMetrics: true
})
```

#### `DataLoaderConfig`

Configuration interface for adaptive DataLoader:

```typescript
interface DataLoaderConfig {
  readonly maxBatchSize: number
  readonly batchWindow?: Duration.Duration
  readonly adaptiveBatching?: boolean
  readonly performanceThreshold?: PerformanceThreshold
  readonly cacheKeyGenerator?: (args: unknown) => string
  readonly enableMetrics?: boolean
  readonly retryPolicy?: RetryPolicy
}

interface PerformanceThreshold {
  readonly maxLatency: Duration.Duration
  readonly minThroughput: number // requests per second
  readonly adaptationInterval?: Duration.Duration
}
```

**Adaptive Batching Example:**
```typescript
const adaptiveConfig: DataLoaderConfig = {
  maxBatchSize: 100,
  batchWindow: Duration.millis(10),
  adaptiveBatching: true,
  performanceThreshold: {
    maxLatency: Duration.millis(50),
    minThroughput: 1000,
    adaptationInterval: Duration.seconds(30) // Adjust every 30 seconds
  },
  cacheKeyGenerator: (userId: string) => `user:${userId}`,
  enableMetrics: true
}
```

### Connection Pooling

#### `createConnectionPool(config: ConnectionPoolConfig)`

Creates optimized connection pool for service discovery.

**Parameters:**
- `config` - Connection pool configuration

**Returns:** `Effect.Effect<ConnectionPool, ConnectionPoolError>`

```typescript
const connectionPool = yield* PerformanceOptimizations.createConnectionPool({
  maxConnections: 15,
  reuseConnections: true,
  connectionTimeout: Duration.seconds(5),
  idleTimeout: Duration.minutes(5),
  keepAlive: true,
  healthCheckInterval: Duration.seconds(30)
})
```

#### `ConnectionPoolConfig`

Configuration for connection pooling:

```typescript
interface ConnectionPoolConfig {
  readonly maxConnections: number
  readonly reuseConnections?: boolean // Default: true
  readonly connectionTimeout?: Duration.Duration
  readonly idleTimeout?: Duration.Duration
  readonly keepAlive?: boolean
  readonly healthCheckInterval?: Duration.Duration
  readonly retryPolicy?: ConnectionRetryPolicy
}

interface ConnectionRetryPolicy {
  readonly maxRetries: number
  readonly backoffStrategy: "linear" | "exponential" | "fixed"
  readonly baseDelay: Duration.Duration
  readonly maxDelay?: Duration.Duration
}
```

## Performance Monitoring

### Metrics Collection

#### `createPerformanceMonitor(config: MonitoringConfig)`

Creates comprehensive performance monitoring.

```typescript
const monitor = yield* PerformanceOptimizations.createPerformanceMonitor({
  enableCacheMetrics: true,
  enableDataLoaderMetrics: true,
  enableConnectionMetrics: true,
  metricsInterval: Duration.seconds(30),
  alertThresholds: {
    cacheHitRateBelow: 80,
    avgResponseTimeAbove: Duration.millis(100),
    errorRateAbove: 5
  }
})
```

#### Performance Metrics

```typescript
interface PerformanceMetrics {
  readonly cache: CacheMetrics
  readonly dataLoader: DataLoaderMetrics  
  readonly connections: ConnectionMetrics
  readonly overall: OverallMetrics
}

interface CacheMetrics {
  readonly hitRate: number
  readonly missRate: number
  readonly evictionCount: number
  readonly averageLookupTime: Duration.Duration
  readonly memoryUsage: number
}

interface DataLoaderMetrics {
  readonly averageBatchSize: number
  readonly batchUtilization: number
  readonly adaptationCount: number
  readonly averageLatency: Duration.Duration
  readonly throughput: number
}

interface ConnectionMetrics {
  readonly activeConnections: number
  readonly poolUtilization: number
  readonly averageConnectionTime: Duration.Duration
  readonly connectionErrors: number
  readonly healthyConnections: number
}
```

### Performance Profiling

```typescript
// Start performance profiling
const profiler = yield* PerformanceOptimizations.startProfiler({
  duration: Duration.minutes(5),
  sampleInterval: Duration.seconds(1),
  includeMemoryProfile: true
})

// Get performance snapshot
const snapshot = yield* profiler.getSnapshot()

console.log("Performance Snapshot:")
console.log(`Cache hit rate: ${snapshot.cache.hitRate}%`)
console.log(`Average batch size: ${snapshot.dataLoader.averageBatchSize}`)
console.log(`Connection pool utilization: ${snapshot.connections.poolUtilization}%`)
```

## Optimization Utilities

### Cache Optimization

#### `optimizeCache(cache: QueryPlanCache)`

Provides cache optimization recommendations:

```typescript
const optimization = yield* PerformanceOptimizations.optimizeCache(cache)

if (optimization.recommendations.length > 0) {
  console.log("Cache Optimization Recommendations:")
  optimization.recommendations.forEach(rec => {
    console.log(`- ${rec.type}: ${rec.description}`)
    console.log(`  Expected improvement: ${rec.expectedImprovement}`)
  })
}

// Apply automatic optimizations
yield* optimization.applyAutomaticOptimizations()
```

### DataLoader Tuning

#### `tuneDataLoader(dataLoader: FederatedDataLoader)`

Automatically tunes DataLoader parameters:

```typescript
const tuning = yield* PerformanceOptimizations.tuneDataLoader(dataLoader, {
  observationPeriod: Duration.minutes(10),
  targetLatency: Duration.millis(30),
  targetThroughput: 2000
})

console.log("DataLoader Tuning Results:")
console.log(`Recommended batch size: ${tuning.recommendedBatchSize}`)
console.log(`Recommended batch window: ${Duration.toMillis(tuning.recommendedBatchWindow)}ms`)
```

### Connection Pool Optimization

```typescript
const poolOptimization = yield* PerformanceOptimizations.optimizeConnectionPool(
  connectionPool,
  {
    targetUtilization: 70, // Target 70% utilization
    maxLatency: Duration.millis(100),
    monitoringPeriod: Duration.minutes(15)
  }
)

if (poolOptimization.needsAdjustment) {
  console.log(`Recommended pool size: ${poolOptimization.recommendedPoolSize}`)
  console.log(`Current efficiency: ${poolOptimization.currentEfficiency}%`)
}
```

## Advanced Performance Patterns

### Layered Caching Strategy

```typescript
const layeredCache = yield* PerformanceOptimizations.createLayeredCache({
  l1Cache: {
    maxSize: 100,
    ttl: Duration.minutes(1),
    evictionStrategy: "lru"
  },
  l2Cache: {
    maxSize: 10000,
    ttl: Duration.minutes(30),
    evictionStrategy: "lru-batch"
  },
  coherencyStrategy: "write-through"
})
```

### Circuit Breaker Integration

```typescript
const performanceCircuitBreaker = yield* PerformanceOptimizations.createPerformanceBreaker({
  latencyThreshold: Duration.millis(200),
  errorRateThreshold: 10, // 10% error rate
  throughputThreshold: 100, // Minimum 100 RPS
  evaluationWindow: Duration.minutes(5)
})

// Integrate with query execution
const protectedQuery = performanceCircuitBreaker.protect(
  queryExecutor.execute(query)
)
```

### Batch Processing Optimization

```typescript
const batchProcessor = yield* PerformanceOptimizations.createBatchProcessor({
  processors: [
    {
      type: "entity-resolution",
      batchSize: 50,
      processingWindow: Duration.millis(20)
    },
    {
      type: "field-resolution", 
      batchSize: 100,
      processingWindow: Duration.millis(10)
    }
  ],
  prioritization: "latency-first",
  adaptiveProcessing: true
})
```

## Performance Testing

### Benchmarking Tools

```typescript
// Benchmark query plan cache
const cachebenchmark = yield* PerformanceOptimizations.benchmarkCache(cache, {
  testDuration: Duration.minutes(2),
  concurrency: 10,
  operationMix: {
    read: 80, // 80% reads
    write: 20 // 20% writes
  }
})

console.log("Cache Benchmark Results:")
console.log(`Avg read latency: ${Duration.toMillis(cachebenchmark.avgReadLatency)}ms`)
console.log(`Avg write latency: ${Duration.toMillis(cachebenchmark.avgWriteLatency)}ms`)
console.log(`Operations per second: ${cachebenchmark.operationsPerSecond}`)

// Benchmark DataLoader
const loaderBenchmark = yield* PerformanceOptimizations.benchmarkDataLoader(
  dataLoader,
  {
    requestCount: 10000,
    concurrency: 20,
    dataVariation: "random"
  }
)

console.log("DataLoader Benchmark Results:")
console.log(`Avg batch size: ${loaderBenchmark.avgBatchSize}`)
console.log(`Batching efficiency: ${loaderBenchmark.batchingEfficiency}%`)
```

### Load Testing

```typescript
const loadTest = yield* PerformanceOptimizations.createLoadTest({
  targetRPS: 1000,
  duration: Duration.minutes(10),
  rampUpTime: Duration.minutes(2),
  scenarios: [
    {
      name: "user-query",
      weight: 60,
      query: userQuery
    },
    {
      name: "product-query",
      weight: 40, 
      query: productQuery
    }
  ]
})

const loadTestResults = yield* loadTest.execute()
```

## Configuration Best Practices

### Development Environment

```typescript
const devPerformanceConfig: PerformanceConfig = {
  queryPlanCache: {
    maxSize: 100,
    evictionStrategy: "lru", // Simpler strategy for dev
    ttl: Duration.minutes(5),
    enableMetrics: true
  },
  dataLoaderConfig: {
    maxBatchSize: 20,
    adaptiveBatching: false, // Fixed batching in dev
    enableMetrics: true
  },
  connectionPool: {
    maxConnections: 5,
    reuseConnections: true
  }
}
```

### Production Environment

```typescript
const prodPerformanceConfig: PerformanceConfig = {
  queryPlanCache: {
    maxSize: 10000,
    evictionStrategy: "lru-batch", // 40% faster
    ttl: Duration.minutes(30),
    batchEvictionPercentage: 10,
    enableMetrics: true,
    warningThreshold: 85
  },
  dataLoaderConfig: {
    maxBatchSize: 100,
    adaptiveBatching: true,
    performanceThreshold: {
      maxLatency: Duration.millis(50),
      minThroughput: 1000
    },
    enableMetrics: true
  },
  connectionPool: {
    maxConnections: 20,
    reuseConnections: true,
    healthCheckInterval: Duration.seconds(30)
  }
}
```

## Troubleshooting Performance Issues

### Cache Performance Issues

```typescript
// Diagnose cache performance
const cacheDiagnosis = yield* PerformanceOptimizations.diagnoseCache(cache)

if (cacheDiagnosis.hitRate < 50) {
  console.warn("Low cache hit rate detected")
  console.log("Recommendations:")
  cacheDiagnosis.recommendations.forEach(rec => console.log(`- ${rec}`))
}

if (cacheDiagnosis.evictionRate > 20) {
  console.warn("High eviction rate - consider increasing cache size")
}
```

### DataLoader Issues

```typescript
// Diagnose DataLoader performance
const loaderDiagnosis = yield* PerformanceOptimizations.diagnoseDataLoader(dataLoader)

if (loaderDiagnosis.averageBatchSize < 10) {
  console.warn("Low batch utilization - consider adjusting batch window")
}

if (loaderDiagnosis.adaptationFrequency > 10) {
  console.warn("Frequent adaptations - workload may be too variable")
}
```

### Connection Pool Issues

```typescript
// Diagnose connection pool
const poolDiagnosis = yield* PerformanceOptimizations.diagnoseConnectionPool(connectionPool)

if (poolDiagnosis.utilizationRate > 90) {
  console.warn("Connection pool near capacity - consider scaling")
}

if (poolDiagnosis.connectionErrorRate > 5) {
  console.error("High connection error rate detected")
}
```

## Related APIs

- [Federation Composer](./composer.md) - Main composition API
- [Error Handling](../guides/error-handling.md) - Error patterns and circuit breakers
- [Performance Tuning Guide](../guides/performance-tuning.md) - Optimization strategies
- [Types](./types.md) - Core type definitions