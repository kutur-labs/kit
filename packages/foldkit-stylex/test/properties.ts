// Every property StyleX types, and what StyleX's compiler makes of each, for the tests that check
// src against StyleX's own record of which properties set which longhands.
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  babel,
  child,
  children,
  kind,
  resolvePlugin,
  src,
  text,
  type Node,
  type StylexOptions,
  type StylexRule,
} from "./syntax.ts";

/** Every property StyleX types. */
export const typed: ReadonlyArray<string> = (() => {
  const declarations = readFileSync(
    new URL("./types/StyleXCSSTypes.d.ts", import.meta.resolve("@stylexjs/stylex")),
    "utf8",
  );

  const block = declarations.slice(declarations.indexOf("export type CSSProperties = Readonly<{"));

  return [...block.slice(0, block.indexOf("}>;")).matchAll(/^ {2}(\w+)\?:/gm)].flatMap(
    ([, property]) => (property === undefined || property === "theme" ? [] : [property]),
  );
})();

/**
 * CSS shorthands and aliases StyleX's compiler leaves out, as the properties that set one longhand.
 * Add a row when CSS sets a longhand from a shorthand or alias StyleX compiles to a key of its own.
 */
export const unexpanded: ReadonlyArray<ReadonlyArray<string>> = [
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

/** One key of a compiled style: the class it applies, or null where the style resets the key. */
export type Entry = Readonly<{ key: string; className: string | null }>;

/** What StyleX compiles `{ [property]: "inherit" }` to, for each property. */
export type Compiled = Readonly<{
  entries: ReadonlyMap<string, ReadonlyArray<Entry>>;
  rules: ReadonlyArray<StylexRule>;
}>;

const keyName = (property: Node) =>
  text(child(property, "key"), "name") ?? text(child(property, "key"), "value") ?? "";

/** Compiles `{ [property]: "inherit" }` for each property, with StyleX's other options as given. */
export const compileEach = (
  properties: ReadonlyArray<string>,
  options: Pick<StylexOptions, "styleResolution" | "enableLogicalStylesPolyfill">,
): Compiled => {
  const namespaces = properties
    .map((property) => `${property}: { ${property}: "inherit" }`)
    .join(", ");

  const compiled = babel.transformSync(
    `import * as stylex from "@stylexjs/stylex";\nexport const s = stylex.create({ ${namespaces} });`,
    {
      filename: path.join(src, "properties.ts"),
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
            ...options,
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

  return {
    entries: new Map(
      children(created, "properties").map((namespace) => [
        keyName(namespace),
        children(child(namespace, "value"), "properties")
          .filter((property) => keyName(property) !== "$$css")
          .map((property) => ({
            key: keyName(property),
            className: text(child(property, "value"), "value") ?? null,
          })),
      ]),
    ),
    rules: compiled?.metadata.stylex ?? [],
  };
};
