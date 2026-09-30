import { defineConfig } from "tsdown";

// https://tsdown.dev/
export default defineConfig({
  // only "." is exported, so build just the public entry point
  entry: ["src/adapter.ts"],
  format: ["esm"],
  // runs in the browser with InstantSearch, but has no browser-only code;
  // "neutral" also keeps the .js extension that package.json exports point to
  platform: "neutral",
  // matches tsconfig's target
  target: "es2022",
  // sourcemap below also adds a sourceMappingURL comment to adapter.d.ts,
  // so emit the declaration map it points to
  dts: { sourcemap: true },
  sourcemap: true,
  outDir: "lib",
});
