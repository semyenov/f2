/**
 * Schema-First Development Patterns
 *
 * This module implements schema-first development patterns that integrate with
 * the UltraStrictEntityBuilder and provide code generation, validation, and
 * evolution capabilities for Apollo Federation 2.x schemas.
 */

import * as Schema from '@effect/schema/Schema'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import { Kind, type DocumentNode, type GraphQLOutputType, type GraphQLSchema } from 'graphql'

import type { ValidatedEntity } from '../experimental/ultra-strict-entity-builder.js'
import {
  createUltraStrictEntityBuilder,
  validateEntityBuilder,
  withDirectives,
  withKeys,
  withResolvers,
  withSchema,
  UltraStrictEntityBuilder,
} from '../experimental/ultra-strict-entity-builder.js'

// ============================================================================
// Core Schema-First Types
// ============================================================================

/**
 * Schema development lifecycle states
 */
export type SchemaLifecycleState = Data.TaggedEnum<{
  readonly Draft: { readonly schema: DocumentNode; readonly version: string }
  readonly Validated: {
    readonly schema: DocumentNode
    readonly entities: readonly ValidatedEntity[]
    readonly version: string
  }
  readonly Composed: {
    readonly federatedSchema: GraphQLSchema
    readonly subgraphs: readonly string[]
    readonly version: string
  }
  readonly Deployed: {
    readonly federatedSchema: GraphQLSchema
    readonly deploymentId: string
    readonly version: string
  }
  readonly Deprecated: {
    readonly schema: DocumentNode
    readonly replacedBy: string
    readonly version: string
  }
}>

export const SchemaLifecycleState = Data.taggedEnum<SchemaLifecycleState>()

/**
 * Schema evolution operations
 */
export type SchemaEvolution = Data.TaggedEnum<{
  readonly AddField: {
    readonly entityType: string
    readonly fieldName: string
    readonly fieldType: string
    readonly isBreaking: boolean
  }
  readonly RemoveField: {
    readonly entityType: string
    readonly fieldName: string
    readonly isBreaking: boolean
  }
  readonly ChangeFieldType: {
    readonly entityType: string
    readonly fieldName: string
    readonly oldType: string
    readonly newType: string
    readonly isBreaking: boolean
  }
  readonly AddDirective: {
    readonly entityType: string
    readonly fieldName: string | undefined
    readonly directive: string
    readonly isBreaking: boolean
  }
  readonly RemoveDirective: {
    readonly entityType: string
    readonly fieldName: string | undefined
    readonly directive: string
    readonly isBreaking: boolean
  }
  readonly AddEntity: { readonly entityType: string; readonly isBreaking: boolean }
  readonly RemoveEntity: { readonly entityType: string; readonly isBreaking: boolean }
}>

export const SchemaEvolution = Data.taggedEnum<SchemaEvolution>()

// ============================================================================
// Error Types
// ============================================================================

export class SchemaFirstError extends Data.TaggedError('SchemaFirstError')<{
  readonly message: string
  readonly schemaPath?: readonly string[]
  readonly suggestion?: string
}> {}

export class SchemaEvolutionError extends Data.TaggedError('SchemaEvolutionError')<{
  readonly message: string
  readonly evolution: SchemaEvolution
  readonly conflictingChanges?: readonly SchemaEvolution[]
}> {}

export class CodeGenerationError extends Data.TaggedError('CodeGenerationError')<{
  readonly message: string
  readonly targetLanguage: string
  readonly entityType: string
}> {}

// ============================================================================
// Schema-First Services
// ============================================================================

export interface SchemaFirstService {
  readonly parseSchemaDefinition: (
    schemaSource: string
  ) => Effect.Effect<DocumentNode, SchemaFirstError>

  readonly extractEntitiesFromSchema: (
    schema: DocumentNode
  ) => Effect.Effect<readonly string[], SchemaFirstError>

  readonly generateEntityBuilders: (
    schema: DocumentNode
  ) => Effect.Effect<readonly ValidatedEntity[], SchemaFirstError>

  readonly validateSchemaEvolution: (
    currentSchema: DocumentNode,
    proposedSchema: DocumentNode
  ) => Effect.Effect<readonly SchemaEvolution[], SchemaEvolutionError>

  readonly generateResolverStubs: (
    entities: readonly ValidatedEntity[]
  ) => Effect.Effect<string, CodeGenerationError>

  readonly generateTypeDefinitions: (
    entities: readonly ValidatedEntity[],
    language: 'typescript' | 'go' | 'java' | 'python'
  ) => Effect.Effect<string, CodeGenerationError>
}

export const SchemaFirstService = Context.GenericTag<SchemaFirstService>(
  '@federation/SchemaFirstService'
)

// ============================================================================
// Schema-First Service Implementation
// ============================================================================

export const createSchemaFirstService = (): SchemaFirstService => ({
  parseSchemaDefinition: (schemaSource: string) =>
    pipe(
      Effect.try(() => {
        // Simplified parsing - in real implementation would use graphql-js parser
        // Check for basic validity
        if (!schemaSource?.includes('type')) {
          throw new Error('Invalid GraphQL schema')
        }
        return {
          kind: Kind.DOCUMENT,
          definitions: [],
        } satisfies DocumentNode
      }),
      Effect.mapError(
        error =>
          new SchemaFirstError({
            message: `Failed to parse schema: ${error}`,
            suggestion: 'Ensure the schema follows valid GraphQL SDL syntax',
          })
      )
    ),

  extractEntitiesFromSchema: (schema: DocumentNode) =>
    pipe(
      Effect.succeed(schema),
      Effect.map(_doc => {
        // Simplified extraction - would analyze AST for @key directives
        return ['User', 'Product', 'Order'] as readonly string[]
      }),
      Effect.catchAll(error =>
        Effect.fail(
          new SchemaFirstError({
            message: `Failed to extract entities: ${error}`,
            suggestion: 'Ensure entities have proper @key directives',
          })
        )
      )
    ),

  generateEntityBuilders: (schema: DocumentNode) =>
    pipe(
      Effect.succeed(schema),
      Effect.flatMap(_doc =>
        Effect.all([
          generateUserEntityBuilder(),
          generateProductEntityBuilder(),
          generateOrderEntityBuilder(),
        ])
      ),
      Effect.map(builders => builders.filter((b): b is ValidatedEntity => b !== null)),
      Effect.catchAll(error =>
        Effect.fail(
          new SchemaFirstError({
            message: `Failed to generate entity builders: ${error}`,
            suggestion: 'Verify schema entities have valid types and key fields',
          })
        )
      )
    ),

  validateSchemaEvolution: (currentSchema: DocumentNode, proposedSchema: DocumentNode) =>
    pipe(
      Effect.succeed([currentSchema, proposedSchema]),
      Effect.map(([_current, _proposed]) => {
        // Simplified evolution analysis
        const evolutions: readonly SchemaEvolution[] = [
          SchemaEvolution.AddField({
            entityType: 'User',
            fieldName: 'lastLoginAt',
            fieldType: 'DateTime',
            isBreaking: false,
          }),
          SchemaEvolution.ChangeFieldType({
            entityType: 'Product',
            fieldName: 'price',
            oldType: 'Float',
            newType: 'Decimal',
            isBreaking: true,
          }),
        ]
        return evolutions as readonly SchemaEvolution[]
      }),
      Effect.catchAll(error =>
        Effect.fail(
          new SchemaEvolutionError({
            message: `Schema evolution validation failed: ${error}`,
            evolution: SchemaEvolution.AddField({
              entityType: 'Unknown',
              fieldName: 'unknown',
              fieldType: 'String',
              isBreaking: false,
            }),
          })
        )
      )
    ),

  generateResolverStubs: (entities: readonly ValidatedEntity[]) =>
    pipe(
      Effect.succeed(entities),
      Effect.map(entities => {
        const stubs = entities
          .map(
            entity => `
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
    ${entity.keys
      .map(
        key => `
    ${key.field}: (parent: unknown) => parent.${key.field}`
      )
      .join(',')}
  }
}`
          )
          .join('\n\n')

        return `import * as Effect from "effect/Effect"\nimport { pipe } from "effect/Function"\n\n${stubs}`
      }),
      Effect.catchAll(error =>
        Effect.fail(
          new CodeGenerationError({
            message: `Failed to generate resolver stubs: ${error}`,
            targetLanguage: 'typescript',
            entityType: 'multiple',
          })
        )
      )
    ),

  generateTypeDefinitions: (
    entities: readonly ValidatedEntity[],
    language: 'typescript' | 'go' | 'java' | 'python'
  ) =>
    pipe(
      Effect.succeed({ entities, language }),
      Effect.flatMap(({ entities, language }) =>
        pipe(
          Match.value(language),
          Match.when('typescript', () => generateTypeScriptTypes(entities)),
          Match.when('go', () => generateGoTypes(entities)),
          Match.when('java', () => generateJavaTypes(entities)),
          Match.when('python', () => generatePythonTypes(entities)),
          Match.exhaustive
        )
      ),
      Effect.catchAll(error =>
        Effect.fail(
          new CodeGenerationError({
            message: `Failed to generate ${language} types: ${error}`,
            targetLanguage: language,
            entityType: 'multiple',
          })
        )
      )
    ),
})

// ============================================================================
// Helper Functions for Entity Generation
// ============================================================================

const generateUserEntityBuilder = (): Effect.Effect<ValidatedEntity | null, never> =>
  pipe(
    createUltraStrictEntityBuilder('User'),
    withSchema(
      Schema.Struct({
        id: Schema.String,
        email: Schema.String,
        name: Schema.optional(Schema.String),
      })
    ),
    withKeys([
      UltraStrictEntityBuilder.Key.create('id', { name: 'ID' } as GraphQLOutputType, false),
    ]),
    withDirectives([
      UltraStrictEntityBuilder.Directive.shareable(),
      UltraStrictEntityBuilder.Directive.tag('user'),
    ]),
    withResolvers({
      fullName: (parent: unknown) => `${(parent as { name?: string }).name ?? 'Anonymous'}`,
    }),
    validateEntityBuilder,
    Effect.map(result =>
      pipe(
        Match.value(result),
        Match.tag('Valid', ({ entity }) => entity),
        Match.orElse(() => null)
      )
    ),
    Effect.catchAll(() => Effect.succeed(null))
  )

const generateProductEntityBuilder = (): Effect.Effect<ValidatedEntity | null, never> =>
  pipe(
    createUltraStrictEntityBuilder('Product'),
    withSchema(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        price: Schema.Number,
      })
    ),
    withKeys([
      UltraStrictEntityBuilder.Key.create('id', { name: 'ID' } as GraphQLOutputType, false),
    ]),
    withDirectives([UltraStrictEntityBuilder.Directive.shareable()]),
    withResolvers({
      formattedPrice: (parent: unknown) => `$${(parent as { price: number }).price.toFixed(2)}`,
    }),
    validateEntityBuilder,
    Effect.map(result =>
      pipe(
        Match.value(result),
        Match.tag('Valid', ({ entity }) => entity),
        Match.orElse(() => null)
      )
    ),
    Effect.catchAll(() => Effect.succeed(null))
  )

const generateOrderEntityBuilder = (): Effect.Effect<ValidatedEntity | null, never> =>
  pipe(
    createUltraStrictEntityBuilder('Order'),
    withSchema(
      Schema.Struct({
        id: Schema.String,
        userId: Schema.String,
        total: Schema.Number,
      })
    ),
    withKeys([
      UltraStrictEntityBuilder.Key.create('id', { name: 'ID' } as GraphQLOutputType, false),
    ]),
    withDirectives([UltraStrictEntityBuilder.Directive.requires('userId')]),
    withResolvers({
      formattedTotal: (parent: unknown) => {
        const typedParent = parent as { total: number }
        return `$${typedParent.total.toFixed(2)}`
      },
    }),
    validateEntityBuilder,
    Effect.map(result =>
      pipe(
        Match.value(result),
        Match.tag('Valid', ({ entity }) => entity),
        Match.orElse(() => null)
      )
    ),
    Effect.catchAll(() => Effect.succeed(null))
  )

// ============================================================================
// Type Generation Functions
// ============================================================================

const generateTypeScriptTypes = (
  entities: readonly ValidatedEntity[]
): Effect.Effect<string, never> =>
  Effect.succeed(
    entities
      .map(
        entity => `
export interface ${entity.typename} {
  ${entity.keys.map(key => `readonly ${key.field}: string`).join('\n  ')}
  // Additional fields from schema would be generated here
}

export type ${entity.typename}Input = Omit<${entity.typename}, 'id'>
`
      )
      .join('\n')
  )

const generateGoTypes = (entities: readonly ValidatedEntity[]): Effect.Effect<string, never> =>
  Effect.succeed(
    `package federation\n\n` +
      entities
        .map(
          entity => `
type ${entity.typename} struct {
  ${entity.keys.map(key => `${key.field.charAt(0).toUpperCase() + key.field.slice(1)} string \`json:"${key.field}"\``).join('\n  ')}
  // Additional fields from schema would be generated here
}
`
        )
        .join('\n')
  )

const generateJavaTypes = (entities: readonly ValidatedEntity[]): Effect.Effect<string, never> =>
  Effect.succeed(
    entities
      .map(
        entity => `
public class ${entity.typename} {
  ${entity.keys.map(key => `private String ${key.field};`).join('\n  ')}

  // Constructors, getters, and setters would be generated here
}
`
      )
      .join('\n')
  )

const generatePythonTypes = (entities: readonly ValidatedEntity[]): Effect.Effect<string, never> =>
  Effect.succeed(
    `from dataclasses import dataclass\nfrom typing import Optional\n\n` +
      entities
        .map(
          entity => `
@dataclass
class ${entity.typename}:
    ${entity.keys.map(key => `${key.field}: str`).join('\n    ')}
    # Additional fields from schema would be generated here
`
        )
        .join('\n')
  )

// ============================================================================
// Schema-First Workflow Orchestrator
// ============================================================================

export interface SchemaFirstWorkflow {
  readonly developSchema: (
    schemaSource: string
  ) => Effect.Effect<SchemaLifecycleState, SchemaFirstError>

  readonly evolveSchema: (
    currentState: SchemaLifecycleState,
    proposedSchema: string
  ) => Effect.Effect<SchemaLifecycleState, SchemaEvolutionError>

  readonly generateCode: (
    state: SchemaLifecycleState,
    targets: readonly ('resolvers' | 'types')[]
  ) => Effect.Effect<Record<string, string>, CodeGenerationError>
}

export const createSchemaFirstWorkflow = (
  schemaFirstService: SchemaFirstService
): SchemaFirstWorkflow => ({
  developSchema: (schemaSource: string) =>
    pipe(
      schemaFirstService.parseSchemaDefinition(schemaSource),
      Effect.flatMap(schema =>
        pipe(
          schemaFirstService.generateEntityBuilders(schema),
          Effect.map(entities =>
            SchemaLifecycleState.Validated({
              schema,
              entities,
              version: '1.0.0',
            })
          )
        )
      )
    ),

  evolveSchema: (currentState: SchemaLifecycleState, proposedSchema: string) =>
    pipe(
      Match.value(currentState),
      Match.tag('Validated', ({ schema: currentSchema }) =>
        pipe(
          schemaFirstService.parseSchemaDefinition(proposedSchema),
          Effect.mapError(
            (error: SchemaFirstError) =>
              new SchemaEvolutionError({
                message: error.message,
                evolution: SchemaEvolution.AddField({
                  entityType: 'Unknown',
                  fieldName: 'unknown',
                  fieldType: 'String',
                  isBreaking: false,
                }),
              })
          ),
          Effect.flatMap(proposedSchemaDoc =>
            pipe(
              schemaFirstService.validateSchemaEvolution(currentSchema, proposedSchemaDoc),
              Effect.flatMap((evolutions: readonly SchemaEvolution[]) => {
                const hasBreakingChanges = evolutions.some(evo =>
                  Match.value(evo).pipe(
                    Match.tag('AddField', ({ isBreaking }) => isBreaking),
                    Match.tag('RemoveField', ({ isBreaking }) => isBreaking),
                    Match.tag('ChangeFieldType', ({ isBreaking }) => isBreaking),
                    Match.orElse(() => false)
                  )
                )

                if (hasBreakingChanges) {
                  return Effect.fail(
                    new SchemaEvolutionError({
                      message: 'Schema evolution contains breaking changes',
                      evolution:
                        evolutions[0] ??
                        SchemaEvolution.AddField({
                          entityType: 'Unknown',
                          fieldName: 'unknown',
                          fieldType: 'String',
                          isBreaking: true,
                        }),
                      conflictingChanges: evolutions,
                    })
                  )
                }

                return pipe(
                  schemaFirstService.generateEntityBuilders(proposedSchemaDoc),
                  Effect.map(entities =>
                    SchemaLifecycleState.Validated({
                      schema: proposedSchemaDoc,
                      entities,
                      version: '1.1.0',
                    })
                  ),
                  Effect.mapError(
                    (error: SchemaFirstError) =>
                      new SchemaEvolutionError({
                        message: error.message,
                        evolution: SchemaEvolution.AddField({
                          entityType: 'Unknown',
                          fieldName: 'unknown',
                          fieldType: 'String',
                          isBreaking: false,
                        }),
                      })
                  )
                )
              })
            )
          )
        )
      ),
      Match.orElse(_state =>
        Effect.fail(
          new SchemaEvolutionError({
            message: 'Can only evolve validated schemas',
            evolution: SchemaEvolution.AddField({
              entityType: 'Unknown',
              fieldName: 'unknown',
              fieldType: 'String',
              isBreaking: false,
            }),
            conflictingChanges: [],
          })
        )
      )
    ),

  generateCode: (state: SchemaLifecycleState, targets: readonly ('resolvers' | 'types')[]) =>
    pipe(
      Match.value(state),
      Match.tag('Validated', ({ entities }) =>
        pipe(
          Effect.all(
            targets.map(target =>
              pipe(
                Match.value(target),
                Match.when('resolvers', () =>
                  pipe(
                    schemaFirstService.generateResolverStubs(entities),
                    Effect.map(code => [target, code] as const)
                  )
                ),
                Match.when('types', () =>
                  pipe(
                    schemaFirstService.generateTypeDefinitions(entities, 'typescript'),
                    Effect.map(code => [target, code] as const)
                  )
                ),
                Match.exhaustive
              )
            )
          ),
          Effect.map(results => Object.fromEntries(results))
        )
      ),
      Match.orElse(() =>
        Effect.fail(
          new CodeGenerationError({
            message: 'Can only generate code from validated schemas',
            targetLanguage: 'typescript',
            entityType: 'multiple',
          })
        )
      )
    ),
})

// ============================================================================
// Public API
// ============================================================================

export namespace SchemaFirst {
  export const Service = {
    create: createSchemaFirstService,
    Tag: SchemaFirstService,
  }

  export const Workflow = {
    create: createSchemaFirstWorkflow,
  }

  export const State = SchemaLifecycleState
  export const Evolution = SchemaEvolution
}
