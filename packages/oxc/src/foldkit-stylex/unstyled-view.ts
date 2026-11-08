import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import { type Imports, importsOf, resolve } from "../rules/imports.ts";
import { components, viewOf } from "./components.ts";

const ui = "@foldkit/ui";

// `@foldkit/ui/datePicker` exports what `@foldkit/ui` exports as `DatePicker`.
const uiPathOf = (node: ESTree.Node, imports: Imports) => {
  const resolved = resolve(node, imports);

  if (resolved?.source === ui) return resolved.path;

  if (!resolved?.source.startsWith(`${ui}/`)) return undefined;

  const subpath = resolved.source.slice(ui.length + 1);
  const name = subpath.charAt(0).toUpperCase() + subpath.slice(1);

  return resolved.path === "" ? name : `${name}.${resolved.path}`;
};

// Module-scope `const X = Listbox.create()`, `Listbox.Multi.create()` or `Toast.make(...)`: the
// local name and the component path its view belongs to, such as `Listbox.Multi`.
const createdIn = (program: ESTree.Program, imports: Imports) => {
  const created = new Map<string, string>();

  for (const statement of program.body) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;

    if (declaration?.type !== "VariableDeclaration") continue;

    for (const { id, init } of declaration.declarations) {
      const path = init?.type === "CallExpression" ? uiPathOf(init.callee, imports) : undefined;
      const component = path?.replace(/\.(create|make)$/, "");

      if (id.type === "Identifier" && component !== undefined && component !== path) {
        created.set(id.name, component);
      }
    }
  }

  return created;
};

export const unstyledView = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require @foldkit/ui views to be wrapped with their @kutur-kit/foldkit-stylex namespace.",
    },
    schema: [],
    messages: {
      wrap: "Wrap {{view}} once at module scope with {{wrapper}}({{view}}, styles) from @kutur-kit/foldkit-stylex and use the result here. It styles every part and adds the CSS @foldkit/ui leaves to the app, such as a backdrop that covers the page and the hiding of a closed dialog.",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();
    let created = new Map<string, string>();

    // The component path whose view `node` reads, such as `Listbox.Multi`.
    const componentOf = (node: ESTree.MemberExpression) => {
      if (node.computed || node.property.type !== "Identifier") return undefined;

      const component =
        node.object.type === "Identifier" && created.has(node.object.name)
          ? created.get(node.object.name)
          : uiPathOf(node.object, imports);

      const name = component?.split(".")[0];

      return name !== undefined && components.has(name) && node.property.name === viewOf(name)
        ? component
        : undefined;
    };

    // The view, or a view factory called in place such as `VirtualList.view<Item>()`, is the
    // first argument of a @kutur-kit/foldkit-stylex call.
    const isWrapped = (node: ESTree.MemberExpression) => {
      const view =
        node.parent.type === "CallExpression" && node.parent.callee === node ? node.parent : node;

      const { parent } = view;

      return (
        parent.type === "CallExpression" &&
        parent.arguments[0] === view &&
        resolve(parent.callee, imports)?.source === "@kutur-kit/foldkit-stylex"
      );
    };

    return {
      Program(program) {
        imports = importsOf(program);
        created = createdIn(program, imports);
      },
      MemberExpression(node) {
        const component = componentOf(node);

        if (component === undefined || isWrapped(node)) return;

        const [name = "", ...rest] = component.split(".");
        const view = context.sourceCode.getText(node);

        context.report({
          node,
          messageId: "wrap",
          data: { view, wrapper: [`${name}Style`, ...rest, viewOf(name)].join(".") },
        });
      },
    };
  },
});
