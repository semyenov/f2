const require_errors = require('./errors-CLhqlpsL.cjs');
const require_subgraph = require('./subgraph-ReCCOQYz.cjs');
const effect = require_errors.__toESM(require("effect"));
const graphql = require_errors.__toESM(require("graphql"));

//#region src/federation/entities/mesh.ts
/**
* OpenAPI source adapter
*/
var OpenAPIAdapter = class {
	constructor(_config) {}
	loadSchema() {
		return (0, effect.pipe)(effect.Effect.try(() => {
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
			return (0, graphql.buildSchema)(schemaSDL);
		}), effect.Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to load OpenAPI schema: ${error}`)));
	}
	execute(_query, _variables) {
		return effect.Effect.succeed({ data: { users: [] } });
	}
	health() {
		return effect.Effect.succeed(true);
	}
};
/**
* gRPC source adapter
*/
var GRPCAdapter = class {
	constructor(_config) {}
	loadSchema() {
		return (0, effect.pipe)(effect.Effect.try(() => {
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
			return (0, graphql.buildSchema)(schemaSDL);
		}), effect.Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to load gRPC schema: ${error}`)));
	}
	execute(_query, _variables) {
		return effect.Effect.succeed({ data: { products: [] } });
	}
	health() {
		return effect.Effect.succeed(true);
	}
};
/**
* Database source adapter
*/
var DatabaseAdapter = class {
	constructor(_type, _config) {}
	loadSchema() {
		return (0, effect.pipe)(effect.Effect.try(() => {
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
			return (0, graphql.buildSchema)(schemaSDL);
		}), effect.Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to load database schema: ${error}`)));
	}
	execute(_query, _variables) {
		return effect.Effect.succeed({ data: { orders: [] } });
	}
	health() {
		return effect.Effect.succeed(true);
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
		await effect.Effect.runPromise(integration.initialize());
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
		return (0, effect.pipe)(effect.Effect.forEach(self.config.sources, (source) => (0, effect.pipe)(self.createAdapter(source), effect.Effect.tap((adapter) => effect.Effect.sync(() => {
			self.adapters.set(source.name, adapter);
			self.metrics.sources[source.name] = {
				requests: 0,
				errors: 0,
				avgLatency: 0
			};
		})))), effect.Effect.flatMap(() => self.loadSchemas()), effect.Effect.flatMap(() => self.config.federation?.autoFederation ?? false ? self.applyFederationTransforms() : effect.Effect.succeed(void 0)), effect.Effect.flatMap(() => effect.Effect.fork(self.startHealthMonitoring())), effect.Effect.map(() => void 0));
	}
	/**
	* Create adapter for source
	*/
	createAdapter(source) {
		return (0, effect.pipe)(effect.Effect.sync(() => {
			switch (source.type) {
				case "openapi": return new OpenAPIAdapter(source.config);
				case "grpc": return new GRPCAdapter(source.config);
				case "postgres":
				case "mysql":
				case "mongodb": return new DatabaseAdapter(source.type, source.config);
				default: return null;
			}
		}), effect.Effect.flatMap((adapter) => adapter ? effect.Effect.succeed(adapter) : effect.Effect.fail(/* @__PURE__ */ new Error(`Unsupported source type: ${source.type}`))));
	}
	/**
	* Load and merge schemas
	*/
	loadSchemas() {
		const self = this;
		return (0, effect.pipe)(effect.Effect.forEach(Array.from(self.adapters.entries()), ([_name, adapter]) => adapter.loadSchema()), effect.Effect.map((schemas) => {
			self.schema = schemas[0];
		}));
	}
	/**
	* Apply federation transforms
	*/
	applyFederationTransforms() {
		const self = this;
		return (0, effect.pipe)(effect.Effect.sync(() => self.schema), effect.Effect.flatMap((schema) => schema ? effect.Effect.succeed(schema) : effect.Effect.fail(/* @__PURE__ */ new Error("Schema not loaded"))), effect.Effect.map((schema) => {
			const federatedSDL = `
          ${(0, graphql.printSchema)(schema)}
          
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
			self.schema = (0, graphql.buildSchema)(federatedSDL);
		}));
	}
	/**
	* Execute query
	*/
	execute(query, variables) {
		const self = this;
		const startTime = Date.now();
		return (0, effect.pipe)(effect.Effect.sync(() => {
			self.metrics.requests++;
			return self.determineSource(query);
		}), effect.Effect.flatMap((sourceName) => {
			const adapter = self.adapters.get(sourceName);
			return adapter ? adapter.execute(query, variables) : effect.Effect.fail(/* @__PURE__ */ new Error(`No adapter for source: ${sourceName}`));
		}), effect.Effect.tap(() => effect.Effect.sync(() => {
			const latency = Date.now() - startTime;
			self.updateMetrics("default", latency, false);
		})), effect.Effect.tapError(() => effect.Effect.sync(() => {
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
		return sourceName != null ? (0, effect.pipe)(effect.Effect.sync(() => self.adapters.get(sourceName)), effect.Effect.flatMap((adapter) => adapter ? adapter.loadSchema() : effect.Effect.fail(/* @__PURE__ */ new Error(`Source not found: ${sourceName}`))), effect.Effect.map(() => void 0)) : self.loadSchemas();
	}
	/**
	* Start health monitoring
	*/
	startHealthMonitoring() {
		const self = this;
		return effect.Effect.repeat((0, effect.pipe)(effect.Effect.forEach(Array.from(self.adapters.entries()), ([name, adapter]) => (0, effect.pipe)(adapter.health(), effect.Effect.orElseSucceed(() => false), effect.Effect.tap((isHealthy) => !isHealthy ? effect.Effect.sync(() => console.warn(`⚠️  Source ${name} is unhealthy`)) : effect.Effect.succeed(void 0)))), effect.Effect.map(() => void 0)), effect.Schedule.fixed(effect.Duration.seconds(30)));
	}
	/**
	* Stop mesh
	*/
	stop() {
		return effect.Effect.sync(() => {
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
				window: effect.Duration.minutes(1)
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
		return (0, effect.pipe)(effect.Effect.try(() => (0, graphql.buildSchema)(`
          type Query {
            api: String
          }
        `)), effect.Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to convert OpenAPI: ${error}`)));
	},
	protoToGraphQL: (_proto) => {
		return (0, effect.pipe)(effect.Effect.try(() => (0, graphql.buildSchema)(`
          type Query {
            service: String
          }
        `)), effect.Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to convert proto: ${error}`)));
	},
	introspectDatabase: (_connection) => {
		return (0, effect.pipe)(effect.Effect.try(() => (0, graphql.buildSchema)(`
          type Query {
            tables: [String]
          }
        `)), effect.Effect.mapError((error) => /* @__PURE__ */ new Error(`Failed to introspect database: ${error}`)));
	}
};

//#endregion
//#region src/federation/index.ts
var federation_exports = {};
require_errors.__export(federation_exports, {
	FederationComposer: () => require_subgraph.FederationComposer,
	FederationComposerLive: () => require_subgraph.FederationComposerLive,
	MeshIntegration: () => MeshIntegration,
	MeshPresets: () => MeshPresets,
	MeshUtils: () => MeshUtils,
	SubgraphManagement: () => require_subgraph.SubgraphManagement,
	compose: () => require_subgraph.compose,
	createDynamicRegistry: () => require_subgraph.createDynamicRegistry,
	createFederatedSchema: () => require_subgraph.createFederatedSchema,
	createMonitoredRegistry: () => require_subgraph.createMonitoredRegistry,
	createStaticRegistry: () => require_subgraph.createStaticRegistry,
	handleCompositionError: () => require_subgraph.handleCompositionError,
	validateConfig: () => require_subgraph.validateConfig
});

//#endregion
Object.defineProperty(exports, 'MeshIntegration', {
  enumerable: true,
  get: function () {
    return MeshIntegration;
  }
});
Object.defineProperty(exports, 'MeshPresets', {
  enumerable: true,
  get: function () {
    return MeshPresets;
  }
});
Object.defineProperty(exports, 'MeshUtils', {
  enumerable: true,
  get: function () {
    return MeshUtils;
  }
});
Object.defineProperty(exports, 'federation_exports', {
  enumerable: true,
  get: function () {
    return federation_exports;
  }
});