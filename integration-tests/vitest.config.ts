import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["global-setup.ts"],
    // Every test talks to the PostgreSQL and S3 containers, and the first in a
    // file also pays for warming them up: on CI runners that alone approaches
    // Vitest's 5 second default.
    testTimeout: 30_000,
  },
});
