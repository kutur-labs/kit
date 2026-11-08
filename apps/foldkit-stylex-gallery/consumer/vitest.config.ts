// create-foldkit-app's vitest.config.ts with the line the README adds, and its import.
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [foldkitStylex()],
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
