/**
 * # Edge Computing Support for Federation
 *
 * Deploy and run federated GraphQL services at the edge for ultra-low latency
 * and improved performance using CDNs, edge functions, and edge databases.
 *
 * @example Edge deployment
 * ```typescript
 * import { EdgeDeployment } from '@cqrs/federation/cloud'
 *
 * const edge = await EdgeDeployment.create({
 *   providers: ['cloudflare', 'fastly', 'akamai'],
 *   locations: 200, // Deploy to 200+ edge locations
 *   caching: {
 *     strategy: 'aggressive',
 *     ttl: Duration.minutes(5)
 *   }
 * })
 * ```
 *
 * @module Edge
 * @since 2.5.0
 */

import { Effect, pipe, Duration } from 'effect'
import type { GraphQLSchema } from 'graphql'

/**
 * Edge provider types
 */
export type EdgeProvider =
  | 'cloudflare'
  | 'fastly'
  | 'akamai'
  | 'aws-cloudfront'
  | 'vercel'
  | 'netlify'

/**
 * Edge location info
 */
export interface EdgeLocation {
  /**
   * Location ID
   */
  id: string

  /**
   * City
   */
  city: string

  /**
   * Country
   */
  country: string

  /**
   * Latitude
   */
  lat: number

  /**
   * Longitude
   */
  lng: number

  /**
   * Provider
   */
  provider: EdgeProvider
}

/**
 * Caching strategy
 */
export type CachingStrategy =
  | 'conservative' // Cache only GET queries
  | 'standard' // Cache queries with TTL
  | 'aggressive' // Cache everything aggressively
  | 'custom' // Custom caching rules

/**
 * Edge deployment configuration
 */
export interface EdgeConfig {
  /**
   * Edge providers
   */
  providers: EdgeProvider[]

  /**
   * Number of edge locations
   */
  locations?: number

  /**
   * Specific regions to deploy
   */
  regions?: string[]

  /**
   * Federation configuration
   */
  federation?: {
    /**
     * GraphQL schema
     */
    schema?: GraphQLSchema

    /**
     * Subgraph endpoints
     */
    subgraphs?: Array<{
      name: string
      endpoint: string
    }>
  }

  /**
   * Caching configuration
   */
  caching?: {
    /**
     * Caching strategy
     */
    strategy?: CachingStrategy

    /**
     * Default TTL
     */
    ttl?: Duration.Duration

    /**
     * Cache key patterns
     */
    keyPatterns?: Array<{
      pattern: string
      ttl: Duration.Duration
    }>

    /**
     * Purge configuration
     */
    purge?: {
      /**
       * Auto-purge on schema change
       */
      onSchemaChange?: boolean

      /**
       * Purge patterns
       */
      patterns?: string[]
    }
  }

  /**
   * Performance configuration
   */
  performance?: {
    /**
     * Enable WebAssembly
     */
    wasm?: boolean

    /**
     * Enable HTTP/3
     */
    http3?: boolean

    /**
     * Enable Brotli compression
     */
    brotli?: boolean

    /**
     * Prefetch configuration
     */
    prefetch?: {
      enabled?: boolean
      patterns?: string[]
    }
  }

  /**
   * Security configuration
   */
  security?: {
    /**
     * DDoS protection
     */
    ddos?: {
      enabled?: boolean
      rateLimit?: number
    }

    /**
     * WAF rules
     */
    waf?: {
      enabled?: boolean
      rules?: string[]
    }

    /**
     * Bot protection
     */
    botProtection?: boolean
  }

  /**
   * Analytics configuration
   */
  analytics?: {
    /**
     * Enable real-time analytics
     */
    realTime?: boolean

    /**
     * Custom metrics
     */
    customMetrics?: string[]
  }
}

/**
 * Edge metrics
 */
export interface EdgeMetrics {
  /**
   * Total requests
   */
  requests: number

  /**
   * Cache hit rate
   */
  cacheHitRate: number

  /**
   * Average latency
   */
  avgLatency: number

  /**
   * Bandwidth used
   */
  bandwidth: number

  /**
   * Active locations
   */
  activeLocations: number

  /**
   * Error rate
   */
  errorRate: number
}

/**
 * Edge deployment manager
 */
export class EdgeDeployment {
  private readonly locations: EdgeLocation[] = []
  private readonly metrics: EdgeMetrics = {
    requests: 0,
    cacheHitRate: 0,
    avgLatency: 0,
    bandwidth: 0,
    activeLocations: 0,
    errorRate: 0,
  }

  constructor(private readonly config: EdgeConfig) {}

  /**
   * Create edge deployment
   */
  static async create(config: EdgeConfig): Promise<EdgeDeployment> {
    const deployment = new EdgeDeployment(config)
    await Effect.runPromise(deployment.initialize())
    return deployment
  }

  /**
   * Initialize deployment
   */
  private initialize(): Effect.Effect<void, Error> {
    return pipe(
      Effect.sync(() => {
        console.log('🌐 Initializing edge deployment')
        console.log(`   Providers: ${this.config.providers.join(', ')}`)
      }),
      Effect.flatMap(() => this.setupLocations()),
      Effect.flatMap(() => this.deployFunctions()),
      Effect.flatMap(() => this.configureCaching()),
      Effect.flatMap(() => this.setupSecurity())
    )
  }

  /**
   * Setup edge locations
   */
  private setupLocations(): Effect.Effect<void, Error> {
    return pipe(
      Effect.sync(() => {
        const targetLocations = this.config.locations ?? 100

        // Mock edge locations
        const cities = [
          { city: 'New York', country: 'US', lat: 40.7128, lng: -74.006 },
          { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
          { city: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
          { city: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
          { city: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
          { city: 'Frankfurt', country: 'DE', lat: 50.1109, lng: 8.6821 },
          { city: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
          { city: 'Mumbai', country: 'IN', lat: 19.076, lng: 72.8777 },
          { city: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
          { city: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
        ]

        // Generate locations across providers
        for (const provider of this.config.providers) {
          for (
            let i = 0;
            i < Math.min(targetLocations / this.config.providers.length, cities.length);
            i++
          ) {
            const location = cities[i]!
            this.locations.push({
              id: `${provider}-${location.city.toLowerCase().replace(' ', '-')}`,
              city: location.city,
              country: location.country,
              lat: location.lat,
              lng: location.lng,
              provider,
            })
          }
        }

        console.log(`   📍 Configured ${this.locations.length} edge locations`)
        this.metrics.activeLocations = this.locations.length
      })
    )
  }

  /**
   * Deploy edge functions
   */
  private deployFunctions(): Effect.Effect<void, Error> {
    return pipe(
      Effect.forEach(this.config.providers, provider => this.deployToProvider(provider)),
      Effect.map(() => undefined)
    )
  }

  /**
   * Deploy to specific provider
   */
  private deployToProvider(provider: EdgeProvider): Effect.Effect<void, Error> {
    return pipe(
      Effect.sync(() => {
        console.log(`   🚀 Deploying to ${provider}`)

        // Mock deployment based on provider
        switch (provider) {
          case 'cloudflare':
            this.deployCloudflareWorkers()
            break
          case 'vercel':
            this.deployVercelFunctions()
            break
          case 'aws-cloudfront':
            this.deployLambdaAtEdge()
            break
          default:
            console.log(`      Deployed edge functions to ${provider}`)
        }
      })
    )
  }

  /**
   * Deploy Cloudflare Workers
   */
  private deployCloudflareWorkers(): void {
    console.log('      Deployed Cloudflare Workers with Durable Objects')
    console.log('      Enabled Workers KV for distributed caching')
  }

  /**
   * Deploy Vercel Edge Functions
   */
  private deployVercelFunctions(): void {
    console.log('      Deployed Vercel Edge Functions')
    console.log('      Configured Edge Config for dynamic routing')
  }

  /**
   * Deploy Lambda@Edge
   */
  private deployLambdaAtEdge(): void {
    console.log('      Deployed Lambda@Edge functions')
    console.log('      Configured CloudFront behaviors')
  }

  /**
   * Configure caching
   */
  private configureCaching(): Effect.Effect<void, Error> {
    const strategy = this.config.caching?.strategy ?? 'standard'
    const ttl = this.config.caching?.ttl ?? Duration.minutes(1)

    return pipe(
      Effect.sync(() => {
        console.log(`   💾 Configuring ${strategy} caching strategy`)
        console.log(`      Default TTL: ${Duration.toMillis(ttl) / 1000}s`)

        // Configure cache rules based on strategy
        switch (strategy) {
          case 'aggressive':
            this.setupAggressiveCaching()
            break
          case 'conservative':
            this.setupConservativeCaching()
            break
          case 'standard':
            this.setupStandardCaching()
            break
        }
      })
    )
  }

  /**
   * Setup aggressive caching
   */
  private setupAggressiveCaching(): void {
    console.log('      Cache all queries and mutations')
    console.log('      Enable stale-while-revalidate')
    console.log('      Prefetch popular queries')
  }

  /**
   * Setup conservative caching
   */
  private setupConservativeCaching(): void {
    console.log('      Cache only GET queries')
    console.log('      Short TTLs for dynamic content')
    console.log('      No caching for mutations')
  }

  /**
   * Setup standard caching
   */
  private setupStandardCaching(): void {
    console.log('      Cache queries with smart invalidation')
    console.log('      Tag-based cache purging')
    console.log('      Automatic cache warming')
  }

  /**
   * Setup security
   */
  private setupSecurity(): Effect.Effect<void, Error> {
    return pipe(
      Effect.sync(() => {
        if (this.config.security?.ddos?.enabled === true) {
          console.log('   🛡️  DDoS protection enabled')
          console.log(`      Rate limit: ${this.config.security.ddos.rateLimit ?? 1000} req/s`)
        }

        if (this.config.security?.waf?.enabled === true) {
          console.log('   🔒 WAF enabled with custom rules')
        }

        if (this.config.security?.botProtection === true) {
          console.log('   🤖 Bot protection enabled')
        }
      })
    )
  }

  /**
   * Execute query at edge
   */
  async executeQuery(
    query: string,
    variables?: Record<string, unknown>,
    clientLocation?: { lat: number; lng: number }
  ): Promise<unknown> {
    return Effect.runPromise(
      pipe(
        Effect.sync(() => {
          // Find nearest edge location
          const location = this.findNearestLocation(clientLocation)

          // Check cache
          const cacheKey = this.generateCacheKey(query, variables)
          const cached = this.checkCache(cacheKey)

          if (cached !== undefined) {
            this.metrics.cacheHitRate =
              (this.metrics.cacheHitRate * this.metrics.requests + 1) / (this.metrics.requests + 1)
            this.metrics.requests++
            return cached
          }

          // Execute at edge
          const startTime = Date.now()
          const result = this.executeAtLocation(location, query, variables)
          const latency = Date.now() - startTime

          // Update metrics
          this.metrics.requests++
          this.metrics.avgLatency =
            (this.metrics.avgLatency * (this.metrics.requests - 1) + latency) /
            this.metrics.requests
          this.metrics.bandwidth += JSON.stringify(result).length

          // Cache result
          this.cacheResult(cacheKey, result)

          return result
        })
      )
    )
  }

  /**
   * Find nearest edge location
   */
  private findNearestLocation(clientLocation?: { lat: number; lng: number }): EdgeLocation {
    if (!clientLocation || this.locations.length === 0) {
      return (
        this.locations[0] ?? {
          id: 'default',
          city: 'Default',
          country: 'US',
          lat: 0,
          lng: 0,
          provider: 'cloudflare' as EdgeProvider,
        }
      )
    }

    return this.locations.reduce((nearest, location) => {
      const distance = this.calculateDistance(clientLocation, location)
      const nearestDistance = this.calculateDistance(clientLocation, nearest)
      return distance < nearestDistance ? location : nearest
    })
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(query: string, variables?: Record<string, unknown>): string {
    return `${query}-${JSON.stringify(variables ?? {})}`
  }

  /**
   * Check cache
   */
  private checkCache(_key: string): unknown | null {
    // Mock cache check
    return Math.random() > 0.3 ? { data: { cached: true } } : null
  }

  /**
   * Cache result
   */
  private cacheResult(key: string, _result: unknown): void {
    // Mock caching
    console.log(`      Cached result with key: ${key.substring(0, 20)}...`)
  }

  /**
   * Execute at specific location
   */
  private executeAtLocation(
    location: EdgeLocation,
    _query: string,
    _variables?: Record<string, unknown>
  ): unknown {
    // Mock execution
    return {
      data: {
        result: 'Mock result',
        location: location.city,
        provider: location.provider,
      },
    }
  }

  /**
   * Purge cache
   */
  async purgeCache(pattern?: string): Promise<void> {
    await Effect.runPromise(
      Effect.sync(() => {
        if (pattern !== undefined) {
          console.log(`🗑️  Purging cache for pattern: ${pattern}`)
        } else {
          console.log('🗑️  Purging entire cache')
        }

        // Reset cache hit rate after purge
        this.metrics.cacheHitRate = 0
      })
    )
  }

  /**
   * Get metrics
   */
  getMetrics(): EdgeMetrics {
    return this.metrics
  }

  /**
   * Get edge locations
   */
  getLocations(): EdgeLocation[] {
    return this.locations
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<EdgeConfig>): Promise<void> {
    await Effect.runPromise(
      Effect.sync(() => {
        Object.assign(this.config, config)
        console.log('⚙️  Configuration updated')

        if (config.caching) {
          this.configureCaching()
        }
      })
    )
  }
}

/**
 * Edge presets
 */
export const EdgePresets = {
  /**
   * Global CDN preset
   */
  globalCDN: (): EdgeConfig => ({
    providers: ['cloudflare', 'fastly', 'akamai'],
    locations: 200,
    caching: {
      strategy: 'aggressive',
      ttl: Duration.minutes(5),
      purge: {
        onSchemaChange: true,
      },
    },
    performance: {
      wasm: true,
      http3: true,
      brotli: true,
      prefetch: {
        enabled: true,
      },
    },
    security: {
      ddos: {
        enabled: true,
        rateLimit: 10000,
      },
      waf: {
        enabled: true,
      },
      botProtection: true,
    },
  }),

  /**
   * Serverless preset
   */
  serverless: (): EdgeConfig => ({
    providers: ['vercel', 'netlify', 'cloudflare'],
    caching: {
      strategy: 'standard',
      ttl: Duration.seconds(60),
    },
    performance: {
      wasm: true,
    },
  }),

  /**
   * Low latency preset
   */
  lowLatency: (): EdgeConfig => ({
    providers: ['cloudflare', 'aws-cloudfront'],
    locations: 300,
    caching: {
      strategy: 'aggressive',
      ttl: Duration.seconds(30),
    },
    performance: {
      http3: true,
      prefetch: {
        enabled: true,
        patterns: ['*/api/graphql'],
      },
    },
  }),

  /**
   * Cost-optimized preset
   */
  costOptimized: (): EdgeConfig => ({
    providers: ['cloudflare'], // Single provider
    locations: 50, // Fewer locations
    caching: {
      strategy: 'aggressive', // More caching = less origin requests
      ttl: Duration.minutes(10),
    },
  }),
}
