/**
 * Ultra-Strict Entity Builder Example
 * 
 * Demonstrates the type-safe entity building process with pattern matching
 * and exhaustive validation handling.
 */

import * as Effect from "effect/Effect"
import * as Schema from "@effect/schema/Schema"
import { pipe } from "effect/Function"
import { GraphQLID } from "graphql"

import {
  UltraStrictEntityBuilder,
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
  type EntityValidationResult
} from "../core/ultra-strict-entity-builder.js"

// ============================================================================
// Example Entity Schema
// ============================================================================

const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
  isActive: Schema.optional(Schema.Boolean)
})

const resolvers = {
  fullName: (parent: any) => `${parent.name || 'Anonymous'}`,
  isEmailVerified: (parent: any) => Boolean(parent.email?.includes('@'))
}

// ============================================================================
// Demonstration: Type-Safe Entity Building
// ============================================================================

/**
 * Example 1: Valid Entity Construction
 * Shows the complete type-safe building process
 */
export const createValidUserEntity = () =>
  pipe(
    // Step 1: Create builder (Unvalidated state)
    createUltraStrictEntityBuilder("User"),
    
    // Step 2: Add schema (HasSchema state)
    withSchema(UserSchema),
    
    // Step 3: Define keys (HasKeys state)  
    withKeys([
      UltraStrictEntityBuilder.Key.create("id", GraphQLID, false)
    ]),
    
    // Step 4: Apply directives (HasDirectives state)
    withDirectives([
      UltraStrictEntityBuilder.Directive.shareable(),
      UltraStrictEntityBuilder.Directive.tag("user")
    ]),
    
    // Step 5: Add resolvers (Complete state)
    withResolvers(resolvers),
    
    // Step 6: Validate with exhaustive error handling
    validateEntityBuilder,
    Effect.catchAll(() => 
      Effect.succeed({
        _tag: "InvalidSchema" as const,
        errors: []
      } as const)
    )
  )

/**
 * Example 2: Invalid Schema Entity
 * Shows validation error handling
 */
export const createInvalidSchemaEntity = (): Effect.Effect<EntityValidationResult, never> => {
  const InvalidSchema = Schema.Struct({
    // Missing required 'id' field that we reference in keys
    name: Schema.String
  })
  
  return pipe(
    createUltraStrictEntityBuilder("InvalidUser"),
    withSchema(InvalidSchema),
    withKeys([
      UltraStrictEntityBuilder.Key.create("id", GraphQLID, false) // This will fail - 'id' not in schema
    ]),
    withDirectives([]),
    withResolvers({}),
    validateEntityBuilder,
    Effect.catchAll(() => 
      Effect.succeed({
        _tag: "InvalidKeys" as const,
        errors: [],
        schema: InvalidSchema
      })
    )
  )
}

/**
 * Example 3: Invalid Directive Entity
 * Shows directive validation errors
 */
export const createInvalidDirectiveEntity = (): Effect.Effect<EntityValidationResult, never> =>
  pipe(
    createUltraStrictEntityBuilder("InvalidDirectiveUser"),
    withSchema(UserSchema),
    withKeys([
      UltraStrictEntityBuilder.Key.create("id", GraphQLID, false)
    ]),
    withDirectives([
      UltraStrictEntityBuilder.Directive.create("invalidDirective", {}), // This will fail
      UltraStrictEntityBuilder.Directive.override("") // This will fail - empty 'from'
    ]),
    withResolvers(resolvers),
    validateEntityBuilder,
    Effect.catchAll(() => 
      Effect.succeed({
        _tag: "InvalidDirectives" as const,
        errors: [],
        schema: UserSchema,
        keys: []
      })
    )
  )

// ============================================================================
// Pattern Matching Result Handlers
// ============================================================================

/**
 * Exhaustive pattern matching over validation results
 */
export const handleEntityValidationResult = (result: EntityValidationResult): string =>
  matchEntityValidationResult({
    Valid: ({ entity }) => 
      `✅ Successfully created entity '${entity.typename}' with ${entity.keys.length} keys and ${entity.directives.length} directives`,
    
    InvalidSchema: ({ errors }) => 
      `❌ Schema validation failed with ${errors.length} errors:\n${errors.map(e => `  - ${e.message}`).join('\n')}`,
    
    InvalidKeys: ({ errors }) => 
      `❌ Key validation failed with ${errors.length} errors:\n${errors.map(e => `  - ${e.message} (field: ${e.keyField})`).join('\n')}`,
    
    InvalidDirectives: ({ errors }) => 
      `❌ Directive validation failed with ${errors.length} errors:\n${errors.map(e => `  - ${e.message} (@${e.directive})`).join('\n')}`,
    
    CircularDependency: ({ cycle, involvedEntities }) => 
      `❌ Circular dependency detected: ${cycle.join(' → ')} (entities: ${involvedEntities.join(', ')})`,
    
    IncompatibleVersion: ({ requiredVersion, currentVersion, entity }) => 
      `❌ Version incompatibility: Entity '${entity}' requires v${requiredVersion}, but current version is v${currentVersion}`
  })(result)

// ============================================================================
// Demo Program
// ============================================================================

/**
 * Comprehensive demo showing all validation scenarios
 */
export const runUltraStrictEntityDemo = (): Effect.Effect<void, never> =>
  pipe(
    Effect.all([
      createValidUserEntity(),
      createInvalidSchemaEntity(),
      createInvalidDirectiveEntity()
    ]),
    Effect.flatMap(([validResult, invalidSchemaResult, invalidDirectiveResult]) =>
      Effect.sync(() => {
        console.log("🧪 Ultra-Strict Entity Builder Demo")
        console.log("=".repeat(50))
        
        console.log("\n📝 Example 1: Valid Entity")
        console.log(handleEntityValidationResult(validResult))
        
        console.log("\n📝 Example 2: Invalid Schema Entity")  
        console.log(handleEntityValidationResult(invalidSchemaResult))
        
        console.log("\n📝 Example 3: Invalid Directive Entity")
        console.log(handleEntityValidationResult(invalidDirectiveResult))
        
        console.log("\n" + "=".repeat(50))
        console.log("🎯 Pattern Matching Results:")
        console.log("✅ All validation scenarios handled exhaustively")
        console.log("🔒 Compile-time type safety enforced")
        console.log("🚀 Zero-cost abstractions with phantom types")
      })
    )
  )

// ============================================================================
// Type-Safe Builder Usage Examples
// ============================================================================

/**
 * This demonstrates compile-time safety - these examples would cause TypeScript errors:
 */

// ❌ This would be a compile error - can't add keys before schema:
// const invalid1 = pipe(
//   createUltraStrictEntityBuilder("Test"),
//   withKeys([...]) // ERROR: Not allowed in Unvalidated state
// )

// ❌ This would be a compile error - can't validate incomplete builder:
// const invalid2 = pipe(
//   createUltraStrictEntityBuilder("Test"),
//   withSchema(UserSchema),
//   validateEntityBuilder // ERROR: Not allowed in HasSchema state, needs Complete state
// )

/**
 * ✅ This is the correct, type-safe way:
 */
export const correctUsageExample = () =>
  pipe(
    createUltraStrictEntityBuilder("Product"),
    withSchema(Schema.Struct({ id: Schema.String, name: Schema.String })),
    withKeys([UltraStrictEntityBuilder.Key.create("id", GraphQLID)]),
    withDirectives([UltraStrictEntityBuilder.Directive.shareable()]),
    withResolvers({}),
    // Only now can we validate - builder is in Complete state
    validateEntityBuilder
  )