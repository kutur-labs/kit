import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-max-length": [2, "always", 72],
    "scope-case": [2, "always", "lower-case"],
  },
};

export default config;
