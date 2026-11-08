import { readdirSync } from "node:fs";

// Every page renders in test:browser; these are the checks that need no build.
import { Option, Predicate, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { screenAt } from "../src/main.ts";
import { pages } from "../src/pages.ts";

const slugsIn = (directory: string) =>
  readdirSync(new URL(`../src/${directory}/`, import.meta.url))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => file.slice(0, -".ts".length))
    .sort();

// The functions `Demo` names, which `import.meta.glob` cannot check a module against.
const DemoExports = Schema.Struct({
  init: Schema.declare(Predicate.isFunction),
  update: Schema.declare(Predicate.isFunction),
  view: Schema.declare(Predicate.isFunction),
});

describe("the gallery's pages", () => {
  it("has one page per core demo, showing the themed demo of the same name", () => {
    expect(pages.map(({ slug }) => slug)).toEqual(slugsIn("demos"));
    expect(pages.filter(({ themed }) => Option.isSome(themed)).map(({ slug }) => slug)).toEqual(
      slugsIn("themed"),
    );
  });

  it("finds init, update and view in every demo module", () => {
    const modules = pages.flatMap(({ slug, core, themed }) => [
      [`src/demos/${slug}.ts`, core] as const,
      ...Option.toArray(themed).map((demo) => [`src/themed/${slug}.ts`, demo] as const),
    ]);

    expect(
      modules.flatMap(([file, demo]) => (Schema.is(DemoExports)(demo) ? [] : [file])),
      "Export init, update and view from each of these, as `Demo` in src/demo.ts names them.",
    ).toEqual([]);
  });

  it("shows no page for a path that names no component", () => {
    expect(screenAt("/no-such-component")).toEqual(Option.none());
  });
});
