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
    code: `${preamble}import { DragAndDrop, Popover, Tabs } from "@foldkit/ui";
import { DragAndDropStyle, PopoverStyle, TabsStyle, sx } from "@kutur-kit/foldkit-stylex";
import { Array, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Function from "effect/Function";

const styles = stylex.create({ wide: { inlineSize: 320 }, ring: { outlineWidth: 2 } });

export const popoverView = PopoverStyle.view(Popover.view);
export const tabsView = TabsStyle.view(Tabs.view);
const draggable = DragAndDropStyle.draggable(DragAndDrop.draggable, { draggable: styles.ring });

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

// Foldkit's tabs example renders the active panel through Effect's Array.
export const panelInputs = (h: HtmlBuilder<never>) => ({
  toView: ({ tabs, activeIndex }: never) =>
    h.div([], [
      ...Array.map(Array.filter(tabs, (tab: never) => tab.index === activeIndex), (tab: never) => h.div([...tab.panel, sx(styles.ring)], [])),
      ...tabs.filter((tab: never) => tab.index === activeIndex).map((tab: never) => h.div([...tab.panel, sx(styles.ring)], [])),
      ...tabs.flatMap((tab: never) => [h.div([...tab.panel, sx(styles.ring)], [])]),
      ...Arr.flatMap(tabs, (tab: never) => [h.div([...tab.panel, sx(styles.ring)], [])]),
      ...pipe(tabs, Array.map((tab: never) => h.div([...tab.panel, sx(styles.ring)], []))),
      ...Function.pipe(tabs, Array.filter((tab: never) => tab.index === activeIndex), Array.flatMap((tab: never) => [h.div([...tab.panel, sx(styles.ring)], [])])),
    ]),
});

export const cards = (config: never, h: HtmlBuilder<never>) => [
  h.li([...draggable(config, h), sx(styles.wide)], []),
  h.li([h.Class("card"), ...draggable(config, h)], []),
];

// toView callbacks passed by name, as Foldkit's examples write them.
export const checkboxInputs = (h: HtmlBuilder<never>) => {
  const checkboxView = (attributes: never) => h.button([...attributes.checkbox, h.Class("box")], []);

  function labelView({ label }: never) {
    return h.label([...label, sx(styles.ring)], []);
  }

  return [{ toView: checkboxView }, { toView: labelView }];
};
`,
    errors: [
      "foldkit-stylex-attributes/partStyle",
      ...Array.from({ length: 13 }, () => "foldkit-stylex-attributes/partClass"),
    ],
  },
  {
    file: "ui-bundle-good.ts",
    code: `${preamble}import type { Attribute } from "foldkit/html";

import { DragAndDrop, Popover } from "@foldkit/ui";
import { PopoverStyle, sx } from "@kutur-kit/foldkit-stylex";
import { Array, pipe } from "effect";

const styles = stylex.create({ wide: { inlineSize: 320 }, ring: { outlineWidth: 2 }, text: { color: "red" } });

export const popoverView = PopoverStyle.view(Popover.view, { button: styles.ring, panel: styles.wide });

// The app's own helpers spread their own attributes, above or below a toView with the same names.
export const above = (attributes: ReadonlyArray<Attribute<never>>, h: HtmlBuilder<never>) =>
  h.input([...attributes, sx(styles.text)]);

export const popoverInputs = (h: HtmlBuilder<never>) => ({
  toView: (attributes: never) =>
    h.div([...attributes.wrapper], [h.button([...attributes.button], []), h.div([...attributes.panel], [h.p([sx(styles.text)], [])])]),
});

export const below = (attributes: ReadonlyArray<Attribute<never>>, h: HtmlBuilder<never>) =>
  h.input([...attributes, sx(styles.text)]);

// A function passed by name to another input gets no bundle.
export const checkboxInputs = (h: HtmlBuilder<never>) => {
  const toggled = (attributes: ReadonlyArray<Attribute<never>>) => h.span([...attributes, sx(styles.text)], []);

  return { onToggle: toggled };
};

// A function that passes its own parameter on as toView gets no bundle itself.
export function framed(view: never, attributes: ReadonlyArray<Attribute<never>>, h: HtmlBuilder<never>) {
  return { toView: view, frame: h.div([...attributes, sx(styles.text)], []) };
}

// droppable and sortable carry no style.
export const list = (h: HtmlBuilder<never>) =>
  h.ul([...DragAndDrop.droppable("list"), ...DragAndDrop.sortable("item"), sx(styles.wide)], []);

// The app's own attribute lists, iterated as bundles are, get no bundle.
export const rows = (lists: ReadonlyArray<ReadonlyArray<Attribute<never>>>, h: HtmlBuilder<never>) => [
  ...Array.map(Array.filter(lists, (list) => list.length > 0), (list) => h.li([...list, sx(styles.text)], [])),
  ...pipe(lists, Array.map((list) => h.li([...list, sx(styles.text)], []))),
];
`,
    errors: [],
  },
  {
    file: "attributes-input-bad.ts",
    code: `${preamble}import { childAttributes } from "foldkit/html";
import { Listbox } from "@foldkit/ui";
import { ListboxStyle, sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ dim: { opacity: 0.5 } });
const Languages = Listbox.create<"pl" | "en">();

export const languagesView = ListboxStyle.view(Languages.view);

export const inputs = (h: HtmlBuilder<never>) => ({
  buttonAttributes: childAttributes([h.AriaLabel("Language"), h.Class("trigger")]),
  backdropAttributes: childAttributes([sx(styles.dim)]),
  itemsAttributes: childAttributes([h.Style({ maxHeight: "none" })]),
  attributes: childAttributes([h.Attribute("class", "wrapper")]),
});
`,
    errors: [
      "foldkit-stylex-attributes/partClass",
      "foldkit-stylex-attributes/partClass",
      "foldkit-stylex-attributes/partStyle",
      "foldkit-stylex-attributes/partClass",
    ],
  },
  {
    file: "attributes-input-good.ts",
    code: `${preamble}import { childAttributes } from "foldkit/html";
import { sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ box: { opacity: 0.5 } });

export const inputs = (h: HtmlBuilder<never>) => ({
  buttonAttributes: childAttributes([h.AriaLabel("Language")]),
});

// A Submodel of the app's own publishes its parts' attributes, styles included, under a key that
// does not match \`*Attributes\`, which the rule reads as a @foldkit/ui view input.
export const published = (h: HtmlBuilder<never>) => ({
  checkbox: childAttributes([h.Role("checkbox"), sx(styles.box)]),
});
`,
    errors: [],
  },
  {
    file: "one-call-bad.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ a: { color: "red" }, b: { color: "blue" } });

export const own = (h: HtmlBuilder<never>) => h.div([sx(styles.a), h.Class("p-4"), sx(styles.b)], []);
export const tailwind = (h: HtmlBuilder<never>) => h.div([h.Class("p-4"), h.Class("m-2")], []);
`,
    errors: [
      "foldkit-stylex-attributes/oneCall",
      "foldkit-stylex-attributes/oneCall",
      "foldkit-stylex-attributes/oneClass",
    ],
    messages: [
      "Pass every style of this element to one sx(...) call",
      "Join these class names into one Class.",
    ],
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
    errors: ["foldkit-stylex-attributes/rawClass", "foldkit-stylex-attributes/rawStyle"],
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
      "Import Listbox from @kutur-kit/foldkit-stylex-theme/listbox in place of @foldkit/ui's: the theme's Listbox styles Many.view by default.",
      "wrap Many.view once at module scope with ListboxStyle.Multi.view(Many.view, styles)",
      "Import DragAndDrop from @kutur-kit/foldkit-stylex-theme/drag-and-drop in place of",
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
  motion: {
    padding: { default: 8, "@media (min-width: 640px) and (prefers-reduced-motion: reduce)": 4, "@media (min-width: 320px)": 6 },
  },
  dark: {
    color: { default: "black", "@media (prefers-color-scheme: dark) and (min-width: 640px)": "white", "@media (prefers-color-scheme:dark)": "gray" },
  },
});
`,
    errors: Array.from({ length: 5 }, () => "foldkit-stylex-condition-key/mediaOrder"),
    messages: [
      "'@media (min-width: 640px)' never matches: StyleX rewrites each media query to exclude the ones after it in the same property, and '@media (min-width: 320px)' matches wherever it does.",
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
  // The later query is narrower, so the earlier one still matches below 640px.
  motion: { transitionDuration: { default: "200ms", "@media (prefers-reduced-motion: reduce)": "0s", "@media (min-width: 640px)": "300ms" } },
  // The later query needs a feature the earlier one does not, so the earlier one still matches
  // without it.
  reduced: {
    padding: { default: 8, "@media (min-width: 640px)": 6, "@media (min-width: 320px) and (prefers-reduced-motion: reduce)": 4 },
  },
  compound: {
    padding: { default: 8, "@media (min-width: 320px)": 6, "@media (min-width: 640px) and (prefers-reduced-motion: reduce)": 4 },
  },
});
`,
    errors: [],
  },
  {
    file: "focus-rank-bad.ts",
    code: `${preamble}
export const styles = stylex.create({
  button: { backgroundColor: { default: "white", ":hover": { default: null, "@media (hover: hover)": "gray" }, ":focus-visible": "blue" } },
  field: { borderColor: { default: "gray", ":focus-within": "blue", ":hover": { default: null, "@media (hover: hover)": "black" } } },
  link: { color: { default: "black", ":focus": "red", ":focus-visible": "blue" } },
  input: { borderColor: { default: "gray", ":user-invalid": "red", ":focus-visible": "blue" } },
  drop: { outlineColor: { default: "transparent", ":hover": { default: null, "@media (hover: hover)": "gray" }, ":has(:focus-visible)": "blue" } },
});
`,
    errors: Array.from({ length: 5 }, () => "foldkit-stylex-condition-key/focusRank"),
    messages: [
      "StyleX 0.19 ranks ':focus-visible' below ':hover', so ':hover' wins wherever both match and hides the focus style.",
      "StyleX 0.19 ranks ':focus-visible' below ':user-invalid'",
      "StyleX 0.19 ranks ':has(:focus-visible)' below ':hover'",
    ],
  },
  {
    file: "focus-rank-good.ts",
    code: `${preamble}
export const styles = stylex.create({
  button: {
    backgroundColor: { default: "white", "@media (hover: hover)": { default: "white", ":hover:not(:focus-visible)": "gray" }, ":focus-visible": "blue" },
    outlineWidth: { default: 0, ":focus-visible": 2 },
    opacity: { default: 1, ":hover": { default: null, "@media (hover: hover)": 0.8 }, ":active": 0.6 },
  },
  field: { borderColor: { default: "gray", ":focus": "blue", ":focus-within": "black" } },
  // Ties: StyleX ranks both keys of each pair alike, 40 or 45, and orders them by value, which the
  // rule leaves alone.
  card: { outlineColor: { default: "transparent", ":is([data-theme=dark])": "white", ":focus-visible": "blue" } },
  drop: { outlineColor: { default: "transparent", ":has(:user-invalid)": "red", ":has(:focus-visible)": "blue" } },
});
`,
    errors: [],
  },
  {
    file: "hover-gate-bad.ts",
    code: `${preamble}
export const styles = stylex.create({
  button: { backgroundColor: { default: "white", ":hover": "gray" } },
  chain: { opacity: { default: 1, ":hover:not(:focus-visible)": 0.8 } },
  // The default branch applies where the query does not match.
  partial: { color: { default: "black", ":hover": { default: "gray", "@media (hover: hover)": "navy" } } },
  // Any pointer that hovers is not the primary one: a phone with a stylus matches.
  anyHover: { color: { default: "black", ":hover": { default: null, "@media (any-hover: hover)": "gray" } } },
  focused: { color: { default: "black", ":focus-visible": { default: "blue", ":hover": "navy" } } },
  wide: { color: { default: "black", "@media (min-width: 640px)": { default: "black", ":hover": "gray" } } },
  field: { "::placeholder": { color: { default: "gray", ":hover": "black" } } },
  row: { color: { default: "black", [stylex.when.ancestor(":hover")]: "blue" } },
  tinted: (tint: string) => ({ color: { default: "black", ":hover": tint } }),
});
`,
    errors: Array.from({ length: 9 }, () => "foldkit-stylex-hover-gate/gate"),
    messages: [
      "Put this hover style under @media (hover: hover): touch browsers keep :hover after a tap, so the style sticks.",
    ],
  },
  {
    file: "hover-gate-good.ts",
    code: `${preamble}
export const styles = stylex.create({
  button: { backgroundColor: { default: "white", ":hover": { default: null, "@media (hover: hover)": "gray" } } },
  wide: { opacity: { default: 1, ":hover": { default: null, "@media (hover:hover) and (min-width: 640px)": 0.8 } } },
  // StyleX's valid-styles takes no conditions under a chained or stylex.when key, so their gate
  // goes around them.
  chain: { opacity: { default: 1, "@media (hover: hover)": { default: 1, ":hover:not(:focus-visible)": 0.8 } } },
  row: { color: { default: "black", "@media (hover: hover)": { default: "black", [stylex.when.ancestor(":hover")]: "blue" } } },
  field: { "::placeholder": { color: { default: "gray", ":hover": { default: null, "@media (hover: hover)": "black" } } } },
  tinted: (tint: string) => ({ color: { default: "black", ":hover": { default: null, "@media (hover: hover)": tint } } }),
  focused: { outlineWidth: { default: 0, ":focus-visible": 2 } },
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

import type { ThemeOverrides } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

export const brand = stylex.defineVars({ "--fks-acent": "#c2410c" });
export const loose = stylex.defineVars({ "--fks-color-accent": "#c2410c" } satisfies Record<string, string>);
export const cast = stylex.defineVars({ "--fks-acent": "#c2410c" } as ThemeOverrides);
export const angle = stylex.defineVars(<ThemeOverrides>{ "--fks-acent": "#c2410c" });
`,
    errors: Array.from({ length: 4 }, () => "foldkit-stylex-styles/overrides"),
  },
  {
    file: "overrides-good.stylex.ts",
    code: `import type { ThemeOverrides as Overrides } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import { defineVars } from "@stylexjs/stylex";

export const brand = defineVars({ "--fks-color-accent": "#c2410c" } satisfies Overrides);
export const exported = defineVars({ "--fks-radius-control": "0" } satisfies Overrides as Overrides);
`,
    errors: [],
  },
  {
    file: "element-token-bad.ts",
    code: `${preamble}
export const styles = stylex.create({
  inverted: { "--fks-color-surface": "black", color: { default: "white", ":focus-visible": "gray" } },
  tinted: (accent: string) => ({ "--fks-color-accent": accent }),
});

export const card = (isOn: boolean, h: HtmlBuilder<never>) =>
  h.div([h.Style(isOn ? { "--fks-color-text": "red" } : {})], []);
`,
    errors: Array.from({ length: 3 }, () => "foldkit-stylex-styles/elementToken"),
    messages: [
      "'--fks-color-surface' changes nothing on an element: the tokens read it once, at :root.",
    ],
  },
  {
    file: "element-token-good.ts",
    code: `${preamble}import { sx } from "@kutur-kit/foldkit-stylex";

import { color } from "./tokens.stylex.ts";

const styles = stylex.create({ inverted: { [color.surface]: "black", "--hue": "200" }, tinted: { [color.surface]: "var(--tint)" } });

// A theme picker's presets, which a Command sets on <html>.
export const presets = { ember: { "--fks-color-surface": "black" } };

export const card = (tint: string, h: HtmlBuilder<never>) => h.div([h.Style({ "--tint": tint }), sx(styles.inverted, styles.tinted)], []);
`,
    errors: [],
  },
  {
    file: "annotation-bad.ts",
    code: `${preamble}import { Popover } from "@foldkit/ui";
import { type ListboxStyle, PopoverStyle } from "@kutur-kit/foldkit-stylex";

const styles = stylex.create({ panel: { padding: 16 } });

export const shared: PopoverStyle.Styles = { panel: styles.panel };
export const cast = { items: styles.panel } as ListboxStyle.Styles;
export const angle = <PopoverStyle.Styles>{ panel: styles.panel };

export const looks: PopoverStyle.Styles[] = [{ panel: styles.panel }];
export const frozen: ReadonlyArray<PopoverStyle.Styles> = [{ panel: styles.panel }];
export const kept: readonly ListboxStyle.Styles[] = [{ items: styles.panel }];
export const casts = [{ panel: styles.panel }] as Array<PopoverStyle.Styles>;
export const themed = (...extras: PopoverStyle.Styles[]) => PopoverStyle.view(Popover.view, ...extras);
`,
    errors: [
      ...Array.from({ length: 3 }, () => "foldkit-stylex-styles/annotation"),
      ...Array.from({ length: 5 }, () => "foldkit-stylex-styles/arrayAnnotation"),
    ],
    messages: [
      "Check these styles with satisfies PopoverStyle.Styles instead.",
      "Check these styles with satisfies readonly ListboxStyle.Styles[] instead",
    ],
  },
  {
    file: "annotation-good.ts",
    code: `${preamble}import type { PopoverStyle } from "@kutur-kit/foldkit-stylex";

import type { Theme } from "./theme.ts";

const styles = stylex.create({ panel: { padding: 16 } });

export const shared = { panel: styles.panel } satisfies PopoverStyle.Styles;
export const looks = [{ panel: styles.panel }] satisfies PopoverStyle.Styles[];
export const theme: Theme.Styles = {};
export const names: ReadonlyArray<keyof PopoverStyle.Styles> = ["panel"];
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
export const styles = stylex.create({ a: { ":active": { color: "red" } } });
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
