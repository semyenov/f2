import { CompositionError, ErrorFactory, FederationError, ValidationError } from "./errors-lo2u-uDT.js";
import { FederationEntityBuilder, createEntityBuilder, toFederationEntity } from "./logger-KTC2xxEE.js";
import { runtime_exports } from "./runtime-BaqbDDeV.js";
import { FederationComposer, SubgraphManagement } from "./subgraph-B3gfDbHz.js";
import { FederationErrorBoundaries, PerformanceOptimizations } from "./performance-DO3JMEEu.js";
import { federation_exports } from "./federation-tSBvjsJC.js";
import { infrastructure_exports } from "./infrastructure-DPkN2pqp.js";
import { api_exports } from "./api-Ij0uBuEX.js";

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
export { api_exports as Api, CompositionError, ErrorFactory, FRAMEWORK_INFO, federation_exports as Federation, FederationComposer, FederationEntityBuilder, FederationError, FederationErrorBoundaries, infrastructure_exports as Infrastructure, PerformanceOptimizations, runtime_exports as Runtime, SubgraphManagement, VERSION, ValidationError, createEntityBuilder, toFederationEntity };
//# sourceMappingURL=index.js.map