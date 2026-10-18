import antiSlop from "@kutur-kit/oxc/anti-slop";
import effect from "@kutur-kit/oxc/effect";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [effect, antiSlop],
  options: { typeAware: true, maxWarnings: 0 },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            regex: "(^|/)examples?(/|$)",
            message: "Do not import examples. Import library code or test fixtures instead.",
          },
        ],
      },
    ],
  },
  ignorePatterns: [
    "apps/docs/.output/**",
    "apps/docs/src/route-tree.gen.ts",
    "apps/docs/.source/**",
    "apps/docs/content/docs/packages/**",
    "apps/docs/content/docs/guides/**",
    "apps/docs/content/docs/index.mdx",
    "**/dist/**",
    "**/coverage/**",
    "**/tmp/**",
    "**/scratchpad/**",
    "packages/oxc/src/vendor/anti-slop/**",
  ],
});
