# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `bun run dev` - Development mode with hot reload (runs basic-entity.ts)
- `bun run demo` - Run basic entity example (simple-entity.ts)
- `bun run demo:ultra-strict` - Demo ultra-strict entity patterns with phantom types
- `bun run demo:schema-first` - Demo schema-first development workflow with evolution safety
- `bun run demo:complete` - Complete feature demonstration (runs complete-federation-v2-demo.ts)
- `bun run demo:advanced` - Advanced federation features (runs advanced-federation.ts)

### Building & Testing

- `bun run build` - Build the project using tsdown
- `bun run build:tsc` - Build using TypeScript compiler
- `bun run build:watch` - Build in watch mode
- `bun run clean` - Remove dist directory
- `bun run test` - Run tests using bun test
- `bun run test:watch` - Run tests in watch mode
- `bun run test:complete` - Run comprehensive tests (using test-complete.ts)

### Validation & Quality Assurance

- `bun run typecheck` - Type checking without emitting files
- `bun run validate` - Full validation: typecheck + test:complete
- `bun run lint` - ESLint checking with functional programming rules
- `bun run lint:fix` - ESLint with automatic fixing
- `bun run format` - Prettier code formatting
- `bun run format:check` - Check code formatting without changing files
- `bun run security` - Security audit and vulnerability scan
- `bun run audit` - NPM security audit for vulnerabilities
- `bun run audit:fix` - Fix security vulnerabilities automatically
- `bun run docs:generate` - Generate API documentation with TypeDoc
- `bun run prepare` - Set up Husky pre-commit hooks

## Project Architecture

This is a **Federation Framework v2** - an Apollo Federation 2.x framework built with Effect-TS that emphasizes ultra-strict TypeScript patterns, functional programming, and enterprise-grade resilience.

### Core Architecture Layers

```
GraphQL Federation Layer (Schema, Entities, Directives)
├── Core (types, builders, error system)
├── Federation (composition, subgraph management, error boundaries)
├── Schema (AST conversion, schema-first development)
└── Patterns (reusable patterns for error handling)
```

### Key Directories

- **`src/core/`** - Core types, builders, and error handling system
  - `builders/` - Entity builders (standard, ultra-strict, schema-first)
  - `types.ts` - Comprehensive type definitions for federation
  - `errors.ts` - Effect-based error types and handling
- **`src/federation/`** - Federation-specific functionality
  - `composer.ts` - Schema composition logic
  - `subgraph.ts` - Subgraph registry and service discovery
  - `error-boundaries.ts` - Circuit breakers and fault tolerance
  - `performance.ts` - Query caching and DataLoader optimizations

- **`src/schema/`** - Schema processing and AST manipulation
  - `ast-conversion.ts` - Effect Schema to GraphQL type conversion

- **`src/examples/`** - Working demonstrations of all features

### Key Technologies & Patterns

- **Effect-TS**: All operations use Effect for functional composition and error handling
- **Ultra-Strict TypeScript**: Phantom types, branded types, compile-time validation
- **Pattern Matching**: Exhaustive error handling using Effect's Match module
- **Apollo Federation 2.x**: Full directive support (@shareable, @inaccessible, @tag, etc.)
- **Circuit Breakers**: Enterprise-grade fault tolerance and resilience
- **Schema-First Development**: Safe evolution with breaking change detection

### Error Handling Philosophy

All errors are modeled as Effect errors with discriminated unions. Use pattern matching for error handling:

```typescript
const handleError = (error: DomainError) =>
  Match.value(error).pipe(
    Match.tag('ValidationError', err => `Invalid ${err.field}: ${err.message}`),
    Match.tag('FederationError', err => `Federation error: ${err.message}`),
    Match.exhaustive
  )
```

### Entity Building Patterns

The framework provides multiple entity builders:

- **Standard Builder** (`ModernFederationEntityBuilder`) - Legacy v1.x compatibility
- **Ultra-Strict Builder** (`UltraStrictEntityBuilder`) - Phantom types and compile-time validation
- **Schema-First Builder** - AST-based development workflow

### Development Workflow

1. Use examples in `src/examples/` as starting points
2. All code should follow Effect-first patterns with proper error handling
3. Entity definitions should use Effect Schema for type safety
4. Always validate entities using the provided validation functions
5. Use pattern matching for comprehensive error handling

### Runtime & Dependencies

- **Runtime**: Node.js >=20.0.0, Bun >=1.0.0
- **Core Dependencies**: Effect (3.19.2+), @effect/schema (0.77.1+), GraphQL, @graphql-tools/\*
- **Build Tool**: tsdown (production builds), tsc (development/watch mode)
- **Package Manager**: Bun (preferred) or npm/yarn
- **TypeScript**: 5.7+ with ultra-strict configuration

### Testing & Quality Assurance

- **Test Framework**: Bun test with comprehensive test suites
- **Test Commands**:
  - `bun run test` - Run all tests
  - `bun run test:unit` - Unit tests for individual components
  - `bun run test:integration` - Integration tests for federation scenarios
  - `bun run test:property-based` - Property-based tests using fast-check
  - `bun run test:watch` - Run tests in watch mode
  - `bun run test:coverage` - Generate coverage reports
- **Test Structure**:
  - `tests/unit/` - Component and module unit tests
  - `tests/integration/` - End-to-end federation scenarios
  - `tests/property-based/` - Automated test generation with fast-check
- **Test Helpers**: Use `tests/setup/test-helpers.ts` for reusable test utilities like `createTestEntity()` and `runEffectTest()`
- **Code Quality**: ESLint + Prettier with functional programming rules
- **Security**: Automated auditing with GitHub Actions, comprehensive security checklist
- **Documentation**: TypeDoc API documentation generation with GitHub Pages integration
- **CI/CD**: GitHub Actions workflows for testing, security scanning, and documentation

### Development Workflow

1. Use examples in `src/examples/` as starting points
2. All code should follow Effect-first patterns with proper error handling
3. Entity definitions should use Effect Schema for type safety
4. Always validate entities using the provided validation functions
5. Use pattern matching for comprehensive error handling
6. **Quality Assurance Workflow**:
   - Run `bun run lint` to check code quality
   - Run `bun run format` to ensure consistent formatting
   - Run `bun run typecheck` to verify TypeScript types
   - Run `bun run test:unit` for component testing
   - Run `bun run test:integration` for end-to-end validation
   - Run `bun run security` for vulnerability scanning
   - Run `bun run validate` for complete validation before committing
7. Follow migration guide when updating from v1.x patterns
8. Use pre-commit hooks (Husky) for automated quality checks
9. Review security checklist for production deployments

### Code Patterns & Conventions

- **Import Style**: Use relative imports with `.js` extension for local modules (ESM requirement)
- **Error Handling**: All functions return `Effect.Effect<Success, Error>` types, never throw exceptions
- **File Extensions**: TypeScript source uses `.ts`, but imports reference `.js` for ESM compatibility
- **Pattern Matching**: Use `Match.value(error).pipe(Match.tag(...), Match.exhaustive)` for error handling
- **Schema Validation**: Use `@effect/schema` for all input validation and type conversion
- **Builder Pattern**: Entity builders use fluent interface with phantom types for compile-time validation

### Quality Assurance Commands

- `bun run lint` - ESLint checking with functional programming rules
- `bun run format` - Prettier code formatting
- `bun run test:unit` - Run unit tests for individual components
- `bun run test:integration` - Run integration tests for federation scenarios
- `bun run test:property-based` - Run property-based tests with fast-check
- `bun run test:coverage` - Generate coverage reports with detailed metrics
- `bun run security` - Security audit and vulnerability scanning
- `bun run docs:generate` - Generate API documentation with TypeDoc

### Configuration Files

- **ESLint**: `eslint.config.js` - Functional programming rules with strict error handling
- **Prettier**: `.prettierrc.json` - Consistent code formatting configuration
- **TypeScript**: `tsconfig.json` (main), `tsconfig.build.json` (build-specific)
- **Build**: `tsdown.config.ts` - tsdown configuration for dual ESM/CJS builds
- **TypeDoc**: `typedoc.json` - API documentation generation settings
- **Husky**: `.husky/pre-commit` - Pre-commit hooks for quality assurance
- **GitHub Actions**: `.github/workflows/ci.yml` (testing), `.github/workflows/security.yml` (security)

### Important Files

- **`test-complete.ts`** - Comprehensive integration test demonstrating all framework features
- **`MIGRATION.md`** - Complete migration guide from Federation v1 to v2
- **`security-checklist.md`** - Production security guidelines and best practices

### Framework-Specific Conventions

- **Entity Builders**: Standard (`ModernFederationEntityBuilder`), Ultra-Strict (`UltraStrictEntityBuilder`), Schema-First
- **Error Types**: All errors extend from `DomainError` union type with `_tag` discriminants
- **Service Layer**: Use Effect Layers for dependency injection (see `src/core/services/`)
- **Validation Results**: Use discriminated unions like `EntityValidationResult` with exhaustive pattern matching
- **File Naming**:
  - `*-modern.ts` for new Effect-based implementations
  - `*.test.ts` for unit tests, `*.spec.ts` for integration tests
  - `*-example.ts` for demonstration files in examples/

## important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
