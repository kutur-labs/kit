// Every component the core styles gets a look: src/<component>.ts exporting <component>Theme. The
// core's barrel is read as text because importing it runs its compile guard.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const src = path.join(import.meta.dirname, "../src");

const barrel = readFileSync(
  fileURLToPath(import.meta.resolve("@kutur-kit/foldkit-stylex")),
  "utf8",
);

const components = [
  ...barrel.matchAll(/^export \* as (\w+)Style from "\.\/([\w-]+)-style\.ts";$/gm),
].map(([, name = "", file = ""]) => ({
  name,
  file: `${file}.ts`,
  look: `${name.charAt(0).toLowerCase()}${name.slice(1)}Theme`,
}));

const present = components.filter(({ file }) => existsSync(path.join(src, file)));

describe("coverage", () => {
  it("reads the core's components", () => {
    expect(components.map(({ file }) => file)).toContain("checkbox.ts");
  });

  it("has a look for every component of the core", () => {
    const missing = components.flatMap(({ file, look }) =>
      present.some((component) => component.file === file) ? [] : [`src/${file} exporting ${look}`],
    );

    expect(missing, "Add each look listed below, one file per component.").toEqual([]);
  });

  it("has no look for a component the core does not export", () => {
    const looks = readdirSync(src).filter(
      (file) => file.endsWith(".ts") && file !== "tokens.stylex.ts",
    );

    expect(looks.filter((file) => !components.some((c) => c.file === file))).toEqual([]);
  });

  it("lists every look in the README, in the core's order", () => {
    const readme = readFileSync(path.join(src, "../README.md"), "utf8");

    const rows = [
      ...readme.matchAll(
        /^\| (\w+) +\| `@kutur-kit\/foldkit-stylex-theme\/([\w-]+)` +\| `(\w+)` +\|/gm,
      ),
    ].map(([, name, file, look]) => ({ name, file: `${file}.ts`, look }));

    expect(rows).toEqual(components);
  });

  // Importing a look compiles it with StyleX, as an app's build does.
  it.each(present)("$file compiles and exports $look", async ({ file, look }) => {
    await expect(
      import(path.join(src, file)),
      `Export ${look} from src/${file}.`,
    ).resolves.toHaveProperty(look);
  });
});
