import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

export const noYieldInIf = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow yield in if conditions and branches." },
    schema: [],
    messages: {
      noYieldInIf: "Move yield outside the if statement. Compose the conditional operation first.",
    },
  },
  createOnce(context) {
    return {
      YieldExpression(node) {
        for (
          let parent: ESTree.Node | null = node.parent;
          parent !== null;
          parent = parent.parent
        ) {
          if (parent.type === "IfStatement") {
            context.report({ node, messageId: "noYieldInIf" });

            return;
          }

          // A nested generator owns its yields, even when declared inside an if.
          if (
            parent.type === "FunctionDeclaration" ||
            parent.type === "FunctionExpression" ||
            parent.type === "ArrowFunctionExpression"
          ) {
            return;
          }
        }
      },
    };
  },
});
