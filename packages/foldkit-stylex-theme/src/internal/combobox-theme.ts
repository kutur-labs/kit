// The Combobox look, apart from the namespace because Combobox and Combobox.Multi both draw it.
import type { ComboboxStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { color, fontSize, size } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { field } from "./field.ts";
import { list, option } from "./list.ts";

const styles = stylex.create({
  // The button lies over the input's end, so the input keeps its own edge and focus ring.
  inputWrapper: { position: "relative", display: "inline-flex" },
  // The Input's field, with room for the button at its end.
  input: { flexGrow: 1, minInlineSize: 0, paddingInlineEnd: size.control },
  // Out of the tab order, and it keeps focus in the input, so it takes no focus ring. A background
  // would cover the input's edge, so hover turns the chevron, drawn in color.muted, to the text
  // color.
  button: {
    position: "absolute",
    insetBlock: 0,
    insetInlineEnd: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: size.control,
    padding: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    fontSize: fontSize.md,
    cursor: "pointer",
    [color.muted]: {
      default: null,
      ":hover": { default: null, "@media (hover: hover)": color.text },
    },
  },
});

/** The Input's field with the toggle over its end, and a raised list as wide as the field. */
export const theme = {
  inputWrapper: [styles.inputWrapper, field.wide],
  input: (state) => [
    field.control,
    base.hoverEase,
    styles.input,
    base.focusRing,
    state.isReadOnly && field.readOnly,
    state.isInvalid && field.invalid,
    state.isDisabled && base.disabled,
  ],
  button: (state) => [styles.button, state.isDisabled && base.disabledButton],
  // Focus stays in the input, so the panel takes no listItems marker: the active item shows its
  // fill alone.
  items: (state) => [base.panel, base.transition, list.items, state.isClosed && base.closed],
  item: option,
  // Headings alone set the groups apart. @foldkit/ui renders a separator only when it is styled,
  // and a role="separator" inside role="listbox" is invalid ARIA, which screen readers may skip or
  // misread; Menu's role="menu" allows one.
  heading: list.heading,
} satisfies ComboboxStyle.Styles;
