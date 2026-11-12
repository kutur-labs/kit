import { configDefaults, defineConfig } from "vitest/config";

// The package's own helper, so the tests compile src the way an app's build does.
import { foldkitStylex } from "./src/vite.ts";

export default defineConfig({
  plugins: [foldkitStylex()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
    // vitest.browser.config.ts runs test/browser in Chromium.
    exclude: [...configDefaults.exclude, ".stryker-tmp/**", "test/browser/**"],
  },
});
