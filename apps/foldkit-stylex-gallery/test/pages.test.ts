import { readdirSync } from "node:fs";

// Every page renders in test:browser; these are the checks that need no build.
import { Option } from "effect";
import { describe, expect, it } from "vitest";

import { screenAt } from "../src/main.ts";
import { pages } from "../src/pages.ts";

const slugsIn = (directory: string) =>
  readdirSync(new URL(`../src/${directory}/`, import.meta.url))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => file.slice(0, -".ts".length))
    .sort();

describe("the gallery's pages", () => {
  it("has one page per core demo, showing the themed demo of the same name", () => {
    expect(pages.map(({ slug }) => slug)).toEqual(slugsIn("demos"));
    expect(pages.filter(({ themed }) => Option.isSome(themed)).map(({ slug }) => slug)).toEqual(
      slugsIn("themed"),
    );
  });

  it("shows no page for a path that names no component", () => {
    expect(screenAt("/no-such-component")).toEqual(Option.none());
  });
});
