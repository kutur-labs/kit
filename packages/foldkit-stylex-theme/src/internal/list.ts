// Styles the list looks share, so that Listbox, Menu and Combobox draw their items and group
// headings alike, and Menu its separators. A list panel takes `list.items` and the `listItems`
// marker from markers.stylex.ts, which `list.activeItem` reads.
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { listItems } from "./markers.stylex.ts";

export const list = stylex.create({
  // At least as wide as the button or field it opens from. base.panel counts the padding and edge
  // in that width, so the two line up.
  items: { minInlineSize: "var(--button-width)", padding: space.xs },
  // Take base.highlight with it: the fill fades out as the item stops being active, and
  // list.activeItem shows it at once, from the keyboard too.
  item: {
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    minBlockSize: size.control,
    paddingInline: space.sm,
    borderRadius: radius.control,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    cursor: "pointer",
    userSelect: "none",
    transitionProperty: "background-color",
  },
  // Forced colors drop the fill, so there the active item takes the system's selection colors, as
  // a native list's does. Focus stays on the panel while the active item moves, so the item draws
  // the ring while the panel shows keyboard focus: the fill alone is too faint to find. Opening
  // with the pointer does not match :focus-visible, so no ring follows the pointer.
  activeItem: {
    backgroundColor: { default: color.subtle, "@media (forced-colors: active)": "Highlight" },
    color: { default: null, "@media (forced-colors: active)": "HighlightText" },
    outlineColor: color.accent,
    outlineOffset: -2,
    outlineStyle: { default: "none", [stylex.when.ancestor(":focus-visible", listItems)]: "solid" },
    outlineWidth: 2,
    transitionDuration: "0s",
  },
  // More room above than below, so a heading reads with the items under it rather than those
  // above, which are another group's.
  heading: {
    paddingBlockStart: space.sm,
    paddingBlockEnd: space.xs,
    paddingInline: space.sm,
    color: color.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  // Runs across list.items' padding to the panel's edges. Takes its color from base.borderFill.
  separator: { blockSize: 1, marginBlock: space.xs, marginInline: `calc(-1 * ${space.xs})` },
});

/** An option of Listbox or Combobox, whose list may be read-only as the field that holds it is. */
export const option = (
  state: Readonly<{ isActive: boolean; isReadOnly: boolean; isDisabled: boolean }>,
) => [
  list.item,
  base.highlight,
  state.isActive && [list.activeItem, base.systemColors],
  state.isReadOnly && base.readOnly,
  state.isDisabled && base.disabled,
];
