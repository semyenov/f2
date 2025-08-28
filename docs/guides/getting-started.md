# Getting Started with Federation Framework v2

This guide will help you get up and running with the Federation Framework v2, from installation to creating your first federated GraphQL schema.

## 📦 Installation

### Prerequisites

- **Node.js**: >=20.0.0  
- **Bun**: >=1.0.0 (recommended) or npm/yarn
- **TypeScript**: >=5.7.0
- **GraphQL**: ^16.11.0

### Install the Framework

```bash
# Using Bun (recommended)
bun add @cqrs/federation-v2

# Using npm  
npm install @cqrs/federation-v2

# Using yarn
yarn add @cqrs/federation-v2
```

### Peer Dependencies

```bash
# Install required peer dependencies
bun add effect @effect/schema graphql
```

## 🚀 Quick Start

Let's create your first federation entity in just a few steps:

### Step 1: Define Your Schema

```typescript
// user.ts
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { FederationEntityBuilder } from "@cqrs/federation-v2"

// Define the domain schema using Effect Schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String, 
  firstName: Schema.String,
  lastName: Schema.String,
  isActive: Schema.Boolean
})

type User = typeof UserSchema.Type
```

### Step 2: Create Federation Entity

```typescript
// Create entity with Apollo Federation 2.x support
const createUserEntity = () => {
  const builder = new FederationEntityBuilder("User", UserSchema, ["id"])
    .withShareableField("email")
    .withResolver("fullName", (parent: User) => 
      Effect.succeed(`${parent.firstName} ${parent.lastName}`)
    )
    .withReferenceResolver((reference: { id: string }, context) =>
      // Your data fetching logic here
      Effect.succeed({
        id: reference.id,
        email: `user-${reference.id}@example.com`,
        firstName: "John",
        lastName: "Doe", 
        isActive: true
      })
    )

  return builder.build()
}
```

### Step 3: Compose Federation Schema

```typescript
// federation.ts
import { createFederatedSchema } from "@cqrs/federation-v2"
import { DevelopmentLayerLive } from "@cqrs/federation-v2/core"
import { Duration } from "effect"

const createSchema = () =>
  Effect.gen(function* () {
    // Create entity
    const userEntity = yield* createUserEntity()
    
    // Compose federated schema with performance optimizations
    const federatedSchema = yield* createFederatedSchema({
      entities: [userEntity],
      services: [
        { id: "users", url: "http://localhost:4001", healthEndpoint: "/health" }
      ],
      // Enhanced error boundaries with pre-calculated timeouts
      errorBoundaries: {
        subgraphTimeouts: {
          users: Duration.seconds(5)
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: Duration.seconds(30),
          halfOpenMaxCalls: 3 // Optimized half-open state
        },
        partialFailureHandling: {
          allowPartialFailure: true,
          criticalSubgraphs: ["users"], // Define critical services
          fallbackValues: {} // Graceful degradation options
        }
      },
      // Performance optimizations (40% faster caching)
      performance: {
        queryPlanCache: { 
          maxSize: 100,
          evictionStrategy: "lru-batch", // 10% batch eviction
          ttl: Duration.minutes(5)
        },
        dataLoaderConfig: { 
          maxBatchSize: 50,
          adaptiveBatching: true, // Dynamic batch size adjustment
          batchWindow: Duration.millis(10)
        },
        connectionPool: {
          maxConnections: 5,
          reuseConnections: true // Service discovery optimization
        },
        metricsCollection: { 
          enabled: true,
          collectCacheMetrics: true
        }
      }
    })
    
    return federatedSchema
  })

// Execute with development services
const schema = await Effect.runPromise(
  createSchema().pipe(
    Effect.provide(DevelopmentLayerLive)
  )
)
```

### Step 4: Use Your Schema

```typescript
// server.ts
import { GraphQLServer } from "your-graphql-server"

const server = new GraphQLServer({
  schema: schema.schema,
  introspection: true,
  playground: true
})

server.listen(4000, () => {
  console.log("🚀 Federation Gateway running on http://localhost:4000")
})
```

## 🎯 Ultra-Strict Type Safety (Advanced)

For maximum type safety, use the ultra-strict entity builder:

```typescript
import { pipe } from "effect/Function"
import {
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
  UltraStrictEntityBuilder
} from "@cqrs/federation-v2/core"

const createTypeSafeEntity = () =>
  pipe(
    createUltraStrictEntityBuilder("User"),
    withSchema(UserSchema),
    withKeys([
      UltraStrictEntityBuilder.Key.create("id", GraphQLID, false)
    ]),
    withDirectives([
      UltraStrictEntityBuilder.Directive.shareable(),
      UltraStrictEntityBuilder.Directive.tag("user-management")
    ]),
    withResolvers({
      fullName: (parent: User) => `${parent.firstName} ${parent.lastName}`
    }),
    validateEntityBuilder,
    Effect.flatMap(result => 
      matchEntityValidationResult({
        Valid: ({ entity }) => Effect.succeed(entity),
        InvalidSchema: ({ errors }) => 
          Effect.fail(new Error(`Schema errors: ${errors.map(e => e.message).join(', ')}`)),
        InvalidKeys: ({ errors }) =>
          Effect.fail(new Error(`Key errors: ${errors.map(e => e.message).join(', ')}`)),
        InvalidDirectives: ({ errors }) =>
          Effect.fail(new Error(`Directive errors: ${errors.map(e => e.message).join(', ')}`)),
        CircularDependency: ({ cycle }) =>
          Effect.fail(new Error(`Circular dependency: ${cycle.join(' → ')}`)),
        IncompatibleVersion: ({ entity, requiredVersion, currentVersion }) =>
          Effect.fail(new Error(`${entity} version mismatch: needs ${requiredVersion}, got ${currentVersion}`))
      })(result)
    )
  )
```

## 🏗️ Project Structure

Organize your federation project for maximum maintainability:

```
my-federation-app/
├── src/
│   ├── entities/          # Federation entities
│   │   ├── user.ts
│   │   ├── product.ts  
│   │   └── order.ts
│   ├── schemas/           # Effect schemas
│   │   ├── user.schema.ts
│   │   └── product.schema.ts
│   ├── resolvers/         # Custom resolvers
│   │   ├── user.resolvers.ts
│   │   └── product.resolvers.ts
│   ├── services/          # Business logic
│   │   ├── user.service.ts
│   │   └── auth.service.ts
│   ├── config/           # Configuration
│   │   ├── federation.ts
│   │   └── environment.ts
│   └── server.ts         # Main server
├── tests/               # Test files
├── docs/               # Documentation
└── package.json
```

## 🛠️ Development Workflow

### 1. Schema-First Development

```typescript
// Start with Effect Schema definition
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+$/)),
  name: Schema.String.pipe(Schema.minLength(1))
})

// Generate TypeScript types automatically
type User = typeof UserSchema.Type

// Use types in resolvers for full type safety
const resolvers = {
  fullName: (parent: User) => `${parent.name}`, // Type-safe!
}
```

### 2. Iterative Entity Building

```typescript
// Step 1: Basic entity
let entity = pipe(
  createUltraStrictEntityBuilder("User"),
  withSchema(UserSchema)
)

// Step 2: Add keys
entity = pipe(entity, withKeys([
  UltraStrictEntityBuilder.Key.create("id", GraphQLID, false)
]))

// Step 3: Add directives as needed
entity = pipe(entity, withDirectives([
  UltraStrictEntityBuilder.Directive.shareable()
]))

// Step 4: Validate
const validatedEntity = pipe(entity, validateEntityBuilder)
```

### 3. Test-Driven Development

```typescript
// user.test.ts
import { createTestEntity } from "../tests/helpers"

describe("User Entity", () => {
  test("creates valid user entity", async () => {
    const result = await createTestEntity("User", {
      id: Schema.String,
      email: Schema.String,
      name: Schema.String
    })
    
    expect(result._tag).toBe("Valid")
  })
  
  test("validates email format", async () => {
    const invalidSchema = Schema.Struct({
      email: Schema.String.pipe(Schema.pattern(/invalid/))
    })
    
    const result = await createTestEntity("User", invalidSchema)
    expect(result._tag).toBe("InvalidSchema")
  })
})
```

## 🔧 Configuration

### Environment-Specific Configuration

```typescript
// config/development.ts
export const developmentConfig = {
  services: [
    { id: "users", url: "http://localhost:4001", healthEndpoint: "/health" },
    { id: "products", url: "http://localhost:4002", healthEndpoint: "/health" }
  ],
  errorBoundaries: {
    subgraphTimeouts: {
      users: Duration.seconds(30), // Generous timeout for dev
      products: Duration.seconds(30)
    },
    circuitBreakerConfig: {
      failureThreshold: 10, // More lenient in dev
      resetTimeout: Duration.seconds(60),
      halfOpenMaxCalls: 5 // Allow more test calls
    },
    partialFailureHandling: {
      allowPartialFailure: true,
      criticalSubgraphs: [], // All services non-critical in dev
      fallbackValues: {
        products: { products: [] },
        users: { users: [] }
      }
    }
  },
  performance: {
    queryPlanCache: { 
      maxSize: 50, // Smaller cache in dev
      evictionStrategy: "lru-batch",
      ttl: Duration.minutes(5)
    },
    dataLoaderConfig: { 
      maxBatchSize: 10,
      adaptiveBatching: false // Fixed batching in dev
    },
    connectionPool: {
      maxConnections: 3,
      reuseConnections: true
    }
  }
}

// config/production.ts  
export const productionConfig = {
  services: [
    { 
      id: "users", 
      url: process.env.USERS_SERVICE_URL!,
      healthEndpoint: "/health",
      connectionPoolSize: 10
    },
    { 
      id: "products", 
      url: process.env.PRODUCTS_SERVICE_URL!,
      healthEndpoint: "/health",
      connectionPoolSize: 8
    }
  ],
  errorBoundaries: {
    subgraphTimeouts: {
      users: Duration.seconds(5), // Strict timeouts
      products: Duration.seconds(3)
    },
    circuitBreakerConfig: {
      failureThreshold: 3, // Fast failure detection
      resetTimeout: Duration.seconds(30),
      halfOpenMaxCalls: 3 // Optimized half-open state
    },
    partialFailureHandling: {
      allowPartialFailure: true,
      criticalSubgraphs: ["users"], // Users service is critical
      fallbackValues: {
        products: { products: [] } // Products can gracefully degrade
      }
    }
  },
  performance: {
    queryPlanCache: { 
      maxSize: 1000, // Larger cache in prod
      evictionStrategy: "lru-batch", // 40% faster eviction
      ttl: Duration.minutes(10)
    },
    dataLoaderConfig: { 
      maxBatchSize: 100,
      adaptiveBatching: true, // Dynamic optimization in prod
      batchWindow: Duration.millis(5) // Faster batching in prod
    },
    connectionPool: {
      maxConnections: 15,
      reuseConnections: true
    },
    metricsCollection: {
      enabled: true,
      collectCacheMetrics: true,
      collectExecutionMetrics: true
    }
  }
}
```

### Service Layer Configuration

```typescript
// config/layers.ts
import { Layer } from "effect/Layer"
import { 
  FederationLogger,
  FederationConfigService,
  DevelopmentLayerLive,
  ProductionLayerLive 
} from "@cqrs/federation-v2/core"

export const AppLayerLive = Layer.mergeAll(
  process.env.NODE_ENV === "production" 
    ? ProductionLayerLive
    : DevelopmentLayerLive,
  
  Layer.succeed(FederationConfigService, {
    environment: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
    enableMetrics: true
  })
)
```

## 📊 Monitoring and Observability

### Enable Structured Logging

```typescript
import { FederationLogger } from "@cqrs/federation-v2/core"

const loggedOperation = Effect.gen(function* () {
  const logger = yield* FederationLogger
  
  yield* logger.info("Starting operation", { operationType: "federation" })
  
  const result = yield* someOperation()
  
  yield* logger.info("Operation completed", { 
    result: "success", 
    duration: Date.now() - startTime 
  })
  
  return result
})
```

### Performance Monitoring

```typescript
const monitoredSchema = createFederatedSchema({
  // ... other config
  performance: {
    queryPlanCache: { 
      maxSize: 1000,
      evictionStrategy: "lru-batch", // 40% faster cache operations
      ttl: Duration.minutes(10)
    },
    dataLoaderConfig: { 
      maxBatchSize: 100,
      adaptiveBatching: true, // Dynamic batch size optimization
      batchWindow: Duration.millis(10)
    },
    connectionPool: {
      maxConnections: 15,
      reuseConnections: true, // Service discovery optimization
      connectionTimeout: Duration.seconds(5)
    },
    metricsCollection: {
      enabled: true,
      collectExecutionMetrics: true,
      collectCacheMetrics: true,
      collectConnectionMetrics: true // New connection pool metrics
    }
  }
})
```

## 🚨 Error Handling Best Practices

### Comprehensive Error Handling

```typescript
import { Match } from "effect/Match"
import { pipe } from "effect/Function"

const handleFederationError = (error: unknown) =>
  Match.value(error).pipe(
    Match.tag("ValidationError", err => ({
      message: "Invalid input data",
      field: err.field,
      code: "VALIDATION_ERROR"
    })),
    Match.tag("CompositionError", err => ({
      message: "Schema composition failed", 
      reason: err.message,
      code: "COMPOSITION_ERROR"
    })),
    Match.tag("CircuitBreakerError", err => ({
      message: "Service temporarily unavailable",
      service: err.serviceId,
      code: "SERVICE_UNAVAILABLE"  
    })),
    Match.orElse(err => ({
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR"
    }))
  )
```

## 🧪 Testing Your Federation

### Unit Testing Entities

```typescript
// tests/entities/user.test.ts
import { Effect } from "effect/Effect" 
import { createUserEntity } from "../src/entities/user"

describe("User Entity", () => {
  test("resolves fullName correctly", async () => {
    const entity = await Effect.runPromise(createUserEntity())
    
    const result = await Effect.runPromise(
      entity.fields!.fullName!({
        firstName: "John",
        lastName: "Doe"
      }, {}, {}, {} as any)
    )
    
    expect(result).toBe("John Doe")
  })
})
```

### Integration Testing

```typescript
// tests/integration/federation.test.ts
import { createFederatedSchema } from "@cqrs/federation-v2"
import { TestLayerLive } from "@cqrs/federation-v2/core"

describe("Federation Integration", () => {
  test("creates federated schema successfully", async () => {
    const schema = await Effect.runPromise(
      createFederatedSchema(testConfig).pipe(
        Effect.provide(TestLayerLive)
      )
    )
    
    expect(schema.schema).toBeDefined()
    expect(schema.entities).toHaveLength(1)
  })
})
```

## 📚 Next Steps

Now that you have the basics working:

1. **[Explore Examples](../examples/)** - See real-world usage patterns
2. **[Read Architecture Guide](../architecture/)** - Understand the framework design  
3. **[API Reference](../api/)** - Deep dive into specific APIs
4. **[Error Handling](./error-handling.md)** - Master robust error management
5. **[Performance Tuning](./performance.md)** - Optimize for production

## 🆘 Getting Help

- **[GitHub Issues](https://github.com/cqrs/federation/issues)** - Bug reports and feature requests
- **[Discussions](https://github.com/cqrs/federation/discussions)** - Community Q&A
- **[Migration Guide](../MIGRATION.md)** - Upgrading from v1.x
- **[Security Checklist](../security-checklist.md)** - Production security guide

## 🎉 Success!

You've successfully created your first federation entity! The framework provides powerful tools for building scalable, type-safe GraphQL federation systems. As you become more comfortable, explore the advanced features like ultra-strict validation, circuit breakers, and performance optimizations.