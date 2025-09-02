/**
 * Tooling Module - Development and deployment tools
 *
 * This module provides tools for development, testing, and deployment:
 * - CLI for project scaffolding and entity generation
 * - Testing harness and utilities
 * - DevTools including playground and profiler
 * - Cloud deployment for Kubernetes and multi-cloud
 *
 * @module Tooling
 * @since 3.0.0
 */

// Note: Tooling modules are typically imported directly, not from this index
// This file exists mainly for documentation purposes

export const TOOLING_MODULES = {
  cli: '@cqrs/federation/tooling/cli',
  testing: '@cqrs/federation/tooling/testing',
  devtools: '@cqrs/federation/tooling/devtools',
  cloud: '@cqrs/federation/tooling/cloud',
} as const
