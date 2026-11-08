import type { MenuStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { list, listIndicator } from "./internal/list.ts";
import { space } from "./tokens.stylex.ts";

const styles = stylex.create({
  // Focus stays on the panel while the active item moves, so the active item shows focus.
  items: {
    boxSizing: "border-box",
    minInlineSize: "max(12rem, var(--button-width, 0px))",
    padding: space.xs,
    outlineStyle: "none",
  },
});

/**
 * The look of a Menu: an outlined button and a raised panel of actions whose active item takes the
 * hover color, with headed groups split by a rule. Pass it to `MenuStyle.view`.
 */
export const menuTheme = {
  button: (state) => [
    base.button,
    base.focusRing,
    state.isVisible && base.pressed,
    state.isButtonDisabled && base.disabled,
  ],
  items: (state) => [base.panel, base.transition, styles.items, state.isClosed && base.closed],
  item: (state) => [
    list.item,
    state.isActive && list.activeItem,
    state.isDisabled && base.disabled,
  ],
  heading: list.heading,
  separator: list.separator,
} satisfies MenuStyle.Styles;

/**
 * The one element `buttonContent` returns: `sx(menuButton.content)` around the label and the
 * chevron, which it puts at the button's end.
 */
export const menuButton = { content: base.buttonContent };

/**
 * The chevron you render in `buttonContent`:
 * `sx(menuIndicator.chevron, model.isOpen && menuIndicator.open)`.
 */
export const menuIndicator = { chevron: listIndicator.chevron, open: listIndicator.open };
