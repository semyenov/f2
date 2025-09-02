import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use global test APIs (describe, it, expect) without imports
    globals: true,

    // Test environment - using happy-dom for lighter weight than jsdom
    environment: 'happy-dom',

    // Test file patterns
    include: [
      'tests/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/functional/**/*.test.ts',
      'tests/performance/**/*.test.ts',
      'tests/e2e/**/*.test.ts',
      'tests/utils/**/*.test.ts',
      'tests/fixtures/**/*.test.ts',
      'tests/helpers/**/*.test.ts',
      'tests/mocks/**/*.test.ts',
    ],

    environmentOptions: {
      happyDOM: {
        height: 1080,
        width: 1920,
        url: 'http://localhost:3000',
      }
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
      thresholds: {
        lines: 75,
        functions: 60,
        branches: 70,
        statements: 75,
      }
    },

    // Setup files to run before tests
    setupFiles: ['./tests/setup.ts'],

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 20000,

    // Retry flaky tests
    retry: 0,

    // Reporter
    reporters: ['verbose'],

    // Disable threads for better compatibility with Effect-TS
    pool: 'forks',

    // Max concurrent tests
    maxConcurrency: 5,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/*': resolve(__dirname, './src/*'),
      '@runtime': resolve(__dirname, './src/runtime'),
      '@runtime/*': resolve(__dirname, './src/runtime/*'),
      '@runtime/core': resolve(__dirname, './src/runtime/core'),
      '@runtime/effect': resolve(__dirname, './src/runtime/effect'),
      '@runtime/schema': resolve(__dirname, './src/runtime/schema'),
      '@federation': resolve(__dirname, './src/federation'),
      '@federation/*': resolve(__dirname, './src/federation/*'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@infrastructure/*': resolve(__dirname, './src/infrastructure/*'),
      '@api': resolve(__dirname, './src/api'),
      '@api/*': resolve(__dirname, './src/api/*'),
      '@api/simple': resolve(__dirname, './src/api/simple'),
      '@api/advanced': resolve(__dirname, './src/api/advanced'),
      '@tooling': resolve(__dirname, './src/tooling'),
      '@tooling/*': resolve(__dirname, './src/tooling/*'),
    }
  },

  // ESBuild options for faster transforms
  esbuild: {
    target: 'es2022',
    format: 'esm'
  }
})
