import antiSlop from "@kutur-kit/oxc/anti-slop";
import effect from "@kutur-kit/oxc/effect";
import foldkitStylex from "@kutur-kit/oxc/foldkit-stylex";
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

// The HtmlBuilder a view gets, which Foldkit's views and this package's wrappers name `h`. A wrapper
// only passes it on to @foldkit/ui's view.
const htmlBuilder = { object: "h", message: buildsNoElements };

// The theme's helpers take no `h`: inertHtml binds no handlers, so an app calls them anywhere in its
// view. One module draws every mark, so they share one size, stroke and motion.
const marksOnly =
  "Draw the theme's marks in src/internal/marks.ts with inertHtml and call them from the namespace's helpers. Helpers take no h, and the marks share one size, stroke and motion.";

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
      // The link check, the canary pins, the benches and `kit-prose` report by printing.
      files: [
        "apps/docs/scripts/**",
        "scripts/*.ts",
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
      files: ["packages/foldkit-stylex/src/**"],
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
        "no-restricted-properties": ["error", ...styleDefinitions, htmlBuilder],
      },
    },
    {
      // The files that may define styles: the core's functional CSS, marker and compile guard.
      files: [
        "packages/foldkit-stylex/src/internal/functional-styles.ts",
        "packages/foldkit-stylex/src/internal/markers.stylex.ts",
        "packages/foldkit-stylex/src/internal/compiled.ts",
      ],
      rules: { "no-restricted-properties": ["error", htmlBuilder] },
    },
    {
      // The theme imports @foldkit/ui's values to theme them: a peer, so it shares the app's copy.
      // Its build brands dist with Foldkit's view identity, so it may build elements.
      files: ["packages/foldkit-stylex-theme/src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [examples],
            paths: [
              { name: "foldkit/html", importNames: ["inertHtml"], message: marksOnly },
              { ...foldkitHtml, message: marksOnly },
            ],
          },
        ],
        "no-restricted-properties": ["error", { ...htmlBuilder, message: marksOnly }],
      },
    },
    {
      files: ["packages/foldkit-stylex-theme/src/internal/marks.ts"],
      rules: { "no-restricted-imports": ["error", { patterns: [examples] }] },
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
          htmlBuilder,
          { object: "inertHtml", allowProperties: ["Class"], message: buildsNoElements },
        ],
      },
    },
    {
      // The gallery, the looks and the core README's example use @kutur-kit/foldkit-stylex as an app
      // does, so they follow the preset an app extends. An override cannot extend, so it takes the
      // preset's plugins and rules.
      files: [
        "apps/foldkit-stylex-gallery/src/**",
        "packages/foldkit-stylex-theme/src/**",
        "packages/foldkit-stylex/test/app/checkbox.ts",
      ],
      jsPlugins: foldkitStylex.jsPlugins,
      rules: foldkitStylex.rules,
    },
    {
      // Playwright sends the exported functions of the testing modules to a page as source, where
      // neither their imports nor the module's other bindings exist.
      files: [
        "packages/foldkit-stylex/src/testing.ts",
        "packages/foldkit-stylex-theme/src/testing.ts",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                regex: ".*",
                allowTypeImports: true,
                message:
                  "Import types only. Playwright sends this module's functions to the page as source, where no import resolves.",
              },
            ],
          },
        ],
        "kit/self-contained-function": "error",
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
