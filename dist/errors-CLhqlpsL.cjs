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
const effect_Function = __toESM(require("effect/Function"));
const effect_Match = __toESM(require("effect/Match"));

//#region src/runtime/core/errors/errors.ts
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
		onFailure: (error) => effect_Match.value(error).pipe(effect_Match.tag("ValidationError", (err) => `Invalid ${err.field ?? "field"}: ${err.message}`), effect_Match.tag("SchemaValidationError", (err) => `Data format error: ${err.violations.map((v) => v.message).join(", ")}`), effect_Match.tag("EntityResolutionError", (err) => `Could not find ${err.entityType ?? "entity"}: ${err.message}`), effect_Match.tag("FieldResolutionError", (err) => `Field resolution failed for ${err.fieldName ?? "field"}: ${err.message}`), effect_Match.tag("FederationError", (err) => `Federation error: ${err.message}`), effect_Match.tag("CircuitBreakerError", () => "Service temporarily unavailable, please try again"), effect_Match.tag("TimeoutError", () => "Request timed out, please try again"), effect_Match.tag("CompositionError", (err) => `Schema composition failed: ${err.message}`), effect_Match.tag("TypeConversionError", (err) => `Type conversion failed: ${err.message}`), effect_Match.tag("RegistrationError", (err) => `Service registration failed: ${err.message}`), effect_Match.tag("DiscoveryError", (err) => `Service discovery failed: ${err.message}`), effect_Match.tag("HealthCheckError", (err) => `Health check failed: ${err.message}`), effect_Match.exhaustive),
		onSuccess: () => "Operation completed successfully"
	}));
	_ErrorMatching.isRetryable = (error) => effect_Match.value(error).pipe(effect_Match.tag("ValidationError", () => false), effect_Match.tag("SchemaValidationError", () => false), effect_Match.tag("EntityResolutionError", () => true), effect_Match.tag("FieldResolutionError", () => true), effect_Match.tag("FederationError", () => false), effect_Match.tag("CircuitBreakerError", () => true), effect_Match.tag("TimeoutError", () => true), effect_Match.tag("CompositionError", () => false), effect_Match.tag("TypeConversionError", () => false), effect_Match.tag("RegistrationError", () => true), effect_Match.tag("DiscoveryError", () => true), effect_Match.tag("HealthCheckError", () => true), effect_Match.exhaustive);
	_ErrorMatching.getSeverity = (error) => effect_Match.value(error).pipe(effect_Match.tag("ValidationError", () => "medium"), effect_Match.tag("SchemaValidationError", () => "medium"), effect_Match.tag("EntityResolutionError", () => "high"), effect_Match.tag("FieldResolutionError", () => "medium"), effect_Match.tag("FederationError", () => "high"), effect_Match.tag("CircuitBreakerError", () => "high"), effect_Match.tag("TimeoutError", () => "medium"), effect_Match.tag("CompositionError", () => "high"), effect_Match.tag("TypeConversionError", () => "medium"), effect_Match.tag("RegistrationError", () => "high"), effect_Match.tag("DiscoveryError", () => "high"), effect_Match.tag("HealthCheckError", () => "medium"), effect_Match.exhaustive);
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
Object.defineProperty(exports, 'BaseDomainError', {
  enumerable: true,
  get: function () {
    return BaseDomainError;
  }
});
Object.defineProperty(exports, 'CircuitBreakerError', {
  enumerable: true,
  get: function () {
    return CircuitBreakerError;
  }
});
Object.defineProperty(exports, 'CompositionError', {
  enumerable: true,
  get: function () {
    return CompositionError;
  }
});
Object.defineProperty(exports, 'DiscoveryError', {
  enumerable: true,
  get: function () {
    return DiscoveryError;
  }
});
Object.defineProperty(exports, 'EntityResolutionError', {
  enumerable: true,
  get: function () {
    return EntityResolutionError;
  }
});
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
Object.defineProperty(exports, 'FederationError', {
  enumerable: true,
  get: function () {
    return FederationError;
  }
});
Object.defineProperty(exports, 'FieldResolutionError', {
  enumerable: true,
  get: function () {
    return FieldResolutionError;
  }
});
Object.defineProperty(exports, 'HealthCheckError', {
  enumerable: true,
  get: function () {
    return HealthCheckError;
  }
});
Object.defineProperty(exports, 'RegistrationError', {
  enumerable: true,
  get: function () {
    return RegistrationError;
  }
});
Object.defineProperty(exports, 'SchemaValidationError', {
  enumerable: true,
  get: function () {
    return SchemaValidationError;
  }
});
Object.defineProperty(exports, 'TimeoutError', {
  enumerable: true,
  get: function () {
    return TimeoutError;
  }
});
Object.defineProperty(exports, 'TypeConversionError', {
  enumerable: true,
  get: function () {
    return TypeConversionError;
  }
});
Object.defineProperty(exports, 'ValidationError', {
  enumerable: true,
  get: function () {
    return ValidationError;
  }
});
Object.defineProperty(exports, '__export', {
  enumerable: true,
  get: function () {
    return __export;
  }
});
Object.defineProperty(exports, '__toESM', {
  enumerable: true,
  get: function () {
    return __toESM;
  }
});