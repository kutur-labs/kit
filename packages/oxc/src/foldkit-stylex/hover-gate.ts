import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import { exportOf, type Imports, importsOf, keyOf } from "../rules/imports.ts";
import { mediaQueryOf } from "./condition-key.ts";

const stylex = "@stylexjs/stylex";

// A pseudo-class key that names :hover, alone or in a chain such as ':hover:not(:focus-visible)'.
// Media keys never start with ':', so '@media (hover:hover)' is not one.
const isHover = (key: string) => key.startsWith(":") && /:hover\b/.test(key);

// A media query that only pointers able to hover match, such as '@media (hover: hover)' or
// '@media (hover: hover) and (min-width: 640px)'. A query with 'not', 'or' or a comma is not one.
const isGate = (key: string) => mediaQueryOf(key)?.features.has("(hover:hover)") === true;

export const hoverGate = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require StyleX :hover styles to sit under @media (hover: hover).",
    },
    schema: [],
    messages: {
      gate: "Put this hover style under @media (hover: hover): touch browsers keep :hover after a tap, so the style sticks.",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();

    // The condition a key adds, such as ':hover' for `[stylex.when.ancestor(":hover")]`, whose
    // first argument is the condition on the other element.
    const conditionOf = (property: ESTree.ObjectProperty) => {
      if (!property.computed) return keyOf(property);

      const { key } = property;

      if (
        key.type !== "CallExpression" ||
        !exportOf(key.callee, imports, stylex)?.startsWith("when.")
      ) {
        return undefined;
      }

      const [condition] = key.arguments;

      return condition?.type === "Literal" ? String(condition.value) : undefined;
    };

    // Reports each value set under a :hover key and outside a (hover: hover) query, inside it or
    // around it. A null value sets nothing, so
    // `":hover": { default: null, "@media (hover: hover)": … }` passes.
    const checkStyle = (style: ESTree.Node, hovered: boolean, gated: boolean) => {
      // A dynamic style's conditions are in the object its function returns.
      const object = style.type === "ArrowFunctionExpression" ? style.body : style;

      if (object.type !== "ObjectExpression") return;

      for (const property of object.properties) {
        if (property.type !== "Property") continue;

        const condition = conditionOf(property) ?? "";
        const isHovered = hovered || isHover(condition);
        const isGated = gated || isGate(condition);
        const { value } = property;

        if (value.type === "ObjectExpression") {
          checkStyle(value, isHovered, isGated);
        } else if (isHovered && !isGated && !(value.type === "Literal" && value.value === null)) {
          context.report({ node: property.key, messageId: "gate" });
        }
      }
    };

    return {
      Program(program) {
        imports = importsOf(program);
      },
      CallExpression(node) {
        const [styles] = node.arguments;

        if (
          exportOf(node.callee, imports, stylex) !== "create" ||
          styles?.type !== "ObjectExpression"
        ) {
          return;
        }

        for (const entry of styles.properties) {
          if (entry.type === "Property") checkStyle(entry.value, false, false);
        }
      },
    };
  },
});
