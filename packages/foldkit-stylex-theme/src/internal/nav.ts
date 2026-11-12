// @foldkit/ui's Nav with `view` themed, plus `restyle`.
import * as Core from "@foldkit/ui/nav";
import { NavStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { list } from "./list.ts";

export * from "@foldkit/ui/nav";

const styles = stylex.create({
  nav: { display: "flex", flexWrap: "wrap", gap: space.xs },
  // Its minimum size counts the padding, so a short label keeps even padding. Every link has one
  // weight, so the current one moves nothing. Positioned for base.hitArea, which gives back the
  // corners its radius takes from the pointer.
  link: {
    position: "relative",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    minInlineSize: size.control,
    minBlockSize: size.control,
    paddingInline: space.sm,
    borderRadius: radius.control,
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, "@media (hover: hover)": color.subtle },
    },
    color: {
      default: color.muted,
      ":hover": { default: null, "@media (hover: hover)": color.text },
    },
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.md,
    textDecorationLine: "none",
    transitionProperty: "background-color",
  },
  // After list.activeItem, whose color only forced colors set: there the link's text stays
  // readable on the Highlight fill.
  current: {
    color: { default: color.text, "@media (forced-colors: active)": "HighlightText" },
  },
});

// A row of links, each a control tall, the current one filled like a list's active item.
const theme = {
  nav: styles.nav,
  // The focus ring comes last: list.activeItem sets the outline for a list's keyboard focus.
  link: (state) => [
    styles.link,
    base.highlight,
    base.hitArea,
    state.isCurrent && [list.activeItem, base.systemColors],
    state.isCurrent && styles.current,
    base.focusRing,
  ],
} satisfies NavStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = NavStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: NavStyle.Layers<List, [typeof theme]>
) => {
  // Annotated: the inferred type names foldkit's DispatchSync through the core, which this
  // package's declarations cannot import.
  const view: typeof Core.view = NavStyle.view(Core.view, theme, ...layers);

  return { view };
};

/** `Nav.view`, styled by the theme. Render each link as a direct child of the `<nav>`. */
export const { view } = restyle();
