import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // Entry points for the library
  entry: [
    'src/index.ts',
    'comprehensive-functional-demo.ts',
    'test-complete.ts'
  ],
  
  // Project files to analyze
  project: [
    'src/**/*.ts',
    'tests/**/*.test.ts'
  ],
  
  // Ignore files and patterns
  ignore: [
    'coverage/**',
    'dist/**',
    'docs/**',
    'infrastructure/pulumi/**',
    '**/*.d.ts'
  ],
  
  // Ignore specific dependencies
  ignoreDependencies: [
    '@edge-runtime/vm',  // Not needed with happy-dom
    'husky',  // Git hooks
    'lint-staged'  // Git hooks
  ],
  
  // Workspaces configuration
  workspaces: {
    '.': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts']
    },
    'infrastructure/pulumi': {
      entry: ['index.ts'],
      project: ['*.ts']
    }
  }
}

export default config