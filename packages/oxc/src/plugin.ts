import { definePlugin } from "@oxlint/plugins";

import { noYieldInIf } from "./rules/no-yield-in-if.ts";

export default definePlugin({
  meta: { name: "@kutur-kit/oxc" },
  rules: { "no-yield-in-if": noYieldInIf },
});
