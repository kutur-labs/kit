import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { configDefaults, defineConfig } from "vitest/config";

// The checks `pnpm check` runs. test:browser and test:packed have their own configs.
export default defineConfig({
  plugins: [foldkitStylex()],
  test: {
    exclude: [...configDefaults.exclude, "test/browser/**", "test/packed/**", "consumer/**"],
  },
});
