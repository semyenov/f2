# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Testing

- `bun test` - Run all tests
- `bun test tests/unit/federation/subgraph.test.ts` - Run a specific test file
- `bun test --watch` - Run tests in watch mode
- `bun test:unit` - Run unit tests only (tests/unit)
- `bun test:integration` - Run integration tests only (tests/integration)
- `bun test:coverage` - Generate coverage reports with v8 provider
- `bun test:complete` - Run comprehensive integration test (test-complete.ts)
- `vitest --ui` - Run tests with interactive UI

### Development

- `bun run dev` - Development mode with hot reload
- `bun run demo` - Run complete framework test
- `bun run demo:functional` - Demo functional programming patterns
- `bun run demo:comprehensive` - Comprehensive functional demo

### Building

- `bun run build` - Production build using tsdown
- `bun run build:watch` - Build in watch mode
- `bun run clean` - Remove dist directory

### Code Quality

- `bun run typecheck` - Type checking for source files only
- `bun run typecheck:tests` - Type checking for tests with relaxed rules
- `bun run lint` - ESLint checking
- `bun run lint:fix` - ESLint with automatic fixing
- `bun run format` - Prettier code formatting
- `bun run format:check` - Check formatting without changes
- `bun run validate` - Full validation: typecheck + typecheck:tests + lint + test:complete

### Documentation

- `bun docs:generate` - Generate TypeDoc documentation

### Maintenance Scripts

- `bun run scripts/convert-imports.ts` - Convert relative imports to barrel exports (maintains ESM .js extensions)

## Architecture Overview

**Federation Framework** - Apollo Federation framework built with Effect-TS, emphasizing functional programming and enterprise resilience.

### Core Architecture

The codebase follows a layered Effect-TS architecture with strong type safety:

```
src/
├── core/           # Foundation layer - types, builders, errors
│   ├── builders/   # Entity builders with different strictness levels
│   ├── types.ts    # Core type definitions using branded types
│   ├── errors.ts   # Effect-based error hierarchy
│   └── services/   # Effect Layers for DI
├── federation/     # Federation-specific features
│   ├── composer.ts         # Schema composition with Effect
│   ├── subgraph.ts        # Registry with service discovery
│   ├── error-boundaries.ts # Circuit breakers, fault tolerance
│   └── performance.ts      # Caching, DataLoader optimizations
├── schema/         # Schema processing
│   └── ast-conversion.ts   # Effect Schema → GraphQL conversion
└── experimental/   # Ultra-strict patterns with phantom types
```

### Key Patterns

**Effect-First Design**: All async operations return `Effect.Effect<Success, Error, Requirements>`. Never use promises or throw exceptions directly.

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

- Never use `any` - use proper type assertions or unknown
- All imports use `.js` extension (ESM requirement)
- Entity builders use phantom types for compile-time validation
- HealthStatus has `timestamp` and `responseTime` fields (not `lastCheck`/`metrics`)
- ValidatedEntity structure uses `keys` array not single `key` property
- When using `any` is unavoidable (e.g., generic entity mocks), document the reason

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

- **`tsconfig.json`** - Main configuration for source files only (strict rules, includes `@/*` path mapping)
- **`tsconfig.build.json`** - Production build configuration (extends main)
- **`tsconfig.test.json`** - Test-specific configuration (relaxed unused variable rules, test type definitions)

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

## Development Philosophy

**File Creation Policy**:

- ALWAYS prefer editing existing files over creating new ones
- NEVER create documentation files (\*.md) or README files unless explicitly requested
- Only create files when absolutely necessary for functionality
- Maintain existing code conventions and patterns

## Critical Reminders

- Always use Effect.fail for errors in mocks, never throw
- HealthStatus uses `timestamp` and `responseTime` fields (not `lastCheck`/`metrics`)
- Test failures should use expectEffectFailure helper
- DataLoader stats require proper key generation
- **NEVER use `any` type** - this is strictly enforced. Use `unknown`, proper type parameters, or specific type assertions
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
