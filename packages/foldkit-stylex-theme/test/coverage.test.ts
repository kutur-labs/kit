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

// Each module in src, imported while this file loads. Importing a look compiles it with StyleX, as
// an app's build does, and the first import compiles the core and @foldkit/ui too, which can
// outlast a test's timeout on a busy runner.
const modules = new Map(
  await Promise.all(
    readdirSync(src)
      .filter((file) => file.endsWith(".ts"))
      .map(async (file): Promise<readonly [string, unknown]> => [
        file,
        await import(path.join(src, file)),
      ]),
  ),
);

const readme = readFileSync(path.join(src, "../README.md"), "utf8");

const rows = [
  ...readme.matchAll(
    /^\| (\w+) +\| `@kutur-kit\/foldkit-stylex-theme\/([\w-]+)` +\| `(\w+)` +\|(.*)\|$/gm,
  ),
].map(([, name = "", file = "", look = "", children = ""]) => ({
  name,
  file: `${file}.ts`,
  look,
  children,
}));

type ChildStyles = { file: string; name: string; keys: Array<string> };

// The named styles a row's last cell lists: "`export`: `key`, `key` where", with later keys of the
// same export after a "; ", or "`export` from `@kutur-kit/foldkit-stylex-theme/<module>`" for an
// export of another module.
const childStylesIn = ({ file, children }: (typeof rows)[number]) => {
  const named: Array<ChildStyles> = [];

  for (const [, name = "", colon, module] of children.matchAll(
    /`(\w+)`(:)?(?: from `@kutur-kit\/foldkit-stylex-theme\/([\w-]+)`)?/g,
  )) {
    const exported = colon !== undefined || module !== undefined;
    const current = named.at(-1);

    if (exported) {
      named.push({ file: module === undefined ? file : `${module}.ts`, name, keys: [] });
    } else if (current === undefined) {
      throw new Error(`The ${file} row names \`${name}\` before the export it belongs to.`);
    } else {
      current.keys.push(name);
    }
  }

  return named;
};

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
    expect(rows.map(({ name, file, look }) => ({ name, file, look }))).toEqual(components);
  });

  // A user imports each named style from the module its row names, or the one after "from".
  it.each(rows.flatMap(childStylesIn))(
    "exports the README's $name with its keys from src/$file",
    ({ file, name, keys }) => {
      const module = modules.get(file);

      expect(
        module,
        `Export ${name} from src/${file}, or name its module in the README.`,
      ).toHaveProperty(name);

      for (const key of keys) {
        expect(module, `Give ${name} the key ${key}, or fix the README's row.`).toHaveProperty([
          name,
          key,
        ]);
      }
    },
  );

  it.each(present)("$file compiles and exports $look", ({ file, look }) => {
    expect(modules.get(file), `Export ${look} from src/${file}.`).toHaveProperty(look);
  });
});
