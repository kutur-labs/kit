// Each family in src/internal/owned.ts lists every property that sets a longhand one of its
// properties sets, logical aliases and legacy names included: otherwise an app's class could set
// that longhand, and lose to an inline style or beat this package's shorthand. StyleX's
// application-order compiler is the record of which properties share a longhand: it compiles a
// logical alias to its physical property's key and resets each shorthand's longhands.
import { describe, expect, it } from "vitest";

import { compileEach, typed, unexpanded } from "./properties.ts";
import { child, children, declarationOf, kind, statements, text, type Node } from "./syntax.ts";

const properties = [...new Set([...typed, ...unexpanded.flat()])];

const compiled = compileEach(properties, { styleResolution: "application-order" });

// The keys each property compiles to in StyleX's application-order mode, plus its `unexpanded` rows.
const keysOf = new Map(
  properties.map((property) => [
    property,
    new Set([
      ...(compiled.entries.get(property) ?? []).map(({ key }) => key),
      ...unexpanded.flatMap((row, index) =>
        row.includes(property) ? [`unexpanded ${index}`] : [],
      ),
    ]),
  ]),
);

// The keys any of `names` compiles to.
const keysIn = (names: ReadonlyArray<string>) =>
  new Set(names.flatMap((name) => [...(keysOf.get(name) ?? [])]));

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

type Writes = Readonly<{
  members: ReadonlyArray<string>;
  written: ReadonlyArray<string>;
  together: ReadonlyArray<string>;
}>;

// The `Inline` and `Functional` types a family is made of, through intersections and the file's
// own aliases: the members of each, those it writes, and those it says work together with them.
const writesOf = (type: Node | undefined): ReadonlyArray<Writes> => {
  if (kind(type) === "TSIntersectionType") {
    return children(type, "types").flatMap(writesOf);
  }

  const name = text(child(type, "typeName"), "name") ?? "";

  const [members, written, , together] = children(child(type, "typeParameters"), "params");

  return ["Inline", "Functional"].includes(name)
    ? [
        {
          members: membersOf(members),
          written: membersOf(written),
          together: together === undefined ? [] : membersOf(together),
        },
      ]
    : aliases.has(name)
      ? writesOf(child(aliases.get(name), "typeAnnotation"))
      : [];
};

const sorted = (names: Iterable<string>) => [...new Set(names)].sort();

const families = declarations
  .filter((statement) => kind(statement) === "ExportNamedDeclaration")
  .map(declarationOf)
  .filter((declaration) => kind(declaration) === "TSTypeAliasDeclaration")
  .map((declaration) => ({
    family: text(child(declaration, "id"), "name") ?? "",
    members: membersOf(child(declaration, "typeAnnotation")),
    writes: writesOf(child(declaration, "typeAnnotation")),
  }));

describe("owned families", () => {
  for (const { family, members } of families) {
    it(`${family} lists every property that sets a longhand it owns`, () => {
      expect(
        members.filter((member) => !keysOf.has(member)),
        `${family} lists properties StyleX does not type. Fix the name, or add the property's row to unexpanded in test/properties.ts.`,
      ).toEqual([]);

      const owned = keysIn(members);

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

  // None owns nothing, so it has no Inline or Functional to read.
  for (const { family, writes } of families.filter(({ writes }) => writes.length > 0)) {
    it(`${family} says overlaps only of the members that share a longhand with what it writes`, () => {
      for (const { members: all, written, together } of writes) {
        const writtenKeys = keysIn(written);

        const others = all.filter((member) => !written.includes(member));

        const overlaps = (member: string) =>
          [...(keysOf.get(member) ?? [])].some((key) => writtenKeys.has(key));

        expect(
          {
            overlap: sorted(others.filter((member) => !together.includes(member))),
            together: sorted(together),
          },
          `Pass exactly the expected together members as the fourth parameter of ${family}'s Inline or Functional in src/internal/owned.ts. They share no longhand with what it writes, so "overlaps what it sets" would be false for them.`,
        ).toEqual({
          overlap: sorted(others.filter(overlaps)),
          together: sorted(others.filter((member) => !overlaps(member))),
        });
      }
    });
  }
});
