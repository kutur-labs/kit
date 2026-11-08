// Every field of an exported State, Styles or *State interface has TSDoc: editors show it where an
// app picks a part or reads a flag, so it says what the part or flag is and anything surprising. A
// field typed as a message, such as Listbox's `panel`, needs none: its type says it. Oxlint's jsdoc
// plugin has no rule that requires TSDoc on interface members.
import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { child, children, declarationOf, kind, src, statements, text } from "./syntax.ts";

const documented = /^(Styles|\w*State)$/;

const undocumentedFields = (file: string) =>
  statements(file)
    .filter((statement) => kind(statement) === "ExportNamedDeclaration")
    .map(declarationOf)
    .filter(
      (declaration) =>
        kind(declaration) === "TSInterfaceDeclaration" &&
        documented.test(text(child(declaration, "id"), "name") ?? ""),
    )
    .flatMap((declaration) =>
      children(child(declaration, "body"), "body")
        .filter(
          (field) =>
            kind(child(child(field, "typeAnnotation"), "typeAnnotation")) !== "TSLiteralType" &&
            !children(field, "leadingComments").some(
              (comment) =>
                kind(comment) === "CommentBlock" && /^\*\s*\S/.test(text(comment, "value") ?? ""),
            ),
        )
        .map(
          (field) =>
            `${text(child(declaration, "id"), "name")}.${text(child(field, "key"), "name")}`,
        ),
    );

const files = readdirSync(src, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts"))
  .sort();

describe("TSDoc", () => {
  for (const file of files) {
    it(`documents every State and Styles field in ${file}`, () => {
      expect(
        undocumentedFields(file),
        `Give each of these fields a /** */ comment that says what the part or flag is and anything surprising about it.`,
      ).toEqual([]);
    });
  }
});
