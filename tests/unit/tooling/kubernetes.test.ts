import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as Effect from 'effect/Effect'

// Mock Pulumi modules before importing anything that uses them
 vi.mock('@pulumi/pulumi', () => ({
  ComponentResource: class ComponentResource {
    constructor(_type: string, _name: string, _args: unknown, _opts?: unknown) {}
    registerOutputs(_outputs: unknown) {}
  },
  Output: class Output {
   static create(value: unknown): unknown {
      return value
    }
  },
  interpolate: (strings: TemplateStringsArray, ..._values: unknown[]) => {
    return strings.join('')
  }
}))

 vi.mock('@pulumi/kubernetes', () => ({
  Provider: class Provider {},
  core: {
    v1: {
      Namespace: class Namespace {
        metadata = { name: 'test-namespace' }
        id = 'namespace-id'
        spec = {}
      },
      Service: class Service {
        metadata = { name: 'test-service' }
        id = 'service-id'
        spec = {}
      },
      ServiceAccount: class ServiceAccount {
        metadata = { name: 'test-sa' }
        id = 'sa-id'
      },
      ConfigMap: class ConfigMap {
        metadata = { name: 'test-cm' }
        id = 'cm-id'
      }
    }
  },
  apps: {
    v1: {
      Deployment: class Deployment {
        metadata = { name: 'test-deployment' }
        id = 'deployment-id'
        spec = { replicas: 3 }
      }
    }
  },
  rbac: {
    v1: {
      Role: class Role {
        metadata = { name: 'test-role' }
        id = 'role-id'
      },
      RoleBinding: class RoleBinding {
        metadata = { name: 'test-rolebinding' }
        id = 'rolebinding-id'
      }
    }
  },
  autoscaling: {
    v2: {
      HorizontalPodAutoscaler: class HPA {
        metadata = { name: 'test-hpa' }
        id = 'hpa-id'
      }
    }
  },
  networking: {
    v1: {
      Ingress: class Ingress {
        metadata = { name: 'test-ingress' }
        id = 'ingress-id'
        spec = {
          rules: [{
            host: 'test.example.com'
          }]
        }
      }
    }
  },
  apiextensions: {
    CustomResource: class CustomResource {
      id = 'custom-resource-id'
    }
  }
}))

// Import after mocking
import { KubernetesOperator, K8sPresets, type K8sOperatorConfig } from '../../../src/tooling/cloud/kubernetes.js'
import type { Provider } from '@pulumi/kubernetes'
import { Output } from '@pulumi/pulumi'

describe('KubernetesOperator', () => {
  let mockProvider: Provider

  beforeEach(() => {
    // Create a mock provider
    mockProvider = {
      id: Output.create('mock-provider-id'),
      urn: Output.create('mock-provider-urn'),
      getProvider: () => mockProvider
    }
  })

  describe('Construction', () => {
    it('should create KubernetesOperator with minimal config', () => {
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest',
            replicas: 1
          }
        }
      }

      const operator = new KubernetesOperator('test-operator', config)
      expect(operator).toBeDefined()
      expect(operator.namespace).toBeDefined()
    })

    it('should create KubernetesOperator with full config', () => {
      const config: K8sOperatorConfig = {
        namespace: 'production',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:v1.0.0',
            replicas: 3,
            resources: {
              cpu: '500m',
              memory: '512Mi',
              limits: {
                cpu: '1000m',
                memory: '1Gi'
              }
            },
            autoscaling: {
              enabled: true,
              minReplicas: 2,
              maxReplicas: 10,
              targetCPUUtilization: 70
            }
          },
          subgraphs: [
            {
              name: 'users',
              image: 'users:v1.0.0',
              replicas: 2
            },
            {
              name: 'products', 
              image: 'products:v1.0.0',
              replicas: 2
            }
          ],
          serviceMesh: {
            enabled: true,
            provider: 'istio'
          }
        },
        ingress: {
          name: 'federation-ingress',
          host: 'api.example.com',
          className: 'nginx',
          tls: {
            enabled: true,
            secretName: 'tls-secret',
            hosts: ['api.example.com']
          }
        },
        monitoring: {
          prometheus: true,
          grafana: true,
          tracing: {
            enabled: true,
            provider: 'jaeger'
          }
        },
        security: {
          rbac: true,
          networkPolicies: true,
          podSecurityPolicies: true
        }
      }

      const operator = new KubernetesOperator('prod-operator', config)
      expect(operator).toBeDefined()
      expect(operator.namespace).toBeDefined()
      expect(operator.gateway).toBeDefined()
      expect(operator.subgraphs).toHaveLength(2)
      expect(operator.ingress).toBeDefined()
      expect(operator.monitoring).toBeDefined()
      expect(operator.serviceMesh).toBeDefined()
      expect(operator.serviceAccount).toBeDefined()
      expect(operator.role).toBeDefined()
      expect(operator.roleBinding).toBeDefined()
    })
  })

  describe('Static create method', () => {
    it('should create operator using static method', async () => {
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest'
          }
        }
      }

      const operator = await KubernetesOperator.create(config)
      expect(operator).toBeDefined()
      expect(operator).toBeInstanceOf(KubernetesOperator)
    })
  })

  describe('Deployment methods', () => {
    it('should handle deploy method', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest',
            replicas: 3
          },
          subgraphs: [
            { name: 'users', image: 'users:latest' }
          ]
        }
      }

      const operator = new KubernetesOperator('test', config)
      await operator.deploy()

      expect(consoleSpy).toHaveBeenCalledWith('To deploy, run: pulumi up')
      expect(consoleSpy).toHaveBeenCalledWith('The Pulumi stack will create all necessary Kubernetes resources')
      expect(consoleSpy).toHaveBeenCalledWith('Namespace: test')
      expect(consoleSpy).toHaveBeenCalledWith('Gateway replicas: 3')
      expect(consoleSpy).toHaveBeenCalledWith('Subgraphs: 1')

      consoleSpy.mockRestore()
    })

    it('should handle teardown method', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest'
          }
        }
      }

      const operator = new KubernetesOperator('test', config)
      await operator.teardown()

      expect(consoleSpy).toHaveBeenCalledWith('To teardown, run: pulumi destroy')
      expect(consoleSpy).toHaveBeenCalledWith('This will remove all resources created by this stack')

      consoleSpy.mockRestore()
    })
  })

  describe('Status and scaling', () => {
    it('should get status using Effect', async () => {
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest'
          }
        }
      }

      const operator = new KubernetesOperator('test', config)
      const status = await Effect.runPromise(operator.getStatus())

      expect(status).toBeDefined()
      expect(status['namespace']).toBe('test-namespace')
      expect(status['gateway']).toBeDefined()
      expect(status['monitoring']).toBeDefined()
      expect(status['serviceMesh']).toBeDefined()
    })

    it('should scale gateway using Effect', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest'
          }
        }
      }

      const operator = new KubernetesOperator('test', config)
      await Effect.runPromise(operator.scale('gateway', 5))

      expect(consoleSpy).toHaveBeenCalledWith('Scaling gateway gateway to 5 replicas')
      expect(consoleSpy).toHaveBeenCalledWith('Run `pulumi up` to apply the scaling change')

      consoleSpy.mockRestore()
    })

    it('should fail to scale unknown component', async () => {
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest'
          }
        }
      }

      const operator = new KubernetesOperator('test', config)
      
      await expect(
        Effect.runPromise(operator.scale('unknown', 5))
      ).rejects.toThrow('Component unknown not found')
    })
  })

  describe('K8sPresets', () => {
    it('should create development preset', () => {
      const config = K8sPresets.development(mockProvider)
      
      expect(config.namespace).toBe('federation-dev')
      expect(config.federation.gateway?.replicas).toBe(1)
      expect(config.federation.gateway?.resources?.cpu).toBe('100m')
      expect(config.federation.gateway?.resources?.memory).toBe('128Mi')
      expect(config.monitoring?.prometheus).toBe(true)
      expect(config.monitoring?.grafana).toBe(true)
      expect(config.provider).toBe(mockProvider)
    })

    it('should create production preset', () => {
      const config = K8sPresets.production(
        'gateway:v1.0.0',
        [
          { name: 'users', image: 'users:v1.0.0' },
          { name: 'products', image: 'products:v1.0.0' }
        ],
        mockProvider
      )
      
      expect(config.namespace).toBe('federation-prod')
      expect(config.federation.gateway?.replicas).toBe(3)
      expect(config.federation.gateway?.resources?.cpu).toBe('500m')
      expect(config.federation.gateway?.autoscaling?.enabled).toBe(true)
      expect(config.federation.subgraphs).toHaveLength(2)
      expect(config.federation.serviceMesh?.enabled).toBe(true)
      expect(config.security?.rbac).toBe(true)
      expect(config.provider).toBe(mockProvider)
    })

    it('should create high availability preset', () => {
      const config = K8sPresets.highAvailability('gateway:v2.0.0', mockProvider)
      
      expect(config.namespace).toBe('federation-ha')
      expect(config.federation.gateway?.replicas).toBe(5)
      expect(config.federation.gateway?.resources?.cpu).toBe('1000m')
      expect(config.federation.gateway?.autoscaling?.minReplicas).toBe(5)
      expect(config.federation.gateway?.autoscaling?.maxReplicas).toBe(20)
      expect(config.ingress?.tls?.enabled).toBe(true)
      expect(config.monitoring?.tracing?.enabled).toBe(true)
      expect(config.provider).toBe(mockProvider)
    })
  })

  describe('Helper function', () => {
    it('should create operator with helper function', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const config: K8sOperatorConfig = {
        namespace: 'test',
        provider: mockProvider,
        federation: {
          gateway: {
            name: 'gateway',
            image: 'gateway:latest'
          }
        }
      }

      const { createKubernetesOperator } = await import('../../../src/tooling/cloud/kubernetes.js')
      const operator = await createKubernetesOperator(config)
      
      expect(operator.deploy).toBeDefined()
      expect(operator.getStatus).toBeDefined()
      expect(operator.scale).toBeDefined()
      expect(operator.teardown).toBeDefined()

      await operator.deploy()
      expect(consoleSpy).toHaveBeenCalledWith('To deploy, run: pulumi up')

      const status = await operator.getStatus()
      expect(status).toBeDefined()

      await operator.scale('gateway', 3)
      expect(consoleSpy).toHaveBeenCalledWith('Scaling gateway gateway to 3 replicas')

      await operator.teardown()
      expect(consoleSpy).toHaveBeenCalledWith('To teardown, run: pulumi destroy')

      consoleSpy.mockRestore()
    })
  })
})