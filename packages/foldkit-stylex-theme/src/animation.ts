import type { AnimationStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";

const styles = stylex.create({
  // Grows from the top edge, where content revealed below a trigger starts.
  element: { transformOrigin: "top" },
});

/**
 * The look of an Animation: the element fades and scales in from its top edge, and out again. It
 * sets motion only, so the content keeps its own look.
 */
export const animationTheme = {
  element: (state) => [base.transition, styles.element, state.isClosed && base.closed],
} satisfies AnimationStyle.Styles;
