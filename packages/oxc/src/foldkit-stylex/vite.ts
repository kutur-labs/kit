import { defineRule } from "@oxlint/plugins";

const unplugin = "@stylexjs/unplugin";

export const vite = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require foldkitStylex() instead of StyleX's own bundler plugin." },
    schema: [],
    messages: {
      helper:
        "Use foldkitStylex() from @kutur-kit/foldkit-stylex/vite. It compiles this package in dev, SSR and Vitest, where StyleX's own plugin leaves it uncompiled, keeps light-dark() colors valid and fails a build whose client links no CSS.",
    },
  },
  createOnce(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // A type import, such as the plugin's options, loads no plugin.
        if (node.importKind === "type") return;

        if (source === unplugin || source.startsWith(`${unplugin}/`)) {
          context.report({ node, messageId: "helper" });
        }
      },
    };
  },
});
