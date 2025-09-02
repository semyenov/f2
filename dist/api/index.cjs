require('../errors-CLhqlpsL.cjs');
const require_logger = require('../logger-BMsCLiUG.cjs');
const require_subgraph = require('../subgraph-ReCCOQYz.cjs');
const require_performance = require('../performance-Mzmvz4Rl.cjs');
const require_api = require('../api-BtlIMRyw.cjs');

Object.defineProperty(exports, 'Advanced', {
  enumerable: true,
  get: function () {
    return require_api.advanced_exports;
  }
});
exports.Federation = require_api.Federation;
exports.FederationEntityBuilder = require_logger.FederationEntityBuilder;
Object.defineProperty(exports, 'FederationErrorBoundaries', {
  enumerable: true,
  get: function () {
    return require_performance.FederationErrorBoundaries;
  }
});
exports.Patterns = require_api.Patterns;
Object.defineProperty(exports, 'PerformanceOptimizations', {
  enumerable: true,
  get: function () {
    return require_performance.PerformanceOptimizations;
  }
});
exports.Presets = require_api.Presets;
exports.QuickEntityBuilder = require_api.QuickEntityBuilder;
Object.defineProperty(exports, 'SubgraphManagement', {
  enumerable: true,
  get: function () {
    return require_subgraph.SubgraphManagement;
  }
});
exports.createEntityBuilder = require_logger.createEntityBuilder;