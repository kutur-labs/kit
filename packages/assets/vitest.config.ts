import { Config, Effect } from "effect";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ".stryker-tmp/**"],
    globalSetup: ["test/global-setup.ts"],
    provide: {
      r2Live: Effect.runSync(Config.Boolean("TEST_R2_LIVE").pipe(Config.withDefault(false))),
    },
  },
});
