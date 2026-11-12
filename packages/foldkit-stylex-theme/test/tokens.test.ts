// Reads src/tokens.stylex.ts as text: compiled, its tokens are hashed names without their defaults.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..");

const source = readFileSync(path.join(root, "src/tokens.stylex.ts"), "utf8");

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

// The module's string consts, such as the surface and text roots that template literals read.
const consts = new Map(
  [...source.matchAll(/^const (\w+) = "(.+)";$/gm)].map(([, name = "", value = ""]) => [
    name,
    value,
  ]),
);

const customProperty = (value: string) => /^var\((--fks-[\w-]+), (.+)\)$/.exec(value);

// A template literal's `${name}` read as the const's value, or as `short` gives it.
const substituted = (value: string, short: (value: string) => string) =>
  value.replaceAll(/\$\{(\w+)\}/g, (_, name: string) => short(consts.get(name) ?? ""));

// Each token as `group.key`, the custom property it reads, its default as written, and its default
// with every const in place. A key alone, such as `surface,`, takes the const of its name.
const groupPattern = /export const (\w+) = stylex\.defineVars\(\{([\s\S]*?)\n\}/g;

const tokens = [...source.matchAll(groupPattern)].flatMap(([, group = "", body = ""]) =>
  [...body.matchAll(/^ {2}(\w+)(?:,$|:\s*(?:\{\s*default:\s*)?(["`])(.+?)\2)/gm)].map(
    ([, key = "", , literal]) => {
      const [, name = "", fallback = ""] = customProperty(literal ?? consts.get(key) ?? "") ?? [];

      return {
        token: `${group}.${key}`,
        group,
        key,
        name,
        fallback,
        value: substituted(fallback, (value) => value),
      };
    },
  ),
);

describe("tokens", () => {
  // A token that varies by condition, such as size.control under a coarse pointer, reads its own
  // property in each, so one override sets them all. A key alone, such as `surface,`, reads its
  // const's.
  it("reads its own --fks-* property in each condition, and no other", () => {
    const entries = [...source.matchAll(groupPattern)].flatMap(([, group = "", body = ""]) =>
      body
        .split(/^ {2}(?=\w)/m)
        .slice(1)
        .map((entry) => {
          const key = /^\w+/.exec(entry)?.[0] ?? "";
          const read = `${consts.get(key) === undefined ? "" : `"${consts.get(key) ?? ""}"`}${entry}`;

          return {
            token: `${group}.${key}`,
            names: [...read.matchAll(/["`]var\((--fks-[\w-]+),/g)].map(([, name]) => name),
          };
        }),
    );

    expect(tokens.length).toBeGreaterThan(0);
    expect(entries.map(({ token }) => token)).toEqual(tokens.map(({ token }) => token));
    expect(entries.flatMap(({ names }) => names)).toHaveLength(
      source.match(/["`]var\(--fks-/g)?.length ?? 0,
    );
    expect(
      entries.filter(({ token, names }) =>
        names.some((name) => name !== tokens.find((entry) => entry.token === token)?.name),
      ),
    ).toEqual([]);
  });

  it("lets ThemeOverrides name the properties of every group", () => {
    const listed = /type Groups =([^;]+);/.exec(source)?.[1] ?? "";

    expect([...listed.matchAll(/typeof (\w+)/g)].map(([, group]) => group)).toEqual([
      ...new Set(tokens.map(({ group }) => group)),
    ]);
  });

  // Each value starts `var(--fks-<group>-<key>, `, the shape tokenContrast finds the colors by in a
  // page's CSS, where StyleX has hashed the tokens' own names.
  it("names each property --fks-<group>-<key>, in kebab-case", () => {
    expect(
      tokens.filter(({ group, key, name }) => name !== `--fks-${kebab(group)}-${kebab(key)}`),
    ).toEqual([]);
  });

  it("follows color-scheme with every color", () => {
    expect(
      tokens.filter(({ group, value }) => group === "color" && !value.includes("light-dark(")),
    ).toEqual([]);
  });

  // The README writes a const as its custom property alone: `var(--fks-color-text)`.
  it("lists every token in the README, in source order", () => {
    const readme = readFileSync(path.join(root, "README.md"), "utf8");

    const section = readme.split(/^## /m).find((part) => part.startsWith("Tokens")) ?? "";

    const rows = [...section.matchAll(/^\| `([\w.]+)` +\| `(--fks-[\w-]+)` +\| `(.+?)` +\|/gm)].map(
      ([, token, name, value]) => ({ token, name, value }),
    );

    expect(rows).toEqual(
      tokens.map(({ token, name, fallback }) => ({
        token,
        name,
        value: substituted(fallback, (value) => `var(${customProperty(value)?.[1] ?? ""})`),
      })),
    );
  });
});
