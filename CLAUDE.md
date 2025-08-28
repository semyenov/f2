# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Testing

- `bun test` - Run all tests using Bun's test runner
- `bun test tests/unit/federation/subgraph.test.ts` - Run a specific test file
- `bun test --watch` - Run tests in watch mode
- `bun test:unit` - Run unit tests only (tests/unit)
- `bun test:integration` - Run integration tests only (tests/integration)
- `bun test:coverage` - Generate coverage reports with v8 provider
- `bun test:complete` - Run comprehensive integration test (test-complete.ts)
- `bun test:ui` - Run tests with interactive UI (Vitest UI)
- `vitest` - Run tests in watch mode using Vitest directly
- `vitest run` - Run all tests once with Vitest
- `vitest --ui` - Alternative command for interactive UI

### Development

- `bun run dev` - Development mode with hot reload
- `bun run demo` - Run complete framework test
- `bun run demo:functional` - Demo functional programming patterns
- `bun run demo:comprehensive` - Comprehensive functional demo

### Building

- `bun run build` - Production build using tsdown
- `bun run build:tsc` - Alternative build using TypeScript compiler
- `bun run build:watch` - Build in watch mode
- `bun run clean` - Remove dist directory

### Code Quality

- `bun run typecheck` - Type checking without emitting files (uses main tsconfig.json)
- `bun run lint` - ESLint checking
- `bun run lint:fix` - ESLint with automatic fixing
- `bun run format` - Prettier code formatting
- `bun run format:check` - Check formatting without changes
- `bun run validate` - Full validation: typecheck + lint + test:complete
- `bun run audit` - Security audit with moderate severity threshold
- `bun run audit:fix` - Auto-fix security vulnerabilities
- `bun run security` - Combined audit + lint check

### Publishing

- `bun run prepublishOnly` - Clean, build, and validate before publishing
- `bun run prepare` - Setup git hooks with husky

### Documentation

- `bun docs:generate` - Generate TypeDoc documentation

### CLI Commands

- `npx @cqrs/federation init <name>` - Initialize new federation project
- `npx @cqrs/federation entity <name>` - Generate new entity with tests
- `npx @cqrs/federation validate` - Validate federation schemas
- `npx @cqrs/federation compose` - Test schema composition
- `npx @cqrs/federation devtools` - Start GraphQL playground
- `npx @cqrs/federation playground` - Alias for devtools
- `bun run cli` - Run CLI directly from source

### Maintenance Scripts

- `bun run scripts/convert-imports.ts` - Convert relative imports to barrel exports (maintains ESM .js extensions)

## Architecture Overview

**Federation Framework** - Apollo Federation framework built with Effect-TS, emphasizing functional programming and enterprise resilience.

### Core Architecture

The codebase follows a layered Effect-TS architecture with strong type safety:

```
src/
├── core/                # Foundation layer - types, builders, errors
│   ├── builders/        # Entity builders with different strictness levels
│   ├── types.ts         # Core type definitions using branded types
│   ├── errors.ts        # Effect-based error hierarchy
│   ├── schema-first-patterns.ts  # Schema evolution tools
│   └── services/        # Effect Layers for DI
│       ├── config.ts    # Configuration service
│       ├── logger.ts    # Logging service
│       └── layers.ts    # Layer composition
├── federation/          # Federation-specific features
│   ├── composer.ts      # Schema composition with Effect
│   ├── subgraph.ts      # Registry with service discovery
│   ├── error-boundaries.ts # Circuit breakers, fault tolerance
│   ├── performance.ts   # Caching, DataLoader optimizations
│   ├── subscriptions.ts # GraphQL subscriptions support
│   └── mesh.ts          # GraphQL Mesh integration
├── schema/              # Schema processing
│   └── ast.ts           # Effect Schema → GraphQL conversion
├── experimental/        # Ultra-strict patterns with phantom types
│   └── strict.ts        # Ultra-strict entity builder
├── cloud/               # Cloud-native deployment
│   ├── kubernetes.ts    # K8s operator & CRDs
│   ├── multi-cloud.ts   # AWS, GCP, Azure support
│   └── edge.ts          # Edge deployment (CloudFlare, Lambda@Edge)
├── devtools/            # Development tools
│   ├── playground.ts    # GraphQL Playground with federation tabs
│   ├── profiler.ts      # Performance profiling
│   └── schema-tools.ts  # Schema visualization & migration
├── testing/             # Testing utilities
│   └── index.ts         # TestHarness, mocks, assertions
├── cli/                 # Command-line interface
│   └── index.ts         # Project scaffolding & dev tools
└── facade.ts            # Simplified API for quick setup
```

### Key Patterns

**Effect-First Design**: All async operations return `Effect.Effect<Success, Error, Requirements>`. Never use promises or throw exceptions directly.

**Simplified API Facade**: For developers who want quick setup without Effect-TS complexity:

```typescript
import { Federation, Presets } from '@cqrs/federation'

const federation = await Federation.create(Presets.production([userEntity], ['http://users:4001']))
```

**Error Handling**: Use discriminated unions with exhaustive pattern matching:

```typescript
// All errors have a _tag discriminant
type DomainError = ValidationError | FederationError | CompositionError

// Handle with Match.exhaustive
Match.value(error).pipe(
  Match.tag('ValidationError', handleValidation),
  Match.tag('FederationError', handleFederation),
  Match.exhaustive
)
```

**Test Helpers**: Mock services use Effect patterns:

- `MockSubgraphRegistry` - Returns Effects, uses `Effect.fail` for errors
- `TestServicesLive` - Layer composition for test dependencies
- Health checks return `Effect.Effect<HealthStatus, Error>`

**Type Safety Rules**:

- **NEVER use `any`** - use `unknown` or proper type assertions through double assertion pattern
- All imports use `.js` extension (ESM requirement)
- Entity builders use phantom types for compile-time validation
- HealthStatus has `timestamp` and `responseTime` fields (not `lastCheck`/`metrics`)
- ValidatedEntity structure uses `keys` array not single `key` property
- **Type Conversion Pattern**: Use double assertion through `unknown` for complex type conversions:
  ```typescript
  // Correct pattern for type conversions
  entity as unknown as TargetType
  ```
- **FederationEntity Generics**: Default to `<unknown, unknown, unknown, unknown>` for untyped entities
- **FederationCompositionConfig**: Expects `ReadonlyArray<FederationEntity<unknown, unknown, unknown, unknown>>`

### Testing Patterns

Tests use Effect patterns throughout:

```typescript
// Correct pattern for expecting failures
const error = await Effect.runPromise(
  expectEffectFailure(
    Effect.gen(function* () {
      // test code
    }).pipe(Effect.provide(TestServicesLive))
  )
)

// Mock services must use Effect.gen and Effect.fail
health: (serviceId: string) =>
  Effect.gen(function* () {
    if (shouldFail) {
      return yield* Effect.fail(new Error(`Health check failed`))
    }
    return status
  })
```

**Testing Infrastructure**:

- **Test Runner**: Vitest with Bun (configured in `vitest.config.ts`)
- **Environment**: happy-dom for lightweight browser simulation
- **Coverage**: v8 provider with thresholds (75% lines, 60% functions, 70% branches)
- **Property-Based Testing**: fast-check for automated test generation
- **Setup**: Global test APIs (describe, it, expect) via `tests/setup.ts`
- **Test Harness**: Fluent API for federation testing
  ```typescript
  const harness = TestHarness.create()
    .withEntity(userEntity)
    .withMockService('users', mockData)
    .build()
  ```

**Common Test Patterns**:

```typescript
// UltraStrictEntityBuilder testing
const builder = createUltraStrictEntityBuilder('User', schema as Schema.Schema<unknown, unknown, never>)
const result = await Effect.runPromise(validateEntityBuilder(builder))
const matched = matchEntityValidationResult<unknown, unknown, unknown>({...})(result as EntityValidationResult<unknown, unknown, unknown>)

// ValidatedEntity mocking
const mockEntity: ValidatedEntity<unknown, unknown, unknown> = {
  typename: 'User',
  keys: [{ field: 'id', type: GraphQLID, isComposite: false }],
  schema: userSchema as Schema.Schema<unknown, unknown, unknown>,
  directives: [],
  resolvers: {},
  metadata: {
    typename: 'User',
    version: '1.0.0',
    createdAt: new Date(),
    validationLevel: 'ultra-strict' as const,
    dependencies: []
  }
}
```

### Performance Optimizations

- **Query Plan Cache**: LRU with batch eviction (10% at a time)
- **DataLoader**: Instrumented batch functions track stats
- **Circuit Breakers**: Pre-calculated timeout thresholds
- **Metrics**: Buffered with batch flushing to reduce I/O

## Important Files

- `test-complete.ts` - Comprehensive integration test
- `tests/utils/test-layers.ts` - Test mock services and helpers
- `comprehensive-functional-demo.ts` - Complete functional programming patterns demo
- `vitest.config.ts` - Test runner configuration
- `.husky/` - Git hooks for code quality
- `src/facade.ts` - Simplified API for quick federation setup
- `src/cli/index.ts` - CLI tool for scaffolding and development
- `src/testing/index.ts` - Testing harness and utilities
- `src/devtools/` - Development tools (playground, profiler, schema tools)
- `src/cloud/` - Cloud deployment modules

## Package Information

- **Package Name**: `@cqrs/federation` (version 2.0.0)
- **Build System**: tsdown for production builds
- **Test Runner**: Vitest with Bun runtime
- **TypeScript**: Strict mode with all safety flags enabled (5.9+)
- **Module System**: ESM with `.js` extensions required
- **Runtime Requirements**: Node.js 20+ or Bun 1.0+
- **Dependencies**: Effect-TS 3.17+, GraphQL 16.11+, DataLoader 2.2+
- **Package Manager**: Configured for Yarn 1.22.22

### TypeScript Configuration Structure

- **`tsconfig.json`** - Main configuration for all TypeScript files (strict rules, includes `@/*` path mapping)
- **`tsconfig.build.json`** - Production build configuration (extends main, excludes test files)

### Path Mappings & Barrel Exports

The codebase uses barrel exports (index.ts files) with clean import paths:

- `@core` → `./src/core` (barrel export for all core functionality)
- `@federation` → `./src/federation` (federation features barrel export)
- `@experimental` → `./src/experimental` (experimental patterns barrel export)
- `@schema` → `./src/schema` (schema processing barrel export)
- `@/*` → `./src/*` (fallback for specific file access)
- `@tests/*` → `./tests/*` (test utilities - tests only)

**Barrel Export Structure**:

- All major folders have index.ts files that re-export their contents
- Use `scripts/convert-imports.ts` to convert relative imports to barrel exports
- Always import from barrel exports (e.g., `@core`) rather than specific files

**Usage Examples**:

```typescript
// Preferred: Use barrel exports
import { ErrorFactory, ValidationError } from '@core'
import { FederationComposer } from '@federation'
import { createUltraStrictEntityBuilder } from '@experimental'

// Fallback: Specific file access when needed
import { specificUtility } from '@/core/utils/helper.js'
```

## New Module Documentation

### Cloud Module (`src/cloud/`)

**Purpose**: Cloud-native deployment and orchestration

- **Kubernetes**: K8s operator with CRDs for federation deployment
- **Multi-Cloud**: AWS, GCP, Azure deployment strategies
- **Edge**: CloudFlare Workers, Lambda@Edge support
- **Usage**:
  ```typescript
  const deployment = await CloudDeployment.create({
    providers: ['aws', 'gcp'],
    environment: 'production',
    federation: { gateway: { image: 'gateway:latest' } },
  })
  ```

### DevTools Module (`src/devtools/`)

**Purpose**: Development and debugging tools

- **Playground**: Federation-aware GraphQL playground
- **Profiler**: Performance monitoring and bottleneck detection
- **Schema Tools**: Visualization, migration analysis, version management
- **Usage**:
  ```typescript
  const devtools = await DevTools.start({
    schema: federationSchema,
    playground: true,
    visualization: true,
    monitoring: true,
  })
  ```

### Testing Module (`src/testing/`)

**Purpose**: Comprehensive testing utilities

- **TestHarness**: Fluent API for integration testing
- **Mock Generators**: Automatic mock data generation
- **Assertions**: Federation-specific assertion helpers
- **Performance Testing**: Latency and throughput metrics

### CLI Module (`src/cli/`)

**Purpose**: Command-line tools for development

- **Project Scaffolding**: Quick project initialization
- **Entity Generation**: Template-based entity creation
- **Schema Validation**: Composition and type checking
- **DevTools Server**: Integrated GraphQL playground

### Facade Module (`src/facade.ts`)

**Purpose**: Simplified API for common patterns

- **Quick Setup**: One-line federation initialization
- **Presets**: Pre-configured development/production settings
- **Entity Builder**: Fluent API without Effect-TS complexity
- **Common Patterns**: Library of reusable federation patterns

## Development Philosophy

**File Creation Policy**:

- ALWAYS prefer editing existing files over creating new ones
- NEVER create documentation files (\*.md) or README files unless explicitly requested
- Only create files when absolutely necessary for functionality
- Maintain existing code conventions and patterns

### Entity Conversion Patterns

**ValidatedEntity to FederationEntity Conversion**:

The entity builder returns `ValidatedEntity` which must be converted to `FederationEntity` for use in federation composition:

```typescript
// 1. Build entity with entity builder
const entityEffect = createEntityBuilder('User', UserSchema, ['id'])
  .withReferenceResolver(resolver)
  .build()

// 2. Run the effect to get ValidatedEntity
const validatedEntity = await Effect.runPromise(entityEffect)

// 3. Convert to FederationEntity using toFederationEntity helper
const federationEntity = toFederationEntity(
  validatedEntity as unknown as typeof validatedEntity & { key: string[] },
  referenceResolver
)

// 4. Use asUntypedEntity for composition config
const config: FederationCompositionConfig = {
  entities: [asUntypedEntity(federationEntity)],
}
```

**Key Functions**:

- `toFederationEntity(validatedEntity, referenceResolver)` - Converts ValidatedEntity to FederationEntity
- `asUntypedEntity(entity)` - Converts typed FederationEntity to untyped for composition config

## Troubleshooting Guide

### Common Issues and Solutions

1. **Port Already in Use**
   - Error: `EADDRINUSE: Port 4000 is already in use`
   - Solution: Use `--port` flag: `npx @cqrs/federation devtools --port 4001`

2. **Entity Composition Fails**
   - Error: `CompositionError: Invalid entity configuration`
   - Solution: Ensure all required fields have resolvers and keys are properly defined

3. **Type Conversion Errors**
   - Error: `TypeConversionError: Cannot convert schema type`
   - Solution: Use double assertion pattern: `entity as unknown as TargetType`

4. **Circuit Breaker Triggered**
   - Error: `CircuitBreakerError: Service unavailable`
   - Solution: Check subgraph health, adjust failure thresholds in config

5. **Memory Issues with Large Schemas**
   - Solution: Enable batch eviction in cache config:
     ```typescript
     queryPlanCache: {
       maxSize: 1000,
       evictionStrategy: 'lru-batch',
       batchEvictionSize: 100
     }
     ```

## Performance Optimization Tips

1. **Query Plan Caching**: Use LRU with batch eviction for 40% faster performance
2. **DataLoader Batching**: Enable adaptive batching for optimal throughput
3. **Circuit Breakers**: Pre-calculate timeout thresholds to reduce overhead
4. **Connection Pooling**: Enable for subgraph communication
5. **Schema Complexity**: Use schema tools to identify and optimize complex types

## Critical Reminders

- Always use Effect.fail for errors in mocks, never throw
- HealthStatus uses `timestamp` and `responseTime` fields (not `lastCheck`/`metrics`)
- Test failures should use expectEffectFailure helper
- DataLoader stats require proper key generation
- **NEVER use `any` type** - this is strictly enforced. Use `unknown`, proper type parameters, or specific type assertions through double assertion
- ValidatedEntity structure uses `keys` array not single `key` property
- Entity builder's `build()` method returns `Effect.Effect<ValidatedEntity<>, ValidationError>`
- For compatibility, entity builder adds a `key` property alongside `keys`
- FederationComposer is the main composer class
- Use `downlevelIteration: true` in tsconfig for generator functions
- **UltraStrictEntityBuilder Pattern**: `createUltraStrictEntityBuilder()` now returns HasSchema state (no need for `withSchema` calls)
- **Index Signature Access**: Use bracket notation for dynamic properties (e.g., `obj['property']` instead of `obj.property`)
- **Schema Type Casting**: Cast schemas to `Schema.Schema<unknown, unknown, never>` when using with generic builders
- **EntityValidationResult Casting**: Use `result as EntityValidationResult<unknown, unknown, unknown>` for validation result matching
- **Match.exhaustive**: Ensure all error types in DomainError union are handled (includes HealthCheckError)
- **ErrorTransformation Config**: All ErrorBoundaryConfig objects must include `errorTransformation` property with `includeStackTrace` and `sanitizeErrors`
- **Package.json Exports**: The `types` field must come before `import` and `require` in export definitions
- **Git Hooks**: Husky is configured for pre-commit and pre-push hooks (lint-staged runs on commits)
