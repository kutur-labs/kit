import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

const FORBIDDEN_SYMBOL_NAME = "shape";

function containsForbiddenSymbolName(name: string): boolean {
  return name.toLowerCase().includes(FORBIDDEN_SYMBOL_NAME);
}

/** Return whether an identifier names a statically accessed member owned by another value. */
function isBorrowedMemberName(node: ESTree.Node): boolean {
  const parent = node.parent;
  if (parent === null || parent.type !== "MemberExpression") return false;
  return parent.property === node && parent.computed === false;
}

// CSS and SVG properties whose names contain "shape", as StyleX, React and SVG write them.
const CSS_PROPERTY = /^(?:shape(?:Outside|Margin|ImageThreshold|Rendering)|corner(?:Top|Right|Bottom|Left|Start|End|Block|Inline)*Shape)$/;

/** Return whether an identifier is a key or attribute that names a CSS or SVG property. */
function isCssPropertyName(node: ESTree.Node & { name: string }): boolean {
  const parent = node.parent;
  if (parent === null || !CSS_PROPERTY.test(node.name)) return false;
  if (parent.type === "JSXAttribute") return parent.name === node;
  return (
    (parent.type === "Property" || parent.type === "TSPropertySignature") &&
    parent.key === node &&
    parent.computed === false
  );
}

/** Ban the case-insensitive substring "shape" in every JavaScript and TypeScript symbol name. */
export const noForbiddenTermInSymbolNamesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow the case-insensitive substring "shape" in JavaScript, TypeScript, private, and JSX symbol names.',
    },
    messages: {
      forbiddenSymbolName:
        'Rename symbol "{{name}}" for its domain role; "shape" describes structure rather than ownership.',
    },
  },
  createOnce(context) {
    const reportForbiddenSymbolName = (node: ESTree.Node & { name: string }) => {
      if (
        !containsForbiddenSymbolName(node.name) ||
        isBorrowedMemberName(node) ||
        isCssPropertyName(node)
      ) {
        return;
      }
      context.report({
        node,
        messageId: "forbiddenSymbolName",
        data: { name: node.name },
      });
    };

    return {
      Identifier: reportForbiddenSymbolName,
      PrivateIdentifier: reportForbiddenSymbolName,
      JSXIdentifier: reportForbiddenSymbolName,
    };
  },
});
