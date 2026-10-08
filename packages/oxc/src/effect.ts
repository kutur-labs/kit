import type { OxlintConfig } from "oxlint";

import { recommended } from "@effect/tsgo/oxlint-presets";

import base from "./base.ts";

const effect: OxlintConfig = {
  extends: [base, recommended],
  options: { typeAware: true },
};

export default effect;
