import type {
	ErrorBoundaryConfig,
	FederatedSchema,
	PerformanceConfig,
	SchemaMetadata,
	ServiceDefinition,
} from "@core";
import { SchemaFirst } from "@core";
import {
	FederationErrorBoundaries,
	PerformanceOptimizations,
	SubgraphManagement,
} from "@federation";
import { Duration } from "effect";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import type { GraphQLResolveInfo, GraphQLSchema } from "graphql";
import { describe, expect, it } from "vitest";
import { MockSubgraphRegistry, TestLayers } from "../utils/test-layers.js";

// Test helper functions
const expectEffectSuccess = async <A, E>(
	effect: Effect.Effect<A, E>,
): Promise<A> => {
	return Effect.runPromise(effect);
};

const expectEffectFailure = async <A, E>(
	effect: Effect.Effect<A, E>,
): Promise<E> => {
	const result = await Effect.runPromise(Effect.either(effect));
	if (Either.isRight(result)) {
		throw new Error("Expected effect to fail but it succeeded");
	}
	const leftOption = Either.getLeft(result);
	if (leftOption._tag === "Some") {
		return leftOption.value as E;
	}
	throw new Error("Expected error but got None");
};

const createTestServices = (): ServiceDefinition[] => [
	{
		id: "users-service",
		url: "http://localhost:4001",
		name: "Users Service",
		version: "1.0.0",
		metadata: { team: "platform", criticality: "high" as const },
	},
	{
		id: "products-service",
		url: "http://localhost:4002",
		name: "Products Service",
		version: "1.0.0",
		metadata: { team: "catalog", criticality: "medium" as const },
	},
	{
		id: "orders-service",
		url: "http://localhost:4003",
		name: "Orders Service",
		version: "1.0.0",
		metadata: { team: "commerce", criticality: "high" as const },
	},
];

const mockFederatedSchema: FederatedSchema = {
	schema: {} as GraphQLSchema,
	entities: [],
	services: createTestServices(),
	version: "2.0",
	metadata: {
		createdAt: new Date(),
		composedAt: new Date(),
		federationVersion: "2.0",
		subgraphCount: 3,
		entityCount: 3,
	} as SchemaMetadata,
};

const sampleGraphQLSchema = `
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String
  orders: [Order!]! @requires(fields: "id")
}

type Product @key(fields: "id") @shareable {
  id: ID!
  name: String!
  price: Float!
  category: String
}

type Order @key(fields: "id") {
  id: ID!
  userId: String!
  products: [Product!]!
  total: Float!
  createdAt: DateTime!
}

type Query {
  user(id: ID!): User
  product(id: ID!): Product
  order(id: ID!): Order
}
`;

describe("End-to-End Federation Integration Tests", () => {
	describe("Complete Federation Stack Integration", () => {
		it("should initialize complete federation infrastructure", async () => {
			const services = createTestServices();

			const result = await TestLayers.runWithCleanup(
				Effect.gen(function* () {
					// 1. Set up subgraph registry using the default config factory
					const registryConfig = SubgraphManagement.defaultConfig(services);

					const registry =
						yield* SubgraphManagement.createRegistry(registryConfig);

					// 2. Configure error boundaries
					const errorBoundaryConfig: ErrorBoundaryConfig = {
						subgraphTimeouts: {
							"users-service": Duration.seconds(10),
							"products-service": Duration.seconds(8),
							"orders-service": Duration.seconds(12),
						},
						circuitBreakerConfig: {
							failureThreshold: 5,
							resetTimeout: Duration.seconds(30),
							halfOpenMaxCalls: 3,
						},
						partialFailureHandling: {
							allowPartialFailure: true,
							criticalSubgraphs: ["users-service", "orders-service"],
						},
						errorTransformation: {
							includeStackTrace: false,
							sanitizeErrors: true,
						},
					};

					const errorBoundary =
						FederationErrorBoundaries.createBoundary(errorBoundaryConfig);

					// 3. Set up performance optimizations
					const performanceConfig: PerformanceConfig = {
						queryPlanCache: {
							maxSize: 1000,
							ttl: Duration.minutes(15),
						},
						dataLoaderConfig: {
							maxBatchSize: 100,
							batchWindowMs: 10,
						},
						metricsCollection: {
							enabled: true,
							collectExecutionMetrics: true,
							collectCacheMetrics: true,
						},
					};

					const optimizedExecutor =
						yield* PerformanceOptimizations.createOptimizedExecutor(
							mockFederatedSchema,
							performanceConfig,
						);

					// 4. Set up schema-first development
					const schemaFirstService = SchemaFirst.Service.create();
					const schemaFirstWorkflow =
						SchemaFirst.Workflow.create(schemaFirstService);

					return {
						registry,
						errorBoundary,
						optimizedExecutor,
						schemaFirstWorkflow,
						servicesCount: services.length,
					};
				}),
			);

			expect(result.registry).toBeDefined();
			expect(result.errorBoundary).toBeDefined();
			expect(result.optimizedExecutor).toBeDefined();
			expect(result.schemaFirstWorkflow).toBeDefined();
			expect(result.servicesCount).toBe(3);
		});

		it("should handle service registration and health checking flow", async () => {
			const services = createTestServices();

			const result = await TestLayers.runWithCleanup(
				Effect.gen(function* () {
					// Use mock registry from test layers
					const registry = yield* MockSubgraphRegistry;

					// Register services in the mock registry
					for (const service of services) {
						yield* registry.register(service);
					}

					// Check health of all services
					const registrationResults = [];
					for (const service of services) {
						const health = yield* registry.health(service.id);
						registrationResults.push({
							serviceId: service.id,
							healthy: health.status === "healthy",
						});
					}

					// Discover all registered services
					const discoveredServices = yield* registry.discover();

					return {
						registrationResults,
						discoveredServices,
						totalRegistered: registrationResults.length,
					};
				}),
			);

			expect(result.totalRegistered).toBe(3);
			expect(result.registrationResults.every((r) => r.healthy)).toBe(true);
			expect(result.discoveredServices).toHaveLength(3);
			expect(result.discoveredServices.map((s) => s.id).sort()).toEqual([
				"orders-service",
				"products-service",
				"users-service",
			]);
		});

		it("should demonstrate error boundaries with service failures", async () => {
			// const services = createTestServices() // Unused variable

			const result = await TestLayers.runWithCleanup(
				Effect.gen(function* () {
					// Set up error boundary
					const errorBoundaryConfig: ErrorBoundaryConfig = {
						subgraphTimeouts: {
							"users-service": Duration.millis(100), // Very short timeout
						},
						circuitBreakerConfig: {
							failureThreshold: 2,
							resetTimeout: Duration.seconds(5),
							halfOpenMaxCalls: 1,
						},
						partialFailureHandling: {
							allowPartialFailure: true,
							criticalSubgraphs: ["orders-service"], // Only orders is critical
						},
						errorTransformation: {
							includeStackTrace: false,
							sanitizeErrors: true,
						},
					};

					const errorBoundary =
						FederationErrorBoundaries.createBoundary(errorBoundaryConfig);

					// Simulate subgraph results with one failure
					const subgraphResults = {
						"users-service": {
							subgraphId: "users-service",
							success: false,
							error: new Error("Service timeout"),
						},
						"products-service": {
							subgraphId: "products-service",
							success: true,
							data: { products: [{ id: "1", name: "Widget" }] },
						},
						"orders-service": {
							subgraphId: "orders-service",
							success: true,
							data: { orders: [{ id: "1", total: 99.99 }] },
						},
					};

					// Handle partial failure
					const processedResults =
						yield* errorBoundary.handlePartialFailure(subgraphResults);

					return {
						hasData: Boolean(processedResults.data),
						hasErrors: processedResults.errors.length > 0,
						errorCount: processedResults.errors.length,
						dataKeys: Object.keys(processedResults.data ?? {}),
					};
				}),
			);

			expect(result.hasData).toBe(true);
			expect(result.hasErrors).toBe(true);
			expect(result.errorCount).toBe(1);
			expect(result.dataKeys).toContain("products");
			expect(result.dataKeys).toContain("orders");
		});

		it("should handle critical service failures", async () => {
			const errorBoundaryConfig: ErrorBoundaryConfig = {
				subgraphTimeouts: {},
				circuitBreakerConfig: {
					failureThreshold: 3,
					resetTimeout: Duration.seconds(30),
					halfOpenMaxCalls: 3,
				},
				partialFailureHandling: {
					allowPartialFailure: true,
					criticalSubgraphs: ["users-service"], // Users is critical
				},
				errorTransformation: {
					includeStackTrace: false,
					sanitizeErrors: true,
				},
			};

			const errorBoundary =
				FederationErrorBoundaries.createBoundary(errorBoundaryConfig);

			// Simulate critical service failure
			const subgraphResults = {
				"users-service": {
					subgraphId: "users-service",
					success: false,
					error: new Error("Critical service down"),
				},
				"products-service": {
					subgraphId: "products-service",
					success: true,
					data: { products: [{ id: "1" }] },
				},
			};

			const error = await expectEffectFailure(
				errorBoundary.handlePartialFailure(subgraphResults),
			);

			expect(error.message).toBe("Critical subgraph failure");
			expect(error._tag).toBe("FederationError");
		});
	});

	describe("Performance Integration", () => {
		it("should demonstrate query execution with caching", async () => {
			const performanceConfig: PerformanceConfig = {
				queryPlanCache: {
					maxSize: 100,
					ttl: Duration.minutes(5),
				},
				dataLoaderConfig: {
					maxBatchSize: 50,
					batchWindowMs: 10,
				},
				metricsCollection: {
					enabled: true,
					collectExecutionMetrics: true,
					collectCacheMetrics: true,
				},
			};

			const optimizedExecutor = await expectEffectSuccess(
				PerformanceOptimizations.createOptimizedExecutor(
					mockFederatedSchema,
					performanceConfig,
				),
			);

			const query = `
        query GetUserWithOrders($userId: ID!) {
          user(id: $userId) {
            id
            email
            name
            orders {
              id
              total
              products {
                id
                name
                price
              }
            }
          }
        }
      `;

			const variables = { userId: "user-123" };
			const context = { requestId: "req-456" };

			// Execute the same query multiple times to test caching
			const results = await Promise.all([
				expectEffectSuccess(
					optimizedExecutor.execute(query, variables, context),
				),
				expectEffectSuccess(
					optimizedExecutor.execute(query, variables, context),
				),
				expectEffectSuccess(
					optimizedExecutor.execute(query, variables, context),
				),
			]);

			results.forEach((result) => {
				expect(result).toBeDefined();
				expect(result.data).toBeDefined();
			});

			// All results should have the same data due to caching
			expect(results[0].data).toEqual(results[1].data);
			expect(results[1].data).toEqual(results[2].data);
		});

		it("should handle high-concurrency scenarios", async () => {
			const performanceConfig: PerformanceConfig = {
				queryPlanCache: {
					maxSize: 1000,
					ttl: Duration.minutes(10),
				},
				dataLoaderConfig: {
					maxBatchSize: 100,
					batchWindowMs: 5,
				},
				metricsCollection: {
					enabled: true,
				},
			};

			const optimizedExecutor = await expectEffectSuccess(
				PerformanceOptimizations.createOptimizedExecutor(
					mockFederatedSchema,
					performanceConfig,
				),
			);

			const query = 'query { user(id: "test") { id name } }';

			// Execute many queries concurrently
			const startTime = Date.now();
			const concurrentQueries = Array.from({ length: 100 }, (_, i) =>
				optimizedExecutor.execute(
					query,
					{ userId: `user-${i}` },
					{ requestId: `req-${i}` },
				),
			);

			const results = await Effect.runPromise(Effect.all(concurrentQueries));
			const duration = Date.now() - startTime;

			expect(results).toHaveLength(100);
			expect(results.every((r) => r.data !== null)).toBe(true);
			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
		});
	});

	describe("Schema-First Development Integration", () => {
		it("should demonstrate complete schema development lifecycle", async () => {
			const schemaFirstService = SchemaFirst.Service.create();
			const workflow = SchemaFirst.Workflow.create(schemaFirstService);

			// 1. Develop initial schema
			const initialState = await expectEffectSuccess(
				workflow.developSchema(sampleGraphQLSchema),
			);

			expect(initialState._tag).toBe("Validated");

			// 2. Generate code for initial schema
			const initialCode = await expectEffectSuccess(
				workflow.generateCode(initialState, ["resolvers", "types"]),
			);

			expect(initialCode['resolvers']).toBeDefined();
			expect(initialCode['types']).toBeDefined();
			expect(initialCode['resolvers']).toContain("import * as Effect");
			expect(initialCode['types']).toContain("export interface");

			// 3. Attempt schema evolution (this will have breaking changes in mock)
			const updatedSchema =
				sampleGraphQLSchema +
				`
        type Review @key(fields: "id") {
          id: ID!
          productId: String!
          rating: Int!
          comment: String
        }
      `;

			const evolution = await expectEffectFailure(
				workflow.evolveSchema(initialState, updatedSchema),
			);

			expect(evolution.message).toBe(
				"Schema evolution contains breaking changes",
			);
		});

		it("should handle non-breaking schema evolution", async () => {
			const schemaFirstService = SchemaFirst.Service.create();

			// Create a service that only reports non-breaking changes
			const safeService = {
				...schemaFirstService,
				validateSchemaEvolution: () =>
					Effect.succeed([
						SchemaFirst.Evolution.AddField({
							entityType: "User",
							fieldName: "profilePicture",
							fieldType: "String",
							isBreaking: false,
						}),
						SchemaFirst.Evolution.AddEntity({
							entityType: "Review",
							isBreaking: false,
						}),
					]),
			};

			const workflow = SchemaFirst.Workflow.create(safeService);

			// Start with validated schema
			const initialState = await expectEffectSuccess(
				workflow.developSchema(sampleGraphQLSchema),
			);

			// Evolve schema with non-breaking changes
			const updatedSchema =
				sampleGraphQLSchema +
				`
        type Review @key(fields: "id") {
          id: ID!
          productId: String!
          rating: Int!
        }
      `;

			const evolvedState = await expectEffectSuccess(
				workflow.evolveSchema(initialState, updatedSchema),
			);

			expect(evolvedState._tag).toBe("Validated");
			if (evolvedState._tag === "Validated") {
				expect(evolvedState.version).toBe("1.1.0");
			}

			// Generate code for evolved schema
			const evolvedCode = await expectEffectSuccess(
				workflow.generateCode(evolvedState, ["types"]),
			);

			expect(evolvedCode['types']).toBeDefined();
			expect(typeof evolvedCode['types']).toBe("string");
		});
	});

	describe("Full Stack Integration Scenarios", () => {
		it("should handle complete federation request lifecycle", async () => {
			const services = createTestServices();

			const result = await TestLayers.runWithCleanup(
				Effect.gen(function* () {
					// 1. Set up all infrastructure
					const registryConfig = {
						discoveryMode: "static" as const,
						staticServices: services,
						discoveryEndpoints: [],
						healthCheckInterval: Duration.seconds(30),
						healthCheckTimeout: Duration.seconds(5),
						retryPolicy: {
							maxAttempts: 3,
							initialDelay: Duration.seconds(1),
						},
					};

					const registry =
						yield* SubgraphManagement.createRegistry(registryConfig);

					const errorBoundaryConfig: ErrorBoundaryConfig = {
						subgraphTimeouts: {
							"users-service": Duration.seconds(5),
							"products-service": Duration.seconds(5),
							"orders-service": Duration.seconds(5),
						},
						circuitBreakerConfig: {
							failureThreshold: 3,
							resetTimeout: Duration.seconds(30),
							halfOpenMaxCalls: 3,
						},
						partialFailureHandling: {
							allowPartialFailure: true,
							criticalSubgraphs: ["users-service"],
						},
						errorTransformation: {
							includeStackTrace: false,
							sanitizeErrors: true,
						},
					};

					FederationErrorBoundaries.createBoundary(errorBoundaryConfig);

					const performanceConfig: PerformanceConfig = {
						queryPlanCache: {
							maxSize: 100,
							ttl: Duration.minutes(5),
						},
						dataLoaderConfig: {
							maxBatchSize: 50,
							batchWindowMs: 10,
						},
						metricsCollection: {
							enabled: true,
						},
					};

					const optimizedExecutor =
						yield* PerformanceOptimizations.createOptimizedExecutor(
							mockFederatedSchema,
							performanceConfig,
						);

					// 2. Register all services
					const discoveredServices = yield* registry.discover();

					// 3. Execute a federated query
					const query = `
            query GetUserData($userId: ID!) {
              user(id: $userId) {
                id
                name
                email
                orders {
                  id
                  total
                }
              }
            }
          `;

					const result = yield* optimizedExecutor.execute(
						query,
						{ userId: "user-123" },
						{ requestId: "integration-test" },
					);

					return {
						servicesDiscovered: discoveredServices.length,
						queryExecuted: !!result.data,
						hasErrors: !!result.errors && result.errors.length > 0,
					};
				}),
			);

			expect(result.servicesDiscovered).toBe(3);
			expect(result.queryExecuted).toBe(true);
			expect(result.hasErrors).toBe(false);
		});

		it("should demonstrate service failure recovery", async () => {
			const services = createTestServices();

			const result = await TestLayers.runWithCleanup(
				Effect.gen(function* () {
					// Use mock registry from test layers
					const registry = yield* MockSubgraphRegistry;

					// Register services in the mock registry
					for (const service of services) {
						yield* registry.register(service);
					}

					// Initial health check - all healthy
					const initialHealths = [];
					for (const service of services) {
						const health = yield* registry.health(service.id);
						initialHealths.push(health.status === "healthy");
					}

					// Simulate service failure
					yield* registry.simulateFailure("products-service", true);

					// Check health after failure
					const failedHealth = yield* Effect.either(
						registry.health("products-service"),
					);

					// Recover service
					yield* registry.simulateFailure("products-service", false);

					// Check health after recovery
					const recoveredHealth = yield* registry.health("products-service");

					return {
						initiallyHealthy: initialHealths.every((h) => h),
						failureDetected: failedHealth._tag === "Left",
						recoveredSuccessfully: recoveredHealth.status === "healthy",
					};
				}),
			);

			expect(result.initiallyHealthy).toBe(true);
			expect(result.failureDetected).toBe(true);
			expect(result.recoveredSuccessfully).toBe(true);
		});

		it("should measure end-to-end performance metrics", async () => {
			const services = createTestServices();

			const performanceMetrics = await TestLayers.runWithCleanup(
				Effect.gen(function* () {
					const registryConfig = {
						discoveryMode: "static" as const,
						staticServices: services,
						discoveryEndpoints: [],
						healthCheckInterval: Duration.seconds(30),
						healthCheckTimeout: Duration.seconds(5),
						retryPolicy: {
							maxAttempts: 3,
							initialDelay: Duration.seconds(1),
						},
					};

					yield* SubgraphManagement.createRegistry(registryConfig);

					const performanceConfig: PerformanceConfig = {
						queryPlanCache: {
							maxSize: 50,
							ttl: Duration.minutes(2),
						},
						dataLoaderConfig: {
							maxBatchSize: 25,
							batchWindowMs: 8,
						},
						metricsCollection: {
							enabled: true,
							collectExecutionMetrics: true,
							collectCacheMetrics: true,
						},
					};

					const optimizedExecutor =
						yield* PerformanceOptimizations.createOptimizedExecutor(
							mockFederatedSchema,
							performanceConfig,
						);

					// Execute multiple queries to gather metrics
					const queries = [
						'query { user(id: "1") { id name } }',
						'query { product(id: "1") { id name price } }',
						'query { order(id: "1") { id total } }',
						'query { user(id: "1") { id name } }', // Cache hit
					];

					const startTime = Date.now();

					const results = [];
					for (const query of queries) {
						const result: unknown = yield* optimizedExecutor.execute(
							query,
							{},
							{ requestId: `perf-test-${results.length}` },
						);
						results.push(result);
					}

					const totalDuration = Date.now() - startTime;

					return {
						totalQueries: results.length,
						allSuccessful: results.every((r) => {
							const result = r as { data: unknown } | null;
							return result?.data !== null;
						}),
						totalDuration,
						averageDuration: totalDuration / results.length,
					};
				}),
			);

			expect(performanceMetrics.totalQueries).toBe(4);
			expect(performanceMetrics.allSuccessful).toBe(true);
			expect(performanceMetrics.totalDuration).toBeLessThan(1000);
			expect(performanceMetrics.averageDuration).toBeLessThan(250);
		});
	});

	describe("Error Recovery and Resilience", () => {
		it("should demonstrate circuit breaker behavior under load", async () => {
			const errorBoundaryConfig: ErrorBoundaryConfig = {
				subgraphTimeouts: {
					"failing-service": Duration.millis(50),
				},
				circuitBreakerConfig: {
					failureThreshold: 3,
					resetTimeout: Duration.millis(200),
					halfOpenMaxCalls: 1,
				},
				partialFailureHandling: {
					allowPartialFailure: true,
					criticalSubgraphs: [],
				},
				errorTransformation: {
					includeStackTrace: false,
					sanitizeErrors: true,
				},
			};

			const errorBoundary =
				FederationErrorBoundaries.createBoundary(errorBoundaryConfig);

			// Create a resolver that always fails
			const failingResolver = async () => {
				throw new Error("Service consistently failing");
			};

			const wrappedResolver = errorBoundary.wrapResolver(
				"failing-service",
				failingResolver,
			);

			// Execute resolver multiple times to trigger circuit breaker
			const results = [];
			for (let i = 0; i < 10; i++) {
				const result = await wrappedResolver(
					null,
					{},
					{},
					{} as GraphQLResolveInfo,
				);
				results.push(result === null ? "failure" : "success");
				// Small delay between attempts
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			// Should have some failures initially (returns null due to partial failure handling)
			expect(results.filter((r) => r === "failure").length).toBeGreaterThan(0);

			// Wait for potential circuit breaker reset
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Try one more time - circuit breaker might allow retry
			try {
				await wrappedResolver(null, {}, {}, {} as GraphQLResolveInfo);
				results.push("success");
			} catch {
				results.push("failure");
			}

			expect(results.length).toBe(11);
		});

		it("should handle mixed service health scenarios", async () => {
			const services = [
				...createTestServices(),
				{
					id: "unstable-service",
					url: "http://localhost:4004",
					name: "Unstable Service",
					version: "1.0.0",
					metadata: { team: "experimental", criticality: "low" as const },
				},
			];

			const result = await TestLayers.runWithCleanup(
				Effect.gen(function* () {
					// Use mock registry from test layers
					const registry = yield* MockSubgraphRegistry;

					// Register all services in the mock registry
					for (const service of services) {
						yield* registry.register(service);
					}

					// Make one service unstable
					yield* registry.simulateFailure("unstable-service", true);

					const healthStatuses = [];
					for (const service of services) {
						const health = yield* Effect.either(registry.health(service.id));
						healthStatuses.push({
							serviceId: service.id,
							healthy:
								health._tag === "Right" && health.right.status === "healthy",
						});
					}

					// Configure error boundary to handle unstable service
					const errorBoundaryConfig: ErrorBoundaryConfig = {
						subgraphTimeouts: {
							"unstable-service": Duration.millis(100),
						},
						circuitBreakerConfig: {
							failureThreshold: 2,
							resetTimeout: Duration.seconds(5),
							halfOpenMaxCalls: 1,
						},
						partialFailureHandling: {
							allowPartialFailure: true,
							criticalSubgraphs: ["users-service", "orders-service"],
						},
						errorTransformation: {
							includeStackTrace: false,
							sanitizeErrors: true,
						},
					};

					const errorBoundary =
						FederationErrorBoundaries.createBoundary(errorBoundaryConfig);

					// Simulate federation query with mixed health
					const subgraphResults = {
						"users-service": {
							subgraphId: "users-service",
							success: true,
							data: { users: [{ id: "1", name: "John" }] },
						},
						"products-service": {
							subgraphId: "products-service",
							success: true,
							data: { products: [{ id: "1", name: "Widget" }] },
						},
						"orders-service": {
							subgraphId: "orders-service",
							success: true,
							data: { orders: [{ id: "1", total: 100 }] },
						},
						"unstable-service": {
							subgraphId: "unstable-service",
							success: false,
							error: new Error("Unstable service failure"),
						},
					};

					const processedResults =
						yield* errorBoundary.handlePartialFailure(subgraphResults);

					return {
						totalServices: services.length,
						healthyServices: healthStatuses.filter((h) => h.healthy).length,
						partialResultsHandled: !!processedResults.data,
						nonCriticalErrorsIgnored: processedResults.errors.length === 1,
					};
				}),
			);

			expect(result.totalServices).toBe(4);
			expect(result.healthyServices).toBe(3); // 3 out of 4 should be healthy
			expect(result.partialResultsHandled).toBe(true);
			expect(result.nonCriticalErrorsIgnored).toBe(true); // Only unstable service error
		});
	});
});
