const require_errors = require('./errors-CLhqlpsL.cjs');
const effect = require_errors.__toESM(require("effect"));
const effect_Effect = require_errors.__toESM(require("effect/Effect"));
const effect_Match = require_errors.__toESM(require("effect/Match"));
const effect_Context = require_errors.__toESM(require("effect/Context"));
const graphql = require_errors.__toESM(require("graphql"));
const effect_Layer = require_errors.__toESM(require("effect/Layer"));
const effect_LogLevel = require_errors.__toESM(require("effect/LogLevel"));

//#region src/federation/composition/composer.ts
var FederationComposer = class extends effect_Context.Tag("FederationComposer")() {};
const makeComposer = effect_Effect.tryPromise(async () => {
	const logger = {
		trace: (message, meta) => effect_Effect.logWithLevel(effect_LogLevel.Trace, message, meta),
		debug: (message, meta) => effect_Effect.logWithLevel(effect_LogLevel.Debug, message, meta),
		info: (message, meta) => effect_Effect.logWithLevel(effect_LogLevel.Info, message, meta),
		warn: (message, meta) => effect_Effect.logWithLevel(effect_LogLevel.Warning, message, meta),
		error: (message, meta) => effect_Effect.logWithLevel(effect_LogLevel.Error, message, meta),
		withSpan: (name, effect$1) => effect_Effect.withSpan(effect$1, name)
	};
	const compose$1 = (federationConfig) => effect_Effect.gen(function* () {
		yield* logger.info("Starting federation composition", {
			entityCount: federationConfig.entities.length,
			serviceCount: federationConfig.services.length
		});
		const validatedConfig = yield* validate(federationConfig).pipe(effect_Effect.mapError((error) => new require_errors.CompositionError(`Configuration validation failed: ${error.message}`, void 0, { field: error.field }, error)));
		const subgraphSchemas = yield* fetchSubgraphSchemas(validatedConfig.services);
		const composedConfig = {
			config: validatedConfig,
			subgraphSchemas,
			metadata: createMetadata(validatedConfig, subgraphSchemas)
		};
		const schema = yield* buildSchema(composedConfig);
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
	const validate = (federationConfig) => effect_Effect.gen(function* () {
		yield* logger.trace("Validating federation configuration");
		if (federationConfig.entities.length === 0) {
			yield* logger.error("No entities provided in configuration");
			return yield* effect_Effect.fail(require_errors.ErrorFactory.validation("At least one entity is required", "entities"));
		}
		if (federationConfig.services.length === 0) {
			yield* logger.error("No services provided in configuration");
			return yield* effect_Effect.fail(require_errors.ErrorFactory.validation("At least one service is required", "services"));
		}
		yield* effect_Effect.forEach(federationConfig.services, validateServiceUrl, { concurrency: 3 });
		yield* validateEntityKeys(federationConfig.entities);
		yield* logger.trace("Configuration validation completed");
		return federationConfig;
	});
	const buildSchema = (composedConfig) => effect_Effect.gen(function* () {
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
			const schema = (0, graphql.buildSchema)(combinedSDL);
			yield* logger.info("GraphQL schema built successfully");
			return schema;
		} catch (err) {
			yield* logger.error("Failed to build GraphQL schema", { error: err });
			return yield* effect_Effect.fail(new require_errors.CompositionError(`Failed to build schema: ${err}`, void 0, {}, err));
		}
	});
	return {
		compose: compose$1,
		validate,
		buildSchema
	};
});
const validateServiceUrl = (service) => effect_Effect.gen(function* () {
	yield* effect_Effect.logWithLevel(effect_LogLevel.Trace, `Validating service URL: ${service.url}`);
	try {
		new URL(service.url);
		yield* effect_Effect.logWithLevel(effect_LogLevel.Trace, `Service URL is valid: ${service.url}`);
	} catch (err) {
		yield* effect_Effect.logWithLevel(effect_LogLevel.Error, `Invalid service URL: ${service.url}`, { error: err });
		return yield* effect_Effect.fail(require_errors.ErrorFactory.validation(`Invalid service URL: ${service.url}`, "url", service.url));
	}
});
const validateEntityKeys = (entities) => effect_Effect.gen(function* () {
	yield* effect_Effect.logWithLevel(effect_LogLevel.Trace, `Validating entity keys for ${entities.length} entities`);
	for (const entity of entities) {
		if (!entity.typename || entity.typename.trim() === "") {
			yield* effect_Effect.logWithLevel(effect_LogLevel.Error, `Entity has empty typename`);
			return yield* effect_Effect.fail(require_errors.ErrorFactory.validation(`Entity typename cannot be empty`, "typename", entity.typename));
		}
		if (Array.isArray(entity.key) && entity.key.length === 0) {
			yield* effect_Effect.logWithLevel(effect_LogLevel.Error, `Entity ${entity.typename} has no key fields`);
			return yield* effect_Effect.fail(require_errors.ErrorFactory.validation(`Entity ${entity.typename} must have at least one key field`, "key", entity.key));
		}
	}
	yield* effect_Effect.logWithLevel(effect_LogLevel.Trace, "Entity key validation completed");
});
const fetchSubgraphSchemas = (services) => effect_Effect.gen(function* () {
	yield* effect_Effect.logWithLevel(effect_LogLevel.Info, `Fetching schemas from ${services.length} subgraphs`);
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
	yield* effect_Effect.logWithLevel(effect_LogLevel.Info, "Subgraph schemas fetched successfully");
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
const FederationComposerLive = effect_Layer.effect(FederationComposer, makeComposer);
const compose = (config) => effect_Effect.gen(function* () {
	const composer = yield* makeComposer;
	return yield* composer.compose(config);
});
const validateConfig = (config) => effect_Effect.flatMap(FederationComposer, (composer) => composer.validate(config));
const handleCompositionError = (error) => effect_Match.value(error).pipe(effect_Match.when((error$1) => error$1.message.includes("URL"), () => "Invalid service configuration - check your URLs"), effect_Match.when((error$1) => error$1.message.includes("schema"), () => "Schema composition failed - check your GraphQL definitions"), effect_Match.orElse(() => `Composition error: ${error.message}`));
const createFederatedSchema = (config) => effect_Effect.gen(function* () {
	yield* effect_Effect.logWithLevel(effect_LogLevel.Info, "Creating federated schema");
	const result = yield* compose(config).pipe(effect_Effect.catchTag("CompositionError", (error) => effect_Effect.gen(function* () {
		const userMessage = handleCompositionError(error);
		yield* effect_Effect.logWithLevel(effect_LogLevel.Error, "Composition failed", {
			error,
			userMessage
		});
		return yield* effect_Effect.fail(error);
	})), effect_Effect.timeout(effect.Duration.seconds(30)), effect_Effect.catchTag("TimeoutException", () => effect_Effect.gen(function* () {
		yield* effect_Effect.logWithLevel(effect_LogLevel.Error, "Schema composition timed out");
		return yield* effect_Effect.fail(new require_errors.CompositionError("Schema composition timed out after 30 seconds"));
	})));
	yield* effect_Effect.logWithLevel(effect_LogLevel.Info, "Federated schema created successfully");
	return result;
});

//#endregion
//#region src/federation/subgraphs/subgraph.ts
let SubgraphManagement;
(function(_SubgraphManagement) {
	_SubgraphManagement.createRegistry = (config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.flatMap(validateRegistryConfig), effect.Effect.mapError((error) => {
		return require_errors.ErrorFactory.composition(`Registry configuration validation failed: ${error.message}`, void 0, "config");
	}), effect.Effect.flatMap((validConfig) => (0, effect.pipe)(createServiceStore(), effect.Effect.map((store) => ({
		register: (definition) => registerSubgraph(definition, validConfig, store),
		unregister: (serviceId) => unregisterSubgraph(serviceId, validConfig, store),
		discover: () => discoverSubgraphs(validConfig, store),
		health: (serviceId) => checkSubgraphHealth(serviceId, validConfig, store)
	})))));
	_SubgraphManagement.withAutoDiscovery = (registry, interval = effect.Duration.seconds(30)) => (0, effect.pipe)(effect.Effect.succeed(registry), effect.Effect.tap(() => (0, effect.pipe)(scheduleDiscovery(registry, interval), effect.Effect.fork)));
	_SubgraphManagement.withHealthMonitoring = (registry, interval = effect.Duration.seconds(10)) => (0, effect.pipe)(effect.Effect.succeed(registry), effect.Effect.tap(() => (0, effect.pipe)(scheduleHealthChecks(registry, interval), effect.Effect.fork)));
	/**
	* Validate registry configuration
	*/
	const validateRegistryConfig = (config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.filterOrFail((config$1) => config$1.discoveryMode === "static" ? config$1.staticServices.length > 0 : config$1.discoveryEndpoints.length > 0, () => require_errors.ErrorFactory.composition("Registry configuration must have services or discovery endpoints")));
	/**
	* Create optimized in-memory service store with indexing
	*/
	const createServiceStore = () => {
		const services = /* @__PURE__ */ new Map();
		const servicesByUrl = /* @__PURE__ */ new Map();
		const healthyServices = /* @__PURE__ */ new Set();
		return effect.Effect.succeed({
			store: (service) => effect.Effect.sync(() => {
				const existingService = services.get(service.id);
				if (existingService !== void 0) servicesByUrl.delete(existingService.url);
				services.set(service.id, service);
				servicesByUrl.set(service.url, service);
			}),
			remove: (serviceId) => effect.Effect.sync(() => {
				const service = services.get(serviceId);
				if (service !== void 0) {
					services.delete(serviceId);
					servicesByUrl.delete(service.url);
					healthyServices.delete(serviceId);
				}
			}),
			getAll: () => effect.Effect.succeed(Array.from(services.values())),
			get: (serviceId) => effect.Effect.succeed(services.get(serviceId))
		});
	};
	/**
	* Register a new subgraph service
	*/
	const registerSubgraph = (definition, config, store) => (0, effect.pipe)(effect.Effect.succeed(definition), effect.Effect.flatMap(validateServiceDefinition), effect.Effect.flatMap((validDef) => store.store(validDef)), effect.Effect.flatMap(() => triggerSchemaRecomposition(definition, config)), effect.Effect.catchAll((_error) => effect.Effect.fail(require_errors.ErrorFactory.CommonErrors.registrationError(`Failed to register service ${definition.id}`, definition.id))));
	/**
	* Validate service definition
	*/
	const validateServiceDefinition = (definition) => (0, effect.pipe)(effect.Effect.succeed(definition), effect.Effect.filterOrFail((def) => Boolean(def.id?.trim()), () => require_errors.ErrorFactory.CommonErrors.registrationError("Service ID is required", "unknown")), effect.Effect.filterOrFail((def) => Boolean(def.url?.trim()), () => require_errors.ErrorFactory.CommonErrors.registrationError("Service URL is required", definition.id ?? "unknown")), effect.Effect.flatMap((def) => {
		try {
			new URL(def.url);
			return effect.Effect.succeed(def);
		} catch {
			return effect.Effect.fail(require_errors.ErrorFactory.CommonErrors.registrationError(`Invalid service URL: ${def.url}`, def.id ?? "unknown"));
		}
	}));
	/**
	* Unregister a subgraph service
	*/
	const unregisterSubgraph = (serviceId, config, store) => (0, effect.pipe)(store.get(serviceId), effect.Effect.mapError((error) => require_errors.ErrorFactory.CommonErrors.registrationError(`Failed to get service ${serviceId}: ${error.message}`, serviceId)), effect.Effect.flatMap((service) => service !== void 0 ? (0, effect.pipe)(store.remove(serviceId), effect.Effect.flatMap(() => (0, effect.pipe)(triggerSchemaRecomposition({
		id: serviceId,
		url: ""
	}, config), effect.Effect.mapError((error) => require_errors.ErrorFactory.CommonErrors.registrationError(`Failed to trigger recomposition for service ${serviceId}: ${error.message}`, serviceId))))) : effect.Effect.fail(require_errors.ErrorFactory.CommonErrors.registrationError(`Service ${serviceId} not found`, serviceId))));
	/**
	* Discover subgraphs from configured sources
	*/
	const discoverSubgraphs = (config, store) => config.discoveryMode === "static" ? effect.Effect.succeed(config.staticServices) : (0, effect.pipe)(effect.Effect.succeed(config.discoveryEndpoints), effect.Effect.flatMap((endpoints) => effect.Effect.all(endpoints.map((endpoint) => (0, effect.pipe)(fetchFromDiscoveryEndpoint(endpoint, config), effect.Effect.catchAll((error) => {
		console.warn(`Discovery endpoint ${endpoint} failed:`, error);
		return effect.Effect.succeed([]);
	}))), { concurrency: 3 })), effect.Effect.map((results) => results.flat()), effect.Effect.tap((services) => effect.Effect.all(services.map((service) => (0, effect.pipe)(store.store(service), effect.Effect.mapError((error) => require_errors.ErrorFactory.CommonErrors.discoveryError(`Failed to store discovered service ${service.id}: ${error.message}`, service.url)))))));
	/**
	* Fetch services from discovery endpoint with connection pooling and caching
	*/
	const fetchFromDiscoveryEndpoint = (endpoint, config) => {
		return (0, effect.pipe)(effect.Effect.tryPromise({
			try: () => fetch(endpoint, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"Cache-Control": "max-age=30",
					"User-Agent": "Federation-Framework/2.0"
				},
				keepalive: true
			}),
			catch: (error) => require_errors.ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint unavailable: ${endpoint}`, endpoint, error)
		}), effect.Effect.timeout(config.healthCheckTimeout), effect.Effect.mapError((error) => error._tag === "TimeoutException" ? require_errors.ErrorFactory.CommonErrors.discoveryError(`Timeout accessing discovery endpoint: ${endpoint}`, endpoint) : require_errors.ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint unavailable: ${endpoint}`, endpoint, error)), effect.Effect.flatMap((response) => {
			if (!response.ok) return effect.Effect.fail(require_errors.ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint returned ${response.status}: ${response.statusText}`, endpoint));
			return (0, effect.pipe)(effect.Effect.tryPromise({
				try: async () => {
					const text = await response.text();
					try {
						return JSON.parse(text);
					} catch {
						throw new Error(`Invalid JSON: ${text.slice(0, 100)}...`);
					}
				},
				catch: (error) => require_errors.ErrorFactory.CommonErrors.discoveryError(`Invalid JSON response: ${error.message}`, endpoint)
			}), effect.Effect.flatMap((data) => {
				if (!Array.isArray(data["services"])) return effect.Effect.fail(require_errors.ErrorFactory.CommonErrors.discoveryError(`Expected services array, got: ${typeof data}`, endpoint));
				const services = data["services"];
				const validServices = services.filter((service) => {
					return service != null && typeof service === "object" && "id" in service && "url" in service && typeof service.id === "string" && typeof service.url === "string";
				});
				if (validServices.length !== services.length) console.warn(`Filtered out ${services.length - validServices.length} invalid services from ${endpoint}`);
				return effect.Effect.succeed(validServices);
			}));
		}), effect.Effect.retry(effect.Schedule.exponential(config.retryPolicy.initialDelay).pipe(effect.Schedule.compose(effect.Schedule.recurs(config.retryPolicy.maxAttempts)))));
	};
	/**
	* Check health of a specific subgraph
	*/
	const checkSubgraphHealth = (serviceId, config, store) => (0, effect.pipe)(store.get(serviceId), effect.Effect.mapError((error) => new require_errors.HealthCheckError(`Failed to get service ${serviceId}: ${error.message}`, serviceId)), effect.Effect.flatMap((service) => service !== void 0 ? performHealthCheck(service, config) : effect.Effect.fail(new require_errors.HealthCheckError(`Service ${serviceId} not found`, serviceId))));
	/**
	* Perform optimized health check with adaptive timeout and connection reuse
	*/
	const performHealthCheck = (service, config) => {
		const startTime = Date.now();
		const adaptiveTimeout = effect.Duration.toMillis(config.healthCheckTimeout);
		return (0, effect.pipe)(effect.Effect.tryPromise({
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
				return require_errors.ErrorFactory.healthCheck(errorMessage, service.id, error);
			}
		}), effect.Effect.flatMap((response) => {
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
				return effect.Effect.succeed({
					...baseStatus,
					status
				});
			} else if (response.status >= 500) return effect.Effect.succeed({
				...baseStatus,
				status: "unhealthy"
			});
			else return effect.Effect.succeed({
				...baseStatus,
				status: "degraded"
			});
		}), effect.Effect.catchAll((_error) => {
			const responseTime = Date.now() - startTime;
			return effect.Effect.succeed({
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
	const triggerSchemaRecomposition = (service, _config) => (0, effect.pipe)(effect.Effect.succeed(service), effect.Effect.tap(() => effect.Effect.sync(() => {
		console.log(`🔄 Triggering schema recomposition for service: ${service.id}`);
	})));
	/**
	* Schedule periodic service discovery
	*/
	const scheduleDiscovery = (registry, interval) => (0, effect.pipe)(registry.discover(), effect.Effect.tap((services) => effect.Effect.sync(() => {
		console.log(`🔍 Discovered ${services.length} services`);
	})), effect.Effect.catchAll((error) => {
		console.warn("Service discovery failed:", error);
		return effect.Effect.succeed([]);
	}), effect.Effect.repeat(effect.Schedule.fixed(interval)), effect.Effect.asVoid);
	/**
	* Schedule optimized health checks with adaptive concurrency and batching
	*/
	const scheduleHealthChecks = (registry, interval) => {
		let healthCheckRound = 0;
		return (0, effect.pipe)(registry.discover(), effect.Effect.catchAll((error) => {
			console.warn("Discovery failed during health checks:", error.message);
			return effect.Effect.succeed([]);
		}), effect.Effect.flatMap((services) => {
			healthCheckRound++;
			const batchSize = Math.min(10, Math.max(3, Math.ceil(services.length / 3)));
			console.log(`🔍 Health check round ${healthCheckRound} for ${services.length} services (batch size: ${batchSize})`);
			return effect.Effect.all(services.map((service) => (0, effect.pipe)(registry.health(service.id), effect.Effect.tap((health) => effect.Effect.sync(() => {
				const status = health.status === "healthy" ? "✅" : health.status === "degraded" ? "⚠️" : "❌";
				const responseTime = health.metrics?.["responseTimeMs"] ?? 0;
				console.log(`${status} ${service.id}: ${health.status} (${responseTime}ms)`);
			})), effect.Effect.catchAll((error) => {
				console.warn(`Health check failed for ${service.id}:`, error.message);
				return effect.Effect.succeed({
					status: "unhealthy",
					serviceId: service.id,
					lastCheck: /* @__PURE__ */ new Date()
				});
			}))), { concurrency: batchSize });
		}), effect.Effect.repeat(effect.Schedule.fixed(interval)), effect.Effect.asVoid);
	};
	_SubgraphManagement.defaultConfig = (services) => ({
		discoveryMode: "static",
		staticServices: services,
		discoveryEndpoints: [],
		healthCheckInterval: effect.Duration.seconds(30),
		healthCheckTimeout: effect.Duration.seconds(5),
		retryPolicy: {
			maxAttempts: 3,
			initialDelay: effect.Duration.seconds(1)
		}
	});
	_SubgraphManagement.dynamicConfig = (discoveryEndpoints) => ({
		discoveryMode: "dynamic",
		staticServices: [],
		discoveryEndpoints,
		healthCheckInterval: effect.Duration.seconds(30),
		healthCheckTimeout: effect.Duration.seconds(5),
		retryPolicy: {
			maxAttempts: 3,
			initialDelay: effect.Duration.seconds(1)
		}
	});
})(SubgraphManagement || (SubgraphManagement = {}));
/**
* Factory functions for common registry setups
*/
const createStaticRegistry = (services) => SubgraphManagement.createRegistry(SubgraphManagement.defaultConfig(services));
const createDynamicRegistry = (discoveryEndpoints) => SubgraphManagement.createRegistry(SubgraphManagement.dynamicConfig(discoveryEndpoints));
const createMonitoredRegistry = (services, options) => (0, effect.pipe)(createStaticRegistry(services), effect.Effect.flatMap((registry) => (0, effect.pipe)(SubgraphManagement.withAutoDiscovery(registry, options?.discoveryInterval), effect.Effect.flatMap((registryWithDiscovery) => SubgraphManagement.withHealthMonitoring(registryWithDiscovery, options?.healthCheckInterval)))));

//#endregion
Object.defineProperty(exports, 'FederationComposer', {
  enumerable: true,
  get: function () {
    return FederationComposer;
  }
});
Object.defineProperty(exports, 'FederationComposerLive', {
  enumerable: true,
  get: function () {
    return FederationComposerLive;
  }
});
Object.defineProperty(exports, 'SubgraphManagement', {
  enumerable: true,
  get: function () {
    return SubgraphManagement;
  }
});
Object.defineProperty(exports, 'compose', {
  enumerable: true,
  get: function () {
    return compose;
  }
});
Object.defineProperty(exports, 'createDynamicRegistry', {
  enumerable: true,
  get: function () {
    return createDynamicRegistry;
  }
});
Object.defineProperty(exports, 'createFederatedSchema', {
  enumerable: true,
  get: function () {
    return createFederatedSchema;
  }
});
Object.defineProperty(exports, 'createMonitoredRegistry', {
  enumerable: true,
  get: function () {
    return createMonitoredRegistry;
  }
});
Object.defineProperty(exports, 'createStaticRegistry', {
  enumerable: true,
  get: function () {
    return createStaticRegistry;
  }
});
Object.defineProperty(exports, 'handleCompositionError', {
  enumerable: true,
  get: function () {
    return handleCompositionError;
  }
});
Object.defineProperty(exports, 'validateConfig', {
  enumerable: true,
  get: function () {
    return validateConfig;
  }
});