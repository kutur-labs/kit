// Styles the looks share, so that every component draws its buttons, panels, focus rings and
// transitions alike.
import * as stylex from "@stylexjs/stylex";

import {
  color,
  fontSize,
  fontWeight,
  lineHeight,
  motion,
  radius,
  shadow,
  size,
  space,
} from "../tokens.stylex.ts";
import { closing } from "./closing.stylex.ts";

export const base = stylex.create({
  // Every focusable part takes it. Only outline properties: StyleX ranks ':focus-visible' below
  // ':hover', so a ring drawn with a property that a hover style also sets would not show
  // (kit/foldkit-stylex-condition-key reports such a pair).
  focusRing: {
    outlineColor: color.accent,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
  },
  // For a part that sets its text on a fill that forced colors keep, such as color.onAccent on
  // color.accent, HighlightText on Highlight there. Chromium draws a Canvas backplate behind text
  // under forced colors, which hides HighlightText in a flat box, so the part opts out of their
  // adjustment: every color it shows there is already one of the system's.
  systemColors: { forcedColorAdjust: "none" },
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
  // A size.mark mark before a label, such as a checkbox's box: with its margins it is one line of
  // the label tall, so it centres on the label's first line in a row aligned to the start, and on
  // the label in a centred row. It takes the label's font, which a <button> would not inherit,
  // for 1lh to measure the label's line.
  lineMark: {
    marginBlock: `calc((1lh - ${size.mark}) / 2)`,
    fontSize: "inherit",
    lineHeight: "inherit",
  },
  // A button with a text label: triggers, close and dismiss buttons. At rest a hairline and the
  // subtle fill mark it, and a hover turns the edge to color.control, the 3:1 of WCAG 1.4.11; the
  // audit's `hairline` option names this exception. Touch browsers keep :hover on the last element
  // tapped, so every hover style sits under (hover: hover), which they do not match.
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minInlineSize: size.control,
    minBlockSize: size.control,
    paddingBlock: 0,
    paddingInline: space.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: color.border,
      ":hover": { default: null, "@media (hover: hover)": color.control },
    },
    borderRadius: radius.control,
    backgroundColor: color.subtle,
    boxShadow: shadow.control,
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.md,
    cursor: "pointer",
    // A pointer press shrinks the button a little. Space on a focused button also matches :active,
    // so :focus-visible, which a pointer press does not set, leaves the keyboard out.
    scale: {
      default: null,
      ":active": {
        default: null,
        "@media (prefers-reduced-motion: no-preference)": {
          default: 0.98,
          ":focus-visible": "none",
        },
      },
    },
    // As base.hoverEase, which it cannot take: the press scale transitions without a hover too.
    transitionDuration: {
      default: `0s, 0s, ${motion.instant}`,
      ":hover": { default: null, "@media (hover: hover)": motion.instant },
    },
    transitionProperty: "background-color, border-color, scale",
    transitionTimingFunction: motion.easing,
  },
  // Colors that ease in on hover and snap back: a resting part that transitioned its colors would
  // fade them on every scheme or preset switch too. The part names them in transitionProperty.
  hoverEase: {
    transitionDuration: {
      default: null,
      ":hover": { default: null, "@media (hover: hover)": motion.instant },
    },
    transitionTimingFunction: motion.easing,
  },
  // A highlight, such as a list item's or a calendar day's fill, that shows at once under the
  // pointer and fades out over motion.fast as it leaves. Only for parts that rest transparent, so a
  // scheme switch fades nothing. The part names the property in transitionProperty.
  highlight: {
    transitionDuration: {
      default: motion.fast,
      ":hover": { default: null, "@media (hover: hover)": "0s" },
    },
    transitionTimingFunction: motion.easing,
  },
  // The one element a trigger's content input or an item's content returns, around a label and a
  // mark such as a chevron or a tick. The button or item lays out that element alone, so this one
  // fills it, keeps the button's gap and puts the mark at the end.
  buttonContent: {
    display: "flex",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  // A button drawn as its label or icon alone, such as a dismiss button.
  quietButton: {
    borderColor: "transparent",
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, "@media (hover: hover)": color.subtle },
    },
    boxShadow: "none",
    color: color.muted,
  },
  // A button that holds one mark, such as a close button's X: square, and positioned for
  // base.hitArea, which gives back the corners its radius takes from the pointer.
  iconButton: { position: "relative", paddingInline: 0 },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
  // base.disabled for a part with a hover style, such as a button or a calendar day. @foldkit/ui
  // keeps a disabled part hoverable, through aria-disabled, so this one takes no pointer and shows
  // no hover style: the theme's, or one a layer adds. A ':hover' key that left disabled parts out
  // would name a state hook, which kit/foldkit-stylex-condition-key rejects, and miss a layer's
  // hover. With no pointer, no cursor shows either.
  disabledButton: { opacity: 0.5, pointerEvents: "none" },
  // A control that shows its value but takes no change, such as a read-only switch or list item.
  readOnly: { cursor: "default" },
  // A fill in color.border, such as a separator or the empty part of a track. Forced colors would
  // turn it into the background, so there it takes GrayText, which stays apart from a fill in
  // Highlight or CanvasText.
  borderFill: {
    backgroundColor: { default: color.border, "@media (forced-colors: active)": "GrayText" },
  },
  // A floating or modal surface. Portaled panels inherit from <body>, so it sets its own color and
  // text. shadow.panel's ring is its edge; forced colors drop shadows, so there it draws a border,
  // in the browser's color. Its sizes include its padding and edge, so that the max-height
  // Floating UI writes to keep an anchored panel in the viewport, and each look's `100vw - 2rem`
  // cap, bound the whole panel.
  panel: {
    boxSizing: "border-box",
    borderWidth: { default: 0, "@media (forced-colors: active)": 1 },
    borderStyle: "solid",
    borderRadius: radius.panel,
    backgroundColor: color.surface,
    boxShadow: shadow.panel,
    color: color.text,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  // With `isClosed && base.closed`: fades and scales the part in and out. An anchored panel grows
  // from the side that faces its trigger, which @foldkit/ui's anchor writes to `data-placement`;
  // anything else grows from its centre. The attribute names the side alone, not the alignment
  // along it, so a start-aligned panel wider than its trigger grows from its own centre: at a 0.97
  // scale that moves it under 2px.
  transition: {
    transformOrigin: {
      default: "center",
      ':is([data-placement="bottom"])': "top",
      ':is([data-placement="top"])': "bottom",
      ':is([data-placement="left"])': "right",
      ':is([data-placement="right"])': "left",
    },
    transitionDuration: motion.fast,
    transitionProperty: "opacity, scale",
    transitionTimingFunction: motion.easing,
  },
  // After base.transition, for a large part such as a dialog or a toast, which enters more slowly.
  slowTransition: { transitionDuration: motion.slow },
  // Under reduced motion the part still fades, at its open scale: none, not 1, which looks the same
  // but differs, so the browser would still run a scale transition between them. A part leaves
  // faster than it enters: the transition that runs takes the closed state's duration.
  closed: {
    opacity: 0,
    scale: { default: closing.scale, "@media (prefers-reduced-motion: reduce)": "none" },
    transitionDuration: motion.instant,
  },
  // The timing of a part that moves, such as a turning chevron or a sliding thumb: it snaps under
  // reduced motion. The part names the property in `transitionProperty`.
  movement: {
    transitionDuration: { default: motion.fast, "@media (prefers-reduced-motion: reduce)": "0s" },
    transitionTimingFunction: motion.easing,
  },
});
