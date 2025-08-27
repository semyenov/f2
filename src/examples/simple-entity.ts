import * as Effect from "effect/Effect"
import * as Schema from "@effect/schema/Schema"
import { pipe } from "effect/Function"
import { ModernFederationEntityBuilder } from "../core/builders/entity-builder.js"

/**
 * Simplified Federation v2 Example
 * 
 * Demonstrates basic entity creation and validation
 */

// Define User schema with Effect Schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
})

type User = Schema.Schema.Type<typeof UserSchema>

// Federation context interface
interface FederationContext {
  readonly userId?: string
  readonly permissions: ReadonlyArray<string>
}

// Simple example that just creates an entity and validates it  
const example = pipe(
  Effect.succeed({}),
  Effect.flatMap(() => {
    console.log("🚀 Creating Federation Entity...")
    
    const builder = new ModernFederationEntityBuilder("User", UserSchema, ["id"])
      .withShareableField("email")
      .withField("name", (parent, _args, _context, _info) => 
        Effect.succeed(parent.name || parent.email?.split("@")?.[0] || 'Anonymous')
      )
      .withReferenceResolver((reference, _context, _info) => {
        console.log(`📍 Resolving User reference:`, reference)
        
        // Simple mock resolution
        const user: User = {
          id: reference.id as string,
          email: `user${reference.id}@example.com`,
          name: `User ${reference.id}`,
        }
        
        return Effect.succeed(user)
      })

    return builder.build()
  }),
  Effect.tap(userEntity => {
    console.log("✅ User entity created successfully!")
    console.log(`   - Typename: ${userEntity.typename}`)
    console.log(`   - Key fields:`, userEntity.key)
    console.log(`   - Has ${Object.keys(userEntity.fields || {}).length} field resolvers`)
    console.log(`   - Has ${Object.keys(userEntity.directives || {}).length} directive configurations`)
    
    return Effect.succeed(userEntity)
  }),
  Effect.flatMap(userEntity => {
    console.log("\n🔧 Testing entity reference resolution...")
    
    // Test the reference resolver
    const testReference = { id: "123" }
    const mockContext: FederationContext = { permissions: ["read"] }
    const mockInfo = {} as any
    
    return userEntity.resolveReference(testReference, mockContext, mockInfo)
  }),
  Effect.tap(resolvedUser => {
    console.log("✅ Reference resolution successful!")
    console.log(`   - Resolved user:`, resolvedUser)
    return Effect.succeed(resolvedUser)
  }),
  Effect.catchAll(error => {
    console.error("❌ Example failed:")
    console.error(`   - Error:`, error)
    return Effect.succeed(null)
  })
)

// Run the example
console.log("🎯 Starting Federation v2 Simple Entity Example...")
console.log("==================================================")

Effect.runPromise(example)
  .then(() => {
    console.log("\n" + "====================================================")
    console.log("🎉 Example completed successfully!")
  })
  .catch(error => {
    console.error("💥 Example failed:", error)
  })

export { example as simpleEntityExample }