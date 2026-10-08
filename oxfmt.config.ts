import format from "@kutur-kit/oxc/format";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...format,
  ignorePatterns: [
    "**/dist/**",
    "**/coverage/**",
    "**/tmp/**",
    "**/scratchpad/**",
    "packages/oxc/src/vendor/anti-slop/**",
    "pnpm-lock.yaml",
  ],
});
