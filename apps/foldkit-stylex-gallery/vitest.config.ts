import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vitest/config";

// The checks `pnpm check` runs: the files directly in test/, and no scratchpad file. test:browser
// and test:packed have their own configs.
export default defineConfig({
  plugins: [foldkitStylex()],
  test: {
    include: ["test/*.test.ts"],
  },
});
