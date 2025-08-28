import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // Entry points for the library
  entry: [
    'src/examples/*.ts'  // Include examples as they're runnable demos
  ],
  
  // Project files to analyze
  project: [
    'src/**/*.ts',
    'tests/**/*.test.ts'
  ],
  
  // Ignore unresolved imports in config files
  ignore: [
    'package.json',
    'typedoc.json'
  ]
}

export default config