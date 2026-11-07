import antiSlop from "@kutur-kit/oxc/anti-slop";
import effect from "@kutur-kit/oxc/effect";
import { defineConfig } from "oxlint";

const examples = {
  regex: "(^|/)examples?(/|$)",
  message: "Do not import examples. Import library code or test fixtures instead.",
};

// @kutur-kit/foldkit-stylex wraps @foldkit/ui's views and builds no elements of its own; sx.ts
// imports inertHtml for its Class attribute alone.
const buildsNoElements =
  "@kutur-kit/foldkit-stylex builds no elements, so its dist needs no Foldkit branding. Building one needs brandDistDirectory from @foldkit/vite-plugin after tsrs and a packed check of view identity; do that work, then delete this tripwire.";

// The foldkit root re-exports foldkit/html as Html, inertHtml included.
const foldkitHtml = { name: "foldkit", importNames: ["Html"], message: buildsNoElements };

const uiTypesOnly = {
  name: "@foldkit/ui",
  allowTypeImports: true,
  message:
    "Import @foldkit/ui types only. The app passes @foldkit/ui's views in, so Vite dev, which serves this package unbundled, keeps one copy of @foldkit/ui.",
};

// Package tsconfigs list @stylexjs/stylex in namespaceImportPackages, so a named import of these
// fails effecttsgo(prefer-namespace-import). The CSS budget test catches another namespace alias.
const styleDefinitions = [
  "create",
  "defineVars",
  "defineMarker",
  "defineConsts",
  "createTheme",
  "keyframes",
].map((property) => ({
  object: "stylex",
  property,
  message:
    "Put StyleX definitions in src/internal/functional-styles.ts, with the reason for each rule. Stryker's mutants inside stylex.create break StyleX's compile, so that file is outside `mutate`, and the CSS budget test compiles it.",
}));

export default defineConfig({
  extends: [effect, antiSlop],
  options: { typeAware: true, maxWarnings: 0 },
  rules: {
    "no-restricted-imports": ["error", { patterns: [examples] }],
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
    {
      // An override's options replace the root's, so this restates the examples pattern.
      files: ["packages/foldkit-stylex/src/**", "packages/foldkit-stylex-theme/src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [examples],
            paths: [
              uiTypesOnly,
              { name: "foldkit/html", importNames: ["inertHtml"], message: buildsNoElements },
              foldkitHtml,
            ],
          },
        ],
        "no-restricted-properties": ["error", ...styleDefinitions],
      },
    },
    {
      // The files that may define styles: the core's functional CSS, marker and compile guard,
      // and every theme module.
      files: [
        "packages/foldkit-stylex/src/internal/functional-styles.ts",
        "packages/foldkit-stylex/src/internal/markers.stylex.ts",
        "packages/foldkit-stylex/src/internal/compiled.ts",
        "packages/foldkit-stylex-theme/src/**",
      ],
      rules: { "no-restricted-properties": "off" },
    },
    {
      files: ["packages/foldkit-stylex/src/sx.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: [examples], paths: [uiTypesOnly, foldkitHtml] },
        ],
        "no-restricted-properties": [
          "error",
          ...styleDefinitions,
          { object: "inertHtml", allowProperties: ["Class"], message: buildsNoElements },
        ],
      },
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
