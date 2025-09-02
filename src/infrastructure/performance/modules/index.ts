/**
 * Performance Modules Barrel Export
 * 
 * Re-exports all performance optimization modules for convenient access.
 * 
 * @module performance/modules
 */

// Cache module
export {
  type QueryPlan,
  type QueryStep,
  type CachedQueryPlan,
  type QueryPlanCache,
  type CacheStats,
  type CacheOperation,
  type QueryPlanCacheConfig,
  createQueryPlanCache,
  warmupCache,
} from './cache.js'

// DataLoader module
export {
  type FederatedDataLoader,
  type DataLoaderStats,
  type DataLoaderConfig,
  createFederatedDataLoader,
  createDataLoaderFactory,
  createReferenceLoader,
  createTTLDataLoader,
  batchLoaderOperations,
} from './dataloader.js'

// Metrics module
export {
  type MetricsCollector,
  type ExecutionMetrics,
  type SubgraphCall,
  type CacheOperation as MetricsCacheOperation,
  type PerformanceMetrics,
  type MetricsConfig,
  createMetricsCollector,
  createTimer,
  measureEffect,
  createMetricsReporter,
} from './metrics.js'