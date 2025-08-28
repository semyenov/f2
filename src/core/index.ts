/**
 * ## Core Federation Framework Components
 *
 * This module provides the foundational components for building Apollo Federation 2.x
 * services with Effect-TS patterns. It includes entity builders, type definitions,
 * error handling, and schema-first development tools.
 *
 * ### 🏗️ Core Components
 *
 * - **Entity Builders**: Type-safe federation entity creation
 * - **Error System**: Comprehensive error handling with discriminated unions
 * - **Type System**: Ultra-strict TypeScript patterns and branded types
 * - **Schema-First**: Tools for schema evolution and breaking change detection
 * - **Service Layer**: Configuration, logging, and dependency injection
 *
 * @example Basic usage
 * ```typescript
 * import {
 *   FederationEntityBuilder,
 *   createEntityBuilder,
 *   ValidationError
 * } from '@cqrs/federation/core'
 * import * as Schema from '@effect/schema/Schema'
 * import { Effect } from 'effect'
 *
 * const UserSchema = Schema.Struct({
 *   id: Schema.String,
 *   email: Schema.String,
 *   name: Schema.String
 * })
 *
 * const userEntity = new FederationEntityBuilder('User', UserSchema, ['id'])
 *   .withShareableField('email')
 *   .withTaggedField('name', ['pii'])
 *   .build()
 * ```
 *
 * @example Schema-first development
 * ```typescript
 * import { createSchemaFirstService } from '@cqrs/federation/core'
 *
 * const schemaService = yield* createSchemaFirstService({
 *   schemaPath: './schema.graphql',
 *   watchForChanges: true,
 *   validateOnChange: true
 * })
 * ```
 *
 * @since 2.0.0
 * @category Core API
 */
export * from './types.js'
export {
  BaseDomainError,
  ValidationError,
  SchemaValidationError,
  EntityResolutionError,
  FieldResolutionError,
  FederationError,
  CircuitBreakerError,
  TimeoutError,
  CompositionError,
  TypeConversionError,
  HealthCheckError,
  RegistrationError,
  DiscoveryError,
  ErrorMatching,
  ErrorFactory,
  type FederationDomainError,
} from './errors.js'
export { FederationEntityBuilder, createEntityBuilder } from './builders/entity-builder.js'
export * from './schema-first-patterns.js'
export * from './services/index.js'
