import { describe, it, expect, beforeEach } from 'vitest'
import type * as k8s from '@pulumi/kubernetes'
import type { K8sOperatorConfig, DeploymentConfig } from '../../../src/tooling/cloud/kubernetes/types.js'
import { K8sPresets, development, production, highAvailability, staging } from '../../../src/tooling/cloud/kubernetes/presets.js'

describe('Kubernetes Modules', () => {
  let mockProvider: k8s.Provider

  beforeEach(() => {
    // Create a mock provider
    mockProvider = {} as k8s.Provider
  })

  describe('Kubernetes Types', () => {
    it('should define DeploymentConfig interface', () => {
      const config: DeploymentConfig = {
        name: 'test-deployment',
        image: 'test:latest',
        replicas: 2,
        resources: {
          cpu: '100m',
          memory: '128Mi',
          limits: {
            cpu: '200m',
            memory: '256Mi',
          },
        },
        port: 8080,
        healthCheck: {
          path: '/health',
          port: 8080,
          initialDelaySeconds: 10,
          periodSeconds: 5,
        },
      }

      expect(config.name).toBe('test-deployment')
      expect(config.replicas).toBe(2)
      expect(config.resources?.cpu).toBe('100m')
    })

    it('should define K8sOperatorConfig interface', () => {
      const config: K8sOperatorConfig = {
        namespace: 'test-namespace',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest',
            replicas: 1,
          },
        },
        monitoring: {
          prometheus: true,
          grafana: true,
        },
        security: {
          rbac: true,
          networkPolicies: true,
        },
      }

      expect(config.namespace).toBe('test-namespace')
      expect(config.federation.gateway?.name).toBe('gateway')
      expect(config.monitoring?.prometheus).toBe(true)
    })
  })

  describe('Kubernetes Presets', () => {
    describe('Development Preset', () => {
      it('should create development configuration', () => {
        const config = development(mockProvider)

        expect(config.namespace).toBe('federation-dev')
        expect(config.provider).toBe(mockProvider)
        expect(config.federation.gateway?.replicas).toBe(1)
        expect(config.federation.gateway?.resources?.cpu).toBe('100m')
        expect(config.federation.gateway?.resources?.memory).toBe('128Mi')
        expect(config.monitoring?.prometheus).toBe(true)
        expect(config.monitoring?.grafana).toBe(true)
      })

      it('should use minimal resources for development', () => {
        const config = development(mockProvider)
        const gateway = config.federation.gateway

        expect(gateway?.resources?.limits?.cpu).toBe('200m')
        expect(gateway?.resources?.limits?.memory).toBe('256Mi')
        expect(gateway?.healthCheck?.initialDelaySeconds).toBe(10)
      })
    })

    describe('Production Preset', () => {
      it('should create production configuration with subgraphs', () => {
        const subgraphs: DeploymentConfig[] = [
          { name: 'users', image: 'users:v1.0.0' },
          { name: 'products', image: 'products:v1.0.0' },
        ]

        const config = production('gateway:v1.0.0', subgraphs, mockProvider)

        expect(config.namespace).toBe('federation-prod')
        expect(config.federation.gateway?.replicas).toBe(3)
        expect(config.federation.gateway?.resources?.cpu).toBe('500m')
        expect(config.federation.gateway?.autoscaling?.enabled).toBe(true)
        expect(config.federation.gateway?.autoscaling?.minReplicas).toBe(3)
        expect(config.federation.gateway?.autoscaling?.maxReplicas).toBe(10)
      })

      it('should enable security features in production', () => {
        const config = production('gateway:v1.0.0', [], mockProvider)

        expect(config.security?.rbac).toBe(true)
        expect(config.security?.networkPolicies).toBe(true)
        expect(config.security?.serviceAccount?.create).toBe(true)
        expect(config.security?.securityContext?.runAsNonRoot).toBe(true)
        expect(config.security?.securityContext?.readOnlyRootFilesystem).toBe(true)
      })

      it('should configure service mesh for production', () => {
        const config = production('gateway:v1.0.0', [], mockProvider)

        expect(config.federation.serviceMesh?.enabled).toBe(true)
        expect(config.federation.serviceMesh?.provider).toBe('istio')
        expect(config.federation.serviceMesh?.mtls).toBe(true)
        expect(config.federation.serviceMesh?.tracing).toBe(true)
      })

      it('should enable TLS in production', () => {
        const config = production('gateway:v1.0.0', [], mockProvider)

        expect(config.ingress?.tls?.enabled).toBe(true)
        expect(config.ingress?.tls?.secretName).toBe('federation-tls')
        expect(config.ingress?.annotations?.['cert-manager.io/cluster-issuer']).toBe('letsencrypt-prod')
      })
    })

    describe('High Availability Preset', () => {
      it('should create HA configuration with maximum redundancy', () => {
        const config = highAvailability('gateway:v2.0.0', mockProvider)

        expect(config.namespace).toBe('federation-ha')
        expect(config.federation.gateway?.replicas).toBe(5)
        expect(config.federation.gateway?.resources?.cpu).toBe('1000m')
        expect(config.federation.gateway?.resources?.memory).toBe('1Gi')
        expect(config.federation.gateway?.autoscaling?.minReplicas).toBe(5)
        expect(config.federation.gateway?.autoscaling?.maxReplicas).toBe(20)
      })

      it('should configure anti-affinity for HA', () => {
        const config = highAvailability('gateway:v2.0.0', mockProvider)
        const affinity = config.federation.gateway?.affinity

        expect(affinity?.podAntiAffinity).toBeDefined()
        expect(affinity?.podAntiAffinity?.requiredDuringSchedulingIgnoredDuringExecution).toHaveLength(1)
        expect(affinity?.nodeAffinity?.preferredDuringSchedulingIgnoredDuringExecution).toHaveLength(1)
      })

      it('should configure tolerations for dedicated nodes', () => {
        const config = highAvailability('gateway:v2.0.0', mockProvider)
        const tolerations = config.federation.gateway?.tolerations

        expect(tolerations).toHaveLength(1)
        expect(tolerations?.[0]?.key).toBe('dedicated')
        expect(tolerations?.[0]?.value).toBe('federation')
        expect(tolerations?.[0]?.effect).toBe('NoSchedule')
      })

      it('should configure extended monitoring retention', () => {
        const config = highAvailability('gateway:v2.0.0', mockProvider)

        expect(config.monitoring?.prometheusConfig?.retention).toBe('90d')
        expect(config.monitoring?.prometheusConfig?.storage).toBe('500Gi')
        expect(config.monitoring?.tracing?.samplingRate).toBe(0.5)
      })
    })

    describe('Staging Preset', () => {
      it('should create staging configuration', () => {
        const config = staging('gateway:staging', mockProvider)

        expect(config.namespace).toBe('federation-staging')
        expect(config.federation.gateway?.replicas).toBe(2)
        expect(config.federation.gateway?.resources?.cpu).toBe('250m')
        expect(config.federation.gateway?.autoscaling?.enabled).toBe(true)
        expect(config.federation.gateway?.autoscaling?.maxReplicas).toBe(5)
      })

      it('should use moderate resources for staging', () => {
        const config = staging('gateway:staging', mockProvider)

        expect(config.monitoring?.prometheusConfig?.retention).toBe('7d')
        expect(config.monitoring?.prometheusConfig?.storage).toBe('50Gi')
        expect(config.ingress?.tls?.enabled).toBe(true)
      })
    })

    describe('K8sPresets Namespace', () => {
      it('should export all preset functions', () => {
        expect(K8sPresets.development).toBeDefined()
        expect(K8sPresets.production).toBeDefined()
        expect(K8sPresets.highAvailability).toBeDefined()
        expect(K8sPresets.staging).toBeDefined()
      })

      it('should create valid configs through namespace', () => {
        const devConfig = K8sPresets.development(mockProvider)
        const prodConfig = K8sPresets.production('gateway:v1', [], mockProvider)
        const haConfig = K8sPresets.highAvailability('gateway:v2', mockProvider)
        const stagingConfig = K8sPresets.staging('gateway:staging', mockProvider)

        expect(devConfig.namespace).toBe('federation-dev')
        expect(prodConfig.namespace).toBe('federation-prod')
        expect(haConfig.namespace).toBe('federation-ha')
        expect(stagingConfig.namespace).toBe('federation-staging')
      })
    })
  })
})