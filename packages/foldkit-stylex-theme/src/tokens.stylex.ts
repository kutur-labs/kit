// First, so the compile guard runs before any style of this package is defined.
import "./internal/compiled.ts";
import * as stylex from "@stylexjs/stylex";

// Each value reads a --fks-* property first. Only the app declares those, at :root, so its value
// wins whatever the stylesheet order, and portaled panels see it. Colors follow color-scheme.
export const color = stylex.defineVars({
  canvas: "var(--fks-color-canvas, light-dark(#ffffff, #101114))",
  surface: "var(--fks-color-surface, light-dark(#ffffff, #18181b))",
  text: "var(--fks-color-text, light-dark(#18181b, #fafafa))",
  muted: "var(--fks-color-muted, light-dark(#52525b, #a1a1aa))",
  // Separators only: below the 3:1 that WCAG 1.4.11 asks of a control's boundary.
  border: "var(--fks-color-border, light-dark(#d4d4d8, #3f3f46))",
  // The edge of checkboxes, switches, radios and inputs: at least 3:1 on surface in both schemes.
  control: "var(--fks-color-control, light-dark(#71717a, #a1a1aa))",
  hover: "var(--fks-color-hover, light-dark(#f4f4f5, #27272a))",
  accent: "var(--fks-color-accent, light-dark(#2563eb, #60a5fa))",
  onAccent: "var(--fks-color-on-accent, light-dark(#ffffff, #0b1220))",
  danger: "var(--fks-color-danger, light-dark(#dc2626, #f87171))",
  focus: "var(--fks-color-focus, light-dark(#2563eb, #93c5fd))",
  overlay: "var(--fks-color-overlay, rgb(0 0 0 / 0.4))",
} as const);

export const space = stylex.defineVars({
  sm: "var(--fks-space-sm, 0.5rem)",
  md: "var(--fks-space-md, 1rem)",
  lg: "var(--fks-space-lg, 1.5rem)",
} as const);

export const size = stylex.defineVars({
  target: "var(--fks-size-target, 2.75rem)",
  thumb: "var(--fks-size-thumb, 1.25rem)",
  arrow: "var(--fks-size-arrow, 1rem)",
} as const);

export const radius = stylex.defineVars({
  control: "var(--fks-radius-control, 6px)",
  panel: "var(--fks-radius-panel, 10px)",
} as const);

export const motion = stylex.defineVars({
  fast: "var(--fks-motion-fast, 150ms)",
  easing: "var(--fks-motion-easing, cubic-bezier(0.2, 0, 0, 1))",
} as const);

export const shadow = stylex.defineVars({
  panel: "var(--fks-shadow-panel, 0 8px 24px rgb(0 0 0 / 0.16))",
} as const);

type NameOf<Value> = Value extends `var(${infer Name}, ${string}` ? Name : never;

type NamesOf<Group> =
  Group extends stylex.VarGroup<infer Tokens> ? NameOf<Tokens[keyof Tokens]> : never;

/** The custom properties the tokens read; set any of them app-wide in a `.stylex.ts` file. */
export type ThemeOverrides = Readonly<
  Partial<
    Record<
      NamesOf<
        typeof color | typeof space | typeof size | typeof radius | typeof motion | typeof shadow
      >,
      string
    >
  >
>;
