// @foldkit/ui's Dialog with `view` themed, plus `restyle` and `closeIcon`.
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/dialog";
import { DialogStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";
import { close } from "./marks.ts";

export * from "@foldkit/ui/dialog";

// From the panel's top and end edges to the close button's: it centres on the title's first line
// and keeps as far from the end edge as from the top.
const closeInset = `calc(${space.lg} + (${lineHeight.lg} - ${size.control}) / 2)`;

const styles = stylex.create({
  dialog: { display: "grid", placeItems: "center" },
  backdrop: { backgroundColor: color.overlay },
  // The backdrop covers the viewport, so it fades without base.closed's scale, which would uncover
  // the page.
  unscaled: { scale: "none" },
  // A panel taller than the viewport scrolls inside it, and scrolling to its end leaves the page
  // still.
  panel: {
    position: "relative",
    display: "grid",
    gap: space.xs,
    inlineSize: "min(28rem, 100vw - 2rem)",
    maxBlockSize: "calc(100dvh - 2rem)",
    padding: space.lg,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  // Its end clears the close button and the button's ring, which sit over the panel's padding.
  title: {
    margin: 0,
    paddingInlineEnd: `calc(${closeInset} + ${size.control} + ${space.xs} - ${space.lg})`,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.strong,
    letterSpacing: "-0.011em",
    lineHeight: lineHeight.lg,
    textWrap: "balance",
  },
  closeButton: { position: "absolute", insetBlockStart: closeInset, insetInlineEnd: closeInset },
});

// A centred panel over a dimmed page, both fading in and leaving faster, with a quiet X beside the
// title. The backdrop enters as slowly as the panel, because @foldkit/ui waits for the panel's
// transition only.
const theme = {
  dialog: styles.dialog,
  backdrop: (state) => [
    base.transition,
    base.slowTransition,
    styles.backdrop,
    state.isClosed && [base.closed, styles.unscaled],
  ],
  panel: (state) => [
    base.panel,
    base.transition,
    base.slowTransition,
    styles.panel,
    state.isClosed && base.closed,
  ],
  title: styles.title,
  description: field.description,
  closeButton: [
    base.button,
    base.iconButton,
    base.quietButton,
    base.hitArea,
    base.focusRing,
    styles.closeButton,
  ],
} satisfies DialogStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = DialogStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: DialogStyle.Layers<List, [typeof theme]>
) => {
  // Annotated, so that this package's declarations name the Model and Message rather than spell
  // them out.
  const view: View<Core.Model, Core.Message, Core.ViewInputs> = DialogStyle.view(
    Core.view,
    theme,
    ...layers,
  );

  return { view };
};

/** `Dialog.view`, styled by the theme. */
export const { view } = restyle();

/** An X for an icon-only `closeButton`; give the button an `h.AriaLabel` of your own. */
export const closeIcon = close;
