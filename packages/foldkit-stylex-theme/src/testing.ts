import type { ThemePreset } from "./tokens.stylex.ts";
import type { Finding } from "@kutur-kit/foldkit-stylex/testing";

/**
 * The text fields the theme rests at a hairline on the subtle fill, for the core `audit`'s
 * `hairline` option: `audit({ hairline })`. A hover turns their edge to `color.control`, whose 3:1
 * `tokenContrast` checks. A read-only field is a well that the fill alone marks: it takes no
 * input, so it has no hover edge. Checkboxes, radios, ranges and color and file inputs are left
 * out, so an input drawn with `appearance: none` still needs a 3:1 edge.
 */
export const hairline =
  'input:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"]), textarea, select';

/**
 * The theme's color pairs in light and dark, measured in the page: text, muted and danger need
 * 4.5:1 on surface and subtle, onAccent 4.5:1 on accent, and control and accent 3:1 on surface and
 * subtle. A translucent color is measured over what it lies on: the surface over the page's
 * Canvas, the other backgrounds over the surface. A value that is no color gets a finding of its
 * own in place of its pairs. `preset` is set on `<html>` for the call, in place of the `--fks-*`
 * values there. `part` measures under that element, and reports a `derived` finding when it sets
 * surface or text but keeps the page's greys, accent or onAccent. An empty array means every pair
 * passes.
 *
 * Call it in Vitest browser mode, or send it with `page.evaluate(tokenContrast, { preset })`. It
 * throws when no same-origin stylesheet defines the theme's color tokens, or `part` matches nothing.
 */
export const tokenContrast = (
  options: Readonly<{ preset?: ThemePreset; part?: string }> = {},
): ReadonlyArray<Finding<"contrast" | "derived">> => {
  // Playwright sends this function to the page as source, so every helper lives in its body.
  const keys = [
    "surface",
    "text",
    "subtle",
    "border",
    "control",
    "muted",
    "accent",
    "onAccent",
    "danger",
  ] as const;

  type Key = (typeof keys)[number];

  type Rgb = readonly [number, number, number];

  type Rgba = readonly [number, number, number, number];

  const kebab = (key: Key) => key.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

  const camel = (name: string) =>
    name.replaceAll(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

  // The foreground of each pair, what it is for and its minimum, on each background.
  const pairs: ReadonlyArray<
    Readonly<{ foreground: Key; backgrounds: ReadonlyArray<Key>; minimum: number; need: string }>
  > = [
    { foreground: "text", backgrounds: ["surface", "subtle"], minimum: 4.5, need: "Text needs" },
    {
      foreground: "muted",
      backgrounds: ["surface", "subtle"],
      minimum: 4.5,
      need: "Secondary text needs",
    },
    {
      foreground: "danger",
      backgrounds: ["surface", "subtle"],
      minimum: 4.5,
      need: "Error text needs",
    },
    {
      foreground: "onAccent",
      backgrounds: ["accent"],
      minimum: 4.5,
      need: "Text and marks on the accent need",
    },
    {
      foreground: "control",
      backgrounds: ["surface", "subtle"],
      minimum: 3,
      need: "The edges of checkboxes, radios, switches and hovered fields need",
    },
    {
      foreground: "accent",
      backgrounds: ["surface", "subtle"],
      minimum: 3,
      need: "Checked and selected controls and the focus ring need",
    },
  ];

  // StyleX hashes the tokens' names, so each is found by its value: `var(--fks-color-<key>, …)`.
  // A cross-origin sheet throws on `cssRules`, and its rules stay hidden.
  const declared = new Map<string, Readonly<{ variable: string; value: string }>>();

  const rulesOf = (sheet: CSSStyleSheet) => {
    try {
      return Array.from(sheet.cssRules);
    } catch {
      return [];
    }
  };

  const declare = (style: CSSStyleDeclaration) => {
    for (const variable of Array.from(style)) {
      const value = style.getPropertyValue(variable).trim();
      const key = /^var\(--fks-color-([a-z-]+),/.exec(value)?.[1];

      if (key !== undefined && !declared.has(key)) declared.set(key, { variable, value });
    }
  };

  const scan = (rules: ReadonlyArray<CSSRule>): void => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) declare(rule.style);

      if (rule instanceof CSSGroupingRule) scan(Array.from(rule.cssRules));
    }
  };

  for (const sheet of [...Array.from(document.styleSheets), ...document.adoptedStyleSheets]) {
    scan(rulesOf(sheet));
  }

  const tokenOf = (key: Key) => {
    const token = declared.get(kebab(key));

    if (token === undefined) {
      throw new Error(
        "No stylesheet in this page defines the theme's color tokens. Load a themed component first, and serve its CSS from the page's origin: a cross-origin sheet hides its rules.",
      );
    }

    return token;
  };

  const tokens = new Map(keys.map((key) => [key, tokenOf(key)]));

  const root = document.documentElement;
  const part = options.part === undefined ? root : document.querySelector(options.part);

  if (part === null) throw new Error(`No element matches the part "${options.part ?? ""}".`);

  const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });

  if (canvas === null) throw new Error("tokenContrast needs a 2D canvas to read colors.");

  // The canvas converts any color syntax the browser computes, such as oklab(), to 8-bit sRGB with
  // its alpha.
  const rgbaOf = (color: string): Rgba => {
    canvas.clearRect(0, 0, 1, 1);
    canvas.fillStyle = color;
    canvas.fillRect(0, 0, 1, 1);
    const [red = 0, green = 0, blue = 0, alpha = 0] = canvas.getImageData(0, 0, 1, 1).data;

    return [red, green, blue, alpha / 255];
  };

  // `top` painted over the opaque `bottom`.
  const over = (top: Rgba, bottom: Rgb): Rgb => [
    top[0] * top[3] + bottom[0] * (1 - top[3]),
    top[1] * top[3] + bottom[1] * (1 - top[3]),
    top[2] * top[3] + bottom[2] * (1 - top[3]),
  ];

  const hex = (rgb: Rgb) =>
    `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

  // WCAG 2.2's relative luminance and contrast ratio.
  const luminance = (rgb: Rgb) => {
    const [red = 0, green = 0, blue = 0] = rgb.map((channel) => {
      const value = channel / 255;

      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  const contrast = (a: Rgb, b: Rgb) => {
    const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (lighter + 0.05) / (darker + 0.05);
  };

  // Unregistered custom properties keep light-dark() as text, so a probe's color-scheme picks the
  // scheme. forced-color-adjust: none keeps the cascade's value under forced colors. Each color
  // is measured as it shows: the surface over the page's Canvas, the other backgrounds over the
  // surface, and each foreground over its background, so translucent tokens count.
  const probe = (scheme: "light" | "dark") => {
    const box = document.createElement("div");
    box.style.cssText = `display: none; color-scheme: ${scheme}; forced-color-adjust: none`;
    part.append(box);

    const colorOf = (value: string) => {
      const span = box.appendChild(document.createElement("span"));
      span.style.color = value;

      return rgbaOf(getComputedStyle(span).color);
    };

    const page = colorOf("Canvas");

    const colors = new Map(
      keys.map((key) => [key, colorOf(`var(${tokens.get(key)?.variable ?? ""})`)]),
    );

    box.remove();

    const tokenColor = (key: Key) => colors.get(key) ?? [0, 0, 0, 0];
    const surface = over(tokenColor("surface"), [page[0], page[1], page[2]]);

    const background = (key: Key) => (key === "surface" ? surface : over(tokenColor(key), surface));

    return (foreground: Key, under: Key) => {
      const bg = background(under);

      return { fg: over(tokenColor(foreground), bg), bg };
    };
  };

  // `value` with each `var(--fks-color-<key>, …)` shortened to its key.
  const shorten = (value: string): string => {
    const found = /var\(--fks-color-([a-z-]+),/.exec(value);

    if (found === null) return value;

    let end = found.index + "var(".length;

    for (let depth = 1; depth > 0; end += 1) {
      if (value[end] === "(") depth += 1;

      if (value[end] === ")") depth -= 1;
    }

    return shorten(`${value.slice(0, found.index)}${camel(found[1] ?? "")}${value.slice(end)}`);
  };

  // A token's default as the stylesheet writes it, the others shortened to their keys:
  // `color-mix(in oklab, text 62%, surface)` for muted.
  const derivation = (key: Key) =>
    shorten((tokens.get(key)?.value ?? "").replace(/^var\([\w-]+,\s*/, "").slice(0, -1));

  // The tokens a default reads, in order, such as text and surface for muted.
  const referencesOf = (key: Key) => {
    const value = (tokens.get(key)?.value ?? "").slice(1);
    const at = (other: Key) => value.indexOf(`var(--fks-color-${kebab(other)},`);

    return keys.filter((other) => at(other) !== -1).sort((a, b) => at(a) - at(b));
  };

  const rootStyle = getComputedStyle(root);
  const partStyle = getComputedStyle(part);

  const variableAt = (style: CSSStyleDeclaration, key: Key) =>
    style.getPropertyValue(tokens.get(key)?.variable ?? "").trim();

  const partSets = (key: Key) =>
    part !== root && variableAt(partStyle, key) !== variableAt(rootStyle, key);

  // Who sets a token, or undefined when it keeps the theme's default.
  const setterOf = (key: Key) => {
    if (partSets(key)) return `${options.part ?? ""} sets ${key}`;

    const value = rootStyle.getPropertyValue(`--fks-color-${kebab(key)}`).trim();

    return value === "" ? undefined : `the page sets --fks-color-${kebab(key)} to ${value}`;
  };

  // Every token resolves its --fks-* property at :root, so one set below <html> changes nothing:
  // a part changes a token through the token itself.
  const nameOf = (key: Key) =>
    part === root ? `--fks-color-${kebab(key)}` : `color.${key} on ${options.part ?? ""}`;

  // Why a pair fails and what to change: the foreground's default, or who sets either side.
  const advice = (foreground: Key, background: Key) => {
    const references = referencesOf(foreground);

    if (setterOf(foreground) === undefined && references.length > 0) {
      const setters = references.flatMap((key) => setterOf(key) ?? []);
      const cause = setters.map((setter) => `, and ${setter}`).join("");

      return `${foreground} is ${derivation(foreground)}${cause}. Move ${references.join(" and ")} apart, or set ${nameOf(foreground)}.`;
    }

    const set = [foreground, background].filter((key) => setterOf(key) !== undefined);
    const setters = set.flatMap((key) => setterOf(key) ?? []).join(", and ");

    return set.length === 0
      ? `Set ${nameOf(foreground)} or ${nameOf(background)}.`
      : `${setters.replace(/^the /, "The ")}. Change ${set.map(nameOf).join(" or ")}.`;
  };

  // A value that is no color computes to the inherited color, which would be measured in its
  // place, so it is reported and its pairs skipped. A token that mixes it is no color either, and
  // is skipped without a finding of its own.
  const isColor = (key: Key) => CSS.supports("color", variableAt(partStyle, key));

  const unmeasured = (key: Key) => {
    const setter = setterOf(key);
    const cause = setter === undefined ? "" : `: ${setter}`;

    return {
      rule: "contrast" as const,
      at: `color.${key}`,
      message: `color.${key} is not a color, so its pairs cannot be measured${cause}. Change ${nameOf(key)} to a color.`,
    };
  };

  const measure = (): ReadonlyArray<Finding<"contrast" | "derived">> => {
    const invalid = keys.filter((key) => !isColor(key));
    const isInvalid = (key: Key) => invalid.includes(key);

    const invalids = invalid.flatMap((key) =>
      referencesOf(key).every(isColor) ? [unmeasured(key)] : [],
    );

    const schemes = [
      ["light", probe("light")],
      ["dark", probe("dark")],
    ] as const;

    const contrasts = pairs.flatMap(({ foreground, backgrounds, minimum, need }) =>
      backgrounds.flatMap((background) =>
        schemes.flatMap(([scheme, pairOf]) => {
          // Every background lies on the surface.
          if (isInvalid(foreground) || isInvalid(background) || isInvalid("surface")) return [];

          const { fg, bg } = pairOf(foreground, background);
          const ratio = contrast(fg, bg);

          if (ratio >= minimum) return [];

          const criterion = minimum === 3 ? "1.4.11" : "1.4.3";

          return [
            {
              rule: "contrast" as const,
              at: `color.${foreground} on color.${background}`,
              message: `color.${foreground} on color.${background}: ${(Math.floor(ratio * 100) / 100).toFixed(2)}:1 in ${scheme} (${hex(fg)} on ${hex(bg)}). ${need} ${minimum}:1 (WCAG ${criterion}). ${advice(foreground, background)}`,
            },
          ];
        }),
      ),
    );

    // The tokens that default to surface or text resolved at :root, so a part that sets surface or
    // text keeps the page's greys, accent and onAccent unless it sets them too.
    const roots = (["surface", "text"] as const).filter(partSets);

    const kept = (["subtle", "border", "control", "muted", "accent", "onAccent"] as const).filter(
      (key) => !partSets(key),
    );

    const derived =
      roots.length === 0 || kept.length === 0
        ? []
        : [
            {
              rule: "derived" as const,
              at: options.part ?? "",
              message: `${options.part ?? ""} sets ${roots.map((key) => `color.${key}`).join(" and ")} but keeps the page's ${kept.map((key) => `color.${key}`).join(", ")}: they resolved at :root, from the page's surface and text unless it sets them, so they may not match the part or reach their contrast (WCAG 1.4.3). Set them on the part too.`,
            },
          ];

    return [...derived, ...invalids, ...contrasts];
  };

  if (options.preset === undefined) return measure();

  const { style } = root;
  const saved = root.getAttribute("style");

  try {
    for (const name of Array.from(style)) {
      if (name.startsWith("--fks-")) style.removeProperty(name);
    }

    for (const [name, value] of Object.entries(options.preset)) {
      if (value !== undefined) style.setProperty(name, value);
    }

    return measure();
  } finally {
    if (saved === null) root.removeAttribute("style");
    else root.setAttribute("style", saved);
  }
};
