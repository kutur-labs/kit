import { foldkit } from "@foldkit/vite-plugin";
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    foldkitStylex(),
    foldkit({
      ssr: { serverEntry: "/src/entry.server.ts", clientEntry: "/src/entry.ts", build: true },
    }),
  ],
});
