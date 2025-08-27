/**
 * Schema-First Development Workflow Example
 *
 * Demonstrates the complete schema-first development lifecycle from
 * initial schema design through code generation and evolution.
 */

import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";

import { Kind } from "graphql";
import {
  createSchemaFirstService,
  createSchemaFirstWorkflow,
  type SchemaEvolution,
  SchemaFirst,
  type SchemaLifecycleState,
} from "../core/schema-first-patterns.js";

// ============================================================================
// Example Schema Definitions
// ============================================================================

const initialUserSchema = `
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String
  isActive: Boolean!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}
`;

const evolvedUserSchema = `
type User @key(fields: "id") @shareable {
  id: ID!
  email: String!
  name: String
  isActive: Boolean!
  lastLoginAt: DateTime  # New non-breaking field
  profile: UserProfile   # New related entity
}

type UserProfile {
  bio: String
  avatar: String
  preferences: JSON
}

type Query {
  user(id: ID!): User
  users: [User!]!
  userProfile(userId: ID!): UserProfile
}
`;

const breakingUserSchema = `
type User @key(fields: "id") {
  id: ID!
  email: String!
  fullName: String!     # Breaking: renamed from 'name'
  status: UserStatus!   # Breaking: changed from Boolean to enum
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

type Query {
  user(id: ID!): User
  users: [User!]!
}
`;

// ============================================================================
// Schema-First Workflow Demonstration
// ============================================================================

/**
 * Example 1: Initial Schema Development
 */
export const developInitialSchema = (): Effect.Effect<
  SchemaLifecycleState,
  never
> => {
  const service = createSchemaFirstService();
  const workflow = createSchemaFirstWorkflow(service);

  return pipe(
    workflow.developSchema(initialUserSchema),
    Effect.catchAll((error) => {
      console.error(`❌ Schema development failed: ${error.message}`);
      return Effect.succeed(
        SchemaFirst.State.Draft({
          schema: { kind: Kind.DOCUMENT, definitions: [] },
          version: "0.1.0",
        }),
      );
    }),
  );
};

/**
 * Example 2: Non-Breaking Schema Evolution
 */
export const evolveSchemaSuccessfully = (
  currentState: SchemaLifecycleState,
): Effect.Effect<SchemaLifecycleState, never> => {
  const service = createSchemaFirstService();
  const workflow = createSchemaFirstWorkflow(service);

  return pipe(
    workflow.evolveSchema(currentState, evolvedUserSchema),
    Effect.catchAll((error) => {
      console.error(`❌ Schema evolution failed: ${error.message}`);
      return Effect.succeed(currentState);
    }),
  );
};

/**
 * Example 3: Breaking Schema Evolution (Should Fail)
 */
export const evolveSchemaWithBreakingChanges = (
  currentState: SchemaLifecycleState,
): Effect.Effect<SchemaLifecycleState, never> => {
  const service = createSchemaFirstService();
  const workflow = createSchemaFirstWorkflow(service);

  return pipe(
    workflow.evolveSchema(currentState, breakingUserSchema),
    Effect.catchAll((error) => {
      console.log(`✅ Correctly prevented breaking changes: ${error.message}`);
      return Effect.succeed(currentState);
    }),
  );
};

/**
 * Example 4: Code Generation from Schema
 */
export const generateCodeFromSchema = (
  state: SchemaLifecycleState,
): Effect.Effect<Record<string, string>, never> => {
  const service = createSchemaFirstService();
  const workflow = createSchemaFirstWorkflow(service);

  return pipe(
    workflow.generateCode(state, ["resolvers", "types"] as const),
    Effect.catchAll((error) => {
      console.error(`❌ Code generation failed: ${error.message}`);
      return Effect.succeed({
        resolvers: "// Code generation failed",
        types: "// Code generation failed",
      });
    }),
  );
};

// ============================================================================
// Schema State Pattern Matching
// ============================================================================

/**
 * Pattern matching over schema lifecycle states
 */
export const handleSchemaState = (state: SchemaLifecycleState): string =>
  pipe(
    Match.value(state),
    Match.tag(
      "Draft",
      ({ version }) =>
        `📝 Schema is in draft state (v${version}) - needs validation`,
    ),
    Match.tag(
      "Validated",
      ({ entities, version }) =>
        `✅ Schema validated (v${version}) with ${entities.length} entities - ready for composition`,
    ),
    Match.tag(
      "Composed",
      ({ subgraphs, version }) =>
        `🔧 Schema composed (v${version}) across ${subgraphs.length} subgraphs - ready for deployment`,
    ),
    Match.tag(
      "Deployed",
      ({ deploymentId, version }) =>
        `🚀 Schema deployed (v${version}) with deployment ID: ${deploymentId}`,
    ),
    Match.tag(
      "Deprecated",
      ({ replacedBy, version }) =>
        `⚠️  Schema deprecated (v${version}) - replaced by ${replacedBy}`,
    ),
    Match.exhaustive,
  );

/**
 * Pattern matching over schema evolution operations
 */
export const handleSchemaEvolution = (evolution: SchemaEvolution): string =>
  pipe(
    Match.value(evolution),
    Match.tag(
      "AddField",
      ({ entityType, fieldName, fieldType, isBreaking }) =>
        `${isBreaking ? "❌" : "✅"} Add field '${fieldName}: ${fieldType}' to ${entityType} ${isBreaking ? "(BREAKING)" : "(Safe)"}`,
    ),
    Match.tag(
      "RemoveField",
      ({ entityType, fieldName, isBreaking }) =>
        `${isBreaking ? "❌" : "✅"} Remove field '${fieldName}' from ${entityType} ${isBreaking ? "(BREAKING)" : "(Safe)"}`,
    ),
    Match.tag(
      "ChangeFieldType",
      ({ entityType, fieldName, oldType, newType, isBreaking }) =>
        `${isBreaking ? "❌" : "✅"} Change field '${fieldName}' in ${entityType} from ${oldType} to ${newType} ${isBreaking ? "(BREAKING)" : "(Safe)"}`,
    ),
    Match.tag(
      "AddDirective",
      ({ entityType, fieldName, directive, isBreaking }) =>
        `${isBreaking ? "❌" : "✅"} Add @${directive} directive to ${entityType}${fieldName ? `.${fieldName}` : ""} ${isBreaking ? "(BREAKING)" : "(Safe)"}`,
    ),
    Match.tag(
      "RemoveDirective",
      ({ entityType, fieldName, directive, isBreaking }) =>
        `${isBreaking ? "❌" : "✅"} Remove @${directive} directive from ${entityType}${fieldName ? `.${fieldName}` : ""} ${isBreaking ? "(BREAKING)" : "(Safe)"}`,
    ),
    Match.tag(
      "AddEntity",
      ({ entityType, isBreaking }) =>
        `${isBreaking ? "❌" : "✅"} Add entity ${entityType} ${isBreaking ? "(BREAKING)" : "(Safe)"}`,
    ),
    Match.tag(
      "RemoveEntity",
      ({ entityType, isBreaking }) =>
        `${isBreaking ? "❌" : "✅"} Remove entity ${entityType} ${isBreaking ? "(BREAKING)" : "(Safe)"}`,
    ),
    Match.exhaustive,
  );

// ============================================================================
// Complete Workflow Demo
// ============================================================================

/**
 * Demonstrates the complete schema-first development workflow
 */
export const runSchemaFirstWorkflowDemo = (): Effect.Effect<void, never> =>
  pipe(
    Effect.Do,
    Effect.bind("initialState", () => developInitialSchema()),
    Effect.bind("evolvedState", ({ initialState }) =>
      evolveSchemaSuccessfully(initialState),
    ),
    Effect.bind("breakingAttempt", ({ initialState }) =>
      evolveSchemaWithBreakingChanges(initialState),
    ),
    Effect.bind("generatedCode", ({ evolvedState }) =>
      generateCodeFromSchema(evolvedState),
    ),
    Effect.flatMap(
      ({ initialState, evolvedState, breakingAttempt, generatedCode }) =>
        Effect.sync(() => {
          console.log("🧪 Schema-First Development Workflow Demo");
          console.log("=".repeat(50));

          console.log("\n📋 Step 1: Initial Schema Development");
          console.log(handleSchemaState(initialState));

          console.log("\n📋 Step 2: Non-Breaking Schema Evolution");
          console.log(handleSchemaState(evolvedState));

          console.log("\n📋 Step 3: Breaking Change Prevention");
          console.log(handleSchemaState(breakingAttempt));

          console.log("\n📋 Step 4: Code Generation Results");
          console.log("Generated Resolvers:");
          console.log(
            generatedCode["resolvers"]?.split("\n").slice(0, 10).join("\n") +
            "\n...",
          );

          console.log("\nGenerated Types:");
          console.log(
            generatedCode["types"]?.split("\n").slice(0, 8).join("\n") +
            "\n...",
          );

          console.log("\n" + "=".repeat(50));
          console.log("🎯 Schema-First Development Benefits:");
          console.log("✅ Type-safe schema evolution");
          console.log("✅ Breaking change detection");
          console.log("✅ Multi-language code generation");
          console.log("✅ Lifecycle state management");
          console.log("✅ Integration with UltraStrictEntityBuilder");
        }),
    ),
  );

// ============================================================================
// Advanced Schema Analysis Example
// ============================================================================

/**
 * Demonstrates advanced schema analysis capabilities
 */
export const analyzeSchemaComplexity = (
  schema: string,
): Effect.Effect<void, never> =>
  pipe(
    Effect.succeed(schema),
    Effect.map((schemaSource) => {
      // Simplified analysis - real implementation would parse AST
      const lines = schemaSource.split("\n");
      const typeCount = lines.filter((line) =>
        line.trim().startsWith("type "),
      ).length;
      const fieldCount = lines.filter((line) => line.includes(":")).length;
      const directiveCount = lines.filter((line) => line.includes("@")).length;

      return {
        typeCount,
        fieldCount,
        directiveCount,
        complexity: typeCount * fieldCount + directiveCount * 2,
      };
    }),
    Effect.flatMap((analysis) =>
      Effect.sync(() => {
        console.log("\n📊 Schema Complexity Analysis:");
        console.log(`   Types: ${analysis.typeCount}`);
        console.log(`   Fields: ${analysis.fieldCount}`);
        console.log(`   Directives: ${analysis.directiveCount}`);
        console.log(`   Complexity Score: ${analysis.complexity}`);

        if (analysis.complexity > 100) {
          console.log(
            "   ⚠️  High complexity - consider breaking into smaller schemas",
          );
        } else if (analysis.complexity > 50) {
          console.log(
            "   📈 Moderate complexity - good for medium-scale applications",
          );
        } else {
          console.log(
            "   ✅ Low complexity - suitable for simple applications",
          );
        }
      }),
    ),
  );

/**
 * Example usage of the complete workflow
 */
export const demonstrateCompleteWorkflow = (): Effect.Effect<void, never> =>
  pipe(
    runSchemaFirstWorkflowDemo(),
    Effect.flatMap(() => analyzeSchemaComplexity(initialUserSchema)),
    Effect.flatMap(() => analyzeSchemaComplexity(evolvedUserSchema)),
    Effect.flatMap(() =>
      Effect.sync(() => {
        console.log("\n🎉 Schema-First Development Complete!");
        console.log("The framework provides:");
        console.log("• Safe schema evolution with breaking change detection");
        console.log("• Multi-language code generation");
        console.log("• Integration with ultra-strict entity validation");
        console.log("• Lifecycle management from development to production");
      }),
    ),
  );
