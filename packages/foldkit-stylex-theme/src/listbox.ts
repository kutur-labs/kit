import type { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { list, listIndicator } from "./internal/list.ts";

const styles = stylex.create({
  button: { minInlineSize: "12rem", textAlign: "start" },
  // Focus stays on the list while the highlighted item moves, so the highlight shows focus.
  items: { outlineStyle: "none" },
});

/**
 * The look of a Listbox and a Listbox.Multi: a button with a field's edge and a raised list whose
 * highlighted item takes the hover color. Pass it to `ListboxStyle.view` or `ListboxStyle.Multi.view`.
 */
export const listboxTheme = {
  // Read-only, the button still opens the list to show the choices, so it keeps its pointer.
  button: (state) => [
    base.button,
    field.button,
    base.focusRing,
    styles.button,
    state.isVisible && base.pressed,
    state.isInvalid && field.invalid,
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
    state.isReadOnly && base.readOnly,
    state.isDisabled && base.disabled,
  ],
  heading: list.heading,
  separator: [list.separator, base.borderFill],
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
