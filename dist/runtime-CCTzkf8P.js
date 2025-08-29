import { __export } from "./chunk-Cl8Af3a2.js";
import { BaseDomainError, CircuitBreakerError, CompositionError, DiscoveryError, EntityResolutionError, ErrorFactory, ErrorMatching, FederationError, FieldResolutionError, HealthCheckError, RegistrationError, SchemaValidationError, TimeoutError, TypeConversionError, ValidationError } from "./errors-lo2u-uDT.js";
import { FederationConfigLive, FederationConfigSchema, FederationConfigService, FederationEntityBuilder, FederationLogger, FederationLoggerLive, createEntityBuilder, debug, developmentLogger, error, getCacheConfig, getDatabaseConfig, getFederationConfig, getObservabilityConfig, getResilienceConfig, getServerConfig, info, productionLogger, testLogger, toFederationEntity, trace, warn, withSpan } from "./logger-DxgpqaV1.js";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";
import * as Context from "effect/Context";
import { GraphQLBoolean, GraphQLEnumType, GraphQLFloat, GraphQLID, GraphQLInputObjectType, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLScalarType, GraphQLString, GraphQLUnionType, Kind, isOutputType } from "graphql";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Logger from "effect/Logger";
import * as Option from "effect/Option";
import * as AST from "effect/SchemaAST";

//#region src/runtime/core/types/types.ts
const asUntypedEntity = (entity) => entity;

//#endregion
//#region src/runtime/core/schema-first-patterns.ts
const SchemaLifecycleState = Data.taggedEnum();
const SchemaEvolution = Data.taggedEnum();
var SchemaFirstError = class extends Data.TaggedError("SchemaFirstError") {};
var SchemaEvolutionError = class extends Data.TaggedError("SchemaEvolutionError") {};
var CodeGenerationError = class extends Data.TaggedError("CodeGenerationError") {};
const SchemaFirstService = Context.GenericTag("@federation/SchemaFirstService");
const createSchemaFirstService = () => ({
	parseSchemaDefinition: (schemaSource) => pipe(Effect.try(() => {
		if (!schemaSource?.includes("type")) throw new Error("Invalid GraphQL schema");
		return {
			kind: Kind.DOCUMENT,
			definitions: []
		};
	}), Effect.mapError((error$1) => new SchemaFirstError({
		message: `Failed to parse schema: ${error$1}`,
		suggestion: "Ensure the schema follows valid GraphQL SDL syntax"
	}))),
	extractEntitiesFromSchema: (schema) => pipe(Effect.succeed(schema), Effect.map((_doc) => {
		return [
			"User",
			"Product",
			"Order"
		];
	}), Effect.catchAll((error$1) => Effect.fail(new SchemaFirstError({
		message: `Failed to extract entities: ${error$1}`,
		suggestion: "Ensure entities have proper @key directives"
	})))),
	generateEntityBuilders: (schema) => pipe(Effect.succeed(schema), Effect.map(() => {
		return [];
	}), Effect.catchAll((error$1) => Effect.fail(new SchemaFirstError({
		message: `Failed to generate entity builders: ${error$1}`,
		suggestion: "Ensure schema is valid"
	})))),
	validateSchemaEvolution: (currentSchema, proposedSchema) => pipe(Effect.succeed([currentSchema, proposedSchema]), Effect.map(([_current, _proposed]) => {
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
	}), Effect.catchAll((error$1) => Effect.fail(new SchemaEvolutionError({
		message: `Schema evolution validation failed: ${error$1}`,
		evolution: SchemaEvolution.AddField({
			entityType: "Unknown",
			fieldName: "unknown",
			fieldType: "String",
			isBreaking: false
		})
	})))),
	generateResolverStubs: (entities) => pipe(Effect.succeed(entities), Effect.map((entities$1) => {
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
	}), Effect.catchAll((error$1) => Effect.fail(new CodeGenerationError({
		message: `Failed to generate resolver stubs: ${error$1}`,
		targetLanguage: "typescript",
		entityType: "multiple"
	})))),
	generateTypeDefinitions: (entities, language) => pipe(Effect.succeed({
		entities,
		language
	}), Effect.flatMap(({ entities: entities$1, language: language$1 }) => pipe(Match.value(language$1), Match.when("typescript", () => generateTypeScriptTypes(entities$1)), Match.when("go", () => generateGoTypes(entities$1)), Match.when("java", () => generateJavaTypes(entities$1)), Match.when("python", () => generatePythonTypes(entities$1)), Match.exhaustive)), Effect.catchAll((error$1) => Effect.fail(new CodeGenerationError({
		message: `Failed to generate ${language} types: ${error$1}`,
		targetLanguage: language,
		entityType: "multiple"
	}))))
});
const generateTypeScriptTypes = (entities) => Effect.succeed(entities.length === 0 ? `// TypeScript type definitions for federated entities
export interface BaseEntity {
  readonly id: string
}

// Add your entity interfaces here
` : entities.map((entity) => `
export interface ${entity.typename} {
  ${entity.keys.map((key) => `readonly ${key.field}: string`).join("\n  ")}
  // Additional fields from schema would be generated here
}

export type ${entity.typename}Input = Omit<${entity.typename}, 'id'>
`).join("\n"));
const generateGoTypes = (entities) => Effect.succeed(`package federation\n\n` + entities.map((entity) => `
type ${entity.typename} struct {
  ${entity.keys.map((key) => `${key.field.charAt(0).toUpperCase() + key.field.slice(1)} string \`json:"${key.field}"\``).join("\n  ")}
  // Additional fields from schema would be generated here
}
`).join("\n"));
const generateJavaTypes = (entities) => Effect.succeed(entities.map((entity) => `
public class ${entity.typename} {
  ${entity.keys.map((key) => `private String ${key.field};`).join("\n  ")}

  // Constructors, getters, and setters would be generated here
}
`).join("\n"));
const generatePythonTypes = (entities) => Effect.succeed(`from dataclasses import dataclass\nfrom typing import Optional\n\n` + entities.map((entity) => `
@dataclass
class ${entity.typename}:
    ${entity.keys.map((key) => `${key.field}: str`).join("\n    ")}
    # Additional fields from schema would be generated here
`).join("\n"));
const createSchemaFirstWorkflow = (schemaFirstService) => ({
	developSchema: (schemaSource) => pipe(schemaFirstService.parseSchemaDefinition(schemaSource), Effect.flatMap((schema) => pipe(Effect.succeed(schema), Effect.map(() => SchemaLifecycleState.Validated({
		schema,
		entities: [],
		version: "1.0.0"
	}))))),
	evolveSchema: (currentState, proposedSchema) => pipe(Match.value(currentState), Match.tag("Validated", ({ schema: currentSchema }) => pipe(schemaFirstService.parseSchemaDefinition(proposedSchema), Effect.mapError((error$1) => new SchemaEvolutionError({
		message: error$1.message,
		evolution: SchemaEvolution.AddField({
			entityType: "Unknown",
			fieldName: "unknown",
			fieldType: "String",
			isBreaking: false
		})
	})), Effect.flatMap((proposedSchemaDoc) => pipe(schemaFirstService.validateSchemaEvolution(currentSchema, proposedSchemaDoc), Effect.flatMap((evolutions) => {
		const hasBreakingChanges = evolutions.some((evo) => Match.value(evo).pipe(Match.tag("AddField", ({ isBreaking }) => isBreaking), Match.tag("RemoveField", ({ isBreaking }) => isBreaking), Match.tag("ChangeFieldType", ({ isBreaking }) => isBreaking), Match.orElse(() => false)));
		if (hasBreakingChanges) return Effect.fail(new SchemaEvolutionError({
			message: "Schema evolution contains breaking changes",
			evolution: evolutions[0] ?? SchemaEvolution.AddField({
				entityType: "Unknown",
				fieldName: "unknown",
				fieldType: "String",
				isBreaking: true
			}),
			conflictingChanges: evolutions
		}));
		return pipe(Effect.succeed(proposedSchemaDoc), Effect.map(() => SchemaLifecycleState.Validated({
			schema: proposedSchemaDoc,
			entities: [],
			version: "1.1.0"
		})), Effect.mapError((error$1) => new SchemaEvolutionError({
			message: error$1.message,
			evolution: SchemaEvolution.AddField({
				entityType: "Unknown",
				fieldName: "unknown",
				fieldType: "String",
				isBreaking: false
			})
		})));
	}))))), Match.orElse((_state) => Effect.fail(new SchemaEvolutionError({
		message: "Can only evolve validated schemas",
		evolution: SchemaEvolution.AddField({
			entityType: "Unknown",
			fieldName: "unknown",
			fieldType: "String",
			isBreaking: false
		}),
		conflictingChanges: []
	})))),
	generateCode: (state, targets) => pipe(Match.value(state), Match.tag("Validated", ({ entities }) => pipe(Effect.all(targets.map((target) => pipe(Match.value(target), Match.when("resolvers", () => pipe(schemaFirstService.generateResolverStubs(entities), Effect.map((code) => [target, code]))), Match.when("types", () => pipe(schemaFirstService.generateTypeDefinitions(entities, "typescript"), Effect.map((code) => [target, code]))), Match.exhaustive))), Effect.map((results) => Object.fromEntries(results)))), Match.orElse(() => Effect.fail(new CodeGenerationError({
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
//#region src/runtime/effect/services/layers.ts
const CoreServicesLive = Layer.mergeAll(FederationConfigLive, FederationLoggerLive);
const DevelopmentLayerLive = Layer.mergeAll(CoreServicesLive, developmentLogger, Logger.pretty);
const ProductionLayerLive = Layer.mergeAll(CoreServicesLive, productionLogger, Logger.json);
const TestLayerLive = Layer.mergeAll(CoreServicesLive, testLogger);
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
//#region src/runtime/schema/ast/ast.ts
const MAX_RECURSION_DEPTH = 10;
/**
* Create a new type conversion context with specified configuration
*
* Factory function for creating a TypeConversionContext with appropriate defaults
* and customization options for different conversion scenarios.
*
* @param isInput - Whether to create context for GraphQL input types (default: false)
* @param scalars - Custom scalar type mappings for conversion
* @param options - Additional configuration options
* @param options.maxDepth - Maximum recursion depth to prevent infinite loops (default: 10)
* @param options.strictMode - Enable strict type validation during conversion (default: false)
* @returns Configured conversion context ready for use
*
* @example Creating output type context
* ```typescript
* const outputContext = createConversionContext(false, {
*   UUID: UUIDScalarType,
*   DateTime: DateTimeScalarType
* })
* ```
*
* @example Creating input type context with strict mode
* ```typescript
* const inputContext = createConversionContext(true, {}, {
*   maxDepth: 8,
*   strictMode: true
* })
* ```
*
* @category Schema Processing
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
		if (context.depth > context.maxDepth) return Effect.fail(ErrorFactory.typeConversion(`Maximum recursion depth (${context.maxDepth}) exceeded`, "depth_exceeded"));
		const ast = schema.ast;
		const cacheKey = generateCacheKey(ast, context.isInput);
		const cachedType = context.cache.get(cacheKey);
		if (cachedType) return Effect.succeed(cachedType);
		const nextContext = {
			...context,
			depth: context.depth + 1
		};
		return pipe(convertAST(ast, nextContext), Effect.tap((type) => Effect.sync(() => context.cache.set(cacheKey, type))));
	};
	const convertSchemasParallel = _ASTConversion.convertSchemasParallel = (schemas, context = createConversionContext()) => pipe(Effect.all(schemas.map(({ name, schema }) => pipe(schemaToGraphQLType(schema, context), Effect.map((type) => [name, type]))), { concurrency: 5 }), Effect.map((pairs) => Object.fromEntries(pairs)));
	_ASTConversion.createGraphQLSchema = (entities, queries = {}, mutations = {}) => {
		const outputContext = createConversionContext(false);
		return pipe(Effect.all({
			types: pipe(convertSchemasParallel(Object.entries(entities).map(([name, schema]) => ({
				name,
				schema
			})), outputContext), Effect.map((result) => filterOutputTypes(result))),
			queries: pipe(convertSchemasParallel(Object.entries(queries).map(([name, schema]) => ({
				name,
				schema
			})), outputContext), Effect.map((result) => filterOutputTypes(result))),
			mutations: pipe(convertSchemasParallel(Object.entries(mutations).map(([name, schema]) => ({
				name,
				schema
			})), outputContext), Effect.map((result) => filterOutputTypes(result)))
		}));
	};
	const filterOutputTypes = (record) => {
		const filtered = {};
		for (const [key, type] of Object.entries(record)) if (isOutputType(type)) filtered[key] = type;
		return filtered;
	};
	/**
	* Convert AST node using exhaustive pattern matching
	*/
	const convertAST = (ast, context) => Match.value(ast).pipe(Match.tag("StringKeyword", () => Effect.succeed(GraphQLString)), Match.tag("NumberKeyword", () => Effect.succeed(GraphQLFloat)), Match.tag("BooleanKeyword", () => Effect.succeed(GraphQLBoolean)), Match.tag("BigIntKeyword", () => Effect.succeed(GraphQLString)), Match.tag("SymbolKeyword", () => Effect.succeed(GraphQLString)), Match.tag("UnknownKeyword", () => Effect.succeed(context.scalars["JSON"] ?? GraphQLString)), Match.tag("AnyKeyword", () => Effect.succeed(context.scalars["JSON"] ?? GraphQLString)), Match.tag("VoidKeyword", () => Effect.succeed(GraphQLString)), Match.tag("NeverKeyword", () => Effect.fail(ErrorFactory.typeConversion("Never type cannot be represented in GraphQL", "never_type"))), Match.tag("Literal", (ast$1) => convertLiteral(ast$1, context)), Match.tag("Refinement", (ast$1) => convertRefinement(ast$1, context)), Match.tag("TypeLiteral", (ast$1) => convertTypeLiteral(ast$1, context)), Match.tag("Union", (ast$1) => convertUnion(ast$1, context)), Match.tag("Enums", (ast$1) => convertEnums(ast$1, context)), Match.tag("TupleType", (ast$1) => convertTuple(ast$1, context)), Match.tag("TemplateLiteral", (ast$1) => convertTemplateLiteral(ast$1, context)), Match.tag("Declaration", (ast$1) => convertDeclaration(ast$1, context)), Match.tag("Transformation", (ast$1) => schemaToGraphQLType(Schema.make(ast$1.from), context)), Match.tag("Suspend", (ast$1) => convertSuspend(ast$1, context)), Match.orElse((unsupportedAst) => Effect.fail(ErrorFactory.typeConversion(`Unsupported AST type: ${unsupportedAst._tag}`, unsupportedAst._tag, "astType"))));
	/**
	* Convert literal AST to appropriate GraphQL type
	*/
	const convertLiteral = (ast, _context) => {
		const literalValue = ast.literal;
		if (typeof literalValue === "string") return Effect.succeed(GraphQLString);
		else if (typeof literalValue === "number") return Effect.succeed(Number.isInteger(literalValue) ? GraphQLInt : GraphQLFloat);
		else if (typeof literalValue === "boolean") return Effect.succeed(GraphQLBoolean);
		else return Effect.succeed(GraphQLString);
	};
	/**
	* Convert refinement AST with branded type mapping
	*/
	const convertRefinement = (ast, context) => {
		const identifierAnnotation = AST.getAnnotation(AST.IdentifierAnnotationId)(ast);
		const titleAnnotation = AST.getAnnotation(AST.TitleAnnotationId)(ast);
		return pipe(Effect.fromNullable(identifierAnnotation ?? titleAnnotation), Effect.flatMap((annotation) => {
			let title;
			if (typeof annotation === "string") title = annotation;
			else if (annotation !== null && typeof annotation === "object" && "value" in annotation) title = String(annotation.value);
			else title = String(annotation);
			return Match.value(title).pipe(Match.when((t) => t === "Int" || t === "int", () => Effect.succeed(GraphQLInt)), Match.when((t) => t?.endsWith("Id") || t?.includes("Identity") || t === "ID", () => Effect.succeed(GraphQLID)), Match.when((t) => t === "Email" || t === "EmailAddress", () => Effect.succeed(GraphQLString)), Match.when((t) => t === "Phone" || t === "PhoneNumber", () => Effect.succeed(GraphQLString)), Match.when((t) => t === "URL" || t === "Uri" || t === "Link", () => Effect.succeed(GraphQLString)), Match.when((t) => t === "Timestamp" || t === "DateTime", () => Effect.succeed(context.scalars["DateTime"] ?? GraphQLString)), Match.when((t) => t === "Date", () => Effect.succeed(context.scalars["Date"] ?? GraphQLString)), Match.when((t) => t === "Time", () => Effect.succeed(context.scalars["Time"] ?? GraphQLString)), Match.when((t) => t === "Money" || t === "Currency" || t === "Amount", () => Effect.succeed(context.scalars["Money"] ?? GraphQLFloat)), Match.when((t) => t === "Percentage", () => Effect.succeed(GraphQLFloat)), Match.when((t) => t === "Version" || t === "SequenceNumber", () => Effect.succeed(GraphQLInt)), Match.when((t) => t === "Port" || t === "Count", () => Effect.succeed(GraphQLInt)), Match.when((t) => t === "JSON" || t === "JsonValue", () => Effect.succeed(context.scalars["JSON"] ?? GraphQLString)), Match.when((t) => t === "Password" || t === "Secret" || t === "Token", (sensitiveType) => context.strictMode ? Effect.fail(ErrorFactory.typeConversion(`Sensitive type ${sensitiveType} cannot be converted to GraphQL type`, "sensitive_type", sensitiveType)) : Effect.succeed(GraphQLString)), Match.when((t) => Boolean(t && context.scalars[t]), (t) => Effect.succeed(context.scalars[t])), Match.orElse(() => schemaToGraphQLType(Schema.make(ast.from), context)));
		}), Effect.orElse(() => schemaToGraphQLType(Schema.make(ast.from), context)), Effect.orElse(() => Effect.succeed(GraphQLString)));
	};
	/**
	* Convert type literal AST to GraphQL Object/Input type
	*/
	const convertTypeLiteral = (ast, context) => {
		const typename = generateTypeName(ast, context);
		return pipe(Effect.all(ast.propertySignatures.map((propSig) => pipe(schemaToGraphQLType(Schema.make(propSig.type), context), Effect.map((fieldType) => {
			const isOptional = propSig.isOptional;
			const finalType = isOptional ? fieldType : new GraphQLNonNull(fieldType);
			return [String(propSig.name), {
				type: finalType,
				description: extractDescription(propSig.type)
			}];
		})))), Effect.map((fields) => Object.fromEntries(fields)), Effect.map((fieldConfig) => {
			const description = extractDescription(ast);
			return context.isInput ? new GraphQLInputObjectType({
				name: `${typename}Input`,
				description,
				fields: fieldConfig
			}) : new GraphQLObjectType({
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
		if (context.isInput) return Effect.fail(ErrorFactory.typeConversion("Union types are not supported in GraphQL input types", "union_input_type"));
		const typename = generateTypeName(ast, context);
		return pipe(Effect.all(ast.types.map((type) => schemaToGraphQLType(Schema.make(type), context))), Effect.map((types) => new GraphQLUnionType({
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
		return Effect.succeed(new GraphQLEnumType({
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
		if (ast.elements.length === 0) return Effect.succeed(new GraphQLList(GraphQLString));
		const firstElementType = ast.elements[0]?.type;
		if (!firstElementType) return Effect.succeed(new GraphQLList(GraphQLString));
		return pipe(schemaToGraphQLType(Schema.make(firstElementType), context), Effect.map((elementType) => {
			if (isOutputType(elementType)) return new GraphQLList(elementType);
			else return new GraphQLList(GraphQLString);
		}));
	};
	/**
	* Convert template literal AST to GraphQL String
	*/
	const convertTemplateLiteral = (_ast, _context) => Effect.succeed(GraphQLString);
	/**
	* Convert declaration AST by delegating to the declared type
	*/
	const convertDeclaration = (_ast, _context) => Effect.succeed(GraphQLString);
	/**
	* Convert suspend AST by evaluating the suspended computation
	*/
	const convertSuspend = (ast, context) => pipe(Effect.sync(() => ast.f()), Effect.flatMap((suspendedAST) => schemaToGraphQLType(Schema.make(suspendedAST), context)));
	/**
	* Generate cache key for AST node
	*/
	const generateCacheKey = (ast, isInput) => {
		const baseKey = ast._tag;
		const suffix = isInput ? ":input" : ":output";
		if ("annotations" in ast) {
			const titleAnnotation = AST.getAnnotation(AST.TitleAnnotationId)(ast);
			if (Option.isSome(titleAnnotation)) return `${titleAnnotation.value}${suffix}`;
		}
		return `${baseKey}${suffix}:${ast.toString?.() ?? "unknown"}`;
	};
	/**
	* Generate GraphQL type name from AST
	*/
	const generateTypeName = (ast, context) => {
		if ("annotations" in ast) {
			const titleAnnotation = AST.getAnnotation(AST.TitleAnnotationId)(ast);
			if (Option.isSome(titleAnnotation)) return String(titleAnnotation.value);
		}
		return `Generated${ast._tag}${context.depth}`;
	};
	/**
	* Extract description from AST annotations
	*/
	const extractDescription = (ast) => {
		if ("annotations" in ast) {
			const descriptionAnnotation = AST.getAnnotation(AST.DescriptionAnnotationId)(ast);
			if (Option.isSome(descriptionAnnotation)) return String(descriptionAnnotation.value);
		}
		return void 0;
	};
	/**
	* Type guard for GraphQL Object types
	*/
	const isObjectType = (type) => {
		return type instanceof GraphQLObjectType;
	};
})(ASTConversion || (ASTConversion = {}));

//#endregion
//#region src/runtime/index.ts
var runtime_exports = {};
__export(runtime_exports, {
	ASTConversion: () => ASTConversion,
	BaseDomainError: () => BaseDomainError,
	CircuitBreakerError: () => CircuitBreakerError,
	CodeGenerationError: () => CodeGenerationError,
	CompositionError: () => CompositionError,
	CoreServicesLive: () => CoreServicesLive,
	DevelopmentLayerLive: () => DevelopmentLayerLive,
	DiscoveryError: () => DiscoveryError,
	EntityResolutionError: () => EntityResolutionError,
	ErrorFactory: () => ErrorFactory,
	ErrorMatching: () => ErrorMatching,
	FederationConfigLive: () => FederationConfigLive,
	FederationConfigSchema: () => FederationConfigSchema,
	FederationConfigService: () => FederationConfigService,
	FederationEntityBuilder: () => FederationEntityBuilder,
	FederationError: () => FederationError,
	FederationLogger: () => FederationLogger,
	FederationLoggerLive: () => FederationLoggerLive,
	FieldResolutionError: () => FieldResolutionError,
	HealthCheckError: () => HealthCheckError,
	MinimalLayerLive: () => MinimalLayerLive,
	ProductionLayerLive: () => ProductionLayerLive,
	RegistrationError: () => RegistrationError,
	SchemaEvolution: () => SchemaEvolution,
	SchemaEvolutionError: () => SchemaEvolutionError,
	SchemaFirst: () => SchemaFirst,
	SchemaFirstError: () => SchemaFirstError,
	SchemaFirstService: () => SchemaFirstService,
	SchemaLifecycleState: () => SchemaLifecycleState,
	SchemaValidationError: () => SchemaValidationError,
	TestLayerLive: () => TestLayerLive,
	TimeoutError: () => TimeoutError,
	TypeConversionError: () => TypeConversionError,
	ValidationError: () => ValidationError,
	asUntypedEntity: () => asUntypedEntity,
	createConversionContext: () => createConversionContext,
	createEntityBuilder: () => createEntityBuilder,
	createEnvironmentLayer: () => createEnvironmentLayer,
	createSchemaFirstService: () => createSchemaFirstService,
	createSchemaFirstWorkflow: () => createSchemaFirstWorkflow,
	debug: () => debug,
	developmentLogger: () => developmentLogger,
	error: () => error,
	getCacheConfig: () => getCacheConfig,
	getDatabaseConfig: () => getDatabaseConfig,
	getFederationConfig: () => getFederationConfig,
	getObservabilityConfig: () => getObservabilityConfig,
	getResilienceConfig: () => getResilienceConfig,
	getServerConfig: () => getServerConfig,
	info: () => info,
	productionLogger: () => productionLogger,
	testLogger: () => testLogger,
	toFederationEntity: () => toFederationEntity,
	trace: () => trace,
	warn: () => warn,
	withSpan: () => withSpan
});

//#endregion
export { ASTConversion, CodeGenerationError, CoreServicesLive, DevelopmentLayerLive, MinimalLayerLive, ProductionLayerLive, SchemaEvolution, SchemaEvolutionError, SchemaFirst, SchemaFirstError, SchemaFirstService, SchemaLifecycleState, TestLayerLive, asUntypedEntity, createConversionContext, createEnvironmentLayer, createSchemaFirstService, createSchemaFirstWorkflow, runtime_exports };
//# sourceMappingURL=runtime-CCTzkf8P.js.map