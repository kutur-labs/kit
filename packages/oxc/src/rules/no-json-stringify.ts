import { defineRule } from "@oxlint/plugins";

export const noJsonStringify = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow JSON.stringify in favor of Effect's Formatter." },
    schema: [],
    messages: {
      noJsonStringify:
        "Use Formatter.format for messages and logs, or Formatter.formatJson for JSON. JSON.stringify throws on bigints and circular values.",
    },
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        const { object, property } = node;

        if (object.type !== "Identifier" || object.name !== "JSON") return;

        const name = node.computed
          ? property.type === "Literal" && property.value
          : property.type === "Identifier" && property.name;

        if (name === "stringify" && context.sourceCode.isGlobalReference(object))
          context.report({ node, messageId: "noJsonStringify" });
      },
    };
  },
});
