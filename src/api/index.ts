/**
 * API Module - User-facing APIs
 *
 * This module provides different API levels for various use cases:
 * - Simple: Facade API for quick setup without Effect-TS complexity
 * - Advanced: Experimental patterns with phantom types
 * - Patterns: Library of common federation patterns
 *
 * @module API
 * @since 3.0.0
 */

// Simple API (Facade pattern)
export * from './simple'

// Advanced patterns (Experimental)
export * as Advanced from './advanced'

// Pattern library (when implemented)
// export * as Patterns from './patterns'
