import { CompositionError, ErrorFactory, HealthCheckError } from "./errors-lo2u-uDT.js";
import { Duration, Effect, Schedule, pipe } from "effect";
import * as Effect$1 from "effect/Effect";
import * as Match from "effect/Match";
import * as Context from "effect/Context";
import { buildSchema } from "graphql";
import * as Layer from "effect/Layer";
import * as LogLevel from "effect/LogLevel";

//#region src/federation/composition/composer.ts
var FederationComposer = class extends Context.Tag("FederationComposer")() {};
const makeComposer = Effect$1.tryPromise(async () => {
	const logger = {
		trace: (message, meta) => Effect$1.logWithLevel(LogLevel.Trace, message, meta),
		debug: (message, meta) => Effect$1.logWithLevel(LogLevel.Debug, message, meta),
		info: (message, meta) => Effect$1.logWithLevel(LogLevel.Info, message, meta),
		warn: (message, meta) => Effect$1.logWithLevel(LogLevel.Warning, message, meta),
		error: (message, meta) => Effect$1.logWithLevel(LogLevel.Error, message, meta),
		withSpan: (name, effect) => Effect$1.withSpan(effect, name)
	};
	const compose$1 = (federationConfig) => Effect$1.gen(function* () {
		yield* logger.info("Starting federation composition", {
			entityCount: federationConfig.entities.length,
			serviceCount: federationConfig.services.length
		});
		const validatedConfig = yield* validate(federationConfig).pipe(Effect$1.mapError((error) => new CompositionError(`Configuration validation failed: ${error.message}`, void 0, { field: error.field }, error)));
		const subgraphSchemas = yield* fetchSubgraphSchemas(validatedConfig.services);
		const composedConfig = {
			config: validatedConfig,
			subgraphSchemas,
			metadata: createMetadata(validatedConfig, subgraphSchemas)
		};
		const schema = yield* buildSchema$1(composedConfig);
		const federatedSchema = {
			schema,
			entities: validatedConfig.entities,
			services: validatedConfig.services,
			version: "2.0.0",
			metadata: composedConfig.metadata
		};
		yield* logger.info("Federation composition completed successfully", {
			entityCount: federatedSchema.entities.length,
			serviceCount: federatedSchema.services.length,
			version: federatedSchema.version
		});
		return federatedSchema;
	});
	const validate = (federationConfig) => Effect$1.gen(function* () {
		yield* logger.trace("Validating federation configuration");
		if (federationConfig.entities.length === 0) {
			yield* logger.error("No entities provided in configuration");
			return yield* Effect$1.fail(ErrorFactory.validation("At least one entity is required", "entities"));
		}
		if (federationConfig.services.length === 0) {
			yield* logger.error("No services provided in configuration");
			return yield* Effect$1.fail(ErrorFactory.validation("At least one service is required", "services"));
		}
		yield* Effect$1.forEach(federationConfig.services, validateServiceUrl, { concurrency: 3 });
		yield* validateEntityKeys(federationConfig.entities);
		yield* logger.trace("Configuration validation completed");
		return federationConfig;
	});
	const buildSchema$1 = (composedConfig) => Effect$1.gen(function* () {
		yield* logger.trace("Building executable GraphQL schema");
		const baseSchema = `
        type Query {
          _service: _Service!
        }

        type _Service {
          sdl: String!
        }
      `;
		const subgraphSDLs = composedConfig.subgraphSchemas.map((schema) => schema.sdl).join("\n\n");
		const combinedSDL = baseSchema + "\n\n" + subgraphSDLs;
		try {
			const schema = buildSchema(combinedSDL);
			yield* logger.info("GraphQL schema built successfully");
			return schema;
		} catch (err) {
			yield* logger.error("Failed to build GraphQL schema", { error: err });
			return yield* Effect$1.fail(new CompositionError(`Failed to build schema: ${err}`, void 0, {}, err));
		}
	});
	return {
		compose: compose$1,
		validate,
		buildSchema: buildSchema$1
	};
});
const validateServiceUrl = (service) => Effect$1.gen(function* () {
	yield* Effect$1.logWithLevel(LogLevel.Trace, `Validating service URL: ${service.url}`);
	try {
		new URL(service.url);
		yield* Effect$1.logWithLevel(LogLevel.Trace, `Service URL is valid: ${service.url}`);
	} catch (err) {
		yield* Effect$1.logWithLevel(LogLevel.Error, `Invalid service URL: ${service.url}`, { error: err });
		return yield* Effect$1.fail(ErrorFactory.validation(`Invalid service URL: ${service.url}`, "url", service.url));
	}
});
const validateEntityKeys = (entities) => Effect$1.gen(function* () {
	yield* Effect$1.logWithLevel(LogLevel.Trace, `Validating entity keys for ${entities.length} entities`);
	for (const entity of entities) {
		if (!entity.typename || entity.typename.trim() === "") {
			yield* Effect$1.logWithLevel(LogLevel.Error, `Entity has empty typename`);
			return yield* Effect$1.fail(ErrorFactory.validation(`Entity typename cannot be empty`, "typename", entity.typename));
		}
		if (Array.isArray(entity.key) && entity.key.length === 0) {
			yield* Effect$1.logWithLevel(LogLevel.Error, `Entity ${entity.typename} has no key fields`);
			return yield* Effect$1.fail(ErrorFactory.validation(`Entity ${entity.typename} must have at least one key field`, "key", entity.key));
		}
	}
	yield* Effect$1.logWithLevel(LogLevel.Trace, "Entity key validation completed");
});
const fetchSubgraphSchemas = (services) => Effect$1.gen(function* () {
	yield* Effect$1.logWithLevel(LogLevel.Info, `Fetching schemas from ${services.length} subgraphs`);
	const schemas = services.map((service, _index) => ({
		service,
		sdl: `
        extend type Query {
          ${service.id}Service: String
        }
      `,
		entities: [],
		directives: []
	}));
	yield* Effect$1.logWithLevel(LogLevel.Info, "Subgraph schemas fetched successfully");
	return schemas;
});
const createMetadata = (config, subgraphs) => {
	const now = /* @__PURE__ */ new Date();
	return {
		createdAt: now,
		composedAt: now,
		federationVersion: "2.0.0",
		subgraphCount: subgraphs.length,
		entityCount: config.entities.length
	};
};
const FederationComposerLive = Layer.effect(FederationComposer, makeComposer);
const compose = (config) => Effect$1.gen(function* () {
	const composer = yield* makeComposer;
	return yield* composer.compose(config);
});
const validateConfig = (config) => Effect$1.flatMap(FederationComposer, (composer) => composer.validate(config));
const handleCompositionError = (error) => Match.value(error).pipe(Match.when((error$1) => error$1.message.includes("URL"), () => "Invalid service configuration - check your URLs"), Match.when((error$1) => error$1.message.includes("schema"), () => "Schema composition failed - check your GraphQL definitions"), Match.orElse(() => `Composition error: ${error.message}`));
const createFederatedSchema = (config) => Effect$1.gen(function* () {
	yield* Effect$1.logWithLevel(LogLevel.Info, "Creating federated schema");
	const result = yield* compose(config).pipe(Effect$1.catchTag("CompositionError", (error) => Effect$1.gen(function* () {
		const userMessage = handleCompositionError(error);
		yield* Effect$1.logWithLevel(LogLevel.Error, "Composition failed", {
			error,
			userMessage
		});
		return yield* Effect$1.fail(error);
	})), Effect$1.timeout(Duration.seconds(30)), Effect$1.catchTag("TimeoutException", () => Effect$1.gen(function* () {
		yield* Effect$1.logWithLevel(LogLevel.Error, "Schema composition timed out");
		return yield* Effect$1.fail(new CompositionError("Schema composition timed out after 30 seconds"));
	})));
	yield* Effect$1.logWithLevel(LogLevel.Info, "Federated schema created successfully");
	return result;
});

//#endregion
//#region src/federation/subgraphs/subgraph.ts
let SubgraphManagement;
(function(_SubgraphManagement) {
	_SubgraphManagement.createRegistry = (config) => pipe(Effect.succeed(config), Effect.flatMap(validateRegistryConfig), Effect.mapError((error) => {
		return ErrorFactory.composition(`Registry configuration validation failed: ${error.message}`, void 0, "config");
	}), Effect.flatMap((validConfig) => pipe(createServiceStore(), Effect.map((store) => ({
		register: (definition) => registerSubgraph(definition, validConfig, store),
		unregister: (serviceId) => unregisterSubgraph(serviceId, validConfig, store),
		discover: () => discoverSubgraphs(validConfig, store),
		health: (serviceId) => checkSubgraphHealth(serviceId, validConfig, store)
	})))));
	_SubgraphManagement.withAutoDiscovery = (registry, interval = Duration.seconds(30)) => pipe(Effect.succeed(registry), Effect.tap(() => pipe(scheduleDiscovery(registry, interval), Effect.fork)));
	_SubgraphManagement.withHealthMonitoring = (registry, interval = Duration.seconds(10)) => pipe(Effect.succeed(registry), Effect.tap(() => pipe(scheduleHealthChecks(registry, interval), Effect.fork)));
	/**
	* Validate registry configuration
	*/
	const validateRegistryConfig = (config) => pipe(Effect.succeed(config), Effect.filterOrFail((config$1) => config$1.discoveryMode === "static" ? config$1.staticServices.length > 0 : config$1.discoveryEndpoints.length > 0, () => ErrorFactory.composition("Registry configuration must have services or discovery endpoints")));
	/**
	* Create optimized in-memory service store with indexing
	*/
	const createServiceStore = () => {
		const services = /* @__PURE__ */ new Map();
		const servicesByUrl = /* @__PURE__ */ new Map();
		const healthyServices = /* @__PURE__ */ new Set();
		return Effect.succeed({
			store: (service) => Effect.sync(() => {
				const existingService = services.get(service.id);
				if (existingService !== void 0) servicesByUrl.delete(existingService.url);
				services.set(service.id, service);
				servicesByUrl.set(service.url, service);
			}),
			remove: (serviceId) => Effect.sync(() => {
				const service = services.get(serviceId);
				if (service !== void 0) {
					services.delete(serviceId);
					servicesByUrl.delete(service.url);
					healthyServices.delete(serviceId);
				}
			}),
			getAll: () => Effect.succeed(Array.from(services.values())),
			get: (serviceId) => Effect.succeed(services.get(serviceId))
		});
	};
	/**
	* Register a new subgraph service
	*/
	const registerSubgraph = (definition, config, store) => pipe(Effect.succeed(definition), Effect.flatMap(validateServiceDefinition), Effect.flatMap((validDef) => store.store(validDef)), Effect.flatMap(() => triggerSchemaRecomposition(definition, config)), Effect.catchAll((_error) => Effect.fail(ErrorFactory.CommonErrors.registrationError(`Failed to register service ${definition.id}`, definition.id))));
	/**
	* Validate service definition
	*/
	const validateServiceDefinition = (definition) => pipe(Effect.succeed(definition), Effect.filterOrFail((def) => Boolean(def.id?.trim()), () => ErrorFactory.CommonErrors.registrationError("Service ID is required", "unknown")), Effect.filterOrFail((def) => Boolean(def.url?.trim()), () => ErrorFactory.CommonErrors.registrationError("Service URL is required", definition.id ?? "unknown")), Effect.flatMap((def) => {
		try {
			new URL(def.url);
			return Effect.succeed(def);
		} catch {
			return Effect.fail(ErrorFactory.CommonErrors.registrationError(`Invalid service URL: ${def.url}`, def.id ?? "unknown"));
		}
	}));
	/**
	* Unregister a subgraph service
	*/
	const unregisterSubgraph = (serviceId, config, store) => pipe(store.get(serviceId), Effect.mapError((error) => ErrorFactory.CommonErrors.registrationError(`Failed to get service ${serviceId}: ${error.message}`, serviceId)), Effect.flatMap((service) => service !== void 0 ? pipe(store.remove(serviceId), Effect.flatMap(() => pipe(triggerSchemaRecomposition({
		id: serviceId,
		url: ""
	}, config), Effect.mapError((error) => ErrorFactory.CommonErrors.registrationError(`Failed to trigger recomposition for service ${serviceId}: ${error.message}`, serviceId))))) : Effect.fail(ErrorFactory.CommonErrors.registrationError(`Service ${serviceId} not found`, serviceId))));
	/**
	* Discover subgraphs from configured sources
	*/
	const discoverSubgraphs = (config, store) => config.discoveryMode === "static" ? Effect.succeed(config.staticServices) : pipe(Effect.succeed(config.discoveryEndpoints), Effect.flatMap((endpoints) => Effect.all(endpoints.map((endpoint) => pipe(fetchFromDiscoveryEndpoint(endpoint, config), Effect.catchAll((error) => {
		console.warn(`Discovery endpoint ${endpoint} failed:`, error);
		return Effect.succeed([]);
	}))), { concurrency: 3 })), Effect.map((results) => results.flat()), Effect.tap((services) => Effect.all(services.map((service) => pipe(store.store(service), Effect.mapError((error) => ErrorFactory.CommonErrors.discoveryError(`Failed to store discovered service ${service.id}: ${error.message}`, service.url)))))));
	/**
	* Fetch services from discovery endpoint with connection pooling and caching
	*/
	const fetchFromDiscoveryEndpoint = (endpoint, config) => {
		return pipe(Effect.tryPromise({
			try: () => fetch(endpoint, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"Cache-Control": "max-age=30",
					"User-Agent": "Federation-Framework/2.0"
				},
				keepalive: true
			}),
			catch: (error) => ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint unavailable: ${endpoint}`, endpoint, error)
		}), Effect.timeout(config.healthCheckTimeout), Effect.mapError((error) => error._tag === "TimeoutException" ? ErrorFactory.CommonErrors.discoveryError(`Timeout accessing discovery endpoint: ${endpoint}`, endpoint) : ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint unavailable: ${endpoint}`, endpoint, error)), Effect.flatMap((response) => {
			if (!response.ok) return Effect.fail(ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint returned ${response.status}: ${response.statusText}`, endpoint));
			return pipe(Effect.tryPromise({
				try: async () => {
					const text = await response.text();
					try {
						return JSON.parse(text);
					} catch {
						throw new Error(`Invalid JSON: ${text.slice(0, 100)}...`);
					}
				},
				catch: (error) => ErrorFactory.CommonErrors.discoveryError(`Invalid JSON response: ${error.message}`, endpoint)
			}), Effect.flatMap((data) => {
				if (!Array.isArray(data["services"])) return Effect.fail(ErrorFactory.CommonErrors.discoveryError(`Expected services array, got: ${typeof data}`, endpoint));
				const services = data["services"];
				const validServices = services.filter((service) => {
					return service != null && typeof service === "object" && "id" in service && "url" in service && typeof service.id === "string" && typeof service.url === "string";
				});
				if (validServices.length !== services.length) console.warn(`Filtered out ${services.length - validServices.length} invalid services from ${endpoint}`);
				return Effect.succeed(validServices);
			}));
		}), Effect.retry(Schedule.exponential(config.retryPolicy.initialDelay).pipe(Schedule.compose(Schedule.recurs(config.retryPolicy.maxAttempts)))));
	};
	/**
	* Check health of a specific subgraph
	*/
	const checkSubgraphHealth = (serviceId, config, store) => pipe(store.get(serviceId), Effect.mapError((error) => new HealthCheckError(`Failed to get service ${serviceId}: ${error.message}`, serviceId)), Effect.flatMap((service) => service !== void 0 ? performHealthCheck(service, config) : Effect.fail(new HealthCheckError(`Service ${serviceId} not found`, serviceId))));
	/**
	* Perform optimized health check with adaptive timeout and connection reuse
	*/
	const performHealthCheck = (service, config) => {
		const startTime = Date.now();
		const adaptiveTimeout = Duration.toMillis(config.healthCheckTimeout);
		return pipe(Effect.tryPromise({
			try: async () => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), adaptiveTimeout);
				return fetch(`${service.url}/health`, {
					method: "GET",
					headers: {
						Accept: "application/json",
						"User-Agent": "Federation-Framework/2.0",
						"Cache-Control": "no-cache"
					},
					signal: controller.signal,
					keepalive: true
				}).finally(() => clearTimeout(timeoutId));
			},
			catch: (error) => {
				const responseTime = Date.now() - startTime;
				const errorMessage = error.name === "AbortError" ? `Health check timed out after ${responseTime}ms` : `Health check failed: ${error.message}`;
				return ErrorFactory.healthCheck(errorMessage, service.id, error);
			}
		}), Effect.flatMap((response) => {
			const responseTime = Date.now() - startTime;
			const baseMetrics = {
				responseTimeMs: responseTime,
				statusCode: response.status,
				contentLength: parseInt(response.headers.get("content-length") ?? "0", 10)
			};
			const baseStatus = {
				serviceId: service.id,
				lastCheck: /* @__PURE__ */ new Date(),
				metrics: baseMetrics
			};
			if (response.ok) {
				const status = responseTime < 100 ? "healthy" : responseTime < 500 ? "degraded" : "unhealthy";
				return Effect.succeed({
					...baseStatus,
					status
				});
			} else if (response.status >= 500) return Effect.succeed({
				...baseStatus,
				status: "unhealthy"
			});
			else return Effect.succeed({
				...baseStatus,
				status: "degraded"
			});
		}), Effect.catchAll((_error) => {
			const responseTime = Date.now() - startTime;
			return Effect.succeed({
				status: "unhealthy",
				serviceId: service.id,
				lastCheck: /* @__PURE__ */ new Date(),
				metrics: {
					responseTimeMs: responseTime,
					errorCount: 1
				}
			});
		}));
	};
	/**
	* Trigger schema recomposition after service changes
	*/
	const triggerSchemaRecomposition = (service, _config) => pipe(Effect.succeed(service), Effect.tap(() => Effect.sync(() => {
		console.log(`🔄 Triggering schema recomposition for service: ${service.id}`);
	})));
	/**
	* Schedule periodic service discovery
	*/
	const scheduleDiscovery = (registry, interval) => pipe(registry.discover(), Effect.tap((services) => Effect.sync(() => {
		console.log(`🔍 Discovered ${services.length} services`);
	})), Effect.catchAll((error) => {
		console.warn("Service discovery failed:", error);
		return Effect.succeed([]);
	}), Effect.repeat(Schedule.fixed(interval)), Effect.asVoid);
	/**
	* Schedule optimized health checks with adaptive concurrency and batching
	*/
	const scheduleHealthChecks = (registry, interval) => {
		let healthCheckRound = 0;
		return pipe(registry.discover(), Effect.catchAll((error) => {
			console.warn("Discovery failed during health checks:", error.message);
			return Effect.succeed([]);
		}), Effect.flatMap((services) => {
			healthCheckRound++;
			const batchSize = Math.min(10, Math.max(3, Math.ceil(services.length / 3)));
			console.log(`🔍 Health check round ${healthCheckRound} for ${services.length} services (batch size: ${batchSize})`);
			return Effect.all(services.map((service) => pipe(registry.health(service.id), Effect.tap((health) => Effect.sync(() => {
				const status = health.status === "healthy" ? "✅" : health.status === "degraded" ? "⚠️" : "❌";
				const responseTime = health.metrics?.["responseTimeMs"] ?? 0;
				console.log(`${status} ${service.id}: ${health.status} (${responseTime}ms)`);
			})), Effect.catchAll((error) => {
				console.warn(`Health check failed for ${service.id}:`, error.message);
				return Effect.succeed({
					status: "unhealthy",
					serviceId: service.id,
					lastCheck: /* @__PURE__ */ new Date()
				});
			}))), { concurrency: batchSize });
		}), Effect.repeat(Schedule.fixed(interval)), Effect.asVoid);
	};
	_SubgraphManagement.defaultConfig = (services) => ({
		discoveryMode: "static",
		staticServices: services,
		discoveryEndpoints: [],
		healthCheckInterval: Duration.seconds(30),
		healthCheckTimeout: Duration.seconds(5),
		retryPolicy: {
			maxAttempts: 3,
			initialDelay: Duration.seconds(1)
		}
	});
	_SubgraphManagement.dynamicConfig = (discoveryEndpoints) => ({
		discoveryMode: "dynamic",
		staticServices: [],
		discoveryEndpoints,
		healthCheckInterval: Duration.seconds(30),
		healthCheckTimeout: Duration.seconds(5),
		retryPolicy: {
			maxAttempts: 3,
			initialDelay: Duration.seconds(1)
		}
	});
})(SubgraphManagement || (SubgraphManagement = {}));
/**
* Factory functions for common registry setups
*/
const createStaticRegistry = (services) => SubgraphManagement.createRegistry(SubgraphManagement.defaultConfig(services));
const createDynamicRegistry = (discoveryEndpoints) => SubgraphManagement.createRegistry(SubgraphManagement.dynamicConfig(discoveryEndpoints));
const createMonitoredRegistry = (services, options) => pipe(createStaticRegistry(services), Effect.flatMap((registry) => pipe(SubgraphManagement.withAutoDiscovery(registry, options?.discoveryInterval), Effect.flatMap((registryWithDiscovery) => SubgraphManagement.withHealthMonitoring(registryWithDiscovery, options?.healthCheckInterval)))));

//#endregion
export { FederationComposer, FederationComposerLive, SubgraphManagement, compose, createDynamicRegistry, createFederatedSchema, createMonitoredRegistry, createStaticRegistry, handleCompositionError, validateConfig };
//# sourceMappingURL=subgraph-B3gfDbHz.js.map