# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Commands

### Testing
- `bun test`: Run all tests.
- `bun test:unit`: Run unit tests only.
- `bun test:integration`: Run integration tests only.
- `bun test:watch`: Run tests in watch mode.
- `bun test:coverage`: Generate coverage reports.
- `bun run test:complete`: Run the comprehensive integration test.

### Development
- `bun run dev`: Run in development mode with hot reload.
- `bun run demo`: Run a complete framework test.

### Building
- `bun run build`: Create a production build.
- `bun run build:watch`: Build in watch mode.
- `bun run clean`: Remove the `dist` directory.

### Code Quality
- `bun run typecheck`: Run TypeScript type checking.
- `bun run lint`: Run ESLint.
- `bun run lint:fix`: Fix ESLint errors automatically.
- `bun run format`: Format code with Prettier.
- `bun run validate`: Run a full validation (typecheck, lint, and tests).

## High-level Code Architecture and Structure

This repository contains an Apollo Federation framework built with Effect-TS, emphasizing functional programming, type safety, and enterprise-grade resilience. The architecture is layered, with a strict separation of concerns.

- **`src/core/`**: The foundational layer, containing core types, entity builders, and a custom error system integrated with Effect-TS. This is the heart of the framework's type safety and functional patterns.
- **`src/federation/`**: This layer implements the Apollo Federation specification. It includes modules for schema composition (`composer.ts`), subgraph management and service discovery (`subgraph.ts`), and resilience patterns like circuit breakers (`error-boundaries.ts`).
- **`src/schema/`**: This directory contains utilities for schema-first development, including the conversion of Effect Schemas to GraphQL abstract syntax trees (ASTs), enabling robust type-safe schema construction.
- **`src/experimental/`**: This area is for cutting-edge, ultra-strict patterns that leverage phantom types for compile-time validation, pushing the boundaries of what TypeScript's type system can enforce.
- **`tests/`**: Contains a comprehensive suite of unit, integration, and property-based tests. The testing setup uses Vitest with Bun and `happy-dom`.

### Key Architectural Principles
- **Effect-First Design**: All asynchronous operations and side effects are managed through Effect-TS. Promises and `async/await` are generally avoided in favor of `Effect.Effect`.
- **Discriminated Unions for Error Handling**: Errors are modeled as discriminated unions, enabling exhaustive pattern matching with `Match.exhaustive`. This eliminates entire classes of runtime errors.
- **Layer-based Dependency Injection**: Effect's `Layer` is used for dependency injection, particularly in tests, to provide mock implementations of services.
- **Schema-First Development**: The framework is designed around a schema-first workflow, where the GraphQL schema is the source of truth, and the code is generated or validated against it.

## Important Files
- `test-complete.ts`: A comprehensive integration test that covers many of the framework's features.
- `comprehensive-functional-demo.ts`: A standalone file that demonstrates the complete functional programming patterns used in the repository.
- `vitest.config.ts`: The configuration file for the Vitest test runner.
- `.husky/`: Contains Git hooks for enforcing code quality.

