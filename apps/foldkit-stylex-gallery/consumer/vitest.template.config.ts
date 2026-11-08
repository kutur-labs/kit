// create-foldkit-app's vitest.config.ts as it generates it.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    environment: "happy-dom",
    setupFiles: ["./src/vitest-setup.ts"],
    server: {
      deps: {
        inline: ["foldkit", "@foldkit/ui", "@foldkit/devtools"],
      },
    },
  },
});
