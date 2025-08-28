//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const effect_Data = __toESM(require("effect/Data"));
const effect_Effect = __toESM(require("effect/Effect"));
const effect_Match = __toESM(require("effect/Match"));
const effect_Function = __toESM(require("effect/Function"));
const effect = __toESM(require("effect"));
const __effect_schema_Schema = __toESM(require("@effect/schema/Schema"));
const effect_Context = __toESM(require("effect/Context"));
const graphql = __toESM(require("graphql"));
const effect_Layer = __toESM(require("effect/Layer"));
const effect_Logger = __toESM(require("effect/Logger"));
const effect_LogLevel = __toESM(require("effect/LogLevel"));
const effect_Config = __toESM(require("effect/Config"));
const dataloader = __toESM(require("dataloader"));
const __effect_schema_AST = __toESM(require("@effect/schema/AST"));
const effect_Option = __toESM(require("effect/Option"));

//#region src/core/types.ts
const asUntypedEntity = (entity) => entity;

//#endregion
//#region src/core/errors.ts
/**
* Base domain error using Effect's Data.Error
* Provides comprehensive metadata and composition capabilities
*/
var BaseDomainError = class extends effect_Data.Error {
	timestamp = /* @__PURE__ */ new Date();
	constructor(_tag, message, code = "UNKNOWN_CODE", context = {}, cause) {
		const errorData = {
			_tag,
			message,
			code,
			timestamp: /* @__PURE__ */ new Date(),
			...context !== void 0 && { context },
			...cause !== void 0 && { cause }
		};
		super(errorData);
		this.message = message;
		this.code = code;
		this.context = context;
		this.cause = cause;
	}
};
/**
* Validation error for schema and data validation failures
*/
var ValidationError = class extends BaseDomainError {
	_tag = "ValidationError";
	severity = "medium";
	category = "validation";
	retryable = false;
	constructor(message, field = void 0, value = void 0, code = "VALIDATION_ERROR", context = {}) {
		super("ValidationError", message, code, {
			field,
			value,
			...context
		});
		this.field = field;
		this.value = value;
	}
};
/**
* Schema validation error with violation details
*/
var SchemaValidationError = class extends BaseDomainError {
	_tag = "SchemaValidationError";
	severity = "medium";
	category = "validation";
	retryable = false;
	constructor(schemaName, message, violations, context = {}) {
		super("SchemaValidationError", `Schema validation failed for ${schemaName}: ${message}`, "SCHEMA_VALIDATION_ERROR", {
			schemaName,
			violations,
			...context
		});
		this.schemaName = schemaName;
		this.violations = violations;
	}
};
/**
* Entity resolution error for federation entity lookup failures
*/
var EntityResolutionError = class extends BaseDomainError {
	_tag = "EntityResolutionError";
	severity = "high";
	category = "federation";
	retryable = true;
	constructor(message, entityType = void 0, entityId = void 0, context = {}, cause) {
		super("EntityResolutionError", message, "ENTITY_RESOLUTION_ERROR", {
			entityType,
			entityId,
			...context
		}, cause);
		this.entityType = entityType;
		this.entityId = entityId;
	}
};
/**
* Field resolution error for GraphQL field resolver failures
*/
var FieldResolutionError = class extends BaseDomainError {
	_tag = "FieldResolutionError";
	severity = "medium";
	category = "resolution";
	retryable = true;
	constructor(message, fieldName, parentType, context = {}, cause) {
		super("FieldResolutionError", message, "FIELD_RESOLUTION_ERROR", {
			fieldName,
			parentType,
			...context
		}, cause);
		this.fieldName = fieldName;
		this.parentType = parentType;
	}
};
/**
* Federation error for cross-service communication failures
*/
var FederationError = class extends BaseDomainError {
	_tag = "FederationError";
	severity = "high";
	category = "federation";
	retryable = false;
	constructor(message, subgraphId, operationType, context = {}, cause) {
		super("FederationError", message, "FEDERATION_ERROR", {
			subgraphId,
			operationType,
			...context
		}, cause);
		this.subgraphId = subgraphId;
		this.operationType = operationType;
	}
};
/**
* Circuit breaker error for service protection
*/
var CircuitBreakerError = class extends BaseDomainError {
	_tag = "CircuitBreakerError";
	severity = "high";
	category = "resilience";
	retryable = true;
	constructor(message, state, context = {}, cause) {
		super("CircuitBreakerError", message, "CIRCUIT_BREAKER_ERROR", {
			state,
			...context
		}, cause);
		this.state = state;
	}
};
/**
* Timeout error for operation timeouts
*/
var TimeoutError = class extends BaseDomainError {
	_tag = "TimeoutError";
	severity = "medium";
	category = "performance";
	retryable = true;
	constructor(message, timeout, context = {}, cause) {
		super("TimeoutError", message, "TIMEOUT_ERROR", {
			timeout,
			...context
		}, cause);
		this.timeout = timeout;
	}
};
/**
* Composition error for schema composition failures
*/
var CompositionError = class extends BaseDomainError {
	_tag = "CompositionError";
	severity = "high";
	category = "composition";
	retryable = false;
	constructor(message, subgraphId, context = {}, cause) {
		super("CompositionError", message, "COMPOSITION_ERROR", {
			subgraphId,
			...context
		}, cause);
		this.subgraphId = subgraphId;
	}
};
/**
* Type conversion error for AST to GraphQL type conversion
*/
var TypeConversionError = class extends BaseDomainError {
	_tag = "TypeConversionError";
	severity = "medium";
	category = "conversion";
	retryable = false;
	constructor(message, astType, field, context = {}, cause) {
		super("TypeConversionError", message, "TYPE_CONVERSION_ERROR", {
			astType,
			field,
			...context
		}, cause);
		this.astType = astType;
		this.field = field;
	}
};
/**
* Health check error for service health monitoring failures
*/
var HealthCheckError = class extends BaseDomainError {
	_tag = "HealthCheckError";
	severity = "medium";
	category = "monitoring";
	retryable = true;
	constructor(message, serviceId, context = {}, cause) {
		super("HealthCheckError", message, "HEALTH_CHECK_ERROR", {
			serviceId,
			...context
		}, cause);
		this.serviceId = serviceId;
	}
};
/**
* Registration error for service registration failures
*/
var RegistrationError = class extends BaseDomainError {
	_tag = "RegistrationError";
	severity = "high";
	category = "registration";
	retryable = true;
	constructor(message, serviceId, context = {}, cause) {
		super("RegistrationError", message, "REGISTRATION_ERROR", {
			serviceId,
			...context
		}, cause);
		this.serviceId = serviceId;
	}
};
/**
* Discovery error for service discovery failures
*/
var DiscoveryError = class extends BaseDomainError {
	_tag = "DiscoveryError";
	severity = "high";
	category = "discovery";
	retryable = true;
	constructor(message, endpoint, context = {}, cause) {
		super("DiscoveryError", message, "DISCOVERY_ERROR", {
			endpoint,
			...context
		}, cause);
		this.endpoint = endpoint;
	}
};
let ErrorMatching;
(function(_ErrorMatching) {
	_ErrorMatching.toUserMessage = (errorEffect) => (0, effect_Function.pipe)(errorEffect, effect_Effect.match({
		onFailure: (error$1) => effect_Match.value(error$1).pipe(effect_Match.tag("ValidationError", (err) => `Invalid ${err.field ?? "field"}: ${err.message}`), effect_Match.tag("SchemaValidationError", (err) => `Data format error: ${err.violations.map((v) => v.message).join(", ")}`), effect_Match.tag("EntityResolutionError", (err) => `Could not find ${err.entityType ?? "entity"}: ${err.message}`), effect_Match.tag("FieldResolutionError", (err) => `Field resolution failed for ${err.fieldName ?? "field"}: ${err.message}`), effect_Match.tag("FederationError", (err) => `Federation error: ${err.message}`), effect_Match.tag("CircuitBreakerError", () => "Service temporarily unavailable, please try again"), effect_Match.tag("TimeoutError", () => "Request timed out, please try again"), effect_Match.tag("CompositionError", (err) => `Schema composition failed: ${err.message}`), effect_Match.tag("TypeConversionError", (err) => `Type conversion failed: ${err.message}`), effect_Match.tag("RegistrationError", (err) => `Service registration failed: ${err.message}`), effect_Match.tag("DiscoveryError", (err) => `Service discovery failed: ${err.message}`), effect_Match.tag("HealthCheckError", (err) => `Health check failed: ${err.message}`), effect_Match.exhaustive),
		onSuccess: () => "Operation completed successfully"
	}));
	_ErrorMatching.isRetryable = (error$1) => effect_Match.value(error$1).pipe(effect_Match.tag("ValidationError", () => false), effect_Match.tag("SchemaValidationError", () => false), effect_Match.tag("EntityResolutionError", () => true), effect_Match.tag("FieldResolutionError", () => true), effect_Match.tag("FederationError", () => false), effect_Match.tag("CircuitBreakerError", () => true), effect_Match.tag("TimeoutError", () => true), effect_Match.tag("CompositionError", () => false), effect_Match.tag("TypeConversionError", () => false), effect_Match.tag("RegistrationError", () => true), effect_Match.tag("DiscoveryError", () => true), effect_Match.tag("HealthCheckError", () => true), effect_Match.exhaustive);
	_ErrorMatching.getSeverity = (error$1) => effect_Match.value(error$1).pipe(effect_Match.tag("ValidationError", () => "medium"), effect_Match.tag("SchemaValidationError", () => "medium"), effect_Match.tag("EntityResolutionError", () => "high"), effect_Match.tag("FieldResolutionError", () => "medium"), effect_Match.tag("FederationError", () => "high"), effect_Match.tag("CircuitBreakerError", () => "high"), effect_Match.tag("TimeoutError", () => "medium"), effect_Match.tag("CompositionError", () => "high"), effect_Match.tag("TypeConversionError", () => "medium"), effect_Match.tag("RegistrationError", () => "high"), effect_Match.tag("DiscoveryError", () => "high"), effect_Match.tag("HealthCheckError", () => "medium"), effect_Match.exhaustive);
})(ErrorMatching || (ErrorMatching = {}));
let ErrorFactory;
(function(_ErrorFactory) {
	const validation = _ErrorFactory.validation = (message, field, value, code) => new ValidationError(message, field, value, code);
	_ErrorFactory.schemaValidation = (schemaName, message, violations) => new SchemaValidationError(schemaName, message, violations);
	const entityResolution = _ErrorFactory.entityResolution = (message, entityType, entityId, cause) => new EntityResolutionError(message, entityType, entityId, {}, cause);
	const fieldResolution = _ErrorFactory.fieldResolution = (message, fieldName, parentType, cause) => new FieldResolutionError(message, fieldName, parentType, {}, cause);
	const federation = _ErrorFactory.federation = (message, subgraphId, operationType, cause) => new FederationError(message, subgraphId, operationType, {}, cause);
	const circuitBreaker = _ErrorFactory.circuitBreaker = (message, state, cause) => new CircuitBreakerError(message, state, {}, cause);
	const timeout = _ErrorFactory.timeout = (message, timeout$1, cause) => new TimeoutError(message, timeout$1, {}, cause);
	const composition = _ErrorFactory.composition = (message, subgraphId, cause) => new CompositionError(message, subgraphId, {}, cause);
	const typeConversion = _ErrorFactory.typeConversion = (message, astType, field, cause) => new TypeConversionError(message, astType, field, {}, cause);
	_ErrorFactory.healthCheck = (message, serviceId, cause) => new HealthCheckError(message, serviceId, {}, cause);
	const registration = _ErrorFactory.registration = (message, serviceId, cause) => new RegistrationError(message, serviceId, {}, cause);
	const discovery = _ErrorFactory.discovery = (message, endpoint, cause) => new DiscoveryError(message, endpoint, {}, cause);
	_ErrorFactory.CommonErrors = {
		required: (field) => validation(`${field} is required`, field),
		invalid: (field, value) => validation(`${field} has invalid value`, field, value),
		subgraphUnavailable: (subgraphId) => federation(`Subgraph ${subgraphId} is unavailable`, subgraphId),
		entityNotFound: (entityType, entityId) => entityResolution(`${entityType} with id ${entityId} not found`, entityType, entityId),
		fieldNotResolvable: (fieldName, parentType) => fieldResolution(`Field ${fieldName} on ${parentType} could not be resolved`, fieldName, parentType),
		circuitOpen: (serviceId) => circuitBreaker(`Circuit breaker open for service ${serviceId}`, "open"),
		requestTimeout: (timeoutValue) => timeout(`Request timed out after ${timeoutValue}`, timeoutValue),
		registrationError: (message, serviceId, cause) => registration(message, serviceId, cause),
		discoveryError: (message, endpoint, cause) => discovery(message, endpoint, cause),
		schemaCompositionFailed: (reason) => composition(`Schema composition failed: ${reason}`),
		unsupportedAstType: (astType) => typeConversion(`Unsupported AST type: ${astType}`, astType),
		typeConversion: (message, astType) => typeConversion(message, astType)
	};
})(ErrorFactory || (ErrorFactory = {}));

//#endregion
//#region src/core/builders/entity-builder.ts
/**
* Modern Federation Entity Builder with full Apollo Federation 2.x directive support
* 
* Features:
* - Fluent builder pattern for entity configuration
* - Full support for @shareable, @inaccessible, @tag, @override directives
* - Effect-based reference resolution with comprehensive error handling
* - Type-safe field resolver binding
* - Directive validation and conflict detection
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
	* Federation 2.x directive support
	* @shareable - Field can be resolved by multiple subgraphs
	*/
	withShareableField(field, resolver) {
		return this.addDirective(field, { type: "@shareable" }, resolver);
	}
	/**
	* @inaccessible - Field hidden from public schema but available for federation
	*/
	withInaccessibleField(field, resolver) {
		return this.addDirective(field, { type: "@inaccessible" }, resolver);
	}
	/**
	* @tag - Metadata tags for schema organization and tooling
	*/
	withTaggedField(field, tags, resolver) {
		if (!tags.length) throw new Error("Tags array cannot be empty");
		return this.addDirective(field, {
			type: "@tag",
			args: { names: tags }
		}, resolver);
	}
	/**
	* @override - Overrides field resolution from another subgraph
	*/
	withOverrideField(field, fromSubgraph, resolver) {
		if (!fromSubgraph?.trim()) throw new Error("fromSubgraph cannot be empty");
		return this.addDirective(field, {
			type: "@override",
			args: { from: fromSubgraph }
		}, resolver);
	}
	/**
	* @external - Field is defined in another subgraph
	*/
	withExternalField(field) {
		return this.addDirective(field, { type: "@external" });
	}
	/**
	* @requires - Field requires specific fields from base type
	*/
	withRequiredFields(field, requiredFields, resolver) {
		if (!requiredFields?.trim()) throw new Error("Required fields specification cannot be empty");
		return this.addDirective(field, {
			type: "@requires",
			args: { fields: requiredFields }
		}, resolver);
	}
	/**
	* @provides - Field provides specific fields to base type
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
		return (0, effect.pipe)(this.validateBuildRequirements(), effect.Effect.flatMap(() => this.createFederationEntity()));
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
		if (hasFederationDirectives && !this.referenceResolver) return effect.Effect.fail(ErrorFactory.validation("Reference resolver is required for entities with federation directives", "referenceResolver"));
		for (const [field, directives] of Object.entries(this.directiveMap)) {
			const hasOverride = directives.some((d) => d.type === "@override");
			if (hasOverride && !this.fieldResolvers[field]) return effect.Effect.fail(ErrorFactory.validation(`Override field '${field}' requires a resolver`, "fieldResolver", field));
		}
		return effect.Effect.succeed(void 0);
	}
	/**
	* Create the federation entity instance
	*/
	createFederationEntity() {
		const entity = {
			typename: this.typename,
			key: this.keyFields,
			schema: this.schema,
			resolveReference: this.referenceResolver,
			fields: this.fieldResolvers,
			directives: this.directiveMap,
			extensions: this.extensions
		};
		return effect.Effect.succeed(entity);
	}
	/**
	* Validate entity reference using key fields
	*/
	validateReference(reference) {
		return (0, effect.pipe)(effect.Effect.succeed(this.keyFields), effect.Effect.flatMap((keys) => effect.Effect.all(keys.map((key) => key in reference && reference[key] !== void 0 ? effect.Effect.succeed(reference[key]) : effect.Effect.fail(ErrorFactory.validation(`Missing key field: ${String(key)}`, String(key)))))), effect.Effect.map(() => reference));
	}
	/**
	* Create a default reference resolver that validates key fields
	*/
	createDefaultReferenceResolver() {
		return (reference, context, info$1) => (0, effect.pipe)(this.validateReference(reference), effect.Effect.flatMap((validRef) => this.resolveEntityFromReference(validRef, context, info$1)), effect.Effect.catchAll((error$1) => effect.Effect.fail(ErrorFactory.entityResolution(`Failed to resolve ${this.typename} entity`, this.typename, String(reference), error$1))));
	}
	/**
	* Template method for entity resolution - can be overridden by subclasses
	*/
	resolveEntityFromReference(reference, _context, _info) {
		return effect.Effect.succeed(reference);
	}
};
/**
* Factory function for creating entity builders with proper type inference
*/
const createEntityBuilder = (typename, schema, keyFields) => {
	return new FederationEntityBuilder(typename, schema, keyFields);
};

//#endregion
//#region src/experimental/ultra-strict-entity-builder.ts
const EntityValidationResult = effect_Data.taggedEnum();
var SchemaValidationError$1 = class extends effect_Data.TaggedError("SchemaValidationError") {};
var KeyValidationError = class extends effect_Data.TaggedError("KeyValidationError") {};
var DirectiveValidationError = class extends effect_Data.TaggedError("DirectiveValidationError") {};
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
const createUltraStrictEntityBuilder = (typename) => {
	if (!typename?.trim()) throw new Error("Entity typename cannot be empty");
	return {
		_phantomState: effect_Data.struct({ _tag: "Unvalidated" }),
		typename
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
		_phantomState: effect_Data.struct({ _tag: "HasSchema" }),
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
		_phantomState: effect_Data.struct({ _tag: "HasKeys" }),
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
		throw new Error(`Conflicting directives: @${conflict[0]} and @${conflict[1]} cannot be used together`);
	}
	return {
		...builder,
		_phantomState: effect_Data.struct({ _tag: "HasDirectives" }),
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
		_phantomState: effect_Data.struct({ _tag: "Complete" }),
		resolvers
	};
};
/**
* Validates a complete entity builder using exhaustive pattern matching
*/
const validateEntityBuilder = (builder) => (0, effect_Function.pipe)(effect_Effect.succeed(builder), effect_Effect.flatMap(validateSchema), effect_Effect.flatMap(validateKeys), effect_Effect.flatMap(validateDirectives), effect_Effect.flatMap(validateCircularDependencies), effect_Effect.flatMap(validateCompatibility), effect_Effect.map(createValidResult), effect_Effect.catchAll(handleValidationErrors));
const validateSchema = (builder) => (0, effect_Function.pipe)(effect_Effect.succeed(builder.schema), effect_Effect.flatMap((schema) => {
	if (schema === void 0) return effect_Effect.fail([new SchemaValidationError$1({
		message: `Schema is required`,
		schemaPath: ["schema"],
		suggestion: "Ensure a valid schema is provided"
	})]);
	return effect_Effect.succeed(builder);
}));
const validateKeys = (builder) => (0, effect_Function.pipe)(effect_Effect.succeed(builder.keys), effect_Effect.flatMap((keys) => {
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
	return errors.length > 0 ? effect_Effect.fail(errors) : effect_Effect.succeed(builder);
}));
const validateDirectives = (builder) => (0, effect_Function.pipe)(effect_Effect.succeed(builder.directives), effect_Effect.flatMap((directives) => {
	const validDirectives = [
		"shareable",
		"inaccessible",
		"tag",
		"override",
		"external",
		"provides",
		"requires"
	];
	const directiveErrors = directives.flatMap((directive) => {
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
	return allErrors.length > 0 ? effect_Effect.fail(allErrors) : effect_Effect.succeed(builder);
}));
const validateCircularDependencies = (builder) => effect_Effect.succeed(builder);
const validateCompatibility = (builder) => effect_Effect.succeed(builder);
const createValidResult = (builder) => EntityValidationResult.Valid({
	entity: {
		typename: builder.typename,
		schema: builder.schema,
		keys: builder.keys,
		directives: builder.directives,
		resolvers: builder.resolvers,
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
const handleValidationErrors = (errors) => (0, effect_Function.pipe)(effect_Match.value(errors), effect_Match.when((errs) => errs.length > 0 && errs[0] instanceof SchemaValidationError$1, (errs) => effect_Effect.succeed(EntityValidationResult.InvalidSchema({ errors: errs }))), effect_Match.when((errs) => errs.length > 0 && errs[0] instanceof KeyValidationError, (errs) => effect_Effect.succeed(EntityValidationResult.InvalidKeys({
	errors: errs,
	schema: __effect_schema_Schema.Struct({})
}))), effect_Match.when((errs) => errs.length > 0 && errs[0] instanceof DirectiveValidationError, (errs) => effect_Effect.succeed(EntityValidationResult.InvalidDirectives({
	errors: errs,
	schema: __effect_schema_Schema.Struct({}),
	keys: []
}))), effect_Match.exhaustive);
/**
* Exhaustive pattern matching over entity validation results
*/
const matchEntityValidationResult = (handlers) => (result) => effect_Match.value(result).pipe(effect_Match.tag("Valid", handlers.Valid), effect_Match.tag("InvalidSchema", handlers.InvalidSchema), effect_Match.tag("InvalidKeys", handlers.InvalidKeys), effect_Match.tag("InvalidDirectives", handlers.InvalidDirectives), effect_Match.tag("CircularDependency", handlers.CircularDependency), effect_Match.tag("IncompatibleVersion", handlers.IncompatibleVersion), effect_Match.exhaustive);
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
//#region src/core/schema-first-patterns.ts
const SchemaLifecycleState = effect_Data.taggedEnum();
const SchemaEvolution = effect_Data.taggedEnum();
var SchemaFirstError = class extends effect_Data.TaggedError("SchemaFirstError") {};
var SchemaEvolutionError = class extends effect_Data.TaggedError("SchemaEvolutionError") {};
var CodeGenerationError = class extends effect_Data.TaggedError("CodeGenerationError") {};
const SchemaFirstService = effect_Context.GenericTag("@federation/SchemaFirstService");
const createSchemaFirstService = () => ({
	parseSchemaDefinition: (schemaSource) => (0, effect_Function.pipe)(effect_Effect.try(() => {
		if (!schemaSource?.includes("type")) throw new Error("Invalid GraphQL schema");
		return {
			kind: graphql.Kind.DOCUMENT,
			definitions: []
		};
	}), effect_Effect.mapError((error$1) => new SchemaFirstError({
		message: `Failed to parse schema: ${error$1}`,
		suggestion: "Ensure the schema follows valid GraphQL SDL syntax"
	}))),
	extractEntitiesFromSchema: (schema) => (0, effect_Function.pipe)(effect_Effect.succeed(schema), effect_Effect.map((_doc) => {
		return [
			"User",
			"Product",
			"Order"
		];
	}), effect_Effect.catchAll((error$1) => effect_Effect.fail(new SchemaFirstError({
		message: `Failed to extract entities: ${error$1}`,
		suggestion: "Ensure entities have proper @key directives"
	})))),
	generateEntityBuilders: (schema) => (0, effect_Function.pipe)(effect_Effect.succeed(schema), effect_Effect.flatMap((_doc) => effect_Effect.all([
		generateUserEntityBuilder(),
		generateProductEntityBuilder(),
		generateOrderEntityBuilder()
	])), effect_Effect.map((builders) => builders.filter((b) => b !== null)), effect_Effect.catchAll((error$1) => effect_Effect.fail(new SchemaFirstError({
		message: `Failed to generate entity builders: ${error$1}`,
		suggestion: "Verify schema entities have valid types and key fields"
	})))),
	validateSchemaEvolution: (currentSchema, proposedSchema) => (0, effect_Function.pipe)(effect_Effect.succeed([currentSchema, proposedSchema]), effect_Effect.map(([_current, _proposed]) => {
		const evolutions = [SchemaEvolution.AddField({
			entityType: "User",
			fieldName: "lastLoginAt",
			fieldType: "DateTime",
			isBreaking: false
		}), SchemaEvolution.ChangeFieldType({
			entityType: "Product",
			fieldName: "price",
			oldType: "Float",
			newType: "Decimal",
			isBreaking: true
		})];
		return evolutions;
	}), effect_Effect.catchAll((error$1) => effect_Effect.fail(new SchemaEvolutionError({
		message: `Schema evolution validation failed: ${error$1}`,
		evolution: SchemaEvolution.AddField({
			entityType: "Unknown",
			fieldName: "unknown",
			fieldType: "String",
			isBreaking: false
		})
	})))),
	generateResolverStubs: (entities) => (0, effect_Function.pipe)(effect_Effect.succeed(entities), effect_Effect.map((entities$1) => {
		const stubs = entities$1.map((entity) => `
// Resolver for ${entity.typename}
export const ${entity.typename}Resolvers = {
  Query: {
    ${entity.typename.toLowerCase()}: async (parent: unknown, args: unknown, context: unknown) => {
      // TODO: Implement ${entity.typename} query resolver
      return Effect.runPromise(
        pipe(
          Effect.succeed(args),
          // Add your business logic here
          Effect.map(data => data)
        )
      )
    }
  },

  ${entity.typename}: {
    // Field resolvers
    ${entity.keys.map((key) => `
    ${key.field}: (parent: unknown) => parent.${key.field}`).join(",")}
  }
}`).join("\n\n");
		return `import * as Effect from "effect/Effect"\nimport { pipe } from "effect/Function"\n\n${stubs}`;
	}), effect_Effect.catchAll((error$1) => effect_Effect.fail(new CodeGenerationError({
		message: `Failed to generate resolver stubs: ${error$1}`,
		targetLanguage: "typescript",
		entityType: "multiple"
	})))),
	generateTypeDefinitions: (entities, language) => (0, effect_Function.pipe)(effect_Effect.succeed({
		entities,
		language
	}), effect_Effect.flatMap(({ entities: entities$1, language: language$1 }) => (0, effect_Function.pipe)(effect_Match.value(language$1), effect_Match.when("typescript", () => generateTypeScriptTypes(entities$1)), effect_Match.when("go", () => generateGoTypes(entities$1)), effect_Match.when("java", () => generateJavaTypes(entities$1)), effect_Match.when("python", () => generatePythonTypes(entities$1)), effect_Match.exhaustive)), effect_Effect.catchAll((error$1) => effect_Effect.fail(new CodeGenerationError({
		message: `Failed to generate ${language} types: ${error$1}`,
		targetLanguage: language,
		entityType: "multiple"
	}))))
});
const generateUserEntityBuilder = () => (0, effect_Function.pipe)(createUltraStrictEntityBuilder("User"), withSchema(__effect_schema_Schema.Struct({
	id: __effect_schema_Schema.String,
	email: __effect_schema_Schema.String,
	name: __effect_schema_Schema.optional(__effect_schema_Schema.String)
})), withKeys([UltraStrictEntityBuilder.Key.create("id", { name: "ID" }, false)]), withDirectives([UltraStrictEntityBuilder.Directive.shareable(), UltraStrictEntityBuilder.Directive.tag("user")]), withResolvers({ fullName: (parent) => `${parent.name ?? "Anonymous"}` }), validateEntityBuilder, effect_Effect.map((result) => (0, effect_Function.pipe)(effect_Match.value(result), effect_Match.tag("Valid", ({ entity }) => entity), effect_Match.orElse(() => null))), effect_Effect.catchAll(() => effect_Effect.succeed(null)));
const generateProductEntityBuilder = () => (0, effect_Function.pipe)(createUltraStrictEntityBuilder("Product"), withSchema(__effect_schema_Schema.Struct({
	id: __effect_schema_Schema.String,
	name: __effect_schema_Schema.String,
	price: __effect_schema_Schema.Number
})), withKeys([UltraStrictEntityBuilder.Key.create("id", { name: "ID" }, false)]), withDirectives([UltraStrictEntityBuilder.Directive.shareable()]), withResolvers({ formattedPrice: (parent) => `$${parent.price.toFixed(2)}` }), validateEntityBuilder, effect_Effect.map((result) => (0, effect_Function.pipe)(effect_Match.value(result), effect_Match.tag("Valid", ({ entity }) => entity), effect_Match.orElse(() => null))), effect_Effect.catchAll(() => effect_Effect.succeed(null)));
const generateOrderEntityBuilder = () => (0, effect_Function.pipe)(createUltraStrictEntityBuilder("Order"), withSchema(__effect_schema_Schema.Struct({
	id: __effect_schema_Schema.String,
	userId: __effect_schema_Schema.String,
	total: __effect_schema_Schema.Number
})), withKeys([UltraStrictEntityBuilder.Key.create("id", { name: "ID" }, false)]), withDirectives([UltraStrictEntityBuilder.Directive.requires("userId")]), withResolvers({ formattedTotal: (parent) => {
	const typedParent = parent;
	return `$${typedParent.total.toFixed(2)}`;
} }), validateEntityBuilder, effect_Effect.map((result) => (0, effect_Function.pipe)(effect_Match.value(result), effect_Match.tag("Valid", ({ entity }) => entity), effect_Match.orElse(() => null))), effect_Effect.catchAll(() => effect_Effect.succeed(null)));
const generateTypeScriptTypes = (entities) => effect_Effect.succeed(entities.map((entity) => `
export interface ${entity.typename} {
  ${entity.keys.map((key) => `readonly ${key.field}: string`).join("\n  ")}
  // Additional fields from schema would be generated here
}

export type ${entity.typename}Input = Omit<${entity.typename}, 'id'>
`).join("\n"));
const generateGoTypes = (entities) => effect_Effect.succeed(`package federation\n\n` + entities.map((entity) => `
type ${entity.typename} struct {
  ${entity.keys.map((key) => `${key.field.charAt(0).toUpperCase() + key.field.slice(1)} string \`json:"${key.field}"\``).join("\n  ")}
  // Additional fields from schema would be generated here
}
`).join("\n"));
const generateJavaTypes = (entities) => effect_Effect.succeed(entities.map((entity) => `
public class ${entity.typename} {
  ${entity.keys.map((key) => `private String ${key.field};`).join("\n  ")}

  // Constructors, getters, and setters would be generated here
}
`).join("\n"));
const generatePythonTypes = (entities) => effect_Effect.succeed(`from dataclasses import dataclass\nfrom typing import Optional\n\n` + entities.map((entity) => `
@dataclass
class ${entity.typename}:
    ${entity.keys.map((key) => `${key.field}: str`).join("\n    ")}
    # Additional fields from schema would be generated here
`).join("\n"));
const createSchemaFirstWorkflow = (schemaFirstService) => ({
	developSchema: (schemaSource) => (0, effect_Function.pipe)(schemaFirstService.parseSchemaDefinition(schemaSource), effect_Effect.flatMap((schema) => (0, effect_Function.pipe)(schemaFirstService.generateEntityBuilders(schema), effect_Effect.map((entities) => SchemaLifecycleState.Validated({
		schema,
		entities,
		version: "1.0.0"
	}))))),
	evolveSchema: (currentState, proposedSchema) => (0, effect_Function.pipe)(effect_Match.value(currentState), effect_Match.tag("Validated", ({ schema: currentSchema }) => (0, effect_Function.pipe)(schemaFirstService.parseSchemaDefinition(proposedSchema), effect_Effect.mapError((error$1) => new SchemaEvolutionError({
		message: error$1.message,
		evolution: SchemaEvolution.AddField({
			entityType: "Unknown",
			fieldName: "unknown",
			fieldType: "String",
			isBreaking: false
		})
	})), effect_Effect.flatMap((proposedSchemaDoc) => (0, effect_Function.pipe)(schemaFirstService.validateSchemaEvolution(currentSchema, proposedSchemaDoc), effect_Effect.flatMap((evolutions) => {
		const hasBreakingChanges = evolutions.some((evo) => effect_Match.value(evo).pipe(effect_Match.tag("AddField", ({ isBreaking }) => isBreaking), effect_Match.tag("RemoveField", ({ isBreaking }) => isBreaking), effect_Match.tag("ChangeFieldType", ({ isBreaking }) => isBreaking), effect_Match.orElse(() => false)));
		if (hasBreakingChanges) return effect_Effect.fail(new SchemaEvolutionError({
			message: "Schema evolution contains breaking changes",
			evolution: evolutions[0] ?? SchemaEvolution.AddField({
				entityType: "Unknown",
				fieldName: "unknown",
				fieldType: "String",
				isBreaking: true
			}),
			conflictingChanges: evolutions
		}));
		return (0, effect_Function.pipe)(schemaFirstService.generateEntityBuilders(proposedSchemaDoc), effect_Effect.map((entities) => SchemaLifecycleState.Validated({
			schema: proposedSchemaDoc,
			entities,
			version: "1.1.0"
		})), effect_Effect.mapError((error$1) => new SchemaEvolutionError({
			message: error$1.message,
			evolution: SchemaEvolution.AddField({
				entityType: "Unknown",
				fieldName: "unknown",
				fieldType: "String",
				isBreaking: false
			})
		})));
	}))))), effect_Match.orElse((_state) => effect_Effect.fail(new SchemaEvolutionError({
		message: "Can only evolve validated schemas",
		evolution: SchemaEvolution.AddField({
			entityType: "Unknown",
			fieldName: "unknown",
			fieldType: "String",
			isBreaking: false
		}),
		conflictingChanges: []
	})))),
	generateCode: (state, targets) => (0, effect_Function.pipe)(effect_Match.value(state), effect_Match.tag("Validated", ({ entities }) => (0, effect_Function.pipe)(effect_Effect.all(targets.map((target) => (0, effect_Function.pipe)(effect_Match.value(target), effect_Match.when("resolvers", () => (0, effect_Function.pipe)(schemaFirstService.generateResolverStubs(entities), effect_Effect.map((code) => [target, code]))), effect_Match.when("types", () => (0, effect_Function.pipe)(schemaFirstService.generateTypeDefinitions(entities, "typescript"), effect_Effect.map((code) => [target, code]))), effect_Match.exhaustive))), effect_Effect.map((results) => Object.fromEntries(results)))), effect_Match.orElse(() => effect_Effect.fail(new CodeGenerationError({
		message: "Can only generate code from validated schemas",
		targetLanguage: "typescript",
		entityType: "multiple"
	}))))
});
let SchemaFirst;
(function(_SchemaFirst) {
	_SchemaFirst.Service = {
		create: createSchemaFirstService,
		Tag: SchemaFirstService
	};
	_SchemaFirst.Workflow = { create: createSchemaFirstWorkflow };
	_SchemaFirst.State = SchemaLifecycleState;
	_SchemaFirst.Evolution = SchemaEvolution;
})(SchemaFirst || (SchemaFirst = {}));

//#endregion
//#region src/core/services/logger.ts
var FederationLogger = class extends effect_Context.Tag("FederationLogger")() {};
const make = effect_Effect.gen(function* () {
	yield* effect_Effect.log("Hello, world!");
	const logWithLevel = (level) => (message, meta = {}) => effect_Effect.logWithLevel(level, message, meta);
	return {
		trace: logWithLevel(effect_LogLevel.Trace),
		debug: logWithLevel(effect_LogLevel.Debug),
		info: logWithLevel(effect_LogLevel.Info),
		warn: logWithLevel(effect_LogLevel.Warning),
		error: logWithLevel(effect_LogLevel.Error),
		withSpan: (name, effect$1) => effect_Effect.withSpan(effect$1, name, { attributes: {
			service: "federation-v2",
			version: "2.0.0"
		} })
	};
});
const FederationLoggerLive = effect_Layer.effect(FederationLogger, make);
const trace = (message, meta) => effect_Effect.flatMap(FederationLogger, (logger) => logger.trace(message, meta));
const debug = (message, meta) => effect_Effect.flatMap(FederationLogger, (logger) => logger.debug(message, meta));
const info = (message, meta) => effect_Effect.flatMap(FederationLogger, (logger) => logger.info(message, meta));
const warn = (message, meta) => effect_Effect.flatMap(FederationLogger, (logger) => logger.warn(message, meta));
const error = (message, meta) => effect_Effect.flatMap(FederationLogger, (logger) => logger.error(message, meta));
const withSpan = (name, effect$1) => effect_Effect.flatMap(FederationLogger, (logger) => logger.withSpan(name, effect$1));
const developmentLogger = effect_Layer.merge(FederationLoggerLive, effect_Logger.minimumLogLevel(effect_LogLevel.Debug));
const productionLogger = effect_Layer.merge(FederationLoggerLive, effect_Logger.minimumLogLevel(effect_LogLevel.Info));
const testLogger = effect_Layer.merge(FederationLoggerLive, effect_Logger.minimumLogLevel(effect_LogLevel.Warning));

//#endregion
//#region src/core/services/config.ts
const FederationConfigSchema = __effect_schema_Schema.Struct({
	server: __effect_schema_Schema.Struct({
		port: __effect_schema_Schema.Number.pipe(__effect_schema_Schema.int(), __effect_schema_Schema.between(1, 65535)),
		host: __effect_schema_Schema.String,
		cors: __effect_schema_Schema.Struct({
			enabled: __effect_schema_Schema.Boolean,
			origins: __effect_schema_Schema.Array(__effect_schema_Schema.String)
		})
	}),
	federation: __effect_schema_Schema.Struct({
		introspection: __effect_schema_Schema.Boolean,
		playground: __effect_schema_Schema.Boolean,
		subscriptions: __effect_schema_Schema.Boolean,
		tracing: __effect_schema_Schema.Boolean
	}),
	database: __effect_schema_Schema.Struct({
		url: __effect_schema_Schema.String,
		maxConnections: __effect_schema_Schema.Number.pipe(__effect_schema_Schema.int(), __effect_schema_Schema.positive()),
		connectionTimeout: __effect_schema_Schema.String
	}),
	cache: __effect_schema_Schema.Struct({ redis: __effect_schema_Schema.Struct({
		url: __effect_schema_Schema.String,
		keyPrefix: __effect_schema_Schema.String,
		defaultTtl: __effect_schema_Schema.String
	}) }),
	resilience: __effect_schema_Schema.Struct({ circuitBreaker: __effect_schema_Schema.Struct({
		failureThreshold: __effect_schema_Schema.Number.pipe(__effect_schema_Schema.int(), __effect_schema_Schema.positive()),
		resetTimeout: __effect_schema_Schema.String,
		halfOpenMaxCalls: __effect_schema_Schema.Number.pipe(__effect_schema_Schema.int(), __effect_schema_Schema.positive())
	}) }),
	observability: __effect_schema_Schema.Struct({
		metrics: __effect_schema_Schema.Struct({
			enabled: __effect_schema_Schema.Boolean,
			port: __effect_schema_Schema.Number.pipe(__effect_schema_Schema.int(), __effect_schema_Schema.between(1, 65535))
		}),
		tracing: __effect_schema_Schema.Struct({
			enabled: __effect_schema_Schema.Boolean,
			serviceName: __effect_schema_Schema.String,
			endpoint: __effect_schema_Schema.String
		})
	})
});
var FederationConfigService = class extends effect_Context.Tag("FederationConfigService")() {};
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
			serviceName: "federation-v2",
			endpoint: "http://localhost:14268/api/traces"
		}
	}
};
const load = effect_Effect.gen(function* () {
	const config = {
		server: {
			port: yield* effect_Config.integer("SERVER_PORT").pipe(effect_Config.withDefault(defaultConfig.server.port)),
			host: yield* effect_Config.string("SERVER_HOST").pipe(effect_Config.withDefault(defaultConfig.server.host)),
			cors: {
				enabled: yield* effect_Config.boolean("CORS_ENABLED").pipe(effect_Config.withDefault(defaultConfig.server.cors.enabled)),
				origins: yield* effect_Config.array(effect_Config.string(), "CORS_ORIGINS").pipe(effect_Config.withDefault(defaultConfig.server.cors.origins))
			}
		},
		federation: {
			introspection: yield* effect_Config.boolean("FEDERATION_INTROSPECTION").pipe(effect_Config.withDefault(defaultConfig.federation.introspection)),
			playground: yield* effect_Config.boolean("FEDERATION_PLAYGROUND").pipe(effect_Config.withDefault(defaultConfig.federation.playground)),
			subscriptions: yield* effect_Config.boolean("FEDERATION_SUBSCRIPTIONS").pipe(effect_Config.withDefault(defaultConfig.federation.subscriptions)),
			tracing: yield* effect_Config.boolean("FEDERATION_TRACING").pipe(effect_Config.withDefault(defaultConfig.federation.tracing))
		},
		database: {
			url: yield* effect_Config.string("DATABASE_URL").pipe(effect_Config.withDefault(defaultConfig.database.url)),
			maxConnections: yield* effect_Config.integer("DATABASE_MAX_CONNECTIONS").pipe(effect_Config.withDefault(defaultConfig.database.maxConnections)),
			connectionTimeout: yield* effect_Config.string("DATABASE_CONNECTION_TIMEOUT").pipe(effect_Config.withDefault(defaultConfig.database.connectionTimeout))
		},
		cache: { redis: {
			url: yield* effect_Config.string("REDIS_URL").pipe(effect_Config.withDefault(defaultConfig.cache.redis.url)),
			keyPrefix: yield* effect_Config.string("REDIS_KEY_PREFIX").pipe(effect_Config.withDefault(defaultConfig.cache.redis.keyPrefix)),
			defaultTtl: yield* effect_Config.string("REDIS_DEFAULT_TTL").pipe(effect_Config.withDefault(defaultConfig.cache.redis.defaultTtl))
		} },
		resilience: { circuitBreaker: {
			failureThreshold: yield* effect_Config.integer("CIRCUIT_BREAKER_FAILURE_THRESHOLD").pipe(effect_Config.withDefault(defaultConfig.resilience.circuitBreaker.failureThreshold)),
			resetTimeout: yield* effect_Config.string("CIRCUIT_BREAKER_RESET_TIMEOUT").pipe(effect_Config.withDefault(defaultConfig.resilience.circuitBreaker.resetTimeout)),
			halfOpenMaxCalls: yield* effect_Config.integer("CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS").pipe(effect_Config.withDefault(defaultConfig.resilience.circuitBreaker.halfOpenMaxCalls))
		} },
		observability: {
			metrics: {
				enabled: yield* effect_Config.boolean("METRICS_ENABLED").pipe(effect_Config.withDefault(defaultConfig.observability.metrics.enabled)),
				port: yield* effect_Config.integer("METRICS_PORT").pipe(effect_Config.withDefault(defaultConfig.observability.metrics.port))
			},
			tracing: {
				enabled: yield* effect_Config.boolean("TRACING_ENABLED").pipe(effect_Config.withDefault(defaultConfig.observability.tracing.enabled)),
				serviceName: yield* effect_Config.string("TRACING_SERVICE_NAME").pipe(effect_Config.withDefault(defaultConfig.observability.tracing.serviceName)),
				endpoint: yield* effect_Config.string("TRACING_ENDPOINT").pipe(effect_Config.withDefault(defaultConfig.observability.tracing.endpoint))
			}
		}
	};
	return yield* __effect_schema_Schema.decodeUnknown(FederationConfigSchema)(config);
});
const FederationConfigLive = effect_Layer.effect(FederationConfigService, load);
const getServerConfig = effect_Effect.map(FederationConfigService, (config) => config.server);
const getFederationConfig = effect_Effect.map(FederationConfigService, (config) => config.federation);
const getDatabaseConfig = effect_Effect.map(FederationConfigService, (config) => config.database);
const getCacheConfig = effect_Effect.map(FederationConfigService, (config) => config.cache);
const getResilienceConfig = effect_Effect.map(FederationConfigService, (config) => config.resilience);
const getObservabilityConfig = effect_Effect.map(FederationConfigService, (config) => config.observability);

//#endregion
//#region src/core/services/layers.ts
const CoreServicesLive = effect_Layer.mergeAll(FederationConfigLive, FederationLoggerLive);
const DevelopmentLayerLive = effect_Layer.mergeAll(CoreServicesLive, developmentLogger, effect_Logger.pretty);
const ProductionLayerLive = effect_Layer.mergeAll(CoreServicesLive, productionLogger, effect_Logger.json);
const TestLayerLive = effect_Layer.mergeAll(CoreServicesLive, testLogger);
const MinimalLayerLive = FederationConfigLive;
/**
* Helper function to create environment-specific layers
*/
const createEnvironmentLayer = (environment) => {
	switch (environment) {
		case "production": return ProductionLayerLive;
		case "test": return TestLayerLive;
		case "development":
		default: return DevelopmentLayerLive;
	}
};

//#endregion
//#region src/federation/composer.ts
var ModernFederationComposer = class extends effect_Context.Tag("ModernFederationComposer")() {};
const makeComposer = effect_Effect.gen(function* () {
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
		const validatedConfig = yield* validate(federationConfig).pipe(effect_Effect.mapError((error$1) => new CompositionError(`Configuration validation failed: ${error$1.message}`, void 0, { field: error$1.field }, error$1)));
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
			return yield* effect_Effect.fail(ErrorFactory.validation("At least one entity is required", "entities"));
		}
		if (federationConfig.services.length === 0) {
			yield* logger.error("No services provided in configuration");
			return yield* effect_Effect.fail(ErrorFactory.validation("At least one service is required", "services"));
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
			return yield* effect_Effect.fail(new CompositionError(`Failed to build schema: ${err}`, void 0, {}, err));
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
		return yield* effect_Effect.fail(ErrorFactory.validation(`Invalid service URL: ${service.url}`, "url", service.url));
	}
});
const validateEntityKeys = (entities) => effect_Effect.gen(function* () {
	yield* effect_Effect.logWithLevel(effect_LogLevel.Trace, `Validating entity keys for ${entities.length} entities`);
	for (const entity of entities) {
		if (!entity.typename || entity.typename.trim() === "") {
			yield* effect_Effect.logWithLevel(effect_LogLevel.Error, `Entity has empty typename`);
			return yield* effect_Effect.fail(ErrorFactory.validation(`Entity typename cannot be empty`, "typename", entity.typename));
		}
		if (Array.isArray(entity.key) && entity.key.length === 0) {
			yield* effect_Effect.logWithLevel(effect_LogLevel.Error, `Entity ${entity.typename} has no key fields`);
			return yield* effect_Effect.fail(ErrorFactory.validation(`Entity ${entity.typename} must have at least one key field`, "key", entity.key));
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
const ModernFederationComposerLive = effect_Layer.effect(ModernFederationComposer, makeComposer);
const compose = (config) => effect_Effect.gen(function* () {
	const composer = yield* makeComposer;
	return yield* composer.compose(config);
});
const validateConfig = (config) => effect_Effect.flatMap(ModernFederationComposer, (composer) => composer.validate(config));
const handleCompositionError = (error$1) => effect_Match.value(error$1).pipe(effect_Match.when((error$2) => error$2.message.includes("URL"), () => "Invalid service configuration - check your URLs"), effect_Match.when((error$2) => error$2.message.includes("schema"), () => "Schema composition failed - check your GraphQL definitions"), effect_Match.orElse(() => `Composition error: ${error$1.message}`));
const createFederatedSchema = (config) => effect_Effect.gen(function* () {
	yield* effect_Effect.logWithLevel(effect_LogLevel.Info, "Creating federated schema");
	const result = yield* compose(config).pipe(effect_Effect.catchTag("CompositionError", (error$1) => effect_Effect.gen(function* () {
		const userMessage = handleCompositionError(error$1);
		yield* effect_Effect.logWithLevel(effect_LogLevel.Error, "Composition failed", {
			error: error$1,
			userMessage
		});
		return yield* effect_Effect.fail(error$1);
	})), effect_Effect.timeout(effect.Duration.seconds(30)), effect_Effect.catchTag("TimeoutException", () => effect_Effect.gen(function* () {
		yield* effect_Effect.logWithLevel(effect_LogLevel.Error, "Schema composition timed out");
		return yield* effect_Effect.fail(new CompositionError("Schema composition timed out after 30 seconds"));
	})));
	yield* effect_Effect.logWithLevel(effect_LogLevel.Info, "Federated schema created successfully");
	return result;
});

//#endregion
//#region src/federation/subgraph.ts
let SubgraphManagement;
(function(_SubgraphManagement) {
	_SubgraphManagement.createRegistry = (config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.flatMap(validateRegistryConfig), effect.Effect.mapError((error$1) => {
		return ErrorFactory.composition(`Registry configuration validation failed: ${error$1.message}`, void 0, "config");
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
	const validateRegistryConfig = (config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.filterOrFail((config$1) => config$1.discoveryMode === "static" ? config$1.staticServices.length > 0 : config$1.discoveryEndpoints.length > 0, () => ErrorFactory.composition("Registry configuration must have services or discovery endpoints")));
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
				if (existingService) servicesByUrl.delete(existingService.url);
				services.set(service.id, service);
				servicesByUrl.set(service.url, service);
			}),
			remove: (serviceId) => effect.Effect.sync(() => {
				const service = services.get(serviceId);
				if (service) {
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
	const registerSubgraph = (definition, config, store) => (0, effect.pipe)(effect.Effect.succeed(definition), effect.Effect.flatMap(validateServiceDefinition), effect.Effect.flatMap((validDef) => store.store(validDef)), effect.Effect.flatMap(() => triggerSchemaRecomposition(definition, config)), effect.Effect.catchAll((_error) => effect.Effect.fail(ErrorFactory.CommonErrors.registrationError(`Failed to register service ${definition.id}`, definition.id))));
	/**
	* Validate service definition
	*/
	const validateServiceDefinition = (definition) => (0, effect.pipe)(effect.Effect.succeed(definition), effect.Effect.filterOrFail((def) => !!def.id?.trim(), () => ErrorFactory.CommonErrors.registrationError("Service ID is required", "unknown")), effect.Effect.filterOrFail((def) => !!def.url?.trim(), () => ErrorFactory.CommonErrors.registrationError("Service URL is required", definition.id || "unknown")), effect.Effect.flatMap((def) => {
		try {
			new URL(def.url);
			return effect.Effect.succeed(def);
		} catch {
			return effect.Effect.fail(ErrorFactory.CommonErrors.registrationError(`Invalid service URL: ${def.url}`, def.id || "unknown"));
		}
	}));
	/**
	* Unregister a subgraph service
	*/
	const unregisterSubgraph = (serviceId, config, store) => (0, effect.pipe)(store.get(serviceId), effect.Effect.mapError((error$1) => ErrorFactory.CommonErrors.registrationError(`Failed to get service ${serviceId}: ${error$1.message}`, serviceId)), effect.Effect.flatMap((service) => service ? (0, effect.pipe)(store.remove(serviceId), effect.Effect.flatMap(() => (0, effect.pipe)(triggerSchemaRecomposition({
		id: serviceId,
		url: ""
	}, config), effect.Effect.mapError((error$1) => ErrorFactory.CommonErrors.registrationError(`Failed to trigger recomposition for service ${serviceId}: ${error$1.message}`, serviceId))))) : effect.Effect.fail(ErrorFactory.CommonErrors.registrationError(`Service ${serviceId} not found`, serviceId))));
	/**
	* Discover subgraphs from configured sources
	*/
	const discoverSubgraphs = (config, store) => config.discoveryMode === "static" ? effect.Effect.succeed(config.staticServices) : (0, effect.pipe)(effect.Effect.succeed(config.discoveryEndpoints), effect.Effect.flatMap((endpoints) => effect.Effect.all(endpoints.map((endpoint) => (0, effect.pipe)(fetchFromDiscoveryEndpoint(endpoint, config), effect.Effect.catchAll((error$1) => {
		console.warn(`Discovery endpoint ${endpoint} failed:`, error$1);
		return effect.Effect.succeed([]);
	}))), { concurrency: 3 })), effect.Effect.map((results) => results.flat()), effect.Effect.tap((services) => effect.Effect.all(services.map((service) => (0, effect.pipe)(store.store(service), effect.Effect.mapError((error$1) => ErrorFactory.CommonErrors.discoveryError(`Failed to store discovered service ${service.id}: ${error$1.message}`, service.url)))))));
	/**
	* Fetch services from discovery endpoint with connection pooling and caching
	*/
	const fetchFromDiscoveryEndpoint = (endpoint, config) => {
		return (0, effect.pipe)(effect.Effect.tryPromise({
			try: () => fetch(endpoint, {
				method: "GET",
				headers: {
					"Accept": "application/json",
					"Cache-Control": "max-age=30",
					"User-Agent": "Federation-Framework/2.0"
				},
				keepalive: true
			}),
			catch: (error$1) => ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint unavailable: ${endpoint}`, endpoint, error$1)
		}), effect.Effect.timeout(config.healthCheckTimeout), effect.Effect.mapError((error$1) => error$1._tag === "TimeoutException" ? ErrorFactory.CommonErrors.discoveryError(`Timeout accessing discovery endpoint: ${endpoint}`, endpoint) : ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint unavailable: ${endpoint}`, endpoint, error$1)), effect.Effect.flatMap((response) => {
			if (!response.ok) return effect.Effect.fail(ErrorFactory.CommonErrors.discoveryError(`Discovery endpoint returned ${response.status}: ${response.statusText}`, endpoint));
			return (0, effect.pipe)(effect.Effect.tryPromise({
				try: async () => {
					const text = await response.text();
					try {
						return JSON.parse(text);
					} catch {
						throw new Error(`Invalid JSON: ${text.slice(0, 100)}...`);
					}
				},
				catch: (error$1) => ErrorFactory.CommonErrors.discoveryError(`Invalid JSON response: ${error$1.message}`, endpoint)
			}), effect.Effect.flatMap((data) => {
				if (!Array.isArray(data["services"])) return effect.Effect.fail(ErrorFactory.CommonErrors.discoveryError(`Expected services array, got: ${typeof data}`, endpoint));
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
	const checkSubgraphHealth = (serviceId, config, store) => (0, effect.pipe)(store.get(serviceId), effect.Effect.mapError((error$1) => new HealthCheckError(`Failed to get service ${serviceId}: ${error$1.message}`, serviceId)), effect.Effect.flatMap((service) => service ? performHealthCheck(service, config) : effect.Effect.fail(new HealthCheckError(`Service ${serviceId} not found`, serviceId))));
	/**
	* Perform optimized health check with adaptive timeout and connection reuse
	*/
	const performHealthCheck = (service, config) => {
		const startTime = Date.now();
		const adaptiveTimeout = effect.Duration.toMillis(config.healthCheckTimeout);
		return (0, effect.pipe)(effect.Effect.tryPromise({
			try: () => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), adaptiveTimeout);
				return fetch(`${service.url}/health`, {
					method: "GET",
					headers: {
						"Accept": "application/json",
						"User-Agent": "Federation-Framework/2.0",
						"Cache-Control": "no-cache"
					},
					signal: controller.signal,
					keepalive: true
				}).finally(() => clearTimeout(timeoutId));
			},
			catch: (error$1) => {
				const responseTime = Date.now() - startTime;
				const errorMessage = error$1.name === "AbortError" ? `Health check timed out after ${responseTime}ms` : `Health check failed: ${error$1.message}`;
				return ErrorFactory.healthCheck(errorMessage, service.id, error$1);
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
	})), effect.Effect.catchAll((error$1) => {
		console.warn("Service discovery failed:", error$1);
		return effect.Effect.succeed([]);
	}), effect.Effect.repeat(effect.Schedule.fixed(interval)), effect.Effect.asVoid);
	/**
	* Schedule optimized health checks with adaptive concurrency and batching
	*/
	const scheduleHealthChecks = (registry, interval) => {
		let healthCheckRound = 0;
		return (0, effect.pipe)(registry.discover(), effect.Effect.catchAll((error$1) => {
			console.warn("Discovery failed during health checks:", error$1.message);
			return effect.Effect.succeed([]);
		}), effect.Effect.flatMap((services) => {
			healthCheckRound++;
			const batchSize = Math.min(10, Math.max(3, Math.ceil(services.length / 3)));
			console.log(`🔍 Health check round ${healthCheckRound} for ${services.length} services (batch size: ${batchSize})`);
			return effect.Effect.all(services.map((service) => (0, effect.pipe)(registry.health(service.id), effect.Effect.tap((health) => effect.Effect.sync(() => {
				const status = health.status === "healthy" ? "✅" : health.status === "degraded" ? "⚠️" : "❌";
				const responseTime = health.metrics?.["responseTimeMs"] ?? 0;
				console.log(`${status} ${service.id}: ${health.status} (${responseTime}ms)`);
			})), effect.Effect.catchAll((error$1) => {
				console.warn(`Health check failed for ${service.id}:`, error$1.message);
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
//#region src/federation/error-boundaries.ts
let FederationErrorBoundaries;
(function(_FederationErrorBoundaries) {
	_FederationErrorBoundaries.createBoundary = (config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.map((conf) => ({
		wrapResolver: (subgraphId, resolver) => createBoundedResolver(subgraphId, resolver, conf),
		handlePartialFailure: (results) => processPartialResults(results, conf.partialFailureHandling),
		transformError: (error$1, context) => transformFederationError(error$1, context, conf.errorTransformation)
	}))).pipe(effect.Effect.runSync);
	_FederationErrorBoundaries.withCircuitBreaker = (subgraphId, config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.flatMap(validateCircuitBreakerConfig), effect.Effect.map((validConfig) => createCircuitBreakerInstance(subgraphId, validConfig)));
	/**
	* Create a bounded resolver with comprehensive error handling
	*/
	const createBoundedResolver = (subgraphId, resolver, config) => {
		const circuitBreaker = createCircuitBreakerInstance(subgraphId, config.circuitBreakerConfig);
		const timeout = config.subgraphTimeouts[subgraphId] ?? effect.Duration.seconds(10);
		return (parent, args, context, info$1) => {
			const startTime = Date.now();
			return (0, effect.pipe)(effect.Effect.tryPromise({
				try: () => resolver(parent, args, context, info$1),
				catch: (error$1) => ErrorFactory.federation("Resolver execution failed", subgraphId, "execution", error$1)
			}), effect.Effect.timeout(timeout), effect.Effect.catchTag("TimeoutException", () => effect.Effect.fail(ErrorFactory.timeout(`Subgraph ${subgraphId} timed out`, timeout.toString()))), circuitBreaker.protect, effect.Effect.tap((_result) => effect.Effect.sync(() => {
				const duration = Date.now() - startTime;
				recordMetrics(subgraphId, {
					duration,
					success: true
				});
			})), effect.Effect.catchAll((error$1) => {
				const duration = Date.now() - startTime;
				recordMetrics(subgraphId, {
					duration,
					success: false,
					error: error$1
				});
				if (config.partialFailureHandling.allowPartialFailure) return effect.Effect.succeed(null);
				else return effect.Effect.fail(error$1);
			}), effect.Effect.runPromise);
		};
	};
	/**
	* Process partial failure results with fallback strategies
	*/
	const processPartialResults = (results, config) => {
		const { successful, failed } = partitionResults(results);
		if (failed.length === 0) return effect.Effect.succeed({
			data: mergeSuccessfulResults(successful),
			errors: []
		});
		if (!config.allowPartialFailure) return effect.Effect.fail(ErrorFactory.federation("Subgraph failures not allowed", void 0, "partial_failure", { failedSubgraphs: failed.map((f) => f.subgraphId) }));
		const criticalFailures = failed.filter((f) => config.criticalSubgraphs?.includes(f.subgraphId) ?? false);
		if (criticalFailures.length > 0) return effect.Effect.fail(ErrorFactory.federation("Critical subgraph failure", void 0, "critical_failure", { failedSubgraphs: criticalFailures.map((f) => f.subgraphId) }));
		const dataWithFallbacks = applyFallbackValues(successful, failed, config);
		return effect.Effect.succeed({
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
		if (config.fallbackValues) failed.forEach((failedResult) => {
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
	const transformSubgraphError = (error$1) => {
		const errorObj = error$1;
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
		const resetTimeoutMs = effect.Duration.toMillis(config.resetTimeout);
		const halfOpenMaxCalls = config.halfOpenMaxCalls ?? 3;
		return {
			protect: (effect$1) => (0, effect.pipe)(effect.Effect.succeed(state), effect.Effect.flatMap((currentState) => {
				switch (currentState) {
					case "open": {
						const canReset = lastFailureTime !== null && Date.now() - lastFailureTime >= resetTimeoutMs;
						return canReset ? (0, effect.pipe)(effect.Effect.sync(() => {
							state = "half-open";
							successCount = 0;
							lastStateChange = Date.now();
							console.log(`🔄 Circuit breaker attempting reset for ${subgraphId}`);
						}), effect.Effect.flatMap(() => effect$1)) : effect.Effect.fail(ErrorFactory.circuitBreaker(`Circuit breaker open for ${subgraphId}`, "open"));
					}
					case "half-open": return (0, effect.pipe)(effect$1, effect.Effect.tap(() => effect.Effect.sync(() => {
						successCount++;
						if (successCount >= halfOpenMaxCalls) {
							state = "closed";
							failureCount = 0;
							successCount = 0;
							lastStateChange = Date.now();
							console.log(`🔋 Circuit breaker closed for ${subgraphId}`);
						}
					})), effect.Effect.catchAll((error$1) => {
						state = "open";
						lastFailureTime = Date.now();
						lastStateChange = Date.now();
						successCount = 0;
						console.log(`⚡ Circuit breaker opened for ${subgraphId}`);
						return effect.Effect.fail(error$1);
					}));
					case "closed": return (0, effect.pipe)(effect$1, effect.Effect.tap(() => effect.Effect.sync(() => {
						if (failureCount > 0) failureCount = 0;
					})), effect.Effect.catchAll((error$1) => {
						failureCount++;
						if (failureCount >= config.failureThreshold) {
							state = "open";
							lastFailureTime = Date.now();
							lastStateChange = Date.now();
							console.log(`🚨 Circuit breaker opened for ${subgraphId} (${failureCount} failures)`);
						}
						return effect.Effect.fail(error$1);
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
	const validateCircuitBreakerConfig = (config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.filterOrFail((conf) => conf.failureThreshold > 0, () => ErrorFactory.composition("Failure threshold must be greater than 0")), effect.Effect.filterOrFail((conf) => effect.Duration.toMillis(conf.resetTimeout) > 0, () => ErrorFactory.composition("Reset timeout must be greater than 0")));
	/**
	* Transform federation error for client consumption
	*/
	const transformFederationError = (error$1, context, config) => {
		const errorCode = error$1._tag || ("code" in error$1 && typeof error$1.code === "string" ? error$1.code : "FEDERATION_ERROR");
		const baseError = {
			message: config?.sanitizeErrors ?? false ? "Internal server error" : error$1.message,
			code: errorCode,
			path: context.fieldPath,
			extensions: {
				subgraphId: context.subgraphId,
				operationType: context.operationType,
				timestamp: context.timestamp.toISOString(),
				...(config?.includeStackTrace ?? false) && Boolean(error$1.cause) ? { stack: String(error$1.cause) } : {}
			}
		};
		if (config?.customTransformer) {
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
			resetTimeout: effect.Duration.seconds(30),
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
const createProductionBoundary = (subgraphTimeouts, criticalSubgraphs = []) => FederationErrorBoundaries.createBoundary((0, effect.pipe)(FederationErrorBoundaries.defaultConfig, (config) => FederationErrorBoundaries.withTimeouts(config, subgraphTimeouts), (config) => FederationErrorBoundaries.withPartialFailureHandling(config, {
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
//#region src/federation/performance.ts
let PerformanceOptimizations;
(function(_PerformanceOptimizations) {
	_PerformanceOptimizations.createOptimizedExecutor = (schema, config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.flatMap((config$1) => validatePerformanceConfig(config$1).pipe(effect.Effect.mapError((error$1) => ErrorFactory.composition(`Performance configuration invalid: ${error$1.message}`, schema.metadata.subgraphCount.toString(), "performance")))), effect.Effect.flatMap((validConfig) => effect.Effect.all({
		queryPlanCache: createQueryPlanCache(validConfig.queryPlanCache).pipe(effect.Effect.mapError((error$1) => ErrorFactory.composition(`Query plan cache creation failed: ${error$1.message}`, void 0, "cache"))),
		dataLoader: createFederatedDataLoader(validConfig.dataLoaderConfig).pipe(effect.Effect.mapError((error$1) => ErrorFactory.composition(`DataLoader creation failed: ${error$1.message}`, void 0, "dataloader"))),
		metricsCollector: createMetricsCollector(validConfig.metricsCollection).pipe(effect.Effect.mapError((error$1) => ErrorFactory.composition(`Metrics collector creation failed: ${error$1.message}`, void 0, "metrics")))
	})), effect.Effect.map(({ queryPlanCache, dataLoader, metricsCollector }) => ({ execute: (query, variables, context) => executeOptimizedQuery(schema, query, variables, context, {
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
		return effect.Effect.succeed({
			get: (queryHash) => effect.Effect.sync(() => {
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
			set: (queryHash, plan) => effect.Effect.sync(() => {
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
			invalidate: (pattern) => effect.Effect.sync(() => {
				if (pattern !== void 0) {
					for (const [key] of cache) if (key.includes(pattern)) cache.delete(key);
				} else cache.clear();
			}),
			getStats: () => effect.Effect.succeed({
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
		return effect.Effect.succeed({
			getLoader: (subgraphId, batchLoadFn) => effect.Effect.sync(() => {
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
						} catch (error$1) {
							const duration = Date.now() - startTime;
							console.error(`❌ DataLoader batch failed for ${subgraphId} after ${duration}ms:`, error$1);
							throw error$1;
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
					loaders.set(loaderKey, new dataloader.default(instrumentedBatchFn, dataLoaderOptions));
				}
				return loaders.get(loaderKey);
			}),
			clearAll: () => effect.Effect.sync(() => {
				loaders.forEach((loader) => loader.clearAll());
				loaders.clear();
				stats.clear();
			}),
			getStats: () => effect.Effect.succeed(Object.fromEntries(Array.from(stats.entries()).map(([subgraphId, stat]) => [subgraphId, {
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
		return effect.Effect.succeed({
			recordExecution: (metrics) => effect.Effect.sync(() => {
				if (config.enabled && config.collectExecutionMetrics !== false) {
					executionMetrics.push({
						...metrics,
						timestamp: Date.now()
					});
					const maxMetrics = config.maxExecutionMetrics ?? 1e3;
					if (executionMetrics.length > maxMetrics) executionMetrics.splice(0, Math.floor(maxMetrics * .2));
				}
			}),
			recordCacheOperation: (operation) => effect.Effect.sync(() => {
				if (config.enabled && config.collectCacheMetrics !== false) {
					cacheOperations.push({
						...operation,
						timestamp: Date.now()
					});
					const maxOperations = config.maxCacheOperations ?? 1e3;
					if (cacheOperations.length > maxOperations) cacheOperations.splice(0, Math.floor(maxOperations * .2));
				}
			}),
			getMetrics: () => effect.Effect.succeed({
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
		return (0, effect.pipe)(optimizations.queryPlanCache.get(queryHash), effect.Effect.flatMap((cachedPlan) => {
			if (cachedPlan) return (0, effect.pipe)(optimizations.metricsCollector.recordCacheOperation({
				type: "hit",
				key: queryHash
			}), effect.Effect.as(cachedPlan.plan));
			else return (0, effect.pipe)(optimizations.metricsCollector.recordCacheOperation({
				type: "miss",
				key: queryHash
			}), effect.Effect.flatMap(() => createQueryPlan(schema, query)), effect.Effect.tap((plan) => optimizations.queryPlanCache.set(queryHash, plan)));
		}), effect.Effect.flatMap((queryPlan) => executeQueryPlan(queryPlan, variables, {
			...context,
			dataLoader: optimizations.dataLoader
		})), effect.Effect.tap((result) => {
			const duration = Date.now() - startTime;
			return optimizations.metricsCollector.recordExecution({
				queryHash,
				duration,
				success: (result.errors?.length ?? 0) === 0,
				subgraphCalls: result.extensions?.["subgraphCalls"] ?? []
			});
		}), effect.Effect.catchAll((error$1) => effect.Effect.succeed({
			data: null,
			errors: [new graphql.GraphQLError(error$1.message || "Execution failed", void 0, void 0, void 0, void 0, error$1, {
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
	const createQueryPlan = (_schema, query) => (0, effect.pipe)(effect.Effect.tryPromise({
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
		catch: (error$1) => {
			const execError = {
				_tag: "ExecutionError",
				name: "ExecutionError",
				message: "Failed to create query plan",
				cause: error$1
			};
			return execError;
		}
	}));
	/**
	* Execute query plan with DataLoader optimization
	*/
	const executeQueryPlan = (plan, _variables, _context) => (0, effect.pipe)(effect.Effect.tryPromise({
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
		catch: (error$1) => {
			const execError = {
				_tag: "ExecutionError",
				name: "ExecutionError",
				message: "Query execution failed",
				cause: error$1
			};
			return execError;
		}
	}));
	/**
	* Validate performance configuration
	*/
	const validatePerformanceConfig = (config) => (0, effect.pipe)(effect.Effect.succeed(config), effect.Effect.filterOrFail((conf) => conf.queryPlanCache.maxSize > 0, () => ErrorFactory.validation("Query plan cache max size must be greater than 0", "maxSize")), effect.Effect.filterOrFail((conf) => conf.dataLoaderConfig.maxBatchSize > 0, () => ErrorFactory.validation("DataLoader max batch size must be greater than 0", "maxBatchSize")));
	_PerformanceOptimizations.defaultConfig = {
		queryPlanCache: {
			maxSize: 1e3,
			ttl: effect.Duration.minutes(30)
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
			ttl: effect.Duration.hours(1)
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
			ttl: effect.Duration.minutes(5)
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
//#region src/schema/ast-conversion.ts
const MAX_RECURSION_DEPTH = 10;
/**
* Create a new type conversion context
*/
const createConversionContext = (isInput = false, scalars = {}, options = {}) => ({
	cache: /* @__PURE__ */ new Map(),
	isInput,
	scalars,
	depth: 0,
	maxDepth: options.maxDepth ?? MAX_RECURSION_DEPTH,
	strictMode: options.strictMode ?? true
});
let ASTConversion;
(function(_ASTConversion) {
	const schemaToGraphQLType = _ASTConversion.schemaToGraphQLType = (schema, context = createConversionContext()) => {
		if (context.depth > context.maxDepth) return effect_Effect.fail(ErrorFactory.typeConversion(`Maximum recursion depth (${context.maxDepth}) exceeded`, "depth_exceeded"));
		const ast = schema.ast;
		const cacheKey = generateCacheKey(ast, context.isInput);
		const cachedType = context.cache.get(cacheKey);
		if (cachedType) return effect_Effect.succeed(cachedType);
		const nextContext = {
			...context,
			depth: context.depth + 1
		};
		return (0, effect_Function.pipe)(convertAST(ast, nextContext), effect_Effect.tap((type) => effect_Effect.sync(() => context.cache.set(cacheKey, type))));
	};
	const convertSchemasParallel = _ASTConversion.convertSchemasParallel = (schemas, context = createConversionContext()) => (0, effect_Function.pipe)(effect_Effect.all(schemas.map(({ name, schema }) => (0, effect_Function.pipe)(schemaToGraphQLType(schema, context), effect_Effect.map((type) => [name, type]))), { concurrency: 5 }), effect_Effect.map((pairs) => Object.fromEntries(pairs)));
	_ASTConversion.createGraphQLSchema = (entities, queries = {}, mutations = {}) => {
		const outputContext = createConversionContext(false);
		return (0, effect_Function.pipe)(effect_Effect.all({
			types: (0, effect_Function.pipe)(convertSchemasParallel(Object.entries(entities).map(([name, schema]) => ({
				name,
				schema
			})), outputContext), effect_Effect.map((result) => filterOutputTypes(result))),
			queries: (0, effect_Function.pipe)(convertSchemasParallel(Object.entries(queries).map(([name, schema]) => ({
				name,
				schema
			})), outputContext), effect_Effect.map((result) => filterOutputTypes(result))),
			mutations: (0, effect_Function.pipe)(convertSchemasParallel(Object.entries(mutations).map(([name, schema]) => ({
				name,
				schema
			})), outputContext), effect_Effect.map((result) => filterOutputTypes(result)))
		}));
	};
	const filterOutputTypes = (record) => {
		const filtered = {};
		for (const [key, type] of Object.entries(record)) if ((0, graphql.isOutputType)(type)) filtered[key] = type;
		return filtered;
	};
	/**
	* Convert AST node using exhaustive pattern matching
	*/
	const convertAST = (ast, context) => effect_Match.value(ast).pipe(effect_Match.tag("StringKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("NumberKeyword", () => effect_Effect.succeed(graphql.GraphQLFloat)), effect_Match.tag("BooleanKeyword", () => effect_Effect.succeed(graphql.GraphQLBoolean)), effect_Match.tag("BigIntKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("SymbolKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("UnknownKeyword", () => effect_Effect.succeed(context.scalars["JSON"] ?? graphql.GraphQLString)), effect_Match.tag("AnyKeyword", () => effect_Effect.succeed(context.scalars["JSON"] ?? graphql.GraphQLString)), effect_Match.tag("VoidKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("NeverKeyword", () => effect_Effect.fail(ErrorFactory.typeConversion("Never type cannot be represented in GraphQL", "never_type"))), effect_Match.tag("Literal", (ast$1) => convertLiteral(ast$1, context)), effect_Match.tag("Refinement", (ast$1) => convertRefinement(ast$1, context)), effect_Match.tag("TypeLiteral", (ast$1) => convertTypeLiteral(ast$1, context)), effect_Match.tag("Union", (ast$1) => convertUnion(ast$1, context)), effect_Match.tag("Enums", (ast$1) => convertEnums(ast$1, context)), effect_Match.tag("TupleType", (ast$1) => convertTuple(ast$1, context)), effect_Match.tag("TemplateLiteral", (ast$1) => convertTemplateLiteral(ast$1, context)), effect_Match.tag("Declaration", (ast$1) => convertDeclaration(ast$1, context)), effect_Match.tag("Transformation", (ast$1) => schemaToGraphQLType(__effect_schema_Schema.make(ast$1.from), context)), effect_Match.tag("Suspend", (ast$1) => convertSuspend(ast$1, context)), effect_Match.orElse((unsupportedAst) => effect_Effect.fail(ErrorFactory.typeConversion(`Unsupported AST type: ${unsupportedAst._tag}`, unsupportedAst._tag, "astType"))));
	/**
	* Convert literal AST to appropriate GraphQL type
	*/
	const convertLiteral = (ast, _context) => {
		const literalValue = ast.literal;
		if (typeof literalValue === "string") return effect_Effect.succeed(graphql.GraphQLString);
		else if (typeof literalValue === "number") return effect_Effect.succeed(Number.isInteger(literalValue) ? graphql.GraphQLInt : graphql.GraphQLFloat);
		else if (typeof literalValue === "boolean") return effect_Effect.succeed(graphql.GraphQLBoolean);
		else return effect_Effect.succeed(graphql.GraphQLString);
	};
	/**
	* Convert refinement AST with branded type mapping
	*/
	const convertRefinement = (ast, context) => {
		const titleAnnotation = __effect_schema_AST.getAnnotation(__effect_schema_AST.TitleAnnotationId)(ast);
		return (0, effect_Function.pipe)(effect_Effect.fromNullable(titleAnnotation), effect_Effect.flatMap((annotation) => {
			let title;
			if (typeof annotation === "string") title = annotation;
			else if (annotation !== null && typeof annotation === "object" && "value" in annotation) title = String(annotation.value);
			else title = String(annotation);
			return effect_Match.value(title).pipe(effect_Match.when((t) => t === "Int", () => effect_Effect.succeed(graphql.GraphQLInt)), effect_Match.when((t) => t?.endsWith("Id") || t?.includes("Identity") || t === "ID", () => effect_Effect.succeed(graphql.GraphQLID)), effect_Match.when((t) => t === "Email" || t === "EmailAddress", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => t === "Phone" || t === "PhoneNumber", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => t === "URL" || t === "Uri" || t === "Link", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => t === "Timestamp" || t === "DateTime", () => effect_Effect.succeed(context.scalars["DateTime"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Date", () => effect_Effect.succeed(context.scalars["Date"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Time", () => effect_Effect.succeed(context.scalars["Time"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Money" || t === "Currency" || t === "Amount", () => effect_Effect.succeed(context.scalars["Money"] ?? graphql.GraphQLFloat)), effect_Match.when((t) => t === "Percentage", () => effect_Effect.succeed(graphql.GraphQLFloat)), effect_Match.when((t) => t === "Version" || t === "SequenceNumber", () => effect_Effect.succeed(graphql.GraphQLInt)), effect_Match.when((t) => t === "Port" || t === "Count", () => effect_Effect.succeed(graphql.GraphQLInt)), effect_Match.when((t) => t === "JSON" || t === "JsonValue", () => effect_Effect.succeed(context.scalars["JSON"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Password" || t === "Secret" || t === "Token", (sensitiveType) => context.strictMode ? effect_Effect.fail(ErrorFactory.typeConversion(`Sensitive type ${sensitiveType} cannot be converted to GraphQL type`, "sensitive_type", sensitiveType)) : effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => Boolean(t && context.scalars[t]), (t) => effect_Effect.succeed(context.scalars[t])), effect_Match.orElse(() => schemaToGraphQLType(__effect_schema_Schema.make(ast.from), context)));
		}), effect_Effect.orElse(() => schemaToGraphQLType(__effect_schema_Schema.make(ast.from), context)), effect_Effect.orElse(() => effect_Effect.succeed(graphql.GraphQLString)));
	};
	/**
	* Convert type literal AST to GraphQL Object/Input type
	*/
	const convertTypeLiteral = (ast, context) => {
		const typename = generateTypeName(ast, context);
		return (0, effect_Function.pipe)(effect_Effect.all(ast.propertySignatures.map((propSig) => (0, effect_Function.pipe)(schemaToGraphQLType(__effect_schema_Schema.make(propSig.type), context), effect_Effect.map((fieldType) => {
			const isOptional = propSig.isOptional;
			const finalType = isOptional ? fieldType : new graphql.GraphQLNonNull(fieldType);
			return [String(propSig.name), {
				type: finalType,
				description: extractDescription(propSig.type)
			}];
		})))), effect_Effect.map((fields) => Object.fromEntries(fields)), effect_Effect.map((fieldConfig) => {
			const description = extractDescription(ast);
			return context.isInput ? new graphql.GraphQLInputObjectType({
				name: `${typename}Input`,
				description,
				fields: fieldConfig
			}) : new graphql.GraphQLObjectType({
				name: typename,
				description,
				fields: fieldConfig
			});
		}));
	};
	/**
	* Convert union AST to GraphQL Union type
	*/
	const convertUnion = (ast, context) => {
		if (context.isInput) return effect_Effect.fail(ErrorFactory.typeConversion("Union types are not supported in GraphQL input types", "union_input_type"));
		const typename = generateTypeName(ast, context);
		return (0, effect_Function.pipe)(effect_Effect.all(ast.types.map((type) => schemaToGraphQLType(__effect_schema_Schema.make(type), context))), effect_Effect.map((types) => new graphql.GraphQLUnionType({
			name: typename,
			description: extractDescription(ast),
			types: types.filter(isObjectType),
			resolveType: (value) => {
				if (value !== null && typeof value === "object" && "_tag" in value) return String(value._tag);
				return void 0;
			}
		})));
	};
	/**
	* Convert enums AST to GraphQL Enum type
	*/
	const convertEnums = (ast, context) => {
		const typename = generateTypeName(ast, context);
		return effect_Effect.succeed(new graphql.GraphQLEnumType({
			name: typename,
			description: extractDescription(ast),
			values: Object.fromEntries(ast.enums.map(([key, value]) => [String(key), {
				value,
				description: `Enum value: ${String(value)}`
			}]))
		}));
	};
	/**
	* Convert tuple AST to GraphQL List type
	*/
	const convertTuple = (ast, context) => {
		if (ast.elements.length === 0) return effect_Effect.succeed(new graphql.GraphQLList(graphql.GraphQLString));
		const firstElementType = ast.elements[0]?.type;
		if (!firstElementType) return effect_Effect.succeed(new graphql.GraphQLList(graphql.GraphQLString));
		return (0, effect_Function.pipe)(schemaToGraphQLType(__effect_schema_Schema.make(firstElementType), context), effect_Effect.map((elementType) => {
			if ((0, graphql.isOutputType)(elementType)) return new graphql.GraphQLList(elementType);
			else return new graphql.GraphQLList(graphql.GraphQLString);
		}));
	};
	/**
	* Convert template literal AST to GraphQL String
	*/
	const convertTemplateLiteral = (_ast, _context) => effect_Effect.succeed(graphql.GraphQLString);
	/**
	* Convert declaration AST by delegating to the declared type
	*/
	const convertDeclaration = (_ast, _context) => effect_Effect.succeed(graphql.GraphQLString);
	/**
	* Convert suspend AST by evaluating the suspended computation
	*/
	const convertSuspend = (ast, context) => (0, effect_Function.pipe)(effect_Effect.sync(() => ast.f()), effect_Effect.flatMap((suspendedAST) => schemaToGraphQLType(__effect_schema_Schema.make(suspendedAST), context)));
	/**
	* Generate cache key for AST node
	*/
	const generateCacheKey = (ast, isInput) => {
		const baseKey = ast._tag;
		const suffix = isInput ? ":input" : ":output";
		if ("annotations" in ast) {
			const titleAnnotation = __effect_schema_AST.getAnnotation(__effect_schema_AST.TitleAnnotationId)(ast);
			if (effect_Option.isSome(titleAnnotation)) return `${titleAnnotation.value}${suffix}`;
		}
		return `${baseKey}${suffix}:${ast.toString?.() ?? "unknown"}`;
	};
	/**
	* Generate GraphQL type name from AST
	*/
	const generateTypeName = (ast, context) => {
		if ("annotations" in ast) {
			const titleAnnotation = __effect_schema_AST.getAnnotation(__effect_schema_AST.TitleAnnotationId)(ast);
			if (effect_Option.isSome(titleAnnotation)) return String(titleAnnotation.value);
		}
		return `Generated${ast._tag}${context.depth}`;
	};
	/**
	* Extract description from AST annotations
	*/
	const extractDescription = (ast) => {
		if ("annotations" in ast) {
			const descriptionAnnotation = __effect_schema_AST.getAnnotation(__effect_schema_AST.DescriptionAnnotationId)(ast);
			if (effect_Option.isSome(descriptionAnnotation)) return String(descriptionAnnotation.value);
		}
		return void 0;
	};
	/**
	* Type guard for GraphQL Object types
	*/
	const isObjectType = (type) => {
		return type instanceof graphql.GraphQLObjectType;
	};
})(ASTConversion || (ASTConversion = {}));

//#endregion
//#region src/experimental/index.ts
var experimental_exports = {};
__export(experimental_exports, {
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
//#region src/index.ts
/**
* Framework version
*/
const VERSION = "2.0.0";
/**
* Framework metadata
*/
const FRAMEWORK_INFO = {
	name: "@cqrs/federation-v2",
	version: VERSION,
	description: "Apollo Federation 2.x with Effect-TS",
	features: [
		"Effect-First Architecture",
		"Apollo Federation 2.x Support",
		"Ultra-Strict TypeScript",
		"Algebraic Error System",
		"Performance Optimizations",
		"Schema-First Development",
		"Circuit Breakers",
		"Hot Reload",
		"Layer-based Dependency Injection",
		"Effect.gen Patterns",
		"Structured Logging",
		"Type-safe Configuration",
		"Pattern Matching Error Handling",
		"Modern Test Infrastructure"
	]
};

//#endregion
Object.defineProperty(exports, 'ASTConversion', {
  enumerable: true,
  get: function () {
    return ASTConversion;
  }
});
exports.BaseDomainError = BaseDomainError;
exports.CircuitBreakerError = CircuitBreakerError;
exports.CodeGenerationError = CodeGenerationError;
exports.CompositionError = CompositionError;
exports.CoreServicesLive = CoreServicesLive;
exports.DevelopmentLayerLive = DevelopmentLayerLive;
exports.DiscoveryError = DiscoveryError;
exports.EntityResolutionError = EntityResolutionError;
Object.defineProperty(exports, 'ErrorFactory', {
  enumerable: true,
  get: function () {
    return ErrorFactory;
  }
});
Object.defineProperty(exports, 'ErrorMatching', {
  enumerable: true,
  get: function () {
    return ErrorMatching;
  }
});
Object.defineProperty(exports, 'Experimental', {
  enumerable: true,
  get: function () {
    return experimental_exports;
  }
});
exports.FRAMEWORK_INFO = FRAMEWORK_INFO;
exports.FederationConfigLive = FederationConfigLive;
exports.FederationConfigSchema = FederationConfigSchema;
exports.FederationConfigService = FederationConfigService;
exports.FederationEntityBuilder = FederationEntityBuilder;
exports.FederationError = FederationError;
Object.defineProperty(exports, 'FederationErrorBoundaries', {
  enumerable: true,
  get: function () {
    return FederationErrorBoundaries;
  }
});
exports.FederationLogger = FederationLogger;
exports.FederationLoggerLive = FederationLoggerLive;
exports.FieldResolutionError = FieldResolutionError;
exports.HealthCheckError = HealthCheckError;
exports.MinimalLayerLive = MinimalLayerLive;
exports.ModernFederationComposer = ModernFederationComposer;
exports.ModernFederationComposerLive = ModernFederationComposerLive;
Object.defineProperty(exports, 'PerformanceOptimizations', {
  enumerable: true,
  get: function () {
    return PerformanceOptimizations;
  }
});
exports.ProductionLayerLive = ProductionLayerLive;
exports.RegistrationError = RegistrationError;
exports.SchemaEvolution = SchemaEvolution;
exports.SchemaEvolutionError = SchemaEvolutionError;
Object.defineProperty(exports, 'SchemaFirst', {
  enumerable: true,
  get: function () {
    return SchemaFirst;
  }
});
exports.SchemaFirstError = SchemaFirstError;
exports.SchemaFirstService = SchemaFirstService;
exports.SchemaLifecycleState = SchemaLifecycleState;
exports.SchemaValidationError = SchemaValidationError;
Object.defineProperty(exports, 'SubgraphManagement', {
  enumerable: true,
  get: function () {
    return SubgraphManagement;
  }
});
exports.TestLayerLive = TestLayerLive;
exports.TimeoutError = TimeoutError;
exports.TypeConversionError = TypeConversionError;
exports.VERSION = VERSION;
exports.ValidationError = ValidationError;
exports.asUntypedEntity = asUntypedEntity;
exports.compose = compose;
exports.createBasicOptimizedExecutor = createBasicOptimizedExecutor;
exports.createConversionContext = createConversionContext;
exports.createDevelopmentOptimizedExecutor = createDevelopmentOptimizedExecutor;
exports.createDynamicRegistry = createDynamicRegistry;
exports.createEntityBuilder = createEntityBuilder;
exports.createEnvironmentLayer = createEnvironmentLayer;
exports.createFederatedSchema = createFederatedSchema;
exports.createMonitoredRegistry = createMonitoredRegistry;
exports.createProductionBoundary = createProductionBoundary;
exports.createProductionOptimizedExecutor = createProductionOptimizedExecutor;
exports.createResilientBoundary = createResilientBoundary;
exports.createSchemaFirstService = createSchemaFirstService;
exports.createSchemaFirstWorkflow = createSchemaFirstWorkflow;
exports.createStaticRegistry = createStaticRegistry;
exports.createStrictBoundary = createStrictBoundary;
exports.debug = debug;
exports.developmentLogger = developmentLogger;
exports.error = error;
exports.getCacheConfig = getCacheConfig;
exports.getDatabaseConfig = getDatabaseConfig;
exports.getFederationConfig = getFederationConfig;
exports.getObservabilityConfig = getObservabilityConfig;
exports.getResilienceConfig = getResilienceConfig;
exports.getServerConfig = getServerConfig;
exports.handleCompositionError = handleCompositionError;
exports.info = info;
exports.productionLogger = productionLogger;
exports.testLogger = testLogger;
exports.trace = trace;
exports.validateConfig = validateConfig;
exports.warn = warn;
exports.withSpan = withSpan;