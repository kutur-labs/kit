import * as stylex from "@stylexjs/stylex";

/** The gallery's breakpoints, as condition keys: `{ default: …, [media.narrow]: … }`. */
export const media = stylex.defineConsts({
  // The pickers wrap below the wordmark, and canvases bleed to the screen's edges.
  narrow: "@media (max-width: 40rem)",
  // The sidebar replaces the Components popover.
  wide: "@media (min-width: 64rem)",
});
