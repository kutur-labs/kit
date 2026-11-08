// Styles the looks share, so that every component draws its buttons, panels, focus rings and
// transitions alike.
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, motion, radius, shadow, size, space } from "../tokens.stylex.ts";

export const base = stylex.create({
  // Every focusable part takes it. Only outline properties: StyleX ranks ':focus-visible' below
  // ':hover', so a ring drawn with a property that a hover style also sets would not show
  // (kit/foldkit-stylex-condition-key reports such a pair).
  focusRing: {
    outlineColor: color.focus,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
  },
  // Keeps a control smaller than size.target at a size.target pointer target. The control must
  // be positioned: give it `position: relative` unless @foldkit/ui positions it.
  hitArea: {
    "::before": {
      content: '""',
      position: "absolute",
      top: "50%",
      left: "50%",
      inlineSize: size.target,
      blockSize: size.target,
      translate: "-50% -50%",
    },
  },
  // A button with a text label: triggers, close and dismiss buttons.
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minInlineSize: size.target,
    minBlockSize: size.target,
    paddingBlock: 0,
    paddingInline: space.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.control,
    backgroundColor: { default: color.surface, ":hover": color.hover },
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    lineHeight: 1.25,
    cursor: "pointer",
  },
  // The one element a trigger's content input returns, around a label and a mark such as a
  // chevron. The button lays out that element alone, so this one fills the button, keeps the
  // button's gap and puts the mark at the end.
  buttonContent: {
    display: "flex",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  // A button drawn as its icon alone, such as a dismiss button.
  quietButton: {
    borderColor: "transparent",
    backgroundColor: { default: "transparent", ":hover": color.hover },
    color: color.muted,
  },
  // The parts state functions mark pressed or open, such as an open trigger.
  pressed: { backgroundColor: color.hover },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
  // A control that shows its value but takes no change, such as a read-only switch or list item.
  readOnly: { cursor: "default" },
  // A fill in color.border, such as a separator or the empty part of a track. Forced colors would
  // turn it into the background, so there it takes GrayText, which stays apart from a fill in
  // Highlight or CanvasText.
  borderFill: {
    backgroundColor: { default: color.border, "@media (forced-colors: active)": "GrayText" },
  },
  // A floating or modal surface. Portaled panels inherit from <body>, so it sets its own color.
  panel: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.panel,
    backgroundColor: color.surface,
    boxShadow: shadow.panel,
    color: color.text,
  },
  // With `isClosed && base.closed`: fades and scales the part in and out.
  transition: {
    transitionDuration: motion.fast,
    transitionProperty: "opacity, scale",
    transitionTimingFunction: motion.easing,
  },
  closed: { opacity: 0, scale: 0.96 },
});

// The chevron an app renders in a button that opens a panel, which turns over while the panel is
// open: `sx(chevron.chevron, isOpen && chevron.open)`.
export const chevron = stylex.create({
  chevron: {
    color: color.muted,
    lineHeight: 1,
    transitionDuration: motion.fast,
    transitionProperty: "rotate",
    transitionTimingFunction: motion.easing,
  },
  open: { rotate: "180deg" },
});
