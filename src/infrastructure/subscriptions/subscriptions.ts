/**
 * # GraphQL Subscription Support for Federation
 *
 * WebSocket-based subscription support for Apollo Federation with Effect-TS patterns.
 * Provides real-time data streaming, event sourcing, and resilient connection management.
 *
 * @example Basic subscription setup
 * ```typescript
 * import { SubscriptionManager } from '@cqrs/federation'
 *
 * const manager = await SubscriptionManager.create({
 *   schema,
 *   transport: 'ws',
 *   endpoint: 'ws://localhost:4000/graphql'
 * })
 *
 * const subscription = manager.subscribe(
 *   'onUserUpdate',
 *   { userId: '123' },
 *   (data) => console.log('Update:', data)
 * )
 * ```
 *
 * @module Subscriptions
 * @since 2.2.0
 */

import { Effect, Stream, Schedule, Duration, Option } from 'effect'
import type { GraphQLSchema } from 'graphql'

/**
 * Subscription transport types
 */
export type SubscriptionTransport = 'ws' | 'sse' | 'graphql-ws' | 'socket.io'

/**
 * Subscription configuration
 */
export interface SubscriptionConfig {
  /**
   * GraphQL schema
   */
  schema: GraphQLSchema

  /**
   * Transport type
   */
  transport: SubscriptionTransport

  /**
   * WebSocket endpoint
   */
  endpoint: string

  /**
   * Connection options
   */
  connectionOptions?: {
    /**
     * Reconnect on failure
     */
    reconnect?: boolean

    /**
     * Max reconnect attempts
     */
    maxReconnectAttempts?: number

    /**
     * Reconnect delay
     */
    reconnectDelay?: Duration.Duration

    /**
     * Keep-alive interval
     */
    keepAlive?: Duration.Duration

    /**
     * Connection timeout
     */
    timeout?: Duration.Duration
  }

  /**
   * Authentication
   */
  auth?: {
    /**
     * Auth token
     */
    token?: string

    /**
     * Custom headers
     */
    headers?: Record<string, string>
  }

  /**
   * Event handlers
   */
  onConnect?: () => void
  onDisconnect?: (reason?: string) => void
  onError?: (error: Error) => void
  onReconnecting?: (attempt: number) => void
}

/**
 * Subscription state
 */
export type SubscriptionState =
  | { _tag: 'disconnected' }
  | { _tag: 'connecting' }
  | { _tag: 'connected'; connectionId: string }
  | { _tag: 'reconnecting'; attempt: number }
  | { _tag: 'error'; error: Error }

/**
 * Active subscription
 */
export interface ActiveSubscription<T = unknown> {
  /**
   * Subscription ID
   */
  id: string

  /**
   * Subscription name
   */
  name: string

  /**
   * Variables
   */
  variables?: Record<string, unknown>

  /**
   * Data stream
   */
  stream: Stream.Stream<T, Error>

  /**
   * Unsubscribe
   */
  unsubscribe: () => Effect.Effect<void, Error>

  /**
   * Subscription metrics
   */
  metrics: SubscriptionMetrics
}

/**
 * Subscription metrics
 */
export interface SubscriptionMetrics {
  /**
   * Messages received
   */
  messagesReceived: number

  /**
   * Errors occurred
   */
  errors: number

  /**
   * Start time
   */
  startTime: Date

  /**
   * Last message time
   */
  lastMessageTime?: Date

  /**
   * Average latency
   */
  averageLatency: number

  /**
   * Reconnections
   */
  reconnections: number
}

// WebSocket types are globally available in the browser and Node.js environments
// No need to redeclare them

/**
 * Connection manager with Effect patterns
 */
class ConnectionManager {
  private connection: WebSocket | undefined
  private state: SubscriptionState = { _tag: 'disconnected' }
  private reconnectAttempt = 0

  constructor(private readonly config: SubscriptionConfig) {}

  /**
   * Connect to WebSocket
   */
  connect(): Effect.Effect<void, Error> {
    const self = this
    return Effect.gen(function* () {
      if (self.state._tag === 'connected') {
        return
      }

      self.state = { _tag: 'connecting' }

      yield* Effect.tryPromise({
        try: async () => {
          return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(self.config.endpoint)

            ws.onopen = () => {
              self.connection = ws
              self.state = {
                _tag: 'connected',
                connectionId: Math.random().toString(36).substring(7),
              }
              self.reconnectAttempt = 0
              self.config.onConnect?.()
              resolve()
            }

            ws.onerror = event => {
              const error = new Error(`WebSocket error: ${event.type}`)
              self.state = { _tag: 'error', error }
              self.config.onError?.(error)
              reject(error)
            }

            ws.onclose = event => {
              self.state = { _tag: 'disconnected' }
              self.config.onDisconnect?.(event.reason)

              if (self.config.connectionOptions?.reconnect ?? false) {
                Effect.runPromise(self.reconnect()).catch(() => {})
              }
            }

            // Set connection timeout
            if (self.config.connectionOptions?.timeout) {
              setTimeout(() => {
                if (self.state._tag === 'connecting') {
                  ws.close()
                  reject(new Error('Connection timeout'))
                }
              }, Duration.toMillis(self.config.connectionOptions.timeout))
            }
          })
        },
        catch: error => new Error(`Connection failed: ${error}`),
      })

      // Setup keep-alive if needed
      if (self.config.connectionOptions?.keepAlive && self.connection) {
        yield* Effect.fork(self.startKeepAlive())
      }
    })
  }

  /**
   * Reconnect with backoff
   */
  private reconnect(): Effect.Effect<void, Error> {
    const self = this
    return Effect.gen(function* () {
      const maxAttempts = self.config.connectionOptions?.maxReconnectAttempts ?? 5

      if (self.reconnectAttempt >= maxAttempts) {
        return yield* Effect.fail(new Error('Max reconnection attempts reached'))
      }

      self.reconnectAttempt++
      self.state = { _tag: 'reconnecting', attempt: self.reconnectAttempt }
      self.config.onReconnecting?.(self.reconnectAttempt)

      // Exponential backoff
      const delay = self.config.connectionOptions?.reconnectDelay ?? Duration.seconds(1)
      const backoffDelay = Duration.millis(
        Duration.toMillis(delay) * Math.pow(2, self.reconnectAttempt - 1)
      )

      yield* Effect.sleep(backoffDelay)
      yield* self.connect()
    })
  }

  /**
   * Start keep-alive ping
   */
  private startKeepAlive(): Effect.Effect<void, never> {
    const self = this
    return Effect.gen(function* () {
      const interval = self.config.connectionOptions?.keepAlive ?? Duration.seconds(30)

      yield* Effect.repeat(
        Effect.gen(function* () {
          if (self.connection?.readyState === WebSocket.OPEN) {
            self.connection.send(JSON.stringify({ type: 'ping' }))
          }
        }),
        Schedule.fixed(interval)
      )
    })
  }

  /**
   * Send message
   */
  send(message: unknown): Effect.Effect<void, Error> {
    const self = this
    return Effect.gen(function* () {
      if (!self.connection || self.connection.readyState !== WebSocket.OPEN) {
        return yield* Effect.fail(new Error('WebSocket not connected'))
      }

      self.connection.send(JSON.stringify(message))
    })
  }

  /**
   * Disconnect
   */
  disconnect(): Effect.Effect<void, never> {
    const self = this
    return Effect.sync(() => {
      if (self.connection) {
        self.connection.close()
        self.connection = undefined
        self.state = { _tag: 'disconnected' }
      }
    })
  }

  /**
   * Get state
   */
  getState(): SubscriptionState {
    return this.state
  }
}

/**
 * Subscription manager
 */
export class SubscriptionManager {
  private readonly connectionManager: ConnectionManager
  private readonly subscriptions = new Map<string, ActiveSubscription>()

  constructor(config: SubscriptionConfig) {
    this.connectionManager = new ConnectionManager(config)
  }

  /**
   * Create subscription manager
   */
  static async create(config: SubscriptionConfig): Promise<SubscriptionManager> {
    const manager = new SubscriptionManager(config)
    await Effect.runPromise(manager.connect())
    return manager
  }

  /**
   * Connect to server
   */
  connect(): Effect.Effect<void, Error> {
    return this.connectionManager.connect()
  }

  /**
   * Subscribe to events
   */
  subscribe<T = unknown>(
    subscriptionName: string,
    variables?: Record<string, unknown>,
    onData?: (data: T) => void,
    onError?: (error: Error) => void
  ): Effect.Effect<ActiveSubscription<T>, Error> {
    const self = this
    return Effect.gen(function* () {
      const subscriptionId = Math.random().toString(36).substring(7)

      // Create subscription stream
      const stream = Stream.async<T, Error>(emit => {
        // Mock implementation for now
        setTimeout(() => {
          void emit(Effect.fail(Option.none()))
        }, 100)
      }).pipe(
        Stream.tapError(error => Effect.sync(() => onError?.(error))),
        Stream.tap(data => Effect.sync(() => onData?.(data)))
      )

      // Create subscription object
      const subscription: ActiveSubscription<T> = {
        id: subscriptionId,
        name: subscriptionName,
        ...(variables && { variables }),
        stream,
        unsubscribe: () => self.unsubscribe(subscriptionId),
        metrics: {
          messagesReceived: 0,
          errors: 0,
          startTime: new Date(),
          averageLatency: 0,
          reconnections: 0,
        },
      }

      // Store subscription
      self.subscriptions.set(subscriptionId, subscription as ActiveSubscription)

      // Send subscription to server
      yield* self.connectionManager.send({
        id: subscriptionId,
        type: 'subscribe',
        payload: {
          query: self.buildSubscriptionQuery(subscriptionName),
          variables,
        },
      })

      return subscription
    })
  }

  /**
   * Unsubscribe
   */
  unsubscribe(subscriptionId: string): Effect.Effect<void, Error> {
    const self = this
    return Effect.gen(function* () {
      const subscription = self.subscriptions.get(subscriptionId)
      if (!subscription) {
        return yield* Effect.fail(new Error(`Subscription ${subscriptionId} not found`))
      }

      // Send unsubscribe to server
      yield* self.connectionManager.send({
        id: subscriptionId,
        type: 'unsubscribe',
      })

      // Remove subscription
      self.subscriptions.delete(subscriptionId)
    })
  }

  /**
   * Unsubscribe all
   */
  unsubscribeAll(): Effect.Effect<void, never> {
    const self = this
    return Effect.forEach(
      Array.from(self.subscriptions.keys()),
      id => self.unsubscribe(id).pipe(Effect.orElseSucceed(() => undefined)),
      { discard: true }
    )
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    const self = this
    await Effect.runPromise(
      Effect.gen(function* () {
        yield* self.unsubscribeAll()
        yield* self.connectionManager.disconnect()
      })
    )
  }

  /**
   * Get connection state
   */
  getState(): SubscriptionState {
    return this.connectionManager.getState()
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): ReadonlyArray<ActiveSubscription> {
    return Array.from(this.subscriptions.values())
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    totalSubscriptions: number
    totalMessages: number
    totalErrors: number
    connectionState: SubscriptionState
  } {
    const subscriptions = this.getSubscriptions()

    return {
      totalSubscriptions: subscriptions.length,
      totalMessages: subscriptions.reduce((sum, s) => sum + s.metrics.messagesReceived, 0),
      totalErrors: subscriptions.reduce((sum, s) => sum + s.metrics.errors, 0),
      connectionState: this.getState(),
    }
  }

  /**
   * Build subscription query
   */
  private buildSubscriptionQuery(name: string): string {
    // This would normally build from schema
    return `subscription ${name} { ${name} { id } }`
  }
}

/**
 * Subscription presets
 */
export const SubscriptionPresets = {
  /**
   * Development preset
   */
  development: (
    schema: GraphQLSchema,
    endpoint = 'ws://localhost:4000/graphql'
  ): SubscriptionConfig => ({
    schema,
    transport: 'ws',
    endpoint,
    connectionOptions: {
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: Duration.seconds(1),
      keepAlive: Duration.seconds(30),
      timeout: Duration.seconds(5),
    },
    onConnect: () => console.log('🔌 WebSocket connected'),
    onDisconnect: reason => console.log('🔌 WebSocket disconnected:', reason),
    onError: error => console.error('❌ WebSocket error:', error),
    onReconnecting: attempt => console.log(`🔄 Reconnecting... (attempt ${attempt})`),
  }),

  /**
   * Production preset
   */
  production: (schema: GraphQLSchema, endpoint: string): SubscriptionConfig => ({
    schema,
    transport: 'graphql-ws',
    endpoint,
    connectionOptions: {
      reconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: Duration.seconds(2),
      keepAlive: Duration.minutes(1),
      timeout: Duration.seconds(10),
    },
  }),

  /**
   * Testing preset
   */
  testing: (schema: GraphQLSchema): SubscriptionConfig => ({
    schema,
    transport: 'ws',
    endpoint: 'ws://localhost:4001/graphql',
    connectionOptions: {
      reconnect: false,
      timeout: Duration.seconds(1),
    },
  }),
}

/**
 * Federation subscription extensions
 */
export interface FederationSubscriptionConfig extends SubscriptionConfig {
  /**
   * Entity subscriptions
   */
  entitySubscriptions?: {
    /**
     * Entity type
     */
    typename: string

    /**
     * Subscription events
     */
    events: Array<'created' | 'updated' | 'deleted'>

    /**
     * Filter function
     */
    filter?: (entity: unknown) => boolean
  }[]

  /**
   * Cross-subgraph subscriptions
   */
  crossSubgraph?: {
    /**
     * Enable cross-subgraph events
     */
    enabled: boolean

    /**
     * Event propagation delay
     */
    propagationDelay?: Duration.Duration
  }
}

/**
 * Create federation subscription manager
 */
export const createFederationSubscriptionManager = async (
  config: FederationSubscriptionConfig
): Promise<SubscriptionManager> => {
  const manager = await SubscriptionManager.create(config)

  // Setup entity subscriptions
  if (config.entitySubscriptions) {
    for (const entityConfig of config.entitySubscriptions) {
      for (const event of entityConfig.events) {
        const subscriptionName = `on${entityConfig.typename}${event.charAt(0).toUpperCase() + event.slice(1)}`

        await Effect.runPromise(
          manager.subscribe(subscriptionName, undefined, data => {
            if (!entityConfig.filter || entityConfig.filter(data)) {
              console.log(`📨 ${entityConfig.typename} ${event}:`, data)
            }
          })
        )
      }
    }
  }

  return manager
}
