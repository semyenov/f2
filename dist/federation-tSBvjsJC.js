import { __export } from "./chunk-Cl8Af3a2.js";
import { FederationComposer, FederationComposerLive, SubgraphManagement, compose, createDynamicRegistry, createFederatedSchema, createMonitoredRegistry, createStaticRegistry, handleCompositionError, validateConfig } from "./subgraph-B3gfDbHz.js";
import { Duration, Effect, Schedule, pipe } from "effect";
import { buildSchema, printSchema } from "graphql";

//#region src/federation/entities/mesh.ts
/**
* OpenAPI source adapter
*/
var OpenAPIAdapter = class {
	constructor(_config) {}
	loadSchema() {
		return pipe(Effect.try(() => {
			const schemaSDL = `
          type Query {
            users: [User]
            user(id: ID!): User
          }
          
          type User {
            id: ID!
            name: String!
            email: String!
          }
        `;
			return buildSchema(schemaSDL);
		}), Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to load OpenAPI schema: ${error}`)));
	}
	execute(_query, _variables) {
		return Effect.succeed({ data: { users: [] } });
	}
	health() {
		return Effect.succeed(true);
	}
};
/**
* gRPC source adapter
*/
var GRPCAdapter = class {
	constructor(_config) {}
	loadSchema() {
		return pipe(Effect.try(() => {
			const schemaSDL = `
          type Query {
            products: [Product]
            product(id: ID!): Product
          }
          
          type Product {
            id: ID!
            name: String!
            price: Float!
          }
        `;
			return buildSchema(schemaSDL);
		}), Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to load gRPC schema: ${error}`)));
	}
	execute(_query, _variables) {
		return Effect.succeed({ data: { products: [] } });
	}
	health() {
		return Effect.succeed(true);
	}
};
/**
* Database source adapter
*/
var DatabaseAdapter = class {
	constructor(_type, _config) {}
	loadSchema() {
		return pipe(Effect.try(() => {
			const schemaSDL = `
          type Query {
            orders: [Order]
            order(id: ID!): Order
          }
          
          type Order {
            id: ID!
            customerId: ID!
            total: Float!
            status: String!
          }
        `;
			return buildSchema(schemaSDL);
		}), Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to load database schema: ${error}`)));
	}
	execute(_query, _variables) {
		return Effect.succeed({ data: { orders: [] } });
	}
	health() {
		return Effect.succeed(true);
	}
};
/**
* Mesh integration class
*/
var MeshIntegration = class MeshIntegration {
	adapters = /* @__PURE__ */ new Map();
	schema;
	metrics = {
		requests: 0,
		cacheHits: 0,
		cacheMisses: 0,
		avgLatency: 0,
		sources: {}
	};
	constructor(config) {
		this.config = config;
	}
	/**
	* Create mesh integration
	*/
	static async create(config) {
		const integration = new MeshIntegration(config);
		await Effect.runPromise(integration.initialize());
		return {
			schema: integration.schema,
			execute: (query, variables) => integration.execute(query, variables),
			getMetrics: () => integration.metrics,
			refresh: (sourceName) => integration.refresh(sourceName),
			stop: () => integration.stop()
		};
	}
	/**
	* Initialize mesh
	*/
	initialize() {
		const self = this;
		return pipe(Effect.forEach(self.config.sources, (source) => pipe(self.createAdapter(source), Effect.tap((adapter) => Effect.sync(() => {
			self.adapters.set(source.name, adapter);
			self.metrics.sources[source.name] = {
				requests: 0,
				errors: 0,
				avgLatency: 0
			};
		})))), Effect.flatMap(() => self.loadSchemas()), Effect.flatMap(() => self.config.federation?.autoFederation ?? false ? self.applyFederationTransforms() : Effect.succeed(void 0)), Effect.flatMap(() => Effect.fork(self.startHealthMonitoring())), Effect.map(() => void 0));
	}
	/**
	* Create adapter for source
	*/
	createAdapter(source) {
		return pipe(Effect.sync(() => {
			switch (source.type) {
				case "openapi": return new OpenAPIAdapter(source.config);
				case "grpc": return new GRPCAdapter(source.config);
				case "postgres":
				case "mysql":
				case "mongodb": return new DatabaseAdapter(source.type, source.config);
				default: return null;
			}
		}), Effect.flatMap((adapter) => adapter ? Effect.succeed(adapter) : Effect.fail(/* @__PURE__ */ new Error(`Unsupported source type: ${source.type}`))));
	}
	/**
	* Load and merge schemas
	*/
	loadSchemas() {
		const self = this;
		return pipe(Effect.forEach(Array.from(self.adapters.entries()), ([_name, adapter]) => adapter.loadSchema()), Effect.map((schemas) => {
			self.schema = schemas[0];
		}));
	}
	/**
	* Apply federation transforms
	*/
	applyFederationTransforms() {
		const self = this;
		return pipe(Effect.sync(() => self.schema), Effect.flatMap((schema) => schema ? Effect.succeed(schema) : Effect.fail(/* @__PURE__ */ new Error("Schema not loaded"))), Effect.map((schema) => {
			const federatedSDL = `
          ${printSchema(schema)}
          
          extend type Query {
            _entities(representations: [_Any!]!): [_Entity]!
            _service: _Service!
          }
          
          scalar _Any
          union _Entity
          
          type _Service {
            sdl: String!
          }
        `;
			self.schema = buildSchema(federatedSDL);
		}));
	}
	/**
	* Execute query
	*/
	execute(query, variables) {
		const self = this;
		const startTime = Date.now();
		return pipe(Effect.sync(() => {
			self.metrics.requests++;
			return self.determineSource(query);
		}), Effect.flatMap((sourceName) => {
			const adapter = self.adapters.get(sourceName);
			return adapter ? adapter.execute(query, variables) : Effect.fail(/* @__PURE__ */ new Error(`No adapter for source: ${sourceName}`));
		}), Effect.tap(() => Effect.sync(() => {
			const latency = Date.now() - startTime;
			self.updateMetrics("default", latency, false);
		})), Effect.tapError(() => Effect.sync(() => {
			const latency = Date.now() - startTime;
			self.updateMetrics("default", latency, true);
		})));
	}
	/**
	* Determine source from query
	*/
	determineSource(query) {
		if (query.includes("users")) return "users";
		if (query.includes("products")) return "products";
		if (query.includes("orders")) return "orders";
		return Array.from(this.adapters.keys())[0] ?? "default";
	}
	/**
	* Update metrics
	*/
	updateMetrics(sourceName, latency, isError) {
		const sourceMetrics = this.metrics.sources[sourceName];
		if (sourceMetrics) {
			sourceMetrics.requests++;
			if (isError) sourceMetrics.errors++;
			sourceMetrics.avgLatency = (sourceMetrics.avgLatency * (sourceMetrics.requests - 1) + latency) / sourceMetrics.requests;
		}
		this.metrics.avgLatency = (this.metrics.avgLatency * (this.metrics.requests - 1) + latency) / this.metrics.requests;
	}
	/**
	* Refresh sources
	*/
	refresh(sourceName) {
		const self = this;
		return sourceName != null ? pipe(Effect.sync(() => self.adapters.get(sourceName)), Effect.flatMap((adapter) => adapter ? adapter.loadSchema() : Effect.fail(/* @__PURE__ */ new Error(`Source not found: ${sourceName}`))), Effect.map(() => void 0)) : self.loadSchemas();
	}
	/**
	* Start health monitoring
	*/
	startHealthMonitoring() {
		const self = this;
		return Effect.repeat(pipe(Effect.forEach(Array.from(self.adapters.entries()), ([name, adapter]) => pipe(adapter.health(), Effect.orElseSucceed(() => false), Effect.tap((isHealthy) => !isHealthy ? Effect.sync(() => console.warn(`⚠️  Source ${name} is unhealthy`)) : Effect.succeed(void 0)))), Effect.map(() => void 0)), Schedule.fixed(Duration.seconds(30)));
	}
	/**
	* Stop mesh
	*/
	stop() {
		return Effect.sync(() => {
			console.log("🛑 Mesh integration stopped");
		});
	}
};
/**
* Mesh presets
*/
const MeshPresets = {
	microservices: (services) => ({
		sources: services.map((service) => ({
			type: service.type === "rest" ? "openapi" : "graphql",
			name: service.name,
			config: { endpoint: service.url },
			cache: { ttl: 60 }
		})),
		federation: { autoFederation: true },
		mesh: {
			playground: true,
			port: 4e3,
			rateLimit: {
				max: 1e3,
				window: Duration.minutes(1)
			}
		}
	}),
	databases: (databases) => ({
		sources: databases.map((db) => ({
			type: db.type,
			name: db.name,
			config: { connectionString: db.connection },
			transforms: [{
				type: "federation",
				config: { version: "2.0" }
			}]
		})),
		federation: { autoFederation: true },
		errorHandling: { maskErrors: true }
	}),
	apiGateway: (apis) => ({
		sources: apis.map((api) => ({
			type: "openapi",
			name: api.name,
			config: { spec: api.spec },
			transforms: [{
				type: "prefix",
				config: { value: api.name }
			}, {
				type: "encapsulate",
				config: { name: api.name }
			}]
		})),
		mesh: {
			playground: true,
			cors: {
				origin: "*",
				credentials: true
			}
		},
		plugins: [{
			name: "auth",
			config: { type: "jwt" }
		}, {
			name: "monitoring",
			config: { provider: "prometheus" }
		}]
	})
};
/**
* Mesh utilities
*/
const MeshUtils = {
	openAPIToGraphQL: (_spec) => {
		return pipe(Effect.try(() => buildSchema(`
          type Query {
            api: String
          }
        `)), Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to convert OpenAPI: ${error}`)));
	},
	protoToGraphQL: (_proto) => {
		return pipe(Effect.try(() => buildSchema(`
          type Query {
            service: String
          }
        `)), Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to convert proto: ${error}`)));
	},
	introspectDatabase: (_connection) => {
		return pipe(Effect.try(() => buildSchema(`
          type Query {
            tables: [String]
          }
        `)), Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to introspect database: ${error}`)));
	}
};

//#endregion
//#region src/federation/index.ts
var federation_exports = {};
__export(federation_exports, {
	FederationComposer: () => FederationComposer,
	FederationComposerLive: () => FederationComposerLive,
	MeshIntegration: () => MeshIntegration,
	MeshPresets: () => MeshPresets,
	MeshUtils: () => MeshUtils,
	SubgraphManagement: () => SubgraphManagement,
	compose: () => compose,
	createDynamicRegistry: () => createDynamicRegistry,
	createFederatedSchema: () => createFederatedSchema,
	createMonitoredRegistry: () => createMonitoredRegistry,
	createStaticRegistry: () => createStaticRegistry,
	handleCompositionError: () => handleCompositionError,
	validateConfig: () => validateConfig
});

//#endregion
export { MeshIntegration, MeshPresets, MeshUtils, federation_exports };
//# sourceMappingURL=federation-tSBvjsJC.js.map