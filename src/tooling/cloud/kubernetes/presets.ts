/**
 * Kubernetes Deployment Presets
 * 
 * Pre-configured deployment configurations for common scenarios.
 * These presets provide optimized settings for development, production,
 * and high-availability deployments.
 * 
 * @module kubernetes/presets
 */

import type * as k8s from '@pulumi/kubernetes'
import type { K8sOperatorConfig, DeploymentConfig } from './types.js'

/**
 * Development preset for local testing
 * 
 * Minimal resource requirements, single replicas, basic monitoring.
 * Suitable for local development and testing environments.
 * 
 * @param provider - Kubernetes provider
 * @returns K8s operator configuration for development
 */
export function development(provider: k8s.Provider): K8sOperatorConfig {
  return {
    namespace: 'federation-dev',
    provider,
    federation: {
      gateway: {
        name: 'gateway',
        image: 'gateway:latest',
        replicas: 1,
        resources: {
          cpu: '100m',
          memory: '128Mi',
          limits: {
            cpu: '200m',
            memory: '256Mi',
          },
        },
        healthCheck: {
          path: '/health',
          port: 4000,
          initialDelaySeconds: 10,
          periodSeconds: 10,
        },
      },
    },
    monitoring: {
      prometheus: true,
      grafana: true,
      prometheusConfig: {
        retention: '1d',
        storage: '10Gi',
        scrapeInterval: '30s',
      },
    },
    ingress: {
      name: 'federation-ingress',
      host: 'federation.local',
      className: 'nginx',
    },
  }
}

/**
 * Production preset for live environments
 * 
 * Optimized resource allocation, autoscaling, full monitoring,
 * and security features enabled.
 * 
 * @param gatewayImage - Gateway container image
 * @param subgraphs - Subgraph configurations
 * @param provider - Kubernetes provider
 * @returns K8s operator configuration for production
 */
export function production(
  gatewayImage: string,
  subgraphs: DeploymentConfig[],
  provider: k8s.Provider
): K8sOperatorConfig {
  return {
    namespace: 'federation-prod',
    provider,
    federation: {
      gateway: {
        name: 'gateway',
        image: gatewayImage,
        replicas: 3,
        resources: {
          cpu: '500m',
          memory: '512Mi',
          limits: {
            cpu: '1000m',
            memory: '1Gi',
          },
        },
        healthCheck: {
          path: '/health',
          port: 4000,
          initialDelaySeconds: 30,
          periodSeconds: 10,
        },
        autoscaling: {
          enabled: true,
          minReplicas: 3,
          maxReplicas: 10,
          targetCPUUtilization: 70,
          targetMemoryUtilization: 80,
        },
        nodeSelector: {
          'node-role.kubernetes.io/worker': 'true',
        },
      },
      subgraphs,
      serviceMesh: {
        enabled: true,
        provider: 'istio',
        mtls: true,
        tracing: true,
      },
    },
    monitoring: {
      prometheus: true,
      grafana: true,
      prometheusConfig: {
        retention: '30d',
        storage: '100Gi',
        scrapeInterval: '15s',
      },
      grafanaConfig: {
        plugins: ['grafana-piechart-panel', 'grafana-clock-panel'],
      },
      tracing: {
        enabled: true,
        provider: 'jaeger',
        samplingRate: 0.1,
      },
    },
    security: {
      rbac: true,
      networkPolicies: true,
      serviceAccount: {
        create: true,
        name: 'federation-sa',
      },
      securityContext: {
        runAsNonRoot: true,
        runAsUser: 1000,
        fsGroup: 2000,
        readOnlyRootFilesystem: true,
      },
    },
    ingress: {
      name: 'federation-ingress',
      host: 'api.example.com',
      className: 'nginx',
      tls: {
        enabled: true,
        secretName: 'federation-tls',
        hosts: ['api.example.com'],
      },
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'nginx.ingress.kubernetes.io/rate-limit': '100',
      },
    },
  }
}

/**
 * High availability preset for critical workloads
 * 
 * Maximum redundancy, aggressive autoscaling, multi-zone deployment,
 * and comprehensive monitoring.
 * 
 * @param gatewayImage - Gateway container image
 * @param provider - Kubernetes provider
 * @returns K8s operator configuration for high availability
 */
export function highAvailability(
  gatewayImage: string,
  provider: k8s.Provider
): K8sOperatorConfig {
  return {
    namespace: 'federation-ha',
    provider,
    federation: {
      gateway: {
        name: 'gateway',
        image: gatewayImage,
        replicas: 5,
        resources: {
          cpu: '1000m',
          memory: '1Gi',
          limits: {
            cpu: '2000m',
            memory: '2Gi',
          },
        },
        healthCheck: {
          path: '/health',
          port: 4000,
          initialDelaySeconds: 30,
          periodSeconds: 5,
        },
        autoscaling: {
          enabled: true,
          minReplicas: 5,
          maxReplicas: 20,
          targetCPUUtilization: 60,
          targetMemoryUtilization: 70,
        },
        affinity: {
          podAntiAffinity: {
            requiredDuringSchedulingIgnoredDuringExecution: [
              {
                labelSelector: {
                  matchExpressions: [
                    {
                      key: 'app',
                      operator: 'In',
                      values: ['gateway'],
                    },
                  ],
                },
                topologyKey: 'kubernetes.io/hostname',
              },
            ],
          },
          nodeAffinity: {
            preferredDuringSchedulingIgnoredDuringExecution: [
              {
                weight: 100,
                preference: {
                  matchExpressions: [
                    {
                      key: 'node-type',
                      operator: 'In',
                      values: ['high-performance'],
                    },
                  ],
                },
              },
            ],
          },
        },
        tolerations: [
          {
            key: 'dedicated',
            operator: 'Equal',
            value: 'federation',
            effect: 'NoSchedule',
          },
        ],
      },
      serviceMesh: {
        enabled: true,
        provider: 'istio',
        mtls: true,
        tracing: true,
      },
    },
    monitoring: {
      prometheus: true,
      grafana: true,
      prometheusConfig: {
        retention: '90d',
        storage: '500Gi',
        scrapeInterval: '10s',
      },
      grafanaConfig: {
        plugins: [
          'grafana-piechart-panel',
          'grafana-clock-panel',
          'grafana-worldmap-panel',
        ],
      },
      tracing: {
        enabled: true,
        provider: 'jaeger',
        samplingRate: 0.5,
      },
    },
    security: {
      rbac: true,
      networkPolicies: true,
      podSecurityPolicies: true,
      serviceAccount: {
        create: true,
        name: 'federation-ha-sa',
        annotations: {
          'eks.amazonaws.com/role-arn': 'arn:aws:iam::123456789012:role/federation-role',
        },
      },
      securityContext: {
        runAsNonRoot: true,
        runAsUser: 1000,
        fsGroup: 2000,
        readOnlyRootFilesystem: true,
      },
    },
    ingress: {
      name: 'federation-ingress',
      host: 'api.production.com',
      className: 'nginx',
      tls: {
        enabled: true,
        secretName: 'federation-tls',
        hosts: ['api.production.com', 'www.api.production.com'],
      },
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'nginx.ingress.kubernetes.io/rate-limit': '1000',
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'nginx.ingress.kubernetes.io/force-ssl-redirect': 'true',
      },
    },
    labels: {
      environment: 'production',
      tier: 'critical',
      'cost-center': 'engineering',
    },
  }
}

/**
 * Staging preset for pre-production testing
 * 
 * Similar to production but with reduced resources and relaxed limits.
 * 
 * @param gatewayImage - Gateway container image
 * @param provider - Kubernetes provider
 * @returns K8s operator configuration for staging
 */
export function staging(
  gatewayImage: string,
  provider: k8s.Provider
): K8sOperatorConfig {
  return {
    namespace: 'federation-staging',
    provider,
    federation: {
      gateway: {
        name: 'gateway',
        image: gatewayImage,
        replicas: 2,
        resources: {
          cpu: '250m',
          memory: '256Mi',
          limits: {
            cpu: '500m',
            memory: '512Mi',
          },
        },
        healthCheck: {
          path: '/health',
          port: 4000,
          initialDelaySeconds: 20,
          periodSeconds: 10,
        },
        autoscaling: {
          enabled: true,
          minReplicas: 2,
          maxReplicas: 5,
          targetCPUUtilization: 75,
        },
      },
    },
    monitoring: {
      prometheus: true,
      grafana: true,
      prometheusConfig: {
        retention: '7d',
        storage: '50Gi',
        scrapeInterval: '30s',
      },
    },
    ingress: {
      name: 'federation-ingress',
      host: 'staging.example.com',
      className: 'nginx',
      tls: {
        enabled: true,
        secretName: 'staging-tls',
        hosts: ['staging.example.com'],
      },
    },
  }
}

/**
 * Export all presets as a namespace
 */
export const K8sPresets = {
  development,
  production,
  highAvailability,
  staging,
}