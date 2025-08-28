import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use global test APIs (describe, it, expect) without imports
    globals: true,

    // Test environment - using happy-dom for lighter weight than jsdom
    environment: 'happy-dom',

    // Test file patterns
    include: ['tests/**/*.test.ts'],

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
        'test-complete.ts',
        'functional-patterns-standalone.ts',
        'comprehensive-functional-demo.ts',
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
      '@core': resolve(__dirname, './src/core'),
      '@core/*': resolve(__dirname, './src/core/*'),
      '@federation': resolve(__dirname, './src/federation'),
      '@federation/*': resolve(__dirname, './src/federation/*'),
      '@experimental': resolve(__dirname, './src/experimental'),
      '@experimental/*': resolve(__dirname, './src/experimental/*'),
      '@schema': resolve(__dirname, './src/schema'),
      '@schema/*': resolve(__dirname, './src/schema/*'),
    }
  },

  // ESBuild options for faster transforms
  esbuild: {
    target: 'es2022',
    format: 'esm'
  }
})
