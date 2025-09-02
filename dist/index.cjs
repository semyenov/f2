const require_errors = require('./errors-CLhqlpsL.cjs');
const require_logger = require('./logger-BMsCLiUG.cjs');
const require_runtime = require('./runtime-BiNFvLdM.cjs');
const require_subgraph = require('./subgraph-ReCCOQYz.cjs');
const require_performance = require('./performance-Mzmvz4Rl.cjs');
const require_federation = require('./federation-DvDzGQSs.cjs');
const require_infrastructure = require('./infrastructure-BQZ_7LZD.cjs');
const require_api = require('./api-BtlIMRyw.cjs');

//#region src/index.ts
/**
* Framework version
*/
const VERSION = "2.0.0";
/**
* Framework metadata
*/
const FRAMEWORK_INFO = {
	name: "@cqrs/federation",
	version: VERSION,
	description: "Apollo Federation 2.x with Effect-TS",
	features: [
		"Effect-First Architecture",
		"Apollo Federation 2.x Support",
		"Ultra-Strict TypeScript",
		"Algebraic Error System",
		"Performance Optimizations",
		"Schema-First Development",
		"Circuit Breakers",
		"Hot Reload",
		"Layer-based Dependency Injection",
		"Effect.gen Patterns",
		"Structured Logging",
		"Type-safe Configuration",
		"Pattern Matching Error Handling",
		"Modern Test Infrastructure"
	]
};

//#endregion
Object.defineProperty(exports, 'Api', {
  enumerable: true,
  get: function () {
    return require_api.api_exports;
  }
});
exports.CompositionError = require_errors.CompositionError;
Object.defineProperty(exports, 'ErrorFactory', {
  enumerable: true,
  get: function () {
    return require_errors.ErrorFactory;
  }
});
exports.FRAMEWORK_INFO = FRAMEWORK_INFO;
Object.defineProperty(exports, 'Federation', {
  enumerable: true,
  get: function () {
    return require_federation.federation_exports;
  }
});
exports.FederationComposer = require_subgraph.FederationComposer;
exports.FederationEntityBuilder = require_logger.FederationEntityBuilder;
exports.FederationError = require_errors.FederationError;
Object.defineProperty(exports, 'FederationErrorBoundaries', {
  enumerable: true,
  get: function () {
    return require_performance.FederationErrorBoundaries;
  }
});
Object.defineProperty(exports, 'Infrastructure', {
  enumerable: true,
  get: function () {
    return require_infrastructure.infrastructure_exports;
  }
});
Object.defineProperty(exports, 'PerformanceOptimizations', {
  enumerable: true,
  get: function () {
    return require_performance.PerformanceOptimizations;
  }
});
Object.defineProperty(exports, 'Runtime', {
  enumerable: true,
  get: function () {
    return require_runtime.runtime_exports;
  }
});
Object.defineProperty(exports, 'SubgraphManagement', {
  enumerable: true,
  get: function () {
    return require_subgraph.SubgraphManagement;
  }
});
exports.VERSION = VERSION;
exports.ValidationError = require_errors.ValidationError;
exports.createEntityBuilder = require_logger.createEntityBuilder;
exports.toFederationEntity = require_logger.toFederationEntity;