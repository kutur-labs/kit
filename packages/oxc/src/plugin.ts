import { definePlugin } from "@oxlint/plugins";

import { attributes } from "./foldkit-stylex/attributes.ts";
import { conditionKey } from "./foldkit-stylex/condition-key.ts";
import { hoverGate } from "./foldkit-stylex/hover-gate.ts";
import { styles } from "./foldkit-stylex/styles.ts";
import { unstyledView } from "./foldkit-stylex/unstyled-view.ts";
import { vite } from "./foldkit-stylex/vite.ts";
import { commentProse } from "./rules/comment-prose.ts";
import { noManualEffectRuntimeInTests } from "./rules/no-manual-effect-runtime-in-tests.ts";
import { noSuppressionDirectives } from "./rules/no-suppression-directives.ts";
import { noYieldInIf } from "./rules/no-yield-in-if.ts";
import { selfContainedFunction } from "./rules/self-contained-function.ts";

export default definePlugin({
  meta: { name: "@kutur-kit/oxc" },
  rules: {
    "comment-prose": commentProse,
    "foldkit-stylex-attributes": attributes,
    "foldkit-stylex-condition-key": conditionKey,
    "foldkit-stylex-hover-gate": hoverGate,
    "foldkit-stylex-styles": styles,
    "foldkit-stylex-unstyled-view": unstyledView,
    "foldkit-stylex-vite": vite,
    "no-manual-effect-runtime-in-tests": noManualEffectRuntimeInTests,
    "no-suppression-directives": noSuppressionDirectives,
    "no-yield-in-if": noYieldInIf,
    "self-contained-function": selfContainedFunction,
  },
});
