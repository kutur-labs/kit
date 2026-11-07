import { defineConfig, mergeConfig } from "vitest/config";

import base from "./vitest.config.ts";

// The diagnostics, budget and drift tests check types, compiled CSS and @foldkit/ui's shape,
// which no runtime mutant changes, and they spawn compilers on every run.
export default mergeConfig(
  base,
  defineConfig({ test: { include: ["test/contract/**/*.test.ts", "test/vite.test.ts"] } }),
);
