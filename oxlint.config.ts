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
  overrides: [
    {
      // The link check, the benches and `kit-prose` report by printing.
      files: [
        "apps/docs/scripts/**",
        "integration-tests/**/*.bench.ts",
        "packages/oxc/src/prose/cli.ts",
      ],
      rules: { "effecttsgo/global-console": "off" },
    },
    {
      // Unbundled Node and Metro load every module an `effect` barrel re-exports, and esbuild
      // keeps whole namespace objects, so published code imports Effect modules by subpath.
      // Package tsconfigs set the rule's options for `src` only, so tests and docs keep the barrel
      // imports that Effect's docs teach. `topLevelNamedReexports: "follow"` also reports
      // functions such as `pipe` imported from the barrel.
      files: ["packages/*/src/**"],
      rules: { "effecttsgo/prefer-namespace-import": "error" },
    },
  ],
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
