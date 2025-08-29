# Module Structure Migration Guide

## Version 3.0.0 - Breaking Changes

This guide documents the complete module structure migration from version 2.x to 3.x of the @cqrs/federation framework.

## Overview

The framework has been reorganized from a flat module structure to a hierarchical, concern-based structure that provides better separation of concerns, clearer dependencies, and improved tree-shaking.

## Breaking Changes

### Import Path Changes

All import paths have changed. The table below maps old imports to new ones:

| Old Import | New Import | Purpose |
|------------|------------|---------|
| `@cqrs/federation/core` | `@cqrs/federation/runtime` | Core runtime functionality |
| `@cqrs/federation/federation` | `@cqrs/federation/federation` | Federation-specific features |
| `@cqrs/federation/schema` | `@cqrs/federation/runtime/schema` | Schema processing |
| `@cqrs/federation/experimental` | `@cqrs/federation/api/advanced` | Advanced patterns |
| `@cqrs/federation/facade` | `@cqrs/federation/api/simple` | Simplified API |
| `@cqrs/federation/cli` | `@cqrs/federation/tooling/cli` | CLI tools |
| `@cqrs/federation/testing` | `@cqrs/federation/tooling/testing` | Testing utilities |
| `@cqrs/federation/devtools` | `@cqrs/federation/tooling/devtools` | Development tools |
| `@cqrs/federation/cloud` | `@cqrs/federation/tooling/cloud` | Cloud deployment |

### Module Reorganization

#### Runtime Layer (`/runtime`)
Core functionality always needed at runtime:
- **core/** - Entity builders, types, errors
- **effect/** - Effect-TS services and layers
- **schema/** - GraphQL schema processing

#### Federation Layer (`/federation`)
Apollo Federation specific features:
- **composition/** - Schema composition
- **subgraphs/** - Subgraph management
- **entities/** - Entity management

#### Infrastructure Layer (`/infrastructure`)
Production features for resilience and performance:
- **resilience/** - Circuit breakers, error boundaries
- **performance/** - Caching, DataLoader, optimizations
- **observability/** - Metrics, logging, tracing
- **subscriptions/** - Real-time subscriptions

#### Tooling Layer (`/tooling`)
Development and deployment tools:
- **cli/** - Project scaffolding, code generation
- **testing/** - Test harness, utilities
- **devtools/** - Playground, profiler, schema tools
- **cloud/** - Kubernetes, multi-cloud deployment

#### API Layer (`/api`)
User-facing APIs with different complexity levels:
- **simple/** - Facade pattern for easy setup
- **advanced/** - Phantom types, ultra-strict patterns
- **patterns/** - Common federation patterns library

## Migration Steps

### Step 1: Update Package.json

Update your `package.json` to use version 3.0.0:

```json
{
  "dependencies": {
    "@cqrs/federation": "^3.0.0"
  }
}
```

### Step 2: Update Imports

#### Basic Migration

Replace all imports using the mapping table above:

```typescript
// Before (v2.x)
import { createEntityBuilder } from '@cqrs/federation/core'
import { FederationComposer } from '@cqrs/federation/federation'
import { createUltraStrictEntityBuilder } from '@cqrs/federation/experimental'

// After (v3.x)
import { createEntityBuilder } from '@cqrs/federation/runtime'
import { FederationComposer } from '@cqrs/federation/federation'
import { createUltraStrictEntityBuilder } from '@cqrs/federation/api/advanced'
```

#### Using the Compatibility Layer

For gradual migration, you can use the main entry point which re-exports common items:

```typescript
// Works in both v2.x and v3.x
import {
  createEntityBuilder,
  FederationEntityBuilder,
  FederationComposer,
  ValidationError,
  FederationError
} from '@cqrs/federation'
```

### Step 3: Update Tooling Imports

Tooling modules must now be imported from their new locations:

```typescript
// Before (v2.x)
import { CLI } from '@cqrs/federation/cli'
import { TestHarness } from '@cqrs/federation/testing'
import { Playground } from '@cqrs/federation/devtools'

// After (v3.x)
import { CLI } from '@cqrs/federation/tooling/cli'
import { TestHarness } from '@cqrs/federation/tooling/testing'
import { Playground } from '@cqrs/federation/tooling/devtools'
```

### Step 4: Update Build Configuration

If you're using path mappings in your `tsconfig.json`, update them:

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

### Step 5: Test Your Application

Run your test suite to ensure all imports are resolved correctly:

```bash
bun test
bun run typecheck
```

## Automated Migration Script

We provide a migration script to help automate the import updates:

```bash
npx @cqrs/federation migrate-imports
```

This script will:
1. Scan your codebase for old import patterns
2. Update them to the new structure
3. Create a backup of modified files
4. Generate a migration report

## Compatibility Notes

### Backward Compatibility

The main entry point (`@cqrs/federation`) maintains backward compatibility by re-exporting commonly used items:

```typescript
// These exports remain available from the main entry
export { 
  createEntityBuilder,
  FederationEntityBuilder,
  toFederationEntity,
  ValidationError,
  FederationError,
  CompositionError,
  ErrorFactory
} from './runtime/core'
```

### Tree-Shaking Improvements

The new structure provides better tree-shaking:

```typescript
// Import only what you need
import { createEntityBuilder } from '@cqrs/federation/runtime/core/builders'
import { CircuitBreaker } from '@cqrs/federation/infrastructure/resilience'

// Instead of importing everything
import * as Federation from '@cqrs/federation' // Avoid this
```

### TypeScript Configuration

Ensure your TypeScript configuration supports the new module structure:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16"
    "module": "ESNext",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Common Issues and Solutions

### Issue: Module not found errors

**Solution**: Ensure you're using the correct import paths from the migration table.

### Issue: TypeScript type errors

**Solution**: Clear your TypeScript cache and rebuild:
```bash
rm -rf node_modules/.cache
bun run typecheck
```

### Issue: Build failures with bundlers

**Solution**: Update your bundler configuration to handle the new exports:

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@cqrs/federation/runtime': path.resolve('node_modules/@cqrs/federation/dist/runtime'),
      '@cqrs/federation/infrastructure': path.resolve('node_modules/@cqrs/federation/dist/infrastructure')
    }
  }
}
```

### Issue: Test imports failing

**Solution**: Update test configurations to resolve new paths:

```javascript
// vitest.config.ts
export default {
  resolve: {
    alias: {
      '@cqrs/federation/runtime': './src/runtime',
      '@cqrs/federation/infrastructure': './src/infrastructure'
    }
  }
}
```

## Benefits of the New Structure

### 1. Clear Separation of Concerns
- Runtime code separated from development tools
- Infrastructure concerns isolated from core logic
- API layers for different use cases

### 2. Improved Bundle Sizes
- Better tree-shaking with granular exports
- Tooling code not included in production builds
- Optional infrastructure features can be excluded

### 3. Enhanced Developer Experience
- Clearer import paths indicate module purpose
- Consistent organization across the framework
- Easier to find and understand features

### 4. Future-Proof Architecture
- Room for growth in each module category
- Clean boundaries for new features
- Easier to maintain and evolve

## Version Support Timeline

- **v2.x**: Supported until December 2024
- **v3.x**: Long-term support (LTS) until December 2026
- **Migration Period**: June 2024 - December 2024

During the migration period, we'll maintain critical security updates for v2.x while encouraging migration to v3.x.

## Getting Help

### Documentation
- [Architecture Guide](./ARCHITECTURE.md)
- [API Documentation](https://docs.cqrs-federation.dev)
- [Examples Repository](https://github.com/cqrs/federation-examples)

### Community Support
- [GitHub Discussions](https://github.com/cqrs/federation/discussions)
- [Discord Server](https://discord.gg/cqrs-federation)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/cqrs-federation)

### Migration Assistance
For enterprise customers, we offer migration assistance services:
- Code review and migration planning
- Automated migration for large codebases
- Training and workshops

Contact: enterprise@cqrs-federation.dev

## Appendix: Complete Import Mapping

### Core Imports
```typescript
// Entity Builders
'@cqrs/federation/core/builders' → '@cqrs/federation/runtime/core/builders'
'@cqrs/federation/core/types' → '@cqrs/federation/runtime/core/types'
'@cqrs/federation/core/errors' → '@cqrs/federation/runtime/core/errors'

// Services
'@cqrs/federation/core/services/config' → '@cqrs/federation/runtime/effect/services/config'
'@cqrs/federation/core/services/logger' → '@cqrs/federation/runtime/effect/services/logger'
'@cqrs/federation/core/services/layers' → '@cqrs/federation/runtime/effect/layers'
```

### Federation Imports
```typescript
// Composition
'@cqrs/federation/federation/composer' → '@cqrs/federation/federation/composition'
'@cqrs/federation/federation/subgraph' → '@cqrs/federation/federation/subgraphs'

// Moved to Infrastructure
'@cqrs/federation/federation/error-boundaries' → '@cqrs/federation/infrastructure/resilience'
'@cqrs/federation/federation/performance' → '@cqrs/federation/infrastructure/performance'
```

### Experimental/Advanced Imports
```typescript
'@cqrs/federation/experimental' → '@cqrs/federation/api/advanced'
'@cqrs/federation/experimental/ultra-strict-entity-builder' → '@cqrs/federation/api/advanced/strict'
```

### Tooling Imports
```typescript
'@cqrs/federation/cli' → '@cqrs/federation/tooling/cli'
'@cqrs/federation/testing' → '@cqrs/federation/tooling/testing'
'@cqrs/federation/devtools' → '@cqrs/federation/tooling/devtools'
'@cqrs/federation/cloud' → '@cqrs/federation/tooling/cloud'
```

---

*Last updated: January 2025*
*Version: 3.0.0-migration-guide*