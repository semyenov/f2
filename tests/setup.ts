/**
 * Vitest test setup file
 * 
 * This file runs before all tests and sets up the test environment
 */

import { beforeAll, afterAll, afterEach } from 'vitest'

// Setup global test environment
beforeAll(() => {
  // Set test environment variables if needed
  // process.env.NODE_ENV = 'test'
  
  // Suppress console output during tests (optional)
  // console.log = () => {}
  // console.info = () => {}
  // console.warn = () => {}
})

// Cleanup after each test
afterEach(() => {
  // Clear any test-specific state
})

// Global teardown
afterAll(() => {
  // Cleanup any global resources
})

// Make expect available globally for compatibility

// declare global {
//   namespace NodeJS {
//     interface Global {
//       expect: typeof expect
//     }
//   }
// }
