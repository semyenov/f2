import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: false,
  target: "es2022",
  external: [
    "effect",
    "@effect/schema",
    "graphql",
    "@graphql-tools/schema",
    "@graphql-tools/utils",
    "dataloader"
  ]
})