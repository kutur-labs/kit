import type { ComboboxStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { list, listIndicator } from "./internal/list.ts";
import { color, fontSize, size } from "./tokens.stylex.ts";

const styles = stylex.create({
  // The button lies over the input's end, so the input keeps its own edge and focus ring.
  inputWrapper: { position: "relative", display: "inline-flex", minInlineSize: "14rem" },
  // The Input's field, with room for the button at its end.
  input: { flexGrow: 1, minInlineSize: 0, paddingInlineEnd: size.target },
  // Out of the tab order, and it keeps focus in the input, so it takes no focus ring. Hover changes
  // its color only: a background would cover the input's edge.
  button: {
    position: "absolute",
    insetBlock: 0,
    insetInlineEnd: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: size.target,
    padding: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    color: { default: color.muted, ":hover": color.text },
    fontFamily: "inherit",
    fontSize: fontSize.md,
    cursor: "pointer",
  },
  // Takes the button's color, which turns from muted to the text color under the pointer.
  chevron: { color: "inherit" },
});

/**
 * The look of a Combobox and a Combobox.Multi: the Input's field with the toggle button over its
 * end, and a raised list as wide as the input whose highlighted item takes the hover color. Pass
 * it to `ComboboxStyle.view` or `ComboboxStyle.Multi.view`.
 */
export const comboboxTheme = {
  inputWrapper: styles.inputWrapper,
  input: (state) => [
    field.control,
    styles.input,
    base.focusRing,
    state.isReadOnly && field.readOnly,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabled,
  ],
  button: (state) => [styles.button, state.isDisabled && base.disabled],
  items: (state) => [base.panel, base.transition, list.items, state.isClosed && base.closed],
  item: (state) => [
    list.item,
    state.isActive && list.activeItem,
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  heading: list.heading,
  separator: [list.separator, base.borderFill],
} satisfies ComboboxStyle.Styles;

/**
 * Marks you render in the button and items. The chevron in `buttonContent`:
 * `sx(comboboxIndicator.chevron, model.isOpen && comboboxIndicator.open)`. The selection mark in
 * `itemToConfig`'s content: `sx(comboboxIndicator.tick, state.isSelected && comboboxIndicator.ticked)`.
 */
export const comboboxIndicator = {
  chevron: [listIndicator.chevron, styles.chevron],
  open: listIndicator.open,
  tick: listIndicator.tick,
  ticked: listIndicator.ticked,
};
