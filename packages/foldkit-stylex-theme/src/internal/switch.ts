// @foldkit/ui's Switch with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/switch";
import { SwitchStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, motion, shadow, size } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";

export * from "@foldkit/ui/switch";

// The thumb is 2px smaller than a checkbox's box, so the track, a 1px edge and 1px padding around
// it, is size.mark plus 2px tall: 1.125rem by 2rem at the default size.mark.
const thumb = `calc(${size.mark} - 2px)`;

const styles = stylex.create({
  // A content box two thumbs wide, so the thumb moves by one thumb toward the inline end, in either
  // direction. The track draws the thumb as its ::after, so the app renders the button empty;
  // base.hitArea takes ::before. Off, the track is filled in color.control, the 3:1 of WCAG 1.4.11,
  // and the thumb in the surface color, raised by shadow.control. The edge takes the fill's color,
  // so forced colors, which keep system colors and draw edges in theirs, still show the track.
  track: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    boxSizing: "content-box",
    inlineSize: `calc(2 * ${thumb})`,
    blockSize: thumb,
    // Centres the track on a label's first line, as base.lineMark does a checkbox's box.
    marginBlock: `calc((1lh - ${thumb} - 4px) / 2)`,
    padding: 1,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.control,
    borderRadius: 9999,
    backgroundColor: color.control,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    cursor: "pointer",
    // base.movement's timing, which cannot reach a pseudo-element from the track.
    "::after": {
      content: '""',
      inlineSize: thumb,
      blockSize: thumb,
      borderRadius: 9999,
      backgroundColor: color.surface,
      boxShadow: shadow.control,
      transitionDuration: {
        default: motion.fast,
        "@media (prefers-reduced-motion: reduce)": "0s",
      },
      transitionProperty: "margin-inline-start",
      transitionTimingFunction: motion.easing,
    },
  },
  checked: {
    borderColor: color.accent,
    backgroundColor: color.accent,
    "::after": { marginInlineStart: thumb, backgroundColor: color.onAccent },
  },
  // The label toggles the switch too.
  label: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.md,
    cursor: "pointer",
    userSelect: "none",
  },
});

// A round track with a size.target target and its thumb at the start, filled with the accent and
// the thumb at the end once on.
const theme = {
  button: (state) => [
    styles.track,
    base.hitArea,
    base.focusRing,
    state.isChecked && styles.checked,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  label: (state) => [
    styles.label,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  description: field.description,
} satisfies SwitchStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = SwitchStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: SwitchStyle.Layers<List, [typeof theme]>
) => ({ view: SwitchStyle.view(Core.view, theme, ...layers) });

/** `Switch.view`, styled by the theme: render its `button` empty, as the theme draws the thumb. */
export const { view } = restyle();
