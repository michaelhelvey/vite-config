import { defineConfig } from "./src/index.ts";

export default await defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["**/fixtures/**"],
  },
  pack: {
    entry: ["src/index.ts"],
    platform: "node",
    dts: true,
    format: ["esm"],
    sourcemap: true,
    exports: true,
    deps: {
      onlyBundle: [],
    },
  },
});
