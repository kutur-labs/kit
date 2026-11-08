import type { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { list, listIndicator } from "./internal/list.ts";
import { color } from "./tokens.stylex.ts";

const styles = stylex.create({
  button: { minInlineSize: "12rem", textAlign: "start" },
  invalid: { borderColor: color.danger },
  // Focus stays on the list while the highlighted item moves, so the highlight shows focus.
  items: { outlineStyle: "none" },
});

/**
 * The look of a Listbox and a Listbox.Multi: an outlined button and a raised list whose
 * highlighted item takes the hover color. Pass it to `ListboxStyle.view` or `ListboxStyle.Multi.view`.
 */
export const listboxTheme = {
  button: (state) => [
    base.button,
    base.focusRing,
    styles.button,
    state.isVisible && base.pressed,
    state.isInvalid && styles.invalid,
    state.isDisabled && base.disabled,
  ],
  items: (state) => [
    base.panel,
    base.transition,
    list.items,
    styles.items,
    state.isClosed && base.closed,
  ],
  item: (state) => [
    list.item,
    state.isActive && list.activeItem,
    state.isDisabled && base.disabled,
  ],
  heading: list.heading,
  separator: list.separator,
} satisfies ListboxStyle.Styles;

/**
 * The one element `buttonContent` returns: `sx(listboxButton.content)` around the label and the
 * chevron, which it puts at the button's end.
 */
export const listboxButton = { content: base.buttonContent };

/**
 * Marks you render in the button and items. The chevron in `buttonContent`:
 * `sx(listboxIndicator.chevron, model.isOpen && listboxIndicator.open)`. The selection mark in
 * `itemToConfig`'s content: `sx(listboxIndicator.tick, state.isSelected && listboxIndicator.ticked)`.
 */
export const listboxIndicator = listIndicator;
