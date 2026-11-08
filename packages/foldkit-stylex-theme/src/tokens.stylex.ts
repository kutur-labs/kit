// First, so the compile guard runs before any style of this package is defined.
import "./internal/compiled.ts";
import * as stylex from "@stylexjs/stylex";

// Each token reads `--fks-<group>-<key in kebab-case>` first, falling back to its default. StyleX
// never declares those properties; the app does, at :root, so its value wins whatever the
// stylesheet order, and panels portaled to <body> see it. Colors follow `color-scheme` through
// `light-dark()`. README.md lists every token, and test/tokens.test.ts checks the list, the names
// and the contrast of the default colors.

export const color = stylex.defineVars({
  surface: "var(--fks-color-surface, light-dark(#ffffff, #18181b))",
  text: "var(--fks-color-text, light-dark(#18181b, #fafafa))",
  muted: "var(--fks-color-muted, light-dark(#52525b, #a1a1aa))",
  // Separators and panel edges only: below the 3:1 that WCAG 1.4.11 asks of a control's edge.
  border: "var(--fks-color-border, light-dark(#d4d4d8, #3f3f46))",
  // The edge of checkboxes, radios, switches and inputs: at least 3:1 on surface.
  control: "var(--fks-color-control, light-dark(#71717a, #a1a1aa))",
  hover: "var(--fks-color-hover, light-dark(#f4f4f5, #27272a))",
  accent: "var(--fks-color-accent, light-dark(#2563eb, #60a5fa))",
  onAccent: "var(--fks-color-on-accent, light-dark(#ffffff, #0b1220))",
  danger: "var(--fks-color-danger, light-dark(#dc2626, #f87171))",
  focus: "var(--fks-color-focus, light-dark(#2563eb, #93c5fd))",
  overlay: "var(--fks-color-overlay, light-dark(rgb(0 0 0 / 0.4), rgb(0 0 0 / 0.6)))",
} as const);

export const space = stylex.defineVars({
  xs: "var(--fks-space-xs, 0.25rem)",
  sm: "var(--fks-space-sm, 0.5rem)",
  md: "var(--fks-space-md, 1rem)",
  lg: "var(--fks-space-lg, 1.5rem)",
} as const);

export const size = stylex.defineVars({
  // The smallest pointer target of every control, WCAG 2.5.5's 44px. Smaller controls keep it
  // with an invisible ::before.
  target: "var(--fks-size-target, 2.75rem)",
  box: "var(--fks-size-box, 1.25rem)",
  thumb: "var(--fks-size-thumb, 1.25rem)",
  arrow: "var(--fks-size-arrow, 1rem)",
} as const);

export const radius = stylex.defineVars({
  control: "var(--fks-radius-control, 0.375rem)",
  panel: "var(--fks-radius-panel, 0.625rem)",
} as const);

export const fontSize = stylex.defineVars({
  sm: "var(--fks-font-size-sm, 0.875rem)",
  md: "var(--fks-font-size-md, 1rem)",
  lg: "var(--fks-font-size-lg, 1.125rem)",
} as const);

// Durations drop to 0s for users who ask for reduced motion, whatever the app sets, so no look
// has to repeat the media query.
export const motion = stylex.defineVars({
  fast: {
    default: "var(--fks-motion-fast, 150ms)",
    "@media (prefers-reduced-motion: reduce)": "0s",
  },
  slow: {
    default: "var(--fks-motion-slow, 250ms)",
    "@media (prefers-reduced-motion: reduce)": "0s",
  },
  easing: "var(--fks-motion-easing, cubic-bezier(0.2, 0, 0, 1))",
} as const);

export const shadow = stylex.defineVars({
  panel: "var(--fks-shadow-panel, 0 0.5rem 1.5rem light-dark(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.5)))",
} as const);

type NameOf<Value> = Value extends `var(${infer Name}, ${string}` ? Name : never;

// Every group above; test/tokens.test.ts checks that none is missing.
type Groups =
  | typeof color
  | typeof space
  | typeof size
  | typeof radius
  | typeof fontSize
  | typeof motion
  | typeof shadow;

type NamesOf<Group> =
  Group extends stylex.VarGroup<infer Tokens> ? NameOf<Tokens[keyof Tokens]> : never;

/**
 * Every `--fks-*` custom property the tokens read, each optional. Set them app-wide with
 * `stylex.defineVars({ ... } satisfies ThemeOverrides)` in a `.stylex.ts` file, or at runtime on
 * `document.documentElement`. A misspelt name does not compile.
 */
// A mapped type rather than Readonly<Partial<Record<…>>>, so a misspelt name's error names ThemeOverrides.
export type ThemeOverrides = {
  readonly [Name in NamesOf<Groups>]?: string;
};
