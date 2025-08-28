/**
 * Experimental Features Module - Advanced TypeScript Patterns and Ultra-Strict Entity Builders
 *
 * This module contains cutting-edge TypeScript patterns, experimental features, and ultra-strict
 * entity builders that demonstrate the framework's advanced capabilities. These features provide
 * compile-time guarantees, phantom types, and sophisticated pattern matching for maximum type safety.
 *
 * ## 🧪 Experimental Features Overview
 *
 * ### Ultra-Strict Entity Builder
 * A compile-time validated entity builder using phantom types to enforce correct construction order:
 * - **Phantom Types**: State machine enforced at compile time
 * - **Discriminated Unions**: Exhaustive pattern matching over validation results
 * - **Zero-Cost Abstractions**: Runtime performance with compile-time safety
 * - **Type-Safe Pipelines**: Fluent API that prevents invalid state transitions
 *
 * ### Advanced Pattern Matching
 * Comprehensive pattern matching system for handling complex validation scenarios:
 * - **Exhaustive Matching**: Compiler-enforced handling of all cases
 * - **Tagged Unions**: Type-safe discriminated union handling
 * - **Error Correlation**: Rich error context and suggestion system
 * - **Validation Pipelines**: Composable validation with detailed error reporting
 *
 * ## 🎯 When to Use Experimental Features
 *
 * ### Use Ultra-Strict Builder When:
 * - **Maximum Type Safety**: Critical systems requiring compile-time validation
 * - **Complex Entity Rules**: Entities with sophisticated validation requirements
 * - **Team Enforcement**: Large teams needing guardrails against invalid configurations
 * - **Schema Evolution**: Entities that frequently change and need migration safety
 *
 * ### Use Standard Builder When:
 * - **Rapid Development**: Prototyping and quick iteration scenarios
 * - **Simple Entities**: Straightforward entities without complex validation needs
 * - **Learning Phase**: Teams new to the framework or Effect-TS patterns
 * - **Dynamic Configurations**: Runtime entity construction from external sources
 *
 * ## ⚠️ Experimental Status
 *
 * These features are marked experimental because:
 * - **API Evolution**: APIs may change in future versions
 * - **Performance Impact**: Additional compile-time checks may slow TypeScript compilation
 * - **Complexity Trade-offs**: Added type safety comes with learning curve overhead
 * - **Ecosystem Maturity**: Integration with tooling may be limited
 *
 * ## 🚀 Usage Comparison
 *
 * Comparing standard and ultra-strict builder approaches:
 *
 * ```typescript
 * // Standard builder
 * const entity = createEntityBuilder('User', UserSchema, ['id'])
 *   .withShareableField('name')
 *   .withReferenceResolver(resolveUser)
 *   .build()
 *
 * // Ultra-strict builder
 * const entity = createUltraStrictEntityBuilder('User')
 *   .pipe(withSchema(UserSchema))
 *   .pipe(withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID)]))
 *   .pipe(withDirectives([UltraStrictEntityBuilder.Directive.shareable()]))
 *   .pipe(withResolvers({ __resolveReference: resolveUser }))
 * ```
 *
 * @example Ultra-strict entity with comprehensive validation
 * ```typescript
 * import {
 *   createUltraStrictEntityBuilder,
 *   withSchema,
 *   withKeys,
 *   withDirectives,
 *   withResolvers,
 *   validateEntityBuilder,
 *   matchEntityValidationResult,
 *   UltraStrictEntityBuilder
 * } from '@cqrs/federation/experimental'
 *
 * const UserSchema = Schema.Struct({
 *   id: Schema.String,
 *   email: Schema.String,
 *   name: Schema.String,
 *   organizationId: Schema.String
 * })
 *
 * const buildUserEntity = Effect.gen(function* () {
 *   // Step 1: Build entity with compile-time state validation
 *   const builder = createUltraStrictEntityBuilder('User')
 *     .pipe(withSchema(UserSchema))
 *     .pipe(withKeys([
 *       UltraStrictEntityBuilder.Key.create('id', GraphQLID),
 *       UltraStrictEntityBuilder.Key.create('organizationId', GraphQLID) // Composite key
 *     ]))
 *     .pipe(withDirectives([
 *       UltraStrictEntityBuilder.Directive.shareable(),
 *       UltraStrictEntityBuilder.Directive.tag('public'),
 *       UltraStrictEntityBuilder.Directive.requires('organizationId')
 *     ]))
 *     .pipe(withResolvers({
 *       __resolveReference: resolveUserReference,
 *       displayName: resolveDisplayName,
 *       avatar: resolveAvatar
 *     }))
 *
 *   // Step 2: Validate with exhaustive pattern matching
 *   const validation = yield* validateEntityBuilder(builder)
 *
 *   return matchEntityValidationResult({
 *     Valid: ({ entity, metadata }) => {
 *       console.log(`✅ Entity validated successfully: ${entity.typename}`)
 *       return entity
 *     },
 *     InvalidSchema: ({ errors }) => {
 *       const errorMessages = errors.map(e => `Schema error: ${e.message}`)
 *       throw new Error(`Schema validation failed:\n${errorMessages.join('\n')}`)
 *     },
 *     InvalidKeys: ({ errors, schema }) => {
 *       const suggestions = errors.map(e => e.suggestion).filter(Boolean)
 *       throw new Error(`Key validation failed. Suggestions: ${suggestions.join(', ')}`)
 *     },
 *     InvalidDirectives: ({ errors }) => {
 *       const conflicts = errors.filter(e => e.message.includes('conflict'))
 *       throw new Error(`Directive conflicts detected: ${conflicts.map(e => e.message).join(', ')}`)
 *     },
 *     CircularDependency: ({ cycle, involvedEntities }) => {
 *       throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`)
 *     },
 *     IncompatibleVersion: ({ requiredVersion, currentVersion, entity }) => {
 *       throw new Error(`Version mismatch for ${entity}: requires ${requiredVersion}, got ${currentVersion}`)
 *     }
 *   })(validation)
 * })
 * ```
 *
 * @example Error handling with rich context
 * ```typescript
 * const handleEntityValidation = (result: EntityValidationResult) =>
 *   matchEntityValidationResult({
 *     Valid: ({ entity }) =>
 *       Effect.succeed(`Entity ${entity.typename} is ready for federation`),
 *
 *     InvalidSchema: ({ errors, partialEntity }) =>
 *       Effect.gen(function* () {
 *         const logger = yield* FederationLogger
 *
 *         yield* logger.error('Schema validation failed', {
 *           errors: errors.map(e => ({
 *             message: e.message,
 *             path: e.schemaPath,
 *             suggestion: e.suggestion
 *           }))
 *         })
 *
 *         // Attempt partial recovery if possible
 *         if (partialEntity) {
 *           yield* logger.warn('Attempting partial entity recovery', {
 *             availableFields: Object.keys(partialEntity)
 *           })
 *         }
 *
 *         return yield* Effect.fail(new ValidationError(
 *           `Schema validation failed: ${errors.map(e => e.message).join(', ')}`,
 *           'schema'
 *         ))
 *       }),
 *
 *     InvalidKeys: ({ errors, schema }) =>
 *       Effect.gen(function* () {
 *         const logger = yield* FederationLogger
 *
 *         yield* logger.error('Key validation failed', {
 *           missingKeys: errors.filter(e => e.message.includes('not found')),
 *           suggestions: errors.map(e => e.suggestion).filter(Boolean)
 *         })
 *
 *         return yield* Effect.fail(new ValidationError(
 *           'Entity key validation failed',
 *           'keys',
 *           errors.map(e => e.keyField)
 *         ))
 *       }),
 *
 *     InvalidDirectives: ({ errors }) =>
 *       Effect.fail(new ValidationError(
 *         `Directive validation failed: ${errors.map(e =>
 *           `@${e.directive}${e.field ? ` on ${e.field}` : ''}: ${e.message}`
 *         ).join(', ')}`,
 *         'directives'
 *       )),
 *
 *     CircularDependency: ({ cycle }) =>
 *       Effect.fail(new CompositionError(
 *         `Circular dependency in entity relationships: ${cycle.join(' -> ')}`
 *       )),
 *
 *     IncompatibleVersion: ({ requiredVersion, currentVersion, entity }) =>
 *       Effect.fail(new CompositionError(
 *         `Federation version mismatch for entity ${entity}: requires ${requiredVersion} but found ${currentVersion}`
 *       ))
 *   })(result)
 * ```
 *
 * @example Advanced phantom type usage
 * ```typescript
 * // Phantom types prevent invalid builder usage at compile time
 * const invalidBuilder = createUltraStrictEntityBuilder('Product')
 *   // .pipe(withKeys([...])) // ❌ Compile error: keys require schema first
 *
 * const validBuilder = createUltraStrictEntityBuilder('Product')
 *   .pipe(withSchema(ProductSchema))     // ✅ Schema first
 *   .pipe(withKeys([                     // ✅ Then keys
 *     UltraStrictEntityBuilder.Key.create('id', GraphQLID),
 *     UltraStrictEntityBuilder.Key.create('sku', GraphQLString)
 *   ]))
 *   .pipe(withDirectives([               // ✅ Then directives
 *     UltraStrictEntityBuilder.Directive.shareable(),
 *     UltraStrictEntityBuilder.Directive.tag('inventory')
 *   ]))
 *   .pipe(withResolvers({                // ✅ Finally resolvers
 *     __resolveReference: resolveProduct,
 *     price: resolvePricing,
 *     availability: resolveInventory
 *   }))
 * ```
 *
 * @category Experimental Features
 * @experimental
 * @see {@link UltraStrictEntityBuilder} - Ultra-strict entity builder with phantom types
 * @see {@link EntityValidationResult} - Discriminated union for validation results
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html | TypeScript Advanced Types}
 */

export {
  createUltraStrictEntityBuilder,
  DirectiveValidationError,
  EntityBuilderError,
  type EntityDirective,
  type EntityKey,
  type EntityMetadata,
  type EntityValidationResult,
  KeyValidationError,
  matchEntityValidationResult,
  type PhantomStates,
  SchemaValidationError,
  UltraStrictEntityBuilder,
  type ValidatedEntity,
  validateEntityBuilder,
  withDirectives,
  withKeys,
  withResolvers,
  withSchema,
} from './ultra-strict-entity-builder.js'
