const require_errors = require('./errors-CLhqlpsL.cjs');
const require_logger = require('./logger-BveqSzER.cjs');
const effect_Data = require_errors.__toESM(require("effect/Data"));
const effect_Effect = require_errors.__toESM(require("effect/Effect"));
const effect_Function = require_errors.__toESM(require("effect/Function"));
const effect_Match = require_errors.__toESM(require("effect/Match"));
const effect_Context = require_errors.__toESM(require("effect/Context"));
const graphql = require_errors.__toESM(require("graphql"));
const effect_Layer = require_errors.__toESM(require("effect/Layer"));
const effect_Schema = require_errors.__toESM(require("effect/Schema"));
const effect_Logger = require_errors.__toESM(require("effect/Logger"));
const effect_Option = require_errors.__toESM(require("effect/Option"));
const effect_SchemaAST = require_errors.__toESM(require("effect/SchemaAST"));

//#region src/runtime/core/types/types.ts
const asUntypedEntity = (entity) => entity;

//#endregion
//#region src/runtime/core/schema-first-patterns.ts
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
	generateEntityBuilders: (schema) => (0, effect_Function.pipe)(effect_Effect.succeed(schema), effect_Effect.map(() => {
		return [];
	}), effect_Effect.catchAll((error$1) => effect_Effect.fail(new SchemaFirstError({
		message: `Failed to generate entity builders: ${error$1}`,
		suggestion: "Ensure schema is valid"
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
const generateTypeScriptTypes = (entities) => effect_Effect.succeed(entities.length === 0 ? `// TypeScript type definitions for federated entities
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
	developSchema: (schemaSource) => (0, effect_Function.pipe)(schemaFirstService.parseSchemaDefinition(schemaSource), effect_Effect.flatMap((schema) => (0, effect_Function.pipe)(effect_Effect.succeed(schema), effect_Effect.map(() => SchemaLifecycleState.Validated({
		schema,
		entities: [],
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
		return (0, effect_Function.pipe)(effect_Effect.succeed(proposedSchemaDoc), effect_Effect.map(() => SchemaLifecycleState.Validated({
			schema: proposedSchemaDoc,
			entities: [],
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
//#region src/runtime/effect/services/layers.ts
const CoreServicesLive = effect_Layer.mergeAll(require_logger.FederationConfigLive, require_logger.FederationLoggerLive);
const DevelopmentLayerLive = effect_Layer.mergeAll(CoreServicesLive, require_logger.developmentLogger, effect_Logger.pretty);
const ProductionLayerLive = effect_Layer.mergeAll(CoreServicesLive, require_logger.productionLogger, effect_Logger.json);
const TestLayerLive = effect_Layer.mergeAll(CoreServicesLive, require_logger.testLogger);
const MinimalLayerLive = require_logger.FederationConfigLive;
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
		if (context.depth > context.maxDepth) return effect_Effect.fail(require_errors.ErrorFactory.typeConversion(`Maximum recursion depth (${context.maxDepth}) exceeded`, "depth_exceeded"));
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
	const convertAST = (ast, context) => effect_Match.value(ast).pipe(effect_Match.tag("StringKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("NumberKeyword", () => effect_Effect.succeed(graphql.GraphQLFloat)), effect_Match.tag("BooleanKeyword", () => effect_Effect.succeed(graphql.GraphQLBoolean)), effect_Match.tag("BigIntKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("SymbolKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("UnknownKeyword", () => effect_Effect.succeed(context.scalars["JSON"] ?? graphql.GraphQLString)), effect_Match.tag("AnyKeyword", () => effect_Effect.succeed(context.scalars["JSON"] ?? graphql.GraphQLString)), effect_Match.tag("VoidKeyword", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.tag("NeverKeyword", () => effect_Effect.fail(require_errors.ErrorFactory.typeConversion("Never type cannot be represented in GraphQL", "never_type"))), effect_Match.tag("Literal", (ast$1) => convertLiteral(ast$1, context)), effect_Match.tag("Refinement", (ast$1) => convertRefinement(ast$1, context)), effect_Match.tag("TypeLiteral", (ast$1) => convertTypeLiteral(ast$1, context)), effect_Match.tag("Union", (ast$1) => convertUnion(ast$1, context)), effect_Match.tag("Enums", (ast$1) => convertEnums(ast$1, context)), effect_Match.tag("TupleType", (ast$1) => convertTuple(ast$1, context)), effect_Match.tag("TemplateLiteral", (ast$1) => convertTemplateLiteral(ast$1, context)), effect_Match.tag("Declaration", (ast$1) => convertDeclaration(ast$1, context)), effect_Match.tag("Transformation", (ast$1) => schemaToGraphQLType(effect_Schema.make(ast$1.from), context)), effect_Match.tag("Suspend", (ast$1) => convertSuspend(ast$1, context)), effect_Match.orElse((unsupportedAst) => effect_Effect.fail(require_errors.ErrorFactory.typeConversion(`Unsupported AST type: ${unsupportedAst._tag}`, unsupportedAst._tag, "astType"))));
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
		const identifierAnnotation = effect_SchemaAST.getAnnotation(effect_SchemaAST.IdentifierAnnotationId)(ast);
		const titleAnnotation = effect_SchemaAST.getAnnotation(effect_SchemaAST.TitleAnnotationId)(ast);
		return (0, effect_Function.pipe)(effect_Effect.fromNullable(identifierAnnotation ?? titleAnnotation), effect_Effect.flatMap((annotation) => {
			let title;
			if (typeof annotation === "string") title = annotation;
			else if (annotation !== null && typeof annotation === "object" && "value" in annotation) title = String(annotation.value);
			else title = String(annotation);
			return effect_Match.value(title).pipe(effect_Match.when((t) => t === "Int" || t === "int", () => effect_Effect.succeed(graphql.GraphQLInt)), effect_Match.when((t) => t?.endsWith("Id") || t?.includes("Identity") || t === "ID", () => effect_Effect.succeed(graphql.GraphQLID)), effect_Match.when((t) => t === "Email" || t === "EmailAddress", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => t === "Phone" || t === "PhoneNumber", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => t === "URL" || t === "Uri" || t === "Link", () => effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => t === "Timestamp" || t === "DateTime", () => effect_Effect.succeed(context.scalars["DateTime"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Date", () => effect_Effect.succeed(context.scalars["Date"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Time", () => effect_Effect.succeed(context.scalars["Time"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Money" || t === "Currency" || t === "Amount", () => effect_Effect.succeed(context.scalars["Money"] ?? graphql.GraphQLFloat)), effect_Match.when((t) => t === "Percentage", () => effect_Effect.succeed(graphql.GraphQLFloat)), effect_Match.when((t) => t === "Version" || t === "SequenceNumber", () => effect_Effect.succeed(graphql.GraphQLInt)), effect_Match.when((t) => t === "Port" || t === "Count", () => effect_Effect.succeed(graphql.GraphQLInt)), effect_Match.when((t) => t === "JSON" || t === "JsonValue", () => effect_Effect.succeed(context.scalars["JSON"] ?? graphql.GraphQLString)), effect_Match.when((t) => t === "Password" || t === "Secret" || t === "Token", (sensitiveType) => context.strictMode ? effect_Effect.fail(require_errors.ErrorFactory.typeConversion(`Sensitive type ${sensitiveType} cannot be converted to GraphQL type`, "sensitive_type", sensitiveType)) : effect_Effect.succeed(graphql.GraphQLString)), effect_Match.when((t) => Boolean(t && context.scalars[t]), (t) => effect_Effect.succeed(context.scalars[t])), effect_Match.orElse(() => schemaToGraphQLType(effect_Schema.make(ast.from), context)));
		}), effect_Effect.orElse(() => schemaToGraphQLType(effect_Schema.make(ast.from), context)), effect_Effect.orElse(() => effect_Effect.succeed(graphql.GraphQLString)));
	};
	/**
	* Convert type literal AST to GraphQL Object/Input type
	*/
	const convertTypeLiteral = (ast, context) => {
		const typename = generateTypeName(ast, context);
		return (0, effect_Function.pipe)(effect_Effect.all(ast.propertySignatures.map((propSig) => (0, effect_Function.pipe)(schemaToGraphQLType(effect_Schema.make(propSig.type), context), effect_Effect.map((fieldType) => {
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
		if (context.isInput) return effect_Effect.fail(require_errors.ErrorFactory.typeConversion("Union types are not supported in GraphQL input types", "union_input_type"));
		const typename = generateTypeName(ast, context);
		return (0, effect_Function.pipe)(effect_Effect.all(ast.types.map((type) => schemaToGraphQLType(effect_Schema.make(type), context))), effect_Effect.map((types) => new graphql.GraphQLUnionType({
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
		return (0, effect_Function.pipe)(schemaToGraphQLType(effect_Schema.make(firstElementType), context), effect_Effect.map((elementType) => {
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
	const convertSuspend = (ast, context) => (0, effect_Function.pipe)(effect_Effect.sync(() => ast.f()), effect_Effect.flatMap((suspendedAST) => schemaToGraphQLType(effect_Schema.make(suspendedAST), context)));
	/**
	* Generate cache key for AST node
	*/
	const generateCacheKey = (ast, isInput) => {
		const baseKey = ast._tag;
		const suffix = isInput ? ":input" : ":output";
		if ("annotations" in ast) {
			const titleAnnotation = effect_SchemaAST.getAnnotation(effect_SchemaAST.TitleAnnotationId)(ast);
			if (effect_Option.isSome(titleAnnotation)) return `${titleAnnotation.value}${suffix}`;
		}
		return `${baseKey}${suffix}:${ast.toString?.() ?? "unknown"}`;
	};
	/**
	* Generate GraphQL type name from AST
	*/
	const generateTypeName = (ast, context) => {
		if ("annotations" in ast) {
			const titleAnnotation = effect_SchemaAST.getAnnotation(effect_SchemaAST.TitleAnnotationId)(ast);
			if (effect_Option.isSome(titleAnnotation)) return String(titleAnnotation.value);
		}
		return `Generated${ast._tag}${context.depth}`;
	};
	/**
	* Extract description from AST annotations
	*/
	const extractDescription = (ast) => {
		if ("annotations" in ast) {
			const descriptionAnnotation = effect_SchemaAST.getAnnotation(effect_SchemaAST.DescriptionAnnotationId)(ast);
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
//#region src/runtime/index.ts
var runtime_exports = {};
require_errors.__export(runtime_exports, {
	ASTConversion: () => ASTConversion,
	BaseDomainError: () => require_errors.BaseDomainError,
	CircuitBreakerError: () => require_errors.CircuitBreakerError,
	CodeGenerationError: () => CodeGenerationError,
	CompositionError: () => require_errors.CompositionError,
	CoreServicesLive: () => CoreServicesLive,
	DevelopmentLayerLive: () => DevelopmentLayerLive,
	DiscoveryError: () => require_errors.DiscoveryError,
	EntityResolutionError: () => require_errors.EntityResolutionError,
	ErrorFactory: () => require_errors.ErrorFactory,
	ErrorMatching: () => require_errors.ErrorMatching,
	FederationConfigLive: () => require_logger.FederationConfigLive,
	FederationConfigSchema: () => require_logger.FederationConfigSchema,
	FederationConfigService: () => require_logger.FederationConfigService,
	FederationEntityBuilder: () => require_logger.FederationEntityBuilder,
	FederationError: () => require_errors.FederationError,
	FederationLogger: () => require_logger.FederationLogger,
	FederationLoggerLive: () => require_logger.FederationLoggerLive,
	FieldResolutionError: () => require_errors.FieldResolutionError,
	HealthCheckError: () => require_errors.HealthCheckError,
	MinimalLayerLive: () => MinimalLayerLive,
	ProductionLayerLive: () => ProductionLayerLive,
	RegistrationError: () => require_errors.RegistrationError,
	SchemaEvolution: () => SchemaEvolution,
	SchemaEvolutionError: () => SchemaEvolutionError,
	SchemaFirst: () => SchemaFirst,
	SchemaFirstError: () => SchemaFirstError,
	SchemaFirstService: () => SchemaFirstService,
	SchemaLifecycleState: () => SchemaLifecycleState,
	SchemaValidationError: () => require_errors.SchemaValidationError,
	TestLayerLive: () => TestLayerLive,
	TimeoutError: () => require_errors.TimeoutError,
	TypeConversionError: () => require_errors.TypeConversionError,
	ValidationError: () => require_errors.ValidationError,
	asUntypedEntity: () => asUntypedEntity,
	createConversionContext: () => createConversionContext,
	createEntityBuilder: () => require_logger.createEntityBuilder,
	createEnvironmentLayer: () => createEnvironmentLayer,
	createSchemaFirstService: () => createSchemaFirstService,
	createSchemaFirstWorkflow: () => createSchemaFirstWorkflow,
	debug: () => require_logger.debug,
	developmentLogger: () => require_logger.developmentLogger,
	error: () => require_logger.error,
	getCacheConfig: () => require_logger.getCacheConfig,
	getDatabaseConfig: () => require_logger.getDatabaseConfig,
	getFederationConfig: () => require_logger.getFederationConfig,
	getObservabilityConfig: () => require_logger.getObservabilityConfig,
	getResilienceConfig: () => require_logger.getResilienceConfig,
	getServerConfig: () => require_logger.getServerConfig,
	info: () => require_logger.info,
	productionLogger: () => require_logger.productionLogger,
	testLogger: () => require_logger.testLogger,
	toFederationEntity: () => require_logger.toFederationEntity,
	trace: () => require_logger.trace,
	warn: () => require_logger.warn,
	withSpan: () => require_logger.withSpan
});

//#endregion
Object.defineProperty(exports, 'ASTConversion', {
  enumerable: true,
  get: function () {
    return ASTConversion;
  }
});
Object.defineProperty(exports, 'CodeGenerationError', {
  enumerable: true,
  get: function () {
    return CodeGenerationError;
  }
});
Object.defineProperty(exports, 'CoreServicesLive', {
  enumerable: true,
  get: function () {
    return CoreServicesLive;
  }
});
Object.defineProperty(exports, 'DevelopmentLayerLive', {
  enumerable: true,
  get: function () {
    return DevelopmentLayerLive;
  }
});
Object.defineProperty(exports, 'MinimalLayerLive', {
  enumerable: true,
  get: function () {
    return MinimalLayerLive;
  }
});
Object.defineProperty(exports, 'ProductionLayerLive', {
  enumerable: true,
  get: function () {
    return ProductionLayerLive;
  }
});
Object.defineProperty(exports, 'SchemaEvolution', {
  enumerable: true,
  get: function () {
    return SchemaEvolution;
  }
});
Object.defineProperty(exports, 'SchemaEvolutionError', {
  enumerable: true,
  get: function () {
    return SchemaEvolutionError;
  }
});
Object.defineProperty(exports, 'SchemaFirst', {
  enumerable: true,
  get: function () {
    return SchemaFirst;
  }
});
Object.defineProperty(exports, 'SchemaFirstError', {
  enumerable: true,
  get: function () {
    return SchemaFirstError;
  }
});
Object.defineProperty(exports, 'SchemaFirstService', {
  enumerable: true,
  get: function () {
    return SchemaFirstService;
  }
});
Object.defineProperty(exports, 'SchemaLifecycleState', {
  enumerable: true,
  get: function () {
    return SchemaLifecycleState;
  }
});
Object.defineProperty(exports, 'TestLayerLive', {
  enumerable: true,
  get: function () {
    return TestLayerLive;
  }
});
Object.defineProperty(exports, 'asUntypedEntity', {
  enumerable: true,
  get: function () {
    return asUntypedEntity;
  }
});
Object.defineProperty(exports, 'createConversionContext', {
  enumerable: true,
  get: function () {
    return createConversionContext;
  }
});
Object.defineProperty(exports, 'createEnvironmentLayer', {
  enumerable: true,
  get: function () {
    return createEnvironmentLayer;
  }
});
Object.defineProperty(exports, 'createSchemaFirstService', {
  enumerable: true,
  get: function () {
    return createSchemaFirstService;
  }
});
Object.defineProperty(exports, 'createSchemaFirstWorkflow', {
  enumerable: true,
  get: function () {
    return createSchemaFirstWorkflow;
  }
});
Object.defineProperty(exports, 'runtime_exports', {
  enumerable: true,
  get: function () {
    return runtime_exports;
  }
});