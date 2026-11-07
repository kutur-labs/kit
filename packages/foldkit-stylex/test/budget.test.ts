// Every app that imports the core ships all of its functional CSS, so that CSS has a budget. This
// compiles every source file as the app's StyleX compiler does, then minifies the rules as a
// production build does.
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

const budget = 2048;

// The files kit lint allows to define styles, relative to src.
const definitions = [
  "internal/compiled.ts",
  "internal/functional-styles.ts",
  "internal/markers.stylex.ts",
];

const src = path.join(import.meta.dirname, "../src");

// The Babel, StyleX plugin and Lightningcss that @stylexjs/unplugin runs, so the CSS matches what
// an app's build emits.
const require = createRequire(import.meta.resolve("@stylexjs/unplugin"));

type BabelOptions = Readonly<{
  filename: string;
  babelrc: false;
  configFile: false;
  parserOpts: Readonly<{ plugins: ReadonlyArray<string> }>;
  plugins: ReadonlyArray<
    readonly [
      string,
      Readonly<{
        dev: false;
        runtimeInjection: false;
        unstable_moduleResolution: Readonly<{ type: "commonJS"; rootDir: string }>;
      }>,
    ]
  >;
}>;

// SAFETY: require returns any; @babel/core 7 exports transformSync with this signature.
const babel = require("@babel/core") as Readonly<{
  transformSync: (
    code: string,
    options: BabelOptions,
  ) => Readonly<{
    metadata: Readonly<{ stylex?: ReadonlyArray<unknown> }>;
  }> | null;
}>;

// SAFETY: require returns any; @stylexjs/babel-plugin 0.19 exports processStylexRules.
const stylexPlugin = require("@stylexjs/babel-plugin") as Readonly<{
  processStylexRules: (
    rules: ReadonlyArray<unknown>,
    options: Readonly<{ useLayers: boolean }>,
  ) => string;
}>;

// SAFETY: require returns any; Lightningcss exports transform with this signature.
const lightningcss = require("lightningcss") as Readonly<{
  transform: (
    options: Readonly<{ filename: string; code: Uint8Array; minify: boolean }>,
  ) => Readonly<{
    code: Uint8Array;
  }>;
}>;

// The rules StyleX compiles from each source file, by its path relative to src.
const compile = (file: string) => {
  const filename = path.join(src, file);

  const result = babel.transformSync(readFileSync(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["typescript"] },
    plugins: [
      [
        require.resolve("@stylexjs/babel-plugin"),
        {
          dev: false,
          runtimeInjection: false,
          // Resolves `.stylex` imports such as the marker's, as the app's compiler does.
          unstable_moduleResolution: { type: "commonJS", rootDir: path.join(src, "..") },
        },
      ],
    ],
  });

  return result?.metadata.stylex ?? [];
};

const rulesByFile = readdirSync(src, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts"))
  .map((file) => [file, compile(file)] as const);

describe("functional CSS", () => {
  // Kit lint matches the namespace by the name `stylex` only; the compiler sees every alias.
  it("comes only from the files kit lint allows to define styles", () => {
    const outside = rulesByFile.flatMap(([file, rules]) =>
      rules.length > 0 && !definitions.includes(file) ? [file] : [],
    );

    expect(
      outside,
      "Put StyleX definitions in src/internal/functional-styles.ts, with the reason for each rule, and import @stylexjs/stylex as stylex.",
    ).toEqual([]);
  });

  it(`stays within ${budget} B minified`, () => {
    const rules = rulesByFile.flatMap(([, fileRules]) => fileRules);

    expect(
      rules.length,
      "StyleX compiled no rules; check the Babel options above.",
    ).toBeGreaterThan(0);

    const css = stylexPlugin.processStylexRules(rules, { useLayers: true });

    const size = lightningcss.transform({
      filename: "functional.css",
      code: new TextEncoder().encode(css),
      minify: true,
    }).code.length;

    expect(
      size,
      `The core's functional CSS is ${size} B minified, over the ${budget} B every app ships. Move the heaviest component's rules into a subpath export of its own, so only apps that use it ship them.`,
    ).toBeLessThanOrEqual(budget);
  });
});
