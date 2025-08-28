#!/usr/bin/env node

/**
 * # Federation CLI
 *
 * Command-line interface for the Federation framework, providing scaffolding,
 * validation, composition testing, and development tools.
 *
 * @example Basic usage
 * ```bash
 * # Initialize a new federation project
 * npx @cqrs/federation init my-federation
 *
 * # Generate a new entity
 * npx @cqrs/federation entity User
 *
 * # Validate schemas
 * npx @cqrs/federation validate
 *
 * # Test composition
 * npx @cqrs/federation compose
 *
 * # Start devtools with GraphQL server
 * npx @cqrs/federation devtools
 * ```
 *
 * @module CLI
 * @since 2.1.0
 */

import { createServer } from 'http'
import { Command } from 'commander'
import * as path from 'path'
import * as fs from 'fs/promises'
import { execSync } from 'child_process'
import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  graphql,
} from 'graphql'

const program = new Command()

// CLI version from package.json
const VERSION = '2.1.0'

/**
 * CLI configuration
 */
interface CLIConfig {
  verbose: boolean
  output: string
  typescript: boolean
  port?: number
}

/**
 * Create a mock federation schema for development
 */
function createMockSchema(): GraphQLSchema {
  const UserType = new GraphQLObjectType({
    name: 'User',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLString },
      email: { type: GraphQLString },
    },
  })

  const ProductType = new GraphQLObjectType({
    name: 'Product',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLString },
      price: { type: GraphQLString },
    },
  })

  const ServiceType = new GraphQLObjectType({
    name: '_Service',
    fields: {
      sdl: { type: GraphQLString },
    },
  })

  // Define _Entity union for federation
  const EntityUnion = new GraphQLUnionType({
    name: '_Entity',
    types: [UserType, ProductType],
  })

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        user: {
          type: UserType,
          args: {
            id: { type: new GraphQLNonNull(GraphQLID) },
          },
          resolve: (_, { id }) => ({
            id,
            name: `User ${id}`,
            email: `user${id}@example.com`,
          }),
        },
        users: {
          type: new GraphQLList(UserType),
          resolve: () => [
            { id: '1', name: 'Alice', email: 'alice@example.com' },
            { id: '2', name: 'Bob', email: 'bob@example.com' },
          ],
        },
        product: {
          type: ProductType,
          args: {
            id: { type: new GraphQLNonNull(GraphQLID) },
          },
          resolve: (_, { id }) => ({
            id,
            name: `Product ${id}`,
            price: '$99.99',
          }),
        },
        products: {
          type: new GraphQLList(ProductType),
          resolve: () => [
            { id: '1', name: 'Laptop', price: '$999' },
            { id: '2', name: 'Mouse', price: '$29' },
          ],
        },
        _service: {
          type: ServiceType,
          resolve: () => ({
            sdl: `
              type User @key(fields: "id") {
                id: ID!
                name: String
                email: String
              }
              
              type Product @key(fields: "id") {
                id: ID!
                name: String
                price: String
              }
            `,
          }),
        },
        _entities: {
          type: new GraphQLList(EntityUnion),
          resolve: () => {
            // Return empty array for now - this would normally resolve federated entities
            return []
          },
        },
      },
    }),
  })
}

/**
 * Start GraphQL devtools server
 */
async function startDevTools(options: Partial<CLIConfig>) {
  const port = Number(options.port) || 4000

  console.log(`🚀 Starting Federation DevTools...`)
  console.log(`   GraphQL Server: http://localhost:${port}/graphql`)
  console.log(`   GraphQL Playground: http://localhost:${port}/graphql`)
  console.log(`   Health Check: http://localhost:${port}/health`)

  const schema = createMockSchema()

  // Create GraphQL server
  const server = createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    // Handle GET request for GraphQL Playground
    if (req.url === '/graphql' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GraphQL Playground</title>
          <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
        </head>
        <body style="margin: 0;">
          <div id="graphiql" style="height: 100vh;"></div>
          <style>
            body {
              margin: 0;
            }

            #graphiql {
              height: 100dvh;
            }

            .loading {
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 4rem;
            }
          </style>
          <link rel="stylesheet" href="https://esm.sh/graphiql/dist/style.css" />
          <link
            rel="stylesheet"
            href="https://esm.sh/@graphiql/plugin-explorer/dist/style.css"
          />
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@19.1.0",
                "react/": "https://esm.sh/react@19.1.0/",

                "react-dom": "https://esm.sh/react-dom@19.1.0",
                "react-dom/": "https://esm.sh/react-dom@19.1.0/",

                "graphiql": "https://esm.sh/graphiql?standalone&external=react,react-dom,@graphiql/react,graphql",
                "graphiql/": "https://esm.sh/graphiql/",
                "@graphiql/plugin-explorer": "https://esm.sh/@graphiql/plugin-explorer?standalone&external=react,@graphiql/react,graphql",
                "@graphiql/react": "https://esm.sh/@graphiql/react?standalone&external=react,react-dom,graphql,@graphiql/toolkit,@emotion/is-prop-valid",

                "@graphiql/toolkit": "https://esm.sh/@graphiql/toolkit?standalone&external=graphql",
                "graphql": "https://esm.sh/graphql@16.11.0",
                "@emotion/is-prop-valid": "data:text/javascript,"
              }
            }
          </script>
          <script type="module">
            import React from 'react';
            import ReactDOM from 'react-dom/client';
            import { GraphiQL, HISTORY_PLUGIN } from 'graphiql';
            import { createGraphiQLFetcher } from '@graphiql/toolkit';
            import { explorerPlugin } from '@graphiql/plugin-explorer';
            import 'graphiql/setup-workers/esm.sh';

            const fetcher = createGraphiQLFetcher({
              url: 'http://localhost:${port}/graphql',
            });
            const root = ReactDOM.createRoot(
              document.getElementById('graphiql')
            );
            root.render(
              React.createElement(GraphiQL, {
                fetcher: fetcher,
                defaultQuery: '# Welcome to GraphQL Playground\\n# Try running an introspection query:\\n\\n{\\n  __schema {\\n    types {\\n      name\\n    }\\n  }\\n}',
              }),
            );
          </script>
        </body>
        </html>
      `)
      return
    }

    // Handle POST request for GraphQL queries
    if (req.url === '/graphql' && req.method === 'POST') {
      let body = ''

      req.on('data', chunk => {
        body += chunk.toString()
      })

      req.on('end', () => {
        ;(async () => {
          try {
            const { query, variables, operationName } = JSON.parse(body)

            // Check if this is an introspection query
            const isIntrospection =
              query.includes('__schema') ??
              query.includes('__type') ??
              query.includes('IntrospectionQuery')

            if (options.verbose ?? false) {
              if (isIntrospection !== false) {
                console.log(`🔍 Introspection Request`)
              } else {
                console.log(`📨 GraphQL Request: ${operationName ?? 'Anonymous'}`)
              }
            }

            const result = await graphql({
              schema,
              source: query,
              variableValues: variables,
              operationName,
            })

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(result))
          } catch (error) {
            console.error('GraphQL error:', error)
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ errors: [{ message: String(error) }] }))
          }
        })().catch(error => {
          console.error('Unexpected error:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ errors: [{ message: 'Internal server error' }] }))
        })
      })
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  server.on('error', (error: Error & { code?: string }) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Try a different port with --port <number>`)
      process.exit(1)
    } else {
      console.error(`❌ Failed to start server:`, error)
      process.exit(1)
    }
  })

  server.listen(port, () => {
    console.log(`✅ GraphQL server running on http://localhost:${port}/graphql`)
  })

  // DevTools playground is integrated directly in the GraphQL endpoint GET response

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down DevTools...')
    server.close()
    process.exit(0)
  })
}

/**
 * Initialize a new federation project
 */
async function initProject(name: string, _options: Partial<CLIConfig>) {
  console.log(`🚀 Initializing new federation project: ${name}`)

  const projectDir = path.join(process.cwd(), name)

  try {
    // Create project directory
    await fs.mkdir(projectDir, { recursive: true })

    // Create package.json
    const packageJson = {
      name,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'bun run src/index.ts',
        build: 'tsc',
        test: 'vitest',
        compose: 'federation compose',
        validate: 'federation validate',
        devtools: 'federation devtools',
      },
      dependencies: {
        '@cqrs/federation': `^${VERSION}`,
        effect: '^3.17.0',
        graphql: '^16.11.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        vitest: '^1.0.0',
        'bun-types': '^1.0.0',
      },
    }

    await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2))

    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        noEmit: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }

    await fs.writeFile(path.join(projectDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2))

    // Create src directory
    const srcDir = path.join(projectDir, 'src')
    await fs.mkdir(srcDir, { recursive: true })

    // Create main entry file
    const mainContent = `import { Federation, Presets } from '@cqrs/federation'
import { userEntity } from './entities/user.entity.js'

async function startServer() {
  const federation = await Federation.create(
    Presets.development(
      [userEntity],
      ['http://localhost:4001']
    )
  )
  
  console.log('🚀 Federation server started')
  console.log('   GraphQL endpoint: http://localhost:4000/graphql')
  console.log('   Run "bun run devtools" to start the playground')
  
  await federation.start()
}

startServer().catch(console.error)
`

    await fs.writeFile(path.join(srcDir, 'index.ts'), mainContent)

    // Create entities directory
    const entitiesDir = path.join(srcDir, 'entities')
    await fs.mkdir(entitiesDir, { recursive: true })

    // Create example entity
    const userEntityContent = `import { Federation } from '@cqrs/federation'
import * as Schema from 'effect/Schema'
import * as Effect from 'effect/Effect'

export const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.Date,
})

export type User = Schema.Schema.Type<typeof UserSchema>

export const userEntity = Federation.entity('User', UserSchema)
  .keys('id')
  .shareable('name', 'email')
  .resolver((reference: { id: string }) => Effect.succeed({
    id: reference.id,
    name: \`User \${reference.id}\`,
    email: \`user\${reference.id}@example.com\`,
    createdAt: new Date(),
  }))
  .build()
`

    await fs.writeFile(path.join(entitiesDir, 'user.entity.ts'), userEntityContent)

    // Create tests directory
    const testsDir = path.join(projectDir, 'tests')
    await fs.mkdir(testsDir, { recursive: true })

    // Create example test
    const testContent = `import { describe, it, expect } from 'vitest'
import { TestHarness } from '@cqrs/federation/testing'
import { userEntity } from '../src/entities/user.entity'

describe('User Entity', () => {
  it('should resolve user by id', async () => {
    const harness = await TestHarness.create()
      .withEntity(userEntity)
      .build()
    
    const result = await harness.query(\`
      query GetUser {
        _entities(representations: [{__typename: "User", id: "123"}]) {
          ... on User {
            id
            name
          }
        }
      }
    \`)
    
    expect(result.data).toBeDefined()
    expect(result.errors).toBeUndefined()
  })
})
`

    await fs.writeFile(path.join(testsDir, 'user.entity.test.ts'), testContent)

    // Create README
    const readmeContent = `# ${name}

A federation service built with @cqrs/federation framework.

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Run development server
bun run dev

# Start GraphQL playground
bun run devtools

# Run tests
bun test

# Build for production
bun run build
\`\`\`

## Project Structure

\`\`\`
${name}/
├── src/
│   ├── index.ts          # Main entry point
│   └── entities/         # Entity definitions
│       └── user.entity.ts
├── tests/                # Test files
├── package.json
└── tsconfig.json
\`\`\`

## Entity Development

Create new entities in \`src/entities/\`:

\`\`\`typescript
import { Federation } from '@cqrs/federation'
import * as Schema from 'effect/Schema'

const MySchema = Schema.Struct({
  id: Schema.String,
  // ... fields
})

export const myEntity = Federation.entity('MyEntity', MySchema)
  .keys('id')
  .build()
\`\`\`

## Testing

Use the testing harness for integration tests:

\`\`\`typescript
import { TestHarness } from '@cqrs/federation/testing'

const harness = await TestHarness.create()
  .withEntity(myEntity)
  .build()
\`\`\`
`

    await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent)

    console.log(`✅ Project initialized successfully!`)
    console.log(`\nNext steps:`)
    console.log(`  cd ${name}`)
    console.log(`  bun install`)
    console.log(`  bun run dev`)
    console.log(`  bun run devtools  # In another terminal`)
  } catch (error) {
    console.error(`❌ Failed to initialize project: ${error}`)
    process.exit(1)
  }
}

/**
 * Generate a new entity
 */
async function generateEntity(name: string, options: Partial<CLIConfig>) {
  console.log(`📝 Generating entity: ${name}`)

  const entityDir = path.join(process.cwd(), 'src', 'entities')
  await fs.mkdir(entityDir, { recursive: true })

  const entityContent = `import { Federation } from '@cqrs/federation'
import * as Schema from 'effect/Schema'
import * as Effect from 'effect/Effect'

export const ${name}Schema = Schema.Struct({
  id: Schema.String,
  // TODO: Add your fields here
})

export type ${name} = Schema.Schema.Type<typeof ${name}Schema>

export const ${name.toLowerCase()}Entity = Federation.entity('${name}', ${name}Schema)
  .keys('id')
  // TODO: Configure federation directives
  .resolver(async (reference: { id: string }) => {
    // TODO: Implement resolution logic
    return Effect.succeed({
      id: reference.id,
    })
  })
  .build()

// Export for federation composition
export default ${name.toLowerCase()}Entity
`

  const fileName = `${name.toLowerCase()}.entity.ts`
  const filePath = path.join(entityDir, fileName)

  await fs.writeFile(filePath, entityContent)

  console.log(`✅ Entity generated: ${filePath}`)

  if (options.typescript !== false) {
    const testDir = path.join(process.cwd(), 'tests')
    await fs.mkdir(testDir, { recursive: true })

    const testContent = `import { describe, it, expect } from 'vitest'
import { TestHarness, Assertions } from '@cqrs/federation/testing'
import { ${name.toLowerCase()}Entity } from '../src/entities/${name.toLowerCase()}.entity'

describe('${name} Entity', () => {
  it('should compose successfully', async () => {
    const result = await Assertions.assertSchemaComposition([${name.toLowerCase()}Entity])
    expect(result.passed).toBe(true)
  })
  
  it('should resolve by id', async () => {
    const harness = await TestHarness.create()
      .withEntity(${name.toLowerCase()}Entity)
      .build()
    
    const result = await Assertions.assertEntityResolution(
      harness,
      '${name}',
      'test-id',
      { id: 'test-id' }
    )
    
    expect(result.passed).toBe(true)
  })
})
`

    const testPath = path.join(testDir, `${name.toLowerCase()}.entity.test.ts`)
    await fs.writeFile(testPath, testContent)

    console.log(`✅ Test file generated: ${testPath}`)
  }
}

/**
 * Validate federation schemas
 */
async function validateSchemas(options: Partial<CLIConfig>) {
  console.log(`🔍 Validating federation schemas...`)
  const verbose = options.verbose ?? false

  try {
    execSync('tsc --noEmit', { stdio: verbose ? 'inherit' : 'pipe' })
    console.log('✅ TypeScript validation passed')

    // Run tests to validate composition
    execSync('bun test --run', { stdio: verbose ? 'inherit' : 'pipe' })
    console.log('✅ Composition tests passed')

    console.log('\n✨ All validations passed!')
  } catch (error) {
    console.error('❌ Validation failed')
    if (verbose) {
      console.error(error)
    }
    process.exit(1)
  }
}

/**
 * Test federation composition
 */
async function testComposition(_options: Partial<CLIConfig>) {
  console.log(`🧪 Testing federation composition...`)

  const testCode = `
import { Federation, Presets } from '@cqrs/federation'
import * as path from 'path'
import * as fs from 'fs/promises'
import { pathToFileURL } from 'url'

async function testComposition() {
  const entitiesDir = path.join(process.cwd(), 'src', 'entities')
  const entities = []
  
  // Load all entity files
  const files = await fs.readdir(entitiesDir)
  for (const file of files) {
    if (file.endsWith('.entity.ts') || file.endsWith('.entity.js')) {
      const filePath = path.join(entitiesDir, file)
      const module = await import(pathToFileURL(filePath).href)
      if (module.default) {
        entities.push(module.default)
      }
    }
  }
  
  // Try to compose
  const federation = await Federation.create(
    Presets.development(entities, ['http://mock:4001'])
  )
  
  console.log('✅ Composition successful!')
  console.log('Entities:', entities.length)
  
  const schema = federation.getSchema()
  if (schema) {
    console.log('✅ Schema generated successfully')
  }
}

testComposition().catch(error => {
  console.error('❌ Composition failed:', error)
  process.exit(1)
})
`

  // Write temporary test file
  const tempFile = path.join(process.cwd(), '.composition-test.mjs')
  await fs.writeFile(tempFile, testCode)

  try {
    execSync(`node ${tempFile}`, { stdio: 'inherit' })

    // Clean up
    await fs.unlink(tempFile)
  } catch (error) {
    console.error('❌ Composition test failed', error)
    // Clean up even on error
    await fs.unlink(tempFile).catch(() => {})
    process.exit(1)
  }
}

// Define CLI commands
program.name('federation').description('CLI for @cqrs/federation framework').version(VERSION)

program
  .command('init <name>')
  .description('Initialize a new federation project')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--no-typescript', 'Use JavaScript instead of TypeScript')
  .option('-v, --verbose', 'Verbose output')
  .action(initProject)

program
  .command('entity <name>')
  .description('Generate a new entity')
  .option('--no-typescript', 'Generate JavaScript')
  .option('-v, --verbose', 'Verbose output')
  .action(generateEntity)

program
  .command('validate')
  .description('Validate federation schemas')
  .option('-v, --verbose', 'Verbose output')
  .action(validateSchemas)

program
  .command('compose')
  .description('Test federation composition')
  .option('-v, --verbose', 'Verbose output')
  .action(testComposition)

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Server port', '4000')
  .option('-v, --verbose', 'Verbose output')
  .action(_options => {
    console.log('🚀 Starting development server...')
    execSync('bun run dev', { stdio: 'inherit' })
  })

program
  .command('devtools')
  .description('Start GraphQL server with playground')
  .option('-p, --port <port>', 'Server port', '4000')
  .option('-v, --verbose', 'Verbose output')
  .action(startDevTools)

program
  .command('playground')
  .description('Start the federation playground (alias for devtools)')
  .option('-p, --port <port>', 'Server port', '4000')
  .option('-v, --verbose', 'Verbose output')
  .action(startDevTools)

// Parse command line arguments
program.parse(process.argv)
