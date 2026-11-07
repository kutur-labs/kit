import { definePlugin } from "@oxlint/plugins";

import { commentProse } from "./rules/comment-prose.ts";
import { noSuppressionDirectives } from "./rules/no-suppression-directives.ts";
import { noYieldInIf } from "./rules/no-yield-in-if.ts";

export default definePlugin({
  meta: { name: "@kutur-kit/oxc" },
  rules: {
    "comment-prose": commentProse,
    "no-suppression-directives": noSuppressionDirectives,
    "no-yield-in-if": noYieldInIf,
  },
});
