import { CompositionError, FederatedSchema, FederationCompositionConfig, FederationEntity, SchemaMetadata, ServiceDefinition, ValidationError } from "./types-iFJStALn.js";
import { RegistryConfig, SubgraphManagement, createDynamicRegistry, createMonitoredRegistry, createStaticRegistry } from "./subgraph-9ib9tnHl.js";
import { Duration, Effect } from "effect";
import * as Effect$1 from "effect/Effect";
import * as Context from "effect/Context";
import { GraphQLSchema } from "graphql";
import * as Layer from "effect/Layer";
import * as effect_Cause0 from "effect/Cause";

//#region src/federation/composition/composer.d.ts

declare const FederationComposer_base: Context.TagClass<FederationComposer, "FederationComposer", {
  readonly compose: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError>;
  readonly validate: (config: FederationCompositionConfig) => Effect$1.Effect<FederationCompositionConfig, ValidationError>;
  readonly buildSchema: (composedConfig: ComposedConfiguration) => Effect$1.Effect<GraphQLSchema, CompositionError>;
}>;
declare class FederationComposer extends FederationComposer_base {}
interface ComposedConfiguration {
  readonly config: FederationCompositionConfig;
  readonly subgraphSchemas: ReadonlyArray<SubgraphSchemaInfo>;
  readonly metadata: SchemaMetadata;
}
interface SubgraphSchemaInfo {
  readonly service: ServiceDefinition;
  readonly sdl: string;
  readonly entities: ReadonlyArray<string>;
  readonly directives: ReadonlyArray<string>;
}
declare const FederationComposerLive: Layer.Layer<FederationComposer, effect_Cause0.UnknownException, never>;
declare const compose: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError | effect_Cause0.UnknownException, never>;
declare const validateConfig: (config: FederationCompositionConfig) => Effect$1.Effect<FederationCompositionConfig, ValidationError, FederationComposer>;
declare const handleCompositionError: (error: CompositionError) => string;
declare const createFederatedSchema: (config: FederationCompositionConfig) => Effect$1.Effect<FederatedSchema, CompositionError | effect_Cause0.UnknownException, never>;
//#endregion
//#region src/federation/entities/mesh.d.ts
/**
 * Mesh source types
 */
type MeshSourceType = 'openapi' | 'graphql' | 'grpc' | 'soap' | 'odata' | 'thrift' | 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'elasticsearch' | 'neo4j' | 'json-schema';
/**
 * Mesh source configuration
 */
interface MeshSource {
  /**
   * Source type
   */
  type: MeshSourceType;
  /**
   * Source name
   */
  name: string;
  /**
   * Source-specific configuration
   */
  config: Record<string, unknown>;
  /**
   * Transform configuration
   */
  transforms?: MeshTransform[];
  /**
   * Cache configuration
   */
  cache?: {
    /**
     * TTL in seconds
     */
    ttl?: number;
    /**
     * Invalidation rules
     */
    invalidate?: {
      /**
       * Time-based invalidation
       */
      ttl?: Duration.Duration;
      /**
       * Event-based invalidation
       */
      events?: string[];
    };
  };
}
/**
 * Mesh transformation types
 */
interface MeshTransform {
  /**
   * Transform type
   */
  type: 'rename' | 'filter' | 'prefix' | 'suffix' | 'encapsulate' | 'federation';
  /**
   * Transform configuration
   */
  config: Record<string, unknown>;
}
/**
 * Mesh integration configuration
 */
interface MeshIntegrationConfig {
  /**
   * Data sources
   */
  sources: MeshSource[];
  /**
   * Federation configuration
   */
  federation?: {
    /**
     * Federation entities
     */
    entities?: FederationEntity<unknown, unknown, unknown, unknown>[];
    /**
     * Federation services
     */
    services?: ServiceDefinition[];
    /**
     * Enable auto-federation
     */
    autoFederation?: boolean;
  };
  /**
   * Mesh configuration
   */
  mesh?: {
    /**
     * Enable playground
     */
    playground?: boolean;
    /**
     * Port
     */
    port?: number;
    /**
     * CORS configuration
     */
    cors?: {
      origin?: string | string[];
      credentials?: boolean;
    };
    /**
     * Rate limiting
     */
    rateLimit?: {
      max: number;
      window: Duration.Duration;
    };
  };
  /**
   * Plugins
   */
  plugins?: MeshPlugin[];
  /**
   * Error handling
   */
  errorHandling?: {
    /**
     * Mask errors in production
     */
    maskErrors?: boolean;
    /**
     * Custom error formatter
     */
    formatter?: (error: Error) => Record<string, unknown>;
  };
}
/**
 * Mesh plugin interface
 */
interface MeshPlugin {
  /**
   * Plugin name
   */
  name: string;
  /**
   * Plugin configuration
   */
  config?: Record<string, unknown>;
  /**
   * Plugin hooks
   */
  hooks?: {
    /**
     * Before request hook
     */
    beforeRequest?: (context: unknown) => Effect.Effect<void, Error>;
    /**
     * After request hook
     */
    afterRequest?: (context: unknown, result: unknown) => Effect.Effect<void, Error>;
    /**
     * On error hook
     */
    onError?: (error: Error) => Effect.Effect<void, never>;
  };
}
/**
 * Mesh runtime instance
 */
interface MeshInstance {
  /**
   * GraphQL schema
   */
  schema: GraphQLSchema;
  /**
   * Execute query
   */
  execute: (query: string, variables?: Record<string, unknown>) => Effect.Effect<unknown, Error>;
  /**
   * Get metrics
   */
  getMetrics: () => MeshMetrics;
  /**
   * Refresh sources
   */
  refresh: (sourceName?: string) => Effect.Effect<void, Error>;
  /**
   * Stop mesh
   */
  stop: () => Effect.Effect<void, never>;
}
/**
 * Mesh metrics
 */
interface MeshMetrics {
  /**
   * Total requests
   */
  requests: number;
  /**
   * Cache hits
   */
  cacheHits: number;
  /**
   * Cache misses
   */
  cacheMisses: number;
  /**
   * Average latency
   */
  avgLatency: number;
  /**
   * Source metrics
   */
  sources: Record<string, {
    requests: number;
    errors: number;
    avgLatency: number;
  }>;
}
/**
 * Mesh integration class
 */
declare class MeshIntegration {
  private readonly config;
  private readonly adapters;
  private schema;
  private readonly metrics;
  constructor(config: MeshIntegrationConfig);
  /**
   * Create mesh integration
   */
  static create(config: MeshIntegrationConfig): Promise<MeshInstance>;
  /**
   * Initialize mesh
   */
  private initialize;
  /**
   * Create adapter for source
   */
  private createAdapter;
  /**
   * Load and merge schemas
   */
  private loadSchemas;
  /**
   * Apply federation transforms
   */
  private applyFederationTransforms;
  /**
   * Execute query
   */
  private execute;
  /**
   * Determine source from query
   */
  private determineSource;
  /**
   * Update metrics
   */
  private updateMetrics;
  /**
   * Refresh sources
   */
  private refresh;
  /**
   * Start health monitoring
   */
  private startHealthMonitoring;
  /**
   * Stop mesh
   */
  private stop;
}
/**
 * Mesh presets
 */
declare const MeshPresets: {
  /**
   * Microservices preset
   */
  microservices: (services: Array<{
    name: string;
    url: string;
    type: "graphql" | "rest";
  }>) => MeshIntegrationConfig;
  /**
   * Database federation preset
   */
  databases: (databases: Array<{
    name: string;
    type: "postgres" | "mysql" | "mongodb";
    connection: string;
  }>) => MeshIntegrationConfig;
  /**
   * API gateway preset
   */
  apiGateway: (apis: Array<{
    name: string;
    spec: string;
  }>) => MeshIntegrationConfig;
};
/**
 * Mesh utilities
 */
declare const MeshUtils: {
  /**
   * Convert OpenAPI to GraphQL schema
   */
  openAPIToGraphQL: (_spec: string) => Effect.Effect<GraphQLSchema, Error>;
  /**
   * Convert proto to GraphQL schema
   */
  protoToGraphQL: (_proto: string) => Effect.Effect<GraphQLSchema, Error>;
  /**
   * Introspect database schema
   */
  introspectDatabase: (_connection: string) => Effect.Effect<GraphQLSchema, Error>;
};
declare namespace index_d_exports {
  export { FederationComposer, FederationComposerLive, MeshInstance, MeshIntegration, MeshIntegrationConfig, MeshMetrics, MeshPlugin, MeshPresets, MeshSource, MeshSourceType, MeshTransform, MeshUtils, RegistryConfig, SubgraphManagement, compose, createDynamicRegistry, createFederatedSchema, createMonitoredRegistry, createStaticRegistry, handleCompositionError, validateConfig };
}
//#endregion
export { FederationComposer, FederationComposerLive, MeshInstance, MeshIntegration, MeshIntegrationConfig, MeshMetrics, MeshPlugin, MeshPresets, MeshSource, MeshSourceType, MeshTransform, MeshUtils, compose, createFederatedSchema, handleCompositionError, index_d_exports, validateConfig };
//# sourceMappingURL=index-BM9c9kZb.d.ts.map