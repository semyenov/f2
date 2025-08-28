/**
 * # Kubernetes Operator for Federation
 *
 * Provides Kubernetes-native deployment and management of federated GraphQL services
 * with automatic scaling, service discovery, and health monitoring.
 *
 * @example Basic Kubernetes deployment
 * ```typescript
 * import { KubernetesOperator } from '@cqrs/federation/cloud'
 *
 * const operator = await KubernetesOperator.create({
 *   namespace: 'federation',
 *   federation: {
 *     gateway: { replicas: 3, resources: { cpu: '500m', memory: '512Mi' } },
 *     subgraphs: [
 *       { name: 'users', image: 'users:latest', replicas: 2 },
 *       { name: 'products', image: 'products:latest', replicas: 2 }
 *     ]
 *   }
 * })
 *
 * await operator.deploy()
 * ```
 *
 * @module Kubernetes
 * @since 2.4.0
 */

import { Effect, pipe } from 'effect'

/**
 * Kubernetes resource types
 */
export interface K8sResource {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace?: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
  }
  spec?: Record<string, unknown>
  status?: Record<string, unknown>
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  /**
   * Deployment name
   */
  name: string

  /**
   * Container image
   */
  image: string

  /**
   * Number of replicas
   */
  replicas?: number

  /**
   * Resource requirements
   */
  resources?: {
    cpu?: string
    memory?: string
    limits?: {
      cpu?: string
      memory?: string
    }
  }

  /**
   * Environment variables
   */
  env?: Record<string, string>

  /**
   * Health check configuration
   */
  healthCheck?: {
    path?: string
    port?: number
    initialDelaySeconds?: number
    periodSeconds?: number
  }

  /**
   * Autoscaling configuration
   */
  autoscaling?: {
    enabled?: boolean
    minReplicas?: number
    maxReplicas?: number
    targetCPUUtilization?: number
  }
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  /**
   * Service name
   */
  name: string

  /**
   * Service type
   */
  type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer'

  /**
   * Service ports
   */
  ports?: Array<{
    name?: string
    port: number
    targetPort?: number
    protocol?: 'TCP' | 'UDP'
  }>

  /**
   * Selector labels
   */
  selector?: Record<string, string>
}

/**
 * Ingress configuration
 */
export interface IngressConfig {
  /**
   * Ingress name
   */
  name: string

  /**
   * Ingress class
   */
  className?: string

  /**
   * TLS configuration
   */
  tls?: {
    enabled: boolean
    secretName?: string
    hosts?: string[]
  }

  /**
   * Ingress rules
   */
  rules?: Array<{
    host: string
    paths: Array<{
      path: string
      pathType?: 'Prefix' | 'Exact' | 'ImplementationSpecific'
      backend: {
        serviceName: string
        servicePort: number
      }
    }>
  }>
}

/**
 * Kubernetes operator configuration
 */
export interface K8sOperatorConfig {
  /**
   * Kubernetes namespace
   */
  namespace?: string

  /**
   * Cluster configuration
   */
  cluster?: {
    /**
     * Kubernetes API endpoint
     */
    endpoint?: string

    /**
     * Authentication token
     */
    token?: string

    /**
     * CA certificate
     */
    caCert?: string
  }

  /**
   * Federation deployment configuration
   */
  federation: {
    /**
     * Gateway configuration
     */
    gateway?: DeploymentConfig

    /**
     * Subgraph configurations
     */
    subgraphs?: DeploymentConfig[]

    /**
     * Service mesh configuration
     */
    serviceMesh?: {
      enabled?: boolean
      provider?: 'istio' | 'linkerd' | 'consul'
    }
  }

  /**
   * Monitoring configuration
   */
  monitoring?: {
    /**
     * Enable Prometheus metrics
     */
    prometheus?: boolean

    /**
     * Enable Grafana dashboards
     */
    grafana?: boolean

    /**
     * Enable distributed tracing
     */
    tracing?: {
      enabled?: boolean
      provider?: 'jaeger' | 'zipkin' | 'tempo'
    }
  }

  /**
   * Security configuration
   */
  security?: {
    /**
     * Network policies
     */
    networkPolicies?: boolean

    /**
     * Pod security policies
     */
    podSecurityPolicies?: boolean

    /**
     * RBAC configuration
     */
    rbac?: boolean
  }
}

/**
 * Kubernetes client interface
 */
interface K8sClient {
  /**
   * Apply resource
   */
  apply(resource: K8sResource): Effect.Effect<void, Error>

  /**
   * Delete resource
   */
  delete(resource: K8sResource): Effect.Effect<void, Error>

  /**
   * Get resource
   */
  get(kind: string, name: string, namespace?: string): Effect.Effect<K8sResource, Error>

  /**
   * List resources
   */
  list(kind: string, namespace?: string): Effect.Effect<K8sResource[], Error>

  /**
   * Watch resources
   */
  watch(kind: string, namespace?: string): Effect.Effect<ReadonlyArray<K8sResource>, Error>
}

/**
 * Mock Kubernetes client
 */
class MockK8sClient implements K8sClient {
  private readonly resources: Map<string, K8sResource> = new Map()

  apply(resource: K8sResource): Effect.Effect<void, Error> {
    return pipe(
      Effect.sync(() => {
        const key = `${resource.kind}/${resource.metadata.namespace ?? 'default'}/${resource.metadata.name}`
        this.resources.set(key, resource)
        console.log(`✅ Applied ${resource.kind} ${resource.metadata.name}`)
      })
    )
  }

  delete(resource: K8sResource): Effect.Effect<void, Error> {
    return pipe(
      Effect.sync(() => {
        const key = `${resource.kind}/${resource.metadata.namespace ?? 'default'}/${resource.metadata.name}`
        this.resources.delete(key)
        console.log(`🗑️  Deleted ${resource.kind} ${resource.metadata.name}`)
      })
    )
  }

  get(kind: string, name: string, namespace = 'default'): Effect.Effect<K8sResource, Error> {
    return pipe(
      Effect.sync(() => {
        const key = `${kind}/${namespace}/${name}`
        const resource = this.resources.get(key)
        return resource
      }),
      Effect.flatMap(resource =>
        resource
          ? Effect.succeed(resource)
          : Effect.fail(new Error(`Resource not found: ${kind}/${name}`))
      )
    )
  }

  list(kind: string, namespace = 'default'): Effect.Effect<K8sResource[], Error> {
    return pipe(
      Effect.sync(() => {
        const prefix = `${kind}/${namespace}/`
        return Array.from(this.resources.entries())
          .filter(([key]) => key.startsWith(prefix))
          .map(([_, resource]) => resource)
      })
    )
  }

  watch(kind: string, namespace = 'default'): Effect.Effect<ReadonlyArray<K8sResource>, Error> {
    return this.list(kind, namespace)
  }
}

/**
 * Kubernetes operator
 */
export class KubernetesOperator {
  private readonly client: K8sClient
  private readonly deployedResources: Set<string> = new Set()

  constructor(private readonly config: K8sOperatorConfig) {
    this.client = new MockK8sClient() // Would use real K8s client in production
  }

  /**
   * Create operator instance
   */
  static async create(config: K8sOperatorConfig): Promise<KubernetesOperator> {
    const operator = new KubernetesOperator(config)
    await Effect.runPromise(operator.initialize())
    return operator
  }

  /**
   * Initialize operator
   */
  private initialize(): Effect.Effect<void, Error> {
    return pipe(
      Effect.sync(() => {
        console.log(
          `🚀 Initializing Kubernetes operator in namespace: ${this.config.namespace ?? 'default'}`
        )
      }),
      // Create namespace if needed
      Effect.flatMap(() => this.createNamespace()),
      // Setup RBAC if needed
      Effect.flatMap(() =>
        this.config.security?.rbac ? this.setupRBAC() : Effect.succeed(undefined)
      )
    )
  }

  /**
   * Deploy federation
   */
  async deploy(): Promise<void> {
    await Effect.runPromise(
      pipe(
        // Deploy gateway
        this.deployGateway(),
        // Deploy subgraphs
        Effect.flatMap(() => this.deploySubgraphs()),
        // Setup ingress
        Effect.flatMap(() => this.setupIngress()),
        // Setup monitoring
        Effect.flatMap(() =>
          this.config.monitoring ? this.setupMonitoring() : Effect.succeed(undefined)
        ),
        // Setup service mesh
        Effect.flatMap(() =>
          (this.config.federation.serviceMesh?.enabled ?? false)
            ? this.setupServiceMesh()
            : Effect.succeed(undefined)
        )
      )
    )
  }

  /**
   * Create namespace
   */
  private createNamespace(): Effect.Effect<void, Error> {
    const namespace: K8sResource = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: this.config.namespace ?? 'default',
        labels: {
          'federation.io/managed': 'true',
        },
      },
    }

    return this.client.apply(namespace)
  }

  /**
   * Setup RBAC
   */
  private setupRBAC(): Effect.Effect<void, Error> {
    const serviceAccount: K8sResource = {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: 'federation-operator',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
      },
    }

    const role: K8sResource = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'Role',
      metadata: {
        name: 'federation-operator',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
      },
      spec: {
        rules: [
          {
            apiGroups: ['', 'apps', 'networking.k8s.io'],
            resources: ['deployments', 'services', 'configmaps', 'ingresses'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
        ],
      },
    }

    const roleBinding: K8sResource = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'RoleBinding',
      metadata: {
        name: 'federation-operator',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
      },
      spec: {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'federation-operator',
        },
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'federation-operator',
            ...(this.config.namespace != null && { namespace: this.config.namespace }),
          },
        ],
      },
    }

    return pipe(
      Effect.all([
        this.client.apply(serviceAccount),
        this.client.apply(role),
        this.client.apply(roleBinding),
      ]),
      Effect.map(() => undefined)
    )
  }

  /**
   * Deploy gateway
   */
  private deployGateway(): Effect.Effect<void, Error> {
    const gateway = this.config.federation.gateway
    if (!gateway) return Effect.succeed(undefined)

    const deployment: K8sResource = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: gateway.name ?? 'federation-gateway',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
        labels: {
          app: 'federation-gateway',
          component: 'gateway',
        },
      },
      spec: {
        replicas: gateway.replicas ?? 3,
        selector: {
          matchLabels: {
            app: 'federation-gateway',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'federation-gateway',
              component: 'gateway',
            },
          },
          spec: {
            containers: [
              {
                name: 'gateway',
                image: gateway.image,
                ports: [{ containerPort: 4000 }],
                resources: {
                  requests: {
                    cpu: gateway.resources?.cpu ?? '250m',
                    memory: gateway.resources?.memory ?? '256Mi',
                  },
                  limits: {
                    cpu: gateway.resources?.limits?.cpu ?? '1000m',
                    memory: gateway.resources?.limits?.memory ?? '1Gi',
                  },
                },
                env: Object.entries(gateway.env ?? {}).map(([name, value]) => ({ name, value })),
                livenessProbe: {
                  httpGet: {
                    path: gateway.healthCheck?.path ?? '/health',
                    port: gateway.healthCheck?.port ?? 4000,
                  },
                  initialDelaySeconds: gateway.healthCheck?.initialDelaySeconds ?? 30,
                  periodSeconds: gateway.healthCheck?.periodSeconds ?? 10,
                },
              },
            ],
          },
        },
      },
    }

    const service: K8sResource = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'federation-gateway',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
      },
      spec: {
        selector: {
          app: 'federation-gateway',
        },
        ports: [
          {
            port: 4000,
            targetPort: 4000,
            protocol: 'TCP',
          },
        ],
      },
    }

    // Create HPA if autoscaling is enabled
    const hpa =
      (gateway.autoscaling?.enabled ?? false)
        ? {
            apiVersion: 'autoscaling/v2',
            kind: 'HorizontalPodAutoscaler',
            metadata: {
              name: 'federation-gateway',
              ...(this.config.namespace != null && { namespace: this.config.namespace }),
            },
            spec: {
              scaleTargetRef: {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                name: 'federation-gateway',
              },
              minReplicas: gateway.autoscaling?.minReplicas ?? 2,
              maxReplicas: gateway.autoscaling?.maxReplicas ?? 10,
              metrics: [
                {
                  type: 'Resource',
                  resource: {
                    name: 'cpu',
                    target: {
                      type: 'Utilization',
                      averageUtilization: gateway.autoscaling?.targetCPUUtilization ?? 70,
                    },
                  },
                },
              ],
            },
          }
        : null

    return pipe(
      Effect.all([
        this.client.apply(deployment),
        this.client.apply(service),
        ...(hpa ? [this.client.apply(hpa)] : []),
      ]),
      Effect.tap(() =>
        Effect.sync(() => {
          this.deployedResources.add('gateway')
        })
      ),
      Effect.map(() => undefined)
    )
  }

  /**
   * Deploy subgraphs
   */
  private deploySubgraphs(): Effect.Effect<void, Error> {
    const subgraphs = this.config.federation.subgraphs ?? []

    return pipe(
      Effect.forEach(subgraphs, subgraph => {
        const deployment: K8sResource = {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: subgraph.name,
            ...(this.config.namespace && { namespace: this.config.namespace }),
            labels: {
              app: subgraph.name,
              component: 'subgraph',
            },
          },
          spec: {
            replicas: subgraph.replicas ?? 2,
            selector: {
              matchLabels: {
                app: subgraph.name,
              },
            },
            template: {
              metadata: {
                labels: {
                  app: subgraph.name,
                  component: 'subgraph',
                },
              },
              spec: {
                containers: [
                  {
                    name: subgraph.name,
                    image: subgraph.image,
                    ports: [{ containerPort: 4001 }],
                    resources: {
                      requests: {
                        cpu: subgraph.resources?.cpu ?? '100m',
                        memory: subgraph.resources?.memory ?? '128Mi',
                      },
                    },
                    env: Object.entries(subgraph.env ?? {}).map(([name, value]) => ({
                      name,
                      value,
                    })),
                  },
                ],
              },
            },
          },
        }

        const service: K8sResource = {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: subgraph.name,
            ...(this.config.namespace != null && { namespace: this.config.namespace }),
          },
          spec: {
            selector: {
              app: subgraph.name,
            },
            ports: [
              {
                port: 4001,
                targetPort: 4001,
                protocol: 'TCP',
              },
            ],
          },
        }

        return pipe(
          Effect.all([this.client.apply(deployment), this.client.apply(service)]),
          Effect.tap(() =>
            Effect.sync(() => {
              this.deployedResources.add(subgraph.name)
            })
          )
        )
      }),
      Effect.map(() => undefined)
    )
  }

  /**
   * Setup ingress
   */
  private setupIngress(): Effect.Effect<void, Error> {
    const ingress: K8sResource = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: 'federation-ingress',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/',
        },
      },
      spec: {
        ingressClassName: 'nginx',
        rules: [
          {
            host: 'federation.example.com',
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: 'federation-gateway',
                      port: {
                        number: 4000,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }

    return this.client.apply(ingress)
  }

  /**
   * Setup monitoring
   */
  private setupMonitoring(): Effect.Effect<void, Error> {
    const prometheusConfig: K8sResource = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'prometheus-config',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
      },
    }
    const configData = {
      'prometheus.yml': `
          global:
            scrape_interval: 15s
          scrape_configs:
            - job_name: 'federation'
              kubernetes_sd_configs:
                - role: pod
                  namespaces:
                    names:
                      - ${this.config.namespace}
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_label_component]
                  action: keep
                  regex: (gateway|subgraph)
        `,
    }

    // ConfigMaps need special handling for data field
    return this.client.apply({ ...prometheusConfig, ...{ data: configData } } as K8sResource)
  }

  /**
   * Setup service mesh
   */
  private setupServiceMesh(): Effect.Effect<void, Error> {
    // const _provider = this.config.federation.serviceMesh?.provider || 'istio'

    const virtualService: K8sResource = {
      apiVersion: 'networking.istio.io/v1beta1',
      kind: 'VirtualService',
      metadata: {
        name: 'federation-vs',
        ...(this.config.namespace != null && { namespace: this.config.namespace }),
      },
      spec: {
        hosts: ['federation.example.com'],
        gateways: ['federation-gateway'],
        http: [
          {
            match: [{ uri: { prefix: '/' } }],
            route: [
              {
                destination: {
                  host: 'federation-gateway',
                  port: { number: 4000 },
                },
              },
            ],
          },
        ],
      },
    }

    return this.client.apply(virtualService)
  }

  /**
   * Scale deployment
   */
  async scale(component: string, replicas: number): Promise<void> {
    await Effect.runPromise(
      pipe(
        this.client.get('Deployment', component, this.config.namespace),
        Effect.flatMap(deployment => {
          deployment.spec = deployment.spec ?? {}
          deployment.spec['replicas'] = replicas
          return this.client.apply(deployment)
        }),
        Effect.tap(() =>
          Effect.sync(() => console.log(`⚖️  Scaled ${component} to ${replicas} replicas`))
        )
      )
    )
  }

  /**
   * Get status
   */
  async getStatus(): Promise<Record<string, unknown>> {
    return Effect.runPromise(
      pipe(
        Effect.all({
          deployments: this.client.list('Deployment', this.config.namespace),
          services: this.client.list('Service', this.config.namespace),
          ingresses: this.client.list('Ingress', this.config.namespace),
        }),
        Effect.map(({ deployments, services, ingresses }) => ({
          ...(this.config.namespace != null && { namespace: this.config.namespace }),
          deployments: deployments.length,
          services: services.length,
          ingresses: ingresses.length,
          components: Array.from(this.deployedResources),
        }))
      )
    )
  }

  /**
   * Delete all resources
   */
  async teardown(): Promise<void> {
    await Effect.runPromise(
      pipe(
        Effect.forEach(['Deployment', 'Service', 'Ingress', 'ConfigMap'], kind =>
          this.client
            .list(kind, this.config.namespace)
            .pipe(
              Effect.flatMap(resources =>
                Effect.forEach(resources, resource => this.client.delete(resource))
              )
            )
        ),
        Effect.tap(() =>
          Effect.sync(() => {
            this.deployedResources.clear()
            console.log('🗑️  Teardown complete')
          })
        )
      )
    )
  }
}

/**
 * Kubernetes presets
 */
export const K8sPresets = {
  /**
   * Development preset
   */
  development: (): K8sOperatorConfig => ({
    namespace: 'federation-dev',
    federation: {
      gateway: {
        name: 'gateway',
        image: 'federation-gateway:dev',
        replicas: 1,
        resources: { cpu: '100m', memory: '128Mi' },
      },
      subgraphs: [],
    },
    monitoring: {
      prometheus: true,
      grafana: true,
    },
  }),

  /**
   * Production preset
   */
  production: (
    gatewayImage: string,
    subgraphImages: Array<{ name: string; image: string }>
  ): K8sOperatorConfig => ({
    namespace: 'federation-prod',
    federation: {
      gateway: {
        name: 'gateway',
        image: gatewayImage,
        replicas: 3,
        resources: {
          cpu: '500m',
          memory: '512Mi',
          limits: { cpu: '2000m', memory: '2Gi' },
        },
        autoscaling: {
          enabled: true,
          minReplicas: 3,
          maxReplicas: 10,
          targetCPUUtilization: 70,
        },
      },
      subgraphs: subgraphImages.map(sg => ({
        name: sg.name,
        image: sg.image,
        replicas: 2,
        resources: { cpu: '250m', memory: '256Mi' },
        autoscaling: {
          enabled: true,
          minReplicas: 2,
          maxReplicas: 5,
          targetCPUUtilization: 80,
        },
      })),
      serviceMesh: {
        enabled: true,
        provider: 'istio',
      },
    },
    monitoring: {
      prometheus: true,
      grafana: true,
      tracing: {
        enabled: true,
        provider: 'jaeger',
      },
    },
    security: {
      networkPolicies: true,
      podSecurityPolicies: true,
      rbac: true,
    },
  }),

  /**
   * High availability preset
   */
  highAvailability: (gatewayImage: string): K8sOperatorConfig => ({
    namespace: 'federation-ha',
    federation: {
      gateway: {
        name: 'gateway',
        image: gatewayImage,
        replicas: 5,
        resources: {
          cpu: '1000m',
          memory: '1Gi',
          limits: { cpu: '4000m', memory: '4Gi' },
        },
        autoscaling: {
          enabled: true,
          minReplicas: 5,
          maxReplicas: 20,
          targetCPUUtilization: 60,
        },
      },
      serviceMesh: {
        enabled: true,
        provider: 'istio',
      },
    },
  }),
}
