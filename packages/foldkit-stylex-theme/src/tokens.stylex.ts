// First, so the compile guard runs before any style of this package is defined.
import "./internal/compiled.ts";
import * as stylex from "@stylexjs/stylex";

// Each token reads `--fks-<group>-<key in kebab-case>` first, falling back to its default. StyleX
// never declares those properties; the app does, at :root, so its value wins whatever the
// stylesheet order, and panels portaled to <body> see it. Colors follow `color-scheme` through
// `light-dark()`. README.md lists every token, test/tokens.test.ts checks the list and the names,
// and test/browser/token-contrast.test.ts the contrast of the default colors.

// The two colors every grey mixes, so a preset that sets them gets matching greys. They are module
// consts, which StyleX reads when it compiles the template literals below. OKLab mixes by
// lightness as the eye sees it, so one share gives about the same contrast in light and dark
// schemes. color-mix() and the var() fallbacks resolve where the token is defined, at :root: a
// part that sets surface or text must set the greys, subtle, border, control and muted, plus
// accent and onAccent, too.
const surface = "var(--fks-color-surface, light-dark(#ffffff, #111113))";

const text = "var(--fks-color-text, light-dark(#18181b, #ededed))";

// Under forced colors (Windows High Contrast), the browser swaps each color that is not a system
// color for one of the user's, which turns fills to the background and loses the state they show.
// So the colors that draw controls and their state become system colors there, whatever the app
// sets. The browser picks the rest per element, such as LinkText for a link.
export const color = stylex.defineVars({
  surface,
  text,
  // Hover, the active item, the rest fill of fields and buttons, wells and today's date.
  subtle: `var(--fks-color-subtle, color-mix(in oklab, ${text} 5%, ${surface}))`,
  // Hairlines: separators, the rest edge of fields and buttons, and the empty part of a track.
  // Far below the 3:1 that WCAG 1.4.11 asks of a control's edge, so a field or button resting on
  // it also takes the subtle fill and turns to color.control on hover. Under forced colors the
  // browser draws edges in its own colors, and fills take GrayText through base.borderFill.
  border: `var(--fks-color-border, color-mix(in oklab, ${text} 10%, ${surface}))`,
  // The edge of checkboxes, radios and switches, and of a hovered field or button: at least 3:1 on
  // surface and subtle.
  control: {
    default: `var(--fks-color-control, color-mix(in oklab, ${text} 50%, ${surface}))`,
    "@media (forced-colors: active)": "CanvasText",
  },
  muted: `var(--fks-color-muted, color-mix(in oklab, ${text} 62%, ${surface}))`,
  // The text color unless a preset gives a hue, so the default look is monochrome.
  accent: {
    default: `var(--fks-color-accent, ${text})`,
    "@media (forced-colors: active)": "Highlight",
  },
  onAccent: {
    default: `var(--fks-color-on-accent, ${surface})`,
    "@media (forced-colors: active)": "HighlightText",
  },
  danger: {
    default: "var(--fks-color-danger, light-dark(#b91c1c, #f87171))",
    "@media (forced-colors: active)": "CanvasText",
  },
  overlay: "var(--fks-color-overlay, light-dark(rgb(0 0 0 / 0.4), rgb(0 0 0 / 0.6)))",
} as const);

export const space = stylex.defineVars({
  xs: "var(--fks-space-xs, 0.25rem)",
  sm: "var(--fks-space-sm, 0.5rem)",
  md: "var(--fks-space-md, 0.75rem)",
  lg: "var(--fks-space-lg, 1rem)",
  xl: "var(--fks-space-xl, 1.5rem)",
} as const);

// A coarse pointer, a finger, gets larger controls and targets: both branches read the same
// property, and under a finger it never goes below 44px, so an app-wide override keeps its touch
// size. A token set on a part replaces both branches, so give that value a coarse branch too.
export const size = stylex.defineVars({
  // The block size of buttons, fields, triggers, tabs and list items.
  control: {
    default: "var(--fks-size-control, 2rem)",
    "@media (pointer: coarse)": "max(var(--fks-size-control, 2rem), 2.75rem)",
  },
  // The smallest pointer target of every control: WCAG 2.5.8's 24px under a mouse, 2.5.5's 44px
  // under a finger. Smaller controls keep it with base.hitArea.
  target: {
    default: "var(--fks-size-target, 1.5rem)",
    "@media (pointer: coarse)": "max(var(--fks-size-target, 1.5rem), 2.75rem)",
  },
  // Checkboxes, radios and thumbs.
  mark: "var(--fks-size-mark, 1rem)",
} as const);

export const radius = stylex.defineVars({
  control: "var(--fks-radius-control, 0.375rem)",
  // The control radius plus the space.xs padding of a list, so a panel's corner and its items'
  // corners share a centre.
  panel: "var(--fks-radius-panel, calc(var(--fks-radius-control, 0.375rem) + 0.25rem))",
} as const);

export const fontSize = stylex.defineVars({
  xs: "var(--fks-font-size-xs, 0.75rem)",
  sm: "var(--fks-font-size-sm, 0.8125rem)",
  md: "var(--fks-font-size-md, 0.875rem)",
  lg: "var(--fks-font-size-lg, 1rem)",
} as const);

// One line of each font size, so text of that size keeps the rhythm and a control can centre it.
export const lineHeight = stylex.defineVars({
  xs: "var(--fks-line-height-xs, 1rem)",
  sm: "var(--fks-line-height-sm, 1.125rem)",
  md: "var(--fks-line-height-md, 1.25rem)",
  lg: "var(--fks-line-height-lg, 1.5rem)",
} as const);

export const fontWeight = stylex.defineVars({
  medium: "var(--fks-font-weight-medium, 500)",
  strong: "var(--fks-font-weight-strong, 600)",
} as const);

// Durations stay as set under reduced motion: fades remain, and base.closed and base.movement drop
// the movement itself.
export const motion = stylex.defineVars({
  // Hover colors and press feedback, which follow the pointer.
  instant: "var(--fks-motion-instant, 100ms)",
  fast: "var(--fks-motion-fast, 150ms)",
  slow: "var(--fks-motion-slow, 200ms)",
  // An ease-out that moves on the first frame, so a panel answers the click at once.
  easing: "var(--fks-motion-easing, cubic-bezier(0.23, 1, 0.32, 1))",
} as const);

// light-dark() takes colors only, so each layer that one scheme lacks is transparent there. Light
// raises a panel with a hairline ring and two soft drops. On a dark page a drop barely shows, so
// dark adds a highlight along the top edge and one deep drop. The ring is color.border's value, so
// a popover's arrow, drawn in color.border, meets it in the same color, and a preset's border
// reaches it.
export const shadow = stylex.defineVars({
  panel: `var(--fks-shadow-panel, inset 0 1px 0 light-dark(transparent, rgb(255 255 255 / 0.04)), 0 0 0 1px var(--fks-color-border, color-mix(in oklab, ${text} 10%, ${surface})), 0 4px 12px -2px light-dark(rgb(0 0 0 / 0.08), transparent), 0 12px 32px -8px light-dark(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.5)))`,
  // Raises a button or the switch's thumb off the page; dark draws none.
  control: "var(--fks-shadow-control, 0 1px 2px light-dark(rgb(0 0 0 / 0.05), transparent))",
} as const);

type NameOf<Value> = Value extends `var(${infer Name}, ${string}` ? Name : never;

// Every group above; test/tokens.test.ts checks that none is missing.
type Groups =
  | typeof color
  | typeof space
  | typeof size
  | typeof radius
  | typeof fontSize
  | typeof lineHeight
  | typeof fontWeight
  | typeof motion
  | typeof shadow;

type NamesOf<Group> =
  Group extends stylex.VarGroup<infer Tokens> ? NameOf<Tokens[keyof Tokens]> : never;

// The types below map over it rather than use Readonly<Partial<Record<…>>>, so a misspelt name's
// error names them.
type TokenProperty = NamesOf<Groups>;

// A value as defineVars takes it: a string, or one per condition, which may nest.
type ConditionalValue =
  | string
  | { readonly default: ConditionalValue; readonly [condition: `@${string}`]: ConditionalValue };

/**
 * Every `--fks-*` custom property the tokens read, each optional, for app-wide values:
 * `stylex.defineVars({ ... } satisfies ThemeOverrides)` in a `.stylex.ts` file. A value may vary by
 * condition, as `{ default: "1rem", "@media (min-width: 48rem)": "1.25rem" }`. A misspelt name
 * does not compile.
 */
export type ThemeOverrides = { readonly [Name in TokenProperty]?: ConditionalValue };

/**
 * The same properties with string values, for a preset that a Command sets on
 * `document.documentElement` at runtime. A misspelt name does not compile.
 */
export type ThemePreset = { readonly [Name in TokenProperty]?: string };
