// Every StyleX definition of the core but the guard's probe and the marker. Each rule says why the
// component needs it. Rules passed before a part's styles yield to the app's value for the same
// property; rules passed after them win, so they apply only in their state.
import * as stylex from "@stylexjs/stylex";

import { popoverPanel } from "./markers.stylex.ts";

// What every anchored @foldkit/ui component needs before it works; @foldkit/ui ships none of it.
export const anchored = stylex.create({
  // Inside a <dialog>, @foldkit/ui moves the backdrop directly before this wrapper.
  wrapper: { position: "relative" },
  // @foldkit/ui renders the backdrop with no style; without a cover, a click outside misses it.
  backdrop: { position: "fixed", inset: 0 },
  // Above the open trigger, which @foldkit/ui lifts to z-index 1; @foldkit/ui documents z-10.
  panel: { zIndex: 10 },
  // Centred on the panel edge that faces the trigger, as @foldkit/ui documents its arrow, and
  // rotated so an arrow drawn pointing up points at the trigger. Floating UI sets --arrow-x or
  // --arrow-y and resets the other to initial, so the unused var() leaves its inset at auto.
  arrow: {
    position: "absolute",
    left: {
      default: "var(--arrow-x)",
      [stylex.when.ancestor('[data-placement="left"]', popoverPanel)]: "100%",
    },
    right: {
      default: null,
      [stylex.when.ancestor('[data-placement="right"]', popoverPanel)]: "100%",
    },
    top: {
      default: "var(--arrow-y)",
      [stylex.when.ancestor('[data-placement="top"]', popoverPanel)]: "100%",
    },
    bottom: {
      default: null,
      [stylex.when.ancestor('[data-placement="bottom"]', popoverPanel)]: "100%",
    },
    translate: {
      default: null,
      [stylex.when.ancestor('[data-placement="top"]', popoverPanel)]: "0 -50%",
      [stylex.when.ancestor('[data-placement="bottom"]', popoverPanel)]: "0 50%",
      [stylex.when.ancestor('[data-placement="left"]', popoverPanel)]: "-50% 0",
      [stylex.when.ancestor('[data-placement="right"]', popoverPanel)]: "50% 0",
    },
    rotate: {
      default: null,
      [stylex.when.ancestor('[data-placement="top"]', popoverPanel)]: "180deg",
      [stylex.when.ancestor('[data-placement="left"]', popoverPanel)]: "90deg",
      [stylex.when.ancestor('[data-placement="right"]', popoverPanel)]: "-90deg",
    },
  },
});

// What a Dialog needs before it works; @foldkit/ui opens it with show(), not showModal().
export const dialog = stylex.create({
  // The user agent sets CanvasText, which ignores the page's color.
  dialog: { color: "inherit" },
  // An author display shows a <dialog> even while closed. Applied after the app's styles.
  hidden: { display: "none" },
  // Covers the viewport so a click outside the panel reaches the backdrop's close handler.
  backdrop: { position: "fixed", inset: 0 },
  // Paints the panel above the fixed backdrop, so a click on it does not close the dialog.
  panel: { position: "relative" },
});

// With panelMount "All", @foldkit/ui renders every panel and hides none. Applied after the app's styles.
export const tabs = stylex.create({ hidden: { display: "none" } });

// FileDrop's input, which @foldkit/ui hides only with Tailwind's sr-only class (F3). Visually
// hidden this way, it stays focusable and reachable by screen readers.
export const fileDrop = stylex.create({
  input: {
    position: "absolute",
    width: 1,
    height: 1,
    margin: -1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
