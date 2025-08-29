//#region src/tooling/index.d.ts
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
declare const TOOLING_MODULES: {
  readonly cli: "@cqrs/federation/tooling/cli";
  readonly testing: "@cqrs/federation/tooling/testing";
  readonly devtools: "@cqrs/federation/tooling/devtools";
  readonly cloud: "@cqrs/federation/tooling/cloud";
};
//#endregion
export { TOOLING_MODULES };
//# sourceMappingURL=index.d.cts.map