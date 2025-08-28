/**
 * # Schema Visualization and Migration Tools
 * 
 * This module provides comprehensive schema analysis, visualization, migration,
 * and versioning tools for federation schemas with breaking change detection.
 * 
 * @example Schema visualization
 * ```typescript
 * import { SchemaVisualizer } from '@cqrs/federation/devtools'
 * 
 * const visualizer = new SchemaVisualizer(schema)
 * const mermaidDiagram = visualizer.generateMermaid()
 * const dot = visualizer.generateGraphviz()
 * const relationships = visualizer.analyzeRelationships()
 * ```
 * 
 * @example Schema migration
 * ```typescript
 * import { SchemaMigration } from '@cqrs/federation/devtools'
 * 
 * const migration = await SchemaMigration.analyze(oldSchema, newSchema)
 * if (migration.hasBreakingChanges) {
 *   console.log('Breaking changes:', migration.breakingChanges)
 * }
 * const migrationScript = migration.generateMigrationScript()
 * ```
 * 
 * @module DevTools
 * @since 2.1.0
 */

import type {
  GraphQLSchema,
  GraphQLType,
  GraphQLNamedType,
  ConstDirectiveNode,
} from 'graphql'
import {
  isObjectType,
  isListType,
  isNonNullType,
  isScalarType,
  isEnumType,
  isInterfaceType,
  isUnionType,
  getNamedType,
  printSchema,
  GraphQLScalarType,
} from 'graphql'
import { diff } from '@graphql-inspector/core'
import type { Change } from '@graphql-inspector/core'

/**
 * Schema visualization configuration
 */
export interface VisualizationConfig {
  /**
   * Include scalar types
   */
  includeScalars?: boolean
  
  /**
   * Include enum types
   */
  includeEnums?: boolean
  
  /**
   * Include directives
   */
  includeDirectives?: boolean
  
  /**
   * Group by module/domain
   */
  groupByModule?: boolean
  
  /**
   * Color scheme
   */
  colorScheme?: 'default' | 'dark' | 'colorblind'
  
  /**
   * Layout algorithm
   */
  layout?: 'hierarchical' | 'circular' | 'force' | 'dagre'
}

/**
 * Entity relationship
 */
export interface EntityRelationship {
  from: string
  to: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  field: string
  required: boolean
  bidirectional?: boolean
}

/**
 * Schema complexity metrics
 */
export interface SchemaComplexityMetrics {
  typeCount: number
  fieldCount: number
  relationshipCount: number
  maxDepth: number
  cyclomaticComplexity: number
  federationDirectiveCount: number
  averageFieldsPerType: number
  mostComplexTypes: Array<{ type: string; complexity: number }>
}

/**
 * Migration analysis result
 */
export interface MigrationAnalysis {
  hasBreakingChanges: boolean
  breakingChanges: BreakingChange[]
  dangerousChanges: DangerousChange[]
  safeChanges: SafeChange[]
  affectedQueries: string[]
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical'
  migrationSteps: MigrationStep[]
}

/**
 * Breaking change details
 */
export interface BreakingChange {
  type: string
  description: string
  path: string
  recommendation: string
  impact: 'high' | 'critical'
}

/**
 * Dangerous change details
 */
export interface DangerousChange {
  type: string
  description: string
  path: string
  recommendation: string
  impact: 'medium'
}

/**
 * Safe change details
 */
export interface SafeChange {
  type: string
  description: string
  path: string
  impact: 'low'
}

/**
 * Migration step
 */
export interface MigrationStep {
  order: number
  type: 'add' | 'modify' | 'remove' | 'rename'
  target: string
  description: string
  code?: string
  validation?: string
}

/**
 * Schema version metadata
 */
export interface SchemaVersion {
  version: string
  timestamp: Date
  author?: string
  description?: string
  checksum: string
  breaking: boolean
  changes: number
}

/**
 * Main schema visualizer class
 */
export class SchemaVisualizer {
  private readonly types: Map<string, GraphQLNamedType>
  private relationships: EntityRelationship[] = []
  
  constructor(
    schema: GraphQLSchema,
    private readonly config: VisualizationConfig = {}
  ) {
    this.types = new Map(Object.entries(schema.getTypeMap()))
    this.analyzeRelationships()
  }
  
  /**
   * Generate Mermaid diagram
   */
  generateMermaid(): string {
    let diagram = `graph ${this.config.layout === 'hierarchical' ? 'TD' : 'LR'}\n`
    
    // Add types
    this.types.forEach((type, name) => {
      if (this.shouldIncludeType(type)) {
        if (isObjectType(type)) {
          const fields = Object.keys(type.getFields()).slice(0, 5)
          const fieldList = fields.map(f => `+${f}`).join('<br/>')
          diagram += `  ${name}["${name}<br/>${fieldList}${fields.length > 5 ? '<br/>...' : ''}"]\n`
          
          // Style federation entities
          if (this.isFederationEntity(type)) {
            diagram += `  style ${name} fill:#f96,stroke:#333,stroke-width:2px\n`
          }
        } else if (isEnumType(type) && (this.config.includeEnums ?? false)) {
          diagram += `  ${name}{{${name}}}\n`
        } else if (isInterfaceType(type)) {
          diagram += `  ${name}[["${name}"]]\n`
        }
      }
    })
    
    // Add relationships
    this.relationships.forEach(rel => {
      const arrow = rel.type === 'one-to-many' ? '-->' : 
                    rel.type === 'many-to-many' ? '<-->' : '--'
      const label = rel.required ? `|${rel.field}*|` : `|${rel.field}|`
      diagram += `  ${rel.from} ${arrow} ${label} ${rel.to}\n`
    })
    
    // Add subgraphs for modules
    if (this.config.groupByModule) {
      const modules = this.groupTypesByModule()
      modules.forEach((types, module) => {
        diagram += `  subgraph ${module}\n`
        types.forEach(type => {
          diagram += `    ${type}\n`
        })
        diagram += `  end\n`
      })
    }
    
    return diagram
  }
  
  /**
   * Generate Graphviz DOT notation
   */
  generateGraphviz(): string {
    let dot = `digraph Schema {\n`
    dot += `  rankdir=${this.config.layout === 'hierarchical' ? 'TB' : 'LR'};\n`
    dot += `  node [shape=record, fontsize=10];\n`
    dot += `  edge [fontsize=9];\n`
    
    // Add types
    this.types.forEach((type, name) => {
      if (this.shouldIncludeType(type)) {
        if (isObjectType(type)) {
          const fields = Object.entries(type.getFields())
            .slice(0, 8)
            .map(([fname, field]) => {
              const fieldType = this.getFieldTypeName(field.type)
              return `${fname}: ${fieldType}`
            })
            .join('\\l')
          
          const color = this.isFederationEntity(type) ? 'lightblue' : 'white'
          dot += `  "${name}" [label="{${name}|${fields}\\l}", fillcolor="${color}", style="filled"];\n`
        }
      }
    })
    
    // Add relationships
    this.relationships.forEach(rel => {
      const style = rel.required ? 'solid' : 'dashed'
      const arrowhead = rel.type === 'one-to-many' ? 'crow' : 'normal'
      dot += `  "${rel.from}" -> "${rel.to}" [label="${rel.field}", style="${style}", arrowhead="${arrowhead}"];\n`
    })
    
    dot += `}\n`
    return dot
  }
  
  /**
   * Generate D3.js visualization data
   */
  generateD3Data(): { nodes: any[]; links: any[] } {
    const nodes: any[] = []
    const links: any[] = []
    
    // Create nodes
    this.types.forEach((type, name) => {
      if (this.shouldIncludeType(type)) {
        nodes.push({
          id: name,
          name,
          type: this.getTypeCategory(type),
          fields: isObjectType(type) ? Object.keys(type.getFields()).length : 0,
          isFederation: this.isFederationEntity(type),
        })
      }
    })
    
    // Create links
    this.relationships.forEach(rel => {
      links.push({
        source: rel.from,
        target: rel.to,
        type: rel.type,
        field: rel.field,
        required: rel.required,
      })
    })
    
    return { nodes, links }
  }
  
  /**
   * Analyze entity relationships
   */
  analyzeRelationships(): EntityRelationship[] {
    this.relationships = []
    
    this.types.forEach((type) => {
      if (isObjectType(type)) {
        const fields = type.getFields()
        Object.entries(fields).forEach(([fieldName, field]) => {
          const namedType = getNamedType(field.type)
          
          if (isObjectType(namedType) && !this.isBuiltinType(namedType.name)) {
            const isList = this.isListField(field.type)
            const isRequired = isNonNullType(field.type)
            
            this.relationships.push({
              from: type.name,
              to: namedType.name,
              type: isList ? 'one-to-many' : 'one-to-one',
              field: fieldName,
              required: isRequired,
            })
          }
        })
      }
    })
    
    return this.relationships
  }
  
  /**
   * Calculate schema complexity metrics
   */
  calculateComplexity(): SchemaComplexityMetrics {
    const typeCount = Array.from(this.types.values())
      .filter(t => !this.isBuiltinType(t.name)).length
    
    let fieldCount = 0
    let federationDirectiveCount = 0
    const typeComplexity: Map<string, number> = new Map()
    
    this.types.forEach((type, name) => {
      if (isObjectType(type) && !this.isBuiltinType(name)) {
        const fields = Object.keys(type.getFields())
        fieldCount += fields.length
        
        // Calculate type complexity
        let complexity = fields.length
        fields.forEach(field => {
          const fieldType = type.getFields()[field]
          if (this.isListField(fieldType?.type ?? new GraphQLScalarType({ name: 'Unknown' }))) complexity += 2
          if (isNonNullType(fieldType?.type ?? new GraphQLScalarType({ name: 'Unknown' }))) complexity += 1
        })
        typeComplexity.set(name, complexity)
        
        // Count federation directives
        const directives = type.astNode?.directives ?? []
        federationDirectiveCount += directives.filter((d: ConstDirectiveNode) => 
          ['key', 'extends', 'external', 'requires', 'provides'].includes(d.name.value)
        ).length
      }
    })
    
    const mostComplexTypes = Array.from(typeComplexity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, complexity]) => ({ type, complexity }))
    
    return {
      typeCount,
      fieldCount,
      relationshipCount: this.relationships.length,
      maxDepth: this.calculateMaxDepth(),
      cyclomaticComplexity: this.relationships.length + 1,
      federationDirectiveCount,
      averageFieldsPerType: fieldCount / Math.max(typeCount, 1),
      mostComplexTypes,
    }
  }
  
  /**
   * Helper methods
   */
  private shouldIncludeType(type: GraphQLNamedType): boolean {
    if (this.isBuiltinType(type.name)) return false
    if (!(this.config.includeScalars ?? false) && isScalarType(type)) return false
    if (!(this.config.includeEnums ?? false) && isEnumType(type)) return false
    return true
  }
  
  private isBuiltinType(name: string): boolean {
    return name.startsWith('__') || ['String', 'Int', 'Float', 'Boolean', 'ID'].includes(name)
  }
  
  private isFederationEntity(type: GraphQLNamedType): boolean {
    if (!isObjectType(type)) return false
    const directives = type.astNode?.directives ?? []
    return directives.some((d: ConstDirectiveNode) => d.name.value === 'key')
  }
  
  private isListField(type: GraphQLType): boolean {
    if (isListType(type)) return true
    if (isNonNullType(type)) return this.isListField(type.ofType)
    return false
  }
  
  private getFieldTypeName(type: GraphQLType): string {
    if (isNonNullType(type)) return `${this.getFieldTypeName(type.ofType)}!`
    if (isListType(type)) return `[${this.getFieldTypeName(type.ofType)}]`
    return type.name ?? 'Unknown'
  }
  
  private getTypeCategory(type: GraphQLNamedType): string {
    if (isObjectType(type)) return 'object'
    if (isInterfaceType(type)) return 'interface'
    if (isUnionType(type)) return 'union'
    if (isEnumType(type)) return 'enum'
    if (isScalarType(type)) return 'scalar'
    return 'unknown'
  }
  
  private groupTypesByModule(): Map<string, string[]> {
    const modules = new Map<string, string[]>()
    
    this.types.forEach((_type, name) => {
      if (!this.isBuiltinType(name)) {
        // Simple module detection based on naming convention
        const module = name.includes('User') ? 'Users' :
                       name.includes('Product') ? 'Products' :
                       name.includes('Order') ? 'Orders' :
                       'Common'
        
        if (!modules.has(module)) {
          modules.set(module, [])
        }
        modules.get(module)!.push(name)
      }
    })
    
    return modules
  }
  
  private calculateMaxDepth(): number {
    // Simplified depth calculation
    return Math.max(...this.relationships.map(r => {
      const path = this.findLongestPath(r.from, new Set())
      return path
    }), 0)
  }
  
  private findLongestPath(from: string, visited: Set<string>): number {
    if (visited.has(from)) return 0
    visited.add(from)
    
    const outgoing = this.relationships.filter(r => r.from === from)
    if (outgoing.length === 0) return 1
    
    return 1 + Math.max(...outgoing.map(r => 
      this.findLongestPath(r.to, new Set(visited))
    ))
  }
}

/**
 * Schema migration analyzer
 */
export class SchemaMigration {
  /**
   * Analyze schema changes
   */
  static async analyze(
    oldSchema: GraphQLSchema,
    newSchema: GraphQLSchema
  ): Promise<MigrationAnalysis> {
    const changes = await diff(oldSchema, newSchema)
    
    const breakingChanges: BreakingChange[] = []
    const dangerousChanges: DangerousChange[] = []
    const safeChanges: SafeChange[] = []
    
    changes.forEach((change: Change) => {
      if (change.criticality === 'BREAKING') {
        breakingChanges.push({
          type: change.type,
          description: change.message,
          path: change.path ?? '',
          recommendation: this.getRecommendation(change),
          impact: 'critical',
        })
      } else if (change.criticality === 'DANGEROUS') {
        dangerousChanges.push({
          type: change.type,
          description: change.message,
          path: change.path ?? '',
          recommendation: this.getRecommendation(change),
          impact: 'medium',
        })
      } else {
        safeChanges.push({
          type: change.type,
          description: change.message,
          path: change.path ?? '',
          impact: 'low',
        })
      }
    })
    
    const hasBreakingChanges = breakingChanges.length > 0
    const estimatedImpact = this.estimateImpact(breakingChanges, dangerousChanges)
    const migrationSteps = this.generateMigrationSteps(changes)
    
    return {
      hasBreakingChanges,
      breakingChanges,
      dangerousChanges,
      safeChanges,
      affectedQueries: [], // Would require query analysis
      estimatedImpact,
      migrationSteps,
    }
  }
  
  /**
   * Generate migration script
   */
  static generateMigrationScript(analysis: MigrationAnalysis): string {
    let script = `/**
 * Schema Migration Script
 * Generated: ${new Date().toISOString()}
 * Breaking Changes: ${analysis.breakingChanges.length}
 * Estimated Impact: ${analysis.estimatedImpact}
 */

import { Effect } from 'effect'
import { Federation } from '@cqrs/federation'

export const migrate = Effect.gen(function* () {
`
    
    analysis.migrationSteps.forEach((step, _index) => {
      script += `
  // Step ${step.order}: ${step.description}
  console.log('Executing: ${step.description}')
`
      
      if (step.code) {
        script += `  ${step.code}\n`
      }
      
      if (step.validation) {
        script += `  // Validate: ${step.validation}\n`
      }
    })
    
    script += `
  console.log('Migration completed successfully')
})

// Run migration
Effect.runPromise(migrate).catch(console.error)
`
    
    return script
  }
  
  /**
   * Get recommendation for a change
   */
  private static getRecommendation(change: Change): string {
    if (change.type.includes('REMOVED')) {
      return 'Consider deprecating first before removal'
    }
    if (change.type.includes('TYPE_CHANGED')) {
      return 'Implement backward-compatible type coercion'
    }
    if (change.type.includes('REQUIRED')) {
      return 'Provide default values for existing data'
    }
    return 'Review client usage before applying'
  }
  
  /**
   * Estimate migration impact
   */
  private static estimateImpact(
    breaking: BreakingChange[],
    dangerous: DangerousChange[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (breaking.length > 10) return 'critical'
    if (breaking.length > 5) return 'high'
    if (breaking.length > 0 || dangerous.length > 10) return 'medium'
    return 'low'
  }
  
  /**
   * Generate migration steps
   */
  private static generateMigrationSteps(changes: Change[]): MigrationStep[] {
    const steps: MigrationStep[] = []
    let order = 1
    
    // Group changes by type
    const additions = changes.filter(c => Boolean(c.type.includes('ADDED')))
    const modifications = changes.filter(c  => Boolean(c.type.includes('CHANGED')))
    const removals = changes.filter(c => Boolean(c.type.includes('REMOVED')))
    
    // Add new types/fields first
    additions.forEach(change => {
      steps.push({
        order: order++,
        type: 'add',
        target: change.path ?? '',
        description: change.message,
        code: `// Add: ${change.message}`,
        validation: `Verify new field/type is accessible`,
      })
    })
    
    // Modify existing
    modifications.forEach(change => {
      steps.push({
        order: order++,
        type: 'modify',
        target: change.path ?? '',
        description: change.message,
        code: `// Modify: ${change.message}`,
        validation: `Test backward compatibility`,
      })
    })
    
    // Remove deprecated
    removals.forEach(change => {
      steps.push({
        order: order++,
        type: 'remove',
        target: change.path ?? '',
        description: change.message,
        code: `// Remove: ${change.message}`,
        validation: `Ensure no active usage`,
      })
    })
    
    return steps
  }
}

/**
 * Schema versioning manager
 */
export class SchemaVersionManager {
  private readonly versions: SchemaVersion[] = []
  
  /**
   * Add a new version
   */
  async addVersion(
    schema: GraphQLSchema,
    metadata: Partial<SchemaVersion>
  ): Promise<SchemaVersion> {
    const sdl = printSchema(schema)
    const checksum = this.calculateChecksum(sdl)
    
    const version: SchemaVersion = {
      version: metadata.version ?? this.generateVersion(),
      timestamp: new Date(),
      author: metadata.author ?? '',
      description: metadata.description ?? '',
      checksum,
      breaking: metadata.breaking ?? false,
      changes: metadata.changes ?? 0,
    }
    
    this.versions.push(version)
    return version
  }
  
  /**
   * Get version history
   */
  getHistory(): SchemaVersion[] {
    return [...this.versions].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )
  }
  
  /**
   * Compare two versions
   */
  async compareVersions(
    v1: string,
    v2: string,
    schemas: Map<string, GraphQLSchema>
  ): Promise<MigrationAnalysis | null> {
    const schema1 = schemas.get(v1)
    const schema2 = schemas.get(v2)
    
    if (!schema1 || !schema2) {
      return null
    }
    
    return SchemaMigration.analyze(schema1, schema2)
  }
  
  /**
   * Generate semantic version
   */
  private generateVersion(): string {
    const latest = this.versions[this.versions.length - 1]
    if (!latest) return '1.0.0'
    
    const [major, minor, patch] = latest.version.split('.').map(Number)
    
    if (latest.breaking) {
      return `${(major ?? 0) + 1}.0.0`
    } else if (latest.changes > 0) {
      return `${(major ?? 0)}.${(minor ?? 0) + 1}.0`
    } else {
      return `${(major ?? 0)}.${(minor ?? 0)}.${(patch ?? 0) + 1}`
    }
  }
  
  /**
   * Calculate schema checksum
   */
  private calculateChecksum(sdl: string): string {
    // Simple hash for demo - use crypto in production
    let hash = 0
    for (let i = 0; i < sdl.length; i++) {
      const char = sdl.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return Math.abs(hash).toString(16)
  }
}

// Export visualization formats
export const VisualizationFormats = {
  mermaid: (schema: GraphQLSchema) => new SchemaVisualizer(schema).generateMermaid(),
  graphviz: (schema: GraphQLSchema) => new SchemaVisualizer(schema).generateGraphviz(),
  d3: (schema: GraphQLSchema) => new SchemaVisualizer(schema).generateD3Data(),
}