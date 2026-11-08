import { defineConfig } from "vitest/config";

// Node drives Chromium through Playwright against the production build, which global-setup.ts
// serves; nothing here compiles StyleX.
export default defineConfig({
  test: {
    include: ["test/browser/**/*.test.ts"],
    globalSetup: ["test/browser/global-setup.ts"],
    testTimeout: 30_000,
  },
});
