// Every component the core styles gets a namespace: src/<component>.ts exporting <Component>, with
// its view themed and `restyle`. The core's barrel is read as text because importing it runs its
// compile guard.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as Ui from "@foldkit/ui";
import { Predicate, Schema } from "effect";
import { describe, expect, it } from "vitest";

const src = path.join(import.meta.dirname, "../src");

const barrel = readFileSync(
  fileURLToPath(import.meta.resolve("@kutur-kit/foldkit-stylex")),
  "utf8",
);

const components = [
  ...barrel.matchAll(/^export \* as (\w+)Style from "\.\/([\w-]+)-style\.ts";$/gm),
].map(([, name = "", file = ""]) => ({ name, file: `${file}.ts` }));

const present = components.filter(({ file }) => existsSync(path.join(src, file)));

// Each module in src, imported while this file loads. Importing a namespace compiles it with
// StyleX, as an app's build does, and the first import compiles the core and @foldkit/ui too, which
// can outlast a test's timeout on a busy runner.
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

// A module that exports only namespaces, such as @foldkit/ui's barrel or src/listbox.ts.
const decodeNamespaces = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Unknown)),
);

const readme = readFileSync(path.join(src, "../README.md"), "utf8");

// The README's components table: Component | Module | Namespace | Helpers, each helper in backticks.
const rows = [
  ...readme.matchAll(
    /^\| (\w+) +\| `@kutur-kit\/foldkit-stylex-theme\/([\w-]+)` +\| `(\w+)` +\|(.*)\|$/gm,
  ),
].map(([, name = "", file = "", namespace = "", helpers = ""]) => ({
  name,
  file: `${file}.ts`,
  namespace,
  helpers: [...helpers.matchAll(/`(\w+)`/g)].map(([, helper = ""]) => helper),
}));

// The README's rule for the member each `restyle` returns: the namespaces it names return `create`,
// Toast `make`, DragAndDrop `draggable` and the rest `view`.
const [, creators = "", maker = "", dragger = ""] =
  /`create` for the components built with `create\(\)` \(([^)]*)\), `make` for (\w+), `draggable` for (\w+) and `view` for the rest\./.exec(
    readme,
  ) ?? [];

const memberOf = (namespace: string) =>
  creators.match(/\b[A-Z]\w*/g)?.includes(namespace)
    ? "create"
    : ({ [maker]: "make", [dragger]: "draggable" }[namespace] ?? "view");

const decodeRecord = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown));

// Each `restyle` takes only its layers, as rest parameters, so it can be called with none, and
// returns an object of the members it themes.
const isRestyle = (input: unknown): input is () => object => Predicate.isFunction(input);

const decodeRestyle = Schema.decodeUnknownSync(
  Schema.Struct({ restyle: Schema.declare(isRestyle) }),
);

// Each namespace and Multi variant with the keys its `restyle()` returns. Multi variants are looked
// up as "Multi", the name the README gives them.
const restyled = rows.flatMap(({ file, namespace }) => {
  const exported = decodeNamespaces(modules.get(file))[namespace] ?? {};

  const multi =
    exported["Multi"] === undefined ? [] : [["Multi", decodeRecord(exported["Multi"])] as const];

  return [[namespace, exported] as const, ...multi].map(([name, members]) => ({
    label: name === "Multi" ? `${namespace}.Multi` : namespace,
    member: memberOf(name),
    keys: Object.keys(decodeRestyle(members).restyle()),
  }));
});

describe("coverage", () => {
  it("reads the core's components", () => {
    expect(components.map(({ file }) => file)).toContain("checkbox.ts");
  });

  it("has a namespace for every component of the core", () => {
    const missing = components.flatMap(({ name, file }) =>
      present.some((component) => component.file === file) ? [] : [`src/${file} exporting ${name}`],
    );

    expect(missing, "Add each namespace listed below, one module per component.").toEqual([]);
  });

  it("has no namespace for a component the core does not export", () => {
    const namespaces = readdirSync(src).filter(
      (file) => file.endsWith(".ts") && !["tokens.stylex.ts", "testing.ts"].includes(file),
    );

    expect(namespaces.filter((file) => !components.some((c) => c.file === file))).toEqual([]);
  });

  it("lists every component in the README, in the core's order", () => {
    expect(rows.map(({ name, file, namespace }) => ({ name, file, namespace }))).toEqual(
      components.map(({ name, file }) => ({ name, file, namespace: name })),
    );
  });

  it.each(
    rows.flatMap(({ file, namespace, helpers }) =>
      helpers.map((helper) => ({ file, namespace, helper })),
    ),
  )("exports the README's $helper on $namespace from src/$file", ({ file, namespace, helper }) => {
    expect(
      modules.get(file),
      `Export ${helper} from the ${namespace} namespace, or fix the README's row.`,
    ).toHaveProperty([namespace, helper]);
  });

  // A helper is what the namespace adds to @foldkit/ui's module, other than restyle and the Multi
  // variants, which have their own section.
  it.each(rows)(
    "lists every helper $namespace exports in the README",
    ({ file, namespace, helpers }) => {
      const exported = Object.keys(decodeNamespaces(modules.get(file))[namespace] ?? {});
      const core = Object.keys(decodeNamespaces(Ui)[namespace] ?? {});

      const unlisted = exported.filter(
        (key) =>
          !core.includes(key) && !["restyle", "Multi"].includes(key) && !helpers.includes(key),
      );

      expect(unlisted, `Add each to the README's ${namespace} row.`).toEqual([]);
    },
  );

  it("reads the README's restyle rule", () => {
    expect([creators, maker, dragger]).not.toContain("");
  });

  it.each(restyled)(
    "restyle on $label returns $member, as the README says",
    ({ label, member, keys }) => {
      expect(keys, `Fix the README's restyle rule for ${label}.`).toEqual([member]);
    },
  );

  it.each(present)("$file compiles and exports $name with restyle", ({ file, name }) => {
    expect(modules.get(file), `Export ${name} with restyle from src/${file}.`).toHaveProperty([
      name,
      "restyle",
    ]);
  });
});
