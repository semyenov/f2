# Federation Framework v2 - API Reference

This directory contains comprehensive API documentation for all modules and components in the Federation Framework v2.

## Core Modules

### 🏗️ Entity Building
- **[Entity Builder](./entity-builder.md)** - Standard federation entity creation
- **[Ultra-Strict Entity Builder](./ultra-strict-entity-builder.md)** - Type-safe entity building with phantom types
- **[Schema-First Patterns](./schema-first-patterns.md)** - AST-based schema development workflow

### ⚡ Effect System
- **[Error Handling](./error-handling.md)** - Effect-based error management and pattern matching
- **[Types](./types.md)** - Core type definitions and interfaces

### 🔧 Federation Components  
- **[Federation Composer](./federation-composer.md)** - Schema composition and orchestration
- **[Subgraph Management](./subgraph-management.md)** - Service discovery and health monitoring
- **[Error Boundaries](./error-boundaries.md)** - Circuit breakers and fault tolerance
- **[Performance Optimization](./performance-optimization.md)** - Caching and DataLoader batching

### 🔄 Schema Processing
- **[AST Conversion](./ast-conversion.md)** - Effect Schema to GraphQL type conversion

### 🛠️ Services & Configuration
- **[Service Layer](./service-layer.md)** - Dependency injection and configuration
- **[Logging](./logging.md)** - Structured logging with Effect

## Quick Navigation

| Component | Purpose | Key Features |
|-----------|---------|-------------|
| `ModernFederationEntityBuilder` | Standard entity creation | Apollo Federation 2.x directives, Effect resolvers |
| `UltraStrictEntityBuilder` | Type-safe entity building | Phantom types, compile-time validation, pattern matching |
| `FederationComposer` | Schema composition | Service orchestration, validation, hot reload |
| `SubgraphRegistry` | Service management | Health checks, discovery, load balancing |
| `ErrorBoundaries` | Fault tolerance | Circuit breakers, partial failure handling |
| `PerformanceOptimizations` | Query optimization | Plan caching, DataLoader batching, metrics |

## Usage Patterns

### Basic Entity Creation
```typescript
import { ModernFederationEntityBuilder } from "@cqrs/federation-v2/core"

const userEntity = new ModernFederationEntityBuilder("User", UserSchema, ["id"])
  .withShareableField("email")
  .withTaggedField("name", ["pii"])
  .build()
```

### Ultra-Strict Type Safety
```typescript
import { 
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  validateEntityBuilder
} from "@cqrs/federation-v2/core"

const entity = pipe(
  createUltraStrictEntityBuilder("User"),
  withSchema(UserSchema),
  withKeys([UltraStrictEntityBuilder.Key.create("id", GraphQLID, false)]),
  validateEntityBuilder
)
```

### Error Handling with Pattern Matching
```typescript
import { Match } from "effect"

const handleError = (error: DomainError) =>
  Match.value(error).pipe(
    Match.tag("ValidationError", err => `Invalid ${err.field}: ${err.message}`),
    Match.tag("FederationError", err => `Federation error: ${err.message}`),
    Match.exhaustive
  )
```

## Type System

The framework uses a sophisticated type system with:
- **Effect-TS Integration**: All operations return `Effect<Success, Error, Context>`
- **Phantom Types**: Compile-time validation with zero runtime cost
- **Branded Types**: Strong typing for domain concepts
- **Pattern Matching**: Exhaustive error handling

## Architecture Philosophy

- **Effect-First**: All operations use Effect for functional composition
- **Type Safety**: Ultra-strict TypeScript with compile-time validation
- **Resilience**: Circuit breakers and error boundaries throughout
- **Performance**: Built-in caching and optimization strategies
- **Composability**: Functional patterns enable easy composition and testing