# Federation Framework v2

> **Complete Apollo Federation 2.x framework with Effect-TS, ultra-strict TypeScript patterns, schema-first development, and enterprise-grade resilience features**

[![npm version](https://badge.fury.io/js/@cqrs%2Ffederation-v2.svg)](https://badge.fury.io/js/@cqrs%2Ffederation-v2)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Effect-TS](https://img.shields.io/badge/Effect--TS-3.19+-purple.svg)](https://effect.website)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 **What's New in v2.0.0**

Federation Framework v2 is a complete rewrite that brings cutting-edge functional programming patterns, ultra-strict type safety, and enterprise-grade resilience to Apollo Federation development.

### ✨ **Core Features**

- 🎯 **Ultra-Strict Entity Builder** - Phantom types and compile-time validation
- 📝 **Schema-First Development** - Safe evolution with breaking change detection
- 🔄 **AST-Based Conversion** - Effect Schema to GraphQL type mapping
- ⚡ **Circuit Breakers & Resilience** - Enterprise-grade fault tolerance
- 🚀 **Performance Optimizations** - Query plan caching and DataLoader batching
- 🏗️ **Effect-First Architecture** - Pure functional patterns throughout
- 🔒 **Pattern Matching** - Exhaustive error handling and validation
- 📊 **Service Discovery & Health Monitoring** - Production-ready orchestration
- **Apollo Federation 2.x Support**: Full directive support (@shareable, @inaccessible, @tag, @override, @external, @provides, @requires)
- **Hot Reload**: Development-friendly schema updates

## 📦 **Installation**

```bash
npm install @cqrs/federation-v2
# or
yarn add @cqrs/federation-v2
# or
bun add @cqrs/federation-v2
```

## 🎯 **Quick Start**

### Ultra-Strict Entity with Pattern Matching

```typescript
import * as Effect from 'effect/Effect'
import * as Schema from '@effect/schema/Schema'
import {
  UltraStrictEntityBuilder,
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
} from '@cqrs/federation-v2'
import { pipe } from 'effect/Function'

// Define your domain schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
  isActive: Schema.Boolean,
})

// Create entity with compile-time type safety
const createUserEntity = () =>
  pipe(
    createUltraStrictEntityBuilder('User'),
    withSchema(UserSchema),
    withKeys([UltraStrictEntityBuilder.Key.create('id', GraphQLID, false)]),
    withDirectives([
      UltraStrictEntityBuilder.Directive.shareable(),
      UltraStrictEntityBuilder.Directive.tag('user-management'),
    ]),
    withResolvers({
      fullName: (parent: any) => `${parent.name || 'Anonymous'}`,
      isNewUser: (parent: any) => isRecent(parent.createdAt),
    }),
    validateEntityBuilder
  )

// Handle validation result with exhaustive pattern matching
const handleResult = (result: EntityValidationResult) =>
  matchEntityValidationResult({
    Valid: ({ entity }) => console.log(`✅ Entity '${entity.typename}' is valid!`),
    InvalidSchema: ({ errors }) =>
      console.error(`❌ Schema errors: ${errors.map(e => e.message).join(', ')}`),
    InvalidKeys: ({ errors }) =>
      console.error(`❌ Key errors: ${errors.map(e => e.message).join(', ')}`),
    InvalidDirectives: ({ errors }) =>
      console.error(`❌ Directive errors: ${errors.map(e => e.message).join(', ')}`),
    CircularDependency: ({ cycle }) =>
      console.error(`❌ Circular dependency: ${cycle.join(' → ')}`),
    IncompatibleVersion: ({ entity, requiredVersion, currentVersion }) =>
      console.error(
        `❌ ${entity} version mismatch: needs ${requiredVersion}, got ${currentVersion}`
      ),
  })(result)
```

### Legacy Entity Creation (v1.x Compatibility)

```typescript
import { ModernFederationEntityBuilder } from '@cqrs/federation-v2/core'
import * as Schema from '@effect/schema/Schema'

const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
})

const userEntity = new ModernFederationEntityBuilder('User', UserSchema, ['id'])
  .withShareableField('email')
  .withTaggedField('name', ['pii'])
  .build()
```

### Enterprise Federation with Resilience

```typescript
import {
  SubgraphManagement,
  FederationErrorBoundaries,
  PerformanceOptimizations,
  FederationComposer,
} from '@cqrs/federation-v2'
import * as Effect from 'effect/Effect'
import * as Duration from 'effect/Duration'

const setupEnterpriseFederation = Effect.gen(function* () {
  // Configure resilient subgraph registry with health monitoring
  const registry = yield* SubgraphManagement.createRegistry({
    subgraphs: [
      { id: 'users', url: 'http://users-service:4001', healthEndpoint: '/health' },
      { id: 'products', url: 'http://products-service:4002', healthEndpoint: '/health' },
    ],
    discoveryMode: 'static',
    healthCheckConfig: {
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      retries: 3,
    },
  })

  // Add circuit breakers for fault tolerance
  const boundary = FederationErrorBoundaries.createBoundary({
    subgraphTimeouts: {
      users: Duration.seconds(5),
      products: Duration.seconds(3),
    },
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeout: Duration.seconds(30),
    },
    partialFailureHandling: {
      allowPartialFailure: true,
      fallbackStrategies: {
        users: 'cache',
        products: 'degraded',
      },
    },
  })

  // Configure performance optimizations
  const cache = yield* PerformanceOptimizations.createQueryPlanCache({
    maxSize: 1000,
    ttl: Duration.minutes(10),
  })

  const dataLoader = yield* PerformanceOptimizations.createFederatedDataLoader({
    maxBatchSize: 100,
    batchWindow: Duration.millis(10),
  })

  // Compose final federated schema
  return yield* FederationComposer.create({
    entities: [userEntity],
    registry,
    boundary,
    performance: { cache, dataLoader },
  })
})

const federatedSchema = await Effect.runPromise(setupEnterpriseFederation)
```

### Schema-First Development with Evolution Safety

```typescript
import {
  SchemaFirst,
  createSchemaFirstService,
  createSchemaFirstWorkflow,
} from '@cqrs/federation-v2'

// Define your GraphQL schema
const schema = `
  type User @key(fields: "id") @shareable {
    id: ID!
    email: String!
    name: String
    profile: UserProfile
  }
  
  type UserProfile {
    bio: String
    avatar: String  
  }
  
  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`

// Create schema-first workflow with breaking change detection
const service = createSchemaFirstService()
const workflow = createSchemaFirstWorkflow(service)

const developSchema = Effect.gen(function* () {
  // Parse and validate schema
  const schemaState = yield* workflow.developSchema(schema)

  // Generate code for multiple languages
  const generatedCode = yield* workflow.generateCode(schemaState, ['resolvers', 'types'])

  // Safe schema evolution with breaking change detection
  const evolvedState = yield* workflow.evolveSchema(schemaState, newSchema)

  return { schemaState, generatedCode, evolvedState }
})
```

## 🏗️ **Architecture Overview**

Federation Framework v2 follows a layered architecture with strict separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│               GraphQL Federation Layer                  │
│         (Schema, Resolvers, Entities, Directives)      │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┼─────────────┬─────────────┬─────────────┐
    ▼            ▼             ▼             ▼             ▼
┌──────────┐ ┌─────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐
│ Schema   │ │ Ultra-  │ │ Error      │ │Performance│ │ Subgraph    │
│ First    │ │ Strict  │ │ Boundaries │ │ Optimiz.  │ │ Management  │
│ Patterns │ │ Builder │ │ & Circuit  │ │ & Caching │ │ & Discovery │
│          │ │         │ │ Breakers   │ │           │ │             │
└──────────┘ └─────────┘ └────────────┘ └──────────┘ └─────────────┘
    │            │             │              │              │
    ├─Evolution  ├─Phantom     ├─Resilience   ├─DataLoader   ├─Health Chks
    ├─Code Gen   ├─Types       ├─Fallbacks    ├─Query Cache  ├─Service Reg
    ├─Breaking   ├─Pattern     ├─Timeouts     ├─Batching     ├─Auto Discovery
    └─Change Det └─Matching    └─Monitoring   └─Metrics      └─Load Balancing
```

## 📖 **Core Concepts**

### Effect-First Architecture

All operations in Federation v2 use Effect-TS for functional composition and error handling:

```typescript
import { pipe, Effect } from 'effect'

const processEntity = (data: unknown) =>
  pipe(
    Effect.succeed(data),
    Effect.flatMap(validateEntity),
    Effect.flatMap(transformEntity),
    Effect.catchTag('ValidationError', handleValidationError)
  )
```

### Pattern Matching Error Handling

Comprehensive error discrimination using Effect's pattern matching:

```typescript
import { Match } from 'effect'

const handleError = (error: DomainError) =>
  Match.value(error).pipe(
    Match.tag('ValidationError', err => `Invalid ${err.field}: ${err.message}`),
    Match.tag('FederationError', err => `Federation error: ${err.message}`),
    Match.exhaustive
  )
```

## 🧪 **Testing & Validation**

```bash
# Run comprehensive tests with all features
bun run test:complete           # Complete test suite
bun run test                    # Run all tests
bun run test:unit               # Unit tests only
bun run test:integration        # Integration tests only
bun run test:watch              # Tests in watch mode
bun run test:coverage           # Generate coverage reports

# Validate type safety and code quality
bun run typecheck               # TypeScript type checking
bun run lint                    # ESLint code analysis
bun run lint:fix                # ESLint with automatic fixing
bun run format                  # Prettier code formatting
bun run format:check            # Check code formatting without changing files
bun run validate                # Full validation (typecheck + test:complete)

# Security and auditing
bun run security                # Security audit and vulnerability scan
bun run audit                   # NPM security audit
bun run audit:fix               # Fix security vulnerabilities automatically

# Demo specific features
bun run demo:ultra-strict       # Ultra-strict entity patterns
bun run demo:schema-first       # Schema-first development
bun run demo:complete           # Complete feature demonstration
bun run demo:advanced           # Advanced federation features

# Development workflow
bun run build                   # Build the project using tsdown
bun run build:tsc               # Build using TypeScript compiler
bun run build:watch             # Build in watch mode
bun run dev                     # Development mode with hot reload
bun run clean                   # Remove dist directory

# Documentation
bun run docs:generate           # Generate API documentation with TypeDoc
```

## 📈 **Performance Characteristics**

| Metric                     | Value                                          |
| -------------------------- | ---------------------------------------------- |
| **Bundle Size (ESM)**      | ~79KB (18KB gzipped)                           |
| **Bundle Size (CJS)**      | ~87KB (19KB gzipped)                           |
| **Type Definitions**       | ~90KB (12KB gzipped)                           |
| **Tree Shaking**           | ✅ Full support                                |
| **Zero Dependencies**      | ✅ Runtime independent                         |
| **Effect-TS Integration**  | ✅ 100% compatible (v3.19+)                    |
| **Query Plan Cache**       | ✅ LRU with TTL support                        |
| **DataLoader Batching**    | ✅ Configurable windows                        |
| **Circuit Breakers**       | ✅ Production-grade resilience                 |
| **TypeScript Strict Mode** | ✅ Ultra-strict with all safety flags          |
| **Security Auditing**      | ✅ Automated CI/CD security scanning           |
| **Test Coverage**          | ✅ Unit, integration, and property-based tests |

## Quality Assurance & Security

### Code Quality

- **ESLint**: Functional programming rules with strict error handling patterns
- **Prettier**: Consistent code formatting across the entire codebase
- **TypeScript**: Ultra-strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- **Husky**: Pre-commit hooks ensuring code quality and tests pass

### Testing Infrastructure

- **Unit Tests**: Comprehensive coverage using Bun test runner
- **Integration Tests**: End-to-end federation scenarios with multiple subgraphs
- **Property-Based Tests**: Automated test generation using fast-check
- **Performance Tests**: Query plan caching and DataLoader batching validation

### Security Features

- **Dependency Auditing**: Regular security scans with `bun audit`
- **Input Validation**: Effect Schema-based validation for all inputs
- **Error Boundary Protection**: Secure error handling without information leakage
- **Circuit Breaker Patterns**: Fault isolation and resilience against failures
- **Security Checklist**: Comprehensive security guidelines and best practices

### GitHub Actions Integration

- **Continuous Integration**: Automated testing on all Node.js LTS versions
- **Security Scanning**: Automated vulnerability detection and reporting
- **Code Quality Checks**: ESLint and TypeScript validation on every commit
- **Documentation Generation**: Automated API docs with TypeDoc

## Architecture

The framework follows a modular architecture with clear separation of concerns:

- **Core**: Types, builders, and error system with Effect-TS integration
- **Federation**: Composition, subgraph management, error boundaries
- **Schema**: AST conversion, schema-first development workflows
- **Patterns**: Reusable patterns for error handling and validation
- **Examples**: Working demonstrations and tutorials
- **Tests**: Comprehensive unit, integration, and property-based test suites
- **Security**: Built-in security patterns and audit capabilities

## License

MIT
