// Styles the list looks share, so that Listbox, Menu and Combobox draw their items, group headings,
// separators and marks alike.
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, motion, radius, size, space } from "../tokens.stylex.ts";

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
  activeItem: { backgroundColor: color.hover },
  heading: {
    paddingBlock: space.xs,
    paddingInline: space.sm,
    color: color.muted,
    fontSize: fontSize.sm,
    fontWeight: 600,
  },
  separator: { blockSize: 1, marginBlock: space.xs, backgroundColor: color.border },
});

// The marks an app renders: the chevron in the button, which turns over while the list is open,
// and the selection mark in an item.
export const listIndicator = stylex.create({
  chevron: {
    color: color.muted,
    lineHeight: 1,
    transitionDuration: motion.fast,
    transitionProperty: "rotate",
  },
  open: { rotate: "180deg" },
  tick: { inlineSize: "1em", lineHeight: 1, opacity: 0 },
  ticked: { opacity: 1 },
});
