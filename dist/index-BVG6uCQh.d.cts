import { BaseDomainError, CircuitBreaker, CircuitBreakerConfig, CircuitBreakerError, CircuitBreakerMetrics, CircuitBreakerState, CompositionError, DataLoaderConfig, DeepReadonly, DiscoveryError, DomainError, EntityReferenceResolver, EntityResolutionError, EntityTypename, ErrorBoundaryConfig, ErrorFactory, ErrorMatching, ErrorTransformationConfig, ExtractResolver, FederatedSchema, FederationCompositionConfig, FederationDirective, FederationDirectiveMap, FederationDomainError, FederationEntity, FederationError, FieldName, FieldResolutionError, FieldResolver, FieldResolverMap, HealthCheckError, HealthStatus, HotReloadableSchema, MakeRequired, MetricsConfig, NonEmptyArray, OptionalKeys, PartialFailureConfig, PerformanceConfig, Prettify, QueryHash, QueryPlanCacheConfig, RegistrationError, RequireAtLeastOne, RequiredKeys, SafeResolverMap, SchemaChange, SchemaConflict, SchemaImportResult, SchemaMetadata, SchemaValidationError, SchemaWatcher, ServiceDefinition, ServiceId, SubgraphRegistry, SyncResult, TimeoutError, TypeConversionError, ValidationError, __export, asUntypedEntity } from "./types-CIKLW6fG.cjs";
import { FederationEntityBuilder, ValidatedEntity, createEntityBuilder, toFederationEntity } from "./index-Bw6VmEgg.cjs";
import * as Effect from "effect/Effect";
import { DocumentNode, GraphQLInputType, GraphQLOutputType, GraphQLScalarType, GraphQLSchema, GraphQLType } from "graphql";
import * as Schema from "effect/Schema";
import * as Data from "effect/Data";
import * as effect_Types3 from "effect/Types";
import * as effect_Cause6 from "effect/Cause";
import * as effect_Unify0 from "effect/Unify";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as effect_ParseResult0 from "effect/ParseResult";
import * as effect_ConfigError0 from "effect/ConfigError";

//#region src/runtime/core/schema-first-patterns.d.ts

/**
 * Schema development lifecycle states
 */
type SchemaLifecycleState = Data.TaggedEnum<{
  readonly Draft: {
    readonly schema: DocumentNode;
    readonly version: string;
  };
  readonly Validated: {
    readonly schema: DocumentNode;
    readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
    readonly version: string;
  };
  readonly Composed: {
    readonly federatedSchema: GraphQLSchema;
    readonly subgraphs: readonly string[];
    readonly version: string;
  };
  readonly Deployed: {
    readonly federatedSchema: GraphQLSchema;
    readonly deploymentId: string;
    readonly version: string;
  };
  readonly Deprecated: {
    readonly schema: DocumentNode;
    readonly replacedBy: string;
    readonly version: string;
  };
}>;
declare const SchemaLifecycleState: {
  readonly Draft: Data.Case.Constructor<{
    readonly _tag: "Draft";
    readonly schema: DocumentNode;
    readonly version: string;
  }, "_tag">;
  readonly Validated: Data.Case.Constructor<{
    readonly _tag: "Validated";
    readonly schema: DocumentNode;
    readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
    readonly version: string;
  }, "_tag">;
  readonly Composed: Data.Case.Constructor<{
    readonly _tag: "Composed";
    readonly federatedSchema: GraphQLSchema;
    readonly subgraphs: readonly string[];
    readonly version: string;
  }, "_tag">;
  readonly Deployed: Data.Case.Constructor<{
    readonly _tag: "Deployed";
    readonly federatedSchema: GraphQLSchema;
    readonly deploymentId: string;
    readonly version: string;
  }, "_tag">;
  readonly Deprecated: Data.Case.Constructor<{
    readonly _tag: "Deprecated";
    readonly schema: DocumentNode;
    readonly replacedBy: string;
    readonly version: string;
  }, "_tag">;
  readonly $is: <Tag extends "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">(tag: Tag) => (u: unknown) => u is Extract<{
    readonly _tag: "Draft";
    readonly schema: DocumentNode;
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Validated";
    readonly schema: DocumentNode;
    readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Composed";
    readonly federatedSchema: GraphQLSchema;
    readonly subgraphs: readonly string[];
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Deployed";
    readonly federatedSchema: GraphQLSchema;
    readonly deploymentId: string;
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Deprecated";
    readonly schema: DocumentNode;
    readonly replacedBy: string;
    readonly version: string;
  }, {
    readonly _tag: Tag;
  }>;
  readonly $match: {
    <const Cases extends {
      readonly Draft: (args: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      }) => any;
      readonly Validated: (args: {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
        readonly version: string;
      }) => any;
      readonly Composed: (args: {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      }) => any;
      readonly Deployed: (args: {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      }) => any;
      readonly Deprecated: (args: {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }) => any;
    }>(cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): (value: {
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    } | {
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
      readonly version: string;
    } | {
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    } | {
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    } | {
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }) => effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
    <const Cases extends {
      readonly Draft: (args: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      }) => any;
      readonly Validated: (args: {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
        readonly version: string;
      }) => any;
      readonly Composed: (args: {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      }) => any;
      readonly Deployed: (args: {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      }) => any;
      readonly Deprecated: (args: {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }) => any;
    }>(value: {
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    } | {
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
      readonly version: string;
    } | {
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    } | {
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    } | {
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }, cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
  };
};
/**
 * Schema evolution operations
 */
type SchemaEvolution = Data.TaggedEnum<{
  readonly AddField: {
    readonly entityType: string;
    readonly fieldName: string;
    readonly fieldType: string;
    readonly isBreaking: boolean;
  };
  readonly RemoveField: {
    readonly entityType: string;
    readonly fieldName: string;
    readonly isBreaking: boolean;
  };
  readonly ChangeFieldType: {
    readonly entityType: string;
    readonly fieldName: string;
    readonly oldType: string;
    readonly newType: string;
    readonly isBreaking: boolean;
  };
  readonly AddDirective: {
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  };
  readonly RemoveDirective: {
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  };
  readonly AddEntity: {
    readonly entityType: string;
    readonly isBreaking: boolean;
  };
  readonly RemoveEntity: {
    readonly entityType: string;
    readonly isBreaking: boolean;
  };
}>;
declare const SchemaEvolution: {
  readonly AddField: Data.Case.Constructor<{
    readonly _tag: "AddField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly fieldType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly RemoveField: Data.Case.Constructor<{
    readonly _tag: "RemoveField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly ChangeFieldType: Data.Case.Constructor<{
    readonly _tag: "ChangeFieldType";
    readonly entityType: string;
    readonly fieldName: string;
    readonly oldType: string;
    readonly newType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly AddDirective: Data.Case.Constructor<{
    readonly _tag: "AddDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly RemoveDirective: Data.Case.Constructor<{
    readonly _tag: "RemoveDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly AddEntity: Data.Case.Constructor<{
    readonly _tag: "AddEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly RemoveEntity: Data.Case.Constructor<{
    readonly _tag: "RemoveEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, "_tag">;
  readonly $is: <Tag extends "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">(tag: Tag) => (u: unknown) => u is Extract<{
    readonly _tag: "AddField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly fieldType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "RemoveField";
    readonly entityType: string;
    readonly fieldName: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "ChangeFieldType";
    readonly entityType: string;
    readonly fieldName: string;
    readonly oldType: string;
    readonly newType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "AddDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "RemoveDirective";
    readonly entityType: string;
    readonly fieldName: string | undefined;
    readonly directive: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "AddEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "RemoveEntity";
    readonly entityType: string;
    readonly isBreaking: boolean;
  }, {
    readonly _tag: Tag;
  }>;
  readonly $match: {
    <const Cases extends {
      readonly AddField: (args: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveField: (args: {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly ChangeFieldType: (args: {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddDirective: (args: {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveDirective: (args: {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddEntity: (args: {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveEntity: (args: {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
    }>(cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): (value: {
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }) => effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
    <const Cases extends {
      readonly AddField: (args: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveField: (args: {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly ChangeFieldType: (args: {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddDirective: (args: {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveDirective: (args: {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly AddEntity: (args: {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
      readonly RemoveEntity: (args: {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => any;
    }>(value: {
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    } | {
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
  };
};
declare const SchemaFirstError_base: new <A extends Record<string, any> = {}>(args: effect_Types3.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause6.YieldableError & {
  readonly _tag: "SchemaFirstError";
} & Readonly<A>;
declare class SchemaFirstError extends SchemaFirstError_base<{
  readonly message: string;
  readonly schemaPath?: readonly string[];
  readonly suggestion?: string;
}> {}
declare const SchemaEvolutionError_base: new <A extends Record<string, any> = {}>(args: effect_Types3.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause6.YieldableError & {
  readonly _tag: "SchemaEvolutionError";
} & Readonly<A>;
declare class SchemaEvolutionError extends SchemaEvolutionError_base<{
  readonly message: string;
  readonly evolution: SchemaEvolution;
  readonly conflictingChanges?: readonly SchemaEvolution[];
}> {}
declare const CodeGenerationError_base: new <A extends Record<string, any> = {}>(args: effect_Types3.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }) => effect_Cause6.YieldableError & {
  readonly _tag: "CodeGenerationError";
} & Readonly<A>;
declare class CodeGenerationError extends CodeGenerationError_base<{
  readonly message: string;
  readonly targetLanguage: string;
  readonly entityType: string;
}> {}
interface SchemaFirstService {
  readonly parseSchemaDefinition: (schemaSource: string) => Effect.Effect<DocumentNode, SchemaFirstError>;
  readonly extractEntitiesFromSchema: (schema: DocumentNode) => Effect.Effect<readonly string[], SchemaFirstError>;
  readonly generateEntityBuilders: (schema: DocumentNode) => Effect.Effect<readonly ValidatedEntity<unknown, unknown, unknown>[], SchemaFirstError>;
  readonly validateSchemaEvolution: (currentSchema: DocumentNode, proposedSchema: DocumentNode) => Effect.Effect<readonly SchemaEvolution[], SchemaEvolutionError>;
  readonly generateResolverStubs: <A, I, R>(entities: readonly ValidatedEntity<A, I, R>[]) => Effect.Effect<string, CodeGenerationError, never>;
  readonly generateTypeDefinitions: <A, I, R>(entities: readonly ValidatedEntity<A, I, R>[], language: 'typescript' | 'go' | 'java' | 'python') => Effect.Effect<string, CodeGenerationError, never>;
}
declare const SchemaFirstService: Context.Tag<SchemaFirstService, SchemaFirstService>;
declare const createSchemaFirstService: () => SchemaFirstService;
interface SchemaFirstWorkflow {
  readonly developSchema: (schemaSource: string) => Effect.Effect<SchemaLifecycleState, SchemaFirstError>;
  readonly evolveSchema: (currentState: SchemaLifecycleState, proposedSchema: string) => Effect.Effect<SchemaLifecycleState, SchemaEvolutionError>;
  readonly generateCode: (state: SchemaLifecycleState, targets: readonly ('resolvers' | 'types')[]) => Effect.Effect<Record<string, string>, CodeGenerationError>;
}
declare const createSchemaFirstWorkflow: (schemaFirstService: SchemaFirstService) => SchemaFirstWorkflow;
declare namespace SchemaFirst {
  const Service: {
    create: () => SchemaFirstService;
    Tag: Context.Tag<SchemaFirstService, SchemaFirstService>;
  };
  const Workflow: {
    create: (schemaFirstService: SchemaFirstService) => SchemaFirstWorkflow;
  };
  const State: {
    readonly Draft: Data.Case.Constructor<{
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    }, "_tag">;
    readonly Validated: Data.Case.Constructor<{
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
      readonly version: string;
    }, "_tag">;
    readonly Composed: Data.Case.Constructor<{
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    }, "_tag">;
    readonly Deployed: Data.Case.Constructor<{
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    }, "_tag">;
    readonly Deprecated: Data.Case.Constructor<{
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }, "_tag">;
    readonly $is: <Tag extends "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">(tag: Tag) => (u: unknown) => u is Extract<{
      readonly _tag: "Draft";
      readonly schema: DocumentNode;
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Validated";
      readonly schema: DocumentNode;
      readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Composed";
      readonly federatedSchema: GraphQLSchema;
      readonly subgraphs: readonly string[];
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Deployed";
      readonly federatedSchema: GraphQLSchema;
      readonly deploymentId: string;
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "Deprecated";
      readonly schema: DocumentNode;
      readonly replacedBy: string;
      readonly version: string;
    }, {
      readonly _tag: Tag;
    }>;
    readonly $match: {
      <const Cases extends {
        readonly Draft: (args: {
          readonly _tag: "Draft";
          readonly schema: DocumentNode;
          readonly version: string;
        }) => any;
        readonly Validated: (args: {
          readonly _tag: "Validated";
          readonly schema: DocumentNode;
          readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
          readonly version: string;
        }) => any;
        readonly Composed: (args: {
          readonly _tag: "Composed";
          readonly federatedSchema: GraphQLSchema;
          readonly subgraphs: readonly string[];
          readonly version: string;
        }) => any;
        readonly Deployed: (args: {
          readonly _tag: "Deployed";
          readonly federatedSchema: GraphQLSchema;
          readonly deploymentId: string;
          readonly version: string;
        }) => any;
        readonly Deprecated: (args: {
          readonly _tag: "Deprecated";
          readonly schema: DocumentNode;
          readonly replacedBy: string;
          readonly version: string;
        }) => any;
      }>(cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): (value: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      } | {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
        readonly version: string;
      } | {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      } | {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      } | {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }) => effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
      <const Cases extends {
        readonly Draft: (args: {
          readonly _tag: "Draft";
          readonly schema: DocumentNode;
          readonly version: string;
        }) => any;
        readonly Validated: (args: {
          readonly _tag: "Validated";
          readonly schema: DocumentNode;
          readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
          readonly version: string;
        }) => any;
        readonly Composed: (args: {
          readonly _tag: "Composed";
          readonly federatedSchema: GraphQLSchema;
          readonly subgraphs: readonly string[];
          readonly version: string;
        }) => any;
        readonly Deployed: (args: {
          readonly _tag: "Deployed";
          readonly federatedSchema: GraphQLSchema;
          readonly deploymentId: string;
          readonly version: string;
        }) => any;
        readonly Deprecated: (args: {
          readonly _tag: "Deprecated";
          readonly schema: DocumentNode;
          readonly replacedBy: string;
          readonly version: string;
        }) => any;
      }>(value: {
        readonly _tag: "Draft";
        readonly schema: DocumentNode;
        readonly version: string;
      } | {
        readonly _tag: "Validated";
        readonly schema: DocumentNode;
        readonly entities: readonly ValidatedEntity<unknown, unknown, unknown>[];
        readonly version: string;
      } | {
        readonly _tag: "Composed";
        readonly federatedSchema: GraphQLSchema;
        readonly subgraphs: readonly string[];
        readonly version: string;
      } | {
        readonly _tag: "Deployed";
        readonly federatedSchema: GraphQLSchema;
        readonly deploymentId: string;
        readonly version: string;
      } | {
        readonly _tag: "Deprecated";
        readonly schema: DocumentNode;
        readonly replacedBy: string;
        readonly version: string;
      }, cases: Cases & { [K in Exclude<keyof Cases, "Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated">]: never }): effect_Unify0.Unify<ReturnType<Cases["Draft" | "Validated" | "Composed" | "Deployed" | "Deprecated"]>>;
    };
  };
  const Evolution: {
    readonly AddField: Data.Case.Constructor<{
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly RemoveField: Data.Case.Constructor<{
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly ChangeFieldType: Data.Case.Constructor<{
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly AddDirective: Data.Case.Constructor<{
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly RemoveDirective: Data.Case.Constructor<{
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly AddEntity: Data.Case.Constructor<{
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly RemoveEntity: Data.Case.Constructor<{
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, "_tag">;
    readonly $is: <Tag extends "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">(tag: Tag) => (u: unknown) => u is Extract<{
      readonly _tag: "AddField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly fieldType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "RemoveField";
      readonly entityType: string;
      readonly fieldName: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "ChangeFieldType";
      readonly entityType: string;
      readonly fieldName: string;
      readonly oldType: string;
      readonly newType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "AddDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "RemoveDirective";
      readonly entityType: string;
      readonly fieldName: string | undefined;
      readonly directive: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "AddEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }> | Extract<{
      readonly _tag: "RemoveEntity";
      readonly entityType: string;
      readonly isBreaking: boolean;
    }, {
      readonly _tag: Tag;
    }>;
    readonly $match: {
      <const Cases extends {
        readonly AddField: (args: {
          readonly _tag: "AddField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly fieldType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveField: (args: {
          readonly _tag: "RemoveField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly ChangeFieldType: (args: {
          readonly _tag: "ChangeFieldType";
          readonly entityType: string;
          readonly fieldName: string;
          readonly oldType: string;
          readonly newType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddDirective: (args: {
          readonly _tag: "AddDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveDirective: (args: {
          readonly _tag: "RemoveDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddEntity: (args: {
          readonly _tag: "AddEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveEntity: (args: {
          readonly _tag: "RemoveEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
      }>(cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): (value: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }) => effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
      <const Cases extends {
        readonly AddField: (args: {
          readonly _tag: "AddField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly fieldType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveField: (args: {
          readonly _tag: "RemoveField";
          readonly entityType: string;
          readonly fieldName: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly ChangeFieldType: (args: {
          readonly _tag: "ChangeFieldType";
          readonly entityType: string;
          readonly fieldName: string;
          readonly oldType: string;
          readonly newType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddDirective: (args: {
          readonly _tag: "AddDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveDirective: (args: {
          readonly _tag: "RemoveDirective";
          readonly entityType: string;
          readonly fieldName: string | undefined;
          readonly directive: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly AddEntity: (args: {
          readonly _tag: "AddEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
        readonly RemoveEntity: (args: {
          readonly _tag: "RemoveEntity";
          readonly entityType: string;
          readonly isBreaking: boolean;
        }) => any;
      }>(value: {
        readonly _tag: "AddField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly fieldType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveField";
        readonly entityType: string;
        readonly fieldName: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "ChangeFieldType";
        readonly entityType: string;
        readonly fieldName: string;
        readonly oldType: string;
        readonly newType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveDirective";
        readonly entityType: string;
        readonly fieldName: string | undefined;
        readonly directive: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "AddEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      } | {
        readonly _tag: "RemoveEntity";
        readonly entityType: string;
        readonly isBreaking: boolean;
      }, cases: Cases & { [K in Exclude<keyof Cases, "AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity">]: never }): effect_Unify0.Unify<ReturnType<Cases["AddField" | "RemoveField" | "ChangeFieldType" | "AddDirective" | "RemoveDirective" | "AddEntity" | "RemoveEntity"]>>;
    };
  };
}
//#endregion
//#region src/runtime/effect/services/config.d.ts
/**
 * Federation Framework configuration schema with comprehensive validation
 *
 * Defines the complete configuration structure for federated GraphQL services,
 * including server settings, database connections, caching, resilience patterns,
 * and observability features.
 *
 * @example Minimal configuration
 * ```typescript
 * const minimalConfig = {
 *   server: { port: 4000, host: 'localhost', cors: { enabled: false, origins: [] } },
 *   federation: { introspection: true, playground: true, subscriptions: false, tracing: false },
 *   database: { url: 'postgresql://localhost:5432/test', maxConnections: 5, connectionTimeout: '10s' },
 *   cache: { redis: { url: 'redis://localhost:6379', keyPrefix: 'test:', defaultTtl: '5m' } },
 *   resilience: { circuitBreaker: { failureThreshold: 3, resetTimeout: '10s', halfOpenMaxCalls: 1 } },
 *   observability: {
 *     metrics: { enabled: false, port: 9090 },
 *     tracing: { enabled: false, serviceName: 'test', endpoint: 'http://localhost:14268/api/traces' }
 *   }
 * }
 * ```
 *
 * @category Core Services
 */
declare const FederationConfigSchema: Schema.Struct<{
  server: Schema.Struct<{
    port: Schema.filter<Schema.filter<typeof Schema.Number>>;
    host: typeof Schema.String;
    cors: Schema.Struct<{
      enabled: typeof Schema.Boolean;
      origins: Schema.Array$<typeof Schema.String>;
    }>;
  }>;
  federation: Schema.Struct<{
    introspection: typeof Schema.Boolean;
    playground: typeof Schema.Boolean;
    subscriptions: typeof Schema.Boolean;
    tracing: typeof Schema.Boolean;
  }>;
  database: Schema.Struct<{
    url: typeof Schema.String;
    maxConnections: Schema.filter<Schema.filter<typeof Schema.Number>>;
    connectionTimeout: typeof Schema.String;
  }>;
  cache: Schema.Struct<{
    redis: Schema.Struct<{
      url: typeof Schema.String;
      keyPrefix: typeof Schema.String;
      defaultTtl: typeof Schema.String;
    }>;
  }>;
  resilience: Schema.Struct<{
    circuitBreaker: Schema.Struct<{
      failureThreshold: Schema.filter<Schema.filter<typeof Schema.Number>>;
      resetTimeout: typeof Schema.String;
      halfOpenMaxCalls: Schema.filter<Schema.filter<typeof Schema.Number>>;
    }>;
  }>;
  observability: Schema.Struct<{
    metrics: Schema.Struct<{
      enabled: typeof Schema.Boolean;
      port: Schema.filter<Schema.filter<typeof Schema.Number>>;
    }>;
    tracing: Schema.Struct<{
      enabled: typeof Schema.Boolean;
      serviceName: typeof Schema.String;
      endpoint: typeof Schema.String;
    }>;
  }>;
}>;
type FederationServiceConfig = Schema.Schema.Type<typeof FederationConfigSchema>;
declare const FederationConfigService_base: Context.TagClass<FederationConfigService, "FederationConfigService", {
  readonly federation: {
    readonly introspection: boolean;
    readonly playground: boolean;
    readonly subscriptions: boolean;
    readonly tracing: boolean;
  };
  readonly resilience: {
    readonly circuitBreaker: {
      readonly failureThreshold: number;
      readonly resetTimeout: string;
      readonly halfOpenMaxCalls: number;
    };
  };
  readonly server: {
    readonly port: number;
    readonly host: string;
    readonly cors: {
      readonly enabled: boolean;
      readonly origins: readonly string[];
    };
  };
  readonly database: {
    readonly url: string;
    readonly maxConnections: number;
    readonly connectionTimeout: string;
  };
  readonly cache: {
    readonly redis: {
      readonly url: string;
      readonly keyPrefix: string;
      readonly defaultTtl: string;
    };
  };
  readonly observability: {
    readonly tracing: {
      readonly enabled: boolean;
      readonly serviceName: string;
      readonly endpoint: string;
    };
    readonly metrics: {
      readonly port: number;
      readonly enabled: boolean;
    };
  };
}>;
declare class FederationConfigService extends FederationConfigService_base {}
declare const FederationConfigLive: Layer.Layer<FederationConfigService, effect_ParseResult0.ParseError | effect_ConfigError0.ConfigError, never>;
declare const getServerConfig: Effect.Effect<{
  readonly port: number;
  readonly host: string;
  readonly cors: {
    readonly enabled: boolean;
    readonly origins: readonly string[];
  };
}, never, FederationConfigService>;
declare const getFederationConfig: Effect.Effect<{
  readonly introspection: boolean;
  readonly playground: boolean;
  readonly subscriptions: boolean;
  readonly tracing: boolean;
}, never, FederationConfigService>;
declare const getDatabaseConfig: Effect.Effect<{
  readonly url: string;
  readonly maxConnections: number;
  readonly connectionTimeout: string;
}, never, FederationConfigService>;
declare const getCacheConfig: Effect.Effect<{
  readonly redis: {
    readonly url: string;
    readonly keyPrefix: string;
    readonly defaultTtl: string;
  };
}, never, FederationConfigService>;
declare const getResilienceConfig: Effect.Effect<{
  readonly circuitBreaker: {
    readonly failureThreshold: number;
    readonly resetTimeout: string;
    readonly halfOpenMaxCalls: number;
  };
}, never, FederationConfigService>;
declare const getObservabilityConfig: Effect.Effect<{
  readonly tracing: {
    readonly enabled: boolean;
    readonly serviceName: string;
    readonly endpoint: string;
  };
  readonly metrics: {
    readonly port: number;
    readonly enabled: boolean;
  };
}, never, FederationConfigService>;
//#endregion
//#region src/runtime/effect/services/logger.d.ts
declare const FederationLogger_base: Context.TagClass<FederationLogger, "FederationLogger", {
  readonly trace: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>;
  readonly debug: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>;
  readonly info: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>;
  readonly warn: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>;
  readonly error: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>;
  readonly withSpan: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
}>;
declare class FederationLogger extends FederationLogger_base {}
declare const FederationLoggerLive: Layer.Layer<FederationLogger, never, never>;
declare const trace: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void, never, FederationLogger>;
declare const debug: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void, never, FederationLogger>;
declare const info: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void, never, FederationLogger>;
declare const warn: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void, never, FederationLogger>;
declare const error: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void, never, FederationLogger>;
declare const withSpan: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, FederationLogger | R>;
declare const developmentLogger: Layer.Layer<FederationLogger, never, never>;
declare const productionLogger: Layer.Layer<FederationLogger, never, never>;
declare const testLogger: Layer.Layer<FederationLogger, never, never>;
//#endregion
//#region src/runtime/effect/services/layers.d.ts
declare const CoreServicesLive: Layer.Layer<FederationLogger | FederationConfigService, effect_ParseResult0.ParseError | effect_ConfigError0.ConfigError, never>;
declare const DevelopmentLayerLive: Layer.Layer<FederationLogger | FederationConfigService, effect_ParseResult0.ParseError | effect_ConfigError0.ConfigError, never>;
declare const ProductionLayerLive: Layer.Layer<FederationLogger | FederationConfigService, effect_ParseResult0.ParseError | effect_ConfigError0.ConfigError, never>;
declare const TestLayerLive: Layer.Layer<FederationLogger | FederationConfigService, effect_ParseResult0.ParseError | effect_ConfigError0.ConfigError, never>;
declare const MinimalLayerLive: Layer.Layer<FederationConfigService, effect_ParseResult0.ParseError | effect_ConfigError0.ConfigError, never>;
/**
 * Helper function to create environment-specific layers
 */
declare const createEnvironmentLayer: (environment?: string) => Layer.Layer<FederationLogger | FederationConfigService, effect_ParseResult0.ParseError | effect_ConfigError0.ConfigError, never>;
//#endregion
//#region src/runtime/schema/ast/ast.d.ts
/**
 * Type conversion context with caching and configuration
 *
 * Context object that manages the conversion of Effect Schema AST nodes to GraphQL types,
 * providing caching for performance, custom scalar handling, and safety features like
 * recursion depth limiting.
 *
 * @example Basic usage
 * ```typescript
 * const context = createConversionContext(false, {
 *   DateTime: new GraphQLScalarType({ name: 'DateTime' }),
 *   JSON: GraphQLJSON
 * })
 *
 * const graphqlType = yield* convertSchemaToGraphQL(
 *   Schema.Struct({ id: Schema.String, createdAt: Schema.Date }),
 *   context
 * )
 * ```
 *
 * @example Input type conversion
 * ```typescript
 * const inputContext = createConversionContext(true, {}, {
 *   strictMode: true,
 *   maxDepth: 5
 * })
 *
 * const inputType = yield* convertSchemaToGraphQL(CreateUserSchema, inputContext)
 * ```
 *
 * @category Schema Processing
 */
interface TypeConversionContext {
  readonly cache: Map<string, GraphQLType>;
  readonly isInput: boolean;
  readonly scalars: Record<string, GraphQLScalarType>;
  readonly depth: number;
  readonly maxDepth: number;
  readonly strictMode: boolean;
}
/**
 * Create a new type conversion context with specified configuration
 *
 * Factory function for creating a TypeConversionContext with appropriate defaults
 * and customization options for different conversion scenarios.
 *
 * @param isInput - Whether to create context for GraphQL input types (default: false)
 * @param scalars - Custom scalar type mappings for conversion
 * @param options - Additional configuration options
 * @param options.maxDepth - Maximum recursion depth to prevent infinite loops (default: 10)
 * @param options.strictMode - Enable strict type validation during conversion (default: false)
 * @returns Configured conversion context ready for use
 *
 * @example Creating output type context
 * ```typescript
 * const outputContext = createConversionContext(false, {
 *   UUID: UUIDScalarType,
 *   DateTime: DateTimeScalarType
 * })
 * ```
 *
 * @example Creating input type context with strict mode
 * ```typescript
 * const inputContext = createConversionContext(true, {}, {
 *   maxDepth: 8,
 *   strictMode: true
 * })
 * ```
 *
 * @category Schema Processing
 */
declare const createConversionContext: (isInput?: boolean, scalars?: Record<string, GraphQLScalarType>, options?: {
  readonly maxDepth?: number;
  readonly strictMode?: boolean;
}) => TypeConversionContext;
/**
 * Schema to GraphQL Type Conversion Pipeline
 *
 * Advanced AST-based transformation with comprehensive type support and pattern matching.
 *
 * Features:
 * - Exhaustive pattern matching over AST nodes
 * - Recursive type conversion with cycle detection
 * - Branded type mapping to GraphQL types
 * - Custom scalar type support
 * - Input/Output type distinction
 * - Comprehensive error handling
 */
declare namespace ASTConversion {
  /**
   * Convert Effect Schema to GraphQL type with comprehensive error handling
   */
  const schemaToGraphQLType: (schema: Schema.Schema<unknown>, context?: TypeConversionContext) => Effect.Effect<GraphQLOutputType | GraphQLInputType, TypeConversionError>;
  /**
   * Convert multiple schemas to GraphQL types concurrently
   */
  const convertSchemasParallel: (schemas: ReadonlyArray<{
    readonly name: string;
    readonly schema: Schema.Schema<unknown>;
  }>, context?: TypeConversionContext) => Effect.Effect<Record<string, GraphQLOutputType | GraphQLInputType>, TypeConversionError>;
  /**
   * Create GraphQL schema from Effect Schema registry
   */
  const createGraphQLSchema: (entities: Record<string, Schema.Schema<unknown>>, queries?: Record<string, Schema.Schema<unknown>>, mutations?: Record<string, Schema.Schema<unknown>>) => Effect.Effect<{
    readonly types: Record<string, GraphQLOutputType>;
    readonly queries: Record<string, GraphQLOutputType>;
    readonly mutations: Record<string, GraphQLOutputType>;
  }, TypeConversionError>;
}
declare namespace index_d_exports {
  export { ASTConversion, BaseDomainError, CircuitBreaker, CircuitBreakerConfig, CircuitBreakerError, CircuitBreakerMetrics, CircuitBreakerState, CodeGenerationError, CompositionError, CoreServicesLive, DataLoaderConfig, DeepReadonly, DevelopmentLayerLive, DiscoveryError, DomainError, EntityReferenceResolver, EntityResolutionError, EntityTypename, ErrorBoundaryConfig, ErrorFactory, ErrorMatching, ErrorTransformationConfig, ExtractResolver, FederatedSchema, FederationCompositionConfig, FederationConfigLive, FederationConfigSchema, FederationConfigService, FederationDirective, FederationDirectiveMap, FederationDomainError, FederationEntity, FederationEntityBuilder, FederationError, FederationLogger, FederationLoggerLive, FederationServiceConfig, FieldName, FieldResolutionError, FieldResolver, FieldResolverMap, HealthCheckError, HealthStatus, HotReloadableSchema, MakeRequired, MetricsConfig, MinimalLayerLive, NonEmptyArray, OptionalKeys, PartialFailureConfig, PerformanceConfig, Prettify, ProductionLayerLive, QueryHash, QueryPlanCacheConfig, RegistrationError, RequireAtLeastOne, RequiredKeys, SafeResolverMap, SchemaChange, SchemaConflict, SchemaEvolution, SchemaEvolutionError, SchemaFirst, SchemaFirstError, SchemaFirstService, SchemaFirstWorkflow, SchemaImportResult, SchemaLifecycleState, SchemaMetadata, SchemaValidationError, SchemaWatcher, ServiceDefinition, ServiceId, SubgraphRegistry, SyncResult, TestLayerLive, TimeoutError, TypeConversionContext, TypeConversionError, ValidationError, asUntypedEntity, createConversionContext, createEntityBuilder, createEnvironmentLayer, createSchemaFirstService, createSchemaFirstWorkflow, debug, developmentLogger, error, getCacheConfig, getDatabaseConfig, getFederationConfig, getObservabilityConfig, getResilienceConfig, getServerConfig, info, productionLogger, testLogger, toFederationEntity, trace, warn, withSpan };
}
//#endregion
export { ASTConversion, CodeGenerationError, CoreServicesLive, DevelopmentLayerLive, FederationConfigLive, FederationConfigSchema, FederationConfigService, FederationLogger, FederationLoggerLive, FederationServiceConfig, MinimalLayerLive, ProductionLayerLive, SchemaEvolution, SchemaEvolutionError, SchemaFirst, SchemaFirstError, SchemaFirstService, SchemaFirstWorkflow, SchemaLifecycleState, TestLayerLive, TypeConversionContext, createConversionContext, createEnvironmentLayer, createSchemaFirstService, createSchemaFirstWorkflow, debug, developmentLogger, error, getCacheConfig, getDatabaseConfig, getFederationConfig, getObservabilityConfig, getResilienceConfig, getServerConfig, index_d_exports, info, productionLogger, testLogger, trace, warn, withSpan };
//# sourceMappingURL=index-BVG6uCQh.d.cts.map