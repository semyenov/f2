# Examples Documentation

This directory contains comprehensive examples demonstrating all features of the Federation Framework v2. Each example is fully runnable and showcases specific patterns and capabilities.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Advanced Examples](#advanced-examples)
- [Pattern Examples](#pattern-examples)
- [Running Examples](#running-examples)

## Basic Examples

### Basic Entity (`src/examples/basic-entity.ts`)

**Run with:** `bun run dev` or `bun src/examples/basic-entity.ts`

Demonstrates the fundamentals of entity creation with Effect Schema validation:

```typescript
import { FederationEntityBuilder } from '@cqrs/federation-v2/core/entity-builder'
import * as S from '@effect/schema/Schema'

// Define entity schema
const UserSchema = S.struct({
  id: S.string,
  email: S.string,
  name: S.string
})

// Build federation entity
const UserEntity = FederationEntityBuilder.create()
  .typename("User")
  .key("id")
  .schema(UserSchema)
  .resolveReference(async (reference, context, info) => {
    // Fetch user by reference
    return await fetchUser(reference.id)
  })
  .build()
```

**Key Concepts:**
- Entity schema definition with Effect Schema
- Reference resolution for federation
- Basic entity builder pattern

### Simple Entity (`src/examples/simple-entity.ts`)

**Run with:** `bun run demo`

Shows minimal entity setup with validation and resolver patterns:

```typescript
const ProductSchema = S.struct({
  id: S.string,
  name: S.string,
  price: S.number.pipe(S.positive())
})

const ProductEntity = FederationEntityBuilder.create()
  .typename("Product") 
  .key(["id"])
  .schema(ProductSchema)
  .resolveReference((reference, _context, _info) =>
    Effect.succeed({
      id: reference.id,
      name: `Product ${reference.id}`,
      price: 99.99
    })
  )
  .build()
```

**Key Concepts:**
- Schema validation with constraints
- Effect-based reference resolution
- Product catalog patterns

## Advanced Examples

### Complete Federation Demo (`src/examples/complete-federation-v2-demo.ts`)

**Run with:** `bun run demo:complete`

Comprehensive demonstration of all federation features including:

```typescript
// Multi-entity federation with relationships
const entities = [
  UserEntity,
  ProductEntity, 
  OrderEntity
]

// Advanced error boundaries
const errorBoundary = createProductionBoundary(
  {
    "users-service": Duration.seconds(5),
    "products-service": Duration.seconds(3),
    "orders-service": Duration.seconds(10)
  },
  ["users-service"] // Critical services
)

// Performance optimizations
const performanceConfig = {
  queryPlanCache: { maxSize: 1000, ttl: Duration.minutes(5) },
  dataLoaderConfig: { maxBatchSize: 100, batchWindowMs: 10 },
  metricsCollection: { enabled: true }
}
```

**Key Concepts:**
- Multi-service federation composition
- Production-grade error boundaries
- Performance optimization strategies
- Circuit breaker configurations
- Comprehensive monitoring setup

### Advanced Federation (`src/examples/advanced-federation.ts`)

**Run with:** `bun run demo:advanced`

Demonstrates sophisticated federation patterns:

```typescript
// Advanced directive usage
const AdvancedEntity = FederationEntityBuilder.create()
  .typename("Product")
  .key(["id", "sku"])
  .schema(ProductSchema)
  .directive("@shareable")
  .directive("@tag", { name: "internal" })
  .field("reviews", {
    provides: ["rating", "count"],
    requires: ["id"]
  })
  .build()
```

**Key Concepts:**
- Multiple federation keys
- Advanced directive usage (@shareable, @tag, @provides, @requires)
- Field-level federation configuration
- Complex entity relationships

## Pattern Examples

### Ultra-Strict Entity (`src/examples/ultra-strict-entity-example.ts`)

**Run with:** `bun run demo:ultra-strict`

> ⚠️ **Experimental Feature**: Uses advanced TypeScript patterns for demonstration purposes.

Showcases ultra-strict TypeScript patterns with phantom types:

```typescript
import { Experimental } from '@cqrs/federation-v2'

// Phantom types for compile-time validation
type ValidatedUser = User & { readonly __validated: unique symbol }
type PersistedUser = ValidatedUser & { readonly __persisted: unique symbol }

const UltraStrictUserEntity = Experimental.UltraStrictEntityBuilder.create()
  .typename("User" as const)
  .key("id" as const)
  .schema(UserSchema)
  .validation((user): user is ValidatedUser => {
    return S.is(UserSchema)(user)
  })
  .persistence((user): user is PersistedUser => {
    return user.id !== ""
  })
  .build()
```

**Key Concepts:**
- Phantom types for type safety
- Multi-stage validation pipeline
- Compile-time guarantees
- Advanced TypeScript patterns

### Schema-First Workflow (`src/examples/schema-first-workflow-example.ts`)

**Run with:** `bun run demo:schema-first`

Demonstrates schema-first development with AST conversion:

```typescript
// Import GraphQL schema
const importResult = await SchemaImporter.importFromFile("./schema.graphql")

// Convert to Effect Schema
const effectSchema = ASTConverter.graphqlToEffect(importResult.schema)

// Build entity from schema
const SchemaEntity = SchemaFirstEntityBuilder.create()
  .fromSchema(effectSchema)
  .withDirectives(importResult.directives)
  .build()
```

**Key Concepts:**
- GraphQL to Effect Schema conversion
- AST-based development
- Schema import and validation
- Automatic entity generation

### Modern Federation (`src/examples/modern-federation-example.ts`)

Demonstrates modern federation patterns with comprehensive examples:

```typescript
// Service registry integration
const registry = createSubgraphRegistry({
  services: [
    { id: "users", url: "http://localhost:4001/graphql" },
    { id: "products", url: "http://localhost:4002/graphql" }
  ]
})

// Composition with hot reloading
const federatedSchema = await composeFederatedSchema({
  entities: [UserEntity, ProductEntity],
  services: await registry.discover(),
  errorBoundaries: productionErrorBoundary,
  performance: optimizedPerformanceConfig
})
```

**Key Concepts:**
- Service discovery and registry
- Hot reloading capabilities
- Production composition patterns
- Comprehensive configuration

## Running Examples

### Development Mode
```bash
# Run with hot reload
bun run dev

# Run specific example  
bun src/examples/basic-entity.ts
```

### Demo Commands
```bash
# Basic entity demonstration
bun run demo

# Advanced federation features
bun run demo:advanced

# Ultra-strict TypeScript patterns
bun run demo:ultra-strict

# Schema-first development workflow
bun run demo:schema-first

# Complete feature demonstration
bun run demo:complete
```

### Testing Examples
```bash
# Run tests for all examples
bun run test

# Run integration tests
bun run test:integration

# Test specific example patterns
bun test examples/
```

## Example Patterns by Use Case

### E-commerce Federation
```typescript
// User service
const UserEntity = createEntity("User", ["id"], {
  id: S.string,
  email: S.string,
  profile: S.optional(ProfileSchema)
})

// Product service  
const ProductEntity = createEntity("Product", ["id"], {
  id: S.string,
  name: S.string,
  price: S.number.pipe(S.positive())
}).directive("@shareable")

// Order service (extends User and Product)
const OrderEntity = createEntity("Order", ["id"], {
  id: S.string,
  userId: S.string,
  products: S.array(S.string),
  total: S.number
}).field("user", { requires: ["userId"] })
 .field("items", { requires: ["products"] })
```

### Content Management System
```typescript
// Multi-tenant content entities
const ContentEntity = createEntity("Content", ["id", "tenantId"], {
  id: S.string,
  tenantId: S.string, 
  title: S.string,
  body: S.string,
  publishedAt: S.optional(S.Date)
}).directive("@tag", { name: "content" })
```

### Microservices Communication
```typescript
// Event-driven entity resolution
const EventEntity = createEntity("Event", ["id"], EventSchema)
  .resolveReference((ref, context) =>
    pipe(
      EventStore.getEvent(ref.id),
      Effect.mapError(err => ErrorFactory.entityResolution(
        "Event not found",
        "Event", 
        ref.id,
        err
      ))
    )
  )
```

## Error Handling Examples

Each example includes comprehensive error handling patterns:

```typescript
// Validation error handling
const result = pipe(
  entity.validate(input),
  Effect.catchTag("ValidationError", (error) =>
    Effect.succeed({ 
      success: false, 
      errors: [error.message] 
    })
  )
)

// Federation error handling with circuit breaker
const protectedQuery = pipe(
  subgraphQuery(input),
  circuitBreaker.protect,
  Effect.timeout(Duration.seconds(5)),
  Effect.catchAll((error) =>
    Match.value(error).pipe(
      Match.tag("CircuitBreakerError", () => 
        Effect.succeed(fallbackValue)
      ),
      Match.tag("TimeoutError", () =>
        Effect.succeed(cachedValue)
      ),
      Match.orElse(() => Effect.fail(error))
    )
  )
)
```

## Performance Examples

Examples include performance optimization patterns:

```typescript
// DataLoader batching
const userLoader = createDataLoader(
  (userIds: readonly string[]) =>
    pipe(
      batchFetchUsers(userIds),
      Effect.runPromise
    ),
  { maxBatchSize: 100, batchWindowMs: 10 }
)

// Query plan caching
const cachedComposition = pipe(
  composeFederatedSchema(config),
  withQueryPlanCache({ maxSize: 1000, ttl: Duration.minutes(5) })
)
```

## Next Steps

- Review the [Getting Started Guide](../guides/getting-started.md) for setup instructions
- Check the [Error Handling Guide](../guides/error-handling.md) for comprehensive error patterns
- Explore the [API Reference](../api/README.md) for detailed method documentation
- Read the [Architecture Overview](../architecture/README.md) for system design patterns

Each example is designed to be educational and production-ready. Copy and modify them for your specific use cases.