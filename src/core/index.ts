export * from "./types.js"
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
  type FederationDomainError
} from "./errors.js"
export * from "./builders/index.js"
export {
  UltraStrictEntityBuilder,
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
  type EntityValidationResult,
  type ValidatedEntity,
  type EntityKey,
  type EntityDirective,
  type EntityMetadata
} from "./ultra-strict-entity-builder.js"
export * from "./schema-first-patterns.js"
export * from "./services/index.js"
