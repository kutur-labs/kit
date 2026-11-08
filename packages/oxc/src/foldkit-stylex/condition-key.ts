import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import { exportOf, type Imports, importsOf, keyOf } from "../rules/imports.ts";

// Hooks @foldkit/ui derives from state that the kit exposes as flags, native states that
// @foldkit/ui's aria-disabled controls never enter, and ARIA attributes.
const stateHook =
  /data-(checked|indeterminate|open|active|selected|disabled|readonly|invalid|focused|current|drag-over|dragging|today|outside-month|state|variant|closed|swipe)\b|:(disabled|enabled|checked|indeterminate|read-only|read-write|invalid|open)\b|\[aria-/;

// Every Toast entry shares one class, which cannot take state, so its animation and swipe key on
// these hooks.
const toastEntryHooks = /data-(closed|swipe)\b/g;

type Bound = Readonly<{ value: number; inclusive: boolean }>;

// The viewport widths a media query matches, in px.
type WidthRange = Readonly<{ min: Bound; max: Bound }>;

const unbounded: WidthRange = {
  min: { value: -Infinity, inclusive: true },
  max: { value: Infinity, inclusive: true },
};

const length = String.raw`(\d*\.?\d+)(px|rem|em)`;

const feature = new RegExp(String.raw`^\((min|max)-width:\s*${length}\)$`);

const comparison = new RegExp(String.raw`^\(width\s*(<=?|>=?)\s*${length}\)$`);

const narrow = (range: WidthRange, side: "min" | "max", bound: Bound): WidthRange => ({
  ...range,
  [side]: bound,
});

// rem and em resolve against the browser's default font size in media queries.
const toPixels = (value: string, unit: string) => Number(value) * (unit === "px" ? 1 : 16);

// Parses `@media (min-width: 40rem) and (max-width: 1023px)` and the `(width >= 640px)` form.
// Returns `undefined` for a query with any other feature, media type, `or`, `not` or a comma.
const widthRange = (key: string): WidthRange | undefined => {
  if (!key.startsWith("@media ")) return undefined;

  let range = unbounded;

  for (const condition of key
    .slice("@media ".length)
    .trim()
    .split(/\s+and\s+/)) {
    const minMax = feature.exec(condition);
    const compared = comparison.exec(condition);

    if (minMax !== null) {
      const [, side = "", value = "", unit = ""] = minMax;

      range = narrow(range, side === "min" ? "min" : "max", {
        value: toPixels(value, unit),
        inclusive: true,
      });
    } else if (compared !== null) {
      const [, operator = "", value = "", unit = ""] = compared;

      range = narrow(range, operator.startsWith(">") ? "min" : "max", {
        value: toPixels(value, unit),
        inclusive: operator.endsWith("="),
      });
    } else {
      return undefined;
    }
  }

  return range;
};

const atOrBelow = (a: Bound, b: Bound) =>
  a.value < b.value || (a.value === b.value && (b.inclusive || !a.inclusive));

const atOrAbove = (a: Bound, b: Bound) =>
  a.value > b.value || (a.value === b.value && (b.inclusive || !a.inclusive));

// Whether `outer` matches every width `inner` matches.
const covers = (outer: WidthRange, inner: WidthRange) =>
  atOrAbove(inner.min, outer.min) && atOrBelow(inner.max, outer.max);

type Candidate = Readonly<{ entry: string; key: string; node: ESTree.Node }>;

export const conditionKey = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow StyleX condition keys that never match or that rank differently than written.",
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      stateAttribute:
        "Style '{{key}}' from state: (state) => [styles.base, state.isChecked && styles.checked] in a part's styles, or sx(styles.base, isChecked && styles.checked) on your own element. @foldkit/ui's hooks differ across components, disables Checkbox, Switch, Button and Listbox with aria-disabled so :disabled never matches, and StyleX ranks ':is()' keys of one property equally.",
      bareAttribute:
        "Write ':is({{key}})' instead of '{{key}}'. StyleX adds 3000 to a bare attribute condition's priority, above :hover (+130) and media queries (+200), and types its value as unknown, which typed style props reject. The :is() form ranks with pseudo-classes, so check which condition wins where they overlap.",
      mediaOrder:
        "'{{earlier}}' never matches: StyleX rewrites each width query to exclude the ones after it, and '{{later}}' covers its whole range. Order min-width queries from narrow to wide and max-width queries from wide to narrow.",
      wrapInIs: "Wrap the key in :is().",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();
    // State hook keys, reported at the end of the file once every Toast entry is known.
    let candidates: Array<Candidate> = [];
    // Style keys passed as a Toast `entry`, such as `entry` in `entry: styles.entry`.
    let toastEntries = new Set<string>();

    const checkMediaOrder = (properties: ReadonlyArray<ESTree.ObjectProperty>) => {
      const queries = properties.flatMap((property) => {
        const key = keyOf(property);
        const range = key === undefined ? undefined : widthRange(key);

        return key === undefined || range === undefined ? [] : [{ key, range, property }];
      });

      for (const [index, earlier] of queries.entries()) {
        const later = queries.slice(index + 1).find(({ range }) => covers(range, earlier.range));

        if (later !== undefined) {
          context.report({
            node: earlier.property.key,
            messageId: "mediaOrder",
            data: { earlier: earlier.key, later: later.key },
          });
        }
      }
    };

    const checkKey = (entry: string, key: string, property: ESTree.ObjectProperty) => {
      if (stateHook.test(key)) {
        candidates.push({ entry, key, node: property.key });
      } else if (key.startsWith("[")) {
        context.report({
          node: property.key,
          messageId: "bareAttribute",
          data: { key },
          suggest: [
            {
              messageId: "wrapInIs",
              fix: (fixer) => fixer.replaceText(property.key, JSON.stringify(`:is(${key})`)),
            },
          ],
        });
      }
    };

    const checkStyle = (entry: string, style: ESTree.Node) => {
      // A dynamic style's conditions are in the object its function returns.
      const object = style.type === "ArrowFunctionExpression" ? style.body : style;

      if (object.type !== "ObjectExpression") return;

      const properties = object.properties.filter((property) => property.type === "Property");

      checkMediaOrder(properties);

      for (const property of properties) {
        const key = keyOf(property);

        if (key !== undefined) checkKey(entry, key, property);

        checkStyle(entry, property.value);
      }
    };

    return {
      Program(program) {
        imports = importsOf(program);
        candidates = [];
        toastEntries = new Set();
      },
      CallExpression(node) {
        const [styles] = node.arguments;

        if (
          exportOf(node.callee, imports, "@stylexjs/stylex") !== "create" ||
          styles?.type !== "ObjectExpression"
        ) {
          return;
        }

        for (const entry of styles.properties) {
          const name = entry.type === "Property" ? keyOf(entry) : undefined;

          if (entry.type === "Property" && name !== undefined) checkStyle(name, entry.value);
        }
      },
      MemberExpression(node) {
        if (node.computed || node.property.type !== "Identifier") return;

        for (
          let parent: ESTree.Node | null = node.parent;
          parent !== null;
          parent = parent.parent
        ) {
          if (parent.type === "Property" && keyOf(parent) === "entry") {
            toastEntries.add(node.property.name);

            return;
          }
        }
      },
      "Program:exit"() {
        for (const { entry, key, node } of candidates) {
          const entryOnly =
            toastEntries.has(entry) && !stateHook.test(key.replaceAll(toastEntryHooks, ""));

          if (!entryOnly) context.report({ node, messageId: "stateAttribute", data: { key } });
        }
      },
    };
  },
});
