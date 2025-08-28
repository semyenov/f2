/**
 * Example of using path mappings in the Federation Framework
 * 
 * This file demonstrates how to use the @ path mappings instead of relative imports
 */

// Main src directory imports using @/*
import type { DomainError, HealthStatus } from '@/core/types.js'
import type { ValidationError } from '@/core/errors.js'

// Specific directory imports using @module/*  
import { createUltraStrictEntityBuilder } from '@experimental/ultra-strict-entity-builder.js'
import type { FederationComposer } from '@federation/composer.js'
import { ASTConversion } from '@schema/ast-conversion.js'

// Example function showing clean imports
export const demonstratePathMappings = () => {
  console.log('✅ Path mappings working correctly!')
  console.log('   - @/* for main src directory')
  console.log('   - @core/* for core functionality')  
  console.log('   - @federation/* for federation features')
  console.log('   - @experimental/* for experimental patterns')
  console.log('   - @schema/* for schema processing')
}

// This file is just for demonstration - it won't be included in builds
// due to being excluded in tsconfig.build.json