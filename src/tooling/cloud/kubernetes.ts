/**
 * # Kubernetes Operator for Federation
 *
 * Provides Kubernetes-native deployment and management of federated GraphQL services
 * with automatic scaling, service discovery, and health monitoring using Pulumi.
 *
 * @example Basic Kubernetes deployment
 * ```typescript
 * import { KubernetesOperator } from '@cqrs/federation/cloud'
 *
 * const operator = new KubernetesOperator('federation', {
 *   namespace: 'federation',
 *   federation: {
 *     gateway: { replicas: 3, resources: { cpu: '500m', memory: '512Mi' } },
 *     subgraphs: [
 *       { name: 'users', image: 'users:latest', replicas: 2 },
 *       { name: 'products', image: 'products:latest', replicas: 2 }
 *     ]
 *   }
 * })
 * ```
 *
 * @module Kubernetes
 * @since 2.4.0
 */

import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'

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
   * Host for ingress rules
   */
  host?: string

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
   * Provider configuration
   */
  provider: k8s.Provider

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
   * Ingress configuration
   */
  ingress?: IngressConfig

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
 * Gateway component - Pulumi Component Resource
 */
class GatewayComponent extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment
  public readonly service: k8s.core.v1.Service
  public readonly hpa?: k8s.autoscaling.v2.HorizontalPodAutoscaler

  constructor(
    name: string,
    args: {
      namespace: string
      config: DeploymentConfig
      provider?: k8s.Provider
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('federation:gateway', name, args, opts)

    const labels = {
      app: args.config.name ?? 'federation-gateway',
      component: 'gateway',
      'federation.io/managed': 'true',
    }

    // Create Deployment
    this.deployment = new k8s.apps.v1.Deployment(
      `${name}-deployment`,
      {
        metadata: {
          name: args.config.name ?? 'federation-gateway',
          namespace: args.namespace,
          labels,
        },
        spec: {
          replicas: args.config.replicas ?? 3,
          selector: {
            matchLabels: {
              app: args.config.name ?? 'federation-gateway',
            },
          },
          template: {
            metadata: {
              labels,
            },
            spec: {
              containers: [
                {
                  name: 'gateway',
                  image: args.config.image,
                  ports: [{ containerPort: 4000 }],
                  resources: {
                    requests: {
                      cpu: args.config.resources?.cpu ?? '250m',
                      memory: args.config.resources?.memory ?? '256Mi',
                    },
                    limits: {
                      cpu: args.config.resources?.limits?.cpu ?? '1000m',
                      memory: args.config.resources?.limits?.memory ?? '1Gi',
                    },
                  },
                  ...(args.config.env && {
                    env: Object.entries(args.config.env).map(([name, value]) => ({ name, value })),
                  }),
                  livenessProbe: {
                    httpGet: {
                      path: args.config.healthCheck?.path ?? '/health',
                      port: args.config.healthCheck?.port ?? 4000,
                    },
                    initialDelaySeconds: args.config.healthCheck?.initialDelaySeconds ?? 30,
                    periodSeconds: args.config.healthCheck?.periodSeconds ?? 10,
                  },
                  readinessProbe: {
                    httpGet: {
                      path: args.config.healthCheck?.path ?? '/health',
                      port: args.config.healthCheck?.port ?? 4000,
                    },
                    initialDelaySeconds: args.config.healthCheck?.initialDelaySeconds ?? 10,
                    periodSeconds: args.config.healthCheck?.periodSeconds ?? 5,
                  },
                },
              ],
            },
          },
        },
      },
      { parent: this, ...(args.provider && { provider: args.provider }) }
    )

    // Create Service
    this.service = new k8s.core.v1.Service(
      `${name}-service`,
      {
        metadata: {
          name: args.config.name ?? 'federation-gateway',
          namespace: args.namespace,
          labels,
        },
        spec: {
          selector: {
            app: args.config.name ?? 'federation-gateway',
          },
          ports: [
            {
              name: 'http',
              port: 4000,
              targetPort: 4000,
              protocol: 'TCP',
            },
          ],
          type: 'ClusterIP',
        },
      },
      { parent: this, ...(args.provider && { provider: args.provider }) }
    )

    // Create HPA if autoscaling is enabled
    const autoscaling = args.config.autoscaling ?? { enabled: false }
    if (autoscaling.enabled ?? false) {
      this.hpa = new k8s.autoscaling.v2.HorizontalPodAutoscaler(
        `${name}-hpa`,
        {
          metadata: {
            name: args.config.name ?? 'federation-gateway',
            namespace: args.namespace,
            labels,
          },
          spec: {
            scaleTargetRef: {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              name: this.deployment.metadata.name,
            },
            minReplicas: autoscaling.minReplicas ?? 2,
            maxReplicas: autoscaling.maxReplicas ?? 10,
            metrics: [
              {
                type: 'Resource',
                resource: {
                  name: 'cpu',
                  target: {
                    type: 'Utilization',
                    averageUtilization: autoscaling.targetCPUUtilization ?? 70,
                  },
                },
              },
            ],
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )
    }

    this.registerOutputs({
      deployment: this.deployment.id,
      service: this.service.id,
      hpa: this.hpa?.id,
    })
  }
}

/**
 * Subgraph component - Pulumi Component Resource
 */
class SubgraphComponent extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment
  public readonly service: k8s.core.v1.Service
  public readonly hpa?: k8s.autoscaling.v2.HorizontalPodAutoscaler

  constructor(
    name: string,
    args: {
      namespace: string
      config: DeploymentConfig
      provider?: k8s.Provider
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('federation:subgraph', name, args, opts)

    const labels = {
      app: args.config.name,
      component: 'subgraph',
      'federation.io/managed': 'true',
    }

    // Create Deployment
    this.deployment = new k8s.apps.v1.Deployment(
      `${name}-deployment`,
      {
        metadata: {
          name: args.config.name,
          namespace: args.namespace,
          labels,
        },
        spec: {
          replicas: args.config.replicas ?? 2,
          selector: {
            matchLabels: {
              app: args.config.name,
            },
          },
          template: {
            metadata: {
              labels,
              annotations: {
                'prometheus.io/scrape': 'true',
                'prometheus.io/port': '4001',
                'prometheus.io/path': '/metrics',
              },
            },
            spec: {
              containers: [
                {
                  name: args.config.name,
                  image: args.config.image,
                  ports: [{ containerPort: 4001 }],
                  resources: {
                    requests: {
                      cpu: args.config.resources?.cpu ?? '100m',
                      memory: args.config.resources?.memory ?? '128Mi',
                    },
                    limits: {
                      cpu: args.config.resources?.limits?.cpu ?? '500m',
                      memory: args.config.resources?.limits?.memory ?? '512Mi',
                    },
                  },
                  ...(args.config.env && {
                    env: Object.entries(args.config.env).map(([name, value]) => ({ name, value })),
                  }),
                  ...(args.config.healthCheck && {
                    livenessProbe: {
                      httpGet: {
                        path: args.config.healthCheck.path ?? '/health',
                        port: args.config.healthCheck.port ?? 4001,
                      },
                      initialDelaySeconds: args.config.healthCheck.initialDelaySeconds ?? 30,
                      periodSeconds: args.config.healthCheck.periodSeconds ?? 10,
                    },
                    readinessProbe: {
                      httpGet: {
                        path: args.config.healthCheck.path ?? '/health',
                        port: args.config.healthCheck.port ?? 4001,
                      },
                      initialDelaySeconds: args.config.healthCheck.initialDelaySeconds ?? 10,
                      periodSeconds: args.config.healthCheck.periodSeconds ?? 5,
                    },
                  }),
                },
              ],
            },
          },
        },
      },
      { parent: this, ...(args.provider && { provider: args.provider }) }
    )

    // Create Service
    this.service = new k8s.core.v1.Service(
      `${name}-service`,
      {
        metadata: {
          name: args.config.name,
          namespace: args.namespace,
          labels,
        },
        spec: {
          selector: {
            app: args.config.name,
          },
          ports: [
            {
              name: 'http',
              port: 4001,
              targetPort: 4001,
              protocol: 'TCP',
            },
          ],
          type: 'ClusterIP',
        },
      },
      { parent: this, ...(args.provider && { provider: args.provider }) }
    )

    // Create HPA if autoscaling is enabled
    if (args.config.autoscaling?.enabled) {
      this.hpa = new k8s.autoscaling.v2.HorizontalPodAutoscaler(
        `${name}-hpa`,
        {
          metadata: {
            name: args.config.name,
            namespace: args.namespace,
            labels,
          },
          spec: {
            scaleTargetRef: {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              name: this.deployment.metadata.name,
            },
            minReplicas: args.config.autoscaling.minReplicas ?? 1,
            maxReplicas: args.config.autoscaling.maxReplicas ?? 5,
            metrics: [
              {
                type: 'Resource',
                resource: {
                  name: 'cpu',
                  target: {
                    type: 'Utilization',
                    averageUtilization: args.config.autoscaling.targetCPUUtilization ?? 80,
                  },
                },
              },
            ],
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )
    }

    this.registerOutputs({
      deployment: this.deployment.id,
      service: this.service.id,
      hpa: this.hpa?.id,
    })
  }
}

/**
 * Monitoring component - Pulumi Component Resource
 */
class MonitoringComponent extends pulumi.ComponentResource {
  public readonly prometheusConfigMap?: k8s.core.v1.ConfigMap
  public readonly prometheusDeployment?: k8s.apps.v1.Deployment
  public readonly prometheusService?: k8s.core.v1.Service
  public readonly grafanaDeployment?: k8s.apps.v1.Deployment
  public readonly grafanaService?: k8s.core.v1.Service

  constructor(
    name: string,
    args: {
      namespace: string
      prometheus?: boolean
      grafana?: boolean
      provider?: k8s.Provider
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('federation:monitoring', name, args, opts)

    // Prometheus setup
    if (args.prometheus) {
      this.prometheusConfigMap = new k8s.core.v1.ConfigMap(
        `${name}-prometheus-config`,
        {
          metadata: {
            name: 'prometheus-config',
            namespace: args.namespace,
          },
          data: {
            'prometheus.yml': `
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'federation-gateway'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - ${args.namespace}
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_component]
        action: keep
        regex: gateway
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: instance
      - target_label: __address__
        replacement: \${1}:4000
        source_labels: [__meta_kubernetes_pod_ip]
  
  - job_name: 'federation-subgraphs'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - ${args.namespace}
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_component]
        action: keep
        regex: subgraph
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: instance
      - target_label: __address__
        replacement: \${1}:4001
        source_labels: [__meta_kubernetes_pod_ip]`,
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )

      this.prometheusDeployment = new k8s.apps.v1.Deployment(
        `${name}-prometheus`,
        {
          metadata: {
            name: 'prometheus',
            namespace: args.namespace,
          },
          spec: {
            replicas: 1,
            selector: {
              matchLabels: {
                app: 'prometheus',
              },
            },
            template: {
              metadata: {
                labels: {
                  app: 'prometheus',
                },
              },
              spec: {
                serviceAccountName: 'prometheus',
                containers: [
                  {
                    name: 'prometheus',
                    image: 'prom/prometheus:latest',
                    args: [
                      '--config.file=/etc/prometheus/prometheus.yml',
                      '--storage.tsdb.path=/prometheus/',
                    ],
                    ports: [{ containerPort: 9090 }],
                    volumeMounts: [
                      {
                        name: 'prometheus-config-volume',
                        mountPath: '/etc/prometheus/',
                      },
                      {
                        name: 'prometheus-storage-volume',
                        mountPath: '/prometheus/',
                      },
                    ],
                  },
                ],
                volumes: [
                  {
                    name: 'prometheus-config-volume',
                    configMap: {
                      name: this.prometheusConfigMap.metadata.name,
                    },
                  },
                  {
                    name: 'prometheus-storage-volume',
                    emptyDir: {},
                  },
                ],
              },
            },
          },
        },
        {
          parent: this,
          dependsOn: [this.prometheusConfigMap],
          ...(Boolean(args.provider) && { provider: args.provider }),
        }
      )

      this.prometheusService = new k8s.core.v1.Service(
        `${name}-prometheus-service`,
        {
          metadata: {
            name: 'prometheus',
            namespace: args.namespace,
          },
          spec: {
            selector: {
              app: 'prometheus',
            },
            ports: [
              {
                port: 9090,
                targetPort: 9090,
              },
            ],
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )
    }

    // Grafana setup
    if (args.grafana) {
      this.grafanaDeployment = new k8s.apps.v1.Deployment(
        `${name}-grafana`,
        {
          metadata: {
            name: 'grafana',
            namespace: args.namespace,
          },
          spec: {
            replicas: 1,
            selector: {
              matchLabels: {
                app: 'grafana',
              },
            },
            template: {
              metadata: {
                labels: {
                  app: 'grafana',
                },
              },
              spec: {
                containers: [
                  {
                    name: 'grafana',
                    image: 'grafana/grafana:latest',
                    ports: [{ containerPort: 3000 }],
                    env: [
                      { name: 'GF_SECURITY_ADMIN_PASSWORD', value: 'admin' },
                      { name: 'GF_USERS_ALLOW_SIGN_UP', value: 'false' },
                    ],
                  },
                ],
              },
            },
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )

      this.grafanaService = new k8s.core.v1.Service(
        `${name}-grafana-service`,
        {
          metadata: {
            name: 'grafana',
            namespace: args.namespace,
          },
          spec: {
            selector: {
              app: 'grafana',
            },
            ports: [
              {
                port: 3000,
                targetPort: 3000,
              },
            ],
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )
    }

    this.registerOutputs({
      prometheusConfigMap: this.prometheusConfigMap?.id,
      prometheusDeployment: this.prometheusDeployment?.id,
      prometheusService: this.prometheusService?.id,
      grafanaDeployment: this.grafanaDeployment?.id,
      grafanaService: this.grafanaService?.id,
    })
  }
}

/**
 * Service Mesh component - Pulumi Component Resource
 */
class ServiceMeshComponent extends pulumi.ComponentResource {
  public readonly virtualService?: k8s.apiextensions.CustomResource
  public readonly destinationRule?: k8s.apiextensions.CustomResource

  constructor(
    name: string,
    args: {
      namespace: string
      provider?: k8s.Provider
      meshProvider: 'istio' | 'linkerd' | 'consul'
      gateway: { name: string }
      subgraphs?: Array<{ name: string }>
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('federation:service-mesh', name, args, opts)

    if (args.meshProvider === 'istio') {
      // Create Istio VirtualService
      this.virtualService = new k8s.apiextensions.CustomResource(
        `${name}-virtual-service`,
        {
          apiVersion: 'networking.istio.io/v1beta1',
          kind: 'VirtualService',
          metadata: {
            name: 'federation-vs',
            namespace: args.namespace,
          },
          spec: {
            hosts: ['federation.example.com'],
            gateways: ['istio-system/federation-gateway'],
            http: [
              {
                match: [{ uri: { prefix: '/' } }],
                route: [
                  {
                    destination: {
                      host: args.gateway.name,
                      port: { number: 4000 },
                    },
                    weight: 100,
                  },
                ],
                timeout: '30s',
                retries: {
                  attempts: 3,
                  perTryTimeout: '10s',
                },
              },
            ],
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )

      // Create Istio DestinationRule for circuit breaking
      this.destinationRule = new k8s.apiextensions.CustomResource(
        `${name}-destination-rule`,
        {
          apiVersion: 'networking.istio.io/v1beta1',
          kind: 'DestinationRule',
          metadata: {
            name: 'federation-dr',
            namespace: args.namespace,
          },
          spec: {
            host: args.gateway.name,
            trafficPolicy: {
              connectionPool: {
                tcp: {
                  maxConnections: 100,
                },
                http: {
                  http1MaxPendingRequests: 100,
                  http2MaxRequests: 1000,
                  maxRequestsPerConnection: 2,
                },
              },
              outlierDetection: {
                consecutiveErrors: 5,
                interval: '30s',
                baseEjectionTime: '30s',
                maxEjectionPercent: 50,
                minHealthPercent: 50,
              },
            },
          },
        },
        { parent: this, ...(args.provider && { provider: args.provider }) }
      )
    }

    this.registerOutputs({
      virtualService: this.virtualService?.id,
      destinationRule: this.destinationRule?.id,
    })
  }
}

/**
 * Kubernetes operator using Pulumi
 */
export class KubernetesOperator extends pulumi.ComponentResource {
  public readonly namespace: k8s.core.v1.Namespace
  public readonly serviceAccount?: k8s.core.v1.ServiceAccount
  public readonly role?: k8s.rbac.v1.Role
  public readonly roleBinding?: k8s.rbac.v1.RoleBinding
  public readonly gateway?: GatewayComponent
  public readonly subgraphs: SubgraphComponent[] = []
  public readonly ingress?: k8s.networking.v1.Ingress
  public readonly monitoring?: MonitoringComponent
  public readonly serviceMesh?: ServiceMeshComponent

  private readonly config: K8sOperatorConfig
  private readonly provider: k8s.Provider

  constructor(name: string, config: K8sOperatorConfig, opts?: pulumi.ComponentResourceOptions) {
    super('federation:kubernetes-operator', name, config, opts)

    this.config = config
    this.provider = config.provider ?? null

    const namespaceName = config.namespace ?? 'federation'

    // Create namespace
    this.namespace = new k8s.core.v1.Namespace(
      `${name}-namespace`,
      {
        metadata: {
          name: namespaceName,
          labels: {
            'federation.io/managed': 'true',
            'federation.io/version': '2.0.0',
          },
        },
      },
      { parent: this, ...(Boolean(this.provider) && { provider: this.provider }) }
    )

    // Setup RBAC if enabled
    if (config.security?.rbac === true) {
      this.serviceAccount = new k8s.core.v1.ServiceAccount(
        `${name}-service-account`,
        {
          metadata: {
            name: 'federation-operator',
            namespace: namespaceName,
          },
        },
        {
          parent: this,
          dependsOn: [this.namespace],
          ...(this.provider && { provider: this.provider }),
        }
      )

      this.role = new k8s.rbac.v1.Role(
        `${name}-role`,
        {
          metadata: {
            name: 'federation-operator',
            namespace: namespaceName,
          },
          rules: [
            {
              apiGroups: [''],
              resources: ['pods', 'services', 'configmaps', 'secrets'],
              verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
            },
            {
              apiGroups: ['apps'],
              resources: ['deployments', 'replicasets'],
              verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
            },
            {
              apiGroups: ['networking.k8s.io'],
              resources: ['ingresses', 'networkpolicies'],
              verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
            },
            {
              apiGroups: ['autoscaling'],
              resources: ['horizontalpodautoscalers'],
              verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
            },
          ],
        },
        {
          parent: this,
          dependsOn: [this.namespace],
          ...(Boolean(this.provider) && { provider: this.provider }),
        }
      )

      this.roleBinding = new k8s.rbac.v1.RoleBinding(
        `${name}-role-binding`,
        {
          metadata: {
            name: 'federation-operator',
            namespace: namespaceName,
          },
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: this.role.metadata.name,
          },
          subjects: [
            {
              kind: 'ServiceAccount',
              name: this.serviceAccount.metadata.name,
              namespace: namespaceName,
            },
          ],
        },
        {
          parent: this,
          dependsOn: [this.role, this.serviceAccount],
          ...(Boolean(this.provider) && { provider: this.provider }),
        }
      )
    }

    // Deploy gateway
    if (config.federation.gateway) {
      this.gateway = new GatewayComponent(
        `${name}-gateway`,
        {
          namespace: namespaceName,
          config: config.federation.gateway,
          ...(Boolean(this.provider) && { provider: this.provider }),
        },
        { parent: this, dependsOn: [this.namespace] }
      )
    }

    // Deploy subgraphs
    if (config.federation.subgraphs) {
      this.subgraphs = config.federation.subgraphs.map(
        subgraph =>
          new SubgraphComponent(
            `${name}-${subgraph.name}`,
            {
              namespace: namespaceName,
              config: subgraph,
              ...(Boolean(this.provider) && { provider: this.provider }),
            },
            { parent: this, dependsOn: [this.namespace] }
          )
      )
    }

    // Setup ingress
    if (config.ingress || this.gateway) {
      const ingressConfig = config.ingress ?? {
        name: 'federation-ingress',
        host: 'federation.example.com',
      }

      this.ingress = new k8s.networking.v1.Ingress(
        `${name}-ingress`,
        {
          metadata: {
            name: ingressConfig.name,
            namespace: namespaceName,
            annotations: {
              'nginx.ingress.kubernetes.io/rewrite-target': '/',
              'nginx.ingress.kubernetes.io/ssl-redirect':
                (ingressConfig.tls?.enabled ?? false) ? 'true' : 'false',
              'nginx.ingress.kubernetes.io/proxy-body-size': '10m',
              'nginx.ingress.kubernetes.io/proxy-connect-timeout': '60',
              'nginx.ingress.kubernetes.io/proxy-send-timeout': '60',
              'nginx.ingress.kubernetes.io/proxy-read-timeout': '60',
            },
          },
          spec: {
            ingressClassName: ingressConfig.className ?? 'nginx',
            ...(ingressConfig.tls?.enabled && {
              tls: [
                {
                  hosts: ingressConfig.tls.hosts ?? [
                    ingressConfig.host ?? 'federation.example.com',
                  ],
                  secretName: ingressConfig.tls.secretName ?? 'federation-tls',
                },
              ],
            }),
            rules: [
              {
                host: ingressConfig.host ?? 'federation.example.com',
                http: {
                  paths: [
                    {
                      path: '/',
                      pathType: 'Prefix',
                      backend: {
                        service: {
                          name: config.federation.gateway?.name ?? 'federation-gateway',
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
        },
        {
          parent: this,
          dependsOn: [this.namespace, ...(this.gateway ? [this.gateway] : [])],
          ...(Boolean(this.provider) && { provider: this.provider }),
        }
      )
    }

    // Setup monitoring
    if ((config.monitoring?.prometheus ?? false) || (config.monitoring?.grafana ?? false)) {
      this.monitoring = new MonitoringComponent(
        `${name}-monitoring`,
        {
          namespace: namespaceName,
          ...(config.monitoring?.prometheus !== undefined && {
            prometheus: config.monitoring?.prometheus,
          }),
          ...(config.monitoring?.grafana !== undefined && { grafana: config.monitoring?.grafana }),
          ...(Boolean(this.provider) && { provider: this.provider }),
        },
        { parent: this, dependsOn: [this.namespace] }
      )
    }

    // Setup service mesh
    if (config.federation.serviceMesh?.enabled ?? false) {
      this.serviceMesh = new ServiceMeshComponent(
        `${name}-service-mesh`,
        {
          namespace: namespaceName,
          ...(Boolean(this.provider) && { provider: this.provider }),
          meshProvider: config.federation.serviceMesh?.provider ?? 'istio',
          gateway: {
            name: config.federation.gateway?.name ?? 'federation-gateway',
          },
          ...(config.federation.subgraphs !== undefined && {
            subgraphs: config.federation.subgraphs.map(s => ({ name: s.name })),
          }),
        },
        { parent: this, dependsOn: [this.namespace, ...(this.gateway ? [this.gateway] : [])] }
      )
    }

    // Register outputs
    this.registerOutputs({
      namespace: this.namespace.id,
      gatewayDeployment: this.gateway?.deployment.id,
      gatewayService: this.gateway?.service.id,
      subgraphCount: this.subgraphs.length,
      ingressUrl: pulumi.interpolate`http://${this.ingress?.spec.rules?.[0]?.host ?? 'localhost'}`,
    })
  }

  /**
   * Get deployment status using Effect
   */
  getStatus(): Effect.Effect<Record<string, unknown>, Error> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const outputs = {
            namespace: this.namespace.metadata.name,
            gateway: this.gateway
              ? {
                  deployment: this.gateway.deployment.metadata.name,
                  service: this.gateway.service.metadata.name,
                  replicas: this.gateway.deployment.spec.replicas,
                }
              : undefined,
            subgraphs: await Promise.all(
              this.subgraphs.map(async sg => ({
                deployment: sg.deployment.metadata.name,
                service: sg.service.metadata.name,
                replicas: sg.deployment.spec.replicas,
              }))
            ),
            ingress:
              Boolean(this.ingress) === true
                ? {
                    name: this.ingress?.metadata.name,
                    host: this.ingress?.spec.rules?.[0]?.host,
                  }
                : undefined,
            monitoring: {
              prometheus: Boolean(this.monitoring?.prometheusDeployment) === true,
              grafana: Boolean(this.monitoring?.grafanaDeployment) === true,
            },
            serviceMesh: {
              enabled: Boolean(this.serviceMesh) === true,
              provider: this.config.federation.serviceMesh?.provider,
            },
          }

          return outputs
        },
        catch: error => new Error(`Failed to get status: ${error}`),
      })
    )
  }

  /**
   * Scale a deployment using Effect
   */
  scale(componentName: string, replicas: number): Effect.Effect<void, Error> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          // Find the component to scale
          if (
            this.gateway &&
            (this.config.federation.gateway?.name ?? 'federation-gateway') === componentName
          ) {
            // In Pulumi, we would typically update the config and run `pulumi up`
            // For demonstration, we'll log the intent
            console.log(`Scaling gateway ${componentName} to ${replicas} replicas`)
            console.log('Run `pulumi up` to apply the scaling change')
          } else {
            const subgraph = this.subgraphs.find(
              sg => sg.deployment.metadata.name === pulumi.output(componentName)
            )
            if (subgraph) {
              console.log(`Scaling subgraph ${componentName} to ${replicas} replicas`)
              console.log('Run `pulumi up` to apply the scaling change')
            } else {
              throw new Error(`Component ${componentName} not found`)
            }
          }
        },
        catch: error => new Error(`Failed to scale: ${error}`),
      })
    )
  }

  /**
   * Deploy the Kubernetes resources
   */
  async deploy(): Promise<void> {
    console.log('To deploy, run: pulumi up')
    console.log('The Pulumi stack will create all necessary Kubernetes resources')
    console.log(`Namespace: ${this.config.namespace ?? 'federation'}`)
    console.log(`Gateway replicas: ${this.config.federation.gateway?.replicas ?? 3}`)
    console.log(`Subgraphs: ${this.config.federation.subgraphs?.length ?? 0}`)
  }

  /**
   * Teardown all resources
   */
  async teardown(): Promise<void> {
    console.log('To teardown, run: pulumi destroy')
    console.log('This will remove all resources created by this stack')
  }

  /**
   * Create a KubernetesOperator instance
   */
  static async create(config: K8sOperatorConfig): Promise<KubernetesOperator> {
    return new KubernetesOperator('federation', config)
  }
}

/**
 * Kubernetes presets
 */
export const K8sPresets = {
  /**
   * Development preset
   */
  development: (provider: k8s.Provider): K8sOperatorConfig => ({
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
    provider,
  }),

  /**
   * Production preset
   */
  production: (
    gatewayImage: string,
    subgraphImages: Array<{ name: string; image: string }>,
    provider: k8s.Provider
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
    provider,
  }),

  /**
   * High availability preset
   */
  highAvailability: (gatewayImage: string, provider: k8s.Provider): K8sOperatorConfig => ({
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
    ingress: {
      name: 'federation-ha-ingress',
      host: 'federation-ha.example.com',
      className: 'nginx',
      tls: {
        enabled: true,
        secretName: 'federation-ha-tls',
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
    provider,
  }),
}

/**
 * Helper function to create and deploy a Kubernetes operator
 * This provides backward compatibility with the previous API
 */
export async function createKubernetesOperator(config: K8sOperatorConfig): Promise<{
  deploy: () => Promise<void>
  getStatus: () => Promise<Record<string, unknown>>
  scale: (component: string, replicas: number) => Promise<void>
  teardown: () => Promise<void>
}> {
  // Note: In a real implementation, this would be part of a Pulumi program
  // The operator is created declaratively and deployed via `pulumi up`
  const operator = new KubernetesOperator('federation', config)

  return {
    deploy: async () => {
      console.log('To deploy, run: pulumi up')
      console.log('The Pulumi stack will create all necessary Kubernetes resources')
    },
    getStatus: async () => {
      const result = await Effect.runPromise(operator.getStatus())
      return result
    },
    scale: async (component: string, replicas: number) => {
      await Effect.runPromise(operator.scale(component, replicas))
    },
    teardown: async () => {
      console.log('To teardown, run: pulumi destroy')
      console.log('This will remove all resources created by this stack')
    },
  }
}
