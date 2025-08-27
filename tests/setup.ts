/**
 * Test setup and configuration for the Federation Framework v2 test suite
 */

// Global test utilities and mocks can be set up here
export const TEST_CONFIG = {
  timeout: 5000,
  retries: 2,
} as const

// Mock GraphQL resolve info for testing
export const createMockResolveInfo = (fieldName: string) => ({
  fieldName,
  fieldNodes: [],
  returnType: {} as any,
  parentType: {} as any,
  path: { key: fieldName, prev: undefined, typename: undefined },
  schema: {} as any,
  fragments: {},
  rootValue: {},
  operation: {} as any,
  variableValues: {},
  cacheControl: {} as any,
})

// Mock federation context for testing
export const createMockFederationContext = () => ({
  userId: 'test-user-123',
  permissions: ['read', 'write'],
  traceId: 'trace-123',
})

// Test entity schemas for reuse across tests
export * from './fixtures/schemas.js'