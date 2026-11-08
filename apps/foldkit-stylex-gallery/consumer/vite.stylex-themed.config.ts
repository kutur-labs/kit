// The mistake: StyleX's own plugin in place of foldkitStylex(), in an app with the theme.
import { foldkit } from "@foldkit/vite-plugin";
import { unplugin, type UserOptions } from "@stylexjs/unplugin";
import { defineConfig, type Plugin } from "vite";

// StyleX's plugin factories return `any`; this names the plugin they return.
const stylex: (options: Partial<UserOptions>) => Plugin = unplugin.vite;

export default defineConfig({
  plugins: [
    stylex({}),
    foldkit({
      ssr: {
        serverEntry: "/src/entry-themed.server.ts",
        clientEntry: "/src/entry-themed.ts",
        build: true,
      },
    }),
  ],
});
