/**
 * Layer compositions for Federation Framework v2
 * 
 * Provides pre-composed layers for different environments and use cases
 */

import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import { FederationConfigLive } from './config.js'
import { 
  FederationLoggerLive,
  developmentLogger,
  productionLogger,
  testLogger
} from './logger.js'

// Base layer that all applications need
export const CoreServicesLive = Layer.mergeAll(
  FederationConfigLive,
  FederationLoggerLive
)

// Development environment layer
export const DevelopmentLayerLive = Layer.mergeAll(
  CoreServicesLive,
  developmentLogger,
  Logger.pretty // Pretty-print logs in development
)

// Production environment layer  
export const ProductionLayerLive = Layer.mergeAll(
  CoreServicesLive,
  productionLogger,
  Logger.json // JSON logs for production
)

// Testing environment layer
export const TestLayerLive = Layer.mergeAll(
  CoreServicesLive,
  testLogger
)

// Minimal layer for basic functionality
export const MinimalLayerLive = FederationConfigLive

/**
 * Helper function to create environment-specific layers
 */
export const createEnvironmentLayer = (environment?: string) => {
  switch (environment) {
    case 'production':
      return ProductionLayerLive
    case 'test':
      return TestLayerLive
    case 'development':
    default:
      return DevelopmentLayerLive
  }
}