import { defineConfig } from "tsdown"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/runtime/index.ts",
    "src/federation/index.ts",
    "src/infrastructure/index.ts",
    "src/api/index.ts",
    "src/tooling/index.ts"
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: false,
  treeshake: true,
  target: "es2022",
  external: [
    "effect",
    "@effect/schema",
    "graphql",
    "dataloader",
    "commander",
    "@graphql-inspector/core"
  ]
})