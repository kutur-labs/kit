// A README code block marked `<!-- demo: src/demos/x.ts -->` shows that file of the gallery
// verbatim, so the code users copy is code the gallery builds, renders and tests.
import { globSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

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

describe.each(readmes)("packages/%s", (readme) => {
  it("follows every demo marker with a ts block", () => {
    const markers = readFileSync(new URL(readme, packages), "utf8").match(/<!-- demo:/g) ?? [];

    expect(blocksIn(readme)).toHaveLength(markers.length);
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
