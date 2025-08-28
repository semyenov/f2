# Ultra-Strict Entity Builder API Reference

The `UltraStrictEntityBuilder` provides compile-time type safety using phantom types and functional composition patterns. It ensures entities are validated at build time and provides exhaustive error handling through pattern matching.

> 🎯 **Production Ready**: Ultra-strict patterns with zero 'any' types and comprehensive type safety.

## Import

```typescript
import {
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
  UltraStrictEntityBuilder
} from "@cqrs/federation-v2/core"
```

## Core Functions

### `createUltraStrictEntityBuilder<T extends string>(typename: T)`

Creates a new ultra-strict entity builder with phantom type tracking.

**Parameters:**
- `typename` - The GraphQL type name (tracked at type level)

**Returns:** `UltraStrictEntityBuilder<T, "empty">`

**Example:**
```typescript
const builder = createUltraStrictEntityBuilder("User")
// Type: UltraStrictEntityBuilder<"User", "empty">
```

### Composition Functions

#### `withSchema<S>(schema: Schema.Schema<S>)`

Adds an Effect Schema to the builder, enabling type-safe field validation.

**Type signature:**
```typescript
withSchema<S>(
  schema: Schema.Schema<S>
): (builder: UltraStrictEntityBuilder<T, "empty">) => 
   UltraStrictEntityBuilder<T, "schema", S>
```

**Example:**
```typescript
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String)
})

const builderWithSchema = pipe(
  createUltraStrictEntityBuilder("User"),
  withSchema(UserSchema)
)
// Type: UltraStrictEntityBuilder<"User", "schema", UserType>
```

#### `withKeys<K extends EntityKey[]>(keys: K)`

Adds federation keys with compile-time validation.

**Type signature:**
```typescript
withKeys<K extends EntityKey[]>(
  keys: K
): (builder: UltraStrictEntityBuilder<T, "schema", S>) => 
   UltraStrictEntityBuilder<T, "keys", S, K>
```

**Example:**
```typescript
const builderWithKeys = pipe(
  builderWithSchema,
  withKeys([
    UltraStrictEntityBuilder.Key.create("id", GraphQLID, false),
    UltraStrictEntityBuilder.Key.create("email", GraphQLString, true)
  ])
)
```

#### `withDirectives<D extends EntityDirective[]>(directives: D)`

Adds federation directives with type safety.

**Example:**
```typescript
const builderWithDirectives = pipe(
  builderWithKeys,
  withDirectives([
    UltraStrictEntityBuilder.Directive.shareable(),
    UltraStrictEntityBuilder.Directive.tag("user-management"),
    UltraStrictEntityBuilder.Directive.inaccessible()
  ])
)
```

#### `withResolvers<R extends SafeResolverMap<TSource, TContext>>(resolvers: R)`

Adds field resolvers with full type safety against the schema.

**Example:**
```typescript
// Define the user type from schema
type User = Schema.Schema.Type<typeof UserSchema>

const builderWithResolvers = pipe(
  builderWithDirectives,
  withResolvers({
    fullName: (parent: User) => Effect.succeed(`${parent.name || 'Anonymous'}`),
    isEmailVerified: (parent: User) => Effect.succeed(Boolean(parent.email?.includes('@'))),
    displayName: (parent: User, args: { format?: string }) => 
      Effect.succeed(args.format === 'short' ? parent.name?.split(' ')[0] : parent.name)
  })
)
```

**Type Safety Benefits:**
- Full IntelliSense support for parent object properties
- Compile-time validation of resolver return types
- Automatic type inference for resolver arguments

### Validation

#### `validateEntityBuilder(builder: UltraStrictEntityBuilder)`

Validates the complete entity configuration and returns a discriminated union result.

**Returns:** `Effect.Effect<EntityValidationResult>`

**Example:**
```typescript
const validationResult = pipe(
  builderWithResolvers,
  validateEntityBuilder
)

const entity = await Effect.runPromise(validationResult)
```

## Pattern Matching for Validation Results

### `matchEntityValidationResult<A>(matcher: EntityValidationMatcher<A>)`

Provides exhaustive pattern matching for validation results.

```typescript
interface EntityValidationMatcher<A> {
  Valid: (data: { entity: ValidatedEntity; metadata: EntityMetadata }) => A
  InvalidSchema: (data: { errors: readonly SchemaValidationError[]; partialEntity?: Partial<ValidatedEntity> }) => A
  InvalidKeys: (data: { errors: readonly KeyValidationError[]; partialEntity?: Partial<ValidatedEntity> }) => A
  InvalidDirectives: (data: { errors: readonly DirectiveValidationError[]; partialEntity?: Partial<ValidatedEntity> }) => A
  CircularDependency: (data: { cycle: readonly string[]; affectedEntities: readonly string[] }) => A
  IncompatibleVersion: (data: { entity: string; requiredVersion: string; currentVersion: string }) => A
}
```

**Example:**
```typescript
const handleValidationResult = (result: EntityValidationResult) =>
  matchEntityValidationResult({
    Valid: ({ entity, metadata }) => {
      console.log(`✅ Entity '${entity.typename}' is valid!`)
      console.log(`Keys: ${entity.keys.map(k => k.fieldName).join(', ')}`)
      console.log(`Directives: ${Object.keys(entity.directives || {}).join(', ')}`)
      return entity
    },
    
    InvalidSchema: ({ errors, partialEntity }) => {
      console.error(`❌ Schema validation failed:`)
      errors.forEach(error => 
        console.error(`  - ${error.message} (${error.violations.map(v => v.message).join(', ')})`)
      )
      throw new Error("Schema validation failed")
    },
    
    InvalidKeys: ({ errors }) => {
      console.error(`❌ Key validation failed:`)
      errors.forEach(error => console.error(`  - ${error.message}`))
      throw new Error("Key validation failed")
    },
    
    InvalidDirectives: ({ errors }) => {
      console.error(`❌ Directive validation failed:`)
      errors.forEach(error => console.error(`  - ${error.message}`))
      throw new Error("Directive validation failed")
    },
    
    CircularDependency: ({ cycle, affectedEntities }) => {
      console.error(`❌ Circular dependency detected: ${cycle.join(' → ')}`)
      console.error(`Affected entities: ${affectedEntities.join(', ')}`)
      throw new Error("Circular dependency in entity relationships")
    },
    
    IncompatibleVersion: ({ entity, requiredVersion, currentVersion }) => {
      console.error(`❌ Version incompatibility for ${entity}`)
      console.error(`Required: ${requiredVersion}, Current: ${currentVersion}`)
      throw new Error("Entity version incompatibility")
    }
  })(result)
```

## Helper Classes

### `UltraStrictEntityBuilder.Key`

#### `Key.create(fieldName: string, graphqlType: GraphQLType, isComposite: boolean)`

Creates a federation key with type information.

**Example:**
```typescript
const keys = [
  UltraStrictEntityBuilder.Key.create("id", GraphQLID, false),
  UltraStrictEntityBuilder.Key.create("compoundKey", GraphQLString, true)
]
```

### `UltraStrictEntityBuilder.Directive`

Federation directive creators with type safety:

#### `Directive.shareable()`
Creates a `@shareable` directive.

#### `Directive.inaccessible()`  
Creates an `@inaccessible` directive.

#### `Directive.tag(tagName: string)`
Creates a `@tag` directive with the specified tag.

#### `Directive.override(from: string)`
Creates an `@override` directive specifying the source subgraph.

#### `Directive.external()`
Creates an `@external` directive.

#### `Directive.provides(fields: string)`
Creates a `@provides` directive with field selection.

#### `Directive.requires(fields: string)`
Creates a `@requires` directive with field selection.

**Example:**
```typescript
const directives = [
  UltraStrictEntityBuilder.Directive.shareable(),
  UltraStrictEntityBuilder.Directive.tag("user-management"),
  UltraStrictEntityBuilder.Directive.provides("profile { name email }"),
  UltraStrictEntityBuilder.Directive.requires("isActive")
]
```

## Complete Example

```typescript
import * as Effect from "effect/Effect"
import * as Schema from "@effect/schema/Schema"
import { pipe } from "effect/Function"
import {
  createUltraStrictEntityBuilder,
  withSchema,
  withKeys,
  withDirectives,
  withResolvers,
  validateEntityBuilder,
  matchEntityValidationResult,
  UltraStrictEntityBuilder
} from "@cqrs/federation-v2/core"

// 1. Define domain schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  isActive: Schema.Boolean,
  profile: Schema.optional(Schema.Struct({
    bio: Schema.String,
    avatar: Schema.String
  }))
})

// 2. Create entity with complete type safety
const createUserEntity = () =>
  pipe(
    createUltraStrictEntityBuilder("User"),
    withSchema(UserSchema),
    withKeys([
      UltraStrictEntityBuilder.Key.create("id", GraphQLID, false)
    ]),
    withDirectives([
      UltraStrictEntityBuilder.Directive.shareable(),
      UltraStrictEntityBuilder.Directive.tag("user-management"),
      UltraStrictEntityBuilder.Directive.provides("profile { bio avatar }")
    ]),
    withResolvers({
      fullName: (parent: User) => `${parent.firstName} ${parent.lastName}`,
      initials: (parent: User) => `${parent.firstName[0]}${parent.lastName[0]}`,
      isEmailVerified: (parent: User) => Boolean(parent.email?.includes('@'))
    }),
    validateEntityBuilder
  )

// 3. Handle validation with pattern matching
const processEntity = () =>
  Effect.gen(function* () {
    const validationResult = yield* createUserEntity()
    
    const entity = matchEntityValidationResult({
      Valid: ({ entity }) => {
        console.log(`✅ Entity '${entity.typename}' created successfully`)
        return entity
      },
      InvalidSchema: ({ errors }) => {
        throw new Error(`Schema validation failed: ${errors.map(e => e.message).join(', ')}`)
      },
      InvalidKeys: ({ errors }) => {
        throw new Error(`Key validation failed: ${errors.map(e => e.message).join(', ')}`)
      },
      InvalidDirectives: ({ errors }) => {
        throw new Error(`Directive validation failed: ${errors.map(e => e.message).join(', ')}`)
      },
      CircularDependency: ({ cycle }) => {
        throw new Error(`Circular dependency: ${cycle.join(' → ')}`)
      },
      IncompatibleVersion: ({ entity, requiredVersion, currentVersion }) => {
        throw new Error(`${entity} version mismatch: needs ${requiredVersion}, got ${currentVersion}`)
      }
    })(validationResult)
    
    return entity
  })

// 4. Usage
Effect.runPromise(processEntity())
  .then(entity => console.log("Entity created:", entity))
  .catch(error => console.error("Entity creation failed:", error))
```

## Phantom Type System

The ultra-strict builder uses phantom types to track state at compile time:

```typescript
// Each step adds type information
type EmptyBuilder = UltraStrictEntityBuilder<"User", "empty">
type WithSchema = UltraStrictEntityBuilder<"User", "schema", UserType>  
type WithKeys = UltraStrictEntityBuilder<"User", "keys", UserType, KeysType>
type WithDirectives = UltraStrictEntityBuilder<"User", "directives", UserType, KeysType, DirectivesType>
type Complete = UltraStrictEntityBuilder<"User", "complete", UserType, KeysType, DirectivesType, ResolversType>

// Validation only accepts complete builders
validateEntityBuilder: (builder: Complete) => Effect<EntityValidationResult>
```

## Enhanced Type Safety Features

### Utility Types for Safer Development

The ultra-strict builder includes advanced utility types for maximum type safety:

```typescript
// Safe resolver mapping with full type inference
type SafeUserResolvers = SafeResolverMap<User, UserContext>

const resolvers: SafeUserResolvers = {
  fullName: (parent) => Effect.succeed(`${parent.firstName} ${parent.lastName}`),
  // TypeScript ensures all resolver signatures match the schema
}

// Deep readonly enforcement for immutable configurations
type ImmutableConfig = DeepReadonly<FederationConfig>

// Extract specific resolver types for reuse
type FullNameResolver = ExtractResolver<User, UserContext, 'fullName'>
```

### Zero 'any' Types Guarantee

```typescript
// ✅ All types are fully inferred and type-safe
const createTypeSafeEntity = pipe(
  createUltraStrictEntityBuilder("User"),
  withSchema(UserSchema), // Schema.Schema<User>
  withKeys([              // Array<EntityKey>
    UltraStrictEntityBuilder.Key.create("id", GraphQLID, false)
  ]),
  withResolvers({         // SafeResolverMap<User, Context>
    fullName: (parent: User) => Effect.succeed(`${parent.firstName} ${parent.lastName}`)
  })
)

// ❌ No 'any' types anywhere - full compile-time validation
```

## Benefits

1. **Compile-Time Safety**: Invalid configurations are caught at TypeScript compilation
2. **Exhaustive Error Handling**: Pattern matching ensures all error cases are handled
3. **Zero Runtime Cost**: Phantom types are erased at runtime
4. **Functional Composition**: Pipe-friendly API for clean, readable code
5. **Type-Driven Development**: Schema changes automatically update dependent code
6. **Zero 'any' Types**: Complete type safety with advanced utility types
7. **IntelliSense Support**: Full IDE support with accurate autocompletion

## Best Practices

1. **Use pipe composition** for readable entity building
2. **Handle all validation cases** with exhaustive pattern matching
3. **Define schemas first** before creating entities
4. **Test entity validation** in isolation before composition
5. **Leverage TypeScript's type checking** to catch errors early

## Related APIs

- [Entity Builder](./entity-builder.md) - Standard entity creation
- [Error Handling](./error-handling.md) - Error types and patterns
- [Types](./types.md) - Core type definitions