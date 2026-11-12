import type { ESTree, Reference } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

type PageFunction = ESTree.Function | ESTree.ArrowFunctionExpression;

const isFunction = (node: ESTree.Node | null | undefined): node is PageFunction =>
  node?.type === "FunctionDeclaration" ||
  node?.type === "FunctionExpression" ||
  node?.type === "ArrowFunctionExpression";

// The functions a module exports where it declares them: `export const f = () => …`,
// `export function f() {}` and `export default …`.
const exportedFunctions = (
  node: ESTree.ExportNamedDeclaration | ESTree.ExportDefaultDeclaration,
): ReadonlyArray<PageFunction> => {
  const { declaration } = node;

  if (isFunction(declaration)) return [declaration];

  if (declaration?.type !== "VariableDeclaration") return [];

  return declaration.declarations.flatMap(({ init }) => (isFunction(init) ? [init] : []));
};

// `typeof value` and `typeof value.key` in a type, which compile away.
const inTypeQuery = (node: ESTree.Node): boolean =>
  node.parent?.type === "TSTypeQuery" ||
  (node.parent?.type === "TSQualifiedName" && inTypeQuery(node.parent));

// Oxlint runs TS-ESLint's scope manager, which flags a reference in a type position, but the
// plugin's types leave the flag out. Without it, every reference counts as a value.
const readsValue = (reference: Reference) =>
  (!("isValueReference" in reference) || reference.isValueReference !== false) &&
  !inTypeQuery(reference.identifier);

export const selfContainedFunction = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow exported functions that read the module's bindings, for functions sent to a page as source.",
    },
    schema: [],
    messages: {
      outside:
        "Playwright sends this function to the page as source, so it cannot reach `{{name}}` outside its body. Move the helper inside the function.",
    },
  },
  createOnce(context) {
    const check = (node: ESTree.ExportNamedDeclaration | ESTree.ExportDefaultDeclaration) => {
      for (const fn of exportedFunctions(node)) {
        // `through` holds the references the function's scopes leave unresolved: outer bindings
        // and globals. Only the module's own bindings are missing from the page; a function
        // declaration still reaches its own name there.
        for (const reference of context.sourceCode.getScope(fn).through) {
          const variable = reference.resolved;

          if (
            variable?.scope.type === "module" &&
            !variable.defs.some((definition) => definition.node === fn) &&
            readsValue(reference)
          ) {
            context.report({
              node: reference.identifier,
              messageId: "outside",
              data: { name: reference.identifier.name },
            });
          }
        }
      }
    };

    return { ExportNamedDeclaration: check, ExportDefaultDeclaration: check };
  },
});
