// src/internal/precedence.ts lists, for each property, the properties StyleX applies over it where
// both set a longhand. This test derives that table from StyleX's compiler:
// - The longhands a property sets in each direction are the physical properties StyleX's logical
//   polyfill compiles it to, the rows of `unexpanded`, and for a property StyleX ranks as a
//   shorthand, the longhands of each property its application-order expansion resets.
// - Of two such properties, StyleX applies the one whose rule comes later in its stylesheet.
// - Two properties that compile to one key never compete: `stylex.props` keeps the later one.
import { describe, expect, it } from "vitest";

import { compileEach, typed, unexpanded, type Compiled } from "./properties.ts";
import {
  child,
  children,
  declarationOf,
  kind,
  statements,
  stylexPlugin,
  text,
  type Node,
} from "./syntax.ts";

const byDefault = compileEach(typed, {});

const byOrder = compileEach(typed, { styleResolution: "application-order" });

const byPolyfill = compileEach(typed, {
  styleResolution: "legacy-expand-shorthands",
  enableLogicalStylesPolyfill: true,
});

// The key and class each property compiles to. StyleX compiles no rule for a few shorthands, such
// as `border`, which its lint rules reject.
const applied = (compiled: Compiled, property: string) =>
  (compiled.entries.get(property) ?? []).filter(
    (entry): entry is Readonly<{ key: string; className: string }> => entry.className !== null,
  );

const usable = typed.filter((property) => applied(byDefault, property).length > 0);

const keyOf = (property: string) => applied(byDefault, property)[0]?.key;

const ruleOf = (compiled: Compiled, className: string) =>
  compiled.rules.find(([name]) => name === className);

const stylesheet = stylexPlugin.processStylexRules(byDefault.rules, { useLayers: true });

// Where a property's rule comes in the stylesheet StyleX builds: a later rule wins.
const positionOf = (property: string) =>
  stylesheet.search(new RegExp(`\\.${applied(byDefault, property)[0]?.className}(?![\\w-])`));

// StyleX ranks shorthands at priority 1000 or 2000, and longhands at 3000 or more.
const longhandPriority = 3000;

const isShorthand = (property: string) =>
  (ruleOf(byDefault, applied(byDefault, property)[0]?.className ?? "")?.[2] ?? longhandPriority) <
  longhandPriority;

// The property a CSS rule declares, such as `padding-left` in `.x1{padding-left:inherit}`.
const declared = (css: string) => css.slice(css.lastIndexOf("{") + 1).split(":")[0] ?? "";

const longhandsOf = (
  property: string,
  seen: ReadonlySet<string> = new Set(),
): ReadonlySet<string> =>
  new Set([
    ...applied(byPolyfill, property).flatMap(({ className }) =>
      className.split(" ").flatMap((name) => {
        const css = ruleOf(byPolyfill, name)?.[1];

        return css === undefined
          ? []
          : [`ltr ${declared(css.ltr)}`, `rtl ${declared(css.rtl ?? css.ltr)}`];
      }),
    ),
    ...unexpanded.flatMap((row, index) =>
      row.includes(property) ? [`ltr unexpanded ${index}`, `rtl unexpanded ${index}`] : [],
    ),
    ...(isShorthand(property) && !seen.has(property)
      ? (byOrder.entries.get(property) ?? [])
          .filter((entry) => entry.className === null)
          .flatMap(({ key }) =>
            usable.filter((other) => applied(byOrder, other).some((entry) => entry.key === key)),
          )
          .flatMap((reset) => [...longhandsOf(reset, new Set([...seen, property]))])
      : []),
  ]);

const longhands = new Map(usable.map((property) => [property, longhandsOf(property)]));

const derived = Object.fromEntries(
  usable.flatMap((property) => {
    const own = longhands.get(property) ?? new Set();

    const over = usable.filter(
      (other) =>
        keyOf(other) !== keyOf(property) &&
        positionOf(other) > positionOf(property) &&
        [...(longhands.get(other) ?? [])].some((longhand) => own.has(longhand)),
    );

    return over.length > 0 ? [[property, [...over].sort()]] : [];
  }),
);

// The string literals of a union type, or of one literal.
const literalsOf = (type: Node | undefined): ReadonlyArray<string> =>
  kind(type) === "TSUnionType"
    ? children(type, "types").flatMap(literalsOf)
    : [text(child(type, "literal"), "value") ?? ""];

const table = statements("internal/precedence.ts")
  .map(declarationOf)
  .find((declaration) => text(child(declaration, "id"), "name") === "BeatenBy");

// The object type inside `Readonly<{ ... }>`.
const [rows] = children(child(child(table, "typeAnnotation"), "typeParameters"), "params");

const listed = Object.fromEntries(
  children(rows, "members").map((member) => [
    text(child(member, "key"), "name") ?? text(child(member, "key"), "value") ?? "",
    [...literalsOf(child(child(member, "typeAnnotation"), "typeAnnotation"))].sort(),
  ]),
);

describe("BeatenBy", () => {
  it("lists the properties StyleX applies over each property where both set a longhand", () => {
    expect(
      listed,
      "Make BeatenBy in src/internal/precedence.ts list what the installed StyleX applies over each property. Otherwise a later styles object's shorthand loses to an earlier longhand without a compile error, or valid layers fail to compile.",
    ).toEqual(derived);
  });
});
