import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Chromium runs the tests that measure computed styles.
export default defineConfig({
  plugins: [foldkitStylex()],
  test: {
    include: ["test/browser/**/*.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
