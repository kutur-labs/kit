import { definePlugin } from "@oxlint/plugins";

import { noJsonStringify } from "./rules/no-json-stringify.ts";
import { noYieldInIf } from "./rules/no-yield-in-if.ts";

export default definePlugin({
  meta: { name: "@kutur-kit/oxc" },
  rules: { "no-json-stringify": noJsonStringify, "no-yield-in-if": noYieldInIf },
});
