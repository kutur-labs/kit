// The marks the namespaces' helpers draw, so that apps render no glyphs. Each is an inline SVG that
// screen readers skip, stroked in currentColor so it takes its part's color, forced colors
// included, and size.mark square: a 16px glyph at a 1.5px stroke beside 14px text. The only module
// of this package that builds elements: it takes no `h`, so the marks carry no handlers.
import type { Html } from "foldkit/html";

import { sx, type SxStyles } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { inertHtml as ih } from "foldkit/html";

import { color, motion, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

const styles = stylex.create({
  icon: { flexShrink: 0, inlineSize: size.mark, blockSize: size.mark },
  // A label beside a mark ends in an ellipsis rather than pushing the mark out, such as a Listbox
  // trigger that shows many chosen values.
  label: { minInlineSize: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  quiet: { color: color.muted },
  turns: { transitionProperty: "rotate" },
  open: { rotate: "180deg" },
  // A turned chevron, pointing back or forward in the reading direction.
  previous: { rotate: { default: "90deg", ":dir(rtl)": "-90deg" } },
  next: { rotate: { default: "-90deg", ":dir(rtl)": "90deg" } },
  // The tick's path has a length of 1, so the dash offset hides all of it or none.
  tick: { strokeDasharray: 1, strokeDashoffset: 1 },
  // Only the shown style transitions, so the tick draws in and hides at once.
  ticked: { strokeDashoffset: 0, transitionProperty: "stroke-dashoffset" },
  selectField: { position: "relative", display: "grid" },
  // Over the end of the select, as far from it as a trigger's chevron from its button's end.
  // Clicks pass through to the select.
  selectChevron: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineEnd: space.sm,
    translate: "0 -50%",
    pointerEvents: "none",
  },
  radio: { inlineSize: size.mark, blockSize: size.mark, color: color.control },
  radioSelected: { color: color.accent },
  dot: { transitionDuration: motion.fast, transitionProperty: "opacity" },
  hidden: { opacity: 0 },
});

// A glyph of `paths` on a 16 by 16 grid, stroked 1.5 wide.
const icon = (paths: ReadonlyArray<Html>, ...extra: ReadonlyArray<SxStyles>): Html =>
  ih.svg(
    [
      ih.AriaHidden(true),
      ih.ViewBox("0 0 16 16"),
      ih.Fill("none"),
      ih.Stroke("currentColor"),
      ih.StrokeWidth("1.5"),
      ih.StrokeLinecap("round"),
      ih.StrokeLinejoin("round"),
      sx(styles.icon, ...extra),
    ],
    paths,
  );

const path = (d: string) => ih.path([ih.D(d)]);

const chevronPath = "m4 6 4 4 4-4";

/** The one element a trigger or an item shows: `label`, then `mark` at its end. */
export const labelled = (label: Html | string, mark: Html): Html =>
  ih.span([sx(base.buttonContent)], [ih.span([sx(styles.label)], [label]), mark]);

/** What a trigger shows while nothing is chosen, muted as a field's placeholder is. */
export const placeholder = (text: string): Html => ih.span([sx(styles.quiet)], [text]);

/** Points down; turns over while its panel is open. */
export const chevron = (isOpen: boolean) =>
  icon([path(chevronPath)], styles.quiet, styles.turns, base.movement, isOpen && styles.open);

/** A calendar's previous-month arrow. */
export const previous = () => icon([path(chevronPath)], styles.quiet, styles.previous);

/** A calendar's next-month arrow. */
export const next = () => icon([path(chevronPath)], styles.quiet, styles.next);

/** A tick that draws in while `isShown` and keeps its space while hidden, so labels stay aligned. */
export const tick = (isShown: boolean, ...extra: ReadonlyArray<SxStyles>) =>
  icon(
    [ih.path([ih.D("m3.5 8.5 3 3 6-7"), ih.PathLength("1")])],
    styles.tick,
    isShown && [styles.ticked, base.movement],
    ...extra,
  );

/** An indeterminate checkbox's dash. */
export const dash = (...extra: ReadonlyArray<SxStyles>) => icon([path("M4 8h8")], ...extra);

/** The X of a close or dismiss button. */
export const close = () => icon([path("m4 4 8 8"), path("m12 4-8 8")]);

/** A native `select` with a still chevron over its end, dimmed with it while `isDisabled`. */
export const selectField = (select: Html, isDisabled: boolean): Html =>
  ih.span(
    [sx(styles.selectField)],
    [
      select,
      icon([path(chevronPath)], styles.quiet, styles.selectChevron, isDisabled && base.disabled),
    ],
  );

/** A date picker's calendar. */
export const calendar = () =>
  icon(
    [
      path("M2.5 4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"),
      path("M2.5 7h11"),
      path("M5.5 2v3"),
      path("M10.5 2v3"),
    ],
    styles.quiet,
  );

/** A radio's ring, with a dot that fades in while `isSelected`; size.mark square. */
export const radio = (isSelected: boolean) =>
  icon(
    [
      ih.circle([ih.Cx("8"), ih.Cy("8"), ih.R("7.5"), ih.StrokeWidth("1")]),
      ih.circle([
        ih.Cx("8"),
        ih.Cy("8"),
        ih.R("3.5"),
        ih.Fill("currentColor"),
        ih.Stroke("none"),
        sx(styles.dot, !isSelected && styles.hidden),
      ]),
    ],
    styles.radio,
    base.lineMark,
    isSelected && styles.radioSelected,
  );
