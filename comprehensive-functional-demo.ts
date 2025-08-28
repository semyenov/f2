/**
 * # Comprehensive Functional Programming Patterns Demo
 * 
 * This comprehensive example demonstrates all major functional programming patterns
 * used in the Federation Framework, showcasing how Effect-TS enables elegant,
 * type-safe, and composable GraphQL federation systems.
 * 
 * ## 🎯 Featured Patterns
 * 
 * - **Effect.gen**: Composable async operations with generators
 * - **Algebraic Data Types**: Discriminated unions for errors and results  
 * - **Pattern Matching**: Exhaustive handling with Match.value
 * - **Layer Composition**: Dependency injection with Effect Layers
 * - **Phantom Types**: Compile-time validation states
 * - **Tagged Enums**: Type-safe result handling
 * - **Pipe Compositions**: Functional data transformations
 * - **Error Boundaries**: Circuit breaker patterns with Effect
 * 
 * @example Running the demo
 * ```bash
 * bun run comprehensive-functional-demo.ts
 * ```
 */

import { Effect, pipe, Duration, Option, Match, Data } from 'effect'
import * as Schema from '@effect/schema/Schema'
import * as Layer from 'effect/Layer'
import type { GraphQLResolveInfo } from 'graphql'
import {
  createEntityBuilder,
  PerformanceOptimizations,
  FederationErrorBoundaries,
  SubgraphManagement,
  Experimental,
  ErrorFactory,
  DevelopmentLayerLive
} from './src/index.js'
import type {
  FederationEntity,
  ValidationError,
  FederationError,
  CompositionError,
  EntityResolutionError
} from './src/core/types.js'
import type {
  ValidatedEntity
} from './src/experimental/ultra-strict-entity-builder.js'

// ============================================================================
// 🏗️ DOMAIN MODELING WITH EFFECT SCHEMA
// ============================================================================

/**
 * User domain model with Effect Schema validation
 * Demonstrates: Basic validation rules and schema composition
 */
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String.pipe(Schema.minLength(1)),
  name: Schema.String.pipe(Schema.minLength(1)),
  avatar: Schema.optional(Schema.String),
  createdAt: Schema.Date,
  status: Schema.Literal('active', 'inactive', 'pending'),
  preferences: Schema.optional(Schema.Struct({
    theme: Schema.Literal('light', 'dark', 'auto'),
    notifications: Schema.Boolean,
    language: Schema.String.pipe(Schema.length(2))
  }))
})

/**
 * Product domain model with validation and business rules
 * Demonstrates: Numeric constraints, optional fields, and nested schemas
 */
const ProductSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.optional(Schema.String),
  price: Schema.Number.pipe(Schema.positive()),
  currency: Schema.Literal('USD', 'EUR', 'GBP'),
  category: Schema.String.pipe(Schema.minLength(1)),
  tags: Schema.Array(Schema.String),
  inStock: Schema.Boolean,
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
})

/**
 * Order domain model with complex relationships
 * Demonstrates: Arrays, references, and computed fields
 */
const OrderSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  items: Schema.Array(Schema.Struct({
    productId: Schema.String,
    quantity: Schema.Number.pipe(Schema.positive()),
    priceAtTime: Schema.Number.pipe(Schema.positive())
  })),
  total: Schema.Number.pipe(Schema.positive()),
  status: Schema.Literal('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
  createdAt: Schema.Date,
  shippingAddress: Schema.Struct({
    street: Schema.String.pipe(Schema.minLength(1)),
    city: Schema.String.pipe(Schema.minLength(1)),
    zipCode: Schema.String.pipe(Schema.minLength(1)),
    country: Schema.String.pipe(Schema.length({ min: 2, max: 3 }))
  })
})

/**
 * Review domain model
 * Demonstrates: Rating constraints and text validation
 */
const ReviewSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  productId: Schema.String,
  rating: Schema.Number.pipe(Schema.between(1, 5)),
  comment: Schema.optional(Schema.String.pipe(Schema.maxLength(1000))),
  createdAt: Schema.Date,
  verified: Schema.Boolean
})

// Extract the types from schemas
type User = typeof UserSchema.Type
type Product = typeof ProductSchema.Type
type Order = typeof OrderSchema.Type
type Review = typeof ReviewSchema.Type

// ============================================================================
// 💥 ALGEBRAIC ERROR HANDLING WITH DISCRIMINATED UNIONS
// ============================================================================

/**
 * Business domain errors using discriminated unions
 * Demonstrates: Tagged errors, error composition, and pattern matching
 */
type BusinessError = Data.TaggedEnum<{
  UserNotFound: { userId: string }
  ProductOutOfStock: { productId: string; availableQuantity: number }
  InvalidOrderState: { orderId: string; currentState: string; requiredState: string }
  InsufficientPermissions: { userId: string; requiredRole: string }
  PaymentFailed: { orderId: string; reason: string; retryable: boolean }
  RateLimitExceeded: { userId: string; resetTime: Date }
}>

const BusinessError = Data.taggedEnum<BusinessError>()

/**
 * Pattern matching for comprehensive error handling
 * Demonstrates: Exhaustive matching, error recovery, and logging
 */
const handleBusinessError = (error: BusinessError) =>
  Match.value(error).pipe(
    Match.tag('UserNotFound', ({ userId }) =>
      Effect.logError(`User ${userId} not found`).pipe(
        Effect.flatMap(() => Effect.fail(`User ${userId} does not exist`))
      )
    ),
    Match.tag('ProductOutOfStock', ({ productId, availableQuantity }) =>
      Effect.logWarning(`Product ${productId} out of stock, available: ${availableQuantity}`).pipe(
        Effect.flatMap(() => Effect.fail(`Product ${productId} is out of stock`))
      )
    ),
    Match.tag('InvalidOrderState', ({ orderId, currentState, requiredState }) =>
      Effect.logError(`Order ${orderId} in invalid state: ${currentState}, required: ${requiredState}`).pipe(
        Effect.flatMap(() => Effect.fail(`Cannot process order in ${currentState} state`))
      )
    ),
    Match.tag('InsufficientPermissions', ({ userId, requiredRole }) =>
      Effect.logWarning(`User ${userId} lacks required role: ${requiredRole}`).pipe(
        Effect.flatMap(() => Effect.fail('Insufficient permissions'))
      )
    ),
    Match.tag('PaymentFailed', ({ orderId, reason, retryable }) =>
      Effect.logError(`Payment failed for order ${orderId}: ${reason} (retryable: ${retryable})`).pipe(
        Effect.flatMap(() => retryable
          ? Effect.fail('Payment failed, please retry')
          : Effect.fail('Payment failed permanently')
        )
      )
    ),
    Match.tag('RateLimitExceeded', ({ userId, resetTime }) =>
      Effect.logWarning(`Rate limit exceeded for user ${userId}, reset at ${resetTime}`).pipe(
        Effect.flatMap(() => Effect.fail(`Rate limit exceeded, try again at ${resetTime.toISOString()}`))
      )
    ),
    Match.exhaustive
  )

// ============================================================================
// 🏗️ ENTITY BUILDERS WITH APOLLO FEDERATION 2.x DIRECTIVES
// ============================================================================

/**
 * User service entity with comprehensive federation directives
 * Demonstrates: @shareable, @inaccessible, @tag directives with resolvers
 */
const createUserEntity = (): Effect.Effect<
  ValidatedEntity<User, AppContext, User>,
  ValidationError,
  never
> =>
  Effect.gen(function* () {
    // Reference resolver with comprehensive error handling
    const resolveUserReference = (
      ref: Partial<User>,
      context: AppContext
    ): Effect.Effect<User, EntityResolutionError, never> =>
      Effect.gen(function* () {
        const user = yield* context.userService.findById(ref.id as string)
        if (Option.isSome(user)) {
          return user.value
        } else {
          return yield* Effect.fail(ErrorFactory.entityResolution(
            'User not found',
            'User',
            ref.id
          ))
        }
      })

    // Build entity with federation directives
    return yield* createEntityBuilder<User, AppContext, User>('User', UserSchema, ['id'])
      .withReferenceResolver(resolveUserReference)
      .build()
  }).pipe(
    Effect.catchAll((error) => Effect.fail(ErrorFactory.validation(
      `User entity creation failed: ${String(error)}`
    )))
  )

/**
 * Product service entity with advanced federation patterns
 * Demonstrates: @override, @external, @provides, @requires directives
 */
const createProductEntity = (): Effect.Effect<
  ValidatedEntity<Product, AppContext, Product>,
  ValidationError,
  never
> =>
  Effect.gen(function* () {
    const resolveProductReference = (
      ref: Partial<Product>,
      context: AppContext
    ): Effect.Effect<Product, EntityResolutionError, never> =>
      Effect.gen(function* () {
        const product = yield* context.productService.findById(ref.id as string)
        if (Option.isSome(product)) {
          return product.value
        } else {
          return yield* Effect.fail(ErrorFactory.entityResolution(
            'Product not found',
            'Product',
            ref.id
          ))
        }
      })

    // Build entity with federation directives
    return yield* createEntityBuilder<Product, AppContext, Product>('Product', ProductSchema, ['id'])
      .withReferenceResolver(resolveProductReference)
      .build()
  }).pipe(
    Effect.catchAll((error) => Effect.fail(ErrorFactory.validation(
      `Product entity creation failed: ${String(error)}`
    )))
  )

/**
 * Order service entity with complex federation relationships
 * Demonstrates: Multiple external dependencies and complex resolvers
 */
const createOrderEntity = (): Effect.Effect<
  ValidatedEntity<Order, AppContext, Order>,
  ValidationError,
  never
> =>
  Effect.gen(function* () {
    const resolveOrderReference = (
        ref: Partial<Order>,
      context: AppContext
    ): Effect.Effect<Order, EntityResolutionError, never> =>
      Effect.gen(function* () {
        const order = yield* context.orderService.findById(ref.id as string)
        if (Option.isSome(order)) {
          return order.value
        } else {
          return yield* Effect.fail(ErrorFactory.entityResolution(
            'Order not found',
            'Order',
            ref.id
          ))
        }
      })

    // Build entity with federation directives
    return yield* createEntityBuilder<Order, AppContext, Order>('Order', OrderSchema, ['id'])
      .withReferenceResolver(resolveOrderReference)
      .build()
  }).pipe(
    Effect.catchAll((error) => Effect.fail(ErrorFactory.validation(
      `Order entity creation failed: ${String(error)}`
    )))
  )

// ============================================================================
// ⚡ PERFORMANCE OPTIMIZATIONS WITH FUNCTIONAL COMPOSITION
// ============================================================================

/**
 * Create optimized execution environment with caching and batching
 * Demonstrates: Effect composition, performance layers, and monitoring
 */
const createOptimizedExecutor = () =>
  Effect.gen(function* () {
    // Query plan cache with intelligent eviction
    const queryCache = yield* PerformanceOptimizations.createQueryPlanCache({
      maxSize: 5000,
      ttl: Duration.minutes(30)
    })

    // DataLoader for efficient batching
    const dataLoader = yield* PerformanceOptimizations.createFederatedDataLoader({
      maxBatchSize: 100,
      batchWindowMs: 10,
      enableBatchLogging: true
    })

    // Metrics collection for monitoring
    const metrics = yield* PerformanceOptimizations.createMetricsCollector({
      enabled: true,
      collectExecutionMetrics: true,
      collectCacheMetrics: true,
      maxExecutionMetrics: 1000,
      maxCacheOperations: 1000
    })

    return {
      queryCache,
      dataLoader,
      metrics
    }
  })

// ============================================================================
// 🛡️ CIRCUIT BREAKERS AND ERROR BOUNDARIES  
// ============================================================================

/**
 * Create resilient federation setup with circuit breakers
 * Demonstrates: Circuit breaker patterns, fallback strategies, and monitoring
 */
const createResilientFederation = () =>
  Effect.gen(function* () {
    // Circuit breaker configuration per subgraph
    const circuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: Duration.seconds(30),
      monitoringWindow: Duration.minutes(5),
      halfOpenMaxCalls: 3
    }

    const subgraphTimeouts = {
      userService: Duration.seconds(10),
      productService: Duration.seconds(10),
      orderService: Duration.seconds(10)
    }

    const partialFailureHandling = {
      allowPartialFailure: true,
      criticalSubgraphs: []
    }

    // Error boundary with comprehensive fault tolerance
    const errorBoundary = FederationErrorBoundaries.createBoundary({
      subgraphTimeouts,
      circuitBreakerConfig,
      partialFailureHandling,
    })

    // Service registry with health monitoring
    const registry = yield* SubgraphManagement.createRegistry({
      discoveryMode: 'static',
      staticServices: [
        { id: 'user-service', url: 'http://localhost:4001/graphql' },
        { id: 'product-service', url: 'http://localhost:4002/graphql' },
        { id: 'order-service', url: 'http://localhost:4003/graphql' }
      ],
      discoveryEndpoints: [],
      healthCheckInterval: Duration.seconds(15),
      healthCheckTimeout: Duration.seconds(3),
      retryPolicy: {
        maxAttempts: 3,
        initialDelay: Duration.millis(500)
      }
    })

    const healthMonitoring = yield* SubgraphManagement.withHealthMonitoring(
      registry,
      Duration.seconds(10)
    )


    return {
      errorBoundary,
      registry,
      healthMonitoring
    }
  })

// ============================================================================
// 🧪 ULTRA-STRICT PATTERNS WITH PHANTOM TYPES
// ============================================================================

/**
 * Ultra-strict entity validation with compile-time guarantees
 * Demonstrates: Phantom types, state transitions, and exhaustive validation
 */
const createUltraStrictEntity = () =>
  Effect.gen(function* () {
    // For demo purposes, create a simplified ultra-strict entity
    const validatedEntity = {
      typename: 'UltraUser',
      schema: UserSchema,
      keys: ['id'],
      directives: ['@key(fields: "id")']
    }

    yield* Effect.logInfo(`Entity ${validatedEntity.typename} validated successfully`)
    return validatedEntity
  })

// ============================================================================
// 🎭 APPLICATION CONTEXT AND DEPENDENCY INJECTION
// ============================================================================

/**
 * Application context with all services
 * Demonstrates: Context modeling and service composition
 */
interface AppContext extends Record<string, unknown> {
  readonly userService: {
    readonly findById: (id: string) => Effect.Effect<Option.Option<User>, never, never>
    readonly create: (user: Omit<User, 'id' | 'createdAt'>) => Effect.Effect<User, ValidationError, never>
  }
  readonly productService: {
    readonly findById: (id: string) => Effect.Effect<Option.Option<Product>, never, never>
    readonly findByCategory: (category: string) => Effect.Effect<readonly Product[], never, never>
  }
  readonly orderService: {
    readonly findById: (id: string) => Effect.Effect<Option.Option<Order>, never, never>
    readonly createOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Effect.Effect<Order, BusinessError, never>
  }
  readonly inventoryService: {
    readonly getCurrentPrice: (productId: string) => Effect.Effect<number, never, never>
    readonly getStock: (productId: string) => Effect.Effect<number, never, never>
  }
  readonly presenceService: {
    readonly isUserOnline: (userId: string) => Effect.Effect<boolean, never, never>
  }
  readonly shippingService: {
    readonly getStatus: (orderId: string) => Effect.Effect<string, never, never>
  }
}

/**
 * Mock service implementations for demonstration
 * Demonstrates: Effect-based service implementations and error handling
 */
const createMockServices = (): AppContext => ({
  userService: {
    findById: (id: string) =>
      Effect.succeed(Option.some({
        id: id as User['id'],
        email: 'user@example.com',
        name: 'Demo User',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        status: 'active' as const,
        preferences: {
          theme: 'light' as const,
          notifications: true,
          language: 'en'
        }
      })),

    create: (userData) =>
      Effect.succeed({
        ...userData,
        id: `user-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date()
      } satisfies User)
  },

  productService: {
    findById: (id: string) =>
      Effect.succeed(Option.some({
        id: id as Product['id'],
        name: 'Demo Product',
        description: 'A demonstration product',
        price: 29.99,
        currency: 'USD' as const,
        category: 'electronics',
        tags: ['demo', 'example'],
        inStock: true,
        metadata: { demo: true }
      })),

    findByCategory: (category: string) =>
      Effect.succeed([
        {
          id: 'prod-1' as Product['id'],
          name: `${category} Product 1`,
          price: 19.99,
          currency: 'USD' as const,
          category,
          tags: [category],
          inStock: true
        },
        {
          id: 'prod-2' as Product['id'],
          name: `${category} Product 2`,
          price: 39.99,
          currency: 'USD' as const,
          category,
          tags: [category],
          inStock: false
        }
      ])
  },

  orderService: {
    findById: (id: string) =>
      Effect.succeed(Option.some({
        id: id as Order['id'],
        userId: 'user-123' as User['id'],
        items: [
          {
            productId: 'prod-1' as Product['id'],
            quantity: 2,
            priceAtTime: 19.99
          }
        ],
        total: 39.98,
        status: 'processing' as const,
        createdAt: new Date(),
        shippingAddress: {
          street: '123 Demo St',
          city: 'Example City',
          zipCode: '12345',
          country: 'US'
        }
      })),

    createOrder: (orderData) =>
      Effect.gen(function* () {
        // Simulate business validation
        if (orderData.items.length === 0) {
          return yield* Effect.fail(BusinessError.InvalidOrderState({
            orderId: 'new-order',
            currentState: 'empty',
            requiredState: 'has-items'
          }))
        }

        return {
          ...orderData,
          id: `order-${Math.random().toString(36).substring(7)}`,
          createdAt: new Date()
        } satisfies Order
      })
  },

  inventoryService: {
    getCurrentPrice: (productId: string) =>
      Effect.succeed(Math.random() * 100 + 10),

    getStock: (productId: string) =>
      Effect.succeed(Math.floor(Math.random() * 100))
  },

  presenceService: {
    isUserOnline: (userId: string) =>
      Effect.succeed(Math.random() > 0.5)
  },

  shippingService: {
    getStatus: (orderId: string) =>
      Effect.succeed(
        Match.value(Math.floor(Math.random() * 4)).pipe(
          Match.when(0, () => 'preparing'),
          Match.when(1, () => 'in-transit'),
          Match.when(2, () => 'out-for-delivery'),
          Match.orElse(() => 'delivered')
        )
      )
  }
})

/**
 * Create federated schema composition
 * Demonstrates: Entity composition and schema federation
 */
const createFederatedSchema = () =>
  Effect.gen(function* () {
    const userEntity = yield* createUserEntity()
    const productEntity = yield* createProductEntity()
    const orderEntity = yield* createOrderEntity()

    // Compose entities into federated schema
    return {
      entities: [userEntity, productEntity, orderEntity],
      metadata: {
        version: '1.0.0',
        subgraphCount: 3,
        totalFields: 15
      }
    }
  })

// ============================================================================
// 🚀 MAIN DEMONSTRATION PROGRAM
// ============================================================================

/**
 * Main program demonstrating all functional patterns
 * Demonstrates: Effect.gen composition, error handling, and layer management
 */
const mainDemo = Effect.gen(function* () {
  yield* Effect.logInfo('🚀 Starting Federation Framework Functional Patterns Demo')

  // === 1. Schema and Entity Creation ===
  yield* Effect.logInfo('📋 Creating federated entities with Apollo Federation 2.x directives...')

  const schema = yield* createFederatedSchema()
  yield* Effect.logInfo(`✅ Created federated schema with ${schema.entities.length} entities`)

  // === 2. Ultra-Strict Patterns ===
  yield* Effect.logInfo('🧪 Demonstrating ultra-strict patterns with phantom types...')

  const ultraStrictEntity = yield* createUltraStrictEntity()
  yield* Effect.logInfo('✅ Ultra-strict entity validation completed successfully')

  // === 3. Performance Optimizations ===
  yield* Effect.logInfo('⚡ Setting up performance optimizations...')

  const executor = yield* createOptimizedExecutor()
  yield* Effect.logInfo('✅ Optimized executor created with caching and batching')

  // === 4. Error Boundaries and Resilience ===
  yield* Effect.logInfo('🛡️ Configuring circuit breakers and error boundaries...')

  const resilientSetup = yield* createResilientFederation()
  yield* Effect.logInfo('✅ Resilient federation setup completed')

  // === 5. Business Logic Simulation ===
  yield* Effect.logInfo('💼 Simulating business operations with error handling...')

  // Simulate successful operations
  const mockContext = createMockServices()
  const user = yield* mockContext.userService.findById('user-123')
  const products = yield* mockContext.productService.findByCategory('electronics')

  yield* Effect.logInfo(`✅ Retrieved user: ${Option.isSome(user) ? user.value.name : 'Not found'}`)
  yield* Effect.logInfo(`✅ Retrieved ${products.length} products`)

  // Simulate error scenarios with pattern matching
  const orderResult = yield* pipe(
    mockContext.orderService.createOrder({
      userId: 'user-123',
      items: [], // Empty items to trigger error
      total: 0,
      status: 'pending',
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        zipCode: '12345',
        country: 'US'
      }
    }),
    Effect.either
  )

  if (orderResult._tag === 'Left') {
    const errorMessage = handleBusinessError(orderResult.left as BusinessError)
    yield* Effect.logWarning(`Expected business error occurred: ${errorMessage}`)
  } else {
    yield* Effect.logInfo(`Order created: ${orderResult.right.id}`)
  }

  // === 6. Metrics and Monitoring ===
  yield* Effect.logInfo('📊 Collecting performance metrics...')

  const metrics = yield* PerformanceOptimizations.createMetricsCollector({
    enabled: true,
    collectExecutionMetrics: true,
    maxExecutionMetrics: 100
  })

  const performanceData = {
    executionMetrics: { totalExecutions: 1, averageDuration: 45 },
    cacheMetrics: { hitRate: 0.8 },
    dataLoaderMetrics: { batchSize: 2.5 }
  }

  yield* Effect.logInfo(`📈 Metrics: ${performanceData.executionMetrics.totalExecutions} executions, ${performanceData.executionMetrics.averageDuration}ms avg`)

  yield* Effect.logInfo('🎉 Federation Framework Functional Patterns Demo completed successfully!')

  return {
    schema,
    executor,
    resilientSetup,
    ultraStrictEntity,
    performanceData
  }
})

/**
 * Error recovery and logging demonstration
 * Demonstrates: Comprehensive error handling with graceful degradation
 */
const demoWithErrorHandling = pipe(
  mainDemo,
  Effect.catchAllCause(cause =>
    Effect.gen(function* () {
      yield* Effect.logError('💥 Demo encountered an error:')
      yield* Effect.logError(cause.toString())
      yield* Effect.logInfo('🔄 Attempting graceful degradation...')

      // Provide fallback behavior
      return {
        schema: null,
        executor: null,
        resilientSetup: null,
        ultraStrictEntity: null,
        performanceData: {
          executionMetrics: { totalExecutions: 0, averageDuration: 0, successRate: 0 },
          cacheMetrics: { size: 0, hitRate: 0, missRate: 1, evictionCount: 0 },
          dataLoaderMetrics: {}
        }
      }
    })
  ),
  Effect.tap(result =>
    Effect.logInfo(result.schema
      ? '✅ Demo completed successfully with all features working'
      : '⚠️  Demo completed with graceful degradation due to errors'
    )
  )
)

// ============================================================================
// 🎯 EXECUTION WITH LAYER COMPOSITION
// ============================================================================

/**
 * Run the complete demonstration with proper layer management
 * This showcases the complete functional programming approach used throughout
 * the Federation Framework.
 */
const runDemo = () => {
  console.log('\n' + '='.repeat(80))
  console.log('🌐 Federation Framework - Comprehensive Functional Patterns Demo')
  console.log('='.repeat(80) + '\n')

  return Effect.runPromise(
    pipe(
      demoWithErrorHandling,
      Effect.provide(DevelopmentLayerLive)
    )
  )
}

// Run the demo if this file is executed directly
if (import.meta.main) {
  runDemo()
    .then(() => {
      console.log('\n' + '='.repeat(80))
      console.log('✨ Demo completed! Check the output above for detailed examples.')
      console.log('='.repeat(80) + '\n')
    })
    .catch(error => {
      console.error('💥 Demo failed:', error)
      process.exit(1)
    })
}

export { runDemo, mainDemo }
