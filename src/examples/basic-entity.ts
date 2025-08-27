import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import { Duration } from "effect/index"
import { ModernFederationEntityBuilder } from "../core/builders/entity-builder.js"
import { createFederatedSchema } from "../federation/composer.js"
import { DevelopmentLayerLive } from "../core/services/layers.js"

/**
 * Basic Federation v2 Example
 *
 * Demonstrates:
 * - Entity creation with Effect Schema
 * - Federation directives (@shareable, @tag)
 * - Reference resolution with Effect-based error handling
 * - Schema composition
 */

// Define User schema with Effect Schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
  createdAt: Schema.Date
})

type User = Schema.Schema.Type<typeof UserSchema>

// Define federation context
export interface FederationContext {
  readonly userId?: string
  readonly permissions: ReadonlyArray<string>
}

// Create federation entity with directives
const createUserEntity = () => {
  const builder = new ModernFederationEntityBuilder("User", UserSchema, ["id"])
    .withShareableField("email") // Can be resolved by multiple subgraphs
    .withTaggedField("name", ["pii"], ({ email }, _args, _context, _info) =>
      Effect.succeed(email!.split("@")[0])
    )
    .withReferenceResolver((reference, _context, _info) =>
      pipe(
        Effect.succeed(reference),
        Effect.flatMap(ref => {
          // Simulate entity resolution with validation
          console.log(`Resolving User entity:`, ref)

          // In a real implementation, this would fetch from a data source
          const user: User = {
            id: ref.id as string,
            email: `user${ref.id}@example.com`,
            name: `User ${ref.id}`,
            createdAt: new Date()
          }

          return Effect.succeed(user)
        })
      )
    )

  return builder.build()
}

// Example: Create and compose federation schema
const example = pipe(
  createUserEntity(),
  Effect.flatMap(userEntity => {
    console.log("✓ User entity created successfully")
    console.log(`  - Typename: ${userEntity.typename}`)
    console.log(`  - Key fields: ${JSON.stringify(userEntity.key)}`)
    console.log(`  - Directives:`, userEntity.directives)

    return createFederatedSchema({
      entities: [userEntity],
      services: [
        { id: "users", url: "http://localhost:4001" }
      ],
      errorBoundaries: {
        subgraphTimeouts: {
          "users": Duration.seconds(5)
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 5
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: ["users"]
        }
      },
      performance: {
        queryPlanCache: { maxSize: 100 },
        dataLoaderConfig: { maxBatchSize: 50 },
        metricsCollection: { enabled: true }
      }
    })
  }),
  Effect.tap(schema => {
    console.log("✓ Federation schema composed successfully")
    console.log(`  - Version: ${schema.version}`)
    console.log(`  - Entity count: ${schema.metadata.entityCount}`)
    console.log(`  - Subgraph count: ${schema.metadata.subgraphCount}`)
  }),
  Effect.catchAll(error => {
    console.error("✗ Federation example failed:")
    console.error(`  - Error: ${error.message}`)
    if ("cause" in error && error.cause) {
      console.error(`  - Cause: ${error.cause}`)
    }
    return Effect.succeed(null)
  })
)

// Run the example
console.log("🚀 Starting Federation v2 Basic Example...")

Effect.runPromise(
  example.pipe(
    Effect.provide(DevelopmentLayerLive)
  )
)
  .then(() => {
    console.log("🎉 Example completed!")
  })
  .catch(error => {
    console.error("💥 Example failed:", error)
  })

export { example as basicEntityExample }
