// A README code block marked `<!-- demo: src/demos/x.ts -->` shows that file of the gallery
// verbatim, so the code users copy is code the gallery builds, renders and tests. Its install
// lines give each peer the range kit tests, so apps with strict peers can copy them too.
import { globSync, readFileSync } from "node:fs";

import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { readCatalogs } from "./catalogs.ts";

const gallery = new URL("../", import.meta.url);

const packages = new URL("../../../packages/", import.meta.url);

const readmes = globSync("foldkit-stylex*/README.md", { cwd: packages }).sort();

// The marker, blank lines, then the block it names.
const marked = /<!-- demo: (?<path>\S+) -->\n+```ts\n(?<code>[\s\S]*?)```/g;

const blocksIn = (readme: string) =>
  Array.from(readFileSync(new URL(readme, packages), "utf8").matchAll(marked), ({ groups }) => ({
    path: groups?.["path"] ?? "",
    code: groups?.["code"] ?? "",
  }));

const Manifest = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.String,
    peerDependencies: Schema.Record(Schema.String, Schema.String),
  }),
);

const manifestOf = (directory: URL) =>
  Schema.decodeSync(Manifest)(readFileSync(new URL("package.json", directory), "utf8"));

// The packages these READMEs install, and @stylexjs/unplugin, whose peer unplugin they install.
const kit = ["foldkit-stylex/", "foldkit-stylex-theme/", "oxc/"].map((name) =>
  manifestOf(new URL(name, packages)),
);

const unplugin = manifestOf(new URL("node_modules/@stylexjs/unplugin/", gallery));

const { peers } = readCatalogs();

// What an install line names for a package: alpha, the tag kit's prereleases move, for kit's
// packages; kit's range for their peers; @stylexjs/unplugin's range for unplugin.
const rangeOf = (name: string) => {
  if (kit.some((manifest) => manifest.name === name)) return "alpha";

  if (name === "unplugin") return unplugin.peerDependencies["unplugin"];

  return kit.some(({ peerDependencies }) => name in peerDependencies) ? peers[name] : undefined;
};

// Each package a `pnpm add` line of a ```sh block adds, with the tag or range it names.
const installsIn = (readme: string) =>
  Array.from(readFileSync(new URL(readme, packages), "utf8").matchAll(/^```sh\n([\s\S]*?)^```/gm))
    .flatMap(([, block = ""]) => block.split("\n"))
    .filter((line) => line.startsWith("pnpm add "))
    .flatMap((line) => line.slice("pnpm add ".length).match(/'[^']*'|"[^"]*"|\S+/g) ?? [])
    .filter((word) => !word.startsWith("-"))
    .map((word) => {
      const spec = word.replaceAll(/^['"]|['"]$/g, "");
      const [, name = spec, range] = /^(@?[^@]+)@(.+)$/.exec(spec) ?? [];

      return { spec, name, range };
    });

describe.each(readmes)("packages/%s", (readme) => {
  it("follows every demo marker with a ts block", () => {
    const markers = readFileSync(new URL(readme, packages), "utf8").match(/<!-- demo:/g) ?? [];

    expect(blocksIn(readme)).toHaveLength(markers.length);
  });

  it.each(installsIn(readme))("installs $spec with the range kit tests", ({ name, range }) => {
    const expected = rangeOf(name);

    expect(
      expected,
      `${name} is no peer of the core, the theme or @kutur-kit/oxc. Install lines add only those, with their ranges.`,
    ).toBeDefined();
    expect(
      range,
      `Write '${name}@${expected}'. Without it pnpm installs the latest release, which strict peers reject outside ${expected}.`,
    ).toBe(expected);
  });

  it.each(blocksIn(readme))("shows $path verbatim", ({ path, code }) => {
    expect(path, "A demo marker names a file under the gallery's src/.").toMatch(
      /^src\/[a-z/-]+\.ts$/,
    );
    expect(
      code,
      `Copy apps/foldkit-stylex-gallery/${path} into the block after its marker, or change the demo and copy it back.`,
    ).toBe(readFileSync(new URL(path, gallery), "utf8"));
  });
});
