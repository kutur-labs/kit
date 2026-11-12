import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { configDefaults, defineConfig } from "vitest/config";

// The core's helper, so the tests compile the looks the way an app's build does. test:browser has
// its own config.
export default defineConfig({
  plugins: [foldkitStylex()],
  test: { exclude: [...configDefaults.exclude, "test/browser/**"] },
});
