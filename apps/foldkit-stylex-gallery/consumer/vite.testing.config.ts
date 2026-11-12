// vite.config.ts's app, built to dist-testing/ so that test/packed/testing.test.ts builds it while
// build.test.ts writes dist/.
import { foldkit } from "@foldkit/vite-plugin";
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    foldkitStylex(),
    foldkit({
      ssr: {
        serverEntry: "/src/entry-themed.server.ts",
        clientEntry: "/src/entry-themed.ts",
        build: { clientOutDir: "dist-testing/client", serverOutDir: "dist-testing/server" },
      },
    }),
  ],
});
