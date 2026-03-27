import { defineConfig } from "vite-plus";
import defaultViteConfig from "./src/index.ts";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  ...defaultViteConfig,
  pack: {
    entry: ["src/index.ts", "src/rules.ts"],
    dts: true,
    format: ["esm"],
    sourcemap: true,
    exports: true,
    deps: {
      onlyBundle: [],
    },
  },
});
