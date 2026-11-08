// Reads src/tokens.stylex.ts as text: compiled, its tokens are hashed names without their defaults.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..");

const source = readFileSync(path.join(root, "src/tokens.stylex.ts"), "utf8");

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

// Each token as `group.key`, the custom property it reads and its default.
const tokens = [
  ...source.matchAll(/export const (\w+) = stylex\.defineVars\(\{([\s\S]*?)\n\}/g),
].flatMap(([, group = "", body = ""]) =>
  [...body.matchAll(/(\w+):\s*(?:\{\s*default:\s*)?"var\((--fks-[\w-]+), (.+?)\)"/g)].map(
    ([, key = "", name = "", value = ""]) => ({
      token: `${group}.${key}`,
      group,
      key,
      name,
      value,
    }),
  ),
);

describe("tokens", () => {
  it("reads every --fks-* property that the source names", () => {
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.length).toBe(source.match(/"var\(--fks-/g)?.length);
  });

  it("lets ThemeOverrides name the properties of every group", () => {
    const listed = /type Groups =([^;]+);/.exec(source)?.[1] ?? "";

    expect([...listed.matchAll(/typeof (\w+)/g)].map(([, group]) => group)).toEqual([
      ...new Set(tokens.map(({ group }) => group)),
    ]);
  });

  it("names each property --fks-<group>-<key>, in kebab-case", () => {
    expect(
      tokens.filter(({ group, key, name }) => name !== `--fks-${kebab(group)}-${kebab(key)}`),
    ).toEqual([]);
  });

  it("follows color-scheme with every color", () => {
    expect(
      tokens.filter(({ group, value }) => group === "color" && !value.startsWith("light-dark(")),
    ).toEqual([]);
  });

  it("lists every token in the README, in source order", () => {
    const readme = readFileSync(path.join(root, "README.md"), "utf8");

    const section = readme.split(/^## /m).find((part) => part.startsWith("Tokens")) ?? "";

    const rows = [...section.matchAll(/^\| `([\w.]+)` +\| `(--fks-[\w-]+)` +\| `(.+?)` +\|/gm)].map(
      ([, token, name, value]) => ({ token, name, value }),
    );

    expect(rows).toEqual(tokens.map(({ token, name, value }) => ({ token, name, value })));
  });
});

// WCAG 2.2 relative luminance and contrast ratio of two #rrggbb colors.
const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (lighter + 0.05) / (darker + 0.05);
};

const schemes = Object.fromEntries(
  tokens.flatMap(({ group, key, value }) => {
    const pair = /^light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)$/.exec(value);

    return group === "color" && pair !== null ? [[key, { light: pair[1], dark: pair[2] }]] : [];
  }),
);

// 4.5:1 for text (WCAG 1.4.3); 3:1 for a control's edge, a filled control and the focus ring
// (WCAG 1.4.11).
const pairs = [
  { foreground: "text", background: "surface", minimum: 4.5 },
  { foreground: "text", background: "hover", minimum: 4.5 },
  { foreground: "muted", background: "surface", minimum: 4.5 },
  { foreground: "muted", background: "hover", minimum: 4.5 },
  { foreground: "danger", background: "surface", minimum: 4.5 },
  { foreground: "onAccent", background: "accent", minimum: 4.5 },
  { foreground: "control", background: "surface", minimum: 3 },
  { foreground: "accent", background: "surface", minimum: 3 },
  { foreground: "focus", background: "surface", minimum: 3 },
].flatMap((pair) => (["light", "dark"] as const).map((scheme) => ({ ...pair, scheme })));

describe("contrast of the default colors", () => {
  it.each(pairs)(
    "$foreground on $background, $scheme: at least $minimum:1",
    ({ foreground, background, minimum, scheme }) => {
      const fg = schemes[foreground]?.[scheme];
      const bg = schemes[background]?.[scheme];

      expect(fg, `color.${foreground} needs a light-dark() of two #rrggbb colors.`).toBeDefined();
      expect(bg, `color.${background} needs a light-dark() of two #rrggbb colors.`).toBeDefined();
      expect(contrast(fg ?? "", bg ?? "")).toBeGreaterThanOrEqual(minimum);
    },
  );
});
