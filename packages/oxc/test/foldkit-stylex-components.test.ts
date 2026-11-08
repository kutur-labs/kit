import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { components, viewOf } from "../src/foldkit-stylex/components.ts";

// Read as text: the core's barrel throws in plain Node, where StyleX has not compiled it.
const index = new URL(import.meta.resolve("@kutur-kit/foldkit-stylex"));

const namespaces = Array.from(
  readFileSync(index, "utf8").matchAll(/^export \* as (\w+)Style from "(.+)";$/gm),
  ([, name = "", path = ""]) => ({ name, module: readFileSync(new URL(path, index), "utf8") }),
);

await test("foldkit-stylex-unstyled-view knows every namespace the core exports", () => {
  assert.deepEqual(
    [...components].sort(),
    namespaces.map(({ name }) => name).sort(),
    `Compare src/foldkit-stylex/components.ts with ${fileURLToPath(index)}.`,
  );
});

await test("each core namespace wraps the view the rule names", () => {
  for (const { name, module } of namespaces) {
    assert.match(module, new RegExp(`^export const ${viewOf(name)} =`, "m"), `${name}Style`);
  }
});
