# Quick Reference - New Module Structure

## Import Cheat Sheet

### Most Common Imports

```typescript
// Core functionality
import { createEntityBuilder, FederationEntityBuilder } from '@cqrs/federation'
import { ValidationError, FederationError, ErrorFactory } from '@cqrs/federation'

// Federation components
import { FederationComposer } from '@cqrs/federation'
import { SubgraphManagement } from '@cqrs/federation'

// Infrastructure
import { FederationErrorBoundaries } from '@cqrs/federation'
import { PerformanceOptimizations } from '@cqrs/federation'
```

### Module-Specific Imports

```typescript
// Runtime modules
import { createEntityBuilder } from '@cqrs/federation/runtime/core'
import { FederationLogger } from '@cqrs/federation/runtime/effect'
import { schemaToGraphQLType } from '@cqrs/federation/runtime/schema'

// Federation modules
import { FederationComposer } from '@cqrs/federation/federation/composition'
import { SubgraphRegistry } from '@cqrs/federation/federation/subgraphs'
import { MeshIntegration } from '@cqrs/federation/federation/entities'

// Infrastructure modules
import { CircuitBreaker } from '@cqrs/federation/infrastructure/resilience'
import { QueryPlanCache } from '@cqrs/federation/infrastructure/performance'
import { SubscriptionManager } from '@cqrs/federation/infrastructure/subscriptions'

// API modules
import { Federation } from '@cqrs/federation/api/simple'  // Facade API
import { createUltraStrictEntityBuilder } from '@cqrs/federation/api/advanced'

// Tooling modules (development only)
import { TestHarness } from '@cqrs/federation/tooling/testing'
import { Playground } from '@cqrs/federation/tooling/devtools'
import { CLI } from '@cqrs/federation/tooling/cli'
import { K8sOperator } from '@cqrs/federation/tooling/cloud'
```

## Module Structure Map

```
@cqrs/federation/
├── runtime/              # Always needed at runtime
│   ├── core/            # Types, builders, errors
│   ├── effect/          # Effect-TS services
│   └── schema/          # Schema processing
├── federation/          # Federation-specific
│   ├── composition/     # Schema composition
│   ├── subgraphs/      # Subgraph management
│   └── entities/       # Entity management
├── infrastructure/      # Production features
│   ├── resilience/     # Error boundaries, circuit breakers
│   ├── performance/    # Caching, optimizations
│   └── subscriptions/  # Real-time features
├── api/                # User-facing APIs
│   ├── simple/         # Facade for easy setup
│   └── advanced/       # Ultra-strict patterns
└── tooling/            # Dev & deployment tools
    ├── cli/           # Command-line interface
    ├── testing/       # Test utilities
    ├── devtools/      # Development tools
    └── cloud/         # Deployment helpers
```

## Common Migration Patterns

### Old → New

| Before (v2.x) | After (v3.x) |
|---------------|--------------|
| `import { ... } from '@cqrs/federation/core'` | `import { ... } from '@cqrs/federation/runtime'` |
| `import { ... } from '@cqrs/federation/experimental'` | `import { ... } from '@cqrs/federation/api/advanced'` |
| `import { ... } from '@cqrs/federation/facade'` | `import { ... } from '@cqrs/federation/api/simple'` |
| `import { ... } from '@core'` | `import { ... } from '@runtime/core'` |
| `import { ... } from '@experimental'` | `import { ... } from '@api/advanced'` |

## Tree-Shaking Examples

### Import only what you need

```typescript
// ❌ Bad - imports everything
import * as Federation from '@cqrs/federation'

// ✅ Good - specific imports
import { createEntityBuilder } from '@cqrs/federation/runtime/core'
import { FederationComposer } from '@cqrs/federation/federation/composition'
```

### Conditional tooling imports

```typescript
// Only import dev tools in development
if (process.env.NODE_ENV === 'development') {
  const { Playground } = await import('@cqrs/federation/tooling/devtools')
  // Use playground
}
```

## TypeScript Path Mappings

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@federation/runtime": ["node_modules/@cqrs/federation/dist/runtime"],
      "@federation/infra": ["node_modules/@cqrs/federation/dist/infrastructure"],
      "@federation/api": ["node_modules/@cqrs/federation/dist/api"]
    }
  }
}
```

## Bundle Size Optimization

The new structure enables better tree-shaking:

- **Runtime only**: ~50KB (core functionality)
- **+ Federation**: ~80KB (with federation features)
- **+ Infrastructure**: ~120KB (with resilience & performance)
- **Full bundle**: ~200KB (everything except tooling)
- **Tooling**: Not included in production builds

## Quick Setup Example

```typescript
import { createEntityBuilder } from '@cqrs/federation'
import { FederationComposer } from '@cqrs/federation'
import { Effect } from 'effect'

// Create an entity
const userEntity = createEntityBuilder('User', UserSchema, ['id'])
  .withShareableField('name')
  .build()

// Compose federation
const federation = Effect.gen(function* () {
  return yield* FederationComposer.create({
    entities: [userEntity],
    services: [
      { id: 'users', url: 'http://localhost:4001' }
    ]
  })
})

// Run with Effect
const schema = await Effect.runPromise(federation)
```

---

*Reference for @cqrs/federation v3.x*