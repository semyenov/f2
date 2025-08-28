/**
 * # Federation Framework v2
 *
 * Complete Apollo Federation 2.x framework with Effect-TS, ultra-strict TypeScript patterns,
 * and enterprise-grade resilience features for building production-ready GraphQL federation systems.
 *
 * ## 🚀 Key Features
 *
 * - **🏗️ Effect-First Architecture**: Built entirely on Effect-TS for composable, type-safe operations
 * - **🌐 Apollo Federation 2.x**: Full support for all federation directives and patterns
 * - **🔒 Ultra-Strict TypeScript**: Zero `any` usage with comprehensive type safety
 * - **⚡ Performance Optimizations**: Query plan caching, DataLoader batching, circuit breakers
 * - **🛡️ Enterprise Resilience**: Circuit breakers, timeouts, error boundaries, retry policies
 * - **📋 Schema-First Development**: Import and hot-reload GraphQL schemas with AST conversion
 * - **🧪 Experimental Patterns**: Phantom types, branded types, and compile-time validation
 * - **🎯 Pattern Matching**: Exhaustive error handling with discriminated unions
 *
 * ## 📚 Quick Start
 *
 * ```typescript
 * import { createEntityBuilder, FederationEntityBuilder } from '@cqrs/federation-v2'
 * import { Effect } from 'effect'
 * import * as Schema from '@effect/schema/Schema'
 *
 * // Define your entity schema
 * const UserSchema = Schema.Struct({
 *   id: Schema.String,
 *   email: Schema.String,
 *   name: Schema.String
 * })
 *
 * // Create a federated entity with directives
 * const userEntity = createEntityBuilder('User', UserSchema, ['id'])
 *   .withShareableField('name')
 *   .withInaccessibleField('email')
 *   .withReferenceResolver((ref, context, info) =>
 *     Effect.succeed({ ...ref, name: 'John Doe' })
 *   )
 *
 * // Build the entity with validation
 * const entity = yield* userEntity.build()
 * ```
 *
 * ## 🏛️ Architecture
 *
 * The framework follows a layered Effect-TS architecture:
 *
 * ```
 * ┌─────────────────────────────────────┐
 * │           Application Layer         │  ← Your GraphQL resolvers
 * ├─────────────────────────────────────┤
 * │         Federation Layer            │  ← Entity builders, composition
 * ├─────────────────────────────────────┤
 * │      Performance & Resilience       │  ← Caching, circuit breakers
 * ├─────────────────────────────────────┤
 * │            Core Layer               │  ← Types, errors, services
 * ├─────────────────────────────────────┤
 * │           Effect Runtime            │  ← Effect-TS foundation
 * └─────────────────────────────────────┘
 * ```
 *
 * ## 📖 Documentation Sections
 *
 * - **{@link createEntityBuilder | Core API}** - Essential entity building functionality
 * - **{@link FederationEntityBuilder | Entity Builders}** - Fluent builders for federation entities
 * - **{@link PerformanceOptimizations | Performance & Caching}** - Query caching and optimization
 * - **{@link FederationErrorBoundaries | Error Handling & Resilience}** - Circuit breakers and fault tolerance
 * - **{@link Experimental | Experimental Features}** - Advanced patterns and ultra-strict builders
 *
 * ## 🎯 Design Principles
 *
 * 1. **Effect-First**: All async operations return `Effect.Effect<Success, Error, Requirements>`
 * 2. **No Exceptions**: Use algebraic error types with exhaustive pattern matching
 * 3. **Composability**: Layer-based dependency injection for testable, modular design
 * 4. **Type Safety**: Leverage TypeScript's type system to prevent runtime errors
 * 5. **Performance**: Built-in optimizations for production workloads
 * 6. **Developer Experience**: Comprehensive tooling and excellent error messages
 *
 * @packageDocumentation
 * @version 2.0.0
 * @since 2.0.0
 * @author CQRS Federation Team
 * @see {@link https://github.com/cqrs/federation | GitHub Repository}
 * @see {@link https://www.apollographql.com/docs/federation/ | Apollo Federation Docs}
 * @see {@link https://effect.website/ | Effect-TS Documentation}
 */

// Core exports
export * from './core/index.js'

// Federation exports
export * from './federation/index.js'

// Schema exports
export * from './schema/ast-conversion.js'

// Experimental features (advanced patterns)
export * as Experimental from './experimental/index.js'

/**
 * Framework version
 */
export const VERSION = '2.0.0' as const

/**
 * Framework metadata
 */
export const FRAMEWORK_INFO = {
  name: '@cqrs/federation-v2',
  version: VERSION,
  description: 'Apollo Federation 2.x with Effect-TS',
  features: [
    'Effect-First Architecture',
    'Apollo Federation 2.x Support',
    'Ultra-Strict TypeScript',
    'Algebraic Error System',
    'Performance Optimizations',
    'Schema-First Development',
    'Circuit Breakers',
    'Hot Reload',
    'Layer-based Dependency Injection',
    'Effect.gen Patterns',
    'Structured Logging',
    'Type-safe Configuration',
    'Pattern Matching Error Handling',
    'Modern Test Infrastructure',
  ],
} as const
