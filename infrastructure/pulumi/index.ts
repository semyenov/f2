import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import { KubernetesOperator, K8sPresets } from '../../src/tooling/cloud/kubernetes'

// Get configuration
const config = new pulumi.Config()
const environment = config.get('environment') || 'development'
const namespace = config.get('namespace') || 'federation-dev'

// Create Kubernetes provider
const provider = new k8s.Provider('k8s-provider', {
  // Use the current kubeconfig context
  // You can override this with explicit cluster configuration
})

// Create the federation deployment based on environment
let federationConfig

switch (environment) {
  case 'production':
    federationConfig = K8sPresets.production(
      'gateway:latest',
      [
        { name: 'users', image: 'users:latest' },
        { name: 'products', image: 'products:latest' }
      ],
      provider
    )
    break
  
  case 'ha':
    federationConfig = K8sPresets.highAvailability(
      'gateway:latest',
      provider
    )
    break
  
  default:
    federationConfig = K8sPresets.development(provider)
}

// Override namespace if specified
federationConfig.namespace = namespace

// Create the Kubernetes operator
const operator = new KubernetesOperator('federation', federationConfig)

// Export useful information
export const namespaceName = operator.namespace.metadata.name
export const gatewayDeployment = operator.gateway?.deployment.metadata.name
export const ingressHost = operator.ingress?.spec.rules?.[0]?.host

// Export subgraph names
export const subgraphs = operator.subgraphs?.map(s => s.deployment.metadata.name)

// Export monitoring endpoints if enabled
let prometheusService: pulumi.Output<string> | undefined
let grafanaService: pulumi.Output<string> | undefined

if (operator.monitoring) {
  prometheusService = operator.monitoring.prometheusService?.metadata.name
  grafanaService = operator.monitoring.grafanaService?.metadata.name
}

// Export status information
export const federationStatus = pulumi.output({
  namespace: namespaceName,
  gateway: gatewayDeployment,
  ingress: ingressHost,
  subgraphs: subgraphs?.length || 0,
  monitoring: {
    prometheus: !!operator.monitoring?.prometheusService,
    grafana: !!operator.monitoring?.grafanaService,
    prometheusService,
    grafanaService
  },
  serviceMesh: !!operator.serviceMesh
})

export { prometheusService, grafanaService }
