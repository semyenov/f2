require('../errors-CLhqlpsL.cjs');
const require_performance = require('../performance-Mzmvz4Rl.cjs');
const require_infrastructure = require('../infrastructure-BQZ_7LZD.cjs');

Object.defineProperty(exports, 'FederationErrorBoundaries', {
  enumerable: true,
  get: function () {
    return require_performance.FederationErrorBoundaries;
  }
});
Object.defineProperty(exports, 'PerformanceOptimizations', {
  enumerable: true,
  get: function () {
    return require_performance.PerformanceOptimizations;
  }
});
exports.SubscriptionManager = require_infrastructure.SubscriptionManager;
exports.SubscriptionPresets = require_infrastructure.SubscriptionPresets;
exports.createBasicOptimizedExecutor = require_performance.createBasicOptimizedExecutor;
exports.createDevelopmentOptimizedExecutor = require_performance.createDevelopmentOptimizedExecutor;
exports.createFederationSubscriptionManager = require_infrastructure.createFederationSubscriptionManager;
exports.createProductionBoundary = require_performance.createProductionBoundary;
exports.createProductionOptimizedExecutor = require_performance.createProductionOptimizedExecutor;
exports.createResilientBoundary = require_performance.createResilientBoundary;
exports.createStrictBoundary = require_performance.createStrictBoundary;