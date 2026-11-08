import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import {
  effectMemberOf,
  exportOf,
  type Imports,
  importsOf,
  isMethodCall,
  keyOf,
  resolve,
  rootOf,
} from "../rules/imports.ts";
import { variableOf } from "../rules/scope.ts";

const kit = "@kutur-kit/foldkit-stylex";

// Callbacks through which @foldkit/ui hands the app attribute bundles for its parts.
const bundleCallbacks = new Set(["toView", "entryToView", "toCalendarView"]);

// View inputs whose attributes @foldkit/ui applies to a part after the part's class, such as
// `buttonAttributes`.
const attributesInput = /^(attributes|\w+Attributes)$/;

// Array methods and Effect Array functions that call a callback with each item of an array.
const iterators = new Set(["map", "flatMap"]);

// Array methods and Effect Array functions that return some items of an array.
const filters = new Set(["filter"]);

// The value of a `toView`-like property, as in `toView: (attributes) => ...` or `toView: view`.
const isBundleCallback = (node: ESTree.Node) =>
  node.parent?.type === "Property" &&
  node.parent.value === node &&
  bundleCallbacks.has(keyOf(node.parent) ?? "");

const isSx = (node: ESTree.Node, imports: Imports) =>
  node.type === "CallExpression" && exportOf(node.callee, imports, kit) === "sx";

// Whether `node` writes an element's class or its style, of which Foldkit keeps one each, and
// whether it writes it raw, as `h.Attribute("class", ...)`.
const writtenBy = (
  node: ESTree.Node,
  imports: Imports,
): Readonly<{ attribute: "class" | "style"; raw: boolean }> | undefined => {
  if (isMethodCall(node, "Attribute")) {
    const [name] = node.arguments;

    return name?.type === "Literal" && (name.value === "class" || name.value === "style")
      ? { attribute: name.value, raw: true }
      : undefined;
  }

  if (isSx(node, imports) || isMethodCall(node, "Class")) return { attribute: "class", raw: false };

  return isMethodCall(node, "Style") ? { attribute: "style", raw: false } : undefined;
};

export const attributes = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Keep one Class per element: styles in one sx(...) call, after every spread, and never on a @foldkit/ui part.",
    },
    schema: [],
    messages: {
      partClass:
        "This element is a @foldkit/ui part, whose Class its XStyle wrapper sets. Put these styles in that part's entry of its styles: Foldkit keeps one Class per element, so this replaces the part's styles and the functional ones.",
      partStyle:
        "This element is a @foldkit/ui part, whose inline style @foldkit/ui owns, and Foldkit keeps one Style per element, so this replaces it. Put static styles in that part's entry of its styles. For a runtime value, set a custom property with h.Style on your own element around the part and read it with var() in the part's styles; a portaled panel inherits from none of your elements, so set it on an element you render inside the panel and style that element.",
      oneCall:
        "Pass every style of this element to one sx(...) call, conditions included. Foldkit keeps one Class per element, and StyleX resolves conflicting properties only within one call.",
      oneClass:
        "Join these class names into one Class. Foldkit keeps one Class per element, so this one replaces the ones before it.",
      last: "Put sx(...) last in the attribute list. Foldkit keeps the last Class, so a bundle spread after it replaces these styles.",
      rawClass:
        "Use sx(...) for StyleX styles or h.Class(...) for class names. Scene's toHaveClass cannot see a raw class attribute.",
      rawStyle:
        "Use h.Style(...). A raw style attribute throws when the element also gets a Style, as @foldkit/ui panels do.",
      stylexRuntime:
        "Use sx(...). stylex.props returns numbers that h.Style rejects and omits className when no style applies; stylex.attrs kebab-cases custom properties and returns a raw attribute Scene cannot see.",
      notInElement:
        "Write sx(...) directly in the attribute list of the element it styles, so this rule sees every Class that element gets. Put conditions inside the call: sx(isOpen ? styles.open : styles.closed).",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();

    // A binding made by `DragAndDropStyle.draggable(...)`, which returns the draggable's attributes
    // with its Class.
    const isStyledDraggable = (callee: ESTree.Expression) =>
      callee.type === "Identifier" &&
      (variableOf(context.sourceCode, callee)?.defs.some(
        ({ node }) =>
          node.type === "VariableDeclarator" &&
          node.init?.type === "CallExpression" &&
          exportOf(node.init.callee, imports, kit) === "DragAndDropStyle.draggable",
      ) ??
        false);

    // The Effect Array function `callee` names, such as `map` for `Array.map`.
    const arrayFunctionOf = (callee: ESTree.Node) =>
      effectMemberOf(resolve(callee, imports), "Array");

    // Effect's `pipe`, from effect or effect/Function.
    const isPipe = (callee: ESTree.Node) => {
      const imported = resolve(callee, imports);

      return (
        (imported?.source === "effect" && imported.path === "pipe") ||
        effectMemberOf(imported, "Function") === "pipe"
      );
    };

    // The array a call of one of `names` reads: the receiver of `tabs.map(...)`, or the first
    // argument of Effect's `Array.map(tabs, ...)`.
    const arrayOf = (call: ESTree.CallExpression, names: ReadonlySet<string>) => {
      const { callee } = call;
      const effect = arrayFunctionOf(callee);

      if (effect !== undefined) return names.has(effect) ? call.arguments[0] : undefined;

      return callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        names.has(callee.property.name)
        ? callee.object
        : undefined;
    };

    // A part's bundle: a parameter of a function @foldkit/ui calls with bundles, a member of one
    // such as `tab.tab`, bundles filtered as in `tabs.filter(...)` or `Array.filter(tabs, ...)`, or
    // the result of a styled draggable.
    const isBundle = (node: ESTree.Argument | undefined): boolean => {
      if (node === undefined || node.type === "SpreadElement") return false;

      if (node.type === "CallExpression") {
        return isBundle(arrayOf(node, filters)) || isStyledDraggable(node.callee);
      }

      const root = rootOf(node);
      const variable = root === undefined ? undefined : variableOf(context.sourceCode, root);

      return (
        variable?.defs.some((def) => def.type === "Parameter" && takesBundles(def.node)) ?? false
      );
    };

    // The `const` or `function` declaration that names `fn`.
    const declarationOf = (fn: ESTree.Node) => {
      if (fn.type === "FunctionDeclaration") return fn;

      return fn.parent?.type === "VariableDeclarator" && fn.parent.init === fn
        ? fn.parent
        : undefined;
    };

    // A function @foldkit/ui calls with bundles: one written as a `toView`-like property, one
    // declared by name and passed as one, as in `toView: checkboxView`, or a callback that iterates
    // bundles, as in `tabs.map(cb)`, `Array.map(tabs, cb)` or `pipe(tabs, Array.map(cb))`.
    const takesBundles = (fn: ESTree.Node): boolean => {
      if (isBundleCallback(fn)) return true;

      const declaration = declarationOf(fn);

      if (declaration !== undefined) {
        return context.sourceCode
          .getDeclaredVariables(declaration)
          .some(
            ({ defs, references }) =>
              defs.some(({ type }) => type !== "Parameter") &&
              references.some(({ identifier }) => isBundleCallback(identifier)),
          );
      }

      const { parent } = fn;

      if (parent?.type !== "CallExpression") return false;

      const pipeline = parent.parent;

      // A data-last step of a pipe gets what flows from the pipe's first argument.
      if (
        pipeline.type === "CallExpression" &&
        isPipe(pipeline.callee) &&
        parent.arguments.length === 1 &&
        iterators.has(arrayFunctionOf(parent.callee) ?? "")
      ) {
        return isBundle(pipeline.arguments[0]);
      }

      return isBundle(arrayOf(parent, iterators));
    };

    // An attribute list that ends up on a part: one that spreads a part's bundle, or the
    // `childAttributes([...])` of a view input such as `buttonAttributes`.
    const isPartList = (list: ESTree.ArrayExpression) => {
      const { parent } = list;

      if (
        parent.type === "CallExpression" &&
        exportOf(parent.callee, imports, "foldkit/html") === "childAttributes"
      ) {
        return (
          parent.parent.type === "Property" && attributesInput.test(keyOf(parent.parent) ?? "")
        );
      }

      return list.elements.some(
        (item) => item?.type === "SpreadElement" && isBundle(item.argument),
      );
    };

    return {
      Program(program) {
        imports = importsOf(program);
      },
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
        const written = node.elements.flatMap((item) => {
          if (item === null) return [];

          const writes = writtenBy(item, imports);

          return writes === undefined ? [] : [{ item, ...writes }];
        });

        if (isPartList(node)) {
          for (const { item, attribute } of written) {
            context.report({
              node: item,
              messageId: attribute === "class" ? "partClass" : "partStyle",
            });
          }

          return;
        }

        for (const { item, attribute } of written.filter(({ raw }) => raw)) {
          context.report({
            node: item,
            messageId: attribute === "class" ? "rawClass" : "rawStyle",
          });
        }

        const classWriters = written.flatMap(({ item, attribute, raw }) =>
          attribute === "class" && !raw ? [item] : [],
        );

        const oneCall = classWriters.some((item) => isSx(item, imports)) ? "oneCall" : "oneClass";

        for (const item of classWriters.slice(1)) {
          context.report({ node: item, messageId: oneCall });
        }

        const items = node.elements.filter((item) => item !== null);

        const lastSpread = items.map((item) => item.type).lastIndexOf("SpreadElement");

        for (const item of items.slice(0, Math.max(lastSpread, 0))) {
          if (isSx(item, imports)) context.report({ node: item, messageId: "last" });
        }
      },
    };
  },
});
