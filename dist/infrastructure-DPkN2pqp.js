import { __export } from "./chunk-Cl8Af3a2.js";
import { FederationErrorBoundaries, PerformanceOptimizations, createBasicOptimizedExecutor, createDevelopmentOptimizedExecutor, createProductionBoundary, createProductionOptimizedExecutor, createResilientBoundary, createStrictBoundary } from "./performance-DO3JMEEu.js";
import { Duration, Effect, Option, Schedule, Stream } from "effect";

//#region src/infrastructure/subscriptions/subscriptions.ts
/**
* Connection manager with Effect patterns
*/
var ConnectionManager = class {
	connection;
	state = { _tag: "disconnected" };
	reconnectAttempt = 0;
	constructor(config) {
		this.config = config;
	}
	/**
	* Connect to WebSocket
	*/
	connect() {
		const self = this;
		return Effect.gen(function* () {
			if (self.state._tag === "connected") return;
			self.state = { _tag: "connecting" };
			yield* Effect.tryPromise({
				try: async () => {
					return new Promise((resolve, reject) => {
						const ws = new WebSocket(self.config.endpoint);
						ws.onopen = () => {
							self.connection = ws;
							self.state = {
								_tag: "connected",
								connectionId: Math.random().toString(36).substring(7)
							};
							self.reconnectAttempt = 0;
							self.config.onConnect?.();
							resolve();
						};
						ws.onerror = (event) => {
							const error = /* @__PURE__ */ new Error(`WebSocket error: ${event.type}`);
							self.state = {
								_tag: "error",
								error
							};
							self.config.onError?.(error);
							reject(error);
						};
						ws.onclose = (event) => {
							self.state = { _tag: "disconnected" };
							self.config.onDisconnect?.(event.reason);
							if (self.config.connectionOptions?.reconnect ?? false) Effect.runPromise(self.reconnect()).catch(() => {});
						};
						if (self.config.connectionOptions?.timeout) setTimeout(() => {
							if (self.state._tag === "connecting") {
								ws.close();
								reject(/* @__PURE__ */ new Error("Connection timeout"));
							}
						}, Duration.toMillis(self.config.connectionOptions.timeout));
					});
				},
				catch: (error) => /* @__PURE__ */ new Error(`Connection failed: ${error}`)
			});
			if (self.config.connectionOptions?.keepAlive && self.connection) yield* Effect.fork(self.startKeepAlive());
		});
	}
	/**
	* Reconnect with backoff
	*/
	reconnect() {
		const self = this;
		return Effect.gen(function* () {
			const maxAttempts = self.config.connectionOptions?.maxReconnectAttempts ?? 5;
			if (self.reconnectAttempt >= maxAttempts) return yield* Effect.fail(/* @__PURE__ */ new Error("Max reconnection attempts reached"));
			self.reconnectAttempt++;
			self.state = {
				_tag: "reconnecting",
				attempt: self.reconnectAttempt
			};
			self.config.onReconnecting?.(self.reconnectAttempt);
			const delay = self.config.connectionOptions?.reconnectDelay ?? Duration.seconds(1);
			const backoffDelay = Duration.millis(Duration.toMillis(delay) * Math.pow(2, self.reconnectAttempt - 1));
			yield* Effect.sleep(backoffDelay);
			yield* self.connect();
		});
	}
	/**
	* Start keep-alive ping
	*/
	startKeepAlive() {
		const self = this;
		return Effect.gen(function* () {
			const interval = self.config.connectionOptions?.keepAlive ?? Duration.seconds(30);
			yield* Effect.repeat(Effect.gen(function* () {
				if (self.connection?.readyState === WebSocket.OPEN) self.connection.send(JSON.stringify({ type: "ping" }));
			}), Schedule.fixed(interval));
		});
	}
	/**
	* Send message
	*/
	send(message) {
		const self = this;
		return Effect.gen(function* () {
			if (!self.connection || self.connection.readyState !== WebSocket.OPEN) return yield* Effect.fail(/* @__PURE__ */ new Error("WebSocket not connected"));
			self.connection.send(JSON.stringify(message));
		});
	}
	/**
	* Disconnect
	*/
	disconnect() {
		const self = this;
		return Effect.sync(() => {
			if (self.connection) {
				self.connection.close();
				self.connection = void 0;
				self.state = { _tag: "disconnected" };
			}
		});
	}
	/**
	* Get state
	*/
	getState() {
		return this.state;
	}
};
/**
* Subscription manager
*/
var SubscriptionManager = class SubscriptionManager {
	connectionManager;
	subscriptions = /* @__PURE__ */ new Map();
	constructor(config) {
		this.connectionManager = new ConnectionManager(config);
	}
	/**
	* Create subscription manager
	*/
	static async create(config) {
		const manager = new SubscriptionManager(config);
		await Effect.runPromise(manager.connect());
		return manager;
	}
	/**
	* Connect to server
	*/
	connect() {
		return this.connectionManager.connect();
	}
	/**
	* Subscribe to events
	*/
	subscribe(subscriptionName, variables, onData, onError) {
		const self = this;
		return Effect.gen(function* () {
			const subscriptionId = Math.random().toString(36).substring(7);
			const stream = Stream.async((emit) => {
				setTimeout(() => {
					emit(Effect.fail(Option.none()));
				}, 100);
			}).pipe(Stream.tapError((error) => Effect.sync(() => onError?.(error))), Stream.tap((data) => Effect.sync(() => onData?.(data))));
			const subscription = {
				id: subscriptionId,
				name: subscriptionName,
				...variables && { variables },
				stream,
				unsubscribe: () => self.unsubscribe(subscriptionId),
				metrics: {
					messagesReceived: 0,
					errors: 0,
					startTime: /* @__PURE__ */ new Date(),
					averageLatency: 0,
					reconnections: 0
				}
			};
			self.subscriptions.set(subscriptionId, subscription);
			yield* self.connectionManager.send({
				id: subscriptionId,
				type: "subscribe",
				payload: {
					query: self.buildSubscriptionQuery(subscriptionName),
					variables
				}
			});
			return subscription;
		});
	}
	/**
	* Unsubscribe
	*/
	unsubscribe(subscriptionId) {
		const self = this;
		return Effect.gen(function* () {
			const subscription = self.subscriptions.get(subscriptionId);
			if (!subscription) return yield* Effect.fail(/* @__PURE__ */ new Error(`Subscription ${subscriptionId} not found`));
			yield* self.connectionManager.send({
				id: subscriptionId,
				type: "unsubscribe"
			});
			self.subscriptions.delete(subscriptionId);
		});
	}
	/**
	* Unsubscribe all
	*/
	unsubscribeAll() {
		const self = this;
		return Effect.forEach(Array.from(self.subscriptions.keys()), (id) => self.unsubscribe(id).pipe(Effect.orElseSucceed(() => void 0)), { discard: true });
	}
	/**
	* Disconnect
	*/
	async disconnect() {
		const self = this;
		await Effect.runPromise(Effect.gen(function* () {
			yield* self.unsubscribeAll();
			yield* self.connectionManager.disconnect();
		}));
	}
	/**
	* Get connection state
	*/
	getState() {
		return this.connectionManager.getState();
	}
	/**
	* Get active subscriptions
	*/
	getSubscriptions() {
		return Array.from(this.subscriptions.values());
	}
	/**
	* Get metrics
	*/
	getMetrics() {
		const subscriptions = this.getSubscriptions();
		return {
			totalSubscriptions: subscriptions.length,
			totalMessages: subscriptions.reduce((sum, s) => sum + s.metrics.messagesReceived, 0),
			totalErrors: subscriptions.reduce((sum, s) => sum + s.metrics.errors, 0),
			connectionState: this.getState()
		};
	}
	/**
	* Build subscription query
	*/
	buildSubscriptionQuery(name) {
		return `subscription ${name} { ${name} { id } }`;
	}
};
/**
* Subscription presets
*/
const SubscriptionPresets = {
	development: (schema, endpoint = "ws://localhost:4000/graphql") => ({
		schema,
		transport: "ws",
		endpoint,
		connectionOptions: {
			reconnect: true,
			maxReconnectAttempts: 10,
			reconnectDelay: Duration.seconds(1),
			keepAlive: Duration.seconds(30),
			timeout: Duration.seconds(5)
		},
		onConnect: () => console.log("🔌 WebSocket connected"),
		onDisconnect: (reason) => console.log("🔌 WebSocket disconnected:", reason),
		onError: (error) => console.error("❌ WebSocket error:", error),
		onReconnecting: (attempt) => console.log(`🔄 Reconnecting... (attempt ${attempt})`)
	}),
	production: (schema, endpoint) => ({
		schema,
		transport: "graphql-ws",
		endpoint,
		connectionOptions: {
			reconnect: true,
			maxReconnectAttempts: 5,
			reconnectDelay: Duration.seconds(2),
			keepAlive: Duration.minutes(1),
			timeout: Duration.seconds(10)
		}
	}),
	testing: (schema) => ({
		schema,
		transport: "ws",
		endpoint: "ws://localhost:4001/graphql",
		connectionOptions: {
			reconnect: false,
			timeout: Duration.seconds(1)
		}
	})
};
/**
* Create federation subscription manager
*/
const createFederationSubscriptionManager = async (config) => {
	const manager = await SubscriptionManager.create(config);
	if (config.entitySubscriptions) for (const entityConfig of config.entitySubscriptions) for (const event of entityConfig.events) {
		const subscriptionName = `on${entityConfig.typename}${event.charAt(0).toUpperCase() + event.slice(1)}`;
		await Effect.runPromise(manager.subscribe(subscriptionName, void 0, (data) => {
			if (!entityConfig.filter || entityConfig.filter(data)) console.log(`📨 ${entityConfig.typename} ${event}:`, data);
		}));
	}
	return manager;
};

//#endregion
//#region src/infrastructure/index.ts
var infrastructure_exports = {};
__export(infrastructure_exports, {
	FederationErrorBoundaries: () => FederationErrorBoundaries,
	PerformanceOptimizations: () => PerformanceOptimizations,
	SubscriptionManager: () => SubscriptionManager,
	SubscriptionPresets: () => SubscriptionPresets,
	createBasicOptimizedExecutor: () => createBasicOptimizedExecutor,
	createDevelopmentOptimizedExecutor: () => createDevelopmentOptimizedExecutor,
	createFederationSubscriptionManager: () => createFederationSubscriptionManager,
	createProductionBoundary: () => createProductionBoundary,
	createProductionOptimizedExecutor: () => createProductionOptimizedExecutor,
	createResilientBoundary: () => createResilientBoundary,
	createStrictBoundary: () => createStrictBoundary
});

//#endregion
export { SubscriptionManager, SubscriptionPresets, createFederationSubscriptionManager, infrastructure_exports };
//# sourceMappingURL=infrastructure-DPkN2pqp.js.map