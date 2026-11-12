import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { variations } from "./src/testing.ts";
import { foldkitStylex } from "./src/vite.ts";

// The testing toolkit's own tests, and the README's example of it, in Chromium: once per variation
// it exports, as its README tells apps to run their tests.
export default defineConfig({
  plugins: [foldkitStylex()],
  test: {
    include: ["test/browser/**/*.test.ts", "test/app/checkbox-audit.ts"],
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      instances: variations.map(({ name, viewport, ...contextOptions }) => ({
        browser: "chromium",
        name,
        viewport,
        provider: playwright({ contextOptions }),
      })),
    },
  },
});
