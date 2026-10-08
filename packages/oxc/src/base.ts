import type { OxlintConfig } from "oxlint";

const base: OxlintConfig = {
  plugins: ["typescript", "oxc", "unicorn", "import"],
  categories: { correctness: "error" },
  rules: {
    "typescript/no-explicit-any": "error",
    "typescript/switch-exhaustiveness-check": "error",
    "typescript/no-deprecated": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/consistent-type-exports": "error",
    "typescript/no-import-type-side-effects": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "import/first": "error",
    "import/no-self-import": "error",
    "import/no-mutable-exports": "error",
    "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
    eqeqeq: ["error", "always", { null: "ignore" }],
    "no-var": "error",
    "unicorn/prefer-node-protocol": "error",
    "unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],
    "no-debugger": "error",
    "prefer-const": "error",
  },
  options: { typeAware: true },
};

export default base;
