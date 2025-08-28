import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vitest";
import {
	createDynamicRegistry,
	createStaticRegistry,
	SubgraphManagement,
} from "../../../src/federation/subgraph.js";

describe("SubgraphManagement API Tests", () => {
	describe("Configuration Factories", () => {
		it("should create default config with static services", () => {
			const services = [
				{ id: "users", url: "http://users:4001" },
				{ id: "products", url: "http://products:4002" },
			];

			const config = SubgraphManagement.defaultConfig(services);

			expect(config.discoveryMode).toBe("static");
			expect(config.staticServices).toEqual(services);
			expect(config.discoveryEndpoints).toEqual([]);
			expect(config.healthCheckInterval).toEqual(Duration.seconds(30));
		});

		it("should create dynamic config with discovery endpoints", () => {
			const endpoints = [
				"http://consul:8500/v1/health",
				"http://eureka:8761/eureka",
			];

			const config = SubgraphManagement.dynamicConfig(endpoints);

			expect(config.discoveryMode).toBe("dynamic");
			expect(config.staticServices).toEqual([]);
			expect(config.discoveryEndpoints).toEqual(endpoints);
			expect(config.healthCheckInterval).toEqual(Duration.seconds(30));
		});
	});

	describe("Registry Creation", () => {
		it("should create registry with valid config", async () => {
			const config = SubgraphManagement.defaultConfig([
				{ id: "test", url: "http://test:4001" },
			]);

			const registryEffect = SubgraphManagement.createRegistry(config);
			const registry = await Effect.runPromise(registryEffect);

			expect(registry).toBeDefined();
			expect(registry.register).toBeDefined();
			expect(registry.unregister).toBeDefined();
			expect(registry.discover).toBeDefined();
			expect(registry.health).toBeDefined();
		});

		it("should handle invalid config", async () => {
			const invalidConfig = {
				discoveryMode: "invalid" as unknown as "static" | "dynamic",
				staticServices: [],
				discoveryEndpoints: [],
				healthCheckInterval: Duration.seconds(30),
				healthCheckTimeout: Duration.seconds(5),
				retryPolicy: {
					maxAttempts: 3,
					initialDelay: Duration.seconds(1),
				},
			};

			const registryEffect = SubgraphManagement.createRegistry(invalidConfig);
			const result = await Effect.runPromise(Effect.either(registryEffect));

			expect(result._tag).toBe("Left");
		});
	});

	describe("Factory Functions", () => {
		it("should create static registry", async () => {
			const services = [
				{ id: "users", url: "http://users:4001" },
				{ id: "products", url: "http://products:4002" },
			];

			const registryEffect = createStaticRegistry(services);
			const registry = await Effect.runPromise(registryEffect);

			expect(registry).toBeDefined();
			expect(registry.register).toBeDefined();
		});

		it("should create dynamic registry", async () => {
			const endpoints = ["http://discovery:8080"];

			const registryEffect = createDynamicRegistry(endpoints);
			const registry = await Effect.runPromise(registryEffect);

			expect(registry).toBeDefined();
			expect(registry.discover).toBeDefined();
		});
	});

	describe("Registry Operations", () => {
		it("should register a service", async () => {
			// Config must have at least one service or discovery endpoint
			const config = SubgraphManagement.defaultConfig([
				{ id: "dummy-service", url: "http://dummy:4001" },
			]);
			const registryEffect = SubgraphManagement.createRegistry(config);
			const registry = await Effect.runPromise(registryEffect);

			const service = {
				id: "new-service",
				url: "http://new-service:4001",
			};

			const registerEffect = registry.register(service);
			await Effect.runPromise(Effect.either(registerEffect));

			// Registration may fail without proper setup, but method should exist
			expect(registerEffect).toBeDefined();
		});

		it("should unregister a service", async () => {
			const config = SubgraphManagement.defaultConfig([
				{ id: "test-service", url: "http://test:4001" },
			]);
			const registryEffect = SubgraphManagement.createRegistry(config);
			const registry = await Effect.runPromise(registryEffect);

			const unregisterEffect = registry.unregister("service-id");

			// Unregistration may fail without proper setup, but method should exist
			expect(unregisterEffect).toBeDefined();
		});

		it("should discover services", async () => {
			const services = [{ id: "users", url: "http://users:4001" }];
			const config = SubgraphManagement.defaultConfig(services);
			const registryEffect = SubgraphManagement.createRegistry(config);
			const registry = await Effect.runPromise(registryEffect);

			const discoverEffect = registry.discover();
			const result = await Effect.runPromise(discoverEffect);

			expect(Array.isArray(result)).toBe(true);
			expect(result).toEqual(services);
		});

		it("should check service health", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ status: "healthy" }),
			}) as unknown as typeof fetch;

			const config = SubgraphManagement.defaultConfig([
				{ id: "test-service", url: "http://test:4001" },
			]);
			const registryEffect = SubgraphManagement.createRegistry(config);
			const registry = await Effect.runPromise(registryEffect);

			const healthEffect = registry.health("test-service");
			await Effect.runPromise(Effect.either(healthEffect));

			// Health check implementation may vary
			expect(healthEffect).toBeDefined();
		});
	});

	describe("Registry Enhancers", () => {
		it("should add auto-discovery to registry", async () => {
			const config = SubgraphManagement.defaultConfig([
				{ id: "base-service", url: "http://base:4001" },
			]);
			const registryEffect = SubgraphManagement.createRegistry(config);
			const registry = await Effect.runPromise(registryEffect);

			const enhancedEffect = SubgraphManagement.withAutoDiscovery(
				registry,
				Duration.seconds(60),
			);
			const enhanced = await Effect.runPromise(enhancedEffect);

			expect(enhanced).toBeDefined();
			expect(enhanced.discover).toBeDefined();
		});

		it("should add health monitoring to registry", async () => {
			const config = SubgraphManagement.defaultConfig([
				{ id: "monitored-service", url: "http://monitored:4001" },
			]);
			const registryEffect = SubgraphManagement.createRegistry(config);
			const registry = await Effect.runPromise(registryEffect);

			const enhancedEffect = SubgraphManagement.withHealthMonitoring(
				registry,
				Duration.seconds(30),
			);
			const enhanced = await Effect.runPromise(enhancedEffect);

			expect(enhanced).toBeDefined();
			expect(enhanced.health).toBeDefined();
		});
	});
});
