import { defineConfig } from "vitest/config";

// Packs and installs the packages once in test/packed/setup.ts; each file then drives that app's
// Vite and Vitest. Builds, dev servers and installs take seconds each.
export default defineConfig({
  test: {
    include: ["test/packed/*.test.ts"],
    globalSetup: ["test/packed/setup.ts"],
    hookTimeout: 300_000,
    testTimeout: 120_000,
  },
});
