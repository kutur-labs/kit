// Styles the list looks share, so that Listbox, Menu and Combobox draw their items, group headings,
// separators and marks alike.
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, radius, size, space } from "../tokens.stylex.ts";
import { chevron } from "./base.ts";

export const list = stylex.create({
  // At least as wide as the button or field it opens from, padding and edge included, so the two
  // line up.
  items: { boxSizing: "border-box", minInlineSize: "var(--button-width)", padding: space.xs },
  item: {
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    minBlockSize: size.target,
    paddingInline: space.sm,
    borderRadius: radius.control,
    cursor: "pointer",
    userSelect: "none",
  },
  // Forced colors drop the hover fill, so there the active item takes the system's selection
  // colors, as a native list's does.
  activeItem: {
    backgroundColor: { default: color.hover, "@media (forced-colors: active)": "Highlight" },
    color: { default: null, "@media (forced-colors: active)": "HighlightText" },
  },
  heading: {
    paddingBlock: space.xs,
    paddingInline: space.sm,
    color: color.muted,
    fontSize: fontSize.sm,
    fontWeight: 600,
  },
  // Takes its color from base.borderFill.
  separator: { blockSize: 1, marginBlock: space.xs },
});

const tick = stylex.create({
  tick: { inlineSize: "1em", lineHeight: 1, opacity: 0 },
  ticked: { opacity: 1 },
});

// The marks an app renders: the chevron in the button, and the selection mark in an item.
export const listIndicator = {
  chevron: chevron.chevron,
  open: chevron.open,
  tick: tick.tick,
  ticked: tick.ticked,
};
