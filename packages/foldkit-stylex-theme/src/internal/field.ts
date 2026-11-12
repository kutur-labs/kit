// Styles the form-field looks share, so that fields draw alike: Input, Select, Textarea and Combobox
// their control, Listbox and DatePicker their button, every field its invalid edge, and Checkbox,
// Switch, RadioGroup and Fieldset their description too.
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, size, space } from "../tokens.stylex.ts";

// A field's text starts as far from its edge as a list item's from its panel's, counting the
// panel's padding, so a value lines up with the options under it.
const inset = `calc(${space.sm} + ${space.xs})`;

export const field = stylex.create({
  // The <input>, <select> or <textarea>: fills its container, at least size.control tall. At rest a
  // hairline and the subtle fill mark it, as base.button's do, and a hover turns the edge to
  // color.control, the 3:1 of WCAG 1.4.11; focus adds the ring. The block padding centres one line
  // in size.control, so a one-row textarea matches an input. Take base.hoverEase with it.
  control: {
    boxSizing: "border-box",
    inlineSize: "100%",
    minBlockSize: size.control,
    margin: 0,
    paddingBlock: `calc((${size.control} - ${lineHeight.md}) / 2 - 1px)`,
    paddingInline: inset,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: color.border,
      ":hover": { default: null, "@media (hover: hover)": color.control },
    },
    borderRadius: radius.control,
    backgroundColor: color.subtle,
    color: color.text,
    fontFamily: "inherit",
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    transitionProperty: "border-color",
    "::placeholder": { color: color.muted, opacity: 1 },
  },
  // A button that holds a field's value, such as a Listbox's: base.button inset like the control's
  // text, and flat beside an Input or a Select.
  button: { paddingInline: inset, boxShadow: "none" },
  // As wide as each other, so a Listbox, a Combobox and a DatePicker line up in a form.
  wide: { minInlineSize: "12rem" },
  // A button with a mark at its end, such as a field.button or Menu's button with a chevron: the
  // mark sits closer to the end than the label to the start, as an icon's own side bearing already
  // pads it.
  trigger: { paddingInlineEnd: space.sm, textAlign: "start" },
  // A well: a deeper fill alone marks it, and it takes no hover edge or text cursor, since it takes
  // no input. Muted text would read as a placeholder. The mix resolves on the field, so it follows
  // a part's colors. Forced colors draw a transparent border in the system's color, so the field
  // keeps an edge there.
  readOnly: {
    borderColor: "transparent",
    backgroundColor: `color-mix(in oklab, ${color.text} 8%, ${color.surface})`,
    cursor: "default",
  },
  // The focus ring takes the edge's color too, so a focused invalid field still reads as invalid.
  invalid: { borderColor: color.danger, outlineColor: color.danger },
  label: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.sm,
  },
  // Usually a <p>, whose margin the browser sets.
  description: {
    margin: 0,
    color: color.muted,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    textWrap: "pretty",
  },
  // A number shown beside a control, such as a slider's value: its digits keep one width as it
  // changes.
  value: { fontVariantNumeric: "tabular-nums" },
  // A label that holds its control's value after its text, as Slider, Meter and Progress show it:
  // the value sits at the end, over the end of the track.
  valueLabel: { display: "flex", justifyContent: "space-between", gap: space.sm },
  // The description usually says what is wrong, so it takes the invalid edge's color.
  invalidDescription: { color: color.danger },
});
