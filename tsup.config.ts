import { defineConfig } from "tsup";

// https://tsup.egoist.dev/
export default defineConfig({
  // only "." is exported, so build just the public entry point
  entry: ["src/adapter.ts"],
  format: ["esm"],
  // runs in the browser with InstantSearch; matches tsconfig's target
  target: "es2022",
  dts: true,
  // leave minification to the consumer's bundler
  sourcemap: true,
  outDir: "lib",
  clean: true,
});
