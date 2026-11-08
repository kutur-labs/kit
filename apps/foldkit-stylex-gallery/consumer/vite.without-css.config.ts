// The mistake: a client entry that imports no stylesheet.
import { foldkit } from "@foldkit/vite-plugin";
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: { outDir: "dist-without-css" },
  plugins: [
    foldkitStylex(),
    foldkit({
      ssr: {
        serverEntry: "/src/entry-themed.server.ts",
        clientEntry: "/src/entry-themed-without-css.ts",
        build: true,
      },
    }),
  ],
});
