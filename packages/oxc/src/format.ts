import type { OxfmtConfig } from "oxfmt";

const format: OxfmtConfig = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  endOfLine: "lf",
  sortImports: {
    groups: [
      "type",
      "builtin",
      "external",
      ["internal", "subpath"],
      ["parent", "sibling", "index"],
      "style",
      "unknown",
    ],
    order: "asc",
    newlinesBetween: true,
    sortSideEffects: false,
  },
  sortPackageJson: { sortScripts: true },
};

export default format;
