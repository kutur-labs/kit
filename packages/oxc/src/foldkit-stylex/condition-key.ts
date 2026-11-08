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

// A media query's widths and its other features, such as `(prefers-reduced-motion:reduce)`, without
// whitespace.
type MediaQuery = Readonly<{ range: WidthRange; features: ReadonlySet<string> }>;

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

// Parses `@media (min-width: 40rem) and (prefers-reduced-motion: reduce)`, with widths also in the
// `(width >= 640px)` form. Returns `undefined` for a query with a media type, `or`, `not` or a
// comma.
const mediaQueryOf = (key: string): MediaQuery | undefined => {
  if (!key.startsWith("@media ")) return undefined;

  let range = unbounded;

  const features = new Set<string>();

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
    } else if (/^\([^()]*\)$/.test(condition)) {
      features.add(condition.replaceAll(/\s/g, ""));
    } else {
      return undefined;
    }
  }

  return { range, features };
};

const atOrBelow = (a: Bound, b: Bound) =>
  a.value < b.value || (a.value === b.value && (b.inclusive || !a.inclusive));

const atOrAbove = (a: Bound, b: Bound) =>
  a.value > b.value || (a.value === b.value && (b.inclusive || !a.inclusive));

// Whether `outer` matches wherever `inner` does: it needs no feature `inner` lacks, and its widths
// include all of `inner`'s.
const covers = (outer: MediaQuery, inner: MediaQuery) =>
  [...outer.features].every((name) => inner.features.has(name)) &&
  atOrAbove(inner.range.min, outer.range.min) &&
  atOrBelow(inner.range.max, outer.range.max);

// PSEUDO_CLASS_PRIORITIES of @stylexjs/babel-plugin 0.19.1, less its entries of 40 and its focus
// entries. StyleX ranks a key by the name before its first '(', and an unlisted name, such as ':is',
// 40. It ranks a chain without '(', such as ':hover:active', by the sum of its parts; this rule
// reads a chain as unlisted, so it never reports one.
const pseudoClassRank = new Map([
  [":has", 45],
  [":dir", 50],
  [":lang", 51],
  [":first-child", 52],
  [":first-of-type", 53],
  [":last-child", 54],
  [":last-of-type", 55],
  [":only-child", 56],
  [":only-of-type", 57],
  [":nth-child", 60],
  [":nth-last-child", 61],
  [":nth-of-type", 62],
  [":nth-last-of-type", 63],
  [":empty", 70],
  [":link", 80],
  [":any-link", 81],
  [":local-link", 82],
  [":target-within", 83],
  [":target", 84],
  [":visited", 85],
  [":enabled", 91],
  [":disabled", 92],
  [":required", 93],
  [":optional", 94],
  [":read-only", 95],
  [":read-write", 96],
  [":placeholder-shown", 97],
  [":in-range", 98],
  [":out-of-range", 99],
  [":default", 100],
  [":checked", 101],
  [":indeterminate", 101],
  [":blank", 102],
  [":valid", 103],
  [":invalid", 104],
  [":user-invalid", 105],
  [":autofill", 110],
  [":picture-in-picture", 120],
  [":modal", 121],
  [":fullscreen", 122],
  [":paused", 123],
  [":playing", 124],
  [":current", 125],
  [":past", 126],
  [":future", 127],
  [":hover", 130],
  [":focus", 150],
  [":active", 170],
]);

// The ranks StyleX's table means focus keys to have. It lists ':focus-visible' and ':focus-within'
// as ':focusVisible' and ':focusWithin', so they rank 40, below every listed pseudo-class.
// ':has(:focus-visible)', which styles focus on an element whose input is hidden, ranks 45 as a
// ':has' key and takes the rank of ':focus-visible' here.
const intendedRank = new Map([
  [":focus-visible", 160],
  [":focus-within", 140],
  [":has(:focus-visible)", 160],
]);

const rankOf = (key: string) => pseudoClassRank.get(key.replace(/\(.*/, "")) ?? 40;

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
        "Style '{{key}}' from state: (state) => [styles.base, state.isChecked && styles.checked] in a part's styles, or sx(styles.base, isChecked && styles.checked) on your own element. @foldkit/ui's hooks differ across components (Checkbox, Switch, Button and Listbox use aria-disabled, so :disabled never matches them), and StyleX ranks ':is()' keys of one property equally.",
      bareAttribute:
        "Write ':is({{key}})' instead of '{{key}}'. StyleX adds 3000 to a bare attribute condition's priority, above :hover (+130) and media queries (+200), and types its value as unknown, which typed style props reject. The :is() form ranks with pseudo-classes, so check which condition wins where they overlap.",
      mediaOrder:
        "'{{earlier}}' never matches: StyleX rewrites each media query to exclude the ones after it in the same property, and '{{later}}' matches wherever it does. Put the query that covers the other first: min-width queries from narrow to wide, max-width queries from wide to narrow.",
      focusRank:
        "StyleX 0.19 ranks '{{key}}' below '{{above}}', so '{{above}}' wins wherever both match and hides the focus style. Style focus on a property that '{{above}}' does not set, or write '{{above}}:not({{key}})' so the two never match together.",
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
        const query = key === undefined ? undefined : mediaQueryOf(key);

        return key === undefined || query === undefined ? [] : [{ key, query, property }];
      });

      for (const [index, earlier] of queries.entries()) {
        const later = queries.slice(index + 1).find(({ query }) => covers(query, earlier.query));

        if (later !== undefined) {
          context.report({
            node: earlier.property.key,
            messageId: "mediaOrder",
            data: { earlier: earlier.key, later: later.key },
          });
        }
      }
    };

    // A focus key next to a key that StyleX ranks above it but its table puts below it. Keys of
    // one rank, such as ':focus-visible' and ':is()', tie and are not reported.
    const checkFocusRank = (properties: ReadonlyArray<ESTree.ObjectProperty>) => {
      const keys = properties.flatMap((property) => keyOf(property) ?? []);

      for (const property of properties) {
        const key = keyOf(property) ?? "";
        const intended = intendedRank.get(key);

        const above =
          intended === undefined
            ? undefined
            : keys.find((other) => rankOf(other) > rankOf(key) && rankOf(other) < intended);

        if (above !== undefined) {
          context.report({ node: property.key, messageId: "focusRank", data: { key, above } });
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
      checkFocusRank(properties);

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
