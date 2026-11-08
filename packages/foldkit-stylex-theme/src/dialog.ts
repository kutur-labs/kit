import type { DialogStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, motion, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  dialog: { display: "grid", placeItems: "center" },
  // As long as the panel's, because @foldkit/ui waits for the panel's transition only.
  slow: { transitionDuration: motion.slow },
  backdrop: { backgroundColor: color.overlay },
  // Opacity alone: the backdrop covers the viewport, so scaling it would uncover the page.
  backdropClosed: { opacity: 0 },
  panel: {
    display: "grid",
    gap: space.sm,
    inlineSize: "min(32rem, 100vw - 2rem)",
    padding: space.lg,
  },
  title: { margin: 0, fontSize: fontSize.lg, fontWeight: 600 },
  description: { margin: 0, color: color.muted, fontSize: fontSize.sm },
  closeButton: { justifySelf: "end" },
});

/** The look of a Dialog: a centred panel over a dimmed page, both fading in. */
export const dialogTheme = {
  dialog: styles.dialog,
  backdrop: (state) => [
    base.transition,
    styles.slow,
    styles.backdrop,
    state.isClosed && styles.backdropClosed,
  ],
  panel: (state) => [
    base.panel,
    base.transition,
    styles.slow,
    styles.panel,
    state.isClosed && base.closed,
  ],
  title: styles.title,
  description: styles.description,
  closeButton: [base.button, base.focusRing, styles.closeButton],
} satisfies DialogStyle.Styles;
