import type { ToastStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, motion, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  container: { inlineSize: "min(24rem, 100vw - 2rem)" },
  // Every entry shares this one class, so it animates on @foldkit/ui's data-closed, and follows
  // the pointer without a transition while swiped.
  entry: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.sm,
    padding: space.md,
    opacity: { default: 1, ":is([data-closed])": 0 },
    scale: { default: 1, ":is([data-closed])": 0.96 },
    transitionDuration: { default: motion.slow, ':is([data-swipe="move"])': "0s" },
    transitionProperty: "opacity, scale, translate",
    transitionTimingFunction: motion.easing,
  },
  dismiss: { flexShrink: 0, marginBlock: `calc(-1 * ${space.sm})`, paddingInline: 0 },
});

/** The look of a Toast stack: raised entries that fade in and out, each with a quiet dismiss button. */
export const toastTheme = {
  container: styles.container,
  entry: [base.panel, styles.entry],
  dismiss: [base.button, base.quietButton, base.focusRing, styles.dismiss],
} satisfies ToastStyle.Styles;

/**
 * The element you render inside each entry from `entryToView`:
 * `sx(toastContent.body, entry.variant === "Error" && toastContent.error)`.
 */
export const toastContent = stylex.create({
  body: { display: "grid", flexGrow: 1, gap: space.xs, fontSize: fontSize.sm },
  error: { color: color.danger },
});
