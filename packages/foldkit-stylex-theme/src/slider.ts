import type { SliderStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, size, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  root: { display: "grid", gap: space.sm, color: color.text },
  verticalRoot: { justifyItems: "center" },
  label: { fontSize: fontSize.sm },
  // @foldkit/ui leaves the thumb's cross axis to the track: centring it here keeps it on the line.
  track: {
    display: "flex",
    alignItems: "center",
    inlineSize: "100%",
    blockSize: "0.375rem",
    borderRadius: 9999,
    cursor: "pointer",
  },
  verticalTrack: {
    justifyContent: "center",
    inlineSize: "0.375rem",
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
    inlineSize: size.thumb,
    blockSize: size.thumb,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: color.accent,
    borderRadius: 9999,
    backgroundColor: color.surface,
    cursor: "grab",
  },
  dragging: { cursor: "grabbing", scale: 1.15 },
});

/**
 * The look of a Slider: a thin track filled with the accent and a round thumb, each with a 44px
 * target. With `thumbAlignment: "Edge"`, pass `thumbSize: size.thumb` from `./tokens.stylex`.
 */
export const sliderTheme = {
  root: (state) => [
    styles.root,
    state.orientation === "Vertical" && styles.verticalRoot,
    state.isDisabled && base.disabled,
  ],
  label: styles.label,
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
