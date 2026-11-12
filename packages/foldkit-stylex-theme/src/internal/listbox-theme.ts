// The Listbox look, apart from the namespace because Listbox and Listbox.Multi both draw it.
import type { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./base.ts";
import { field } from "./field.ts";
import { list, option } from "./list.ts";
import { listItems } from "./markers.stylex.ts";

const styles = stylex.create({
  // Focus stays on the list while the active item moves, so the active item shows focus.
  items: { outlineStyle: "none" },
});

/** A button with a field's edge and a raised list whose active item takes the subtle fill. */
export const theme = {
  // Read-only, the button still opens the list to show the choices, so it keeps its pointer.
  button: (state) => [
    base.button,
    field.button,
    field.wide,
    field.trigger,
    base.focusRing,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabledButton,
  ],
  items: (state) => [
    base.panel,
    base.transition,
    list.items,
    listItems,
    styles.items,
    state.isClosed && base.closed,
  ],
  item: option,
  // Headings alone set the groups apart. @foldkit/ui renders a separator only when it is styled,
  // and a role="separator" inside role="listbox" is invalid ARIA, which screen readers may skip or
  // misread; Menu's role="menu" allows one.
  heading: list.heading,
} satisfies ListboxStyle.Styles;
