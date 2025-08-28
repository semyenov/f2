/**
 * Federation Framework v2
 *
 * A complete Apollo Federation 2.x implementation using Effect-TS and ultra-strict TypeScript patterns
 * for building enterprise-grade GraphQL federation systems.
 *
 * @packageDocumentation
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
