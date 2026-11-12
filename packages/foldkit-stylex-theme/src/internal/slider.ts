// @foldkit/ui's Slider with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/slider";
import { SliderStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, shadow, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";

export * from "@foldkit/ui/slider";

const styles = stylex.create({
  // As wide as its container, as a field is: centred in a flex or grid cell, it would shrink to
  // its label.
  root: { display: "grid", gap: space.sm, inlineSize: "100%", color: color.text },
  verticalRoot: { justifyItems: "center" },
  // @foldkit/ui leaves the thumb's cross axis to the track: centring it here keeps it on the line.
  track: {
    display: "flex",
    alignItems: "center",
    inlineSize: "100%",
    blockSize: "0.25rem",
    borderRadius: 9999,
    cursor: "pointer",
  },
  verticalTrack: {
    justifyContent: "center",
    inlineSize: "0.25rem",
    blockSize: "100%",
    minBlockSize: "10rem",
  },
  // The track is thinner than a pointer target; this widens it across its length.
  trackArea: {
    "::before": {
      content: '""',
      position: "absolute",
      top: "50%",
      insetInline: 0,
      blockSize: size.target,
      translate: "0 -50%",
    },
  },
  verticalTrackArea: {
    "::before": {
      top: 0,
      left: "50%",
      insetInline: "auto",
      inlineSize: size.target,
      blockSize: "100%",
      translate: "-50% 0",
    },
  },
  filledTrack: { borderRadius: 9999, backgroundColor: color.accent },
  thumb: {
    boxSizing: "border-box",
    inlineSize: size.mark,
    blockSize: size.mark,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.accent,
    borderRadius: 9999,
    backgroundColor: color.surface,
    boxShadow: shadow.control,
    cursor: "grab",
  },
  dragging: { cursor: "grabbing" },
});

// A thin track filled with the accent up to a round, raised thumb, each with a size.target target.
// With `thumbAlignment: "Edge"`, the app passes `thumbSize: size.mark` from the tokens.
const theme = {
  root: (state) => [
    styles.root,
    state.orientation === "Vertical" && styles.verticalRoot,
    state.isDisabled && base.disabled,
  ],
  label: [field.label, field.value, field.valueLabel],
  track: (state) => [
    styles.track,
    base.borderFill,
    styles.trackArea,
    state.orientation === "Vertical" && [styles.verticalTrack, styles.verticalTrackArea],
    state.isReadOnly && base.readOnly,
  ],
  filledTrack: styles.filledTrack,
  thumb: (state) => [
    styles.thumb,
    base.hitArea,
    base.focusRing,
    state.isDragging && styles.dragging,
    state.isReadOnly && base.readOnly,
  ],
} satisfies SliderStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = SliderStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: SliderStyle.Layers<List, [typeof theme]>
) => ({ view: SliderStyle.view(Core.view, theme, ...layers) });

/** `Slider.view`, styled by the theme. */
export const { view } = restyle();
