import { variations } from "@kutur-kit/foldkit-stylex/testing";
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// The README's Vitest browser mode: foldkitStylex() alone, and each of the toolkit's variations as
// a Chromium instance, running the README's audit of its checkbox.
export default defineConfig({
  plugins: [foldkitStylex()],
  test: {
    include: ["src/core/checkbox-audit.ts"],
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
