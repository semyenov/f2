# Entity Builder API Reference

The `ModernFederationEntityBuilder` provides a fluent interface for creating federation entities with Apollo Federation 2.x support.

## Class: ModernFederationEntityBuilder

### Constructor

```typescript
constructor(
  typename: string,
  schema: Schema.Schema<TSource, any>,
  keys: string[]
)
```

**Parameters:**
- `typename` - The GraphQL type name for the entity
- `schema` - Effect Schema defining the entity structure
- `keys` - Array of field names that serve as federation keys

### Methods

#### `withShareableField(fieldName: string): this`

Marks a field as shareable across subgraphs using the `@shareable` directive.

**Example:**
```typescript
const entity = new ModernFederationEntityBuilder("User", UserSchema, ["id"])
  .withShareableField("email")
  .withShareableField("name")
```

#### `withInaccessibleField(fieldName: string): this`

Marks a field as inaccessible using the `@inaccessible` directive.

**Example:**
```typescript
const entity = builder.withInaccessibleField("internalId")
```

#### `withTaggedField(fieldName: string, tags: string[]): this`

Adds tags to a field using the `@tag` directive.

**Example:**
```typescript
const entity = builder.withTaggedField("email", ["pii", "contact"])
```

#### `withExternalField(fieldName: string): this`

Marks a field as external using the `@external` directive.

**Example:**
```typescript
const entity = builder.withExternalField("createdAt")
```

#### `withProvidesField(fieldName: string, fields: string): this`

Specifies fields provided by this subgraph using the `@provides` directive.

**Example:**
```typescript
const entity = builder.withProvidesField("profile", "name email")
```

#### `withRequiresField(fieldName: string, fields: string): this`

Specifies required fields using the `@requires` directive.

**Example:**
```typescript
const entity = builder.withRequiresField("fullName", "firstName lastName")
```

#### `withOverrideField(fieldName: string, from: string): this`

Overrides a field from another subgraph using the `@override` directive.

**Example:**
```typescript
const entity = builder.withOverrideField("email", "legacy-users")
```

#### `withComposeDirective(directiveName: string, args?: Record<string, any>): this`

Adds a custom compose directive.

**Example:**
```typescript
const entity = builder.withComposeDirective("deprecated", { reason: "Use v2 API" })
```

#### `withResolver(fieldName: string, resolver: FieldResolver): this`

Adds a custom field resolver.

**Example:**
```typescript
const entity = builder.withResolver("fullName", (parent) => 
  Effect.succeed(`${parent.firstName} ${parent.lastName}`)
)
```

#### `withReferenceResolver(resolver: EntityReferenceResolver): this`

Sets the reference resolver for federation.

**Example:**
```typescript
const entity = builder.withReferenceResolver((reference, context) =>
  findUserById(reference.id).pipe(
    Effect.mapError(error => 
      new EntityResolutionError("User not found", "User", reference.id, error)
    )
  )
)
```

#### `build(): Effect.Effect<FederationEntity, ValidationError>`

Builds and validates the entity configuration.

**Returns:** Effect that either succeeds with a `FederationEntity` or fails with validation errors.

**Example:**
```typescript
const entityEffect = builder.build()
const entity = await Effect.runPromise(entityEffect)
```

## Types

### FederationEntity

```typescript
interface FederationEntity<TSource, TContext, TResult, TReference> {
  readonly typename: string
  readonly key: string | ReadonlyArray<string>
  readonly schema: Schema.Schema<TSource, any>
  readonly resolveReference: EntityReferenceResolver<TResult, TContext, TReference>
  readonly fields: FieldResolverMap<TResult, TContext> | undefined
  readonly directives: FederationDirectiveMap | undefined
  readonly extensions: Record<string, unknown> | undefined
}
```

### EntityReferenceResolver

```typescript
interface EntityReferenceResolver<TResult, TContext, TReference> {
  (
    reference: TReference, 
    context: TContext, 
    info: GraphQLResolveInfo
  ): Effect.Effect<TResult, EntityResolutionError>
}
```

### FieldResolver

```typescript
interface FieldResolver<TSource, TContext, TReturn, TArgs = Record<string, unknown>> {
  (
    parent: TSource, 
    args: TArgs, 
    context: TContext, 
    info: GraphQLResolveInfo
  ): Effect.Effect<TReturn, FieldResolutionError>
}
```

## Complete Example

```typescript
import * as Effect from "effect/Effect"
import * as Schema from "@effect/schema/Schema"
import { ModernFederationEntityBuilder } from "@cqrs/federation-v2/core"

// Define entity schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  role: Schema.optional(Schema.String)
})

// Create entity with full configuration
const createUserEntity = () => {
  const builder = new ModernFederationEntityBuilder("User", UserSchema, ["id"])
    .withShareableField("email")
    .withTaggedField("role", ["authorization"])
    .withResolver("fullName", (parent) =>
      Effect.succeed(`${parent.firstName} ${parent.lastName}`)
    )
    .withReferenceResolver((reference, context) =>
      findUserById(reference.id).pipe(
        Effect.mapError(error => 
          new EntityResolutionError(
            "Failed to resolve user reference",
            "User",
            reference.id,
            error
          )
        )
      )
    )

  return builder.build()
}

// Usage in federation composer
Effect.gen(function* () {
  const userEntity = yield* createUserEntity()
  
  const federatedSchema = yield* FederationComposer.create({
    entities: [userEntity],
    services: [{ id: "users", url: "http://localhost:4001" }],
    // ... other configuration
  })
  
  return federatedSchema
})
```

## Best Practices

1. **Schema Design**: Use Effect Schema for type safety and validation
2. **Error Handling**: Always use Effect-based error handling in resolvers
3. **Reference Resolution**: Implement robust reference resolvers with proper error mapping
4. **Directives**: Use federation directives to optimize subgraph composition
5. **Testing**: Test entity creation and validation in isolation before composition

## Related APIs

- [Ultra-Strict Entity Builder](./ultra-strict-entity-builder.md) - Type-safe alternative
- [Error Handling](./error-handling.md) - Error types and patterns
- [Federation Composer](./federation-composer.md) - Schema composition
- [Types](./types.md) - Core type definitions