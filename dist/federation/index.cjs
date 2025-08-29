require('../errors-CLhqlpsL.cjs');
const require_subgraph = require('../subgraph-ReCCOQYz.cjs');
const require_federation = require('../federation-DvDzGQSs.cjs');

exports.FederationComposer = require_subgraph.FederationComposer;
exports.FederationComposerLive = require_subgraph.FederationComposerLive;
exports.MeshIntegration = require_federation.MeshIntegration;
exports.MeshPresets = require_federation.MeshPresets;
exports.MeshUtils = require_federation.MeshUtils;
Object.defineProperty(exports, 'SubgraphManagement', {
  enumerable: true,
  get: function () {
    return require_subgraph.SubgraphManagement;
  }
});
exports.compose = require_subgraph.compose;
exports.createDynamicRegistry = require_subgraph.createDynamicRegistry;
exports.createFederatedSchema = require_subgraph.createFederatedSchema;
exports.createMonitoredRegistry = require_subgraph.createMonitoredRegistry;
exports.createStaticRegistry = require_subgraph.createStaticRegistry;
exports.handleCompositionError = require_subgraph.handleCompositionError;
exports.validateConfig = require_subgraph.validateConfig;