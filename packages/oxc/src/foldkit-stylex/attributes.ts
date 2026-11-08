import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import { exportOf, type Imports, importsOf, keyOf, rootOf } from "../rules/imports.ts";

// Callbacks through which @foldkit/ui hands the app attribute bundles for its parts.
const bundleCallbacks = new Set(["toView", "entryToView", "toCalendarView"]);

const isMethodCall = (node: ESTree.Node, name: string): node is ESTree.CallExpression =>
  node.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.property.type === "Identifier" &&
  node.callee.property.name === name;

const isSx = (node: ESTree.Node, imports: Imports) =>
  node.type === "CallExpression" &&
  exportOf(node.callee, imports, "@kutur-kit/foldkit-stylex") === "sx";

const isRawAttribute = (node: ESTree.Node) => {
  if (!isMethodCall(node, "Attribute")) return false;

  const [name] = node.arguments;

  return name?.type === "Literal" && (name.value === "class" || name.value === "style");
};

const boundNames = (pattern: ESTree.Node, names: Set<string>) => {
  if (pattern.type === "Identifier") names.add(pattern.name);

  if (pattern.type === "AssignmentPattern") boundNames(pattern.left, names);

  if (pattern.type === "RestElement") boundNames(pattern.argument, names);

  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      boundNames(property.type === "RestElement" ? property.argument : property.value, names);
    }
  }
};

// A function whose parameters carry @foldkit/ui bundles: a `toView`-like callback, or a `.map`
// callback over a bundle, such as `tabs.map((tab) => ...)`.
const takesBundles = (fn: ESTree.Node, bundles: ReadonlySet<string>) => {
  const { parent } = fn;

  if (parent?.type === "Property") return bundleCallbacks.has(keyOf(parent) ?? "");

  if (parent?.type !== "CallExpression" || !isMethodCall(parent, "map")) return false;

  const { callee } = parent;
  const root = callee.type === "MemberExpression" ? rootOf(callee.object) : undefined;

  return root !== undefined && bundles.has(root);
};

export const attributes = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Keep one Class per element: styles in one sx(...) call, after every spread, and never on a @foldkit/ui part's bundle.",
    },
    schema: [],
    messages: {
      uiBundle:
        "This bundle already carries its part's Class from XStyle.view. Put these styles in that part's entry of its styles: Foldkit keeps one Class and one Style per element, so this replaces the part's styles and the functional ones.",
      oneCall:
        "Pass every style of this element to one sx(...) call, conditions included. Foldkit keeps one Class per element, and StyleX resolves conflicting properties only within one call.",
      last: "Put sx(...) last in the attribute list. Foldkit keeps the last Class, so a bundle spread after it replaces these styles.",
      rawAttribute:
        "Use sx(...) instead. Scene's toHaveClass cannot see a raw class attribute, and a raw style attribute throws when the element also gets a Style, as @foldkit/ui panels do.",
      stylexRuntime:
        "Use sx(...). stylex.props returns numbers that h.Style rejects and omits className when no style applies; stylex.attrs kebab-cases custom properties and returns a raw attribute Scene cannot see.",
      notInElement:
        "Write sx(...) directly in the attribute list of the element it styles, so this rule sees every Class that element gets. Put conditions inside the call: sx(isOpen ? styles.open : styles.closed).",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();
    // Names bound to @foldkit/ui bundles in this file.
    let bundles = new Set<string>();

    const collectBundles = (fn: ESTree.ArrowFunctionExpression | ESTree.Function) => {
      if (!takesBundles(fn, bundles)) return;

      for (const param of fn.params) boundNames(param, bundles);
    };

    return {
      Program(program) {
        imports = importsOf(program);
        bundles = new Set();
      },
      ArrowFunctionExpression: collectBundles,
      FunctionExpression: collectBundles,
      CallExpression(node) {
        const runtime = exportOf(node.callee, imports, "@stylexjs/stylex");

        // A result the code throws away, as in a compile guard, reaches no element.
        if (
          (runtime === "props" || runtime === "attrs") &&
          node.parent.type !== "ExpressionStatement"
        ) {
          context.report({ node, messageId: "stylexRuntime" });
        }

        if (isSx(node, imports) && node.parent.type !== "ArrayExpression") {
          context.report({ node, messageId: "notInElement" });
        }
      },
      ArrayExpression(node) {
        const items = node.elements.filter((item) => item !== null);

        const spreadsBundle = items.some((item) => {
          const root = item.type === "SpreadElement" ? rootOf(item.argument) : undefined;

          return root !== undefined && bundles.has(root);
        });

        const classWriters = items.filter(
          (item) => isSx(item, imports) || isMethodCall(item, "Class"),
        );

        for (const item of items.filter(isRawAttribute)) {
          context.report({ node: item, messageId: "rawAttribute" });
        }

        if (spreadsBundle) {
          const styleWriters = items.filter((item) => isMethodCall(item, "Style"));

          for (const item of [...classWriters, ...styleWriters]) {
            context.report({ node: item, messageId: "uiBundle" });
          }

          return;
        }

        for (const item of classWriters.slice(1))
          context.report({ node: item, messageId: "oneCall" });

        const lastSpread = items.map((item) => item.type).lastIndexOf("SpreadElement");

        for (const item of items.slice(0, Math.max(lastSpread, 0))) {
          if (isSx(item, imports)) context.report({ node: item, messageId: "last" });
        }
      },
    };
  },
});
