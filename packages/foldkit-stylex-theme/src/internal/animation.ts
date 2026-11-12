// @foldkit/ui's Animation with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/animation";
import { AnimationStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { base } from "./base.ts";

export * from "@foldkit/ui/animation";

const styles = stylex.create({
  // Grows from the top edge, where content revealed below a trigger starts.
  element: { transformOrigin: "top" },
});

// The element fades and scales in from its top edge, and out again. Motion only, so the content
// keeps its own look.
const theme = {
  element: (state) => [base.transition, styles.element, state.isClosed && base.closed],
} satisfies AnimationStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = AnimationStyle.Styles;

/** `Animation.ViewInputs` without `className`, which comes from the theme. */
export type ViewInputs = AnimationStyle.ViewInputs;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: AnimationStyle.Layers<List, [typeof theme]>
) => ({ view: AnimationStyle.view(Core.view, theme, ...layers) });

/** `Animation.view`, styled by the theme. */
export const { view } = restyle();
