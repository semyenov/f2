/**
 * # Federation DevTools
 *
 * Comprehensive development tools for Apollo Federation, including playground,
 * schema visualization, migration analysis, debugging, and performance profiling.
 *
 * @example Complete devtools setup
 * ```typescript
 * import { DevTools } from '@cqrs/federation/devtools'
 *
 * // Start development environment
 * const devtools = await DevTools.start({
 *   schema: federationSchema,
 *   playground: true,
 *   visualization: true,
 *   monitoring: true
 * })
 *
 * // Access individual tools
 * const playground = devtools.playground
 * const visualizer = devtools.visualizer
 * const profiler = devtools.profiler
 * ```
 *
 * @module DevTools
 * @since 2.1.0
 */

export {
  Playground,
  PlaygroundPresets,
  FederationTabs,
  type PlaygroundConfig,
  type PlaygroundSettings,
  type PlaygroundTab,
  type QueryHistoryEntry,
  type PlaygroundMetrics,
} from './playground.js'

export {
  SchemaVisualizer,
  SchemaMigration,
  SchemaVersionManager,
  VisualizationFormats,
  type VisualizationConfig,
  type EntityRelationship,
  type SchemaComplexityMetrics,
  type MigrationAnalysis,
  type BreakingChange,
  type DangerousChange,
  type SafeChange,
  type MigrationStep,
  type SchemaVersion,
} from './schema-tools.js'

export {
  Profiler,
  ProfilerMiddleware,
  ProfilerPresets,
  type ProfilerConfig,
  type PerformanceSpan,
  type PerformanceMetrics,
  type PerformanceReport,
  type Bottleneck,
} from './profiler.js'

import type { GraphQLSchema } from 'graphql'
import { Playground, PlaygroundPresets } from './playground.js'
import { SchemaVisualizer, SchemaMigration, SchemaVersionManager } from './schema-tools.js'
import { Profiler, ProfilerPresets } from './profiler.js'

/**
 * Unified DevTools configuration
 */
export interface DevToolsConfig {
  /**
   * GraphQL schema
   */
  schema: GraphQLSchema

  /**
   * GraphQL endpoint
   */
  endpoint?: string

  /**
   * Enable playground
   */
  playground?: boolean | { port?: number }

  /**
   * Enable visualization
   */
  visualization?: boolean

  /**
   * Enable monitoring
   */
  monitoring?: boolean

  /**
   * Enable migration tools
   */
  migration?: boolean

  /**
   * Development mode
   */
  development?: boolean
}

/**
 * DevTools instance
 */
export interface DevToolsInstance {
  playground?: Playground
  visualizer?: SchemaVisualizer
  versionManager?: SchemaVersionManager
  profiler?: Profiler

  stop(): Promise<void>
  getMetrics(): DevToolsMetrics
}

/**
 * DevTools metrics
 */
export interface DevToolsMetrics {
  playground?: {
    totalQueries: number
    averageLatency: number
    errorRate: number
  }
  schema?: {
    typeCount: number
    fieldCount: number
    complexity: number
  }
  performance?: {
    memoryUsage: number
    cpuUsage: number
  }
}

/**
 * Main DevTools class
 */
export class DevTools {
  /**
   * Start all devtools
   */
  static async start(config: DevToolsConfig): Promise<DevToolsInstance> {
    const instance: DevToolsInstance = {
      stop: async () => {
        if (instance.playground) {
          await instance.playground.stop()
        }
      },
      getMetrics: () => {
        const metrics: DevToolsMetrics = {}

        if (instance.playground) {
          const playgroundMetrics = instance.playground.getMetrics()
          metrics.playground = {
            totalQueries: playgroundMetrics.totalQueries,
            averageLatency: playgroundMetrics.averageLatency,
            errorRate: playgroundMetrics.errorRate,
          }
        }

        if (instance.visualizer) {
          const complexity = instance.visualizer.calculateComplexity()
          metrics.schema = {
            typeCount: complexity.typeCount,
            fieldCount: complexity.fieldCount,
            complexity: complexity.cyclomaticComplexity,
          }
        }

        if (instance.profiler) {
          const profilerMetrics = instance.profiler.getMetrics()
          metrics.performance = {
            memoryUsage: profilerMetrics.memoryUsage.heapUsed / 1024 / 1024,
            cpuUsage: profilerMetrics.cpuUsage.user / 1000,
          }
        } else {
          metrics.performance = {
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuUsage: process.cpuUsage().user / 1000,
          }
        }

        return metrics
      },
    }

    // Start playground
    if (config.playground !== false) {
      const port = typeof config.playground === 'object' ? config.playground.port : 4001
      const playgroundConfig =
        (config.development ?? false)
          ? PlaygroundPresets.development(
              config.schema,
              config.endpoint ?? 'http://localhost:4000/graphql'
            )
          : PlaygroundPresets.production(
              config.schema,
              config.endpoint ?? 'http://localhost:4000/graphql'
            )

      instance.playground = await Playground.create(playgroundConfig)
      await instance.playground.start(port)
    }

    // Create visualizer
    if (config.visualization ?? false) {
      instance.visualizer = new SchemaVisualizer(config.schema)
    }

    // Create version manager
    if (config.migration ?? false) {
      instance.versionManager = new SchemaVersionManager()
      await instance.versionManager.addVersion(config.schema, {
        version: '1.0.0',
        description: 'Initial schema',
      })
    }

    // Create profiler
    if (config.monitoring !== false) {
      const profilerConfig =
        (config.development ?? false) ? ProfilerPresets.development() : ProfilerPresets.production()

      instance.profiler = new Profiler(profilerConfig)
    }

    // Log startup
    console.log('🛠️  Federation DevTools started:')
    if (config.playground !== false) console.log('   🎮 Playground: http://localhost:4001')
    if (config.visualization !== false) console.log('   📊 Visualization ready')
    if (config.migration !== false) console.log('   🔄 Migration tools ready')
    if (config.monitoring !== false) console.log('   📈 Monitoring enabled')

    return instance
  }

  /**
   * Quick start for development
   */
  static async quickStart(schema: GraphQLSchema): Promise<DevToolsInstance> {
    return this.start({
      schema,
      endpoint: 'http://localhost:4000/graphql',
      playground: true,
      visualization: true,
      monitoring: true,
      migration: true,
      development: true,
    })
  }
}

/**
 * Schema analysis utilities
 */
export const SchemaAnalysis = {
  /**
   * Analyze schema complexity
   */
  complexity: (schema: GraphQLSchema) => {
    const visualizer = new SchemaVisualizer(schema)
    return visualizer.calculateComplexity()
  },

  /**
   * Find circular dependencies
   */
  findCircularDependencies: (schema: GraphQLSchema) => {
    const visualizer = new SchemaVisualizer(schema)
    const relationships = visualizer.analyzeRelationships()

    // Simple cycle detection
    const cycles: string[][] = []
    const visited = new Set<string>()
    const stack = new Set<string>()

    function dfs(node: string, path: string[] = []): void {
      if (stack.has(node)) {
        const cycleStart = path.indexOf(node)
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart))
        }
        return
      }

      if (visited.has(node)) return

      visited.add(node)
      stack.add(node)
      path.push(node)

      relationships.filter(r => r.from === node).forEach(r => dfs(r.to, [...path]))

      stack.delete(node)
    }

    relationships.forEach(r => {
      if (!visited.has(r.from)) {
        dfs(r.from)
      }
    })

    return cycles
  },

  /**
   * Get schema statistics
   */
  statistics: (schema: GraphQLSchema) => {
    const visualizer = new SchemaVisualizer(schema)
    const complexity = visualizer.calculateComplexity()
    const relationships = visualizer.analyzeRelationships()

    return {
      types: {
        total: complexity.typeCount,
        averageFields: complexity.averageFieldsPerType,
        mostComplex: complexity.mostComplexTypes[0],
      },
      relationships: {
        total: relationships.length,
        oneToOne: relationships.filter(r => r.type === 'one-to-one').length,
        oneToMany: relationships.filter(r => r.type === 'one-to-many').length,
        manyToMany: relationships.filter(r => r.type === 'many-to-many').length,
      },
      federation: {
        directives: complexity.federationDirectiveCount,
      },
    }
  },
}

/**
 * Migration utilities
 */
export const MigrationUtils = {
  /**
   * Check if migration is safe
   */
  isSafe: async (oldSchema: GraphQLSchema, newSchema: GraphQLSchema): Promise<boolean> => {
    const analysis = await SchemaMigration.analyze(oldSchema, newSchema)
    return !analysis.hasBreakingChanges
  },

  /**
   * Generate migration script
   */
  generateScript: async (oldSchema: GraphQLSchema, newSchema: GraphQLSchema): Promise<string> => {
    const analysis = await SchemaMigration.analyze(oldSchema, newSchema)
    return SchemaMigration.generateMigrationScript(analysis)
  },

  /**
   * Get migration summary
   */
  summary: async (oldSchema: GraphQLSchema, newSchema: GraphQLSchema) => {
    const analysis = await SchemaMigration.analyze(oldSchema, newSchema)
    return {
      safe: !analysis.hasBreakingChanges,
      breakingChanges: analysis.breakingChanges.length,
      dangerousChanges: analysis.dangerousChanges.length,
      safeChanges: analysis.safeChanges.length,
      impact: analysis.estimatedImpact,
      steps: analysis.migrationSteps.length,
    }
  },
}
