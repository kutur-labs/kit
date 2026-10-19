import type { OxlintConfig } from "oxlint";

import { recommended } from "@effect/tsgo/oxlint-presets";

import base from "./base.ts";

const effect: OxlintConfig = {
  extends: [base, recommended],
  rules: {
    // Formatter is Effect's, so the base preset does not suggest it.
    "kit/no-json-stringify": "warn",
  },
  options: { typeAware: true },
};

export default effect;
