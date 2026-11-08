import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import plugin from "../src/plugin.ts";

type Case = Readonly<{
  file: string;
  code: string;
  // `<rule>/<messageId>` for kit rules, `stylex/<rule>` for StyleX's.
  errors: ReadonlyArray<string>;
  // Text the file's messages must contain, for messages that name the fix.
  messages?: ReadonlyArray<string>;
}>;

const preamble = `import type { HtmlBuilder } from "foldkit/html";
import * as stylex from "@stylexjs/stylex";
`;

const cases: ReadonlyArray<Case> = [
  {
    file: "ui-bundle-bad.ts",
    code: `${preamble}import { Popover, Tabs } from "@foldkit/ui";
import { PopoverStyle, TabsStyle, sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ wide: { inlineSize: 320 }, ring: { outlineWidth: 2 } });

export const popoverView = PopoverStyle.view(Popover.view);
export const tabsView = TabsStyle.view(Tabs.view);

export const popoverInputs = (h: HtmlBuilder<never>) => ({
  toView: ({ wrapper, button, panel }: never) =>
    h.div([...wrapper, h.Style({ inset: "0" })], [
      h.button([...button, h.Class("ring")], []),
      h.div([...panel, sx(styles.wide)], []),
    ]),
});

export const tabsInputs = (h: HtmlBuilder<never>) => ({
  toView: ({ tabs }: never) => tabs.map((tab: never) => h.button([...tab.tab, sx(styles.ring)], [])),
});
`,
    errors: [
      "foldkit-stylex-attributes/uiBundle",
      "foldkit-stylex-attributes/uiBundle",
      "foldkit-stylex-attributes/uiBundle",
      "foldkit-stylex-attributes/uiBundle",
    ],
  },
  {
    file: "ui-bundle-good.ts",
    code: `${preamble}import { Popover } from "@foldkit/ui";
import { PopoverStyle, sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ wide: { inlineSize: 320 }, ring: { outlineWidth: 2 }, text: { color: "red" } });

export const popoverView = PopoverStyle.view(Popover.view, { button: styles.ring, panel: styles.wide });

export const popoverInputs = (h: HtmlBuilder<never>) => ({
  toView: ({ wrapper, button, panel }: never) =>
    h.div([...wrapper], [h.button([...button], []), h.div([...panel], [h.p([sx(styles.text)], [])])]),
});
`,
    errors: [],
  },
  {
    file: "one-call-bad.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ a: { color: "red" }, b: { color: "blue" } });

export const own = (h: HtmlBuilder<never>) => h.div([sx(styles.a), sx(styles.b)], []);
export const tailwind = (h: HtmlBuilder<never>) => h.div([h.Class("p-4"), h.Class("m-2")], []);
`,
    errors: ["foldkit-stylex-attributes/oneCall", "foldkit-stylex-attributes/oneCall"],
  },
  {
    file: "one-call-good.ts",
    code: `${preamble}import { sx as styled } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ a: { color: "red" }, b: { color: "blue" } });

// A local function named sx is not the kit's.
const sx = (name: string) => name;

export const own = (isB: boolean, h: HtmlBuilder<never>) =>
  h.div([styled(styles.a, isB && styles.b)], [sx("a"), sx("b")]);
`,
    errors: [],
  },
  {
    file: "last-bad.ts",
    code: `${preamble}import * as Kit from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ a: { color: "red" } });

export const own = (h: HtmlBuilder<never>, extra: ReadonlyArray<never>) =>
  h.div([Kit.sx(styles.a), ...extra], []);
`,
    errors: ["foldkit-stylex-attributes/last"],
  },
  {
    file: "last-good.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ a: { color: "red" } });

export const own = (h: HtmlBuilder<never>, extra: ReadonlyArray<never>) =>
  h.div([...extra, sx(styles.a)], []);
// A Tailwind class on the app's own element is not this preset's business.
export const tailwind = (h: HtmlBuilder<never>, extra: ReadonlyArray<never>) =>
  h.div([h.Class("p-4"), ...extra], []);
`,
    errors: [],
  },
  {
    file: "raw-attribute-bad.ts",
    code: `${preamble}
export const own = (h: HtmlBuilder<never>) =>
  h.div([h.Attribute("class", "card"), h.Attribute("style", "color: red")], []);
`,
    errors: ["foldkit-stylex-attributes/rawAttribute", "foldkit-stylex-attributes/rawAttribute"],
  },
  {
    file: "raw-attribute-good.ts",
    code: `${preamble}
export const own = (h: HtmlBuilder<never>) => h.div([h.Attribute("aria-label", "Card")], []);
`,
    errors: [],
  },
  {
    file: "stylex-runtime-bad.ts",
    code: `${preamble}
const styles = stylex.create({ a: { color: "red" }, b: { color: "blue" } });

export const props = stylex.props(styles.a);
export const attrs = stylex.attrs(styles.b);
`,
    errors: ["foldkit-stylex-attributes/stylexRuntime", "foldkit-stylex-attributes/stylexRuntime"],
  },
  {
    file: "stylex-runtime-good.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ a: { color: "red" } });
const component = { props: () => ({}) };

// A compile guard: the result is thrown away, so it reaches no element.
stylex.props(styles.a);

export const own = (h: HtmlBuilder<never>) => h.div([sx(styles.a)], [component.props()]);
`,
    errors: [],
  },
  {
    file: "not-in-element-bad.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ open: { opacity: 1 }, closed: { opacity: 0 } });

const shared = sx(styles.open);

export const own = (isOpen: boolean, h: HtmlBuilder<never>) =>
  h.div([isOpen ? sx(styles.open) : sx(styles.closed)], [h.span([shared], [])]);
`,
    errors: [
      "foldkit-stylex-attributes/notInElement",
      "foldkit-stylex-attributes/notInElement",
      "foldkit-stylex-attributes/notInElement",
    ],
  },
  {
    file: "not-in-element-good.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ open: { opacity: 1 }, closed: { opacity: 0 } });

export const own = (isOpen: boolean, h: HtmlBuilder<never>) =>
  h.div([sx(isOpen ? styles.open : styles.closed)], []);
`,
    errors: [],
  },
  {
    file: "unstyled-view-bad.ts",
    code: `import * as Ui from "@foldkit/ui";
import { DragAndDrop, Listbox, Popover, VirtualList } from "@foldkit/ui";
import * as Tooltip from "@foldkit/ui/tooltip";

const Languages = Listbox.create<"pl" | "en">();
export const Many = Listbox.Multi.create<"pl" | "en">();

export const virtualList = VirtualList.view<string>();

export const views = [
  Popover.view,
  Languages.view,
  Many.view,
  Ui.Dialog.view,
  Tooltip.view,
  DragAndDrop.draggable,
];
`,
    errors: Array.from({ length: 7 }, () => "foldkit-stylex-unstyled-view/wrap"),
    messages: [
      "Wrap Many.view once at module scope with ListboxStyle.Multi.view(Many.view, styles)",
      "with DragAndDropStyle.draggable(DragAndDrop.draggable, styles)",
    ],
  },
  {
    file: "unstyled-view-good.ts",
    code: `import { DragAndDrop, Listbox, Popover, VirtualList } from "@foldkit/ui";
import {
  DragAndDropStyle,
  ListboxStyle,
  PopoverStyle,
  VirtualListStyle,
} from "@kutur-kit/foldkit-stylex";

const Languages = Listbox.create<"pl" | "en">();
const Many = Listbox.Multi.create<"pl" | "en">();
const page = { view: () => undefined };

export const popoverView = PopoverStyle.view(Popover.view);
export const languagesView = ListboxStyle.view(Languages.view);
export const manyView = ListboxStyle.Multi.view(Many.view);
export const draggable = DragAndDropStyle.draggable(DragAndDrop.draggable, {});
export const virtualList = VirtualListStyle.view(VirtualList.view<string>(), {});
export const pageView = page.view;
`,
    errors: [],
  },
  {
    file: "vite-bad.ts",
    code: `import stylex from "@stylexjs/unplugin/vite";
import unplugin from "@stylexjs/unplugin";

export const plugins = [stylex({}), unplugin];
`,
    errors: ["foldkit-stylex-vite/helper", "foldkit-stylex-vite/helper"],
  },
  {
    file: "vite-good.ts",
    code: `import type { UserOptions } from "@stylexjs/unplugin";

import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";

export const options: Partial<UserOptions> = {};
export const plugins = foldkitStylex();
`,
    errors: [],
  },
  {
    file: "state-attribute-bad.ts",
    code: `${preamble}
export const styles = stylex.create({
  box: { backgroundColor: { default: "white", ":is([data-checked])": "black" } },
  button: { opacity: { default: 1, ":disabled": 0.5 } },
  link: { fontWeight: { default: 400, ':is([aria-current="page"])': 700 } },
  panel: { opacity: { default: 1, ":is([data-closed])": 0 } },
  menu: { display: { default: "none", "[data-open]": "block" } },
});
`,
    errors: Array.from({ length: 5 }, () => "foldkit-stylex-condition-key/stateAttribute"),
  },
  {
    file: "state-attribute-good.ts",
    code: `import { Toast as Ui } from "@foldkit/ui";
import { ToastStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";

const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

const styles = stylex.create({
  // Every entry shares one class, so its animation keys on @foldkit/ui's data-closed.
  entry: { opacity: { default: 1, ":is([data-closed])": 0 }, transitionProperty: "opacity" },
  button: { outlineWidth: { default: 0, ":focus-visible": 2 } },
});

export const toastView = ToastStyle.view(Toast.view, { entry: styles.entry, dismiss: styles.button });
`,
    errors: [],
  },
  {
    file: "bare-attribute-bad.ts",
    code: `${preamble}
export const styles = stylex.create({
  card: { color: { default: "black", "[data-theme=dark]": "white" } },
});
`,
    errors: ["foldkit-stylex-condition-key/bareAttribute"],
    messages: ["Write ':is([data-theme=dark])' instead of '[data-theme=dark]'."],
  },
  {
    file: "bare-attribute-good.ts",
    code: `${preamble}
export const styles = stylex.create({
  card: { color: { default: "black", ":is([data-theme=dark])": "white" } },
});
`,
    errors: [],
  },
  {
    file: "media-order-bad.ts",
    code: `${preamble}
export const styles = stylex.create({
  wide: { padding: { default: 8, "@media (min-width: 640px)": 16, "@media (min-width: 320px)": 12 } },
  narrow: { padding: { default: 8, "@media (max-width: 40rem)": 4, "@media (max-width: 1024px)": 6 } },
  range: { padding: { default: 8, "@media (width >= 768px)": 16, "@media (min-width: 48rem)": 12 } },
});
`,
    errors: Array.from({ length: 3 }, () => "foldkit-stylex-condition-key/mediaOrder"),
    messages: [
      "'@media (min-width: 640px)' never matches: StyleX rewrites each width query to exclude the ones after it, and '@media (min-width: 320px)' covers its whole range.",
    ],
  },
  {
    file: "media-order-good.ts",
    code: `${preamble}
export const styles = stylex.create({
  wide: { padding: { default: 8, "@media (min-width: 320px)": 12, "@media (min-width: 640px)": 16 } },
  narrow: { padding: { default: 8, "@media (max-width: 1024px)": 6, "@media (max-width: 40rem)": 4 } },
  // The later query stops just below 768px, so the earlier one still matches at 768px.
  edge: { padding: { default: 8, "@media (max-width: 768px)": 6, "@media (width < 768px)": 4 } },
  motion: {
    padding: { default: 8, "@media (min-width: 640px) and (prefers-reduced-motion: reduce)": 4, "@media (min-width: 320px)": 6 },
  },
});
`,
    errors: [],
  },
  {
    file: "create-theme-bad.ts",
    code: `${preamble}import { color } from "./tokens.stylex.ts";

export const dark = stylex.createTheme(color, { surface: "#000000" });
`,
    errors: ["foldkit-stylex-styles/createTheme"],
  },
  {
    file: "create-theme-good.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

import { color } from "./tokens.stylex.ts";

const styles = stylex.create({ dark: { [color.surface]: "#000000" } });

export const card = (h: HtmlBuilder<never>) => h.div([sx(styles.dark)], []);
`,
    errors: [],
  },
  {
    file: "tokens.stylex.ts",
    code: `import * as stylex from "@stylexjs/stylex";

export const color = stylex.defineVars({ surface: "#ffffff" });
`,
    errors: [],
  },
  {
    file: "overrides-bad.stylex.ts",
    code: `import * as stylex from "@stylexjs/stylex";

export const brand = stylex.defineVars({ "--fks-acent": "#c2410c" });
export const loose = stylex.defineVars({ "--fks-color-accent": "#c2410c" } satisfies Record<string, string>);
`,
    errors: ["foldkit-stylex-styles/overrides", "foldkit-stylex-styles/overrides"],
  },
  {
    file: "overrides-good.stylex.ts",
    code: `import type { ThemeOverrides as Overrides } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import { defineVars } from "@stylexjs/stylex";

export const brand = defineVars({ "--fks-color-accent": "#c2410c" } satisfies Overrides);
`,
    errors: [],
  },
  {
    file: "annotation-bad.ts",
    code: `${preamble}import type { ListboxStyle, PopoverStyle } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ panel: { padding: 16 } });

export const shared: PopoverStyle.Styles = { panel: styles.panel };
export const many: ListboxStyle.Multi.Styles = {};
`,
    errors: ["foldkit-stylex-styles/annotation", "foldkit-stylex-styles/annotation"],
    messages: ["Write shared = { ... } satisfies PopoverStyle.Styles instead of annotating it."],
  },
  {
    file: "annotation-good.ts",
    code: `${preamble}import type { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import type { Theme } from "./theme.ts";

const styles = stylex.create({ panel: { padding: 16 } });

export const shared = { panel: styles.panel } satisfies PopoverStyle.Styles;
export const theme: Theme.Styles = {};
`,
    errors: [],
  },
  {
    file: "valid-styles-bad.ts",
    code: `${preamble}
export const styles = stylex.create({ a: { colour: "red" } });
`,
    errors: ["stylex/valid-styles"],
  },
  {
    file: "no-unused-bad.ts",
    code: `${preamble}
const styles = stylex.create({ used: { color: "red" }, unused: { color: "blue" } });

export const used = styles.used;
`,
    errors: ["stylex/no-unused"],
  },
  {
    file: "valid-shorthands-bad.ts",
    code: `${preamble}
export const styles = stylex.create({ a: { margin: "1px 2px" } });
`,
    errors: ["stylex/valid-shorthands"],
  },
  {
    file: "enforce-extension-bad.ts",
    code: `import * as stylex from "@stylexjs/stylex";

export const color = stylex.defineVars({ surface: "#ffffff" });
`,
    errors: ["stylex/enforce-extension"],
  },
  {
    file: "no-legacy-contextual-styles-bad.ts",
    code: `${preamble}
export const styles = stylex.create({ a: { ":hover": { color: "red" } } });
`,
    // valid-styles rejects the same key, as a condition outside a property.
    errors: ["stylex/no-legacy-contextual-styles", "stylex/valid-styles"],
  },
  {
    file: "no-nonstandard-styles-bad.ts",
    code: `${preamble}
export const styles = stylex.create({ a: { float: "start" } });
`,
    // valid-styles rejects the same value.
    errors: ["stylex/no-nonstandard-styles", "stylex/valid-styles"],
  },
];

const source = fileURLToPath(new URL("../src/foldkit-stylex.ts", import.meta.url));

const json = fileURLToPath(new URL("../dist/foldkit-stylex.json", import.meta.url));

// The two ways an app loads the preset: the TS module, and the JSON form a build generates.
const forms = [
  {
    config: "oxlint.config.ts",
    contents: `import preset from ${JSON.stringify(source)};\nexport default preset;\n`,
  },
  { config: ".oxlintrc.json", contents: JSON.stringify({ extends: [json] }) },
];

const escape = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const placeholder = /\\\{\\\{\w+\\\}\\\}/g;

// Which of the rule's messages a diagnostic shows, with each `{{placeholder}}` matching any text.
const messageIdOf = (rule: string, message: string) =>
  Object.entries(plugin.rules[rule]?.meta?.messages ?? {}).find(([, template]) =>
    new RegExp(`^${escape(template).replaceAll(placeholder, ".+")}$`).test(message),
  )?.[0];

type Diagnostic = Readonly<{ code: string; message: string; filename: string }>;

const idOf = ({ code, message }: Diagnostic) => {
  const [, prefix, rule = ""] = /^(kit|stylex)\((.+)\)$/.exec(code) ?? [];

  if (prefix === "stylex") return `stylex/${rule}`;

  return prefix === "kit" ? `${rule}/${messageIdOf(rule, message) ?? message}` : undefined;
};

for (const { config, contents } of forms) {
  await test(`${config} reports each foldkit-stylex mistake and accepts its fix`, (context) => {
    assert.ok(existsSync(json), "dist/foldkit-stylex.json is missing. Run `pnpm build` first.");

    const directory = mkdtempSync(join(tmpdir(), "kit-foldkit-stylex-"));
    context.after(() => rmSync(directory, { recursive: true, force: true }));

    writeFileSync(join(directory, config), contents);

    for (const { file, code } of cases) writeFileSync(join(directory, file), code);

    const result = spawnSync(
      "pnpm",
      ["exec", "oxlint", "--config", join(directory, config), "--format", "json", directory],
      { encoding: "utf8" },
    );

    const output = result.stdout + result.stderr;

    assert.equal(result.status, 1, output);

    // SAFETY: Oxlint's JSON format writes an object with a `diagnostics` array of this shape.
    const { diagnostics } = JSON.parse(result.stdout) as { diagnostics: ReadonlyArray<Diagnostic> };

    for (const { file, errors, messages = [] } of cases) {
      const found = diagnostics.filter(({ filename }) => filename === join(directory, file));
      const ids = found.flatMap((diagnostic) => idOf(diagnostic) ?? []);

      const shown = JSON.stringify(
        found.map(({ code, message }) => `${code}: ${message}`),
        null,
        2,
      );

      assert.deepEqual(ids.sort(), [...errors].sort(), `${file}: ${shown}`);

      for (const text of messages) {
        assert.ok(
          found.some(({ message }) => message.includes(text)),
          `${file} has no message with "${text}": ${shown}`,
        );
      }
    }
  });
}

await test("a bare attribute key's suggestion wraps it in :is()", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-foldkit-stylex-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const config = join(directory, "oxlint.config.ts");
  const file = join(directory, "styles.ts");

  writeFileSync(config, forms[0]?.contents ?? "");
  writeFileSync(
    file,
    `import * as stylex from "@stylexjs/stylex";\n\nexport const styles = stylex.create({ card: { color: { default: "black", '[data-theme="dark"]': "white" } } });\n`,
  );

  const lint = (...flags: ReadonlyArray<string>) =>
    spawnSync("pnpm", ["exec", "oxlint", "--config", config, ...flags, file], { encoding: "utf8" });

  lint("--fix");
  assert.match(readFileSync(file, "utf8"), /'\[data-theme="dark"\]'/);

  lint("--fix-suggestions");
  assert.match(readFileSync(file, "utf8"), /":is\(\[data-theme=\\"dark\\"\]\)"/);
});
