import type { OxlintConfig } from "oxlint";

import { recommended } from "@effect/tsgo/oxlint-presets";

import base from "./base.ts";

const effect: OxlintConfig = {
  extends: [base, recommended],
  rules: {
    // Globals that bypass Effect's services, so layers and tests cannot replace them.
    "effecttsgo/crypto-random-uuid": "warn",
    "effecttsgo/crypto-random-uuid-in-effect": "warn",
    "effecttsgo/global-console": "warn",
    "effecttsgo/global-console-in-effect": "warn",
    "effecttsgo/global-date": "warn",
    "effecttsgo/global-date-in-effect": "warn",
    "effecttsgo/global-fetch": "warn",
    "effecttsgo/global-fetch-in-effect": "warn",
    "effecttsgo/global-random": "warn",
    "effecttsgo/global-random-in-effect": "warn",
    "effecttsgo/global-timers": "warn",
    "effecttsgo/global-timers-in-effect": "warn",
    "effecttsgo/process-env": "warn",
    "effecttsgo/process-env-in-effect": "warn",
    // Effect's documented form for a service is a class that extends `Context.Service`.
    "effecttsgo/service-not-as-class": "warn",
  },
  overrides: [
    {
      files: ["**/*.test.*", "**/*.spec.*", "**/test/**", "**/tests/**"],
      rules: { "kit/no-manual-effect-runtime-in-tests": "error" },
    },
  ],
  options: { typeAware: true },
};

export default effect;
