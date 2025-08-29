import { CacheOperation, CacheStats, CachedQueryPlan, DataLoaderStats, ErrorBoundary, ErrorContext, ExecutionContext, ExecutionError, ExecutionMetrics, FederatedDataLoader, FederationErrorBoundaries, GraphQLResolver, MetricsCollector, OptimizedExecutor, PerformanceMetrics, PerformanceOptimizations, ProcessedResults, QueryPlan, QueryPlanCache, QueryStep, SubgraphCall, SubgraphResult, SubgraphResults, TransformedError, createBasicOptimizedExecutor, createDevelopmentOptimizedExecutor, createProductionBoundary, createProductionOptimizedExecutor, createResilientBoundary, createStrictBoundary } from "./performance-zrAYPIlq.js";
import { Duration, Effect, Stream } from "effect";
import { GraphQLSchema } from "graphql";

//#region src/infrastructure/subscriptions/subscriptions.d.ts

/**
 * Subscription transport types
 */
type SubscriptionTransport = 'ws' | 'sse' | 'graphql-ws' | 'socket.io';
/**
 * Subscription configuration
 */
interface SubscriptionConfig {
  /**
   * GraphQL schema
   */
  schema: GraphQLSchema;
  /**
   * Transport type
   */
  transport: SubscriptionTransport;
  /**
   * WebSocket endpoint
   */
  endpoint: string;
  /**
   * Connection options
   */
  connectionOptions?: {
    /**
     * Reconnect on failure
     */
    reconnect?: boolean;
    /**
     * Max reconnect attempts
     */
    maxReconnectAttempts?: number;
    /**
     * Reconnect delay
     */
    reconnectDelay?: Duration.Duration;
    /**
     * Keep-alive interval
     */
    keepAlive?: Duration.Duration;
    /**
     * Connection timeout
     */
    timeout?: Duration.Duration;
  };
  /**
   * Authentication
   */
  auth?: {
    /**
     * Auth token
     */
    token?: string;
    /**
     * Custom headers
     */
    headers?: Record<string, string>;
  };
  /**
   * Event handlers
   */
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
}
/**
 * Subscription state
 */
type SubscriptionState = {
  _tag: 'disconnected';
} | {
  _tag: 'connecting';
} | {
  _tag: 'connected';
  connectionId: string;
} | {
  _tag: 'reconnecting';
  attempt: number;
} | {
  _tag: 'error';
  error: Error;
};
/**
 * Active subscription
 */
interface ActiveSubscription<T = unknown> {
  /**
   * Subscription ID
   */
  id: string;
  /**
   * Subscription name
   */
  name: string;
  /**
   * Variables
   */
  variables?: Record<string, unknown>;
  /**
   * Data stream
   */
  stream: Stream.Stream<T, Error>;
  /**
   * Unsubscribe
   */
  unsubscribe: () => Effect.Effect<void, Error>;
  /**
   * Subscription metrics
   */
  metrics: SubscriptionMetrics;
}
/**
 * Subscription metrics
 */
interface SubscriptionMetrics {
  /**
   * Messages received
   */
  messagesReceived: number;
  /**
   * Errors occurred
   */
  errors: number;
  /**
   * Start time
   */
  startTime: Date;
  /**
   * Last message time
   */
  lastMessageTime?: Date;
  /**
   * Average latency
   */
  averageLatency: number;
  /**
   * Reconnections
   */
  reconnections: number;
}
/**
 * Subscription manager
 */
declare class SubscriptionManager {
  private readonly connectionManager;
  private readonly subscriptions;
  constructor(config: SubscriptionConfig);
  /**
   * Create subscription manager
   */
  static create(config: SubscriptionConfig): Promise<SubscriptionManager>;
  /**
   * Connect to server
   */
  connect(): Effect.Effect<void, Error>;
  /**
   * Subscribe to events
   */
  subscribe<T = unknown>(subscriptionName: string, variables?: Record<string, unknown>, onData?: (data: T) => void, onError?: (error: Error) => void): Effect.Effect<ActiveSubscription<T>, Error>;
  /**
   * Unsubscribe
   */
  unsubscribe(subscriptionId: string): Effect.Effect<void, Error>;
  /**
   * Unsubscribe all
   */
  unsubscribeAll(): Effect.Effect<void, never>;
  /**
   * Disconnect
   */
  disconnect(): Promise<void>;
  /**
   * Get connection state
   */
  getState(): SubscriptionState;
  /**
   * Get active subscriptions
   */
  getSubscriptions(): ReadonlyArray<ActiveSubscription>;
  /**
   * Get metrics
   */
  getMetrics(): {
    totalSubscriptions: number;
    totalMessages: number;
    totalErrors: number;
    connectionState: SubscriptionState;
  };
  /**
   * Build subscription query
   */
  private buildSubscriptionQuery;
}
/**
 * Subscription presets
 */
declare const SubscriptionPresets: {
  /**
   * Development preset
   */
  development: (schema: GraphQLSchema, endpoint?: string) => SubscriptionConfig;
  /**
   * Production preset
   */
  production: (schema: GraphQLSchema, endpoint: string) => SubscriptionConfig;
  /**
   * Testing preset
   */
  testing: (schema: GraphQLSchema) => SubscriptionConfig;
};
/**
 * Federation subscription extensions
 */
interface FederationSubscriptionConfig extends SubscriptionConfig {
  /**
   * Entity subscriptions
   */
  entitySubscriptions?: {
    /**
     * Entity type
     */
    typename: string;
    /**
     * Subscription events
     */
    events: Array<'created' | 'updated' | 'deleted'>;
    /**
     * Filter function
     */
    filter?: (entity: unknown) => boolean;
  }[];
  /**
   * Cross-subgraph subscriptions
   */
  crossSubgraph?: {
    /**
     * Enable cross-subgraph events
     */
    enabled: boolean;
    /**
     * Event propagation delay
     */
    propagationDelay?: Duration.Duration;
  };
}
/**
 * Create federation subscription manager
 */
declare const createFederationSubscriptionManager: (config: FederationSubscriptionConfig) => Promise<SubscriptionManager>;
declare namespace index_d_exports {
  export { ActiveSubscription, CacheOperation, CacheStats, CachedQueryPlan, DataLoaderStats, ErrorBoundary, ErrorContext, ExecutionContext, ExecutionError, ExecutionMetrics, FederatedDataLoader, FederationErrorBoundaries, FederationSubscriptionConfig, GraphQLResolver, MetricsCollector, OptimizedExecutor, PerformanceMetrics, PerformanceOptimizations, ProcessedResults, QueryPlan, QueryPlanCache, QueryStep, SubgraphCall, SubgraphResult, SubgraphResults, SubscriptionConfig, SubscriptionManager, SubscriptionMetrics, SubscriptionPresets, SubscriptionState, SubscriptionTransport, TransformedError, createBasicOptimizedExecutor, createDevelopmentOptimizedExecutor, createFederationSubscriptionManager, createProductionBoundary, createProductionOptimizedExecutor, createResilientBoundary, createStrictBoundary };
}
//#endregion
export { ActiveSubscription, FederationSubscriptionConfig, SubscriptionConfig, SubscriptionManager, SubscriptionMetrics, SubscriptionPresets, SubscriptionState, SubscriptionTransport, createFederationSubscriptionManager, index_d_exports };
//# sourceMappingURL=index-B2PyH56_.d.ts.map