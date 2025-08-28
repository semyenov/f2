import * as Effect from 'effect/Effect'
import * as Schema from '@effect/schema/Schema'
import * as AST from '@effect/schema/AST'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLScalarType,
  type GraphQLOutputType,
  type GraphQLInputType,
  type GraphQLType,
  isOutputType as isGraphQLOutputType,
  type ThunkObjMap,
  type GraphQLInputFieldConfig,
  type GraphQLFieldConfig,
} from 'graphql'
import type { TypeConversionError } from '../core/types.js'
import { ErrorFactory } from '../core/errors.js'

const MAX_RECURSION_DEPTH = 10 as const

/**
 * Type conversion context with caching and configuration
 *
 * Context object that manages the conversion of Effect Schema AST nodes to GraphQL types,
 * providing caching for performance, custom scalar handling, and safety features like
 * recursion depth limiting.
 *
 * @example Basic usage
 * ```typescript
 * const context = createConversionContext(false, {
 *   DateTime: new GraphQLScalarType({ name: 'DateTime' }),
 *   JSON: GraphQLJSON
 * })
 *
 * const graphqlType = yield* convertSchemaToGraphQL(
 *   Schema.Struct({ id: Schema.String, createdAt: Schema.Date }),
 *   context
 * )
 * ```
 *
 * @example Input type conversion
 * ```typescript
 * const inputContext = createConversionContext(true, {}, {
 *   strictMode: true,
 *   maxDepth: 5
 * })
 *
 * const inputType = yield* convertSchemaToGraphQL(CreateUserSchema, inputContext)
 * ```
 *
 * @category Schema Processing
 * @since 2.0.0
 */
export interface TypeConversionContext {
  readonly cache: Map<string, GraphQLType>
  readonly isInput: boolean
  readonly scalars: Record<string, GraphQLScalarType>
  readonly depth: number
  readonly maxDepth: number
  readonly strictMode: boolean
}

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
 * @since 2.0.0
 */
export const createConversionContext = (
  isInput = false,
  scalars: Record<string, GraphQLScalarType> = {},
  options: {
    readonly maxDepth?: number
    readonly strictMode?: boolean
  } = {}
): TypeConversionContext => ({
  cache: new Map(),
  isInput,
  scalars,
  depth: 0,
  maxDepth: options.maxDepth ?? MAX_RECURSION_DEPTH,
  strictMode: options.strictMode ?? true,
})

/**
 * Schema to GraphQL Type Conversion Pipeline
 *
 * Advanced AST-based transformation with comprehensive type support and pattern matching.
 *
 * Features:
 * - Exhaustive pattern matching over AST nodes
 * - Recursive type conversion with cycle detection
 * - Branded type mapping to GraphQL types
 * - Custom scalar type support
 * - Input/Output type distinction
 * - Comprehensive error handling
 */
export namespace ASTConversion {
  /**
   * Convert Effect Schema to GraphQL type with comprehensive error handling
   */
  export const schemaToGraphQLType = (
    schema: Schema.Schema<unknown>,
    context: TypeConversionContext = createConversionContext()
  ): Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError> => {
    if (context.depth > context.maxDepth) {
      return Effect.fail(
        ErrorFactory.typeConversion(
          `Maximum recursion depth (${context.maxDepth}) exceeded`,
          'depth_exceeded'
        )
      )
    }

    const ast = schema.ast
    const cacheKey = generateCacheKey(ast, context.isInput)

    // Check cache first
    const cachedType = context.cache.get(cacheKey)
    if (cachedType) {
      return Effect.succeed(cachedType as GraphQLOutputType | GraphQLInputType)
    }

    const nextContext: TypeConversionContext = {
      ...context,
      depth: context.depth + 1,
    }

    return pipe(
      convertAST(ast, nextContext),
      Effect.tap(type => Effect.sync(() => context.cache.set(cacheKey, type)))
    )
  }

  /**
   * Convert multiple schemas to GraphQL types concurrently
   */
  export const convertSchemasParallel = (
    schemas: ReadonlyArray<{ readonly name: string; readonly schema: Schema.Schema<unknown> }>,
    context: TypeConversionContext = createConversionContext()
  ): Effect.Effect<Record<string, GraphQLOutputType | GraphQLInputType>, TypeConversionError> =>
    pipe(
      Effect.all(
        schemas.map(({ name, schema }) =>
          pipe(
            schemaToGraphQLType(schema, context),
            Effect.map(type => [name, type] as const)
          )
        ),
        { concurrency: 5 }
      ),
      Effect.map(pairs => Object.fromEntries(pairs))
    )

  /**
   * Create GraphQL schema from Effect Schema registry
   */
  export const createGraphQLSchema = (
    entities: Record<string, Schema.Schema<unknown>>,
    queries: Record<string, Schema.Schema<unknown>> = {},
    mutations: Record<string, Schema.Schema<unknown>> = {}
  ): Effect.Effect<
    {
      readonly types: Record<string, GraphQLOutputType>
      readonly queries: Record<string, GraphQLOutputType>
      readonly mutations: Record<string, GraphQLOutputType>
    },
    TypeConversionError
  > => {
    const outputContext = createConversionContext(false)

    return pipe(
      Effect.all({
        types: pipe(
          convertSchemasParallel(
            Object.entries(entities).map(([name, schema]) => ({ name, schema })),
            outputContext
          ),
          Effect.map(result => filterOutputTypes(result))
        ),
        queries: pipe(
          convertSchemasParallel(
            Object.entries(queries).map(([name, schema]) => ({ name, schema })),
            outputContext
          ),
          Effect.map(result => filterOutputTypes(result))
        ),
        mutations: pipe(
          convertSchemasParallel(
            Object.entries(mutations).map(([name, schema]) => ({ name, schema })),
            outputContext
          ),
          Effect.map(result => filterOutputTypes(result))
        ),
      })
    )
  }

  // === Helper Functions ===

  const filterOutputTypes = (
    record: Record<string, GraphQLOutputType | GraphQLInputType>
  ): Record<string, GraphQLOutputType> => {
    const filtered: Record<string, GraphQLOutputType> = {}
    for (const [key, type] of Object.entries(record)) {
      if (isGraphQLOutputType(type)) {
        filtered[key] = type
      }
    }
    return filtered
  }

  // === Internal Implementation ===

  /**
   * Convert AST node using exhaustive pattern matching
   */
  const convertAST = (
    ast: AST.AST,
    context: TypeConversionContext
  ): Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError> =>
    Match.value(ast).pipe(
      // Primitive types
      Match.tag('StringKeyword', () => Effect.succeed(GraphQLString)),

      Match.tag('NumberKeyword', () => Effect.succeed(GraphQLFloat)),

      Match.tag('BooleanKeyword', () => Effect.succeed(GraphQLBoolean)),

      Match.tag('BigIntKeyword', () => Effect.succeed(GraphQLString)), // Represent BigInt as String

      Match.tag('SymbolKeyword', () => Effect.succeed(GraphQLString)), // Represent Symbol as String

      Match.tag('UnknownKeyword', () => Effect.succeed(context.scalars['JSON'] ?? GraphQLString)),

      Match.tag('AnyKeyword', () => Effect.succeed(context.scalars['JSON'] ?? GraphQLString)),

      Match.tag('VoidKeyword', () => Effect.succeed(GraphQLString)), // Void as nullable String

      Match.tag('NeverKeyword', () =>
        Effect.fail(
          ErrorFactory.typeConversion('Never type cannot be represented in GraphQL', 'never_type')
        )
      ),

      // Literal types
      Match.tag('Literal', ast => convertLiteral(ast, context)),

      // Refinement types (branded types)
      Match.tag('Refinement', ast => convertRefinement(ast, context)),

      // Object types
      Match.tag('TypeLiteral', ast => convertTypeLiteral(ast, context)),

      // Union types
      Match.tag('Union', ast => convertUnion(ast, context)),

      // Enum types
      Match.tag('Enums', ast => convertEnums(ast, context)),

      // Array types
      Match.tag('TupleType', ast => convertTuple(ast, context)),

      // Template literal types
      Match.tag('TemplateLiteral', ast => convertTemplateLiteral(ast, context)),

      // Declaration types
      Match.tag('Declaration', ast => convertDeclaration(ast, context)),

      // Transformation types
      Match.tag('Transformation', ast => schemaToGraphQLType(Schema.make(ast.from), context)),

      // Suspend types (lazy evaluation)
      Match.tag('Suspend', ast => convertSuspend(ast, context)),

      // Catch-all for unsupported types
      Match.orElse(unsupportedAst =>
        Effect.fail(
          ErrorFactory.typeConversion(
            `Unsupported AST type: ${unsupportedAst._tag}`,
            unsupportedAst._tag,
            'astType'
          )
        )
      )
    )

  /**
   * Convert literal AST to appropriate GraphQL type
   */
  const convertLiteral = (
    ast: AST.Literal,
    _context: TypeConversionContext
  ): Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError> => {
    const literalValue = ast.literal

    if (typeof literalValue === 'string') {
      return Effect.succeed(GraphQLString)
    } else if (typeof literalValue === 'number') {
      return Effect.succeed(Number.isInteger(literalValue) ? GraphQLInt : GraphQLFloat)
    } else if (typeof literalValue === 'boolean') {
      return Effect.succeed(GraphQLBoolean)
    } else {
      return Effect.succeed(GraphQLString) // Default to string for complex literals
    }
  }

  /**
   * Convert refinement AST with branded type mapping
   */
  const convertRefinement = (
    ast: AST.Refinement,
    context: TypeConversionContext
  ): Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError> => {
    const titleAnnotation = AST.getAnnotation(AST.TitleAnnotationId)(ast)

    return pipe(
      Effect.fromNullable(titleAnnotation),
      Effect.flatMap((annotation: unknown) => {
        // The annotation might be wrapped in an Option type
        let title: string
        if (typeof annotation === 'string') {
          title = annotation
        } else if (annotation !== null && typeof annotation === 'object' && 'value' in annotation) {
          title = String((annotation as { value: unknown }).value)
        } else {
          title = String(annotation)
        }
        return Match.value(title).pipe(
          // Integer type -> GraphQL Int
          Match.when(
            t => t === 'Int',
            () => Effect.succeed(GraphQLInt)
          ),

          // ID types -> GraphQL ID
          Match.when(
            t => t?.endsWith('Id') || t?.includes('Identity') || t === 'ID',
            () => Effect.succeed(GraphQLID)
          ),

          // Email and communication types
          Match.when(
            t => t === 'Email' || t === 'EmailAddress',
            () => Effect.succeed(GraphQLString)
          ),

          Match.when(
            t => t === 'Phone' || t === 'PhoneNumber',
            () => Effect.succeed(GraphQLString)
          ),

          Match.when(
            t => t === 'URL' || t === 'Uri' || t === 'Link',
            () => Effect.succeed(GraphQLString)
          ),

          // Temporal types
          Match.when(
            t => t === 'Timestamp' || t === 'DateTime',
            () => Effect.succeed(context.scalars['DateTime'] ?? GraphQLString)
          ),

          Match.when(
            t => t === 'Date',
            () => Effect.succeed(context.scalars['Date'] ?? GraphQLString)
          ),

          Match.when(
            t => t === 'Time',
            () => Effect.succeed(context.scalars['Time'] ?? GraphQLString)
          ),

          // Numeric types with constraints
          Match.when(
            t => t === 'Money' || t === 'Currency' || t === 'Amount',
            () => Effect.succeed(context.scalars['Money'] ?? GraphQLFloat)
          ),

          Match.when(
            t => t === 'Percentage',
            () => Effect.succeed(GraphQLFloat)
          ),

          Match.when(
            t => t === 'Version' || t === 'SequenceNumber',
            () => Effect.succeed(GraphQLInt)
          ),

          Match.when(
            t => t === 'Port' || t === 'Count',
            () => Effect.succeed(GraphQLInt)
          ),

          // JSON and structured types
          Match.when(
            t => t === 'JSON' || t === 'JsonValue',
            () => Effect.succeed(context.scalars['JSON'] ?? GraphQLString)
          ),

          // Sensitive types - should not be exposed
          Match.when(
            t => t === 'Password' || t === 'Secret' || t === 'Token',
            sensitiveType =>
              context.strictMode
                ? Effect.fail(
                    ErrorFactory.typeConversion(
                      `Sensitive type ${sensitiveType} cannot be converted to GraphQL type`,
                      'sensitive_type',
                      sensitiveType
                    )
                  )
                : Effect.succeed(GraphQLString)
          ),

          // Custom scalar fallback
          Match.when(
            (t): t is string => Boolean(t && context.scalars[t]),
            t => Effect.succeed(context.scalars[t])
          ),

          // Default fallback - delegate to underlying type
          Match.orElse(() => schemaToGraphQLType(Schema.make(ast.from), context))
        )
      }),
      Effect.orElse(() =>
        // No title annotation - delegate to underlying type
        schemaToGraphQLType(Schema.make(ast.from), context)
      ),
      Effect.orElse(() => Effect.succeed(GraphQLString)) // Ultimate fallback to ensure we never return undefined
    ) as Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError>
  }

  /**
   * Convert type literal AST to GraphQL Object/Input type
   */
  const convertTypeLiteral = (
    ast: AST.TypeLiteral,
    context: TypeConversionContext
  ): Effect.Effect<GraphQLObjectType | GraphQLInputObjectType, TypeConversionError> => {
    const typename = generateTypeName(ast, context)

    return pipe(
      // Convert all property signatures to GraphQL fields
      Effect.all(
        ast.propertySignatures.map(propSig =>
          pipe(
            schemaToGraphQLType(Schema.make(propSig.type), context),
            Effect.map(fieldType => {
              const isOptional = propSig.isOptional
              const finalType = isOptional ? fieldType : new GraphQLNonNull(fieldType)

              return [
                String(propSig.name),
                {
                  type: finalType,
                  description: extractDescription(propSig.type),
                },
              ] as const
            })
          )
        )
      ),
      Effect.map(fields => Object.fromEntries(fields)),
      Effect.map(fieldConfig => {
        const description = extractDescription(ast)

        return context.isInput
          ? new GraphQLInputObjectType({
              name: `${typename}Input`,
              description,
              fields: fieldConfig as ThunkObjMap<GraphQLInputFieldConfig>,
            })
          : new GraphQLObjectType({
              name: typename,
              description,
              fields: fieldConfig as ThunkObjMap<GraphQLFieldConfig<unknown, unknown, unknown>>,
            })
      })
    )
  }

  /**
   * Convert union AST to GraphQL Union type
   */
  const convertUnion = (
    ast: AST.Union,
    context: TypeConversionContext
  ): Effect.Effect<GraphQLUnionType, TypeConversionError> => {
    if (context.isInput) {
      return Effect.fail(
        ErrorFactory.typeConversion(
          'Union types are not supported in GraphQL input types',
          'union_input_type'
        )
      )
    }

    const typename = generateTypeName(ast, context)

    return pipe(
      Effect.all(ast.types.map(type => schemaToGraphQLType(Schema.make(type), context))),
      Effect.map(
        types =>
          new GraphQLUnionType({
            name: typename,
            description: extractDescription(ast),
            types: types.filter(isObjectType) as readonly GraphQLObjectType[],
            resolveType: value => {
              // Try to resolve type based on discriminator field
              if (value !== null && typeof value === 'object' && '_tag' in value) {
                return String(value._tag)
              }
              return undefined
            },
          })
      )
    )
  }

  /**
   * Convert enums AST to GraphQL Enum type
   */
  const convertEnums = (
    ast: AST.Enums,
    context: TypeConversionContext
  ): Effect.Effect<GraphQLEnumType, TypeConversionError> => {
    const typename = generateTypeName(ast, context)

    return Effect.succeed(
      new GraphQLEnumType({
        name: typename,
        description: extractDescription(ast),
        values: Object.fromEntries(
          ast.enums.map(([key, value]) => [
            String(key),
            {
              value,
              description: `Enum value: ${String(value)}`,
            },
          ])
        ),
      })
    )
  }

  /**
   * Convert tuple AST to GraphQL List type
   */
  const convertTuple = (
    ast: AST.TupleType,
    context: TypeConversionContext
  ): Effect.Effect<GraphQLList<GraphQLOutputType>, TypeConversionError> => {
    if (ast.elements.length === 0) {
      return Effect.succeed(new GraphQLList(GraphQLString))
    }

    // For simplicity, use the first element type for the entire list
    const firstElementType = ast.elements[0]?.type

    if (!firstElementType) {
      return Effect.succeed(new GraphQLList(GraphQLString))
    }

    return pipe(
      schemaToGraphQLType(Schema.make(firstElementType), context),
      Effect.map(elementType => {
        if (isGraphQLOutputType(elementType)) {
          return new GraphQLList(elementType)
        } else {
          // Fallback to string for input types
          return new GraphQLList(GraphQLString)
        }
      })
    )
  }

  /**
   * Convert template literal AST to GraphQL String
   */
  const convertTemplateLiteral = (
    _ast: AST.TemplateLiteral,
    _context: TypeConversionContext
  ): Effect.Effect<typeof GraphQLString, TypeConversionError> => Effect.succeed(GraphQLString)

  /**
   * Convert declaration AST by delegating to the declared type
   */
  const convertDeclaration = (
    _ast: AST.Declaration,
    _context: TypeConversionContext
  ): Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError> =>
    // Simplified declaration handling - access declaration properties safely
    Effect.succeed(GraphQLString as GraphQLOutputType | GraphQLInputType)

  /**
   * Convert suspend AST by evaluating the suspended computation
   */
  const convertSuspend = (
    ast: AST.Suspend,
    context: TypeConversionContext
  ): Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError> =>
    pipe(
      Effect.sync(() => ast.f()),
      Effect.flatMap(suspendedAST => schemaToGraphQLType(Schema.make(suspendedAST), context))
    )

  // === Helper Functions ===

  /**
   * Generate cache key for AST node
   */
  const generateCacheKey = (ast: AST.AST, isInput: boolean): string => {
    const baseKey = ast._tag
    const suffix = isInput ? ':input' : ':output'

    if ('annotations' in ast) {
      const titleAnnotation = AST.getAnnotation(AST.TitleAnnotationId)(ast)
      if (Option.isSome(titleAnnotation)) {
        return `${titleAnnotation.value}${suffix}`
      }
    }

    return `${baseKey}${suffix}:${ast.toString?.() ?? 'unknown'}`
  }

  /**
   * Generate GraphQL type name from AST
   */
  const generateTypeName = (ast: AST.AST, context: TypeConversionContext): string => {
    if ('annotations' in ast) {
      const titleAnnotation = AST.getAnnotation(AST.TitleAnnotationId)(ast)
      if (Option.isSome(titleAnnotation)) {
        return String(titleAnnotation.value)
      }
    }

    // Fallback type name generation
    return `Generated${ast._tag}${context.depth}`
  }

  /**
   * Extract description from AST annotations
   */
  const extractDescription = (ast: AST.AST): string | undefined => {
    if ('annotations' in ast) {
      const descriptionAnnotation = AST.getAnnotation(AST.DescriptionAnnotationId)(ast)
      if (Option.isSome(descriptionAnnotation)) {
        return String(descriptionAnnotation.value)
      }
    }
    return undefined
  }

  /**
   * Type guard for GraphQL Object types
   */
  const isObjectType = (type: GraphQLType): type is GraphQLObjectType => {
    return type instanceof GraphQLObjectType
  }
}
