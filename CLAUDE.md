# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Testing

- `bun test` - Run all tests
- `bun test tests/unit/federation/subgraph.test.ts` - Run a specific test file
- `bun test --watch` - Run tests in watch mode
- `bun test:unit` - Run unit tests only
- `bun test:integration` - Run integration tests only
- `bun test:coverage` - Generate coverage reports

### Development

- `bun run dev` - Development mode with hot reload
- `bun run demo` - Run basic entity example
- `bun run demo:ultra-strict` - Demo ultra-strict entity patterns
- `bun run demo:schema-first` - Demo schema-first workflow
- `bun run demo:complete` - Complete feature demonstration
- `bun run demo:advanced` - Advanced federation features

### Building

- `bun run build` - Production build using tsdown
- `bun run build:watch` - Build in watch mode
- `bun run clean` - Remove dist directory

### Code Quality

- `bun run typecheck` - Type checking without emitting files
- `bun run lint` - ESLint checking
- `bun run lint:fix` - ESLint with automatic fixing
- `bun run format` - Prettier code formatting
- `bun run format:check` - Check formatting without changes
- `bun run validate` - Full validation: typecheck + test:complete

## Architecture Overview

**Federation Framework v2** - Apollo Federation 2.x framework built with Effect-TS, emphasizing functional programming and enterprise resilience.

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

### Performance Optimizations

- **Query Plan Cache**: LRU with batch eviction (10% at a time)
- **DataLoader**: Instrumented batch functions track stats
- **Circuit Breakers**: Pre-calculated timeout thresholds
- **Metrics**: Buffered with batch flushing to reduce I/O

## Important Files

- `test-complete.ts` - Comprehensive integration test
- `tests/utils/test-layers.ts` - Test mock services and helpers
- `comprehensive-functional-demo.ts` - Complete functional programming patterns demo

## Critical Reminders

- Always use Effect.fail for errors in mocks, never throw
- HealthStatus uses `timestamp` not `lastCheck`
- Test failures should use expectEffectFailure helper
- DataLoader stats require proper key generation
- Never use `any` type - use `unknown` or proper type parameters
- ValidatedEntity structure differs from FederationEntity (uses `keys` array not `key`)
- Schema-first patterns may use `any` for generic entity types due to interface constraints
- Entity builder's `build()` method returns `Effect.Effect<ValidatedEntity<>, ValidationError>`
- For backward compatibility, entity builder adds a `key` property alongside `keys`
