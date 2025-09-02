import { createEntityBuilder, toFederationEntity } from '@runtime/core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { describe, expect, it } from 'vitest'

describe('Entity Builder Coverage Tests', () => {
  const TestSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    value: Schema.optional(Schema.Number)
  })

  describe('toFederationEntity', () => {
    it('should convert ValidatedEntity to FederationEntity', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
      const validated = await Effect.runPromise(builder.build())

      const federation = toFederationEntity(validated as any)

      expect(federation.typename).toBe('Test')
      expect(federation.key).toBeDefined()
    })

    it('should preserve reference resolver', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
      const validated = await Effect.runPromise(builder.build())

      const resolver = () => Effect.succeed({ id: '1', name: 'test' })
      const federation = toFederationEntity(validated as any, resolver)

      expect(federation.resolveReference).toBe(resolver)
    })

    it('should handle conversion without resolver', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
      const validated = await Effect.runPromise(builder.build())

      const federation = toFederationEntity(validated as unknown as (typeof validated & { key: string[] }), undefined)

      // When no resolver is passed, a default one is provided
      expect(federation.resolveReference).toBeDefined()
      expect(typeof federation.resolveReference).toBe('function')
    })
  })

  describe('Builder Methods', () => {
    it('should create default reference resolver', () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
      const resolver = builder.createDefaultReferenceResolver()

      expect(typeof resolver).toBe('function')
    })

    it('should handle multiple key fields', async () => {
      const MultiKeySchema = Schema.Struct({
        key1: Schema.String,
        key2: Schema.String,
        data: Schema.String
      })

      const builder = createEntityBuilder('MultiKey', MultiKeySchema, ['key1', 'key2'])
      const entity = await Effect.runPromise(builder.build())

      expect(entity.keys).toHaveLength(2)
      expect(entity.keys[0]?.field).toBe('key1')
      expect(entity.keys[1]?.field).toBe('key2')
    })

    it('should add external field directive', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withExternalField('value')
        .withReferenceResolver(() => Effect.succeed({ id: '1', name: 'test' }))

      const entity = await Effect.runPromise(builder.build())
      const externalDirective = entity.directives.find(d => d.name === 'external')

      expect(externalDirective).toBeDefined()
    })

    it('should add override field directive', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withOverrideField('name', 'inventory', () => Effect.succeed('overridden'))

      const entity = await Effect.runPromise(builder.build())
      const overrideDirective = entity.directives.find(d => d.name === 'override')

      expect(overrideDirective).toBeDefined()
      expect(overrideDirective?.args?.['from']).toBe('inventory')
    })

    it('should add provides field directive', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withProvidedFields('value', 'name id')
        .withReferenceResolver(() => Effect.succeed({ id: '1', name: 'test' }))

      const entity = await Effect.runPromise(builder.build())
      const providesDirective = entity.directives.find(d => d.name === 'provides')

      expect(providesDirective).toBeDefined()
      expect(providesDirective?.args?.['fields']).toBe('name id')
    })

    it('should add requires field directive', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withRequiredFields('value', 'name')
        .withReferenceResolver(() => Effect.succeed({ id: '1', name: 'test' }))

      const entity = await Effect.runPromise(builder.build())
      const requiresDirective = entity.directives.find(d => d.name === 'requires')

      expect(requiresDirective).toBeDefined()
      expect(requiresDirective?.args?.['fields']).toBe('name')
    })

    it('should handle field resolver with Effect', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withField('name', () => Effect.succeed('resolved'))

      const entity = await Effect.runPromise(builder.build())

      expect(entity.resolvers).toBeDefined()
      expect(entity.resolvers?.['name']).toBeDefined()
    })

    it('should handle reference resolver with Effect', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withReferenceResolver((ref: any) =>
          Effect.succeed({ id: ref.id, name: 'resolved', value: 42 })
        )

      const entity = await Effect.runPromise(builder.build())
      expect(entity).toBeDefined()
    })
  })

  describe('Validation', () => {
    it('should create entity with metadata', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
      const entity = await Effect.runPromise(builder.build())

      expect(entity.metadata.typename).toBe('Test')
      expect(entity.metadata.version).toBe('2.0.0')
      expect(entity.metadata.createdAt).toBeInstanceOf(Date)
      expect(entity.metadata.validationLevel).toBe('strict')
    })

    it('should handle composite keys', async () => {
      const CompositeSchema = Schema.Struct({
        part1: Schema.String,
        part2: Schema.String,
        data: Schema.String
      })

      const builder = createEntityBuilder('Composite', CompositeSchema, ['part1', 'part2'])
      const entity = await Effect.runPromise(builder.build())

      expect(entity.keys).toHaveLength(2)
      entity.keys.forEach(key => {
        expect(key.isComposite).toBe(true)
      })
    })

    it('should handle single key', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
      const entity = await Effect.runPromise(builder.build())

      expect(entity.keys).toHaveLength(1)
      expect(entity.keys[0]?.isComposite).toBe(false)
    })
  })

  describe('Directives', () => {
    it('should combine multiple directives on same field', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withShareableField('name')
        .withTaggedField('name', ['pii'])
      // Note: Cannot use withInaccessibleField with withShareableField - they conflict

      const entity = await Effect.runPromise(builder.build())

      const nameDirectives = entity.directives.filter(d =>
        d.applicableFields?.includes('name')
      )

      expect(nameDirectives.length).toBeGreaterThanOrEqual(2)
    })

    it('should reject empty tag array', () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])

      expect(() => builder.withTaggedField('name', [])).toThrow('Tags array cannot be empty')
    })

    it('should handle multiple tagged fields', async () => {
      const builder = createEntityBuilder('Test', TestSchema, ['id'])
        .withTaggedField('name', ['pii'])
        .withTaggedField('value', ['internal'])

      const entity = await Effect.runPromise(builder.build())
      const tagDirectives = entity.directives.filter(d => d.name === 'tag')

      expect(tagDirectives).toHaveLength(2)
    })
  })
})
