import type { OxlintConfig } from "oxlint";

import { fileURLToPath } from "node:url";

const extension = import.meta.url.endsWith(".ts") ? "ts" : "js";

// `satisfies` keeps each plugin entry an object, which the build's JSON form relies on.
const foldkitStylex = {
  jsPlugins: [
    // `/base` registers the same plugin with the same specifier, so Oxlint loads it once.
    { name: "kit", specifier: fileURLToPath(new URL(`./plugin.${extension}`, import.meta.url)) },
    { name: "stylex", specifier: fileURLToPath(import.meta.resolve("@stylexjs/eslint-plugin")) },
  ],
  rules: {
    "kit/foldkit-stylex-attributes": "error",
    "kit/foldkit-stylex-condition-key": "error",
    "kit/foldkit-stylex-styles": "error",
    "kit/foldkit-stylex-unstyled-view": "error",
    "kit/foldkit-stylex-vite": "error",
    "stylex/enforce-extension": "error",
    "stylex/no-legacy-contextual-styles": "error",
    "stylex/no-nonstandard-styles": "error",
    "stylex/no-unused": "error",
    "stylex/valid-shorthands": "error",
    "stylex/valid-styles": "error",
  },
} satisfies OxlintConfig;

export default foldkitStylex;
