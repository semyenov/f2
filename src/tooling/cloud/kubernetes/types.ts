/**
 * Kubernetes Deployment Types and Interfaces
 * 
 * Core type definitions for Kubernetes deployments with Pulumi.
 * These types define the configuration structure for deploying
 * federation services to Kubernetes clusters.
 * 
 * @module kubernetes/types
 */

import type * as k8s from '@pulumi/kubernetes'
import type * as pulumi from '@pulumi/pulumi'

/**
 * Deployment configuration for Kubernetes workloads
 */
export interface DeploymentConfig {
  /** Deployment name */
  name: string
  /** Container image */
  image: pulumi.Input<string>
  /** Number of replicas */
  replicas?: pulumi.Input<number>
  /** Resource requirements */
  resources?: {
    cpu?: pulumi.Input<string>
    memory?: pulumi.Input<string>
    limits?: {
      cpu?: pulumi.Input<string>
      memory?: pulumi.Input<string>
    }
  }
  /** Environment variables */
  env?: Record<string, pulumi.Input<string>>
  /** Container port */
  port?: pulumi.Input<number>
  /** Health check configuration */
  healthCheck?: {
    path?: pulumi.Input<string>
    port?: pulumi.Input<number>
    initialDelaySeconds?: pulumi.Input<number>
    periodSeconds?: pulumi.Input<number>
  }
  /** Pod labels */
  labels?: Record<string, pulumi.Input<string>>
  /** Node selector */
  nodeSelector?: Record<string, pulumi.Input<string>>
  /** Tolerations */
  tolerations?: Array<{
    key?: pulumi.Input<string>
    operator?: pulumi.Input<string>
    value?: pulumi.Input<string>
    effect?: pulumi.Input<string>
  }>
  /** Affinity rules */
  affinity?: k8s.types.input.core.v1.Affinity
}

/**
 * Service configuration for exposing deployments
 */
export interface ServiceConfig {
  /** Service name */
  name: string
  /** Service type */
  type?: pulumi.Input<'ClusterIP' | 'NodePort' | 'LoadBalancer'>
  /** Service port */
  port?: pulumi.Input<number>
  /** Target port on the pod */
  targetPort?: pulumi.Input<number>
  /** Node port (for NodePort services) */
  nodePort?: pulumi.Input<number>
  /** Selector labels */
  selector?: Record<string, pulumi.Input<string>>
  /** Service annotations */
  annotations?: Record<string, pulumi.Input<string>>
  /** Session affinity */
  sessionAffinity?: pulumi.Input<'None' | 'ClientIP'>
  /** External traffic policy */
  externalTrafficPolicy?: pulumi.Input<'Cluster' | 'Local'>
  /** Load balancer IP */
  loadBalancerIP?: pulumi.Input<string>
  /** Load balancer source ranges */
  loadBalancerSourceRanges?: pulumi.Input<string>[]
}

/**
 * Ingress configuration for HTTP(S) routing
 */
export interface IngressConfig {
  /** Ingress name */
  name: string
  /** Host for routing */
  host: pulumi.Input<string>
  /** Ingress class name */
  className?: pulumi.Input<string>
  /** TLS configuration */
  tls?: {
    /** Enable TLS */
    enabled: boolean
    /** Secret name for TLS certificate */
    secretName?: pulumi.Input<string>
    /** Hosts covered by the certificate */
    hosts?: pulumi.Input<string>[]
  }
  /** Path-based routing rules */
  paths?: Array<{
    path: pulumi.Input<string>
    pathType?: pulumi.Input<'Prefix' | 'Exact' | 'ImplementationSpecific'>
    service: string
    port: pulumi.Input<number>
  }>
  /** Ingress annotations */
  annotations?: Record<string, pulumi.Input<string>>
  /** Backend service (default) */
  defaultBackend?: {
    service: string
    port: pulumi.Input<number>
  }
}

/**
 * Federation component configuration
 */
export interface FederationComponentConfig {
  /** Gateway configuration */
  gateway?: DeploymentConfig & {
    /** Autoscaling configuration */
    autoscaling?: {
      enabled: boolean
      minReplicas?: pulumi.Input<number>
      maxReplicas?: pulumi.Input<number>
      targetCPUUtilization?: pulumi.Input<number>
      targetMemoryUtilization?: pulumi.Input<number>
    }
  }
  /** Subgraph configurations */
  subgraphs?: Array<DeploymentConfig>
  /** Service mesh configuration */
  serviceMesh?: {
    enabled: boolean
    provider?: 'istio' | 'linkerd' | 'consul'
    mtls?: boolean
    tracing?: boolean
  }
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable Prometheus */
  prometheus?: boolean
  /** Enable Grafana */
  grafana?: boolean
  /** Prometheus configuration */
  prometheusConfig?: {
    retention?: pulumi.Input<string>
    storage?: pulumi.Input<string>
    scrapeInterval?: pulumi.Input<string>
  }
  /** Grafana configuration */
  grafanaConfig?: {
    adminPassword?: pulumi.Input<string>
    plugins?: pulumi.Input<string>[]
  }
  /** Tracing configuration */
  tracing?: {
    enabled: boolean
    provider?: 'jaeger' | 'zipkin' | 'tempo'
    samplingRate?: pulumi.Input<number>
  }
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Enable RBAC */
  rbac?: boolean
  /** Enable network policies */
  networkPolicies?: boolean
  /** Enable pod security policies */
  podSecurityPolicies?: boolean
  /** Service account configuration */
  serviceAccount?: {
    create?: boolean
    name?: pulumi.Input<string>
    annotations?: Record<string, pulumi.Input<string>>
  }
  /** Security context */
  securityContext?: {
    runAsNonRoot?: pulumi.Input<boolean>
    runAsUser?: pulumi.Input<number>
    fsGroup?: pulumi.Input<number>
    readOnlyRootFilesystem?: pulumi.Input<boolean>
  }
}

/**
 * Main Kubernetes operator configuration
 */
export interface K8sOperatorConfig {
  /** Target namespace */
  namespace: string
  /** Kubernetes provider */
  provider: k8s.Provider
  /** Federation components */
  federation: FederationComponentConfig
  /** Ingress configuration */
  ingress?: IngressConfig
  /** Monitoring setup */
  monitoring?: MonitoringConfig
  /** Security settings */
  security?: SecurityConfig
  /** Common labels for all resources */
  labels?: Record<string, pulumi.Input<string>>
  /** Common annotations for all resources */
  annotations?: Record<string, pulumi.Input<string>>
}

/**
 * Component outputs for tracking created resources
 */
export interface ComponentOutputs {
  deployment: k8s.apps.v1.Deployment
  service: k8s.core.v1.Service
  configMap?: k8s.core.v1.ConfigMap
  hpa?: k8s.autoscaling.v2.HorizontalPodAutoscaler
}

/**
 * Gateway component with all resources
 */
export interface GatewayComponent {
  deployment: k8s.apps.v1.Deployment
  service: k8s.core.v1.Service
  hpa?: k8s.autoscaling.v2.HorizontalPodAutoscaler
  configMap?: k8s.core.v1.ConfigMap
}

/**
 * Monitoring component resources
 */
export interface MonitoringComponent {
  prometheusDeployment?: k8s.apps.v1.Deployment
  prometheusService?: k8s.core.v1.Service
  prometheusConfigMap?: k8s.core.v1.ConfigMap
  grafanaDeployment?: k8s.apps.v1.Deployment
  grafanaService?: k8s.core.v1.Service
  grafanaConfigMap?: k8s.core.v1.ConfigMap
}

/**
 * Service mesh component resources
 */
export interface ServiceMeshComponent {
  virtualService?: pulumi.CustomResource
  destinationRule?: pulumi.CustomResource
  serviceEntry?: pulumi.CustomResource
  gateway?: pulumi.CustomResource
}