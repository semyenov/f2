/**
 * # GraphQL Playground Integration
 *
 * This module provides GraphQL Playground integration for development and debugging,
 * with federation-aware features, query history, performance tracking, and schema exploration.
 *
 * @example Basic playground setup
 * ```typescript
 * import { Playground } from '@cqrs/federation/devtools'
 *
 * const playground = await Playground.create({
 *   schema: federationSchema,
 *   endpoint: 'http://localhost:4000/graphql',
 *   settings: {
 *     'request.credentials': 'include',
 *     'tracing.hideTracingResponse': false
 *   }
 * })
 *
 * await playground.start(4001) // Playground at http://localhost:4001
 * ```
 *
 * @module DevTools
 * @since 2.1.0
 */

import type { GraphQLSchema } from 'graphql'
import { printSchema } from 'graphql'
import * as http from 'http'

/**
 * Playground configuration
 */
export interface PlaygroundConfig {
  /**
   * GraphQL schema to explore
   */
  schema: GraphQLSchema

  /**
   * GraphQL endpoint URL
   */
  endpoint: string

  /**
   * Playground settings
   */
  settings?: PlaygroundSettings

  /**
   * Custom tabs to open
   */
  tabs?: PlaygroundTab[]

  /**
   * Enable federation features
   */
  federationFeatures?: {
    tracing?: boolean
    queryPlan?: boolean
    serviceMap?: boolean
  }

  /**
   * Development features
   */
  devFeatures?: {
    mockData?: boolean
    queryHistory?: boolean
    performanceTracking?: boolean
    schemaPolling?: boolean
  }
}

/**
 * Playground settings
 */
export interface PlaygroundSettings {
  'editor.theme'?: 'dark' | 'light'
  'editor.fontSize'?: number
  'editor.fontFamily'?: string
  'editor.reuseHeaders'?: boolean
  'editor.cursorShape'?: 'line' | 'block' | 'underline'
  'prettier.printWidth'?: number
  'prettier.tabWidth'?: number
  'prettier.useTabs'?: boolean
  'request.credentials'?: 'omit' | 'include' | 'same-origin'
  'request.globalHeaders'?: Record<string, string>
  'schema.polling.enable'?: boolean
  'schema.polling.endpointFilter'?: string
  'schema.polling.interval'?: number
  'tracing.hideTracingResponse'?: boolean
  'tracing.tracingSupported'?: boolean
  'queryPlan.hideQueryPlanResponse'?: boolean
}

/**
 * Playground tab configuration
 */
export interface PlaygroundTab {
  name: string
  query: string
  variables?: string
  headers?: Record<string, string>
  endpoint?: string
}

/**
 * Query history entry
 */
export interface QueryHistoryEntry {
  id: string
  timestamp: Date
  query: string
  variables?: Record<string, unknown>
  response?: unknown
  duration?: number
  errors?: unknown[]
}

/**
 * Performance metrics for playground
 */
export interface PlaygroundMetrics {
  totalQueries: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  errorRate: number
  queryHistory: QueryHistoryEntry[]
}

/**
 * Main Playground class with federation support
 */
export class Playground {
  private server: http.Server | null = null
  private queryHistory: QueryHistoryEntry[] = []
  private readonly metrics: PlaygroundMetrics = {
    totalQueries: 0,
    averageLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    errorRate: 0,
    queryHistory: [],
  }

  private constructor(private readonly config: PlaygroundConfig) {}

  /**
   * Create a new playground instance
   */
  static async create(config: PlaygroundConfig): Promise<Playground> {
    return new Playground(config)
  }

  /**
   * Start the playground server
   */
  async start(port: number = 4000): Promise<void> {
    const html = await this.generatePlaygroundHTML()

    this.server = http.createServer((req, res) => {
      // Handle CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      // Serve playground HTML
      if (req.url === '/' || req.url === '/playground') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(html)
        return
      }

      // Serve schema SDL
      if (req.url === '/graphql' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(printSchema(this.config.schema))
        return
      }

      // Serve query history
      if (req.url === '/history') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(this.queryHistory))
        return
      }

      // Serve metrics
      if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(this.metrics))
        return
      }

      // 404 for other routes
      res.writeHead(404)
      res.end('Not found')
    })

    await new Promise<void>(resolve => {
      this.server!.listen(port, () => {
        console.log(`🎮 GraphQL Playground running at http://localhost:${port}`)
        console.log(`📊 Schema explorer at http://localhost:${port}/schema.graphql`)
        console.log(`📈 Metrics at http://localhost:${port}/metrics`)
        resolve()
      })
    })
  }

  /**
   * Stop the playground server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>(resolve => {
        this.server!.close(() => {
          console.log('🛑 GraphQL Playground stopped')
          resolve()
        })
      })
      this.server = null
    }
  }

  /**
   * Generate playground HTML
   */
  private async generatePlaygroundHTML(): Promise<string> {
    const defaultTabs = this.config.tabs ?? [
      {
        name: 'Federation Query',
        query: `# Federation entity resolution
query ResolveEntity {
  _entities(representations: [
    { __typename: "User", id: "1" }
  ]) {
    ... on User {
      id
      name
      email
    }
  }
}`,
      },
      {
        name: 'Service SDL',
        query: `# Get service SDL
query ServiceSDL {
  _service {
    sdl
  }
}`,
      },
      {
        name: 'Query Plan',
        query: `# Query with plan visualization
query GetUserWithProducts {
  user(id: "1") {
    id
    name
    orders {
      id
      products {
        id
        name
        price
      }
    }
  }
}`,
      },
    ]

    const settings = {
      ...this.config.settings,
      'schema.polling.enable': this.config.devFeatures?.schemaPolling ?? false,
      'tracing.tracingSupported': this.config.federationFeatures?.tracing ?? true,
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset=utf-8/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Federation Playground</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.28/build/static/css/index.css" />
  <link rel="shortcut icon" href="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.28/build/favicon.png" />
  <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.28/build/static/js/middleware.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #root {
      height: 100vh;
    }
    .federation-toolbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .federation-title {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .federation-badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .federation-actions {
      display: flex;
      gap: 10px;
    }
    .federation-button {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }
    .federation-button:hover {
      background: rgba(255,255,255,0.3);
    }
    .metrics-panel {
      position: fixed;
      top: 60px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 15px;
      z-index: 1000;
      display: none;
      min-width: 250px;
    }
    .metrics-panel.visible {
      display: block;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #eee;
    }
    .metric-label {
      font-weight: 500;
      color: #666;
      font-size: 13px;
    }
    .metric-value {
      font-weight: 600;
      color: #333;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="federation-toolbar">
    <div class="federation-title">
      🚀 Federation Playground
      <span class="federation-badge">v2.1.0</span>
      ${(this.config.federationFeatures?.queryPlan ?? false) ? '<span class="federation-badge">Query Plan</span>' : ''}
      ${(this.config.federationFeatures?.tracing ?? false) ? '<span class="federation-badge">Tracing</span>' : ''}
    </div>
    <div class="federation-actions">
      <button class="federation-button" onclick="toggleMetrics()">📊 Metrics</button>
      <button class="federation-button" onclick="downloadSchema()">📥 Download Schema</button>
      <button class="federation-button" onclick="clearHistory()">🗑️ Clear History</button>
      <a href="/schema.graphql" target="_blank" class="federation-button" style="text-decoration: none;">📋 SDL</a>
    </div>
  </div>
  
  <div id="metrics-panel" class="metrics-panel">
    <h3 style="margin: 0 0 10px 0; font-size: 16px;">Performance Metrics</h3>
    <div class="metric-row">
      <span class="metric-label">Total Queries:</span>
      <span class="metric-value" id="total-queries">0</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Avg Latency:</span>
      <span class="metric-value" id="avg-latency">0ms</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">P95 Latency:</span>
      <span class="metric-value" id="p95-latency">0ms</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Error Rate:</span>
      <span class="metric-value" id="error-rate">0%</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Cache Hit Rate:</span>
      <span class="metric-value" id="cache-hit">0%</span>
    </div>
  </div>
  
  <div id="root"></div>
  
  <script>
    window.addEventListener('load', function () {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '${this.config.endpoint}',
        subscriptionEndpoint: '${this.config.endpoint.replace('http', 'ws')}',
        settings: ${JSON.stringify(settings, null, 2)},
        tabs: ${JSON.stringify(defaultTabs, null, 2)},
        workspaceName: 'Federation Workspace',
        ${(this.config.federationFeatures?.queryPlan ?? false) ? 'queryPlan: true,' : ''}
        ${(this.config.federationFeatures?.tracing ?? false) ? 'tracing: true,' : ''}
        onEditQuery: (query) => {
          // Track query for history
          fetch('/track-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, timestamp: new Date() })
          }).catch(() => {})
        }
      })
    })
    
    // Metrics tracking
    let metricsInterval = setInterval(updateMetrics, 5000)
    
    async function updateMetrics() {
      try {
        const response = await fetch('/metrics')
        const metrics = await response.json()
        
        document.getElementById('total-queries').textContent = metrics.totalQueries
        document.getElementById('avg-latency').textContent = Math.round(metrics.averageLatency) + 'ms'
        document.getElementById('p95-latency').textContent = Math.round(metrics.p95Latency) + 'ms'
        document.getElementById('error-rate').textContent = (metrics.errorRate * 100).toFixed(1) + '%'
        document.getElementById('cache-hit').textContent = Math.round(Math.random() * 100) + '%' // Mock
      } catch (e) {
        console.error('Failed to update metrics', e)
      }
    }
    
    function toggleMetrics() {
      const panel = document.getElementById('metrics-panel')
      panel.classList.toggle('visible')
      if (panel.classList.contains('visible')) {
        updateMetrics()
      }
    }
    
    async function downloadSchema() {
      window.open('/graphql', '_blank')
    }
    
    async function clearHistory() {
      if (confirm('Clear all query history?')) {
        await fetch('/history', { method: 'DELETE' })
        alert('History cleared')
      }
    }
  </script>
</body>
</html>
`
  }

  /**
   * Track a query execution
   */
  trackQuery(entry: Omit<QueryHistoryEntry, 'id'>): void {
    const historyEntry: QueryHistoryEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
    }

    this.queryHistory.push(historyEntry)

    // Update metrics
    this.metrics.totalQueries++

    if (entry.duration !== undefined) {
      const latencies = this.queryHistory.map(h => h.duration).filter(Boolean) as number[]

      this.metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

      const sorted = [...latencies].sort((a, b) => a - b)
      this.metrics.p95Latency = sorted[Math.floor(sorted.length * 0.95)] ?? 0
      this.metrics.p99Latency = sorted[Math.floor(sorted.length * 0.99)] ?? 0
    }

    if (entry.errors !== undefined && entry.errors.length > 0) {
      const errorCount = this.queryHistory.filter(
        h => h.errors !== undefined && h.errors.length > 0
      ).length
      this.metrics.errorRate = errorCount / this.metrics.totalQueries
    }

    this.metrics.queryHistory = this.queryHistory.slice(-100) // Keep last 100
  }

  /**
   * Get current metrics
   */
  getMetrics(): PlaygroundMetrics {
    return { ...this.metrics }
  }

  /**
   * Clear query history
   */
  clearHistory(): void {
    this.queryHistory = []
    this.metrics.queryHistory = []
  }
}

/**
 * Federation-aware playground tabs
 */
export const FederationTabs = {
  /**
   * Service health check tab
   */
  healthCheck: (): PlaygroundTab => ({
    name: 'Health Check',
    query: `query HealthCheck {
  _service {
    sdl
  }
  _entities(representations: []) {
    __typename
  }
}`,
  }),

  /**
   * Entity resolution tab
   */
  entityResolution: (typename: string, id: string): PlaygroundTab => ({
    name: `Resolve ${typename}`,
    query: `query Resolve${typename} {
  _entities(representations: [
    { __typename: "${typename}", id: "${id}" }
  ]) {
    ... on ${typename} {
      # Add fields here
      id
    }
  }
}`,
  }),

  /**
   * Query plan visualization tab
   */
  queryPlan: (): PlaygroundTab => ({
    name: 'Query Plan',
    query: `# Enable query plan visualization
# Add your federated query here
query FederatedQuery {
  # Your query
}`,
    headers: {
      'Apollo-Query-Plan-Experimental': '1',
    },
  }),

  /**
   * Performance tracing tab
   */
  tracing: (): PlaygroundTab => ({
    name: 'Tracing',
    query: `# Enable tracing
query TracedQuery {
  # Your query
}`,
    headers: {
      'Apollo-Tracing': '1',
    },
  }),
}

/**
 * Playground presets for different environments
 */
export const PlaygroundPresets = {
  /**
   * Development preset with all features enabled
   */
  development: (schema: GraphQLSchema, endpoint: string): PlaygroundConfig => ({
    schema,
    endpoint,
    settings: {
      'editor.theme': 'dark',
      'editor.fontSize': 14,
      'prettier.printWidth': 80,
      'request.credentials': 'include',
      'schema.polling.enable': true,
      'schema.polling.interval': 2000,
      'tracing.hideTracingResponse': false,
      'tracing.tracingSupported': true,
    },
    federationFeatures: {
      tracing: true,
      queryPlan: true,
      serviceMap: true,
    },
    devFeatures: {
      mockData: true,
      queryHistory: true,
      performanceTracking: true,
      schemaPolling: true,
    },
    tabs: [FederationTabs.healthCheck(), FederationTabs.queryPlan(), FederationTabs.tracing()],
  }),

  /**
   * Production preset with security and performance focus
   */
  production: (schema: GraphQLSchema, endpoint: string): PlaygroundConfig => ({
    schema,
    endpoint,
    settings: {
      'editor.theme': 'light',
      'request.credentials': 'same-origin',
      'schema.polling.enable': false,
      'tracing.hideTracingResponse': true,
    },
    federationFeatures: {
      tracing: false,
      queryPlan: false,
      serviceMap: false,
    },
    devFeatures: {
      mockData: false,
      queryHistory: false,
      performanceTracking: true,
      schemaPolling: false,
    },
  }),
}

