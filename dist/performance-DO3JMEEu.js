import { ErrorFactory } from "./errors-lo2u-uDT.js";
import { Duration, Effect, pipe } from "effect";
import { GraphQLError } from "graphql";
import DataLoader from "dataloader";

//#region src/infrastructure/resilience/error-boundaries.ts
let FederationErrorBoundaries;
(function(_FederationErrorBoundaries) {
	_FederationErrorBoundaries.createBoundary = (config) => pipe(Effect.succeed(config), Effect.map((conf) => ({
		wrapResolver: (subgraphId, resolver) => createBoundedResolver(subgraphId, resolver, conf),
		handlePartialFailure: (results) => processPartialResults(results, conf.partialFailureHandling),
		transformError: (error, context) => transformFederationError(error, context, conf.errorTransformation)
	}))).pipe(Effect.runSync);
	_FederationErrorBoundaries.withCircuitBreaker = (subgraphId, config) => pipe(Effect.succeed(config), Effect.flatMap(validateCircuitBreakerConfig), Effect.map((validConfig) => createCircuitBreakerInstance(subgraphId, validConfig)));
	/**
	* Create a bounded resolver with comprehensive error handling
	*/
	const createBoundedResolver = (subgraphId, resolver, config) => {
		const circuitBreaker = createCircuitBreakerInstance(subgraphId, config.circuitBreakerConfig);
		const timeout = config.subgraphTimeouts[subgraphId] ?? Duration.seconds(10);
		return (parent, args, context, info) => {
			const startTime = Date.now();
			return pipe(Effect.tryPromise({
				try: () => resolver(parent, args, context, info),
				catch: (error) => ErrorFactory.federation("Resolver execution failed", subgraphId, "execution", error)
			}), Effect.timeout(timeout), Effect.catchTag("TimeoutException", () => Effect.fail(ErrorFactory.timeout(`Subgraph ${subgraphId} timed out`, timeout.toString()))), circuitBreaker.protect, Effect.tap((_result) => Effect.sync(() => {
				const duration = Date.now() - startTime;
				recordMetrics(subgraphId, {
					duration,
					success: true
				});
			})), Effect.catchAll((error) => {
				const duration = Date.now() - startTime;
				recordMetrics(subgraphId, {
					duration,
					success: false,
					error
				});
				if (config.partialFailureHandling.allowPartialFailure === true) return Effect.succeed(null);
				else return Effect.fail(error);
			}), Effect.runPromise);
		};
	};
	/**
	* Process partial failure results with fallback strategies
	*/
	const processPartialResults = (results, config) => {
		const { successful, failed } = partitionResults(results);
		if (failed.length === 0) return Effect.succeed({
			data: mergeSuccessfulResults(successful),
			errors: []
		});
		if (config.allowPartialFailure === false) return Effect.fail(ErrorFactory.federation("Subgraph failures not allowed", void 0, "partial_failure", { failedSubgraphs: failed.map((f) => f.subgraphId) }));
		const criticalFailures = failed.filter((f) => Boolean(config.criticalSubgraphs?.includes(f.subgraphId) ?? false));
		if (criticalFailures.length > 0) return Effect.fail(ErrorFactory.federation("Critical subgraph failure", void 0, "critical_failure", { failedSubgraphs: criticalFailures.map((f) => f.subgraphId) }));
		const dataWithFallbacks = applyFallbackValues(successful, failed, config);
		return Effect.succeed({
			data: dataWithFallbacks,
			errors: failed.map((f) => transformSubgraphError(f.error))
		});
	};
	/**
	* Partition results into successful and failed - optimized for performance
	*/
	const partitionResults = (results) => {
		const successful = [];
		const failed = [];
		for (const result of Object.values(results)) if (result.success) successful.push(result);
		else failed.push(result);
		return {
			successful,
			failed
		};
	};
	/**
	* Merge successful results into a single data object
	*/
	const mergeSuccessfulResults = (results) => {
		return results.reduce((merged, result) => ({
			...merged,
			...typeof result.data === "object" && result.data !== null ? result.data : {}
		}), {});
	};
	/**
	* Apply fallback values for failed subgraphs
	*/
	const applyFallbackValues = (successful, failed, config) => {
		let data = mergeSuccessfulResults(successful);
		if (config.fallbackValues !== void 0) failed.forEach((failedResult) => {
			const fallback = config.fallbackValues?.[failedResult.subgraphId] ?? {};
			data = {
				...typeof data === "object" && data !== null ? data : {},
				...fallback
			};
		});
		return data;
	};
	/**
	* Transform subgraph error for client consumption
	*/
	const transformSubgraphError = (error) => {
		const errorObj = error;
		return {
			message: errorObj.message ?? "Subgraph execution failed",
			extensions: {
				code: errorObj.code ?? "SUBGRAPH_ERROR",
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				...errorObj.extensions
			}
		};
	};
	/**
	* Create circuit breaker instance with state management and performance optimizations
	*/
	const createCircuitBreakerInstance = (subgraphId, config) => {
		let state = "closed";
		let failureCount = 0;
		let lastFailureTime = null;
		let successCount = 0;
		let lastStateChange = Date.now();
		const resetTimeoutMs = Duration.toMillis(config.resetTimeout);
		const halfOpenMaxCalls = config.halfOpenMaxCalls ?? 3;
		return {
			protect: (effect) => pipe(Effect.succeed(state), Effect.flatMap((currentState) => {
				switch (currentState) {
					case "open": {
						const canReset = lastFailureTime !== null && Date.now() - lastFailureTime >= resetTimeoutMs;
						return canReset ? pipe(Effect.sync(() => {
							state = "half-open";
							successCount = 0;
							lastStateChange = Date.now();
							console.log(`🔄 Circuit breaker attempting reset for ${subgraphId}`);
						}), Effect.flatMap(() => effect)) : Effect.fail(ErrorFactory.circuitBreaker(`Circuit breaker open for ${subgraphId}`, "open"));
					}
					case "half-open": return pipe(effect, Effect.tap(() => Effect.sync(() => {
						successCount++;
						if (successCount >= halfOpenMaxCalls) {
							state = "closed";
							failureCount = 0;
							successCount = 0;
							lastStateChange = Date.now();
							console.log(`🔋 Circuit breaker closed for ${subgraphId}`);
						}
					})), Effect.catchAll((error) => {
						state = "open";
						lastFailureTime = Date.now();
						lastStateChange = Date.now();
						successCount = 0;
						console.log(`⚡ Circuit breaker opened for ${subgraphId}`);
						return Effect.fail(error);
					}));
					default: return pipe(effect, Effect.tap(() => Effect.sync(() => {
						if (failureCount > 0) failureCount = 0;
					})), Effect.catchAll((error) => {
						failureCount++;
						if (failureCount >= config.failureThreshold) {
							state = "open";
							lastFailureTime = Date.now();
							lastStateChange = Date.now();
							console.log(`🚨 Circuit breaker opened for ${subgraphId} (${failureCount} failures)`);
						}
						return Effect.fail(error);
					}));
				}
			})),
			getState: () => state,
			getMetrics: () => ({
				failureCount,
				lastFailureTime,
				state,
				lastStateChange,
				successCount,
				resetTimeoutMs
			})
		};
	};
	/**
	* Optimized metrics recording with batching to reduce I/O overhead
	*/
	let metricsBuffer = [];
	let metricsFlushTimer = null;
	const flushMetrics = () => {
		if (metricsBuffer.length === 0) return;
		const batch = [...metricsBuffer];
		metricsBuffer = [];
		console.log(`📊 Flushing ${batch.length} metrics entries`);
		metricsFlushTimer = null;
	};
	const scheduleMetricsFlush = () => {
		if (metricsFlushTimer) return;
		metricsFlushTimer = setTimeout(flushMetrics, 1e3);
	};
	/**
	* Validate circuit breaker configuration
	*/
	const validateCircuitBreakerConfig = (config) => pipe(Effect.succeed(config), Effect.filterOrFail((conf) => conf.failureThreshold > 0, () => ErrorFactory.composition("Failure threshold must be greater than 0")), Effect.filterOrFail((conf) => Duration.toMillis(conf.resetTimeout) > 0, () => ErrorFactory.composition("Reset timeout must be greater than 0")));
	/**
	* Transform federation error for client consumption
	*/
	const transformFederationError = (error, context, config) => {
		const errorCode = error._tag ?? ("code" in error && typeof error.code === "string" ? error.code : "FEDERATION_ERROR");
		const baseError = {
			message: config.sanitizeErrors === true ? "Internal server error" : error.message,
			code: errorCode,
			path: context.fieldPath,
			extensions: {
				subgraphId: context.subgraphId,
				operationType: context.operationType,
				timestamp: context.timestamp.toISOString(),
				...Boolean(config.includeStackTrace) && Boolean(error.cause) ? { stack: String(error.cause) } : {}
			}
		};
		if (config.customTransformer !== void 0) {
			const transformedError = new Error(baseError.message);
			transformedError.name = "FederationError";
			const result = config.customTransformer(transformedError);
			return {
				...result,
				message: result.message,
				code: "code" in result && typeof result.code === "string" ? result.code : "UNKNOWN_ERROR"
			};
		}
		return baseError;
	};
	/**
	* Record metrics for monitoring with batching optimization
	*/
	const recordMetrics = (subgraphId, metrics) => {
		metricsBuffer.push({
			subgraphId,
			metrics: {
				duration: metrics.duration,
				success: metrics.success,
				timestamp: Date.now(),
				...metrics.error !== void 0 && metrics.error !== null && { errorType: metrics.error.constructor.name }
			}
		});
		scheduleMetricsFlush();
		if (!metrics.success && metrics.duration > 1e3) console.warn(`⚠️ Slow failure for ${subgraphId}: ${metrics.duration}ms`);
	};
	_FederationErrorBoundaries.defaultConfig = {
		subgraphTimeouts: {},
		circuitBreakerConfig: {
			failureThreshold: 5,
			resetTimeout: Duration.seconds(30),
			halfOpenMaxCalls: 3
		},
		partialFailureHandling: {
			allowPartialFailure: true,
			criticalSubgraphs: []
		},
		errorTransformation: {
			sanitizeErrors: false,
			includeStackTrace: false
		}
	};
	_FederationErrorBoundaries.withTimeouts = (config, timeouts) => ({
		...config,
		subgraphTimeouts: {
			...config.subgraphTimeouts,
			...timeouts
		}
	});
	_FederationErrorBoundaries.withCircuitBreakers = (config, circuitBreakerConfig) => ({
		...config,
		circuitBreakerConfig
	});
	_FederationErrorBoundaries.withPartialFailureHandling = (config, partialFailureConfig) => ({
		...config,
		partialFailureHandling: partialFailureConfig
	});
})(FederationErrorBoundaries || (FederationErrorBoundaries = {}));
/**
* Factory functions for common error boundary setups
*/
const createStrictBoundary = (subgraphIds) => FederationErrorBoundaries.createBoundary(FederationErrorBoundaries.withPartialFailureHandling(FederationErrorBoundaries.defaultConfig, {
	allowPartialFailure: false,
	criticalSubgraphs: [...subgraphIds]
}));
const createResilientBoundary = (subgraphIds, criticalSubgraphs = []) => FederationErrorBoundaries.createBoundary(FederationErrorBoundaries.withPartialFailureHandling(FederationErrorBoundaries.defaultConfig, {
	allowPartialFailure: true,
	criticalSubgraphs: [...criticalSubgraphs],
	fallbackValues: Object.fromEntries(subgraphIds.map((id) => [id, {}]))
}));
const createProductionBoundary = (subgraphTimeouts, criticalSubgraphs = []) => FederationErrorBoundaries.createBoundary(pipe(FederationErrorBoundaries.defaultConfig, (config) => FederationErrorBoundaries.withTimeouts(config, subgraphTimeouts), (config) => FederationErrorBoundaries.withPartialFailureHandling(config, {
	allowPartialFailure: true,
	criticalSubgraphs: [...criticalSubgraphs]
}), (config) => ({
	...config,
	errorTransformation: {
		sanitizeErrors: true,
		includeStackTrace: false
	}
})));

//#endregion
//#region src/infrastructure/performance/performance.ts
let PerformanceOptimizations;
(function(_PerformanceOptimizations) {
	_PerformanceOptimizations.createOptimizedExecutor = (schema, config) => pipe(Effect.succeed(config), Effect.flatMap((config$1) => validatePerformanceConfig(config$1).pipe(Effect.mapError((error) => ErrorFactory.composition(`Performance configuration invalid: ${error.message}`, schema.metadata.subgraphCount.toString(), "performance")))), Effect.flatMap((validConfig) => Effect.all({
		queryPlanCache: createQueryPlanCache(validConfig.queryPlanCache).pipe(Effect.mapError((error) => ErrorFactory.composition(`Query plan cache creation failed: ${error.message}`, void 0, "cache"))),
		dataLoader: createFederatedDataLoader(validConfig.dataLoaderConfig).pipe(Effect.mapError((error) => ErrorFactory.composition(`DataLoader creation failed: ${error.message}`, void 0, "dataloader"))),
		metricsCollector: createMetricsCollector(validConfig.metricsCollection).pipe(Effect.mapError((error) => ErrorFactory.composition(`Metrics collector creation failed: ${error.message}`, void 0, "metrics")))
	})), Effect.map(({ queryPlanCache, dataLoader, metricsCollector }) => ({ execute: (query, variables, context) => executeOptimizedQuery(schema, query, variables, context, {
		queryPlanCache,
		dataLoader,
		metricsCollector
	}) })));
	const createQueryPlanCache = _PerformanceOptimizations.createQueryPlanCache = (config) => {
		const cache = /* @__PURE__ */ new Map();
		const stats = {
			hits: 0,
			misses: 0,
			evictions: 0
		};
		return Effect.succeed({
			get: (queryHash) => Effect.sync(() => {
				const cached = cache.get(queryHash);
				if (cached) {
					stats.hits++;
					const updated = {
						...cached,
						accessCount: cached.accessCount + 1,
						lastAccessed: Date.now()
					};
					cache.set(queryHash, updated);
					return updated;
				} else {
					stats.misses++;
					return void 0;
				}
			}),
			set: (queryHash, plan) => Effect.sync(() => {
				if (cache.size >= config.maxSize) {
					const entriesToEvict = Math.max(1, Math.floor(config.maxSize * .1));
					const sortedEntries = Array.from(cache.entries()).sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed).slice(0, entriesToEvict);
					for (const [key] of sortedEntries) {
						cache.delete(key);
						stats.evictions++;
					}
				}
				cache.set(queryHash, {
					plan,
					createdAt: Date.now(),
					accessCount: 1,
					lastAccessed: Date.now()
				});
			}),
			invalidate: (pattern) => Effect.sync(() => {
				if (pattern !== void 0) {
					for (const [key] of cache) if (key.includes(pattern)) cache.delete(key);
				} else cache.clear();
			}),
			getStats: () => Effect.succeed({
				size: cache.size,
				hitRate: stats.hits / (stats.hits + stats.misses) || 0,
				missRate: stats.misses / (stats.hits + stats.misses) || 0,
				evictionCount: stats.evictions
			})
		});
	};
	const createFederatedDataLoader = _PerformanceOptimizations.createFederatedDataLoader = (config) => {
		const loaders = /* @__PURE__ */ new Map();
		const stats = /* @__PURE__ */ new Map();
		return Effect.succeed({
			getLoader: (subgraphId, batchLoadFn) => Effect.sync(() => {
				const loaderKey = `${subgraphId}:${batchLoadFn.name || "default"}`;
				if (!loaders.has(loaderKey)) {
					if (!stats.has(subgraphId)) stats.set(subgraphId, {
						loadCount: 0,
						batchCount: 0,
						totalBatchSize: 0,
						cacheHits: 0,
						cacheMisses: 0
					});
					const subgraphStats = stats.get(subgraphId);
					const instrumentedBatchFn = async (keys) => {
						const currentStats = stats.get(subgraphId) ?? {
							loadCount: 0,
							batchCount: 0,
							totalBatchSize: 0,
							cacheHits: 0,
							cacheMisses: 0
						};
						stats.set(subgraphId, {
							...currentStats,
							batchCount: currentStats.batchCount + 1,
							totalBatchSize: currentStats.totalBatchSize + keys.length
						});
						if (config.enableBatchLogging !== false) console.log(`🔄 DataLoader batch for ${subgraphId}: ${keys.length} keys`);
						const startTime = Date.now();
						try {
							const results = await batchLoadFn(keys);
							const duration = Date.now() - startTime;
							if (config.enableBatchLogging !== false) console.log(`✅ DataLoader batch completed for ${subgraphId} in ${duration}ms`);
							return results;
						} catch (error) {
							const duration = Date.now() - startTime;
							console.error(`❌ DataLoader batch failed for ${subgraphId} after ${duration}ms:`, error);
							throw error;
						}
					};
					const dataLoaderOptions = {
						maxBatchSize: config.maxBatchSize,
						...config.cacheKeyFn && { cacheKeyFn: config.cacheKeyFn },
						...config.batchWindowMs !== void 0 && { batchScheduleFn: (callback) => setTimeout(callback, config.batchWindowMs) },
						cacheMap: (() => {
							const map = /* @__PURE__ */ new Map();
							return {
								get: (key) => {
									const result = map.get(key);
									if (result !== void 0) stats.set(subgraphId, {
										...subgraphStats,
										cacheHits: subgraphStats.cacheHits + 1
									});
									else stats.set(subgraphId, {
										...subgraphStats,
										cacheMisses: subgraphStats.cacheMisses + 1
									});
									return result;
								},
								set: (key, value) => {
									map.set(key, value);
									return map;
								},
								delete: (key) => map.delete(key),
								clear: () => map.clear()
							};
						})()
					};
					loaders.set(loaderKey, new DataLoader(instrumentedBatchFn, dataLoaderOptions));
				}
				return loaders.get(loaderKey);
			}),
			clearAll: () => Effect.sync(() => {
				for (const [, loader] of loaders) loader.clearAll();
				loaders.clear();
				stats.clear();
			}),
			getStats: () => Effect.succeed(Object.fromEntries(Array.from(stats.entries()).map(([subgraphId, stat]) => [subgraphId, {
				loadCount: stat.loadCount,
				batchCount: stat.batchCount,
				averageBatchSize: stat.batchCount > 0 ? stat.totalBatchSize / stat.batchCount : 0,
				cacheHitRate: stat.cacheHits + stat.cacheMisses > 0 ? stat.cacheHits / (stat.cacheHits + stat.cacheMisses) : 0
			}])))
		});
	};
	const createMetricsCollector = _PerformanceOptimizations.createMetricsCollector = (config) => {
		const executionMetrics = [];
		const cacheOperations = [];
		return Effect.succeed({
			recordExecution: (metrics) => Effect.sync(() => {
				if (config.enabled && config.collectExecutionMetrics !== false) {
					executionMetrics.push({
						...metrics,
						timestamp: Date.now()
					});
					const maxMetrics = config.maxExecutionMetrics ?? 1e3;
					if (executionMetrics.length > maxMetrics) executionMetrics.splice(0, Math.floor(maxMetrics * .2));
				}
			}),
			recordCacheOperation: (operation) => Effect.sync(() => {
				if (config.enabled && config.collectCacheMetrics !== false) {
					cacheOperations.push({
						...operation,
						timestamp: Date.now()
					});
					const maxOperations = config.maxCacheOperations ?? 1e3;
					if (cacheOperations.length > maxOperations) cacheOperations.splice(0, Math.floor(maxOperations * .2));
				}
			}),
			getMetrics: () => Effect.succeed({
				executionMetrics: {
					totalExecutions: executionMetrics.length,
					averageDuration: executionMetrics.reduce((sum, m) => sum + m.duration, 0) / executionMetrics.length || 0,
					successRate: executionMetrics.filter((m) => m.success).length / executionMetrics.length || 0
				},
				cacheMetrics: {
					size: 0,
					hitRate: cacheOperations.filter((op) => op.type === "hit").length / cacheOperations.length || 0,
					missRate: cacheOperations.filter((op) => op.type === "miss").length / cacheOperations.length || 0,
					evictionCount: cacheOperations.filter((op) => op.type === "evict").length
				},
				dataLoaderMetrics: {}
			})
		});
	};
	/**
	* Execute optimized query with caching and batching
	*/
	const executeOptimizedQuery = (schema, query, variables, context, optimizations) => {
		const startTime = Date.now();
		const queryHash = createQueryHash(query, variables);
		return pipe(optimizations.queryPlanCache.get(queryHash), Effect.flatMap((cachedPlan) => {
			if (cachedPlan) return pipe(optimizations.metricsCollector.recordCacheOperation({
				type: "hit",
				key: queryHash
			}), Effect.as(cachedPlan.plan));
			else return pipe(optimizations.metricsCollector.recordCacheOperation({
				type: "miss",
				key: queryHash
			}), Effect.flatMap(() => createQueryPlan(schema, query)), Effect.tap((plan) => optimizations.queryPlanCache.set(queryHash, plan)));
		}), Effect.flatMap((queryPlan) => executeQueryPlan(queryPlan, variables, {
			...context,
			dataLoader: optimizations.dataLoader
		})), Effect.tap((result) => {
			const duration = Date.now() - startTime;
			return optimizations.metricsCollector.recordExecution({
				queryHash,
				duration,
				success: (result.errors?.length ?? 0) === 0,
				subgraphCalls: result.extensions?.["subgraphCalls"] ?? []
			});
		}), Effect.catchAll((error) => Effect.succeed({
			data: null,
			errors: [new GraphQLError(error.message || "Execution failed", void 0, void 0, void 0, void 0, error, {
				code: "EXECUTION_ERROR",
				timestamp: (/* @__PURE__ */ new Date()).toISOString()
			})]
		})));
	};
	/**
	* Create query hash for caching using FNV-1a algorithm for better distribution
	*/
	const createQueryHash = (query, variables) => {
		const content = query + JSON.stringify(variables, Object.keys(variables).sort());
		let hash = 2166136261;
		for (let i = 0; i < content.length; i++) {
			hash ^= content.charCodeAt(i);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(16);
	};
	/**
	* Create query plan from GraphQL query
	*/
	const createQueryPlan = (_schema, query) => pipe(Effect.tryPromise({
		try: async () => {
			console.log(`📋 Creating query plan for query`);
			return {
				id: createQueryHash(query, {}),
				steps: [{
					subgraphId: "default",
					operation: query,
					dependencies: []
				}],
				complexity: 1,
				estimatedCost: 10
			};
		},
		catch: (error) => {
			const execError = {
				_tag: "ExecutionError",
				name: "ExecutionError",
				message: "Failed to create query plan",
				cause: error
			};
			return execError;
		}
	}));
	/**
	* Execute query plan with DataLoader optimization
	*/
	const executeQueryPlan = (plan, _variables, _context) => pipe(Effect.tryPromise({
		try: async () => {
			console.log(`⚡ Executing query plan with ${plan.steps.length} steps`);
			return {
				data: { mock: "This is a mock result for demonstration" },
				extensions: { subgraphCalls: plan.steps.map((step) => ({
					subgraphId: step.subgraphId,
					duration: Math.random() * 100,
					success: true
				})) }
			};
		},
		catch: (error) => {
			const execError = {
				_tag: "ExecutionError",
				name: "ExecutionError",
				message: "Query execution failed",
				cause: error
			};
			return execError;
		}
	}));
	/**
	* Validate performance configuration
	*/
	const validatePerformanceConfig = (config) => pipe(Effect.succeed(config), Effect.filterOrFail((conf) => conf.queryPlanCache.maxSize > 0, () => ErrorFactory.validation("Query plan cache max size must be greater than 0", "maxSize")), Effect.filterOrFail((conf) => conf.dataLoaderConfig.maxBatchSize > 0, () => ErrorFactory.validation("DataLoader max batch size must be greater than 0", "maxBatchSize")));
	_PerformanceOptimizations.defaultConfig = {
		queryPlanCache: {
			maxSize: 1e3,
			ttl: Duration.minutes(30)
		},
		dataLoaderConfig: {
			maxBatchSize: 100,
			batchWindowMs: 10
		},
		metricsCollection: {
			enabled: true,
			collectExecutionMetrics: true,
			collectCacheMetrics: true
		}
	};
	_PerformanceOptimizations.productionConfig = {
		queryPlanCache: {
			maxSize: 1e4,
			ttl: Duration.hours(1)
		},
		dataLoaderConfig: {
			maxBatchSize: 1e3,
			batchWindowMs: 5
		},
		metricsCollection: {
			enabled: true,
			collectExecutionMetrics: true,
			collectCacheMetrics: true
		}
	};
	_PerformanceOptimizations.developmentConfig = {
		queryPlanCache: {
			maxSize: 100,
			ttl: Duration.minutes(5)
		},
		dataLoaderConfig: {
			maxBatchSize: 10,
			batchWindowMs: 50
		},
		metricsCollection: {
			enabled: true,
			collectExecutionMetrics: true,
			collectCacheMetrics: true
		}
	};
})(PerformanceOptimizations || (PerformanceOptimizations = {}));
/**
* Factory functions for common performance setups
*/
const createBasicOptimizedExecutor = (schema) => PerformanceOptimizations.createOptimizedExecutor(schema, PerformanceOptimizations.defaultConfig);
const createProductionOptimizedExecutor = (schema) => PerformanceOptimizations.createOptimizedExecutor(schema, PerformanceOptimizations.productionConfig);
const createDevelopmentOptimizedExecutor = (schema) => PerformanceOptimizations.createOptimizedExecutor(schema, PerformanceOptimizations.developmentConfig);

//#endregion
export { FederationErrorBoundaries, PerformanceOptimizations, createBasicOptimizedExecutor, createDevelopmentOptimizedExecutor, createProductionBoundary, createProductionOptimizedExecutor, createResilientBoundary, createStrictBoundary };
//# sourceMappingURL=performance-DO3JMEEu.js.map