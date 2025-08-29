import { ErrorFactory } from "./errors-lo2u-uDT.js";
import { Effect, pipe } from "effect";
import * as Effect$1 from "effect/Effect";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as LogLevel from "effect/LogLevel";
import * as Config from "effect/Config";
import * as Schema from "effect/Schema";
import * as Logger from "effect/Logger";

//#region src/runtime/core/builders/entity-builder.ts
/**
* Federation Entity Builder with full Apollo Federation 2.x directive support
*
* A fluent builder for creating federated GraphQL entities with comprehensive directive support,
* Effect-based error handling, and type-safe field resolution.
*
* ## Features
* - 🏗️ **Fluent Builder Pattern**: Chainable methods for entity configuration
* - 🌐 **Full Federation 2.x Support**: All directives (@shareable, @inaccessible, @tag, @override, @external, @requires, @provides)
* - ⚡ **Effect-Based Operations**: Type-safe error handling with Effect.Effect
* - 🔒 **Type Safety**: Generic constraints ensure compile-time validation
* - 🛡️ **Directive Validation**: Automatic conflict detection and validation
* - 🎯 **Reference Resolution**: Seamless entity resolution across subgraphs
*
* ## Basic Usage
*
* ```typescript
* import { createEntityBuilder } from '@cqrs/federation'
* import { Effect } from 'effect'
* import * as Schema from 'effect/Schema'
*
* // Define entity schema
* const UserSchema = Schema.Struct({
*   id: Schema.String,
*   email: Schema.String,
*   name: Schema.String,
*   avatar: Schema.String
* })
*
* // Build federated entity
* const userEntity = createEntityBuilder('User', UserSchema, ['id'])
*   .withShareableField('name')
*   .withInaccessibleField('email')
*   .withTaggedField('avatar', ['public', 'cdn'])
*   .withReferenceResolver(resolveUserFromReference)
*   .build()
* ```
*
* ## Advanced Directive Usage
*
* ```typescript
* // Override field from another subgraph
* const productEntity = createEntityBuilder('Product', ProductSchema, ['id'])
*   .withOverrideField('price', 'inventory-service', resolvePriceFromInventory)
*   .withRequiredFields('availability', 'id sku', resolveAvailability)
*   .withProvidedFields('summary', 'name description', resolveSummary)
*   .build()
* ```
*
* ## Type Parameters
* @template TSource - Source data type (e.g., from database or API)
* @template TContext - GraphQL execution context type containing services, user info, etc.
* @template TResult - Resolved entity type returned to GraphQL clients
* @template TReference - Reference type containing key fields for entity resolution
*
* @category Entity Builders
* @see {@link createEntityBuilder} - Factory function for creating entity builders
* @see {@link https://www.apollographql.com/docs/federation/entities/ | Apollo Federation Entities}
* @see {@link https://effect.website/docs/essentials/effect-type | Effect Documentation}
*/
var FederationEntityBuilder = class FederationEntityBuilder {
	constructor(typename, schema, keyFields, directiveMap = {}, fieldResolvers = {}, referenceResolver, extensions) {
		this.typename = typename;
		this.schema = schema;
		this.keyFields = keyFields;
		this.directiveMap = directiveMap;
		this.fieldResolvers = fieldResolvers;
		this.referenceResolver = referenceResolver;
		this.extensions = extensions;
		this.validateConstructorArgs();
	}
	validateConstructorArgs() {
		if (!this.typename?.trim()) throw new Error("Typename cannot be empty");
		if (!this.keyFields?.length) throw new Error("Key fields cannot be empty");
	}
	/**
	* Marks a field as @shareable, indicating it can be resolved by multiple subgraphs
	*
	* The @shareable directive allows multiple subgraphs to define and resolve the same field.
	* This is useful for common fields that can be computed by different services.
	*
	* @example Basic shareable field
	* ```typescript
	* const entity = createEntityBuilder('Product', ProductSchema, ['id'])
	*   .withShareableField('name') // Multiple subgraphs can resolve 'name'
	*   .build()
	* ```
	*
	* @example Shareable field with custom resolver
	* ```typescript
	* const entity = createEntityBuilder('User', UserSchema, ['id'])
	*   .withShareableField('displayName', (user, args, context) =>
	*     Effect.succeed(`${user.firstName} ${user.lastName}`)
	*   )
	*   .build()
	* ```
	*
	* @param field - Field name to mark as shareable
	* @param resolver - Optional custom resolver for this field
	* @returns New builder instance with the shareable directive applied
	* @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#shareable | @shareable Directive}
	*/
	withShareableField(field, resolver) {
		return this.addDirective(field, { type: "@shareable" }, resolver);
	}
	/**
	* Marks a field as @inaccessible, hiding it from the public schema while keeping it available for federation
	*
	* The @inaccessible directive prevents a field from appearing in the supergraph schema
	* but allows it to be used internally for federation operations like @requires and @provides.
	*
	* @example Hide sensitive internal field
	* ```typescript
	* const entity = createEntityBuilder('User', UserSchema, ['id'])
	*   .withInaccessibleField('internalId') // Hidden from public API
	*   .withInaccessibleField('auditLog')   // Internal tracking field
	*   .build()
	* ```
	*
	* @example Use inaccessible field in other directives
	* ```typescript
	* const entity = createEntityBuilder('Order', OrderSchema, ['id'])
	*   .withInaccessibleField('userId')  // Hidden but available for federation
	*   .withRequiredFields('total', 'userId', calculateTotal) // Can reference userId
	*   .build()
	* ```
	*
	* @param field - Field name to mark as inaccessible
	* @param resolver - Optional custom resolver for this field
	* @returns New builder instance with the inaccessible directive applied
	* @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#inaccessible | @inaccessible Directive}
	*/
	withInaccessibleField(field, resolver) {
		return this.addDirective(field, { type: "@inaccessible" }, resolver);
	}
	/**
	* Marks field with @tag - Metadata tags for schema organization and tooling
	*
	* The @tag directive allows you to apply arbitrary string metadata to schema elements.
	* This is useful for schema organization, filtering, and tooling integration.
	*
	* @example Basic field tagging
	* ```typescript
	* const entity = createEntityBuilder('User', UserSchema, ['id'])
	*   .withTaggedField('avatar', ['public', 'cdn'])     // Mark as public CDN field
	*   .withTaggedField('preferences', ['internal'])      // Internal-only field
	*   .build()
	* ```
	*
	* @example Multi-environment tagging
	* ```typescript
	* const entity = createEntityBuilder('Product', ProductSchema, ['id'])
	*   .withTaggedField('betaFeatures', ['beta', 'experimental'])
	*   .withTaggedField('adminOnly', ['admin', 'restricted'])
	*   .build()
	* ```
	*
	* @param field - Field name to tag
	* @param tags - Array of tag strings (cannot be empty)
	* @param resolver - Optional custom resolver for this field
	* @returns New builder instance with the tag directive applied
	* @throws Error if tags array is empty
	* @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#tag | @tag Directive}
	*/
	withTaggedField(field, tags, resolver) {
		if (!tags.length) throw new Error("Tags array cannot be empty");
		return this.addDirective(field, {
			type: "@tag",
			args: { names: tags }
		}, resolver);
	}
	/**
	* Marks field with @override - Overrides field resolution from another subgraph
	*
	* The @override directive indicates that the current subgraph is taking over
	* responsibility for resolving a particular field from the specified subgraph.
	* This allows for gradual transfer of field ownership between services.
	*
	* @example Basic field override
	* ```typescript
	* const entity = createEntityBuilder('Product', ProductSchema, ['id'])
	*   .withOverrideField('price', 'legacy-service',
	*     (product, args, context) =>
	*       context.pricingService.getPrice(product.id)
	*   )
	*   .build()
	* ```
	*
	* @example Service ownership transfer
	* ```typescript
	* // Taking over user profile management from auth service
	* const userEntity = createEntityBuilder('User', UserSchema, ['id'])
	*   .withOverrideField('profile', 'auth-service', resolveUserProfile)
	*   .withOverrideField('preferences', 'auth-service', resolveUserPreferences)
	*   .build()
	* ```
	*
	* @param field - Field name to override
	* @param fromSubgraph - Name of the subgraph being overridden (cannot be empty)
	* @param resolver - Custom resolver implementing the override logic (required)
	* @returns New builder instance with the override directive applied
	* @throws Error if fromSubgraph is empty
	* @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#override | @override Directive}
	*/
	withOverrideField(field, fromSubgraph, resolver) {
		if (!fromSubgraph?.trim()) throw new Error("fromSubgraph cannot be empty");
		return this.addDirective(field, {
			type: "@override",
			args: { from: fromSubgraph }
		}, resolver);
	}
	/**
	* Marks field as @external - Field is defined in another subgraph but needed locally
	*
	* The @external directive indicates that a field is not resolved by the current subgraph
	* but is defined elsewhere and needed for federation operations like @requires and @provides.
	* External fields are typically used as dependencies for computed fields.
	*
	* @example Using external field as dependency
	* ```typescript
	* const entity = createEntityBuilder('Order', OrderSchema, ['id'])
	*   .withExternalField('userId')      // Defined in user service
	*   .withExternalField('productId')   // Defined in product service
	*   .withRequiredFields('total', 'userId productId', calculateOrderTotal)
	*   .build()
	* ```
	*
	* @example Complex federation with external dependencies
	* ```typescript
	* const entity = createEntityBuilder('Review', ReviewSchema, ['id'])
	*   .withExternalField('productName')     // From product service
	*   .withExternalField('userName')        // From user service
	*   .withProvidedFields('summary', 'productName userName', generateSummary)
	*   .build()
	* ```
	*
	* @param field - Field name to mark as external (must exist in schema)
	* @returns New builder instance with the external directive applied
	* @see {@link https://www.apollographql.com/docs/federation/federated-types/federated-directives/#external | @external Directive}
	*/
	withExternalField(field) {
		return this.addDirective(field, { type: "@external" });
	}
	/**
	* Marks field with @requires - Field requires specific fields from base type
	*/
	withRequiredFields(field, requiredFields, resolver) {
		if (!requiredFields?.trim()) throw new Error("Required fields specification cannot be empty");
		return this.addDirective(field, {
			type: "@requires",
			args: { fields: requiredFields }
		}, resolver);
	}
	/**
	* Marks field with @provides - Field provides specific fields to base type
	*/
	withProvidedFields(field, providedFields, resolver) {
		if (!providedFields?.trim()) throw new Error("Provided fields specification cannot be empty");
		return this.addDirective(field, {
			type: "@provides",
			args: { fields: providedFields }
		}, resolver);
	}
	/**
	* Add a custom field resolver without directives
	*/
	withField(field, resolver) {
		return new FederationEntityBuilder(this.typename, this.schema, this.keyFields, this.directiveMap, {
			...this.fieldResolvers,
			[field]: resolver
		}, this.referenceResolver, this.extensions);
	}
	/**
	* Set the reference resolver for entity resolution
	*/
	withReferenceResolver(resolver) {
		return new FederationEntityBuilder(this.typename, this.schema, this.keyFields, this.directiveMap, this.fieldResolvers, resolver, this.extensions);
	}
	/**
	* Add extension metadata to the entity
	*/
	withExtensions(extensions) {
		return new FederationEntityBuilder(this.typename, this.schema, this.keyFields, this.directiveMap, this.fieldResolvers, this.referenceResolver, {
			...this.extensions,
			...extensions
		});
	}
	/**
	* Internal method to add directives with validation
	*/
	addDirective(field, directive, resolver) {
		this.validateDirectiveConflicts(field, directive);
		const existingDirectives = this.directiveMap[field] ?? [];
		const newDirectiveMap = {
			...this.directiveMap,
			[field]: [...existingDirectives, directive]
		};
		const newFieldResolvers = resolver ? {
			...this.fieldResolvers,
			[field]: resolver
		} : this.fieldResolvers;
		return new FederationEntityBuilder(this.typename, this.schema, this.keyFields, newDirectiveMap, newFieldResolvers, this.referenceResolver, this.extensions);
	}
	/**
	* Validate directive conflicts and usage rules
	*/
	validateDirectiveConflicts(field, newDirective) {
		const existingDirectives = this.directiveMap[field] ?? [];
		const conflicts = [
			["@shareable", "@override"],
			["@inaccessible", "@shareable"],
			["@external", "@override"]
		];
		for (const [dir1, dir2] of conflicts) {
			const hasFirst = existingDirectives.some((d) => d.type === dir1) || newDirective.type === dir1;
			const hasSecond = existingDirectives.some((d) => d.type === dir2) || newDirective.type === dir2;
			if (hasFirst && hasSecond) throw new Error(`Conflicting directives: ${dir1} and ${dir2} cannot be used together on field ${field}`);
		}
		if (existingDirectives.some((d) => d.type === newDirective.type)) throw new Error(`Directive ${newDirective.type} is already applied to field ${field}`);
	}
	/**
	* Build the complete federation entity with Effect-based resolution
	*/
	build() {
		return pipe(this.validateBuildRequirements(), Effect.flatMap(() => this.createFederationEntity()));
	}
	/**
	* Validate that all required components are present for building
	*/
	validateBuildRequirements() {
		const hasFederationDirectives = Object.values(this.directiveMap).some((directives) => directives.some((d) => [
			"@key",
			"@requires",
			"@provides",
			"@external"
		].includes(d.type)));
		if (hasFederationDirectives && !this.referenceResolver) return Effect.fail(ErrorFactory.validation("Reference resolver is required for entities with federation directives", "referenceResolver"));
		for (const [field, directives] of Object.entries(this.directiveMap)) {
			const hasOverride = directives.some((d) => d.type === "@override");
			if (hasOverride && !this.fieldResolvers[field]) return Effect.fail(ErrorFactory.validation(`Override field '${field}' requires a resolver`, "fieldResolver", field));
		}
		return Effect.succeed(void 0);
	}
	/**
	* Create the federation entity instance
	*/
	createFederationEntity() {
		const directives = Object.entries(this.directiveMap).flatMap(([fieldName, fieldDirectives]) => fieldDirectives.map((directive) => ({
			name: directive.type.replace("@", ""),
			args: directive.args ?? {},
			applicableFields: [fieldName]
		})));
		const keys = this.keyFields.map((field) => ({
			field: String(field),
			type: {},
			isComposite: this.keyFields.length > 1
		}));
		const metadata = {
			typename: this.typename,
			version: "2.0.0",
			createdAt: /* @__PURE__ */ new Date(),
			validationLevel: "strict",
			dependencies: []
		};
		const resolvers = {};
		for (const [fieldName, resolver] of Object.entries(this.fieldResolvers)) if (typeof resolver === "function") resolvers[fieldName] = (source, args, context, info$1) => Effect.gen(function* () {
			const result = yield* Effect.try({
				try: () => resolver(source, args, context, info$1),
				catch: (error$1) => ErrorFactory.fieldResolution(`Field resolution failed for ${fieldName}: ${String(error$1)}`)
			});
			return result;
		});
		const entity = {
			typename: this.typename,
			schema: this.schema,
			keys,
			directives,
			resolvers,
			metadata,
			key: keys.map((k) => k.field)
		};
		return Effect.succeed(entity);
	}
	/**
	* Validate entity reference using key fields
	*/
	validateReference(reference) {
		return pipe(Effect.succeed(this.keyFields), Effect.flatMap((keys) => Effect.all(keys.map((key) => typeof reference === "object" && reference !== null && key in reference && reference[key] !== void 0 ? Effect.succeed(reference[key]) : Effect.fail(ErrorFactory.validation(`Missing key field: ${String(key)}`, String(key)))))), Effect.map(() => reference));
	}
	/**
	* Create a default reference resolver that validates key fields
	*/
	createDefaultReferenceResolver() {
		return (reference, context, info$1) => pipe(this.validateReference(reference), Effect.flatMap((validRef) => this.resolveEntityFromReference(validRef, context, info$1)), Effect.catchAll((error$1) => Effect.fail(ErrorFactory.entityResolution(`Failed to resolve ${this.typename} entity`, this.typename, String(reference), error$1))));
	}
	/**
	* Template method for entity resolution - can be overridden by subclasses
	*/
	resolveEntityFromReference(reference, _context, _info) {
		return Effect.succeed(reference);
	}
};
/**
* Factory function for creating entity builders with proper type inference
*/
const createEntityBuilder = (typename, schema, keyFields) => {
	return new FederationEntityBuilder(typename, schema, keyFields);
};
/**
* Convert ValidatedEntity to FederationEntity for compatibility
*/
const toFederationEntity = (validatedEntity, referenceResolver) => {
	const directivesMap = {};
	for (const directive of validatedEntity.directives) if (directive.applicableFields) for (const field of directive.applicableFields) {
		const directiveType = `@${directive.name}`;
		directivesMap[field] = [...directivesMap[field] ?? [], {
			type: directiveType,
			args: directive.args
		}];
	}
	const directives = Object.keys(directivesMap).length > 0 ? Object.fromEntries(Object.entries(directivesMap).map(([key, value]) => [key, value])) : {};
	return {
		typename: validatedEntity.typename,
		key: validatedEntity.key,
		schema: validatedEntity.schema,
		resolveReference: referenceResolver ?? (() => Effect.succeed({})),
		fields: void 0,
		directives: Object.keys(directives).length > 0 ? directives : void 0,
		extensions: void 0
	};
};

//#endregion
//#region src/runtime/effect/services/config.ts
/**
* Federation Framework configuration schema with comprehensive validation
*
* Defines the complete configuration structure for federated GraphQL services,
* including server settings, database connections, caching, resilience patterns,
* and observability features.
*
* @example Minimal configuration
* ```typescript
* const minimalConfig = {
*   server: { port: 4000, host: 'localhost', cors: { enabled: false, origins: [] } },
*   federation: { introspection: true, playground: true, subscriptions: false, tracing: false },
*   database: { url: 'postgresql://localhost:5432/test', maxConnections: 5, connectionTimeout: '10s' },
*   cache: { redis: { url: 'redis://localhost:6379', keyPrefix: 'test:', defaultTtl: '5m' } },
*   resilience: { circuitBreaker: { failureThreshold: 3, resetTimeout: '10s', halfOpenMaxCalls: 1 } },
*   observability: {
*     metrics: { enabled: false, port: 9090 },
*     tracing: { enabled: false, serviceName: 'test', endpoint: 'http://localhost:14268/api/traces' }
*   }
* }
* ```
*
* @category Core Services
*/
const FederationConfigSchema = Schema.Struct({
	server: Schema.Struct({
		port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),
		host: Schema.String,
		cors: Schema.Struct({
			enabled: Schema.Boolean,
			origins: Schema.Array(Schema.String)
		})
	}),
	federation: Schema.Struct({
		introspection: Schema.Boolean,
		playground: Schema.Boolean,
		subscriptions: Schema.Boolean,
		tracing: Schema.Boolean
	}),
	database: Schema.Struct({
		url: Schema.String,
		maxConnections: Schema.Number.pipe(Schema.int(), Schema.positive()),
		connectionTimeout: Schema.String
	}),
	cache: Schema.Struct({ redis: Schema.Struct({
		url: Schema.String,
		keyPrefix: Schema.String,
		defaultTtl: Schema.String
	}) }),
	resilience: Schema.Struct({ circuitBreaker: Schema.Struct({
		failureThreshold: Schema.Number.pipe(Schema.int(), Schema.positive()),
		resetTimeout: Schema.String,
		halfOpenMaxCalls: Schema.Number.pipe(Schema.int(), Schema.positive())
	}) }),
	observability: Schema.Struct({
		metrics: Schema.Struct({
			enabled: Schema.Boolean,
			port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535))
		}),
		tracing: Schema.Struct({
			enabled: Schema.Boolean,
			serviceName: Schema.String,
			endpoint: Schema.String
		})
	})
});
var FederationConfigService = class extends Context.Tag("FederationConfigService")() {};
const defaultConfig = {
	server: {
		port: 4e3,
		host: "0.0.0.0",
		cors: {
			enabled: true,
			origins: ["*"]
		}
	},
	federation: {
		introspection: true,
		playground: true,
		subscriptions: false,
		tracing: true
	},
	database: {
		url: "postgresql://localhost:5432/federation",
		maxConnections: 10,
		connectionTimeout: "30s"
	},
	cache: { redis: {
		url: "redis://localhost:6379",
		keyPrefix: "federation:",
		defaultTtl: "15m"
	} },
	resilience: { circuitBreaker: {
		failureThreshold: 5,
		resetTimeout: "30s",
		halfOpenMaxCalls: 3
	} },
	observability: {
		metrics: {
			enabled: true,
			port: 9090
		},
		tracing: {
			enabled: true,
			serviceName: "federation",
			endpoint: "http://localhost:14268/api/traces"
		}
	}
};
const load = Effect$1.gen(function* () {
	const config = {
		server: {
			port: yield* Config.integer("SERVER_PORT").pipe(Config.withDefault(defaultConfig.server.port)),
			host: yield* Config.string("SERVER_HOST").pipe(Config.withDefault(defaultConfig.server.host)),
			cors: {
				enabled: yield* Config.boolean("CORS_ENABLED").pipe(Config.withDefault(defaultConfig.server.cors.enabled)),
				origins: yield* Config.array(Config.string(), "CORS_ORIGINS").pipe(Config.withDefault(defaultConfig.server.cors.origins))
			}
		},
		federation: {
			introspection: yield* Config.boolean("FEDERATION_INTROSPECTION").pipe(Config.withDefault(defaultConfig.federation.introspection)),
			playground: yield* Config.boolean("FEDERATION_PLAYGROUND").pipe(Config.withDefault(defaultConfig.federation.playground)),
			subscriptions: yield* Config.boolean("FEDERATION_SUBSCRIPTIONS").pipe(Config.withDefault(defaultConfig.federation.subscriptions)),
			tracing: yield* Config.boolean("FEDERATION_TRACING").pipe(Config.withDefault(defaultConfig.federation.tracing))
		},
		database: {
			url: yield* Config.string("DATABASE_URL").pipe(Config.withDefault(defaultConfig.database.url)),
			maxConnections: yield* Config.integer("DATABASE_MAX_CONNECTIONS").pipe(Config.withDefault(defaultConfig.database.maxConnections)),
			connectionTimeout: yield* Config.string("DATABASE_CONNECTION_TIMEOUT").pipe(Config.withDefault(defaultConfig.database.connectionTimeout))
		},
		cache: { redis: {
			url: yield* Config.string("REDIS_URL").pipe(Config.withDefault(defaultConfig.cache.redis.url)),
			keyPrefix: yield* Config.string("REDIS_KEY_PREFIX").pipe(Config.withDefault(defaultConfig.cache.redis.keyPrefix)),
			defaultTtl: yield* Config.string("REDIS_DEFAULT_TTL").pipe(Config.withDefault(defaultConfig.cache.redis.defaultTtl))
		} },
		resilience: { circuitBreaker: {
			failureThreshold: yield* Config.integer("CIRCUIT_BREAKER_FAILURE_THRESHOLD").pipe(Config.withDefault(defaultConfig.resilience.circuitBreaker.failureThreshold)),
			resetTimeout: yield* Config.string("CIRCUIT_BREAKER_RESET_TIMEOUT").pipe(Config.withDefault(defaultConfig.resilience.circuitBreaker.resetTimeout)),
			halfOpenMaxCalls: yield* Config.integer("CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS").pipe(Config.withDefault(defaultConfig.resilience.circuitBreaker.halfOpenMaxCalls))
		} },
		observability: {
			metrics: {
				enabled: yield* Config.boolean("METRICS_ENABLED").pipe(Config.withDefault(defaultConfig.observability.metrics.enabled)),
				port: yield* Config.integer("METRICS_PORT").pipe(Config.withDefault(defaultConfig.observability.metrics.port))
			},
			tracing: {
				enabled: yield* Config.boolean("TRACING_ENABLED").pipe(Config.withDefault(defaultConfig.observability.tracing.enabled)),
				serviceName: yield* Config.string("TRACING_SERVICE_NAME").pipe(Config.withDefault(defaultConfig.observability.tracing.serviceName)),
				endpoint: yield* Config.string("TRACING_ENDPOINT").pipe(Config.withDefault(defaultConfig.observability.tracing.endpoint))
			}
		}
	};
	return yield* Schema.decodeUnknown(FederationConfigSchema)(config);
});
const FederationConfigLive = Layer.effect(FederationConfigService, load);
const getServerConfig = Effect$1.map(FederationConfigService, (config) => config.server);
const getFederationConfig = Effect$1.map(FederationConfigService, (config) => config.federation);
const getDatabaseConfig = Effect$1.map(FederationConfigService, (config) => config.database);
const getCacheConfig = Effect$1.map(FederationConfigService, (config) => config.cache);
const getResilienceConfig = Effect$1.map(FederationConfigService, (config) => config.resilience);
const getObservabilityConfig = Effect$1.map(FederationConfigService, (config) => config.observability);

//#endregion
//#region src/runtime/effect/services/logger.ts
var FederationLogger = class extends Context.Tag("FederationLogger")() {};
const make = Effect$1.gen(function* () {
	yield* Effect$1.log("Hello, world!");
	const logWithLevel = (level) => (message, meta = {}) => Effect$1.logWithLevel(level, message, meta);
	return {
		trace: logWithLevel(LogLevel.Trace),
		debug: logWithLevel(LogLevel.Debug),
		info: logWithLevel(LogLevel.Info),
		warn: logWithLevel(LogLevel.Warning),
		error: logWithLevel(LogLevel.Error),
		withSpan: (name, effect) => Effect$1.withSpan(effect, name, { attributes: { service: "federation" } })
	};
});
const FederationLoggerLive = Layer.effect(FederationLogger, make);
const trace = (message, meta) => Effect$1.flatMap(FederationLogger, (logger) => logger.trace(message, meta));
const debug = (message, meta) => Effect$1.flatMap(FederationLogger, (logger) => logger.debug(message, meta));
const info = (message, meta) => Effect$1.flatMap(FederationLogger, (logger) => logger.info(message, meta));
const warn = (message, meta) => Effect$1.flatMap(FederationLogger, (logger) => logger.warn(message, meta));
const error = (message, meta) => Effect$1.flatMap(FederationLogger, (logger) => logger.error(message, meta));
const withSpan = (name, effect) => Effect$1.flatMap(FederationLogger, (logger) => logger.withSpan(name, effect));
const developmentLogger = Layer.merge(FederationLoggerLive, Logger.minimumLogLevel(LogLevel.Debug));
const productionLogger = Layer.merge(FederationLoggerLive, Logger.minimumLogLevel(LogLevel.Info));
const testLogger = Layer.merge(FederationLoggerLive, Logger.minimumLogLevel(LogLevel.Warning));

//#endregion
export { FederationConfigLive, FederationConfigSchema, FederationConfigService, FederationEntityBuilder, FederationLogger, FederationLoggerLive, createEntityBuilder, debug, developmentLogger, error, getCacheConfig, getDatabaseConfig, getFederationConfig, getObservabilityConfig, getResilienceConfig, getServerConfig, info, productionLogger, testLogger, toFederationEntity, trace, warn, withSpan };
//# sourceMappingURL=logger-DxgpqaV1.js.map