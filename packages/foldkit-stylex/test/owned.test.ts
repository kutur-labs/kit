// Each family in src/internal/owned.ts lists every property that sets a longhand one of its
// properties sets, logical aliases and legacy names included: otherwise an app's class could set
// that longhand, and lose to an inline style or beat this package's shorthand. StyleX's
// application-order compiler is the record of which properties share a longhand: it compiles a
// logical alias to its physical property's key and resets each shorthand's longhands.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  babel,
  child,
  children,
  declarationOf,
  kind,
  resolvePlugin,
  src,
  statements,
  text,
  type Node,
} from "./syntax.ts";

// CSS shorthands and aliases StyleX's compiler leaves out, as the properties that set one longhand.
// Add a row when a family owns a property that CSS sets from a shorthand or alias StyleX compiles
// to a key of its own.
const unexpanded: ReadonlyArray<ReadonlyArray<string>> = [
  ["overscrollBehavior", "overscrollBehaviorX", "overscrollBehaviorInline"],
  ["overscrollBehavior", "overscrollBehaviorY", "overscrollBehaviorBlock"],
  ["overflow", "overflowX", "overflowInline"],
  // The border shorthand resets border-image.
  ...["Source", "Slice", "Width", "Outset", "Repeat"].map((longhand) => [
    "border",
    "borderImage",
    `borderImage${longhand}`,
  ]),
];

// Every property StyleX types.
const typed = (() => {
  const declarations = readFileSync(
    new URL("./types/StyleXCSSTypes.d.ts", import.meta.resolve("@stylexjs/stylex")),
    "utf8",
  );

  const block = declarations.slice(declarations.indexOf("export type CSSProperties = Readonly<{"));

  return [...block.slice(0, block.indexOf("}>;")).matchAll(/^ {2}(\w+)\?:/gm)].flatMap(
    ([, property]) => (property === undefined || property === "theme" ? [] : [property]),
  );
})();

const properties = [...new Set([...typed, ...unexpanded.flat()])];

// The keys each property compiles to in StyleX's application-order mode, plus its `unexpanded` rows.
const keysOf = (() => {
  const file = path.join(src, "families.ts");

  const namespaces = properties
    .map((property) => `${property}: { ${property}: "inherit" }`)
    .join(", ");

  const compiled = babel.transformSync(
    `import * as stylex from "@stylexjs/stylex";\nexport const s = stylex.create({ ${namespaces} });`,
    {
      filename: file,
      babelrc: false,
      configFile: false,
      ast: true,
      code: false,
      parserOpts: { plugins: ["typescript"] },
      plugins: [
        [
          resolvePlugin("@stylexjs/babel-plugin"),
          {
            dev: false,
            runtimeInjection: false,
            styleResolution: "application-order",
            unstable_moduleResolution: { type: "commonJS", rootDir: src },
          },
        ],
      ],
    },
  );

  const created = child(
    children(
      child(
        children(child(compiled?.ast ?? undefined, "program"), "body").find(
          (statement) => kind(statement) === "ExportNamedDeclaration",
        ),
        "declaration",
      ),
      "declarations",
    )[0],
    "init",
  );

  const keyName = (property: Node) =>
    text(child(property, "key"), "name") ?? text(child(property, "key"), "value") ?? "";

  const compiledKeys = new Map(
    children(created, "properties").map((namespace) => [
      keyName(namespace),
      children(child(namespace, "value"), "properties")
        .map(keyName)
        .filter((key) => key !== "$$css"),
    ]),
  );

  return new Map(
    properties.map((property) => [
      property,
      new Set([
        ...(compiledKeys.get(property) ?? []),
        ...unexpanded.flatMap((row, index) =>
          row.includes(property) ? [`unexpanded ${index}`] : [],
        ),
      ]),
    ]),
  );
})();

const declarations = statements("internal/owned.ts");

const aliases = new Map(
  declarations
    .map(declarationOf)
    .filter((declaration) => kind(declaration) === "TSTypeAliasDeclaration")
    .map((declaration) => [text(child(declaration, "id"), "name") ?? "", declaration]),
);

// The property names a family's type lists, through unions, intersections, template literals and
// the file's own aliases. `Inline`, `Functional`, `Readonly` and `Record` take them first.
const membersOf = (type: Node | undefined): ReadonlyArray<string> => {
  const found = kind(type) ?? "missing node";

  switch (found) {
    case "TSUnionType":
    case "TSIntersectionType":
      return children(type, "types").flatMap(membersOf);
    case "TSParenthesizedType":
      return membersOf(child(type, "typeAnnotation"));
    case "TSNeverKeyword":
      return [];
    case "TSLiteralType": {
      const literal = child(type, "literal");

      const quasis = children(literal, "quasis").map(
        (quasi) => text(child(quasi, "value"), "cooked") ?? "",
      );

      return kind(literal) === "TemplateLiteral"
        ? children(literal, "expressions").reduce<ReadonlyArray<string>>(
            (prefixes, expression, index) =>
              prefixes.flatMap((prefix) =>
                membersOf(expression).map((value) => `${prefix}${value}${quasis[index + 1] ?? ""}`),
              ),
            [quasis[0] ?? ""],
          )
        : [text(literal, "value") ?? ""];
    }

    case "TSTypeReference": {
      const name = text(child(type, "typeName"), "name") ?? "";

      const [first] = children(child(type, "typeParameters"), "params");

      return ["Inline", "Functional", "Readonly", "Record"].includes(name)
        ? membersOf(first)
        : membersOf(child(aliases.get(name), "typeAnnotation"));
    }

    default:
      throw new Error(
        `test/owned.test.ts cannot read a ${found} in src/internal/owned.ts. Teach membersOf to read it.`,
      );
  }
};

const families = declarations
  .filter((statement) => kind(statement) === "ExportNamedDeclaration")
  .map(declarationOf)
  .filter((declaration) => kind(declaration) === "TSTypeAliasDeclaration")
  .map((declaration) => ({
    family: text(child(declaration, "id"), "name") ?? "",
    members: membersOf(child(declaration, "typeAnnotation")),
  }));

describe("owned families", () => {
  for (const { family, members } of families) {
    it(`${family} lists every property that sets a longhand it owns`, () => {
      expect(
        members.filter((member) => !keysOf.has(member)),
        `${family} lists properties StyleX does not type. Fix the name, or add the property's row to unexpanded in test/owned.test.ts.`,
      ).toEqual([]);

      const owned = new Set(members.flatMap((member) => [...(keysOf.get(member) ?? [])]));

      expect(
        properties.filter(
          (property) =>
            !members.includes(property) &&
            [...(keysOf.get(property) ?? [])].some((key) => owned.has(key)),
        ),
        `Add these properties to ${family} in src/internal/owned.ts. Each sets a longhand the family owns, so an app's class setting it would lose to the inline style or beat this package's rule.`,
      ).toEqual([]);
    });
  }
});
