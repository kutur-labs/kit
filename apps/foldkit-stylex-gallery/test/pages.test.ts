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

// The members `Demo` requires, which `import.meta.glob` cannot check a module against.
const DemoExports = Schema.Struct({
  summary: Schema.String,
  init: Schema.declare(Predicate.isFunction),
  update: Schema.declare(Predicate.isFunction),
  view: Schema.declare(Predicate.isFunction),
});

describe("the gallery's pages", () => {
  it("has one page per demo, each in exactly one group of src/pages.ts", () => {
    expect(
      pages.map(({ slug }) => slug).sort(),
      "Put each demo's slug in one group of `layout` in src/pages.ts.",
    ).toEqual(slugsIn("demos"));
  });

  it("finds summary, init, update and view in every demo module", () => {
    expect(
      pages.flatMap(({ slug, demo }) =>
        Schema.is(DemoExports)(demo) ? [] : [`src/demos/${slug}.ts`],
      ),
      "Export summary, init, update and view from each of these, as `Demo` in src/demo.ts names them.",
    ).toEqual([]);
  });

  it("shows no page for a path that names no component", () => {
    expect(screenAt("/no-such-component")).toEqual(Option.none());
  });
});
