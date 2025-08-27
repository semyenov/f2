import * as Effect from "effect/Effect"
import * as Schema from "@effect/schema/Schema"
import { pipe, Duration } from "effect"
import { ModernFederationEntityBuilder } from "../core/builders/entity-builder.js"
import { createMonitoredRegistry } from "../federation/subgraph.js"
import { createResilientBoundary } from "../federation/error-boundaries.js"
import { createProductionOptimizedExecutor } from "../federation/performance.js"

/**
 * Advanced Federation v2 Example
 * 
 * Demonstrates comprehensive federation features:
 * - Multiple entities with federation directives
 * - Subgraph management with health monitoring
 * - Circuit breakers and error boundaries
 * - Performance optimizations with caching
 * - Service discovery and registration
 */

// === Schema Definitions ===

const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
  role: Schema.Literal("admin", "user", "guest"),
  createdAt: Schema.Date
})

const ProductSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  category: Schema.String,
  ownerId: Schema.String,
  isActive: Schema.Boolean
})

const OrderSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  productIds: Schema.Array(Schema.String),
  total: Schema.Number,
  status: Schema.Literal("pending", "completed", "cancelled"),
  orderDate: Schema.Date
})

// Entity types are inferred from schemas and used in resolvers
export type User = Schema.Schema.Type<typeof UserSchema>
export type Product = Schema.Schema.Type<typeof ProductSchema>
export type Order = Schema.Schema.Type<typeof OrderSchema>

export interface FederationContext {
  readonly userId?: string
  readonly permissions: ReadonlyArray<string>
  readonly traceId: string
}

// === Entity Creation ===

const createUserEntity = () => {
  const builder = new ModernFederationEntityBuilder("User", UserSchema, ["id"])
    .withShareableField("email") // Email can be resolved by multiple subgraphs
    .withTaggedField("name", ["pii"]) // Name is tagged as PII
    .withInaccessibleField("role") // Role is not exposed in public schema
    .withField("name", (parent, _args, _context, _info) => 
      Effect.succeed(parent.name || parent.email?.split("@")[0] || 'Anonymous')
    )
    .withReferenceResolver((reference, _context, _info) => {
      console.log(`🔍 Resolving User entity: ${reference.id}`)
      
      return pipe(
        Effect.succeed({
          id: reference.id as string,
          email: `user${reference.id}@company.com`,
          name: `User ${reference.id}`,
          role: "user" as const,
          createdAt: new Date()
        }),
        Effect.tap(user => Effect.sync(() => {
          console.log(`✅ Resolved User: ${user.name} (${user.email})`)
        }))
      )
    })

  return builder.build()
}

const createProductEntity = () => {
  const builder = new ModernFederationEntityBuilder("Product", ProductSchema, ["id"])
    .withShareableField("name")
    .withOverrideField("price", "inventory-service", (parent, _args, _context, _info) => {
      // Override price resolution from inventory service
      return Effect.succeed((parent.price ?? 0) * 1.1) // Add 10% markup
    })
    .withField("ownerId", (parent, _args, _context, _info) =>
      // Resolve owner user entity
      Effect.succeed(parent.ownerId)
    )
    .withReferenceResolver((reference, _context, _info) => {
      console.log(`🔍 Resolving Product entity: ${reference.id}`)
      
      return pipe(
        Effect.succeed({
          id: reference.id as string,
          name: `Product ${reference.id}`,
          price: Math.random() * 100,
          category: "electronics",
          ownerId: "user123",
          isActive: true
        }),
        Effect.tap(product => Effect.sync(() => {
          console.log(`✅ Resolved Product: ${product.name} ($${product.price})`)
        }))
      )
    })

  return builder.build()
}

const createOrderEntity = () => {
  const builder = new ModernFederationEntityBuilder("Order", OrderSchema, ["id"])
    .withField("userId", (parent, _args, _context, _info) =>
      Effect.succeed(parent.userId)
    )
    .withField("productIds", (parent, _args, _context, _info) =>
      Effect.succeed(parent.productIds ?? [])
    )
    .withReferenceResolver((reference, _context, _info) => {
      console.log(`🔍 Resolving Order entity: ${reference.id}`)
      
      return pipe(
        Effect.succeed({
          id: reference.id as string,
          userId: "user123",
          productIds: ["product1", "product2"],
          total: 150.00,
          status: "completed" as const,
          orderDate: new Date()
        }),
        Effect.tap(order => Effect.sync(() => {
          console.log(`✅ Resolved Order: ${order.id} ($${order.total})`)
        }))
      )
    })

  return builder.build()
}

// === Service Configuration ===

const serviceDefinitions = [
  {
    id: "users",
    url: "http://users-service:4001",
    name: "User Service",
    version: "1.0.0",
    metadata: { team: "identity", criticality: "high" }
  },
  {
    id: "products",
    url: "http://products-service:4002",
    name: "Product Service", 
    version: "1.0.0",
    metadata: { team: "catalog", criticality: "medium" }
  },
  {
    id: "orders",
    url: "http://orders-service:4003",
    name: "Order Service",
    version: "1.0.0",
    metadata: { team: "commerce", criticality: "high" }
  },
  {
    id: "inventory",
    url: "http://inventory-service:4004",
    name: "Inventory Service",
    version: "1.0.0", 
    metadata: { team: "catalog", criticality: "medium" }
  }
] as const

// === Main Example ===

const advancedFederationExample = pipe(
  Effect.Do,
  
  // Step 1: Create entities
  Effect.bind("entities", () => 
    Effect.all({
      user: createUserEntity(),
      product: createProductEntity(),
      order: createOrderEntity()
    })
  ),
  
  // Step 2: Set up subgraph registry with monitoring
  Effect.bind("registry", () => {
    console.log("🏗️  Setting up subgraph registry with health monitoring...")
    return createMonitoredRegistry(serviceDefinitions, {
      discoveryInterval: Duration.seconds(60),
      healthCheckInterval: Duration.seconds(30)
    })
  }),
  
  // Step 3: Create error boundaries with circuit breakers
  Effect.bind("errorBoundary", () => {
    console.log("🛡️  Creating error boundaries with circuit breakers...")
    return Effect.succeed(
      createResilientBoundary(
        serviceDefinitions.map(s => s.id),
        ["users", "orders"] // Critical subgraphs
      )
    )
  }),
  
  // Step 4: Set up performance optimizations
  Effect.bind("optimizer", ({ entities }) => {
    console.log("⚡ Setting up performance optimizations...")
    
    const mockFederatedSchema = {
      schema: {} as any,
      entities: [entities.user, entities.product, entities.order],
      services: serviceDefinitions,
      version: "2.0.0",
      metadata: {
        createdAt: new Date(),
        composedAt: new Date(),
        federationVersion: "2.0.0",
        subgraphCount: serviceDefinitions.length,
        entityCount: 3
      }
    }
    
    return createProductionOptimizedExecutor(mockFederatedSchema)
  }),
  
  // Step 5: Demonstrate service registration and health checks
  Effect.bind("healthDemo", ({ registry }) => {
    console.log("🏥 Demonstrating health checks...")
    
    return pipe(
      Effect.all(serviceDefinitions.map(service => 
        pipe(
          registry.health(service.id),
          Effect.tap(health => Effect.sync(() => {
            const statusIcon = health.status === "healthy" ? "✅" : 
                             health.status === "degraded" ? "⚠️" : "❌"
            console.log(`   ${statusIcon} ${service.name}: ${health.status}`)
          })),
          Effect.catchAll(() => Effect.succeed({
            status: "unhealthy" as const,
            serviceId: service.id
          }))
        )
      )),
      Effect.map(results => ({
        healthy: results.filter(r => r.status === "healthy").length,
        total: results.length
      }))
    )
  }),
  
  // Step 6: Demonstrate performance monitoring
  Effect.bind("performanceDemo", ({ optimizer }) => {
    console.log("📊 Demonstrating performance monitoring...")
    
    const mockQuery = `
      query GetUserWithOrders($userId: ID!) {
        user(id: $userId) {
          id
          name
          email
          orders {
            id
            total
            products {
              name
              price
            }
          }
        }
      }
    `
    
    const mockVariables = { userId: "123" }
    const mockContext = { 
      userId: "123", 
      permissions: ["read"], 
      traceId: "trace-123" 
    }
    
    return pipe(
      optimizer.execute(mockQuery, mockVariables, mockContext),
      Effect.tap(result => Effect.sync(() => {
        console.log("   📈 Query executed successfully")
        console.log(`   📊 Result data:`, result.data)
      })),
      Effect.catchAll(error => {
        console.log("   ❌ Query execution failed:", error)
        return Effect.succeed(null)
      })
    )
  }),
  
  // Step 7: Summary
  Effect.tap(({ entities, healthDemo, performanceDemo }) => 
    Effect.sync(() => {
      console.log("\n" + "=".repeat(60))
      console.log("🎉 Advanced Federation Example Summary")
      console.log("=".repeat(60))
      console.log(`✅ Entities created: ${Object.keys(entities).length}`)
      console.log(`✅ Services monitored: ${healthDemo.total} (${healthDemo.healthy} healthy)`)
      console.log(`✅ Performance optimization: ${performanceDemo ? 'Active' : 'Failed'}`)
      console.log(`✅ Error boundaries: Configured with circuit breakers`)
      console.log(`✅ Subgraph discovery: Active with health monitoring`)
      console.log("\n🚀 Federation v2 framework is fully operational!")
    })
  ),
  
  Effect.catchAll(error => 
    Effect.sync(() => {
      console.error("❌ Advanced Federation Example failed:")
      console.error("   Error:", error)
    })
  )
)

// === Run the Example ===

console.log("🚀 Starting Advanced Federation v2 Example...")
console.log("=".repeat(60))

Effect.runPromise(advancedFederationExample)
  .then(() => {
    console.log("\n✨ Advanced example completed successfully!")
  })
  .catch(error => {
    console.error("\n💥 Advanced example failed:", error)
  })

export { advancedFederationExample }