/**
 * Experimental Features Module
 *
 * This module contains advanced patterns and experimental features
 * that showcase the framework's capabilities but are not part of the
 * core API surface. Use these patterns when you need advanced type
 * safety or are exploring cutting-edge TypeScript features.
 */

export {
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
  UltraStrictEntityBuilder,
  type EntityValidationResult,
  type ValidatedEntity,
  type EntityKey,
  type EntityDirective,
  type EntityMetadata,
  type PhantomStates,
  SchemaValidationError,
  KeyValidationError,
  DirectiveValidationError,
  EntityBuilderError,
} from './ultra-strict-entity-builder.js'
