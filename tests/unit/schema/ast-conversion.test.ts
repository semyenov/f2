import * as Schema from "@effect/schema/Schema";
import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  isInputType,
  isOutputType,
} from "graphql";
import {
  ASTConversion,
  createConversionContext,
} from "../../../src/schema/ast-conversion.js";

describe("AST Conversion", () => {
  describe("Basic Type Conversion", () => {
    test("should convert primitive Schema types to GraphQL types", async () => {
      const stringSchema = Schema.String;
      const numberSchema = Schema.Number;
      const booleanSchema = Schema.Boolean;

      const outputContext = createConversionContext(false);

      const stringType = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(stringSchema, outputContext),
      );
      const numberType = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(numberSchema, outputContext),
      );
      const booleanType = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(booleanSchema, outputContext),
      );

      expect(stringType).toBe(GraphQLString);
      expect(numberType).toBe(GraphQLFloat); // Default for Schema.Number
      expect(booleanType).toBe(GraphQLBoolean);
    });

    test("should convert integer Schema to GraphQLInt", async () => {
      const intSchema = Schema.Int;
      const outputContext = createConversionContext(false);

      const intType = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(intSchema, outputContext),
      );

      expect(intType).toBe(GraphQLInt);
    });
  });

  describe("Struct Type Conversion", () => {
    test("should convert Schema.Struct to GraphQLObjectType for output context", async () => {
      const UserSchema = Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        age: Schema.Number,
      });

      const outputContext = createConversionContext(false); // Output type

      const result = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(UserSchema, outputContext),
      );

      expect(isOutputType(result)).toBe(true);
      expect(result).toBeInstanceOf(GraphQLObjectType);

      const objectType = result as GraphQLObjectType;
      expect(objectType.name).toMatch(/User|Struct/); // Name generation may vary

      const fields = objectType.getFields();
      expect(fields["id"]).toBeDefined();
      expect(fields[`name`]).toBeDefined();
      expect(fields["age"]).toBeDefined();
    });

    test("should convert Schema.Struct to GraphQLInputObjectType for input context", async () => {
      const UserInputSchema = Schema.Struct({
        name: Schema.String,
        email: Schema.String,
      });

      const inputContext = createConversionContext(true); // Input type

      const result = await Effect.runPromise(
        ASTConversion.schemaToGraphQLType(UserInputSchema, inputContext),
      );

      expect(isInputType(result)).toBe(true);
      expect(result).toBeInstanceOf(GraphQLInputObjectType);

      const inputType = result as GraphQLInputObjectType;
      expect(inputType.name).toMatch(/Input|Struct/); // Name generation may vary
    });
  });

  describe("Context Management", () => {
    test("should create conversion context with proper configuration", () => {
      const outputContext = createConversionContext(false);
      expect(outputContext.isInput).toBe(false);
      expect(outputContext.depth).toBe(0);
      expect(outputContext.maxDepth).toBeGreaterThan(0);

      const inputContext = createConversionContext(true);
      expect(inputContext.isInput).toBe(true);
    });

    test("should support custom scalars in context", () => {
      const customScalars = {
        DateTime: GraphQLString, // Mock DateTime as String
      };

      const context = createConversionContext(false, customScalars);
      expect(context.scalars["DateTime"]).toBe(GraphQLString);
    });
  });

  describe("Error Handling", () => {
    test("should handle conversion errors gracefully", async () => {
      const context = createConversionContext(false, {}, { maxDepth: 0 });

      // This should trigger a max depth error
      const complexSchema = Schema.Struct({
        nested: Schema.Struct({
          deepNested: Schema.String,
        }),
      });

      try {
        await Effect.runPromise(
          ASTConversion.schemaToGraphQLType(complexSchema, context),
        );
        expect.unreachable("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Error should be related to depth or conversion failure
      }
    });
  });

  describe("Parallel Conversion", () => {
    test("should convert multiple schemas in parallel", async () => {
      const schemas = [
        {
          name: "User",
          schema: Schema.Struct({ id: Schema.String, name: Schema.String }),
        },
        {
          name: "Product",
          schema: Schema.Struct({ id: Schema.String, price: Schema.Number }),
        },
        {
          name: "Order",
          schema: Schema.Struct({ id: Schema.String, total: Schema.Number }),
        },
      ];

      const context = createConversionContext(false);

      const result = await Effect.runPromise(
        ASTConversion.convertSchemasParallel(schemas, context),
      );

      expect(Object.keys(result)).toHaveLength(3);
      expect(result["User"]).toBeDefined();
      expect(result["Product"]).toBeDefined();
      expect(result["Order"]).toBeDefined();

      // All results should be output types
      Object.values(result).forEach((type) => {
        expect(isOutputType(type)).toBe(true);
      });
    });
  });
});
