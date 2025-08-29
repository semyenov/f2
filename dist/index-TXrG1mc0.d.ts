import { EntityResolutionError, FederationEntity, ServiceDefinition, ValidationError } from "./types-iFJStALn.js";
import { FederationEntityBuilder, createEntityBuilder, index_d_exports as index_d_exports$1 } from "./index-BN0wk27d.js";
import { SubgraphManagement } from "./subgraph-9ib9tnHl.js";
import { FederationErrorBoundaries, PerformanceOptimizations } from "./performance-zrAYPIlq.js";
import * as Effect from "effect/Effect";
import { GraphQLSchema } from "graphql";
import * as Schema from "effect/Schema";

//#region src/api/simple/facade.d.ts

/**
 * Simplified configuration for federation setup
 */
interface SimplifiedFederationConfig {
  /**
   * Federation entities to compose
   */
  entities: Array<FederationEntity<unknown, unknown, unknown, unknown, Record<string, unknown>>>;
  /**
   * Service URLs or definitions
   */
  services: Array<string | ServiceDefinition>;
  /**
   * Optional performance configuration
   */
  performance?: {
    cacheSize?: number;
    batchSize?: number;
    enableMetrics?: boolean;
  };
  /**
   * Optional resilience configuration
   */
  resilience?: {
    enableCircuitBreakers?: boolean;
    timeoutSeconds?: number;
    maxFailures?: number;
  };
  /**
   * Optional development configuration
   */
  development?: {
    enableHotReload?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    enableDevTools?: boolean;
  };
}
/**
 * Simplified entity builder configuration
 */
interface SimplifiedEntityConfig<A = unknown, I = A, R = never> {
  /**
   * Entity type name
   */
  typename: string;
  /**
   * Entity schema
   */
  schema: Schema.Schema<A, I, R>;
  /**
   * Key fields for federation
   */
  keys: string[];
  /**
   * Fields to mark as shareable
   */
  shareableFields?: string[];
  /**
   * Fields to mark as inaccessible
   */
  inaccessibleFields?: string[];
  /**
   * Field tags for organization
   */
  fieldTags?: Record<string, string[]>;
  /**
   * Reference resolver function
   */
  resolveReference?: (reference: unknown) => Effect.Effect<A | null, EntityResolutionError, never>;
}
/**
 * Main Federation facade class providing simplified API
 */
declare class Federation {
  private readonly schema;
  private constructor();
  /**
   * Create a new federation instance with simplified configuration
   */
  static create(config: SimplifiedFederationConfig): Promise<Federation>;
  /**
   * Create a simplified entity builder
   */
  static createEntity<A = unknown, I = A, R = never>(config: SimplifiedEntityConfig<A, I, R>): Effect.Effect<FederationEntity<A, R, I, I, R>, ValidationError | EntityResolutionError, never>;
  /**
   * Quick entity builder with fluent API
   */
  static entity<A = unknown, I = A, R = never>(typename: string, schema: Schema.Schema<A, I, R>): QuickEntityBuilder<A, I, R>;
  /**
   * Get the composed GraphQL schema
   */
  getSchema(): GraphQLSchema;
  /**
   * Start the federation (for integration with GraphQL servers)
   */
  start(): Promise<void>;
  /**
   * Stop the federation
   */
  stop(): Promise<void>;
}
/**
 * Quick entity builder with fluent API
 */
declare class QuickEntityBuilder<A = unknown, I = A, R = never> {
  private readonly config;
  constructor(typename: string, schema: Schema.Schema<A, I, R>);
  /**
   * Set key fields
   */
  keys(...fields: string[]): this;
  /**
   * Mark fields as shareable
   */
  shareable(...fields: string[]): this;
  /**
   * Mark fields as inaccessible
   */
  inaccessible(...fields: string[]): this;
  /**
   * Tag a field
   */
  tag(field: string, ...tags: string[]): this;
  /**
   * Set reference resolver
   */
  resolver(fn: (reference: unknown) => Effect.Effect<A | null, EntityResolutionError, never>): this;
  /**
   * Build the entity
   */
  build(): Effect.Effect<FederationEntity<A, R, I, I, R>, ValidationError | EntityResolutionError, never>;
}
/**
 * Preset configurations for common scenarios
 */
declare const Presets: {
  /**
   * Development configuration with hot reload and debug logging
   */
  development: (entities: FederationEntity<unknown, unknown, unknown, unknown, Record<string, unknown>>[], services: string[]) => SimplifiedFederationConfig;
  /**
   * Production configuration with optimizations
   */
  production: (entities: FederationEntity<unknown, unknown, unknown, unknown, Record<string, unknown>>[], services: string[]) => SimplifiedFederationConfig;
  /**
   * Testing configuration with minimal setup
   */
  testing: (entities: FederationEntity<unknown, unknown, unknown, unknown>[]) => SimplifiedFederationConfig;
};
/**
 * Export common patterns as ready-to-use functions
 */
declare const Patterns: {
  /**
   * Create a basic federated entity
   */
  createBasicEntity: <A = unknown>(typename: string, schema: Schema.Schema<A, unknown, never>, keyField?: string) => Effect.Effect<FederationEntity<A, never, unknown, unknown, never>, ValidationError | EntityResolutionError, never>;
  /**
   * Create a shareable entity
   */
  createShareableEntity: <A = unknown>(typename: string, schema: Schema.Schema<A, unknown, never>, keyField: string, shareableFields: string[]) => Effect.Effect<FederationEntity<A, never, unknown, unknown, never>, ValidationError | EntityResolutionError, never>;
  /**
   * Create an entity with PII field protection
   */
  createPIIEntity: <A = unknown>(typename: string, schema: Schema.Schema<A, unknown, A>, keyField: string, piiFields: string[]) => Effect.Effect<FederationEntity<A, never, unknown, unknown, never>, ValidationError | EntityResolutionError, never>;
};
declare namespace index_d_exports {
  export { index_d_exports$1 as Advanced, EntityResolutionError, Federation, FederationEntity, FederationEntityBuilder, FederationErrorBoundaries, Patterns, PerformanceOptimizations, Presets, QuickEntityBuilder, ServiceDefinition, SimplifiedEntityConfig, SimplifiedFederationConfig, SubgraphManagement, createEntityBuilder };
}
//#endregion
export { Federation, Patterns, Presets, QuickEntityBuilder, SimplifiedEntityConfig, SimplifiedFederationConfig, index_d_exports };
//# sourceMappingURL=index-TXrG1mc0.d.ts.map