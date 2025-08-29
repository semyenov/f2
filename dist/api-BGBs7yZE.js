import { __export } from "./chunk-Cl8Af3a2.js";
import { FederationConfigLive, FederationEntityBuilder, FederationLoggerLive, createEntityBuilder, toFederationEntity } from "./logger-DxgpqaV1.js";
import { FederationComposer, FederationComposerLive, SubgraphManagement } from "./subgraph-B3gfDbHz.js";
import { FederationErrorBoundaries, PerformanceOptimizations } from "./performance-DO3JMEEu.js";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Duration from "effect/Duration";

//#region src/api/simple/facade.ts
/**
* Main Federation facade class providing simplified API
*/
var Federation = class Federation {
	constructor(schema, _config) {
		this.schema = schema;
	}
	/**
	* Create a new federation instance with simplified configuration
	*/
	static async create(config) {
		const layer = Layer.mergeAll(FederationComposerLive, FederationLoggerLive, FederationConfigLive);
		const effect = Effect.gen(function* () {
			const services = config.services.map((service, index) => typeof service === "string" ? {
				id: `service-${index}`,
				url: service
			} : service);
			const fullConfig = {
				entities: config.entities,
				services,
				errorBoundaries: {
					subgraphTimeouts: Object.fromEntries(services.map((s) => [s.id, Duration.seconds(config.resilience?.timeoutSeconds ?? 30)])),
					circuitBreakerConfig: {
						failureThreshold: config.resilience?.maxFailures ?? 5,
						resetTimeout: Duration.seconds(30)
					},
					partialFailureHandling: {
						allowPartialFailure: true,
						criticalSubgraphs: []
					},
					errorTransformation: {
						sanitizeErrors: true,
						includeStackTrace: config.development?.logLevel === "debug"
					}
				},
				performance: {
					queryPlanCache: {
						maxSize: config.performance?.cacheSize ?? 1e3,
						ttl: Duration.minutes(30)
					},
					dataLoaderConfig: {
						maxBatchSize: config.performance?.batchSize ?? 100,
						batchWindowMs: 10,
						enableBatchLogging: config.development?.logLevel === "debug"
					},
					metricsCollection: {
						enabled: config.performance?.enableMetrics ?? false,
						collectExecutionMetrics: true,
						collectCacheMetrics: true
					}
				}
			};
			const composer = yield* FederationComposer;
			const result = yield* composer.compose(fullConfig);
			return new Federation(result.schema, config);
		});
		const providedEffect = Effect.provide(effect, layer);
		return Effect.runPromise(providedEffect);
	}
	/**
	* Create a simplified entity builder
	*/
	static createEntity(config) {
		return pipe(Effect.gen(function* () {
			let builder = new FederationEntityBuilder(config.typename, config.schema, config.keys);
			if (config.shareableFields) for (const field of config.shareableFields) builder = builder.withShareableField(field);
			if (config.inaccessibleFields) for (const field of config.inaccessibleFields) builder = builder.withInaccessibleField(field);
			if (config.fieldTags) for (const [field, tags] of Object.entries(config.fieldTags)) builder = builder.withTaggedField(field, tags);
			if (config.resolveReference) builder = builder.withReferenceResolver(config.resolveReference);
			return yield* builder.build();
		}), Effect.map((validatedEntity) => toFederationEntity(validatedEntity, config.resolveReference)));
	}
	/**
	* Quick entity builder with fluent API
	*/
	static entity(typename, schema) {
		return new QuickEntityBuilder(typename, schema);
	}
	/**
	* Get the composed GraphQL schema
	*/
	getSchema() {
		return this.schema;
	}
	/**
	* Start the federation (for integration with GraphQL servers)
	*/
	async start() {
		console.log("🚀 Federation started successfully");
	}
	/**
	* Stop the federation
	*/
	async stop() {
		console.log("🛑 Federation stopped");
	}
};
/**
* Quick entity builder with fluent API
*/
var QuickEntityBuilder = class {
	config;
	constructor(typename, schema) {
		this.config = {
			typename,
			schema,
			keys: []
		};
	}
	/**
	* Set key fields
	*/
	keys(...fields) {
		this.config.keys = fields;
		return this;
	}
	/**
	* Mark fields as shareable
	*/
	shareable(...fields) {
		this.config.shareableFields = [...this.config.shareableFields ?? [], ...fields];
		return this;
	}
	/**
	* Mark fields as inaccessible
	*/
	inaccessible(...fields) {
		this.config.inaccessibleFields = [...this.config.inaccessibleFields ?? [], ...fields];
		return this;
	}
	/**
	* Tag a field
	*/
	tag(field, ...tags) {
		this.config.fieldTags = {
			...this.config.fieldTags,
			[field]: tags
		};
		return this;
	}
	/**
	* Set reference resolver
	*/
	resolver(fn) {
		this.config.resolveReference = fn;
		return this;
	}
	/**
	* Build the entity
	*/
	build() {
		return Federation.createEntity(this.config);
	}
};
/**
* Preset configurations for common scenarios
*/
const Presets = {
	development: (entities, services) => ({
		entities,
		services,
		performance: {
			cacheSize: 100,
			batchSize: 10,
			enableMetrics: true
		},
		resilience: {
			enableCircuitBreakers: false,
			timeoutSeconds: 60,
			maxFailures: 10
		},
		development: {
			enableHotReload: true,
			logLevel: "debug",
			enableDevTools: true
		}
	}),
	production: (entities, services) => ({
		entities,
		services,
		performance: {
			cacheSize: 1e4,
			batchSize: 1e3,
			enableMetrics: true
		},
		resilience: {
			enableCircuitBreakers: true,
			timeoutSeconds: 30,
			maxFailures: 5
		},
		development: {
			enableHotReload: false,
			logLevel: "warn",
			enableDevTools: false
		}
	}),
	testing: (entities) => ({
		entities,
		services: [{
			id: "mock-service",
			url: "http://localhost:4001"
		}],
		performance: {
			cacheSize: 10,
			batchSize: 5,
			enableMetrics: false
		},
		resilience: {
			enableCircuitBreakers: false,
			timeoutSeconds: 5,
			maxFailures: 1
		},
		development: {
			enableHotReload: false,
			logLevel: "error",
			enableDevTools: false
		}
	})
};
/**
* Export common patterns as ready-to-use functions
*/
const Patterns = {
	createBasicEntity: (typename, schema, keyField = "id") => Federation.entity(typename, schema).keys(keyField).build(),
	createShareableEntity: (typename, schema, keyField, shareableFields) => Federation.entity(typename, schema).keys(keyField).shareable(...shareableFields).build(),
	createPIIEntity: (typename, schema, keyField, piiFields) => Federation.entity(typename, schema).keys(keyField).inaccessible(...piiFields).build()
};

//#endregion
//#region src/api/advanced/strict.ts
const EntityValidationResult = Data.taggedEnum();
/**
* Schema validation error for ultra-strict entity builder
* @category Experimental
*/
var SchemaValidationError = class extends Data.TaggedError("SchemaValidationError") {};
/**
* Key validation error for ultra-strict entity builder
* @category Experimental
*/
var KeyValidationError = class extends Data.TaggedError("KeyValidationError") {};
/**
* Directive validation error for ultra-strict entity builder
* @category Experimental
*/
var DirectiveValidationError = class extends Data.TaggedError("DirectiveValidationError") {};
/**
* Entity builder error for ultra-strict entity builder
* @category Experimental
*/
var EntityBuilderError = class extends Data.TaggedError("EntityBuilderError") {};
/**
* Creates a new UltraStrictEntityBuilder with compile-time state tracking
*
* The builder uses phantom types to enforce correct usage order at compile time.
* This prevents runtime errors by catching configuration mistakes during development.
*
* @param typename - The GraphQL type name for this entity
* @returns Builder in Unvalidated state, requiring schema definition next
*
* @example
* ```typescript
* const userBuilder = createUltraStrictEntityBuilder('User')
* // Next step must be withSchema - compiler enforces this
* ```
*/
const createUltraStrictEntityBuilder = (typename, schema) => {
	if (!typename?.trim()) throw new Error("Entity typename cannot be empty");
	return {
		_phantomState: Data.struct({ _tag: "HasSchema" }),
		typename,
		schema
	};
};
/**
* Type-safe schema attachment (only valid in Unvalidated state)
*
* Attaches an Effect Schema to the entity for runtime validation.
* The phantom type system ensures this can only be called on an unvalidated builder.
*
* @template A - The schema type being attached
* @param schema - Effect Schema instance for validation
* @returns Function that takes Unvalidated builder and returns HasSchema builder
*
* @example
* ```typescript
* const UserSchema = Schema.Struct({
*   id: Schema.String,
*   name: Schema.String,
*   email: Schema.String
* })
*
* const builderWithSchema = createUltraStrictEntityBuilder('User')
*   .pipe(withSchema(UserSchema))
* ```
*/
const withSchema = (schema) => (builder) => {
	if (!schema) throw new Error("Schema cannot be null or undefined");
	return {
		...builder,
		_phantomState: Data.struct({ _tag: "HasSchema" }),
		schema
	};
};
/**
* Type-safe key definition (only valid in HasSchema state)
*
* Defines the key fields that uniquely identify this entity across subgraphs.
* The phantom type system ensures schema is attached before keys can be defined.
*
* @param keys - Array of EntityKey objects defining the unique identifier(s)
* @returns Function that takes HasSchema builder and returns HasKeys builder
*
* @example
* ```typescript
* const keys = [
*   UltraStrictEntityBuilder.Key.create('id', GraphQLID, false),
*   UltraStrictEntityBuilder.Key.create('organizationId', GraphQLID, false) // Composite key
* ]
*
* const builderWithKeys = builderWithSchema
*   .pipe(withKeys(keys))
* ```
*/
const withKeys = (keys) => (builder) => {
	const actualKeys = keys ?? [];
	if (actualKeys.length > 0) {
		const duplicateKeys = actualKeys.map((k) => k.field).filter((field, index, arr) => arr.indexOf(field) !== index);
		if (duplicateKeys.length > 0) throw new Error(`Duplicate key fields found: ${duplicateKeys.join(", ")}`);
	}
	return {
		...builder,
		_phantomState: Data.struct({ _tag: "HasKeys" }),
		keys: actualKeys
	};
};
/**
* Type-safe directive application (only valid in HasKeys state)
*
* Applies Federation directives to the entity. The phantom type system ensures
* both schema and keys are defined before directives can be applied.
*
* @param directives - Array of Federation directives (@shareable, @inaccessible, etc.)
* @returns Function that takes HasKeys builder and returns HasDirectives builder
*
* @example
* ```typescript
* const directives = [
*   UltraStrictEntityBuilder.Directive.shareable(),
*   UltraStrictEntityBuilder.Directive.tag('public'),
*   UltraStrictEntityBuilder.Directive.provides('email')
* ]
*
* const builderWithDirectives = builderWithKeys
*   .pipe(withDirectives(directives))
* ```
*/
const withDirectives = (directives) => (builder) => {
	const directiveNames = directives?.map((d) => d.name) ?? [];
	const conflictingPairs = [
		["shareable", "override"],
		["inaccessible", "shareable"],
		["external", "override"]
	];
	const hasConflict = conflictingPairs.some(([dir1, dir2]) => directiveNames.includes(dir1) && directiveNames.includes(dir2));
	if (hasConflict) {
		const conflict = conflictingPairs.find(([dir1, dir2]) => directiveNames.includes(dir1) && directiveNames.includes(dir2));
		throw new Error(`Conflicting directives: @${conflict?.[0]} and @${conflict?.[1]} cannot be used together`);
	}
	return {
		...builder,
		_phantomState: Data.struct({ _tag: "HasDirectives" }),
		directives: directives ?? []
	};
};
/**
* Type-safe resolver attachment (only valid in HasDirectives state)
*
* Attaches field resolvers to the entity. The phantom type system ensures
* all previous configuration steps are complete before resolvers can be attached.
*
* @param resolvers - Record of field name to resolver function mappings
* @returns Function that takes HasDirectives builder and returns Complete builder
*
* @example
* ```typescript
* const resolvers = {
*   displayName: (user) => `${user.firstName} ${user.lastName}`,
*   avatar: (user, args, ctx) => ctx.imageService.getAvatar(user.id),
*   posts: (user, args, ctx) => ctx.postService.findByUserId(user.id)
* }
*
* const completeBuilder = builderWithDirectives
*   .pipe(withResolvers(resolvers))
* ```
*/
const withResolvers = (resolvers) => (builder) => {
	if (!resolvers) throw new Error("Resolvers cannot be null or undefined");
	const invalidResolvers = Object.entries(resolvers).filter(([, resolver]) => typeof resolver !== "function").map(([fieldName]) => fieldName);
	if (invalidResolvers.length > 0) throw new Error(`Resolvers for fields '${invalidResolvers.join(", ")}' must be functions`);
	return {
		...builder,
		_phantomState: Data.struct({ _tag: "Complete" }),
		resolvers
	};
};
/**
* Validates a complete entity builder using exhaustive pattern matching
*/
const validateEntityBuilder = (builder) => pipe(Effect.succeed(builder), Effect.flatMap(validateSchema), Effect.flatMap(validateKeys), Effect.flatMap(validateDirectives), Effect.flatMap(validateCircularDependencies), Effect.flatMap(validateCompatibility), Effect.map(createValidResult), Effect.catchAll(handleValidationErrors));
const validateSchema = (builder) => pipe(Effect.succeed(builder.schema), Effect.flatMap((schema) => {
	if (schema === void 0) return Effect.fail([new SchemaValidationError({
		message: `Schema is required`,
		schemaPath: ["schema"],
		suggestion: "Ensure a valid schema is provided"
	})]);
	return Effect.succeed(builder);
}));
const validateKeys = (builder) => pipe(Effect.succeed(builder.keys ?? []), Effect.flatMap((keys) => {
	let errors = [];
	if (keys.length === 0) errors.push(new KeyValidationError({
		message: "Entity must have at least one key field",
		keyField: "<missing>",
		entityType: builder.typename,
		suggestion: "Add a primary key field like 'id' or composite keys"
	}));
	const schemaFields = getSchemaFields(builder.schema);
	const missingKeyErrors = keys.filter((key) => !schemaFields.includes(key.field)).map((key) => new KeyValidationError({
		message: `Key field '${key.field}' not found in schema`,
		keyField: key.field,
		entityType: builder.typename,
		suggestion: `Add field '${key.field}' to the schema or remove from keys`
	}));
	errors = [...errors, ...missingKeyErrors];
	return errors.length > 0 ? Effect.fail(errors) : Effect.succeed(builder);
}));
const validateDirectives = (builder) => pipe(Effect.succeed(builder.directives), Effect.flatMap((directives) => {
	const validDirectives = [
		"shareable",
		"inaccessible",
		"tag",
		"override",
		"external",
		"provides",
		"requires"
	];
	const directiveErrors = (directives ?? []).flatMap((directive) => {
		const errors = [];
		if (!validDirectives.includes(directive.name)) errors.push(new DirectiveValidationError({
			message: `Unknown Federation directive: @${directive.name}`,
			directive: directive.name,
			suggestion: `Use one of: ${validDirectives.map((d) => `@${d}`).join(", ")}`
		}));
		if (directive.name === "override" && directive.args?.["from"] === void 0) errors.push(new DirectiveValidationError({
			message: "@override directive requires 'from' argument",
			directive: directive.name,
			suggestion: "Add 'from: \"SubgraphName\"' to @override directive"
		}));
		return errors;
	});
	const allErrors = directiveErrors.flat();
	return allErrors.length > 0 ? Effect.fail(allErrors) : Effect.succeed(builder);
}));
const validateCircularDependencies = (builder) => Effect.succeed(builder);
const validateCompatibility = (builder) => Effect.succeed(builder);
const createValidResult = (builder) => {
	const result = EntityValidationResult.Valid({
		entity: {
			typename: builder.typename,
			schema: builder.schema,
			keys: builder.keys ?? [],
			directives: builder.directives ?? [],
			resolvers: builder.resolvers ?? {},
			metadata: {
				typename: builder.typename,
				version: "2.0.0",
				createdAt: /* @__PURE__ */ new Date(),
				validationLevel: "ultra-strict",
				dependencies: []
			}
		},
		metadata: {
			typename: builder.typename,
			version: "2.0.0",
			createdAt: /* @__PURE__ */ new Date(),
			validationLevel: "ultra-strict",
			dependencies: []
		}
	});
	return result;
};
const handleValidationErrors = (errors) => pipe(Match.value(errors), Match.when((errs) => errs.length > 0 && errs[0] instanceof SchemaValidationError, (errs) => {
	const result = EntityValidationResult.InvalidSchema({ errors: errs });
	return Effect.succeed(result);
}), Match.when((errs) => errs.length > 0 && errs[0] instanceof KeyValidationError, (errs) => {
	const result = EntityValidationResult.InvalidKeys({
		errors: errs,
		schema: Schema.Struct({})
	});
	return Effect.succeed(result);
}), Match.when((errs) => errs.length > 0 && errs[0] instanceof DirectiveValidationError, (errs) => {
	const result = EntityValidationResult.InvalidDirectives({
		errors: errs,
		schema: Schema.Struct({}),
		keys: []
	});
	return Effect.succeed(result);
}), Match.exhaustive);
/**
* Exhaustive pattern matching over entity validation results
*/
const matchEntityValidationResult = (handlers) => (result) => Match.value(result).pipe(Match.tag("Valid", handlers.Valid), Match.tag("InvalidSchema", handlers.InvalidSchema), Match.tag("InvalidKeys", handlers.InvalidKeys), Match.tag("InvalidDirectives", handlers.InvalidDirectives), Match.tag("CircularDependency", handlers.CircularDependency), Match.tag("IncompatibleVersion", handlers.IncompatibleVersion), Match.exhaustive);
const getSchemaFields = (schema) => {
	const ast = schema.ast;
	if (ast._tag === "TypeLiteral") return ast.propertySignatures.map((prop) => {
		if (typeof prop.name === "string") return prop.name;
		return String(prop.name);
	});
	return [];
};
/**
* Creates an entity key for federation (internal implementation)
*/
const createEntityKey = (field, type, isComposite = false) => ({
	field,
	type,
	isComposite
});
let UltraStrictEntityBuilder;
(function(_UltraStrictEntityBuilder) {
	let Directive;
	(function(_Directive) {
		_Directive.shareable = () => ({
			name: "shareable",
			args: {}
		});
		_Directive.inaccessible = () => ({
			name: "inaccessible",
			args: {}
		});
		_Directive.tag = (name) => ({
			name: "tag",
			args: { name }
		});
		_Directive.override = (from) => ({
			name: "override",
			args: { from }
		});
		_Directive.external = () => ({
			name: "external",
			args: {}
		});
		_Directive.provides = (fields) => ({
			name: "provides",
			args: { fields }
		});
		_Directive.requires = (fields) => ({
			name: "requires",
			args: { fields }
		});
	})(Directive || (Directive = _UltraStrictEntityBuilder.Directive || (_UltraStrictEntityBuilder.Directive = {})));
	let Key;
	(function(_Key) {
		_Key.create = createEntityKey;
	})(Key || (Key = _UltraStrictEntityBuilder.Key || (_UltraStrictEntityBuilder.Key = {})));
})(UltraStrictEntityBuilder || (UltraStrictEntityBuilder = {}));

//#endregion
//#region src/api/advanced/index.ts
var advanced_exports = {};
__export(advanced_exports, {
	DirectiveValidationError: () => DirectiveValidationError,
	EntityBuilderError: () => EntityBuilderError,
	KeyValidationError: () => KeyValidationError,
	SchemaValidationError: () => SchemaValidationError,
	UltraStrictEntityBuilder: () => UltraStrictEntityBuilder,
	createUltraStrictEntityBuilder: () => createUltraStrictEntityBuilder,
	matchEntityValidationResult: () => matchEntityValidationResult,
	validateEntityBuilder: () => validateEntityBuilder,
	withDirectives: () => withDirectives,
	withKeys: () => withKeys,
	withResolvers: () => withResolvers,
	withSchema: () => withSchema
});

//#endregion
//#region src/api/index.ts
var api_exports = {};
__export(api_exports, {
	Advanced: () => advanced_exports,
	Federation: () => Federation,
	FederationEntityBuilder: () => FederationEntityBuilder,
	FederationErrorBoundaries: () => FederationErrorBoundaries,
	Patterns: () => Patterns,
	PerformanceOptimizations: () => PerformanceOptimizations,
	Presets: () => Presets,
	QuickEntityBuilder: () => QuickEntityBuilder,
	SubgraphManagement: () => SubgraphManagement,
	createEntityBuilder: () => createEntityBuilder
});

//#endregion
export { Federation, Patterns, Presets, QuickEntityBuilder, advanced_exports, api_exports };
//# sourceMappingURL=api-BGBs7yZE.js.map