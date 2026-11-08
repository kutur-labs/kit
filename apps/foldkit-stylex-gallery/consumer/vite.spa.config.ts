// create-foldkit-app's single-page vite.config.ts, with foldkitStylex() in place of Tailwind.
import { foldkit } from "@foldkit/vite-plugin";
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: "spa",
  build: { outDir: "../dist-spa", emptyOutDir: true },
  plugins: [foldkitStylex(), foldkit()],
});
