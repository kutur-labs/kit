// @foldkit/ui's FileDrop with `view` themed, plus `restyle` and the `text` styles.
import * as Core from "@foldkit/ui/fileDrop";
import { FileDropStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/fileDrop";

const styles = stylex.create({
  // Positioned and centring its items, so the visually hidden input sits in the middle of the
  // zone and a size.target target around it stays inside.
  root: {
    position: "relative",
    display: "grid",
    alignContent: "center",
    alignItems: "center",
    justifyItems: "center",
    gap: space.xs,
    minBlockSize: "7rem",
    padding: space.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.control,
    borderRadius: radius.panel,
    backgroundColor: {
      default: color.surface,
      ":hover": { default: null, "@media (hover: hover)": color.subtle },
    },
    color: color.text,
    textAlign: "center",
    cursor: "pointer",
    transitionProperty: "background-color",
  },
  // The input inside takes focus, so the zone draws the ring for it. ':focus-within' would also
  // ring the zone after a click.
  focusRing: {
    outlineColor: color.accent,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":has(:focus-visible)": "solid" },
    outlineWidth: 2,
  },
  dragOver: { borderStyle: "solid", borderColor: color.accent },
});

// A dashed zone whose edge turns solid in the accent while files are dragged over it.
const theme = {
  root: (state) => [
    styles.root,
    base.hoverEase,
    styles.focusRing,
    state.isDragOver && styles.dragOver,
    state.isDisabled && base.disabledButton,
  ],
} satisfies FileDropStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = FileDropStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: FileDropStyle.Layers<List, [typeof theme]>
) => ({ view: FileDropStyle.view(Core.view, theme, ...layers) });

/** `FileDrop.view`, styled by the theme. */
export const { view } = restyle();

/**
 * The text you render inside `root`: `sx(FileDrop.text.title)` for the call to action and
 * `sx(FileDrop.text.hint)` for the files it takes.
 */
export const text = stylex.create({
  title: {
    margin: 0,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.md,
  },
  hint: { margin: 0, color: color.muted, fontSize: fontSize.sm, lineHeight: lineHeight.sm },
});
