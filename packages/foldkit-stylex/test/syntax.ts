// Syntax trees of this package's sources, for checks over declarations the type system cannot
// list. It uses the Babel that @stylexjs/unplugin runs, as test/budget.test.ts does, so it adds no
// dependency.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { Predicate } from "effect";

/** A value in a Babel syntax tree, which holds plain data only. */
export type Value = string | number | boolean | null | undefined | Node | ReadonlyArray<Value>;

/**
 * A Babel syntax tree node, or an object inside one. Read its fields with `kind`, `child`,
 * `children` and `text`, which check each value's type.
 */
export interface Node {
  readonly [key: string]: Value;
}

/** The options of StyleX's Babel plugin these tests set. */
export type StylexOptions = Readonly<{
  dev: false;
  runtimeInjection: false;
  styleResolution?: "application-order";
  unstable_moduleResolution: Readonly<{ type: "commonJS"; rootDir: string }>;
}>;

export type BabelOptions = Readonly<{
  filename: string;
  babelrc: false;
  configFile: false;
  ast?: true;
  code?: false;
  parserOpts: Readonly<{ plugins: ReadonlyArray<string> }>;
  plugins?: ReadonlyArray<readonly [string, StylexOptions]>;
}>;

const require = createRequire(import.meta.resolve("@stylexjs/unplugin"));

// SAFETY: require returns any; @babel/core 7 exports parseSync and transformSync with these
// signatures, and its syntax trees hold plain data only.
export const babel = require("@babel/core") as Readonly<{
  parseSync: (code: string, options: BabelOptions) => Node | null;
  transformSync: (code: string, options: BabelOptions) => Readonly<{ ast?: Node | null }> | null;
}>;

/** The path Babel loads a plugin from, resolved as @stylexjs/unplugin resolves it. */
export const resolvePlugin = (name: string) => require.resolve(name);

const isNode = (value: Value): value is Node => Predicate.isObject(value);

const isList = (value: Value): value is ReadonlyArray<Value> => globalThis.Array.isArray(value);

/** The object under `key`, if there is one. */
export const child = (node: Node | undefined, key: string): Node | undefined => {
  const value = node?.[key];

  return isNode(value) ? value : undefined;
};

/** The objects in the list under `key`. */
export const children = (node: Node | undefined, key: string): ReadonlyArray<Node> => {
  const value = node?.[key];

  return isList(value) ? value.filter(isNode) : [];
};

/** The string under `key`, if there is one. */
export const text = (node: Node | undefined, key: string): string | undefined => {
  const value = node?.[key];

  return Predicate.isString(value) ? value : undefined;
};

/** A node's type, such as `"TSUnionType"`. */
export const kind = (node: Node | undefined) => text(node, "type");

export const src = path.join(import.meta.dirname, "../src");

/** The top-level statements of a file in src, with each node's leading comments attached. */
export const statements = (file: string): ReadonlyArray<Node> =>
  children(
    child(
      babel.parseSync(readFileSync(path.join(src, file), "utf8"), {
        filename: path.join(src, file),
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["typescript"] },
      }) ?? undefined,
      "program",
    ),
    "body",
  );

/** A top-level statement's declaration if it is exported, or the statement itself. */
export const declarationOf = (statement: Node): Node =>
  kind(statement) === "ExportNamedDeclaration"
    ? (child(statement, "declaration") ?? statement)
    : statement;
